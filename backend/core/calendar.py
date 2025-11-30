import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import uuid

MIMIR_DATA_DIR = os.getenv("MIMIR_DATA_DIR", ".")
CALENDAR_DIR = os.path.join(MIMIR_DATA_DIR, "calendars")

import threading

# Global locks for user calendars to prevent race conditions
_user_locks: Dict[str, threading.Lock] = {}

class CalendarManager:
    def __init__(self, user_id: str = "Matt Burchett"):
        self.user_id = user_id
        self.calendar_file = os.path.join(CALENDAR_DIR, f"{user_id}.json")
        os.makedirs(CALENDAR_DIR, exist_ok=True)
        # Initial load, but we'll reload in write methods to be safe
        self.events = self._load_events()

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
                # Attempt to recover or backup
                try:
                    # Backup corrupted file
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
        # Write to a temp file first
        temp_file = self.calendar_file + ".tmp"
        try:
            with open(temp_file, 'w') as f:
                json.dump(self.events, f, indent=2)
            
            # Rename temp file to actual file (atomic replace)
            # Windows requires the destination to not exist for rename, but replace handles it?
            # os.replace is atomic on POSIX, and usually atomic on Windows (Python 3.3+)
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
    
    def get_events(self, start_date: str = None, end_date: str = None) -> List[Dict]:
        """Get all events or filter by date range"""
        # Read-only access doesn't strictly need lock if we accept slightly stale data,
        # but for consistency we could lock. For now, let's just reload to be fresh.
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
        
        return sorted(filtered, key=lambda x: (x['date'], x.get('start_time', '')))
    
    def create_event(self, subject: str, date: str, start_time: str = None, 
                    end_time: str = None, details: str = None, attachment: str = None) -> Dict:
        """Create a new calendar event (Thread-Safe)"""
        with self._get_lock():
            # Reload events to ensure we have the latest version from disk
            self.events = self._load_events()
            
            # Validate details length
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
            
            self.events.append(event)
            self._save_events()
            print(f"[CALENDAR] Created event: {subject} on {date}")
            return event
    
    def update_event(self, event_id: str, **kwargs) -> Dict:
        """Update an existing event (Thread-Safe)"""
        with self._get_lock():
            self.events = self._load_events()
            
            for event in self.events:
                if event['id'] == event_id:
                    if 'subject' in kwargs:
                        event['subject'] = kwargs['subject']
                    if 'date' in kwargs:
                        event['date'] = kwargs['date']
                    if 'start_time' in kwargs:
                        event['start_time'] = kwargs['start_time']
                    if 'end_time' in kwargs:
                        event['end_time'] = kwargs['end_time']
                    if 'attachment' in kwargs:
                        event['attachment'] = kwargs['attachment']
                    if 'details' in kwargs:
                        details = kwargs['details']
                        if details and len(details) > 75:
                            details = details[:75]
                        event['details'] = details
                    
                    self._save_events()
                    print(f"[CALENDAR] Updated event: {event_id}")
                    return event
            
            return {"error": f"Event {event_id} not found"}
    
    def delete_event(self, event_id: str) -> bool:
        """Delete an event (Thread-Safe)"""
        with self._get_lock():
            self.events = self._load_events()
            
            initial_len = len(self.events)
            self.events = [e for e in self.events if e['id'] != event_id]
            
            if len(self.events) < initial_len:
                self._save_events()
                print(f"[CALENDAR] Deleted event: {event_id}")
                return True
            return False

# Note: No global instance - create per-user instances as needed


# Tool functions for MIMIR
def calendar_search(start_date: str = None, end_date: str = None, query: str = None, user_id: str = "Matt Burchett") -> Dict:
    """
    Search calendar events by date range or text query.
    
    Args:
        start_date: YYYY-MM-DD format (optional)
        end_date: YYYY-MM-DD format (optional)
        query: Text to search in subject/details (optional)
        user_id: User ID to search calendar for
    
    Returns:
        {"events": [...], "count": N}
    """
    print(f"[TOOL] Searching calendar for {user_id}: start={start_date}, end={end_date}, query={query}")
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
                    end_time: str = None, details: str = None, user_id: str = "Matt Burchett") -> Dict:
    """
    Create a new calendar event.
    
    Args:
        subject: Event subject/title
        date: YYYY-MM-DD format
        start_time: HH:MM format (optional)
        end_time: HH:MM format (optional)
        details: Event details (max 75 chars)
        user_id: User ID to create event for
    
    Returns:
        Created event object
    """
    print(f"[TOOL] Creating calendar event for {user_id}: {subject} on {date}")
    calendar_manager = CalendarManager(user_id=user_id)
    return calendar_manager.create_event(subject, date, start_time, end_time, details)


def calendar_update(event_id: str, subject: str = None, date: str = None, 
                   start_time: str = None, end_time: str = None, details: str = None, user_id: str = "Matt Burchett") -> Dict:
    """
    Update an existing calendar event.
    
    Args:
        event_id: Event ID to update
        subject: New subject (optional)
        date: New date YYYY-MM-DD (optional)
        start_time: New start time HH:MM (optional)
        end_time: New end time HH:MM (optional)
        details: New details (optional)
        user_id: User ID whose calendar to update
    
    Returns:
        Updated event object
    """
    print(f"[TOOL] Updating calendar event for {user_id}: {event_id}")
    calendar_manager = CalendarManager(user_id=user_id)
    kwargs = {}
    if subject:
        kwargs['subject'] = subject
    if date:
        kwargs['date'] = date
    if start_time:
        kwargs['start_time'] = start_time
    if end_time:
        kwargs['end_time'] = end_time
    if details:
        kwargs['details'] = details
    
    return calendar_manager.update_event(event_id, **kwargs)


def calendar_delete(event_id: str, user_id: str = "Matt Burchett") -> Dict:
    """
    Delete a calendar event.
    
    Args:
        event_id: Event ID to delete
        user_id: User ID whose calendar to modify
    
    Returns:
        {"success": bool, "message": str}
    """
    print(f"[TOOL] Deleting calendar event for {user_id}: {event_id}")
    calendar_manager = CalendarManager(user_id=user_id)
    success = calendar_manager.delete_event(event_id)
    
    if success:
        return {"success": True, "message": f"Event {event_id} deleted successfully"}
    else:
        return {"success": False, "message": f"Event {event_id} not found"}
