import json
import os
import datetime
from typing import Dict, Optional, List
from pydantic import BaseModel

class UserProfile(BaseModel):
    auth_id: str
    email: str
    display_name: str
    timezone: Optional[str] = None
    preferences: List[str] = []
    home_city: Optional[str] = None
    created_at: str

class UserManager:
    def __init__(self, storage_file: str = "user_profiles.json"):
        self.storage_file = storage_file
        self.profiles: Dict[str, UserProfile] = {}
        self._load_profiles()

    def _load_profiles(self):
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r') as f:
                    data = json.load(f)
                    for auth_id, profile_data in data.items():
                        # Ensure preferences field exists for old profiles
                        if "preferences" not in profile_data:
                            profile_data["preferences"] = []
                        if "home_city" not in profile_data:
                            profile_data["home_city"] = None
                        self.profiles[auth_id] = UserProfile(**profile_data)
                print(f"[USER_MANAGER] Loaded {len(self.profiles)} profiles.")
            except Exception as e:
                print(f"[USER_MANAGER] Error loading profiles: {e}")
                self.profiles = {}

    def _save_profiles(self):
        data = {auth_id: profile.dict() for auth_id, profile in self.profiles.items()}
        with open(self.storage_file, 'w') as f:
            json.dump(data, f, indent=2)

    def get_profile(self, auth_id: str) -> Optional[UserProfile]:
        return self.profiles.get(auth_id)

    def create_profile(self, auth_id: str, email: str, display_name: str) -> UserProfile:
        now = datetime.datetime.now().isoformat()
        profile = UserProfile(
            auth_id=auth_id,
            email=email,
            display_name=display_name,
            created_at=now,
            preferences=[],
            home_city=None
        )
        self.profiles[auth_id] = profile
        self._save_profiles()
        print(f"[USER_MANAGER] Created profile for {display_name} ({email})")
        return profile

    def update_profile(self, auth_id: str, display_name: str) -> Optional[UserProfile]:
        if auth_id in self.profiles:
            self.profiles[auth_id].display_name = display_name
            self._save_profiles()
            return self.profiles[auth_id]
        return None

    def add_preference(self, auth_id: str, preference: str) -> bool:
        if auth_id in self.profiles:
            # Case-insensitive check
            existing_prefs = [p.lower() for p in self.profiles[auth_id].preferences]
            if preference.lower() not in existing_prefs:
                self.profiles[auth_id].preferences.append(preference)
                self._save_profiles()
                return True
            else:
                print(f"[USER_MANAGER] Preference '{preference}' already exists for {auth_id}")
                return True # Return True to indicate "success" (it's there)
        return False
        
    def get_preferences(self, auth_id: str) -> List[str]:
        if auth_id in self.profiles:
            return self.profiles[auth_id].preferences
        return []

    def set_home_city(self, auth_id: str, city: str) -> bool:
        if auth_id in self.profiles:
            self.profiles[auth_id].home_city = city
            self._save_profiles()
            return True
        return False

    def get_home_city(self, auth_id: str) -> Optional[str]:
        if auth_id in self.profiles:
            return self.profiles[auth_id].home_city
        return None

# Global instance
MIMIR_DATA_DIR = os.getenv("MIMIR_DATA_DIR", ".")
user_manager = UserManager(storage_file=os.path.join(MIMIR_DATA_DIR, "user_profiles.json"))
