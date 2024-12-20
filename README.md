TikTok Recipe Extractor

A Python-based web application that extracts recipes from TikTok cooking videos and provides detailed information about ingredients, costs, and nutritional macros. The app:

1. Downloads and processes a TikTok video.
2. Transcribes the video’s audio using Whisper (a speech-to-text model).
3. Interprets the transcript with OpenAI’s GPT-3.5-turbo model to produce a structured JSON recipe including:
   - Title
   - Ingredients with measurements (and approximate costs based on location)
   - Instructions
   - Notes
   - Macro estimates (protein, carbs, fat, calories)
   - Total cost estimate
   - Total macros
   - Number of servings, with per-serving macros calculation
4. Provides a simple frontend to input the TikTok URL and your location, and displays the resulting recipe with a toggleable macros dropdown.

Features:  
- Video-to-recipe conversion: Given a TikTok cooking video URL, the app returns a fully structured JSON recipe.  
- Automatic inference of measurements: If the transcript doesn’t provide exact measurements, the app infers reasonable amounts.  
- Global cost estimation: Input your location (e.g., city, region) and receive rough cost estimates for ingredients.  
- Macro details: Shows both total macros and per-serving macros if multiple servings are inferred.  
- Simple UI: A React/Vite-based frontend for inputting data and presenting the results.  
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
   ```bash
   git clone https://github.com/yourusername/tiktok-recipe-extractor.git
   cd tiktok-recipe-extractor
   ```
   
2. Install external tools:  
   - yt-dlp:  
     ```bash
     pip install yt-dlp
     ```  
   - ffmpeg:  
     On macOS (Homebrew):  
     ```bash
     brew install ffmpeg
     ```  
     On Ubuntu/Debian:  
     ```bash
     sudo apt-get update
     sudo apt-get install ffmpeg
     ```

3. Set up a virtual environment for Python:  
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
   On Windows (PowerShell):  
   ```powershell
   python -m venv venv
   venv\Scripts\Activate.ps1
   ```

4. Install Python dependencies:  
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. Configure your OpenAI API key:  
   Retrieve an API key from the OpenAI platform. Set it as an environment variable:  
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

6. Run the backend application:  
   ```bash
   python3 server.py
   ```
   This starts a Flask server at `http://0.0.0.0:3000`.

7. Run the frontend application:  
   ```bash
   cd web
   npm install
   npm run dev
   ```
   This starts the Vite development server, usually at `http://localhost:5173`.

8. Accessing the app:  
   Visit `http://localhost:5173`. Paste the TikTok video URL and enter your location. Click "Extract Recipe" to get the JSON output and see the structured recipe details.

How it works:  
- Video download: yt-dlp downloads the provided TikTok URL.  
- Audio extraction: ffmpeg converts the downloaded video into a wav file.  
- Transcription: Whisper transcribes the wav audio into text.  
- Moderation: The transcript and description are checked against OpenAI’s moderation endpoint.  
- GPT-3.5-turbo processing: The transcript is fed to GPT-3.5-turbo with a detailed system prompt to produce a structured JSON recipe.

Troubleshooting:  
- Invalid JSON: If you see an "Invalid JSON output" error, ensure no extraneous prints or logs interfere with the JSON output from app.py.  
- Key issues: Ensure OPENAI_API_KEY is correctly set.  
- Dependencies: Confirm that ffmpeg and yt-dlp are installed and in your PATH.

License:  
This project is licensed under the MIT License.

Future improvements:  
- Integrate DALL·E for generating a representative image of the dish.  
- Add support for multiple languages.  
- Improve error handling and logging.