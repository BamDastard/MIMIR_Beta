import os
import requests
from bs4 import BeautifulSoup
from typing import Optional, Dict, List
from dotenv import load_dotenv
import google.generativeai as genai
from datetime import datetime, timedelta
import json

load_dotenv()

# API Keys
GOOGLE_SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
GOOGLE_SEARCH_ENGINE_ID = os.getenv("GOOGLE_SEARCH_ENGINE_ID")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Configure Gemini for content summarization
genai.configure(api_key=GOOGLE_API_KEY)

# Simple in-memory cache
_cache = {}

def _get_cache(key: str, max_age_minutes: int = 30) -> Optional[any]:
    """Get cached value if not expired"""
    if key in _cache:
        data, timestamp = _cache[key]
        if datetime.now() - timestamp < timedelta(minutes=max_age_minutes):
            return data
    return None

def _set_cache(key: str, value: any):
    """Set cache value with current timestamp"""
    _cache[key] = (value, datetime.now())


import concurrent.futures

def web_search(query: str, num_results: int = 3) -> Dict:
    """
    Search Google and digest top results.
    
    Args:
        query: Search query string
        num_results: Number of results to return (max 5)
    
    Returns:
        {
            "results": [
                {
                    "title": "...",
                    "url": "...",
                    "snippet": "...",
                    "content_summary": "..."
                },
                ...
            ],
            "query": "original query"
        }
    """
    try:
        # print(f"[TOOL] Searching web for: {query}")
        
        # Call Google Custom Search API
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": GOOGLE_SEARCH_API_KEY,
            "cx": GOOGLE_SEARCH_ENGINE_ID,
            "q": query,
            "num": min(num_results, 5)
        }
        
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        results = []
        
        if "items" in data:
            items = data["items"][:num_results]
            
            def process_item(item):
                result = {
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", "")
                }
                
                # Try to fetch page content
                try:
                    page_response = requests.get(item["link"], timeout=3, headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    })
                    
                    if page_response.status_code == 200:
                        # Parse HTML
                        soup = BeautifulSoup(page_response.content, 'lxml')
                        
                        # Remove script and style elements
                        for script in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
                            script.decompose()
                        
                        # Get text
                        text = soup.get_text(separator=' ', strip=True)
                        
                        # Limit to first 1500 characters
                        # We return raw text now instead of summarizing with LLM to save time
                        # The main model will do the synthesis
                        result["content_summary"] = text[:1500] + "..." if len(text) > 1500 else text
                    else:
                        result["content_summary"] = result["snippet"]
                        
                except Exception as e:
                    # print(f"[TOOL] Could not fetch {item['link']}: {e}")
                    result["content_summary"] = result["snippet"]
                
                return result

            # Fetch pages in parallel
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                results = list(executor.map(process_item, items))
        
        return {
            "query": query,
            "results": results
        }
        
    except Exception as e:
        print(f"[TOOL ERROR] Web search failed: {e}")
        return {
            "query": query,
            "results": [],
            "error": str(e)
        }


