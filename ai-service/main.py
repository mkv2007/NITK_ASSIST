from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
from dotenv import load_dotenv
from services.kurse_engine import KurseEngine
from fastapi import Form

load_dotenv()

app = FastAPI(title="NITK Assist AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# ASK
# -----------------------------
@app.post("/ask")
async def ask_kurse(payload: dict):
    query = payload.get("query")
    history = payload.get("history", [])
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    try:
        response_dict = KurseEngine.ask(query, history)
        return response_dict
    except Exception as e:
        print(f"Error in KurseEngine.ask: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# ADMIN: INGEST DOCUMENT
# -----------------------------
from fastapi import Form

@app.post("/admin/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    original_filename: str = Form(...)
):
    temp_path = f"temp_{original_filename}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        chunks = KurseEngine.ingest_pdf(temp_path, original_filename)
        return {
            "filename": original_filename,
            "chunks": chunks,
            "status": "Indexed"
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# -----------------------------
# ADMIN: LIST DOCUMENTS
# -----------------------------
@app.get("/admin/documents")
async def list_documents():
    try:
        return KurseEngine.list_documents()
    except Exception as e:
        print(f"List Documents Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# ADMIN: DELETE DOCUMENT
# -----------------------------
@app.delete("/admin/documents/{filename}")
async def delete_document(filename: str):
    success = KurseEngine.delete_pdf(filename)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")

    return {"message": f"Deleted {filename} from knowledge base"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
