TikTok Recipe Extractor

A Python-based web application that extracts recipes from TikTok cooking videos. The app:
1. Downloads and processes a TikTok video.
2. Transcribes the video's audio using Whisper (a speech-to-text model).
3. Interprets the transcript with OpenAI’s GPT-3.5-turbo model to produce a structured JSON recipe (title, ingredients with measurements, instructions, and notes).
4. Provides a simple frontend to input the TikTok URL and displays the resulting recipe.

Features:
- Video-to-recipe conversion: Given a TikTok cooking video URL, the app returns a fully structured JSON recipe.
- Automatic inference of measurements: If the transcript doesn’t provide exact measurements, approximate amounts are inferred and marked as such.
- Simple UI: A React/Vite-based frontend for inputting the URL and presenting results.
- Moderation and safety: The transcript and description are moderated with OpenAI’s moderation endpoint before processing.

Requirements:
- Backend:
  - Python 3.9 or higher
  - ffmpeg for audio extraction
  - yt-dlp for video downloading
  - An OpenAI API key with access to GPT-3.5-turbo
- Frontend:
  - Node.js and npm for building and running the React/Vite frontend

Setup steps:
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/tiktok-recipe-extractor.git
   cd tiktok-recipe-extractor
   ```

2. Install external tools:
   - yt-dlp:
     ```
     pip install yt-dlp
     ```
   - ffmpeg:
     On macOS (Homebrew):
     ```
     brew install ffmpeg
     ```
     On Ubuntu/Debian:
     ```
     sudo apt-get update
     sudo apt-get install ffmpeg
     ```

3. Set up a virtual environment for Python:
   ```
   python3 -m venv venv
   source venv/bin/activate
   ```
   On Windows (PowerShell):
   ```
   python -m venv venv
   venv\Scripts\Activate.ps1
   ```

4. Install Python dependencies:
   ```
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. Configure your OpenAI API key:
   Retrieve an API key from https://platform.openai.com/account/api-keys.
   Set it as an environment variable:
   ```
   export OPENAI_API_KEY="sk-..."
   ```

6. Run the backend application:
   ```
   python3 server.py
   ```
   This starts a Flask server at http://0.0.0.0:3000.

7. Run the frontend application:
   ```
   cd web
   npm install
   npm run dev
   ```
   This starts the Vite development server, usually at http://localhost:5173.

8. Accessing the app:
   Visit http://localhost:5173. Paste the TikTok video URL and click "Extract Recipe" to get the JSON output.

How it works:
- Video download: yt-dlp downloads the provided TikTok URL.
- Audio extraction: ffmpeg converts the downloaded video into a wav file.
- Transcription: Whisper transcribes the wav audio into text.
- Moderation: The transcript and description are checked against OpenAI’s moderation endpoint.
- GPT-3.5-turbo processing: The transcript is fed to GPT-3.5-turbo with a system prompt to output a structured JSON recipe.

Troubleshooting:
- Invalid JSON: If you see an “Invalid JSON output” error, ensure no extraneous prints or logs interfere with the app.py JSON output.
- Key issues: Ensure OPENAI_API_KEY is correctly set.
- Dependencies: Confirm that ffmpeg and yt-dlp are installed and in your PATH.

License:
This project is licensed under the MIT License.

Future improvements:
- Integrate DALL·E for generating a representative image of the dish.
- Add support for multiple languages.
- Improve error handling and logging.