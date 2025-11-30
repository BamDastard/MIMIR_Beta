import os
import google.generativeai as genai
from dotenv import load_dotenv
import re
import os
import io
import wave
from google.cloud import texttospeech
from google.api_core.client_options import ClientOptions

load_dotenv()

class MimirVoice:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            print("WARNING: GOOGLE_API_KEY not found. Voice generation will fail.")
            self.client = None
        else:
            try:
                # Initialize Google Cloud TTS Client with API Key
                options = ClientOptions(api_key=self.api_key)
                self.client = texttospeech.TextToSpeechClient(client_options=options)
                print("Google Cloud TTS Client Initialized")
            except Exception as e:
                print(f"Failed to initialize Google Cloud TTS: {e}")
                self.client = None

    def _pcm_to_wav(self, pcm_data, sample_rate=24000):
        """Converts raw PCM data to WAV format."""
        with io.BytesIO() as wav_buffer:
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(pcm_data)
            return wav_buffer.getvalue()

    def combine_wavs(self, wav_bytes_list: list[bytes]) -> bytes:
        """Combines multiple WAV byte objects into a single WAV."""
        if not wav_bytes_list:
            return b""
            
        try:
            output_buffer = io.BytesIO()
            # Read the first wav to get parameters
            with wave.open(io.BytesIO(wav_bytes_list[0]), 'rb') as first_wav:
                params = first_wav.getparams()
                
            with wave.open(output_buffer, 'wb') as output_wav:
                output_wav.setparams(params)
                
                for i, wav_bytes in enumerate(wav_bytes_list):
                    try:
                        with wave.open(io.BytesIO(wav_bytes), 'rb') as w:
                            # Verify parameters match
                            if w.getparams()[:3] != params[:3]: # Check channels, width, rate
                                print(f"[WARN] WAV parameter mismatch in segment {i}")
                                continue
                            output_wav.writeframes(w.readframes(w.getnframes()))
                    except Exception as e:
                        print(f"[WARN] Failed to process WAV segment {i}: {e}")
                        
            return output_buffer.getvalue()
        except Exception as e:
            print(f"[MIMIR VOICE] Error combining WAVs: {e}")
            return b""

    def speak(self, text: str) -> bytes:
        """
        Converts text to speech using Google Cloud TTS (WaveNet/Studio) and returns the audio bytes (WAV).
        """
        if not self.client:
            print("Voice client not initialized.")
            return b""
            
        try:
            # Clean text
            clean_text = text.replace("*", "").replace("#", "").strip()
            if not clean_text:
                return b""

            # Construct SSML for deep, booming voice
            # en-US-Studio-M is a high-quality male voice.
            # Pitch -4st makes it deeper. Rate 0.95 makes it slightly slower and more authoritative.
            ssml_text = f"""
            <speak>
                <prosody pitch="-9st" rate="0.95">
                    {clean_text}
                </prosody>
            </speak>
            """

            input_text = texttospeech.SynthesisInput(ssml=ssml_text)

            # Note: Studio voices might be more expensive/limited than WaveNet. 
            # If Studio fails or is too slow, fallback to en-US-Wavenet-D.
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-GB",
                name="en-GB-Wavenet-D", 
            )

            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.LINEAR16, # Returns WAV (Linear PCM)
                sample_rate_hertz=24000
            )

            response = self.client.synthesize_speech(
                input=input_text, voice=voice, audio_config=audio_config
            )

            # The response.audio_content is already a WAV file (with header) if LINEAR16 is used?
            # Actually LINEAR16 is raw PCM usually, but Google TTS API returns WAV header if requested?
            # Wait, AudioEncoding.LINEAR16 returns "Uncompressed 16-bit signed little-endian samples (Linear PCM)."
            # It does NOT include a WAV header.
            # However, `synthesize_speech` returns `audio_content` which IS the audio data.
            # If I want a WAV file, I should wrap it.
            # BUT, usually Google TTS returns WAV if you ask for LINEAR16? 
            # Let's check docs: "LINEAR16: Uncompressed 16-bit signed little-endian samples (Linear PCM)."
            # So I need to add the WAV header using _pcm_to_wav.
            
            # Correction: If I use `audio_encoding=texttospeech.AudioEncoding.MP3`, it returns MP3.
            # If I use `LINEAR16`, it returns raw bytes.
            
            # Actually, let's use MP3? No, the frontend expects WAV.
            # Let's use LINEAR16 and wrap it.
            
            return self._pcm_to_wav(response.audio_content, sample_rate=24000)

        except Exception as e:
            print(f"[MIMIR VOICE] Generation error: {e}")
            return b""

mimir_voice = MimirVoice()
