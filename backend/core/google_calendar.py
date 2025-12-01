import os
import datetime
from typing import List, Dict, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

class GoogleCalendarService:
    def __init__(self, token: str):
        """
        Initialize the Google Calendar Service with an access token.
        
        Args:
            token: The OAuth2 access token for the user.
        """
        self.log_debug(f"Initializing GoogleCalendarService with token: {token[:10]}...")
        self.creds = Credentials(token=token)
        self.service = build('calendar', 'v3', credentials=self.creds)
        
        # Log Token Info to verify identity
        try:
            import requests
            token_info = requests.get(f"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token={token}").json()
            self.log_debug(f"Token Info: {token_info}")
        except Exception as e:
            self.log_debug(f"Failed to get token info: {e}")

    def log_debug(self, message):
        pass

    def list_events(self, max_results: int = 10, time_min: str = None) -> List[Dict]:
        """
        List upcoming events from the user's primary calendar.
        """
        try:
            if not time_min:
                time_min = datetime.datetime.utcnow().isoformat() + 'Z'  # 'Z' indicates UTC time
            
            events_result = self.service.events().list(
                calendarId='primary', 
                timeMin=time_min,
                maxResults=max_results, 
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            return [self._convert_to_mimir_format(event) for event in events]
            
        except HttpError as error:
            print(f'[GoogleCalendar] An error occurred: {error}')
            # try:
            #     with open("debug_log.txt", "a") as f:
            #         f.write(f"{datetime.datetime.now()} - [GoogleCalendar] ERROR: {error}\n")
            # except: pass
            return []

    def create_event(self, event_data: Dict) -> Optional[Dict]:
        """
        Create a new event in the user's primary calendar.
        """
        try:
            google_event = self._convert_to_google_format(event_data)
            print(f"[GoogleCalendar] Creating event: {google_event}")
            # try:
            #     with open("debug_log.txt", "a") as f:
            #         f.write(f"{datetime.datetime.now()} - [GoogleCalendar] Creating event payload: {google_event}\n")
            # except: pass

            event = self.service.events().insert(calendarId='primary', body=google_event).execute()
            print(f'[GoogleCalendar] Event created: {event.get("htmlLink")}')
            return self._convert_to_mimir_format(event)
        except HttpError as error:
            print(f'[GoogleCalendar] An error occurred: {error}')
            # try:
            #     with open("debug_log.txt", "a") as f:
            #         f.write(f"{datetime.datetime.now()} - [GoogleCalendar] CREATE ERROR: {error}\n")
            # except: pass
            return None

    def update_event(self, event_id: str, event_data: Dict) -> Optional[Dict]:
        """
        Update an existing event.
        """
        try:
            # First retrieve the event to get its sequence number and other fields
            event = self.service.events().get(calendarId='primary', eventId=event_id).execute()
            
            # Update fields
            updates = self._convert_to_google_format(event_data)
            for key, value in updates.items():
                event[key] = value
                
            updated_event = self.service.events().update(
                calendarId='primary', 
                eventId=event_id, 
                body=event
            ).execute()
            
            return self._convert_to_mimir_format(updated_event)
        except HttpError as error:
            print(f'[GoogleCalendar] An error occurred: {error}')
            return None

    def delete_event(self, event_id: str) -> bool:
        """
        Delete an event.
        """
        try:
            self.service.events().delete(calendarId='primary', eventId=event_id).execute()
            return True
        except HttpError as error:
            print(f'[GoogleCalendar] An error occurred: {error}')
            return False

    def _convert_to_mimir_format(self, google_event: Dict) -> Dict:
        """
        Convert Google Calendar event format to MIMIR format.
        """
        start = google_event.get('start', {})
        end = google_event.get('end', {})
        
        # Handle all-day events vs timed events
        date = start.get('date') or start.get('dateTime', '').split('T')[0]
        start_time = None
        end_time = None
        
        if start.get('dateTime'):
            start_dt = datetime.datetime.fromisoformat(start['dateTime'].replace('Z', '+00:00'))
            start_time = start_dt.strftime('%H:%M')
            
        if end.get('dateTime'):
            end_dt = datetime.datetime.fromisoformat(end['dateTime'].replace('Z', '+00:00'))
            end_time = end_dt.strftime('%H:%M')

        return {
            "id": google_event.get('id'),
            "subject": google_event.get('summary', 'No Title'),
            "date": date,
            "start_time": start_time,
            "end_time": end_time,
            "details": google_event.get('description', ''),
            "source": "google"
        }

    def _convert_to_google_format(self, mimir_event: Dict) -> Dict:
        """
        Convert MIMIR event format to Google Calendar format.
        """
        summary = mimir_event.get('subject', 'No Title')
        description = mimir_event.get('details', '')
        date = mimir_event.get('date')
        start_time = mimir_event.get('start_time')
        end_time = mimir_event.get('end_time')
        
        event = {
            'summary': summary,
            'description': description,
        }
        
        if start_time and end_time:
            # Timed event
            start_dt = f"{date}T{start_time}:00"
            end_dt = f"{date}T{end_time}:00"
            
            event['start'] = {
                'dateTime': start_dt,
                'timeZone': 'America/New_York', 
            }
            event['end'] = {
                'dateTime': end_dt,
                'timeZone': 'America/New_York',
            }
        else:
            # All-day event
            event['start'] = {'date': date}
            
            # Google requires end date to be exclusive (next day) for all-day events
            start_date_obj = datetime.datetime.strptime(date, '%Y-%m-%d')
            end_date_obj = start_date_obj + datetime.timedelta(days=1)
            event['end'] = {'date': end_date_obj.strftime('%Y-%m-%d')}

        return event
