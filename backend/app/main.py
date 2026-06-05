import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.services.ai_engine import AIEngine

# Initialize FastAPI application
app = FastAPI(
    title="Hindsight™ DevOps AI Engine Backend",
    description="FastAPI backend exposing vector-RAG memory retrieval and feedback classification systems.",
    version="1.0.0"
)

# Enable CORS (Cross-Origin Resource Sharing)
# This allows the React Vite frontend (running on localhost:5173/5174) to securely query the backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon/demo simplicity, allow all. In production restrict this.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate AI Pipeline Engine
ai_engine = AIEngine()

class FeedbackRequest(BaseModel):
    text: str

class FeedbackResponse(BaseModel):
    classification: dict
    active_memory_card_id: str | None
    memory_retrieved: bool
    api_connected: bool

@app.get("/health")
def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "groq_configured": ai_engine.groq_client is not None,
        "hindsight_configured": os.getenv("HINDSIGHT_API_KEY") is not None
    }

@app.post("/api/feedback", response_model=FeedbackResponse)
def analyze_feedback(payload: FeedbackRequest):
    """
    Ingests raw user support tickets or reviews, runs keyword/vector semantic correlation,
    and returns a structured classification.
    """
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Feedback text cannot be empty.")
    
    try:
        result = ai_engine.process_feedback_pipeline(payload.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process feedback pipeline: {str(e)}")

# Command to run local server during development:
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
