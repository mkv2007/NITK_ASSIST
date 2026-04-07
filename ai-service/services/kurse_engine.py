import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import AIMessage, HumanMessage
from typing import List, Optional
from pydantic import BaseModel, Field

# LangGraph Imports
from langgraph.graph import StateGraph, START, END
from typing_extensions import TypedDict

class Action(BaseModel):
    type: str = Field(description="The type of action. Can be 'link' or 'calendar'. Use 'link' for standard URLs (e.g. registration, info), and 'calendar' if the user should add an event to their calendar.")
    label: str = Field(description="The text to display on the button, e.g. 'Register', 'Add to Calendar'")
    url: Optional[str] = Field(None, description="The URL to open if type is 'link'")
    event_title: Optional[str] = Field(None, description="Title of the event if type is 'calendar'")
    event_date: Optional[str] = Field(None, description="Date or datetime string if type is 'calendar'")
    event_time: Optional[str] = Field(None, description="Time string if type is 'calendar'")
    event_location: Optional[str] = Field(None, description="Venue/link if type is 'calendar'")
    event_details: Optional[str] = Field(None, description="A short description of the event if type is 'calendar'")

class AssistantResponse(BaseModel):
    answer: str = Field(description="Your detailed, helpful response to the user's query. If you suggest an event or a link, try to include an action for it.")
    actions: List[Action] = Field(default_factory=list, description="A list of interactive actions suggested based on the context. Only provide relevant actions if events or links are mentioned. Otherwise, leave empty.")

from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever, ContextualCompressionRetriever
from langchain_community.document_compressors import FlashrankRerank
from langchain_core.documents import Document

load_dotenv()

# -----------------------------
# EMBEDDINGS & DB
# -----------------------------
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
_vector_db = Chroma(persist_directory="./vector_db", embedding_function=embeddings)

# -----------------------------
# LANGGRAPH STATE
# -----------------------------
class AgentState(TypedDict):
    query: str
    history: List[dict]
    route: str
    queries_to_run: List[str]
    documents: str
    generation: dict
    retry_count: int

# -----------------------------
# GRAPH NODES
# -----------------------------
def route_query(state: AgentState):
    """
    Node 1: Intent Routing
    Determines if the user's query is about casual chat, events, or factual PDF data.
    Directs the graph to either generate a response directly, or query the vector DB.
    """
    print(f"--> [ROUTER] Classifying query: '{state['query']}'")
    llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0, groq_api_key=os.getenv("GROQ_API_KEY"))
    class RouteOutput(BaseModel):
        route: str = Field(description="Must be 'chat', 'events', or 'pdf'")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Classify the user intent. If they are just greeting/chatting casually without needing facts, output 'chat'. If they ask about upcoming campus events, festivals, or club activities, output 'events'. If they ask about academic rules, hostel paths, curfews, or any factual NITK information, output 'pdf'."),
        ("human", "{query}")
    ])
    chain = prompt | llm.with_structured_output(RouteOutput)
    try:
        res = chain.invoke({"query": state["query"]})
        route = res.route
    except Exception:
        route = "pdf" # fallback
    print(f"--> [ROUTER] Decision: {route}")
    return {"route": route, "retry_count": state.get("retry_count", 0)}

def router_decision(state: AgentState):
    if state["route"] == "chat" or state["route"] == "events":
        return "generate_response"
    return "expand_query"

def expand_query(state: AgentState):
    """
    Node 2: Multi-Query Expansion
    Uses an LLM to generate alternative phrasing for the search query to improve retrieval recall.
    """
    print(f"--> [EXPANDER] Expanding queries for PDF search...")
    llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0, groq_api_key=os.getenv("GROQ_API_KEY"))
    class ExpOutput(BaseModel):
        queries: List[str] = Field(description="List of exactly 2 precise search queries optimized for a vector database.")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Generate 2 diverse search queries to find the precise answer to the user's question in an academic rulebook vector database."),
        ("human", "{query}")
    ])
    chain = prompt | llm.with_structured_output(ExpOutput)
    queries = [state["query"]]
    try:
        res = chain.invoke({"query": state["query"]})
        queries.extend(res.queries)
    except Exception:
        pass
    print(f"--> [EXPANDER] Queries generated: {queries}")
    return {"queries_to_run": queries, "retry_count": state.get("retry_count", 0) + 1}

