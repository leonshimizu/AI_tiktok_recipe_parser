# TikTok Recipe Extractor

A Python-based web application that extracts recipes from TikTok cooking videos.  
The app:
1. Downloads and processes a TikTok video.
2. Transcribes the video's audio using Whisper (a speech-to-text model).
3. Interprets the transcript with OpenAI's GPT-3.5-turbo model to produce a structured JSON recipe (title, ingredients with measurements, instructions, and notes).
4. Provides a simple frontend to input the TikTok URL and displays the resulting recipe.

## Features
- **Video-to-Recipe Conversion**: Given a TikTok cooking video URL, the app returns a fully structured JSON recipe.
- **Automatic Inference of Measurements**: If the transcript doesn’t provide exact measurements, approximate amounts are inferred and marked as such.
- **Simple UI**: A minimal web interface to paste the URL and extract the recipe.
- **Moderation and Safety**: The transcript and description are moderated with OpenAI's moderation endpoint.

## Requirements
- Python 3.9+
- [ffmpeg](https://ffmpeg.org/download.html) for audio extraction
- [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation) for video downloading
- An OpenAI API key with access to the GPT-3.5-turbo model

## Setup Steps
1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/tiktok-recipe-extractor.git
   cd tiktok-recipe-extractor
   ```

2. **Install External Tools**
   - **yt-dlp**: 
     ```bash
     pip install yt-dlp
     ```
   - **ffmpeg**:
     - macOS (Homebrew):
       ```bash
       brew install ffmpeg
       ```
     - Ubuntu/Debian:
       ```bash
       sudo apt-get update
       sudo apt-get install ffmpeg
       ```

3. **Set Up a Virtual Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
   *On Windows (PowerShell):*
   ```powershell
   python -m venv venv
   venv\Scripts\Activate.ps1
   ```

4. **Install Python Dependencies**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **Configure Your OpenAI API Key**
   - Retrieve an API key from [OpenAI](https://platform.openai.com/account/api-keys).
   - Set it as an environment variable:
     ```bash
     export OPENAI_API_KEY="sk-..."
     ```

6. **Run the Application**
   ```bash
   python3 server.py
   ```
   This starts a Flask server at `http://0.0.0.0:3000`.

7. **Accessing the App**
   - In your browser, go to: `http://localhost:3000`
   - Paste the TikTok video URL into the input field.
   - Click "Extract Recipe" to get the JSON output of the recipe.

## How It Works
- **Video Download**: `yt-dlp` downloads the provided TikTok URL.
- **Audio Extraction**: `ffmpeg` converts the downloaded video into a `wav` file.
- **Transcription**: Whisper transcribes the `wav` audio into text.
- **Moderation**: The transcript and description are checked against OpenAI’s moderation endpoint.
- **GPT-3.5-turbo Processing**: The transcript is fed to GPT-3.5-turbo with a system prompt to output a structured JSON recipe.

## Troubleshooting
- **Invalid JSON**: If you see an “Invalid JSON output” error, ensure no extraneous prints or logs interfere with the `app.py` JSON output.
- **Key Issues**: Ensure `OPENAI_API_KEY` is correctly set.
- **Dependencies**: Confirm that `ffmpeg` and `yt-dlp` are installed and in your PATH.

## License
This project is licensed under the [MIT License](LICENSE).

## Future Improvements
- Integrate DALL·E for generating a representative image of the dish.
- Add support for multiple languages.
- Improve error handling and logging.