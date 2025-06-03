# PTSDAppExpo (Mobile Client)

This is a minimal Expo/React Native app for your PTSD Flask backend.

## Features
- View all patients
- View stories for a patient
- Play TTS audio for a story (if available)
- Submit SUD/feedback

## Setup
1. **Install dependencies:**
   ```sh
   cd mobile/PTSDAppExpo
   npm install
   # or
   yarn install
   ```
2. **Configure API URL:**
   - Edit `api.js` and set `API_BASE_URL` to your Flask server's IP (e.g., `http://192.168.1.100:5000`).
   - Make sure your phone and server are on the same WiFi network.

3. **Run the app:**
   ```sh
   npx expo start
   ```
   - Scan the QR code with the Expo Go app on your phone, or run on an emulator.

## Requirements
- Node.js, npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- Flask backend running and accessible from your device

## Notes
- Audio playback uses `expo-av` and streams from `/static/audio/` on your backend.
- For production, deploy your Flask backend to a public server and update the API URL.

---

For questions or help, contact your dev team! 