def retrieve_context(state: AgentState):
    """
    Node 3: Retrieval & Re-ranking
    Executes a Hybrid Search (BM25 + Chroma Vector) across all generated queries.
    Deduplicates results and uses Flashrank to strongly re-rank the top snippets.
    """
    print(f"--> [RETRIEVER] Running Hybrid Search & Flashrank on {len(state['queries_to_run'])} queries...")
    queries = state["queries_to_run"]
    docs_dict = KurseEngine.vector_db.get()
    docs_content = docs_dict.get('documents', [])
    
    if not docs_content:
        return {"documents": ""}
        
    vector_retriever = KurseEngine.vector_db.as_retriever(search_kwargs={"k": 5})
    all_docs = [Document(page_content=c, metadata=m or {}) for c, m in zip(docs_content, docs_dict.get('metadatas', []))]
    bm25_retriever = BM25Retriever.from_documents(all_docs)
    bm25_retriever.k = 5
    
    all_retrieved = []
    # Retrieve across all expanded variations
    for q in queries:
        all_retrieved.extend(vector_retriever.invoke(q))
        all_retrieved.extend(bm25_retriever.invoke(q))
        
    # Deduplicate exact text matches
    seen = set()
    deduped = []
    for d in all_retrieved:
        if d.page_content not in seen:
            seen.add(d.page_content)
            deduped.append(d)
            
    # Flashrank Compress top results 
    compressor = KurseEngine.get_compressor()
    try:
        # Cross encode using the ORIGINAL query as the anchor point
        final_docs = compressor.compress_documents(deduped, state["query"])
    except Exception as e:
        print(f"    Fallback compressor caught: {e}")
        final_docs = deduped[:5]
        
    doc_strings = []
    for doc in final_docs:
        meta = doc.metadata or {}
        source = meta.get("source_file", meta.get("source", "Unknown Source"))
        page = meta.get("page")
        if page is not None:
            # PyPDFLoader zero-indexes pages, so add 1 for human readable page number
            citation = f"Source: {source}, Page: {int(page) + 1}"
        else:
            citation = f"Source: {source}"
        doc_strings.append(f"[{citation}]\n{doc.page_content}")
        
    doc_str = "\n\n".join(doc_strings)
    print(f"--> [RETRIEVER] Retrieved {len(final_docs)} highly ranked snippets.")
    return {"documents": doc_str}

def grade_documents(state: AgentState):
    """
    Node 4: Context Grading
    Evaluates if the retrieved chunks are actually relevant to answering the query.
    If completely irrelevant, it triggers a retry loop.
    """
    doc_len = len(state.get("documents", ""))
    print(f"--> [GRADER] Grading documents (Length: {doc_len} bytes)")
    if not state.get("documents"):
        return {"route": "pdf"} # force to generation
        
    llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0, groq_api_key=os.getenv("GROQ_API_KEY"))
    class GradeOutput(BaseModel):
        relevant: bool = Field(description="True if context contains information relevant to the query.")
        
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a grader assessing relevance of retrieved documents to a user query. \nDocuments: {documents}\nIf they are completely irrelevant, output False. Otherwise True."),
        ("human", "{query}")
    ])
    chain = prompt | llm.with_structured_output(GradeOutput)
    try:
        res = chain.invoke({"query": state["query"], "documents": state["documents"]})
        if res.relevant:
            print("--> [GRADER] Decision: RELEVANT. Proceeding to answer.")
            return {"route": "pdf"}
        else:
            print("--> [GRADER] Decision: IRRELEVANT. Triggering rewrite.")
            return {"route": "rewrite"}
    except Exception:
        return {"route": "pdf"}

def grader_decision(state: AgentState):
    if state["route"] == "rewrite" and state.get("retry_count", 0) < 2:
        return "expand_query"
    return "generate_response"

