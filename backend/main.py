from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.core.ai import mimir_ai
from backend.core.memory import mimir_memory
from backend.core.voice import mimir_voice
from backend.core.daily_journal import daily_journal
from backend.core.news import news_manager
import uvicorn
import base64
from PyPDF2 import PdfReader
from docx import Document
from openpyxl import load_workbook
from PIL import Image
import io
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID") # Add this to env
genai.configure(api_key=GOOGLE_API_KEY)

from fastapi.staticfiles import StaticFiles

app = FastAPI(title="MIMIR API")

# Allow CORS for local frontend and Cloud Run
# In production, replace "*" with specific Cloud Run URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now to ensure connectivity
    allow_origin_regex="https://.*\.run\.app", # Explicitly allow Cloud Run subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.core.user_manager import user_manager

# Authentication Middleware
from fastapi import Request, HTTPException, status, Response

async def verify_google_token(token: str):
    try:
        # Specify the CLIENT_ID of the app that accesses the backend:
        id_info = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        return id_info
    except ValueError:
        return None

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
        
    # Skip auth for health check and docs
    if request.url.path in ["/", "/docs", "/openapi.json"]:
        return await call_next(request)

    # Allow unauthenticated access to user check endpoints (to prevent catch-22)
    # Actually, /user/me and /user/onboard REQUIRE auth token, but might not have a profile yet.
    
    auth_header = request.headers.get('Authorization')
    
    # Development Mode (No Client ID) - Permissive
    if not GOOGLE_CLIENT_ID:
        # Mock user for dev
        request.state.user_auth_id = "dev_user_123"
        request.state.user_email = "dev@example.com"
        return await call_next(request)

    # Production Mode - Strict
    if not auth_header or not auth_header.startswith('Bearer '):
        return Response(status_code=401, content=json.dumps({"error": "Missing or invalid token"}), media_type="application/json")

    token = auth_header.split(' ')[1]
    user_info = await verify_google_token(token)
    
    if not user_info:
        return Response(status_code=401, content=json.dumps({"error": "Invalid token"}), media_type="application/json")
    
    # Inject User Info into Request State
    request.state.user_auth_id = user_info['sub']
    request.state.user_email = user_info.get('email', '')
    
    # Note: We do NOT check for profile existence here. 
    # That is handled by the endpoints. /user/onboard needs to work even if no profile exists.

    response = await call_next(request)
    return response

# Mount journal attachments
os.makedirs("journal_attachments", exist_ok=True)
app.mount("/journal_attachments", StaticFiles(directory="journal_attachments"), name="journal_attachments")

class ChatRequest(BaseModel):
    message: str
    personality_intensity: int = 75 # 0-100, default 75%

class ChatResponse(BaseModel):
    text: str
    audio_base64: Optional[str] = None
    tools_used: List[str] = []
    tool_results: List[Dict[str, Any]] = []

@app.get("/")
def read_root():
    return {"status": "MIMIR is awake"}

