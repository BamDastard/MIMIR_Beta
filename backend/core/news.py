import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import time

class NewsManager:
    def __init__(self):
        self.base_url = "https://news.google.com/rss"
        self.cache = {} # Dict[str, Dict] -> {query: {'items': [], 'timestamp': datetime}}
        self.cache_duration = timedelta(minutes=15)

    def get_news(self, query=None, force_refresh=False):
        now = datetime.now()
        cache_key = query if query else "TOP_NEWS"
        
        # Check cache
        if not force_refresh and cache_key in self.cache:
            cached_data = self.cache[cache_key]
            if (now - cached_data['timestamp']) < self.cache_duration:
                return cached_data['items']

        try:
            if query:
                url = f"{self.base_url}/search?q={requests.utils.quote(query)}&hl=en-US&gl=US&ceid=US:en"
            else:
                url = f"{self.base_url}?hl=en-US&gl=US&ceid=US:en"

            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            items = []
            
            # Parse RSS items
            for item in root.findall(".//item")[:10]:
                title = item.find("title").text if item.find("title") is not None else "No Title"
                link = item.find("link").text if item.find("link") is not None else "#"
                pub_date = item.find("pubDate").text if item.find("pubDate") is not None else ""
                source = item.find("source").text if item.find("source") is not None else "Unknown"
                
                # Clean up title (Google News often has "Title - Source")
                if " - " in title:
                    title = title.rsplit(" - ", 1)[0]

                items.append({
                    "title": title,
                    "link": link,
                    "pubDate": pub_date,
                    "source": source
                })
            
            # Update cache
            self.cache[cache_key] = {
                'items': items,
                'timestamp': now
            }
            return items
            
        except Exception as e:
            print(f"[NEWS] Error fetching news for '{cache_key}': {e}")
            # Return cache if available, even if expired
            if cache_key in self.cache:
                return self.cache[cache_key]['items']
            return []

    def get_top_news(self, force_refresh=False):
        return self.get_news(query=None, force_refresh=force_refresh)

news_manager = NewsManager()
