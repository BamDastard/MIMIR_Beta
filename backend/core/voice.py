import os
from google.cloud import texttospeech
from dotenv import load_dotenv

load_dotenv()

# Ensure GOOGLE_APPLICATION_CREDENTIALS is set in the environment for this to work
# or explicitly pass credentials if available as a file path.

class MimirVoice:
    def __init__(self):
        try:
            self.client = texttospeech.TextToSpeechClient()
            self.voice_params = texttospeech.VoiceSelectionParams(
                language_code="en-GB",
                name="en-GB-Wavenet-D" # High-quality WaveNet with pitch support
            )
            self.audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                pitch=-10.0, # Deep voice: -10 semitones
                speaking_rate=1.0 # Normal speed for clarity
            )
            print(f"[MIMIR VOICE] Initialized: {self.voice_params.name}, Pitch: {self.audio_config.pitch}")
        except Exception as e:
            print(f"Failed to initialize Google Cloud TTS: {e}")
            self.client = None

    def speak(self, text: str) -> bytes:
        """
        Converts text to speech and returns the audio bytes (MP3).
        """
        if not self.client:
            return b""

        # Strip markdown characters for cleaner speech
        import re
        # Remove bold/italic markers (* or _)
        clean_text = re.sub(r'[\*_]{1,2}(.*?)[\*_]{1,2}', r'\1', text)
        # Remove code blocks/inline code (backticks)
        clean_text = re.sub(r'`(.*?)`', r'\1', clean_text)
        # Remove headers (#)
        clean_text = re.sub(r'#+\s', '', clean_text)
        # Remove links [text](url) -> text
        clean_text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', clean_text)

        # Use plain text input (Studio voices don't support SSML pitch, but DO support AudioConfig pitch)
        synthesis_input = texttospeech.SynthesisInput(text=clean_text)

        try:
            response = self.client.synthesize_speech(
                input=synthesis_input,
                voice=self.voice_params,
                audio_config=self.audio_config
            )
            return response.audio_content
        except Exception as e:
            print(f"Error synthesizing speech: {e}")
            return b""

mimir_voice = MimirVoice()
