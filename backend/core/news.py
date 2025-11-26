import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import time

class NewsManager:
    def __init__(self):
        self.rss_url = "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"
        self.cache = []
        self.last_fetch = None
        self.cache_duration = timedelta(minutes=10)

    def get_top_news(self, force_refresh=False):
        now = datetime.now()
        
        if not force_refresh and self.last_fetch and (now - self.last_fetch) < self.cache_duration:
            return self.cache

        try:
            response = requests.get(self.rss_url, timeout=10)
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
            
            self.cache = items
            self.last_fetch = now
            return items
            
        except Exception as e:
            print(f"[NEWS] Error fetching news: {e}")
            # Return cache if available, even if expired
            return self.cache

news_manager = NewsManager()
