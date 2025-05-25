# PTSD CBT Dashboard

A modern, interactive dashboard for managing PTSD Cognitive Behavioral Therapy (CBT) sessions, patients, and stories. Built with Flask, MongoDB, and a beautiful React/Bootstrap-inspired frontend.

## Features
- Patient management and lookup
- Session and SUD (Subjective Units of Distress) tracking
- Story generation based on clinical rules and patient data
- Therapist dashboard with live feedback, SUD trends, and activity log
- Modern, responsive UI with RTL support
- Secure feedback and session notes
- Audio/text-to-speech integration

## Setup
1. **Clone the repository:**
   ```sh
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   ```
2. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env` and fill in your secrets (Flask secret, DB URI, API keys, etc.)
4. **Run MongoDB** (locally or with Docker)
5. **Start the Flask app:**
   ```sh
   flask run --host=0.0.0.0
   ```

## Usage
- Access the dashboard at `http://localhost:5000/dashboard`
- Use the API from your Expo Go app or web frontend
- See `/config.js` for dynamic API base URL

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE) 