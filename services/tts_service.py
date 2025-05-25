import os
from google.cloud import texttospeech

AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'audio')
os.makedirs(AUDIO_DIR, exist_ok=True)

def list_voices(language_code='he-IL'):
    """Return a list of available Google Cloud TTS voices for the specified language (default: Hebrew)."""
    client = texttospeech.TextToSpeechClient()
    response = client.list_voices(language_code=language_code)
    voices = []
    for v in response.voices:
        voices.append({
            "voice_id": v.name,  # e.g., 'he-IL-Standard-A'
            "name": v.name,
            "ssml_gender": texttospeech.SsmlVoiceGender(v.ssml_gender).name,
            "language_codes": v.language_codes
        })
    return voices

def generate_tts(text, voice_id, speed=1.0, output_filename=None):
    """
    Generate TTS audio from text using Google Cloud TTS, save to file, and return the path.
    """
    client = texttospeech.TextToSpeechClient()
    synthesis_input = texttospeech.SynthesisInput(text=text)
    # Parse language code from voice_id (e.g., 'he-IL-Standard-A')
    lang_code = "he-IL"
    if '-' in voice_id:
        lang_code = '-'.join(voice_id.split('-')[:2])
    voice = texttospeech.VoiceSelectionParams(
        language_code=lang_code,
        name=voice_id
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=speed
    )
    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )
    if not output_filename:
        output_filename = f"story_{voice_id.replace('-', '_')}_{int(speed*100)}.mp3"
    output_path = os.path.join(AUDIO_DIR, output_filename)
    with open(output_path, "wb") as out:
        out.write(response.audio_content)
    return output_path 