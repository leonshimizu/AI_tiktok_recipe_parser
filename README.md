Recipe Extractor

A Python-based web application that extracts recipes from short cooking videos on TikTok, Instagram Reels, YouTube Shorts, and even moderate-length YouTube videos (20–30 minutes). It provides detailed information about ingredients, costs, and nutritional macros.

**Key Points**

1. Downloads and processes the provided video URL using yt-dlp.  
2. Transcribes the video’s audio with Whisper (a speech-to-text model).  
3. Interprets the transcript using OpenAI’s GPT-3.5-turbo model to produce a structured JSON recipe, including:
   - Title  
   - Ingredients (with measurements and approximate local costs)  
   - Instructions  
   - Notes  
   - Macro estimates (protein, carbs, fat, calories)  
   - Total cost estimate  
   - Total macros  
   - Number of servings, plus per-serving macros  
4. Displays the resulting recipe via a simple React/Vite frontend, allowing users to see cost estimates for their location and optionally view macros in a collapsible dropdown.

**Features**
- Works with TikTok, Instagram Reels, YouTube Shorts, and moderate-length YouTube videos  
- Automatic inference of measurements and macros if not fully specified  
- Local cost estimation, customizable by the user’s location  
- UI with a toggleable macros view  
- Safety checks with OpenAI’s moderation endpoint to prevent disallowed content

---

**Requirements**

**Backend**
- Python 3.9 or higher  
- ffmpeg for audio extraction  
- yt-dlp for video downloading  
- An OpenAI API key with access to GPT-3.5-turbo  

**Frontend**
- Node.js and npm for building and running the React/Vite frontend

---

**Setup Steps**

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tiktok-recipe-extractor.git
   cd tiktok-recipe-extractor
   ```

2. Install external tools:
   - **yt-dlp**:
     ```bash
     pip install yt-dlp
     ```
   - **ffmpeg**:
     - On macOS (Homebrew):
       ```bash
       brew install ffmpeg
       ```
     - On Ubuntu/Debian:
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
   Retrieve an API key from the OpenAI platform. Then:
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

8. Accessing the App:
   Visit `http://localhost:5173`. Paste the short-form video (or moderate-length YouTube) URL, enter your location, and click **Extract Recipe** to get the JSON output and view the structured recipe details.

---

**How It Works**
- **Video download**: Uses yt-dlp to fetch the video file.  
- **Audio extraction**: ffmpeg extracts the audio from the downloaded video.  
- **Transcription**: Whisper transcribes the audio.  
- **Moderation**: The transcript is run through OpenAI’s moderation endpoint.  
- **GPT-3.5-turbo processing**: The transcript is converted into a structured JSON recipe based on a system prompt.  

---

**Troubleshooting**
- If you get an **"Invalid JSON"** error, ensure your console/log output is not interfering with the JSON from app.py.  
- Verify that **OPENAI_API_KEY** is set.  
- Make sure ffmpeg and yt-dlp are properly installed and in your PATH.  
- If a video is too long, consider trimming it via ffmpeg to keep processing times manageable.

---

**License**
This project is licensed under the MIT License.

---

**Future Improvements**
- Integrate DALL·E to generate a representative image of the dish  
- Add support for multiple languages or automatic translation  
- Improve error handling and logging for large or corrupted videos