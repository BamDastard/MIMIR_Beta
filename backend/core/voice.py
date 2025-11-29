import os
import google.generativeai as genai
from dotenv import load_dotenv
import re

load_dotenv()

import io
import wave

class MimirVoice:
    def __init__(self):
        try:
            api_key = os.environ.get("GOOGLE_API_KEY")
            if not api_key:
                print("[MIMIR VOICE] Error: GOOGLE_API_KEY not found.")
                self.client = None
                return

            genai.configure(api_key=api_key)
            self.client = genai.GenerativeModel("gemini-2.5-flash-preview-tts")
            print("[MIMIR VOICE] Initialized Gemini 2.5 Flash Preview TTS")
        except Exception as e:
            print(f"Failed to initialize Gemini TTS: {e}")
            self.client = None

    def _pcm_to_wav(self, pcm_data: bytes, sample_rate: int = 24000) -> bytes:
        """Wraps raw PCM data in a WAV container."""
        with io.BytesIO() as wav_buffer:
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(pcm_data)
            return wav_buffer.getvalue()

    def speak(self, text: str) -> bytes:
        """
        Converts text to speech using Gemini 2.5 TTS and returns the audio bytes (WAV).
        """
        if not self.client:
            return b""

        # Strip markdown characters for cleaner speech
        # Remove bold/italic markers (* or _)
        clean_text = re.sub(r'[\*_]{1,2}(.*?)[\*_]{1,2}', r'\1', text)
        # Remove code blocks/inline code (backticks)
        clean_text = re.sub(r'`(.*?)`', r'\1', clean_text)
        # Remove headers (#)
        clean_text = re.sub(r'#+\s', '', clean_text)
        # Remove links [text](url) -> text
        clean_text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', clean_text)

        try:
            # Construct the prompt for style control
            # "Puck" is one of the voices, but we can control style with the prompt.
            # We want a "deep, booming, god-like voice".
            
            # Note: The API might expect a specific structure. 
            # Based on docs: "Say in an spooky whisper: '...'"
            
            prompt = f'Say in a powerful, resonant, booming voice with a commanding presence and a Norse accent. Speak at a normal, authoritative pace: "{clean_text}"'

            response = self.client.generate_content(
                prompt,
                generation_config={
                    "response_modalities": ["AUDIO"],
                    "speech_config": {
                        "voice_config": {
                            "prebuilt_voice_config": {
                                "voice_name": "Algieba"
                            }
                        }
                    }
                }
            )
            
            # The response.parts[0].inline_data.data contains the audio bytes
            if response.parts:
                part = response.parts[0]
                audio_data = part.inline_data.data
                mime_type = part.inline_data.mime_type if hasattr(part.inline_data, 'mime_type') else "unknown"
                
                # Check if it's PCM and convert to WAV
                if "pcm" in mime_type.lower() or "l16" in mime_type.lower():
                    # Parse sample rate from mime type if possible, else default to 24000
                    sample_rate = 24000
                    if "rate=" in mime_type:
                        try:
                            sample_rate = int(mime_type.split("rate=")[1].split(";")[0])
                        except:
                            pass
                    
                    wav_data = self._pcm_to_wav(audio_data, sample_rate)
                    print(f"[MIMIR VOICE] Converted PCM to WAV. Size: {len(wav_data)} | Rate: {sample_rate}")
                    return wav_data
                
                print(f"[MIMIR VOICE] Generated audio bytes: {len(audio_data)} | Mime: {mime_type}")
                return audio_data
            else:
                print("No audio content in response")
                return b""

        except Exception as e:
            print(f"Error synthesizing speech with Gemini: {e}")
            return b""

mimir_voice = MimirVoice()
