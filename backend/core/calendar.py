import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import uuid
import threading
from backend.core.google_calendar import GoogleCalendarService

def log_debug(message):
    pass

MIMIR_DATA_DIR = os.getenv("MIMIR_DATA_DIR", ".")
CALENDAR_DIR = os.path.join(MIMIR_DATA_DIR, "calendars")

# Global locks for user calendars to prevent race conditions
_user_locks: Dict[str, threading.Lock] = {}

class CalendarManager:
    def __init__(self, user_id: str = "Matt Burchett", google_token: str = None):
        self.user_id = user_id
        self.calendar_file = os.path.join(CALENDAR_DIR, f"{user_id}.json")
        os.makedirs(CALENDAR_DIR, exist_ok=True)
        self.events = self._load_events()
        
        self.google_service = None
        if google_token:
            try:
                print(f"[CALENDAR] Initializing with Google Token: {google_token[:10]}...")
                self.google_service = GoogleCalendarService(google_token)
            except Exception as e:
                print(f"[CALENDAR] Failed to initialize Google Service: {e}")
                log_debug(f"[CALENDAR] Failed to initialize Google Service: {e}")
                # We continue without google_service, effectively in "local only" mode
        else:
            print("[CALENDAR] Initialized WITHOUT Google Token (Local Only)")

    def _get_lock(self) -> threading.Lock:
        """Get the lock for the current user"""
        if self.user_id not in _user_locks:
            _user_locks[self.user_id] = threading.Lock()
        return _user_locks[self.user_id]
    
    def _load_events(self) -> List[Dict]:
        """Load events from user's JSON file with error handling"""
        if os.path.exists(self.calendar_file):
            try:
                with open(self.calendar_file, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError as e:
                print(f"[ERROR] Corrupted calendar file for {self.user_id}: {e}")
                try:
                    backup_path = self.calendar_file + ".bak"
                    import shutil
                    shutil.copy2(self.calendar_file, backup_path)
                    print(f"[INFO] Backed up corrupted file to {backup_path}")
                    return []
                except Exception as e2:
                    print(f"[ERROR] Failed to recover/backup: {e2}")
                    return []
        return []
    
    def _save_events(self):
        """Save events to user's JSON file atomically"""
        temp_file = self.calendar_file + ".tmp"
        try:
            with open(temp_file, 'w') as f:
                json.dump(self.events, f, indent=2)
            
            if os.path.exists(self.calendar_file):
                os.replace(temp_file, self.calendar_file)
            else:
                os.rename(temp_file, self.calendar_file)
                
        except Exception as e:
            print(f"[ERROR] Failed to save calendar: {e}")
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except:
                    pass

    def sync_down(self):
        """Pull events from Google Calendar and merge with local"""
        if not self.google_service:
            return

        print(f"[CALENDAR] Starting Down-Sync for {self.user_id}")
        log_debug(f"[CALENDAR] Starting Down-Sync for {self.user_id}")
        try:
            google_events = self.google_service.list_events(max_results=50)
            log_debug(f"[CALENDAR] Fetched {len(google_events)} events from Google")
        except Exception as e:
            log_debug(f"[CALENDAR] Failed to list events: {e}")
            return
        
        with self._get_lock():
            self.events = self._load_events()
            changes_made = False
            
            for g_event in google_events:
                # Check if event exists by google_id or fuzzy match
                existing = None
                for l_event in self.events:
                    if l_event.get('google_id') == g_event['id']:
                        existing = l_event
                        break
                
                if existing:
                    # Update existing if changed
                    # For simplicity, we assume Google is source of truth during sync_down
                    if (existing['subject'] != g_event['subject'] or 
                        existing['date'] != g_event['date'] or 
                        existing.get('start_time') != g_event['start_time']):
                        
                        existing.update(g_event)
                        existing['google_id'] = g_event['id'] # Ensure ID is set
                        changes_made = True
                else:
                    # Create new local event
                    g_event['google_id'] = g_event['id']
                    self.events.append(g_event)
                    changes_made = True
            
            if changes_made:
                self._save_events()
                print(f"[CALENDAR] Down-Sync complete. Updated local calendar.")

    def get_events(self, start_date: str = None, end_date: str = None) -> List[Dict]:
        """Get all events or filter by date range"""
        self.events = self._load_events()
        
        if not start_date and not end_date:
            return self.events
        
        filtered = []
        for event in self.events:
            event_date = event['date']
            if start_date and event_date < start_date:
                continue
            if end_date and event_date > end_date:
                continue
            filtered.append(event)
        
        return sorted(filtered, key=lambda x: (x['date'], x.get('start_time') or ''))
    
    def create_event(self, subject: str, date: str, start_time: str = None, 
                    end_time: str = None, details: str = None, attachment: str = None) -> Dict:
        """Create a new calendar event (Thread-Safe, Local First)"""
        with self._get_lock():
            self.events = self._load_events()
            
            if details and len(details) > 75:
                details = details[:75]
            
            event = {
                "id": str(uuid.uuid4()),
                "subject": subject,
                "date": date,
                "start_time": start_time,
                "end_time": end_time,
                "details": details,
                "attachment": attachment
            }
            
            # 1. Save Locally FIRST
            self.events.append(event)
            self._save_events()
            print(f"[CALENDAR] Created local event: {subject} on {date}")
            
            # 2. Attempt Up-Sync
            if self.google_service:
                try:
                    print(f"[CALENDAR] Up-Sync: Creating event in Google Calendar")
                    g_event = self.google_service.create_event(event)
                    if g_event:
                        # Update local event with Google ID
                        for e in self.events:
                            if e['id'] == event['id']:
                                e['google_id'] = g_event['id']
                                break
                        self._save_events()
                        print(f"[CALENDAR] Up-Sync successful. Linked Google ID.")
                except Exception as e:
                    print(f"[CALENDAR] Up-Sync Failed: {e}")
                    log_debug(f"[CALENDAR] Up-Sync Failed: {e}")
            
            # 3. Trigger Down-Sync (Background)
            if self.google_service:
                threading.Thread(target=self.sync_down).start()
                
            return event
    
    def update_event(self, event_id: str, **kwargs) -> Dict:
        """Update an existing event (Thread-Safe, Local First)"""
        with self._get_lock():
            self.events = self._load_events()
            
            for event in self.events:
                if event['id'] == event_id:
                    # 1. Apply updates locally
                    for k, v in kwargs.items():
                        if k in ['subject', 'date', 'start_time', 'end_time', 'attachment', 'details']:
                            event[k] = v
                    
                    if 'details' in event and len(event['details']) > 75:
                        event['details'] = event['details'][:75]
                    
                    self._save_events()
                    print(f"[CALENDAR] Updated local event: {event_id}")
                    
                    # 2. Attempt Up-Sync
                    if self.google_service and event.get('google_id'):
                        try:
                            print(f"[CALENDAR] Up-Sync: Updating event in Google Calendar")
                            self.google_service.update_event(event['google_id'], event)
                        except Exception as e:
                            print(f"[CALENDAR] Up-Sync Failed: {e}")
                            log_debug(f"[CALENDAR] Up-Sync Failed: {e}")
                    
                    # 3. Trigger Down-Sync
                    if self.google_service:
                        threading.Thread(target=self.sync_down).start()
                        
                    return event
            
            return {"error": f"Event {event_id} not found"}
    
    def delete_event(self, event_id: str) -> bool:
        """Delete an event (Thread-Safe, Local First)"""
        with self._get_lock():
            self.events = self._load_events()
            
            event_to_delete = next((e for e in self.events if e['id'] == event_id), None)
            
            if event_to_delete:
                # 1. Delete Locally
                self.events = [e for e in self.events if e['id'] != event_id]
                self._save_events()
                print(f"[CALENDAR] Deleted local event: {event_id}")

                # 2. Attempt Up-Sync
                if self.google_service and event_to_delete.get('google_id'):
                    try:
                        print(f"[CALENDAR] Up-Sync: Deleting event from Google Calendar")
                        self.google_service.delete_event(event_to_delete['google_id'])
                    except Exception as e:
                        print(f"[CALENDAR] Up-Sync Failed: {e}")
                        log_debug(f"[CALENDAR] Up-Sync Failed: {e}")
                
                # 3. Trigger Down-Sync
                if self.google_service:
                    threading.Thread(target=self.sync_down).start()
                    
                return True
            return False

# Tool functions for MIMIR
def calendar_search(start_date: str = None, end_date: str = None, query: str = None, user_id: str = "Matt Burchett") -> Dict:
    print(f"[TOOL] Searching calendar for {user_id}: start={start_date}, end={end_date}, query={query}")
    # Initialize WITHOUT token to ensure local-only search
    calendar_manager = CalendarManager(user_id=user_id)
    
    events = calendar_manager.get_events(start_date, end_date)
    
    if query:
        query_lower = query.lower()
        events = [
            e for e in events 
            if query_lower in e['subject'].lower() or 
               (e.get('details') and query_lower in e['details'].lower())
        ]
    
    return {
        "events": events,
        "count": len(events)
    }


def calendar_create(subject: str, date: str, start_time: str = None, 
                    end_time: str = None, details: str = None, user_id: str = "Matt Burchett", google_token: str = None) -> Dict:
    print(f"[TOOL] Creating calendar event for {user_id}: {subject} on {date}")
    calendar_manager = CalendarManager(user_id=user_id, google_token=google_token)
    return calendar_manager.create_event(subject, date, start_time, end_time, details)


def calendar_update(event_id: str, subject: str = None, date: str = None, 
                   start_time: str = None, end_time: str = None, details: str = None, user_id: str = "Matt Burchett", google_token: str = None) -> Dict:
    print(f"[TOOL] Updating calendar event for {user_id}: {event_id}")
    calendar_manager = CalendarManager(user_id=user_id, google_token=google_token)
    kwargs = {}
    if subject: kwargs['subject'] = subject
    if date: kwargs['date'] = date
    if start_time: kwargs['start_time'] = start_time
    if end_time: kwargs['end_time'] = end_time
    if details: kwargs['details'] = details
    
    return calendar_manager.update_event(event_id, **kwargs)


def calendar_delete(event_id: str, user_id: str = "Matt Burchett", google_token: str = None) -> Dict:
    print(f"[TOOL] Deleting calendar event for {user_id}: {event_id}")
    calendar_manager = CalendarManager(user_id=user_id, google_token=google_token)
    success = calendar_manager.delete_event(event_id)
    
    if success:
        return {"success": True, "message": f"Event {event_id} deleted successfully"}
    else:
        return {"success": False, "message": f"Event {event_id} not found"}
