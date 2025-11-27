import json
import os
import datetime
from typing import Dict, Optional
from pydantic import BaseModel

class UserProfile(BaseModel):
    auth_id: str
    email: str
    display_name: str
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
            created_at=now
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

# Global instance
user_manager = UserManager()