def get_weather(location: str = None, lat: float = None, lon: float = None) -> Dict:
    """
    Get current weather and 5-day forecast.
    
    Args:
        location: City name (e.g., "Tokyo" or "Tampa, Florida")
        lat: Latitude (alternative to location)
        lon: Longitude (alternative to location)
    
    Returns:
        {
            "location": "City, Country",
            "current": {
                "temp": 72,
                "feels_like": 70,
                "conditions": "Clear",
                "humidity": 65,
                "wind_speed": 5
            },
            "forecast": [
                {"date": "2025-11-22", "high": 75, "low": 60, "conditions": "Partly Cloudy"},
                ...
            ]
        }
    """
    try:
        # Check cache
        cache_key = f"weather_{location}_{lat}_{lon}"
        cached = _get_cache(cache_key, max_age_minutes=30)
        if cached:
            print(f"[TOOL] Using cached weather data")
            return cached
        
        print(f"[TOOL] Executing get_weather")
        
        # If location provided, geocode to lat/lon
        if location and not (lat and lon):
            geo_url = "http://api.openweathermap.org/geo/1.0/direct"
            geo_params = {
                "q": location,
                "limit": 1,
                "appid": OPENWEATHER_API_KEY
            }
            geo_response = requests.get(geo_url, params=geo_params, timeout=10)
            geo_response.raise_for_status()
            geo_data = geo_response.json()
            
            if not geo_data:
                return {"error": f"Location '{location}' not found"}
            
            lat = geo_data[0]["lat"]
            lon = geo_data[0]["lon"]
            location_name = f"{geo_data[0].get('name', '')}, {geo_data[0].get('country', '')}"
        else:
            location_name = location or f"{lat}, {lon}"
        
        # Get current weather
        current_url = "https://api.openweathermap.org/data/2.5/weather"
        current_params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
            "units": "imperial"  # Fahrenheit
        }
        current_response = requests.get(current_url, params=current_params, timeout=10)
        current_response.raise_for_status()
        current_data = current_response.json()
        
        # Get 5-day forecast
        forecast_url = "https://api.openweathermap.org/data/2.5/forecast"
        forecast_params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
            "units": "imperial"
        }
        forecast_response = requests.get(forecast_url, params=forecast_params, timeout=10)
        forecast_response.raise_for_status()
        forecast_data = forecast_response.json()
        
        # Parse current weather
        current = {
            "temp": round(current_data["main"]["temp"]),
            "feels_like": round(current_data["main"]["feels_like"]),
            "conditions": current_data["weather"][0]["description"].title(),
            "humidity": current_data["main"]["humidity"],
            "wind_speed": round(current_data["wind"]["speed"])
        }
        
        # Parse forecast (group by day, get high/low)
        daily_forecast = {}
        for item in forecast_data["list"]:
            date = datetime.fromtimestamp(item["dt"]).strftime("%Y-%m-%d")
            temp = item["main"]["temp"]
            conditions = item["weather"][0]["description"].title()
            
            if date not in daily_forecast:
                daily_forecast[date] = {
                    "date": date,
                    "high": temp,
                    "low": temp,
                    "conditions": conditions
                }
            else:
                daily_forecast[date]["high"] = max(daily_forecast[date]["high"], temp)
                daily_forecast[date]["low"] = min(daily_forecast[date]["low"], temp)
        
        # Convert to list and round temps
        forecast = []
        for date_key in sorted(daily_forecast.keys())[:5]:
            day = daily_forecast[date_key]
            forecast.append({
                "date": day["date"],
                "high": round(day["high"]),
                "low": round(day["low"]),
                "conditions": day["conditions"]
            })
        
        result = {
            "location": location_name,
            "current": current,
            "forecast": forecast
        }
        
        # Cache result
        _set_cache(cache_key, result)
        
        return result
        
    except Exception as e:
        print(f"[TOOL ERROR] Weather fetch failed: {e}")
        return {"error": str(e)}


def get_location(ip_address: str = None) -> Dict:
    """
    Get user location from IP.
    
    Args:
        ip_address: Optional IP address (auto-detects if not provided)
    
    Returns:
        {
            "city": "...",
            "region": "...",
            "country": "...",
            "lat": 40.7128,
            "lon": -74.0060
        }
    """
    try:
        # Check cache
        cache_key = f"location_{ip_address or 'auto'}"
        cached = _get_cache(cache_key, max_age_minutes=60)
        if cached:
            print(f"[TOOL] Using cached location data")
            return cached
        
        print(f"[TOOL] Executing get_location")
        
        # Call ipapi.co
        url = f"https://ipapi.co/{ip_address or ''}/json/" if ip_address else "https://ipapi.co/json/"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if "error" in data:
            return {"error": data["reason"]}
        
        result = {
            "city": data.get("city", ""),
            "region": data.get("region", ""),
            "country": data.get("country_name", ""),
            "lat": data.get("latitude"),
            "lon": data.get("longitude")
        }
        
        # Cache result
        _set_cache(cache_key, result)
        
        return result
        
    except Exception as e:
        print(f"[TOOL ERROR] Location fetch failed: {e}")
        return {"error": str(e)}