def generate_response(state: AgentState):
    """
    Node 5: Final Generation
    Synthesizes the final answer using retrieved PDF context or live event data.
    Returns a Pydantic object containing the text and any clickable action buttons.
    """
    print(f"--> [GENERATOR] Crafting final AssistantResponse...")
    llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0, groq_api_key=os.getenv("GROQ_API_KEY"))
    structured_llm = llm.with_structured_output(AssistantResponse)
    
    events_context = "No upcoming events currently available."
    if state.get("route") == "events" or "event" in state["query"].lower():
        try:
            import requests
            resp = requests.get("http://localhost:5000/api/events", timeout=2)
            if resp.status_code == 200:
                events = resp.json()
                if events:
                    text = "UPCOMING CAMPUS EVENTS:\n"
                    for e in events:
                        date = e.get('date', '')[:10] if e.get('date') else ''
                        club_name = e.get('club', {}).get('name', 'Unknown Club')
                        text += f"- {e.get('title')} by {club_name} on {date} at {e.get('time')}. Venue: {e.get('venue')}. Link: {e.get('registrationLink')}. {e.get('description')}\n"
                    events_context = text
        except Exception:
            pass

    chat_history = []
    for msg in state.get("history", []):
        r = msg.get("role", "")
        t = msg.get("text", "")
        if r == "user":
            chat_history.append(HumanMessage(content=t))
        elif r == "bot":
            chat_history.append(AIMessage(content=t))

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are the NITK Assistant. Based on the context below, answer the user. If they are just greeting, chat naturally. If context is provided to answer a factual question, rely on it strictly and ALWAYS append a 'Sources:' list at the end of your response, citing the Source and Page Number for any information used. If no info is found, say 'I'm sorry, no such data was found in the NITK documents.'\n\nContext:\n{context}\n\nEvents:\n{events_context}"),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{query}")
    ])
    
    chain = prompt | structured_llm
    try:
        res = chain.invoke({
            "context": state.get("documents", ""),
            "events_context": events_context,
            "history": chat_history,
            "query": state["query"],
        })
        return {"generation": res.dict()}
    except Exception as e:
        print(f"Generation error: {e}")
        return {"generation": {"answer": "An error occurred while building the response.", "actions": []}}

# -----------------------------
# GRAPH COMPILATION
# -----------------------------
workflow = StateGraph(AgentState)
workflow.add_node("route_query", route_query)
workflow.add_node("expand_query", expand_query)
workflow.add_node("retrieve_context", retrieve_context)
workflow.add_node("grade_documents", grade_documents)
workflow.add_node("generate_response", generate_response)

workflow.add_edge(START, "route_query")
workflow.add_conditional_edges("route_query", router_decision, {
    "generate_response": "generate_response",
    "expand_query": "expand_query"
})
workflow.add_edge("expand_query", "retrieve_context")
workflow.add_edge("retrieve_context", "grade_documents")
workflow.add_conditional_edges("grade_documents", grader_decision, {
    "expand_query": "expand_query",
    "generate_response": "generate_response"
})
workflow.add_edge("generate_response", END)

kurse_master_graph = workflow.compile()

# -----------------------------
# ENGINE WRAPPER
# -----------------------------
class KurseEngine:
    """
    Singleton wrapper managing the vector database and executing the LangGraph RAG pipeline.
    Provides API for PDF ingestion, deletion, and query asking.
    """
    vector_db = _vector_db
    _compressor = None

    @classmethod
    def get_compressor(cls):
        if cls._compressor is None:
            cls._compressor = FlashrankRerank(top_n=3)
        return cls._compressor

    @staticmethod
    def ingest_pdf(file_path: str, filename: str) -> int:
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(documents)
        for chunk in chunks:
            chunk.metadata["source_file"] = filename
        KurseEngine.vector_db.add_documents(chunks)
        KurseEngine.vector_db.persist()
        return len(chunks)

    @staticmethod
    def delete_pdf(filename: str) -> bool:
        data = KurseEngine.vector_db.get(where={"source_file": filename})
        ids = data.get("ids", [])
        if not ids: return False
        KurseEngine.vector_db.delete(ids=ids)
        KurseEngine.vector_db.persist()
        return True

    @staticmethod
    def list_documents():
        data = KurseEngine.vector_db.get(include=["metadatas"])
        stats = {}
        for meta in data.get("metadatas", []):
            source = meta.get("source_file")
            if source: stats[source] = stats.get(source, 0) + 1
        return [{"filename": fn, "chunks": ct, "status": "Indexed"} for fn, ct in stats.items()]

    @staticmethod
    def ask(query: str, history: List[dict] = None) -> dict:
        if history is None:
             history = []
        
        initial_state = {
            "query": query,
            "history": history,
            "route": "",
            "queries_to_run": [],
            "documents": "",
            "generation": {},
            "retry_count": 0
        }
        
        final_state = kurse_master_graph.invoke(initial_state)
        return final_state["generation"]
