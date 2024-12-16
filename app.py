import sys
import subprocess
import uuid
import os
import json
from openai import OpenAI
import whisper

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def download_tiktok_video(url):
    video_filename = f"video_{uuid.uuid4().hex}.mp4"
    command = ["yt-dlp", url, "-o", video_filename]
    subprocess.run(command, check=True)
    return video_filename

def get_tiktok_description(url):
    command = ["yt-dlp", url, "--dump-json"]
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout.strip())
        description = data.get("description", "")
        return description
    except subprocess.CalledProcessError:
        return ""

def extract_audio(video_file):
    audio_filename = f"audio_{uuid.uuid4().hex}.wav"
    command = [
        "ffmpeg", "-i", video_file,
        "-ar", "16000", "-ac", "1",
        "-vn", audio_filename, "-y"
    ]
    subprocess.run(command, check=True)
    return audio_filename

def transcribe_audio(audio_file):
    model = whisper.load_model("base")
    result = model.transcribe(audio_file)
    return result["text"]

def moderate_text(text):
    response = client.moderations.create(
        model="omni-moderation-latest",
        input=text
    )
    flagged = response.results[0].flagged
    if flagged:
        raise ValueError("The combined transcript and description contain disallowed content.")
    return True

def parse_with_gpt(transcript, description):
    prompt = f"""
You are a cooking assistant. I will provide a cooking video transcript and a video description.

Your tasks:
1. Determine a title for the recipe. The title might be found in the description or what the speaker says. If it's unclear, infer a concise, descriptive title based on the dish.
2. Always provide a measurement for each ingredient.
   - If the transcript or description explicitly provides a measurement, use it exactly and do not add "(approx.)".
   - If no measurement is provided, infer a reasonable amount and append "(approx.)" to that ingredient.
3. Provide a list of instructions (steps) in a logical order.
4. Include a notes field explaining that some measurements may be approximations.

Output in strict JSON format:
{{
  "title": "Some Descriptive Title",
  "ingredients": [...],
  "instructions": [...],
  "notes": "If an ingredient's amount did not appear in the transcript or description, an approximate amount has been provided and marked with (approx.)."
}}

Transcript:
\"\"\"{transcript}\"\"\"

Description:
\"\"\"{description}\"\"\"
"""
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role":"user", "content": prompt}],
        temperature=0
    )
    content = response.choices[0].message.content.strip()

    try:
        data = json.loads(content)
        title = data.get("title", "")
        ingredients = data.get("ingredients", [])
        instructions = data.get("instructions", [])
        notes = data.get("notes", "")
        return title, ingredients, instructions, notes
    except json.JSONDecodeError:
        # If GPT response is not JSON parseable, return empty and note an error
        raise ValueError("Failed to parse GPT response as JSON.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        error_result = {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": "Usage: python app.py <tiktok_url>"
        }
        print(json.dumps(error_result))
        sys.exit(1)

    url = sys.argv[1]

    try:
        video_file = download_tiktok_video(url)
        audio_file = extract_audio(video_file)
        transcript = transcribe_audio(audio_file)
        description = get_tiktok_description(url)

        combined_text = f"{transcript}\n\n{description}"
        moderate_text(combined_text)

        title, ingredients, steps, notes = parse_with_gpt(transcript, description)

        result = {
            "title": title,
            "ingredients": ingredients,
            "instructions": steps,
            "notes": notes
        }
        print(json.dumps(result, indent=2))

    except subprocess.CalledProcessError as e:
        error_result = {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": f"Error occurred while processing video/audio: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)
    except ValueError as ve:
        # Handles moderation failures or JSON parse failures
        error_result = {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": str(ve)
        }
        print(json.dumps(error_result))
        sys.exit(1)
    except Exception as ex:
        error_result = {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": f"An unexpected error occurred: {str(ex)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)
    finally:
        if 'video_file' in locals() and os.path.exists(video_file):
            os.remove(video_file)
        if 'audio_file' in locals() and os.path.exists(audio_file):
            os.remove(audio_file)
