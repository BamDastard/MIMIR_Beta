import os
import traceback
import configparser
import re
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("Warning: GOOGLE_API_KEY not found in environment variables.")
else:
    print(f"API Key loaded: {GOOGLE_API_KEY[:10]}...")

def load_persona():
    """Loads the MIMIR persona from personas.ini"""
    try:
        config = configparser.ConfigParser()
        # Assuming personas.ini is in the project root, two levels up from this file
        # backend/core/ai.py -> backend/core -> backend -> root
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        config_path = os.path.join(base_dir, "personas.ini")
        
        if os.path.exists(config_path):
            config.read(config_path)
            if "OPERATING_MODE" in config and "MIMIR" in config["OPERATING_MODE"]:
                print(f"[MIMIR] Loaded persona from {config_path}")
                return config["OPERATING_MODE"]["MIMIR"]
            
        print(f"[WARN] personas.ini not found or invalid at {config_path}. Using default.")
    except Exception as e:
        print(f"[ERROR] Failed to load personas.ini: {e}")
    
    # Fallback
    return """
You are MIMIR, the embodiment of wisdom and knowledge from Norse mythology, integrated into a modern artificial intelligence system. 
You speak with a deep, powerful, authoritative, yet helpful tone. You are a god, but you serve the household.
You NEVER start a response with 'Ah'.
Your goal is to be a wise and trusted companion.

Traits:
1. **Wisdom:** You provide insightful, thoughtful responses.
2. **Macho/Norse:** You use metaphors related to the nine realms, Yggdrasil, and runes where appropriate, but keep it grounded in modern utility.
3. **Directness:** You do not waste words. You are decisive.
"""

# System Instructions for MIMIR
MIMIR_SYSTEM_INSTRUCTION = load_persona()