# User Management Endpoints
@app.get("/user/me")
def get_current_user(request: Request):
    auth_id = request.state.user_auth_id
    profile = user_manager.get_profile(auth_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile

class OnboardRequest(BaseModel):
    display_name: str

@app.post("/user/onboard")
def onboard_user(request: Request, data: OnboardRequest):
    auth_id = request.state.user_auth_id
    email = request.state.user_email
    
    if not data.display_name.strip():
        raise HTTPException(status_code=400, detail="Display name is required")
        
    profile = user_manager.create_profile(auth_id, email, data.display_name)
    return profile

from fastapi.responses import StreamingResponse
import asyncio

# Ensure necessary directories exist on startup
# Ensure necessary directories exist on startup
@app.on_event("startup")
async def startup_event():
    dirs = ["daily_logs", "journal_attachments", "journal_entries", "calendars", "temp", "mimir_memory_db"]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
        print(f"[STARTUP] Ensured directory exists: {d}")

    # Ensure user_profiles.json exists
    if not os.path.exists("user_profiles.json"):
        with open("user_profiles.json", "w") as f:
            json.dump({}, f)
        print("[STARTUP] Created empty user_profiles.json")

@app.post("/chat")
async def chat(request: Request, body: ChatRequest):
    try:
        from datetime import datetime
        user_msg = body.message
        personality = body.personality_intensity
        
        # Get Authenticated User
        auth_id = request.state.user_auth_id
        profile = user_manager.get_profile(auth_id)
        
        if not profile:
            raise HTTPException(status_code=403, detail="User not onboarded")
            
        user_id = auth_id # Use Auth ID for internal storage
        display_name = profile.display_name # Use Display Name for AI Context
        
        async def event_generator():
            try:
                # 1. Recall Context for specific user
                daily_journal.log_interaction(user_id, "chat", f"User: {user_msg}")
                context = mimir_memory.recall(user_msg, user_id=user_id)
                
                # 2. Add current date/time to context
                current_time = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")
                time_context = f"Current Date and Time: {current_time}\\nUser Name: {display_name}"
                
                if context:
                    context = f"{time_context}\\n\\n{context}"
                else:
                    context = time_context
    
                # 2.5 Check for Daily Journal Triggers
                # Check if we need to generate yesterday's journal
                await daily_journal.check_end_of_day(user_id)
                
                # Check if we should prompt the user
                if daily_journal.check_prompt_needed(user_id):
                    daily_journal.mark_prompted(user_id)
                    context += "\\n\\n[SYSTEM NOTE: It is after 7:00 PM and the user has not recorded much today. Gently ask them how their day went and if they have anything to add to their daily log.]"
                
                # 3. Generate Response Stream
                async for event in mimir_ai.generate_response_stream(user_msg, context, personality_intensity=personality, user_id=user_id):
                    if event["type"] == "response":
                        response_text = event["text"]
                        tools_used = event["tools_used"]
                        tool_results = event["tool_results"]
                        
                        # 3. Remember Interaction for specific user
                        mimir_memory.remember(f"User: {user_msg}\\nMIMIR: {response_text}", user_id=user_id)
                        daily_journal.log_interaction(user_id, "chat", f"MIMIR: {response_text}")
                        if tools_used:
                            daily_journal.log_interaction(user_id, "tool_use", {"tools": tools_used, "results": tool_results})
                        
                        # 4. Generate Voice
                        audio_bytes = mimir_voice.speak(response_text)
                        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8') if audio_bytes else None
                        
                        yield json.dumps({
                            "type": "response",
                            "text": response_text,
                            "audio_base64": audio_b64,
                            "tools_used": tools_used,
                            "tool_results": tool_results
                        }) + "\n"
                    else:
                        # Status update
                        yield json.dumps(event) + "\n"
            except Exception as e:
                print(f"Error in event generator: {e}")
                import traceback
                traceback.print_exc()
                yield json.dumps({"type": "error", "text": "The threads of fate are tangled. I cannot respond."}) + "\n"
                    
        return StreamingResponse(event_generator(), media_type="application/x-ndjson")
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def read_document_content(file_path: str, content: bytes = None) -> str:
    """Reads content from a file path or bytes"""
    try:
        if content is None:
            with open(file_path, "rb") as f:
                content = f.read()
        
        text = ""
        filename = os.path.basename(file_path)
        
        if filename.endswith('.txt') or filename.endswith('.csv'):
            text = content.decode('utf-8')
            
        elif filename.endswith('.pdf'):
            pdf_reader = PdfReader(io.BytesIO(content))
            text = "\\n".join([page.extract_text() for page in pdf_reader.pages])
            
        elif filename.endswith(('.doc', '.docx')):
            doc = Document(io.BytesIO(content))
            text = "\\n".join([paragraph.text for paragraph in doc.paragraphs])
            
        elif filename.endswith(('.xls', '.xlsx')):
            wb = load_workbook(io.BytesIO(content))
            text_parts = []
            for sheet in wb.worksheets:
                text_parts.append(f"Sheet: {sheet.title}")
                for row in sheet.iter_rows(values_only=True):
                    text_parts.append(" | ".join([str(cell) if cell is not None else "" for cell in row]))
            text = "\\n".join(text_parts)
            
        elif filename.endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp')):
            # For direct reading, we might return a description or handle it in AI core
            # But for memory storage, we use Vision
            model = genai.GenerativeModel('gemini-2.5-pro')
            image = Image.open(io.BytesIO(content))
            response = model.generate_content([
                "Describe this image in detail, including any text visible in the image:",
                image
            ])
            text = f"Image: {filename}\\n{response.text}"
            
        return text
    except Exception as e:
        print(f"Error reading document {file_path}: {e}")
        return ""

@app.post("/upload")
async def upload_document(request: Request, file: UploadFile = File(...)):
    """Upload a document to MIMIR's memory"""
    user_id = request.state.user_auth_id
    try:
        content = await file.read()
        text = read_document_content(file.filename, content)
        
        if not text.strip():
            return {"status": "error", "message": "No text content could be extracted from the file"}
        
        # Store in memory for specific user
        mimir_memory.remember(text, user_id=user_id, metadata={"source": file.filename, "type": "document"})
        
        return {"status": "success", "message": f"Document '{file.filename}' has been added to MIMIR's memory"}
    except Exception as e:
        return {"status": "error", "message": f"Error processing file: {str(e)}"}

@app.post("/upload_temp")
async def upload_temp(file: UploadFile = File(...)):
    """Upload a file to a temp directory and return the path"""
    try:
        temp_dir = os.path.join(os.getcwd(), "temp")
        os.makedirs(temp_dir, exist_ok=True)
        
        file_path = os.path.join(temp_dir, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        return {"path": file_path}
    except Exception as e:
        return {"error": str(e)}

# Calendar endpoints
from backend.core.calendar import CalendarManager

@app.get("/calendar/events")
async def get_calendar_events(request: Request, start_date: str = None, end_date: str = None):
    """Get all calendar events or filter by date range"""
    user_id = request.state.user_auth_id
    calendar_manager = CalendarManager(user_id=user_id)
    events = calendar_manager.get_events(start_date, end_date)
    return {"events": events}

@app.post("/calendar/events")
async def create_calendar_event(request: Request, event: dict):
    """Create a new calendar event"""
    user_id = request.state.user_auth_id
    calendar_manager = CalendarManager(user_id=user_id)
    result = calendar_manager.create_event(
        subject=event['subject'],
        date=event['date'],
        start_time=event.get('start_time'),
        end_time=event.get('end_time'),
        details=event.get('details')
    )
    return result

@app.put("/calendar/events/{event_id}")
async def update_calendar_event(request: Request, event_id: str, event: dict):
    """Update a calendar event"""
    user_id = request.state.user_auth_id
    calendar_manager = CalendarManager(user_id=user_id)
    result = calendar_manager.update_event(event_id, **{k: v for k, v in event.items() if k != 'user_id'})
    return result

@app.delete("/calendar/events/{event_id}")
async def delete_calendar_event(request: Request, event_id: str):
    """Delete a calendar event"""
    user_id = request.state.user_auth_id
    calendar_manager = CalendarManager(user_id=user_id)
    success = calendar_manager.delete_event(event_id)
    return {"success": success}

@app.get("/news/top")
async def get_top_news(refresh: bool = False):
    """Get top 10 news headlines."""
    return {"news": news_manager.get_top_news(force_refresh=refresh)}

@app.post("/news/log")
async def log_news_access(request: Request, title: str = Form(...), url: str = Form(...)):
    """Log that a user accessed a news item."""
    user_id = request.state.user_auth_id
    daily_journal.log_interaction(user_id, "action", f"Read news: {title} ({url})")
    return {"status": "logged"}

@app.post("/open_file")
async def open_file(path: str = Form(...)):
    """Opens a file on the host system."""
    import subprocess
    import platform
    
    if not os.path.exists(path):
        return {"error": "File not found"}
        
    try:
        # Disable in Cloud Run (check for K_SERVICE env var)
        if os.getenv("K_SERVICE"):
             return {"error": "This feature is disabled in the cloud environment."}

        if platform.system() == 'Windows':
            os.startfile(path)
        elif platform.system() == 'Darwin':
            subprocess.call(('open', path))
        else:
            subprocess.call(('xdg-open', path))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/journal/{date_str}")
async def get_journal_entry(request: Request, date_str: str):
    """Get the journal entry for a specific date."""
    user_id = request.state.user_auth_id
    safe_id = "".join([c for c in user_id if c.isalnum() or c in (' ', '_', '-')]).strip()
    journal_dir = os.path.join(os.getcwd(), "journal_entries")
    journal_path = os.path.join(journal_dir, f"{safe_id}_{date_str}.json")
    
    if not os.path.exists(journal_path):
        return {"error": "Journal entry not found"}
        
    try:
        with open(journal_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        return {"error": f"Failed to load journal: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
