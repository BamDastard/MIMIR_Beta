import random
import datetime
from typing import Dict, List, Any
from backend.core.user_manager import user_manager
from backend.core.tools import web_search
from backend.core.calendar import CalendarManager

async def plan_day(user_id: str, google_token: str = None) -> Dict[str, Any]:
    """
    Gather information for the "Planning the Day" feature.
    
    Args:
        user_id: The user's auth ID.
        google_token: The Google Access Token for calendar sync.
        
    Returns:
        A dictionary containing the constructed prompt and initial data.
    """
    print(f"[PLANNING] Starting daily plan for {user_id}")
    
    # 1. Get User Preferences
    preferences = user_manager.get_preferences(user_id)
    selected_prefs = []
    
    if preferences:
        # Select 3-4 random preferences
        num_prefs = min(len(preferences), random.randint(3, 4))
        selected_prefs = random.sample(preferences, num_prefs)
        print(f"[PLANNING] Selected preferences: {selected_prefs}")
    else:
        print("[PLANNING] No preferences found.")

    # 2. Fetch News based on preferences
    news_summary = ""
    if selected_prefs:
        news_summary += "Here is some news related to your interests:\n\n"
        for pref in selected_prefs:
            try:
                # Search for news
                search_result = web_search(f"latest news {pref}", num_results=2)
                if search_result.get("results"):
                    news_summary += f"--- News for '{pref}' ---\n"
                    for item in search_result["results"]:
                        news_summary += f"- {item['title']}: {item['snippet']}\n"
                    news_summary += "\n"
            except Exception as e:
                print(f"[PLANNING] Error searching for {pref}: {e}")
    else:
        # Fallback to top news if no preferences
        try:
            from backend.core.news import news_manager
            top_news = news_manager.get_top_news()
            if top_news:
                news_summary += "Here are the top headlines for today:\n\n"
                for item in top_news[:5]:
                    news_summary += f"- {item['title']} ({item['source']})\n"
        except Exception as e:
            print(f"[PLANNING] Error fetching top news: {e}")

    # 3. Fetch Calendar Events (Next 3 days)
    calendar_summary = ""
    try:
        calendar_manager = CalendarManager(user_id=user_id, google_token=google_token)
        today = datetime.date.today()
        three_days_later = today + datetime.timedelta(days=3)
        
        events = calendar_manager.get_events(
            start_date=today.isoformat(),
            end_date=three_days_later.isoformat()
        )
        
        if events:
            calendar_summary += "Here are your upcoming events for the next 3 days:\n\n"
            for event in events:
                start = event.get('start_time', 'All Day')
                calendar_summary += f"- {event['date']} at {start}: {event['subject']}\n"
        else:
            calendar_summary += "You have no events scheduled for the next 3 days.\n"
            
    except Exception as e:
        print(f"[PLANNING] Error fetching calendar: {e}")
        calendar_summary += "Could not access calendar data.\n"

    # 4. Fetch Weather (if home_city exists)
    weather_summary = ""
    home_city = user_manager.get_home_city(user_id)
    missing_home_city = False
    
    if home_city:
        try:
            from backend.core.tools import get_weather
            # Import log_debug locally or assume it's available if imported at top
            from backend.core.ai import log_debug
            
            log_debug(f"[PLANNING] Fetching weather for {home_city}")
            weather_data = get_weather(location=home_city)
            log_debug(f"[PLANNING] Weather result: {weather_data}")
            
            if "error" not in weather_data:
                current = weather_data.get("current", {})
                forecast = weather_data.get("forecast", [])
                
                weather_summary += f"Weather for {home_city}:\n"
                weather_summary += f"Current: {current.get('temp')}°F, {current.get('conditions')}\n"
                if forecast:
                    today_forecast = forecast[0]
                    weather_summary += f"Today's Forecast: High {today_forecast.get('high')}°F, Low {today_forecast.get('low')}°F, {today_forecast.get('conditions')}\n"
            else:
                weather_summary += f"Could not fetch weather for {home_city}.\n"
                log_debug(f"[PLANNING] Weather error: {weather_data.get('error')}")
        except Exception as e:
            print(f"[PLANNING] Error fetching weather: {e}")
            log_debug(f"[PLANNING] Exception fetching weather: {e}")
    else:
        missing_home_city = True
        log_debug(f"[PLANNING] No home city set for {user_id}")

    # 5. Construct the System Prompt
    # We want MIMIR to welcome the user, present this info, and offer help.
    
    profile = user_manager.get_profile(user_id)
    display_name = profile.display_name if profile else "User"
    
    prompt_instructions = ""
    if missing_home_city:
        prompt_instructions += "\nIMPORTANT: The user has not set a home city. You MUST ask them for their home city so you can provide weather updates in the future. Use the 'set_home_city' tool if they provide it."
    
    system_prompt = f"""
User '{display_name}' has just signed in. 
You are initiating the "Planning the Day" sequence.

Here is the information you have gathered:

{news_summary}

{calendar_summary}

{weather_summary}

Task:
1. Welcome the user back warmly (using your Norse persona).
2. Present the news highlights related to their preferences (if any).
3. Review their upcoming calendar events.
4. Present the weather forecast (if available).
5. Ask if they would like to know more about any of these topics or if they need help planning their day further.{prompt_instructions}

Keep it concise but engaging. Do not just list things; weave them into a narrative.
"""

    return {
        "system_prompt": system_prompt,
        "news_summary": news_summary,
        "calendar_summary": calendar_summary,
        "weather_summary": weather_summary
    }
