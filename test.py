from gtts import gTTS
tts = gTTS("שלום עולם", lang='iw')
tts.save("output.mp3")