import os
import json
import datetime
from typing import List, Dict, Any
from backend.core.ai import mimir_ai
from backend.core.calendar import CalendarManager
from backend.core.memory import mimir_memory

DAILY_LOGS_DIR = "./daily_logs"
JOURNAL_ATTACHMENTS_DIR = "./journal_attachments"

class DailyJournalManager:
    def __init__(self):
        os.makedirs(DAILY_LOGS_DIR, exist_ok=True)
        os.makedirs(JOURNAL_ATTACHMENTS_DIR, exist_ok=True)
        self.prompted_users = set() # Track who has been prompted today

    def _get_log_file(self, user_id: str, date_str: str = None) -> str:
        if not date_str:
            date_str = datetime.datetime.now().strftime("%Y-%m-%d")
        safe_id = "".join([c for c in user_id if c.isalnum() or c in (' ', '_', '-')]).strip()
        return os.path.join(DAILY_LOGS_DIR, f"{safe_id}_{date_str}.json")

    def log_interaction(self, user_id: str, type: str, content: Any):
        """
        Log an interaction for the daily journal.
        type: 'chat', 'tool_call', 'fact', 'action'
        """
        log_file = self._get_log_file(user_id)
        entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "type": type,
            "content": content
        }
        
        logs = []
        if os.path.exists(log_file):
            try:
                with open(log_file, 'r') as f:
                    logs = json.load(f)
            except:
                pass
        
        logs.append(entry)
        
        with open(log_file, 'w') as f:
            json.dump(logs, f, indent=2)

    def check_prompt_needed(self, user_id: str) -> bool:
        """
        Check if we should prompt the user for more info.
        Returns True if:
        - It's after 7 PM
        - We haven't prompted yet today
        - The log is 'sparse' (e.g., < 5 interactions or mostly short)
        """
        now = datetime.datetime.now()
        
        # Reset prompted_users if it's a new day (basic check, could be improved)
        # For now, we'll rely on the caller to handle day rollovers or restart
        
        if now.hour < 19: # Before 7 PM
            return False
            
        date_str = now.strftime("%Y-%m-%d")
        prompt_key = f"{user_id}_{date_str}"
        
        if prompt_key in self.prompted_users:
            return False
            
        log_file = self._get_log_file(user_id)
        if not os.path.exists(log_file):
            self.prompted_users.add(prompt_key)
            return True # No logs at all, definitely prompt
            
        with open(log_file, 'r') as f:
            logs = json.load(f)
            
        # Criteria for "sparse"
        if len(logs) < 5:
            self.prompted_users.add(prompt_key)
            return True
            
        # Could add more complex logic here (word count, etc.)
        return False

    async def check_end_of_day(self, user_id: str):
        """
        Checks if it's time to generate the daily journal (11:59 PM or later).
        """
        now = datetime.datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        
        # Check if it's 11:59 PM
        if now.hour == 23 and now.minute >= 59:
            # Check if already generated
            # We check if the attachment file exists as a proxy for "journal generated"
            attachment_filename = f"journal_data_{user_id}_{date_str}.txt"
            attachment_path = os.path.join(JOURNAL_ATTACHMENTS_DIR, attachment_filename)
            
            if not os.path.exists(attachment_path):
                await self.generate_journal_entry(user_id, date_str)
                return True
                
        # Also check for previous days that might have been missed (e.g. service was off)
        # This is a bit harder without tracking "last run". 
        # For now, we'll stick to the current day 11:59 PM trigger as primary.
        # If the user opens the app the next day, we could check "yesterday".
        
        yesterday = now - datetime.timedelta(days=1)
        yesterday_str = yesterday.strftime("%Y-%m-%d")
        yesterday_log = self._get_log_file(user_id, yesterday_str)
        
        if os.path.exists(yesterday_log):
             # Check if journal exists for yesterday
            attachment_filename = f"journal_data_{user_id}_{yesterday_str}.txt"
            attachment_path = os.path.join(JOURNAL_ATTACHMENTS_DIR, attachment_filename)
            
            if not os.path.exists(attachment_path):
                print(f"[JOURNAL] Found un-journaled log for yesterday ({yesterday_str}). Generating...")
                await self.generate_journal_entry(user_id, yesterday_str)
                return True
                
        return False

    def mark_prompted(self, user_id: str):
        date_str = datetime.datetime.now().strftime("%Y-%m-%d")
        self.prompted_users.add(f"{user_id}_{date_str}")

    async def generate_journal_entry(self, user_id: str, date_str: str = None):
        """
        Generates the journal entry for the day.
        """
        if not date_str:
            date_str = datetime.datetime.now().strftime("%Y-%m-%d")
            
        log_file = self._get_log_file(user_id, date_str)
        if not os.path.exists(log_file):
            print(f"[JOURNAL] No logs found for {user_id} on {date_str}")
            return

        with open(log_file, 'r') as f:
            logs = json.load(f)
            
        # --- 1. Analyze Logs & Calculate Stats ---
        stats = {
            "user_messages": 0,
            "total_tool_calls": 0,
            "tool_counts": {},
            "tool_errors": 0
        }
        
        recipe_used = None
        context_lines = []
        
        for log in logs:
            # Context for LLM
            if isinstance(log['content'], dict):
                content_str = json.dumps(log['content'])
            else:
                content_str = str(log['content'])
            context_lines.append(f"[{log['timestamp']}] {log['type']}: {content_str}")
            
            # Stats
            if log['type'] == 'chat' and str(log['content']).startswith("User:"):
                stats["user_messages"] += 1
                
            elif log['type'] == 'tool_use':
                stats["total_tool_calls"] += 1
                
                tools = log['content'].get('tools', [])
                results = log['content'].get('results', [])
                
                # Count specific tools
                for tool in tools:
                    stats["tool_counts"][tool] = stats["tool_counts"].get(tool, 0) + 1
                    
                    # Check for cooking
                    if tool == 'start_cooking':
                        # Find the result for this tool
                        for res in results:
                            # Handle nested result structure
                            if isinstance(res, dict) and 'result' in res:
                                res = res['result']
                                
                            if isinstance(res, dict) and res.get('status') == 'started' and 'recipe' in res:
                                recipe_used = res['recipe']
                
                # Count errors
                for res in results:
                    if isinstance(res, dict) and (res.get('status') == 'error' or 'error' in res):
                        stats["tool_errors"] += 1

        # --- 2. Generate Narrative Summary ---
        context = "\n".join(context_lines)
        prompt = f"""
        You are writing a personal journal entry for {user_id} based on the following activity log from today.
        Write a narrative summary of the day's events, interactions, and accomplishments. 
        The tone should be reflective and in the voice of a helpful AI assistant (MIMIR) chronicling the user's journey.
        Keep it concise but meaningful.
        
        ACTIVITY LOG:
        {context}
        """
        
        import google.generativeai as genai
        model = genai.GenerativeModel('gemini-2.5-pro')
        response = model.generate_content(prompt)
        journal_text = response.text
        
        # --- 3. Save Journal Data (JSON) for Frontend ---
        journal_data = {
            "date": date_str,
            "user_id": user_id,
            "summary": journal_text,
            "stats": stats,
            "recipe": recipe_used
        }
        
        journal_dir = os.path.join(os.getcwd(), "journal_entries")
        os.makedirs(journal_dir, exist_ok=True)
        journal_json_path = os.path.join(journal_dir, f"{user_id}_{date_str}.json")
        
        with open(journal_json_path, 'w') as f:
            json.dump(journal_data, f, indent=2)
            
        # --- 4. Create CSV Attachment ---
        safe_id = "".join([c for c in user_id if c.isalnum() or c in (' ', '_', '-')]).strip()
        # Ensure we use the same safe_id logic as _get_log_file but maybe we want to strip spaces for filenames?
        # Actually, let's just use the user_id but maybe sanitize it for URL?
        # The frontend strips non-alphanumeric. Let's match the frontend or change the frontend.
        # Frontend: currentUser.replace(/[^a-zA-Z0-9]/g, '')
        
        # Let's change backend to match frontend expectation for cleaner URLs
        safe_filename_id = "".join([c for c in user_id if c.isalnum()])
        attachment_filename = f"journal_stats_{safe_filename_id}_{date_str}.csv"
        attachment_path = os.path.abspath(os.path.join(JOURNAL_ATTACHMENTS_DIR, attachment_filename))
        
        with open(attachment_path, 'w') as f:
            f.write("Metric,Value\n")
            f.write(f"User Messages,{stats['user_messages']}\n")
            f.write(f"Total Tool Calls,{stats['total_tool_calls']}\n")
            f.write(f"Tool Errors,{stats['tool_errors']}\n")
            for tool, count in stats['tool_counts'].items():
                f.write(f"Tool: {tool},{count}\n")
            
        # --- 5. Create/Update Calendar Event ---
        calendar_manager = CalendarManager(user_id=user_id)
        existing_events = calendar_manager.get_events(start_date=date_str, end_date=date_str)
        journal_events = [e for e in existing_events if e['subject'] == "Daily Journal"]
        
        event_details = "Click to view daily summary."
        
        if journal_events:
            calendar_manager.update_event(
                journal_events[0]['id'], 
                details=event_details,
                attachment=attachment_path
            )
        else:
            calendar_manager.create_event(
                subject="Daily Journal",
                date=date_str,
                start_time="23:59",
                end_time="23:59",
                details=event_details,
                attachment=attachment_path
            )
            
        print(f"[JOURNAL] Generated entry for {user_id} on {date_str}")

daily_journal = DailyJournalManager()
