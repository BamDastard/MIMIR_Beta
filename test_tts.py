from backend.core.voice import mimir_voice
import os

if __name__ == "__main__":
    print("Testing Gemini TTS...")
    text = "I am Mimir. The well of wisdom is open."
    audio_bytes = mimir_voice.speak(text)
    
    if audio_bytes:
        with open("test_output.mp3", "wb") as f:
            f.write(audio_bytes)
        print(f"Success! Audio saved to test_output.mp3 ({len(audio_bytes)} bytes)")
    else:
        print("Failed to generate audio.")
