import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq 
from langchain_huggingface import HuggingFaceEmbeddings 
from langchain_community.vectorstores import Chroma 
from langchain_community.document_loaders import PyPDFLoader 
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

# -----------------------------
# 1. LOCAL EMBEDDINGS (No Quota/Billing!)
# -----------------------------
# This model downloads once and runs on your CPU. It is completely free.
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2" #
)

# Initialize Chroma with local embeddings
vector_db = Chroma(
    persist_directory="./vector_db",
    embedding_function=embeddings,
)

# -----------------------------
# Prompt (Remains the same)
# -----------------------------
system_prompt = (
    "You are the NITK Assistant. Use the given context to answer the question. "
    "If the answer is not present in the context, strictly say: "
    "'I'm sorry, no such data was found in the NITK documents.' "
    "\n\n"
    "Context: {context}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
])

class KurseEngine:

    @staticmethod
    def ingest_pdf(file_path: str, filename: str) -> int:
        loader = PyPDFLoader(file_path)
        documents = loader.load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
        )

        chunks = splitter.split_documents(documents)

        for chunk in chunks:
            chunk.metadata["source_file"] = filename

        vector_db.add_documents(chunks) #
        return len(chunks)

    @staticmethod
    def delete_pdf(filename: str) -> bool:
        data = vector_db.get(where={"source_file": filename})
        if data and data.get("ids"):
            vector_db.delete(ids=data["ids"])
            return True
        return False

    @staticmethod
    def ask(query: str) -> str:
        # -----------------------------
        # 2. GROQ LLM (Lightning Fast)
        # -----------------------------
        # Make sure GROQ_API_KEY is in your .env file
        llm = ChatGroq(
            model_name="llama-3.3-70b-versatile", #
            temperature=0,
            groq_api_key=os.getenv("GROQ_API_KEY") #
        )

        retriever = vector_db.as_retriever(
            search_kwargs={"k": 5}
        )

        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        # THE MODERN LCEL PIPE
        rag_chain = (
            {"context": retriever | format_docs, "input": RunnablePassthrough()}
            | prompt 
            | llm 
            | StrOutputParser()
        )

        return rag_chain.invoke(query) 