def start_cooking(title: str, ingredients: List[str], steps: List[str]) -> Dict:
    """
    Start a cooking session with a structured recipe.
    
    Args:
        title: Recipe title
        ingredients: List of ingredients with quantities
        steps: List of cooking steps
    
    Returns:
        Structured recipe data or error
    """
    print(f"[TOOL] Executing start_cooking")
    
    # Validate required parameters
    if not steps or len(steps) == 0:
        return {
            "status": "error",
            "error": "MISSING STEPS PARAMETER",
            "message": "The 'steps' parameter is REQUIRED and cannot be empty. You must provide a list of cooking steps. Example: steps=['Step 1 description', 'Step 2 description', 'Step 3 description']. Please call start_cooking again with ALL recipe steps included in the steps parameter."
        }
    
    if not ingredients or len(ingredients) == 0:
        return {
            "status": "error",
            "error": "MISSING INGREDIENTS PARAMETER",
            "message": "The 'ingredients' parameter is REQUIRED and cannot be empty. Please provide a list of ingredients with quantities."
        }
    
    return {
        "status": "started",
        "recipe": {
            "title": title,
            "ingredients": ingredients,
            "steps": steps
        }
    }


def cooking_navigation(action: str, step_index: int = None) -> Dict:
    """
    Navigate through cooking steps.
    
    Args:
        action: 'next', 'prev', 'goto'
        step_index: Target step index (for 'goto')
    
    Returns:
        Navigation action data
    """
    print(f"[TOOL] Executing cooking_navigation")
    return {
        "status": "navigating",
        "action": action,
        "step_index": step_index
    }


