import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

class MimirMemory:
    def __init__(self):
        # Resolve absolute path to project root/mimir_memory_db
        # backend/core/memory.py -> backend/core -> backend -> root
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(current_dir))
        self.base_directory = os.path.join(project_root, "mimir_memory_db")
        
        # Ensure directory exists for Cloud Run (ephemeral)
        if not os.path.exists(self.base_directory):
            os.makedirs(self.base_directory, exist_ok=True)
            print(f"[MIMIR] Created new memory directory at {self.base_directory}")
        
        print(f"[MIMIR] Memory Base Directory: {self.base_directory}")
        
        self.embedding_function = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=GOOGLE_API_KEY
        )
        self.vector_stores = {}

    def get_vector_store(self, user_id: str):
        """
        Returns the vector store for a specific user.
        All users now use subdirectories.
        """
        # Sanitize user_id for directory name
        safe_id = "".join([c for c in user_id if c.isalnum() or c in (' ', '_', '-')]).strip()
        
        # All users use subdirectories now
        persist_dir = os.path.join(self.base_directory, safe_id)
        print(f"[MIMIR] Accessing Memory for {user_id} at {persist_dir}")

        if user_id not in self.vector_stores:
            self.vector_stores[user_id] = Chroma(
                persist_directory=persist_dir,
                embedding_function=self.embedding_function,
                collection_name="mimir_knowledge"
            )
        
        return self.vector_stores[user_id]

    def remember(self, text: str, user_id: str = "Matt Burchett", metadata: dict = None):
        """
        Stores a piece of information in the user's vector database.
        """
        if metadata is None:
            metadata = {}
        
        # Ensure user_id is in metadata
        metadata["user_id"] = user_id
        
        doc = Document(page_content=text, metadata=metadata)
        store = self.get_vector_store(user_id)
        store.add_documents([doc])
        print(f"MIMIR remembered for {user_id}: {text[:50]}...")

    def recall(self, query: str, user_id: str = "Matt Burchett", k: int = 3, max_chars: int = 1500000) -> str:
        """
        Retrieves relevant information for the user.
        """
        store = self.get_vector_store(user_id)
        results = store.similarity_search(query, k=k)
        if not results:
            return ""
        
        context_parts = []
        total_chars = 0
        
        for doc in results:
            content = doc.page_content
            if total_chars + len(content) > max_chars:
                remaining = max_chars - total_chars
                if remaining > 100:
                    context_parts.append(content[:remaining] + "...")
                break
            context_parts.append(content)
            total_chars += len(content)
        
        return "\n".join(context_parts)

    def delete_memory(self, user_id: str):
        """
        Deletes the memory for a specific user.
        """
        if user_id == "Matt Burchett":
            print("[WARN] Cannot delete legacy user memory (Matt Burchett)")
            return False

        safe_id = "".join([c for c in user_id if c.isalnum() or c in (' ', '_', '-')]).strip()
        persist_dir = os.path.join(self.base_directory, safe_id)
        
        # Remove from cache
        if user_id in self.vector_stores:
            del self.vector_stores[user_id]
            
        # Delete directory
        import shutil
        if os.path.exists(persist_dir):
            try:
                shutil.rmtree(persist_dir)
                print(f"[MIMIR] Deleted memory for {user_id}")
                return True
            except Exception as e:
                print(f"[ERROR] Failed to delete memory for {user_id}: {e}")
                return False
        return True

mimir_memory = MimirMemory()