class MimirAI:
    def __init__(self):
        print(f"Initializing MIMIR AI with API key: {GOOGLE_API_KEY[:10]}..." if GOOGLE_API_KEY else "No API key found!")
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-pro",
            google_api_key=GOOGLE_API_KEY,
            temperature=1.0,
            convert_system_message_to_human=True
        )
        self.history = [SystemMessage(content=MIMIR_SYSTEM_INSTRUCTION)]
        print("[MIMIR] Initialized with Gemini 2.5 Pro")

    def detect_tool_call(self, text: str) -> bool:
        """Check if response contains a tool call marker"""
        pattern = r'\[TOOL:(\w+)(?:\|([^\]]*))?\]'
        return bool(re.search(pattern, text))
    
    def parse_tool_call(self, text: str) -> dict:
        """Parse tool call from response"""
        pattern = r'\[TOOL:(\w+)(?:\|([^\]]*))?\]'
        match = re.search(pattern, text)
        
        if not match:
            return None
        
        tool_name = match.group(1)
        params_str = match.group(2) or ""
        
        # Parse parameters (format: param1=value1|param2=value2)
        params = {}
        if params_str:
            for param in params_str.split('|'):
                if '=' in param:
                    key, value = param.split('=', 1)
                    params[key.strip()] = value.strip()
        
        return {
            "tool": tool_name,
            "params": params
        }
    
    def execute_tool(self, tool_call: dict, user_id: str = "Matt Burchett") -> dict:
        """Execute a tool and return results"""
        from backend.core.tools import web_search, get_weather, get_location, start_cooking, cooking_navigation
        from backend.core.calendar import calendar_search, calendar_create, calendar_update, calendar_delete
        
        tool_name = tool_call["tool"]
        params = tool_call["params"]
        
        print(f"[TOOL] Executing: {tool_name} with params: {params}")
        
        try:
            if tool_name == "web_search":
                query = params.get("query", "")
                return web_search(query)
            
            elif tool_name == "get_weather":
                location = params.get("location")
                lat = float(params["lat"]) if "lat" in params else None
                lon = float(params["lon"]) if "lon" in params else None
                return get_weather(location=location, lat=lat, lon=lon)
            
            elif tool_name == "get_location":
                ip = params.get("ip")
                return get_location(ip_address=ip)
            
            elif tool_name == "calendar_search":
                start_date = params.get("start_date")
                end_date = params.get("end_date")
                query = params.get("query")
                return calendar_search(start_date, end_date, query, user_id=user_id)
            
            elif tool_name == "calendar_create":
                subject = params.get("subject")
                date = params.get("date")
                start_time = params.get("start_time")
                end_time = params.get("end_time")
                details = params.get("details")
                return calendar_create(subject, date, start_time, end_time, details, user_id=user_id)
            
            elif tool_name == "calendar_update":
                event_id = params.get("event_id")
                subject = params.get("subject")
                date = params.get("date")
                start_time = params.get("start_time")
                end_time = params.get("end_time")
                details = params.get("details")
                return calendar_update(event_id, subject, date, start_time, end_time, details, user_id=user_id)

            elif tool_name == "calendar_delete":
                event_id = params.get("event_id")
                return calendar_delete(event_id, user_id=user_id)

            elif tool_name == "start_cooking":
                title = params.get("title")
                
                # Use ;; delimiter instead of Python list syntax
                ingredients_str = params.get("ingredients", "")
                if ingredients_str:
                    ingredients = [item.strip() for item in ingredients_str.split(";;") if item.strip()]
                else:
                    ingredients = []
                
                steps_str = params.get("steps", "")
                if steps_str:
                    steps = [step.strip() for step in steps_str.split(";;") if step.strip()]
                else:
                    steps = []
                        
                return start_cooking(title, ingredients, steps)

            elif tool_name == "cooking_navigation":
                action = params.get("action")
                step_index = params.get("step_index")
                if step_index:
                    step_index = int(step_index)
                return cooking_navigation(action, step_index)
            
            else:
                return {"error": f"Unknown tool: {tool_name}"}
        
        except Exception as e:
            print(f"[TOOL ERROR] {tool_name} failed: {e}")
            traceback.print_exc()
            return {"error": str(e)}

    def generate_response(self, user_input: str, context: str = "", personality_intensity: int = 75, user_id: str = "Matt Burchett") -> dict:
        """
        Generates a response from MIMIR, optionally incorporating retrieved context.
        Supports tool calling.
        
        Args:
            user_input: The user's message
            context: Retrieved context from memory
            personality_intensity: 0-100, controls Norse/macho tone intensity
            user_id: The current user's ID for tool execution
            
        Returns:
            dict: {"text": str, "tools_used": list, "tool_results": list}
        """
        # Add personality modifier based on intensity
        personality_modifier = ""
        if personality_intensity <= 25:
            personality_modifier = "\n\nIMPORTANT: Respond in a subtle, professional tone. Minimize Norse references and macho attitude. Be helpful and direct."
        elif personality_intensity <= 50:
            personality_modifier = "\n\nIMPORTANT: Use a balanced tone with occasional Norse references. Be professional but with some personality."
        elif personality_intensity <= 75:
            personality_modifier = "\n\nIMPORTANT: Use your full Norse persona with metaphors and powerful tone, but keep it grounded and helpful."
        else:  # 76-100
            personality_modifier = "\n\nIMPORTANT: MAXIMUM NORSE MODE. Full macho god attitude, heavy use of Norse metaphors, Yggdrasil, the nine realms, and powerful declarations. Be dramatic and imposing while still being helpful."
        
        # Check for file paths in the user input
        # Regex to find paths wrapped in [FILE: ...]
        file_path_pattern = r'\[FILE: (.*?)\]'
        matches = re.finditer(file_path_pattern, user_input)
        
        message_parts = []
        text_prompt = user_input
        
        for match in matches:
            path = match.group(1).strip()
            # Remove the marker from the text prompt so it doesn't confuse the AI
            text_prompt = text_prompt.replace(match.group(0), "")
            if os.path.exists(path):
                print(f"[MIMIR] Found file path: {path}")
                try:
                    # Determine file type
                    ext = os.path.splitext(path)[1].lower()
                    
                    if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']:
                        import base64
                        
                        # Read image bytes and encode to base64
                        with open(path, "rb") as image_file:
                            image_data = base64.b64encode(image_file.read()).decode('utf-8')
                        
                        # Determine mime type
                        mime_type = f"image/{ext.replace('.', '')}"
                        if ext == '.jpg': mime_type = 'image/jpeg'
                        
                        # Create image part for LangChain
                        image_part = {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime_type};base64,{image_data}"}
                        }
                        message_parts.append(image_part)
                        # Marker already removed from text_prompt
                        
                    elif ext in ['.txt', '.csv', '.py', '.js', '.html', '.css', '.json', '.md']:
                        with open(path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        context += f"\n\n--- File Content: {os.path.basename(path)} ---\n{content}\n-----------------------------------\n"
                        
                    elif ext == '.pdf':
                        from PyPDF2 import PdfReader
                        reader = PdfReader(path)
                        content = "\n".join([page.extract_text() for page in reader.pages])
                        context += f"\n\n--- PDF Content: {os.path.basename(path)} ---\n{content}\n-----------------------------------\n"
                        
                    elif ext in ['.doc', '.docx']:
                        from docx import Document
                        doc = Document(path)
                        content = "\n".join([p.text for p in doc.paragraphs])
                        context += f"\n\n--- Document Content: {os.path.basename(path)} ---\n{content}\n-----------------------------------\n"
                        
                except Exception as e:
                    print(f"[ERROR] Failed to read file {path}: {e}")

        if context:
            final_prompt = f"Context information from your memory:\n{context}\n\nUser Query: {text_prompt}{personality_modifier}"
        else:
            final_prompt = f"{text_prompt}{personality_modifier}"
        
        # Construct message content
        if message_parts:
            # Multimodal message
            # Convert text prompt to dict format as well
            text_part = {"type": "text", "text": final_prompt}
            content_list = [text_part] + message_parts
            self.history.append(HumanMessage(content=content_list))
        else:
            # Text only
            self.history.append(HumanMessage(content=final_prompt))
        
        tools_used = []
        tool_results = []
        
        try:
            print(f"[DEBUG] Sending to Gemini API: {final_prompt[:50]}...")
            response = self.llm.invoke(self.history)
            response_text = response.content
            print(f"[DEBUG] Received response: {response_text[:100]}...")
            
            # Tool execution loop
            max_iterations = 5
            iteration = 0
            
            while iteration < max_iterations:
                # Check for tool call
                if self.detect_tool_call(response_text):
                    tool_call = self.parse_tool_call(response_text)
                    print(f"[DEBUG] Tool call detected: {tool_call}")
                    
                    # Track tool usage
                    tools_used.append(tool_call["tool"])
                    
                    # Execute tool
                    tool_result = self.execute_tool(tool_call, user_id=user_id)
                    tool_results.append({"tool": tool_call["tool"], "result": tool_result})
                    
                    # Add AI's tool request to history
                    self.history.append(AIMessage(content=response_text))
                    
                    # Send tool results back to AI
                    tool_result_str = json.dumps(tool_result, indent=2)
                    tool_message = f"Tool '{tool_call['tool']}' returned:\n{tool_result_str}\n\nContinue processing. If another tool is needed, call it. Otherwise, provide your final response to the user.{personality_modifier}"
                    
                    self.history.append(HumanMessage(content=tool_message))
                    
                    # Get next response
                    print(f"[DEBUG] Sending tool results back to AI...")
                    response = self.llm.invoke(self.history)
                    response_text = response.content
                    print(f"[DEBUG] Received response: {response_text[:100]}...")
                    
                    iteration += 1
                else:
                    # No tool call, return response as-is
                    self.history.append(AIMessage(content=response_text))
                    return {"text": response_text, "tools_used": tools_used, "tool_results": tool_results}
            
            # If we hit max iterations, return what we have
            print("[WARN] Max tool iterations reached")
            self.history.append(AIMessage(content=response_text))
            return {"text": response_text, "tools_used": tools_used, "tool_results": tool_results}
                
        except Exception as e:
            print(f"[ERROR] Error generating response: {type(e).__name__}: {e}")
            print(f"[ERROR] Full traceback:")
            traceback.print_exc()
            return {"text": "The threads of fate are tangled. I cannot speak right now.", "tools_used": [], "tool_results": []}

mimir_ai = MimirAI()