def journal_search(start_date: str = None, end_date: str = None, query: str = None, user_id: str = "Matt Burchett") -> Dict:
    """
    Search for journal entries by date range or text query.
    
    Args:
        start_date: YYYY-MM-DD format (optional)
        end_date: YYYY-MM-DD format (optional)
        query: Text to search in journal summaries (optional)
        user_id: User ID to search journals for
    
    Returns:
        {"entries": [...], "count": N}
    """
    print(f"[TOOL] Executing journal_search")
    
    journal_dir = os.path.join(os.getcwd(), "journal_entries")
    if not os.path.exists(journal_dir):
        return {"entries": [], "count": 0}
    
    # Sanitize user_id for filename matching
    safe_id = "".join([c for c in user_id if c.isalnum() or c in (' ', '_', '-')]).strip()
    
    entries = []
    for filename in os.listdir(journal_dir):
        if not filename.endswith('.json'):
            continue
        
        # Check if file belongs to this user
        if not filename.startswith(safe_id + "_"):
            continue
        
        # Extract date from filename: "User Name_YYYY-MM-DD.json"
        try:
            date_part = filename.replace(safe_id + "_", "").replace(".json", "")
            
            # Filter by date range
            if start_date and date_part < start_date:
                continue
            if end_date and date_part > end_date:
                continue
            
            # Load journal entry
            filepath = os.path.join(journal_dir, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                journal_data = json.load(f)
            
            # Filter by query if provided
            if query:
                query_lower = query.lower()
                summary = journal_data.get('summary', '').lower()
                if query_lower not in summary:
                    continue
            
            # Add to results (without full summary to keep response size manageable)
            entries.append({
                "date": journal_data.get('date'),
                "user_id": journal_data.get('user_id'),
                "summary_preview": journal_data.get('summary', '')[:200] + "..." if len(journal_data.get('summary', '')) > 200 else journal_data.get('summary', ''),
                "has_recipe": journal_data.get('recipe') is not None,
                "stats": journal_data.get('stats', {})
            })
        except Exception as e:
            print(f"[TOOL] Error processing journal file {filename}: {e}")
            continue
    
    # Sort by date descending
    entries.sort(key=lambda x: x['date'], reverse=True)
    
    return {
        "entries": entries,
        "count": len(entries)
    }


def journal_read(date: str, user_id: str = "Matt Burchett") -> Dict:
    """
    Read a specific journal entry's full content.
    
    Args:
        date: YYYY-MM-DD format
        user_id: User ID
    
    Returns:
        Full journal entry data including summary, stats, and recipe
    """
    print(f"[TOOL] Executing journal_read")
    
    journal_dir = os.path.join(os.getcwd(), "journal_entries")
    safe_id = "".join([c for c in user_id if c.isalnum() or c in (' ', '_', '-')]).strip()
    journal_path = os.path.join(journal_dir, f"{safe_id}_{date}.json")
    
    if not os.path.exists(journal_path):
        return {"error": f"No journal entry found for {date}"}
    
    try:
        with open(journal_path, 'r', encoding='utf-8') as f:
            journal_data = json.load(f)
        
        return {
            "date": journal_data.get('date'),
            "user_id": journal_data.get('user_id'),
            "summary": journal_data.get('summary'),
            "stats": journal_data.get('stats', {}),
            "recipe": journal_data.get('recipe')
        }
    except Exception as e:
        print(f"[TOOL] Error reading journal: {e}")
        return {"error": f"Failed to read journal: {str(e)}"}


def record_preference(preference: str, user_id: str = "Matt Burchett") -> Dict:
    """
    Record a user preference.
    
    Args:
        preference: The preference to record (e.g., "Likes sci-fi movies", "Interested in AI news")
        user_id: User ID
    
    Returns:
        Status message
    """
    print(f"[TOOL] Executing record_preference")
    
    # We need to access the user_manager instance. 
    # Since tools.py is imported by ai.py which imports user_manager, we can import it here inside the function to avoid circular imports if necessary,
    # or just import at top level if safe. Let's try inside for safety as tools.py is a core module.
    try:
        from backend.core.user_manager import user_manager
        
        # In this context, user_id passed from AI might be the display name or auth ID.
        # The AI usually passes "Matt Burchett" (display name) or similar.
        # But user_manager uses auth_id.
        # We need to find the auth_id for the given display name or assume the caller handles it.
        # HOWEVER, the `execute_tool` method in `ai.py` receives `user_id` which IS the auth_id (from request.state.user_auth_id).
        # So we can trust `user_id` is the auth_id.
        
        success = user_manager.add_preference(user_id, preference)
        if success:
            return {"status": "success", "message": f"Preference recorded: {preference}"}
        else:
            return {"status": "error", "message": "User profile not found"}
            
    except Exception as e:
        print(f"[TOOL ERROR] Failed to record preference: {e}")
        return {"error": str(e)}


def set_home_city(city: str, confirm: bool = False, user_id: str = "Matt Burchett") -> Dict:
    """
    Set the user's home city.
    
    Args:
        city: The city name (e.g., "New York, NY")
        confirm: Whether to overwrite an existing city
        user_id: User ID
    
    Returns:
        Status message
    """
    print(f"[TOOL] Executing set_home_city")
    
    try:
        from backend.core.user_manager import user_manager
        
        # Check if city is already set
        current_city = user_manager.get_home_city(user_id)
        
        if current_city and not confirm:
            if current_city.lower() == city.lower():
                return {"status": "success", "message": f"Home city is already set to {current_city}."}
            
            return {
                "status": "requires_confirmation", 
                "message": f"Home city is currently set to '{current_city}'. Please ask the user for explicit confirmation to change it to '{city}'. If they confirm, call this tool again with confirm=True."
            }
        
        success = user_manager.set_home_city(user_id, city)
        if success:
            return {"status": "success", "message": f"Home city set to: {city}"}
        else:
            return {"status": "error", "message": "User profile not found"}
            
    except Exception as e:
        print(f"[TOOL ERROR] Failed to set home city: {e}")
        return {"error": str(e)}
