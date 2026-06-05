# Hindsight™ AI Engine Backend (Member 3: AI Engineer)

This directory contains the Python backend service supporting RAG, persistent vector memories, and feedback classification.

---

## 🚀 Features

1. **Structured Classification**: Employs Pydantic schemas and Groq JSON completion modes to classify user reviews.
2. **Long-Term Memory RAG**: Queries past incident/feedback patterns using the Hindsight memory layer client.
3. **Resilient Demo Simulator**: Automatically falls back to high-fidelity static simulations if API keys are not loaded, ensuring the demo always succeeds.

---

## 🛠️ Local Quickstart

### 1. Create and Activate Virtual Environment

From the `backend/` directory:

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Set Environment Variables
Export your credentials in the active terminal session:

**On Windows (PowerShell):**
```powershell
$env:GROQ_API_KEY="your-groq-api-key"
$env:HINDSIGHT_API_KEY="your-hindsight-api-key"
$env:HINDSIGHT_COLLECTION_ID="product_user_feedback"
```

**On Linux/macOS:**
```bash
export GROQ_API_KEY="your-groq-api-key"
export HINDSIGHT_API_KEY="your-hindsight-api-key"
export HINDSIGHT_COLLECTION_ID="product_user_feedback"
```

### 4. Run the Dev Server
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once running, you can visit the interactive Swagger API documentation at:
🔗 [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📡 API Endpoints

- **`GET /health`**: Returns engine configuration statuses.
- **`POST /api/feedback`**: Main processing router.
  - **Request Body**:
    ```json
    {
      "text": "I cannot checkout using my company corporate card, the interface spins infinitely!"
    }
    ```
  - **Response Payload**:
    ```json
    {
      "classification": {
        "category": "Billing & Payments",
        "severity": "CRITICAL",
        "summary": "Stripe payment onboarding hanging indefinitely on Visa corporate account authentication.",
        "historical_match_found": true,
        "macro_trend_insight": "Correlates directly with the Visa Card Processing incident..."
      },
      "active_memory_card_id": "billing-visa",
      "memory_retrieved": true,
      "api_connected": false
    }
    ```
