from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
from dotenv import load_dotenv
from services.kurse_engine import KurseEngine

load_dotenv()

app = FastAPI(title="NITK Assist AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/ask")
async def ask_kurse(payload: dict):
    query = payload.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    try:
        answer = KurseEngine.ask(query)
        return {"answer": answer} 
    except Exception as e:
        print(f"Error in KurseEngine: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ADDED THIS ROUTE TO FIX THE 404 ---
@app.post("/admin/ingest")
async def ingest_document(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"
    # Save the incoming file stream to a temp file
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Pass to the HuggingFace engine
        chunks = KurseEngine.ingest_pdf(temp_path, file.filename)
        return {"message": f"Successfully indexed {file.filename}", "chunks": chunks}
    except Exception as e:
        print(f"Ingestion Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.delete("/admin/documents/{filename}")
async def delete_document(filename: str):
    success = KurseEngine.delete_pdf(filename)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": f"Deleted {filename} from knowledge base"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)