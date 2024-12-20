import sys
import subprocess
import uuid
import os
import json
import whisper
import warnings
from openai import OpenAI

# Suppress Python warnings
warnings.filterwarnings("ignore")

# Set up the OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def download_tiktok_video(url):
    video_filename = f"video_{uuid.uuid4().hex}.mp4"
    command = ["yt-dlp", url, "-o", video_filename]
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return video_filename

def get_tiktok_data(url):
    command = ["yt-dlp", url, "--dump-json"]
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout.strip())
        description = data.get("description", "")
        thumbnail = data.get("thumbnail", "")
        return description, thumbnail
    except subprocess.CalledProcessError:
        return "", ""

def extract_audio(video_file):
    audio_filename = f"audio_{uuid.uuid4().hex}.wav"
    command = [
        "ffmpeg", "-i", video_file,
        "-ar", "16000", "-ac", "1",
        "-vn", audio_filename, "-y"
    ]
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
    if response.results[0].flagged:
        raise ValueError("The combined transcript and description contain disallowed content.")
    return True

def parse_with_gpt(transcript, description, zipcode):
    prompt = f"""
You are a cooking assistant. I will provide a cooking video transcript, a video description, and a ZIP code.

Your tasks:
1. Determine a title for the recipe.
2. For each ingredient, always provide a measurement. If no measurement is found, infer one and add "(approx.)".
3. For each ingredient, provide an approximate cost as "$X.XX". Use ZIP code {zipcode} as a hint but just estimate typical US grocery prices.
4. Provide a list of instructions in logical order.
5. Include a notes field saying measurements and costs are approximations.
6. Add "total_cost_estimate" summing all ingredients into a range like "$X - $Y".

Output in strict JSON:
{{
  "title": "Some Descriptive Title",
  "ingredients": [
    {{
      "name": "Ingredient Name",
      "amount": "X unit(s)",
      "cost": "$X.XX"
    }},
    ...
  ],
  "instructions": [...],
  "notes": "...",
  "total_cost_estimate": "$X - $Y"
}}

Transcript:
\"\"\"{transcript}\"\"\"

Description:
\"\"\"{description}\"\"\"
"""
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    content = response.choices[0].message.content.strip()
    data = json.loads(content)
    return data

if __name__ == "__main__":
    if len(sys.argv) != 3:
        error_result = {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": "Usage: python app.py <tiktok_url> <zipcode>"
        }
        sys.stdout.write(json.dumps(error_result))
        sys.stdout.flush()
        sys.exit(1)

    url = sys.argv[1]
    zipcode = sys.argv[2]

    try:
        video_file = download_tiktok_video(url)
        audio_file = extract_audio(video_file)
        transcript = transcribe_audio(audio_file)
        description, thumbnail_url = get_tiktok_data(url)
        combined_text = f"{transcript}\n\n{description}"
        moderate_text(combined_text)
        recipe = parse_with_gpt(transcript, description, zipcode)

        if thumbnail_url:
            recipe["image_url"] = thumbnail_url

        sys.stdout.write(json.dumps(recipe))
        sys.stdout.flush()

    except subprocess.CalledProcessError as e:
        error_result = {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": f"Error occurred while processing video/audio: {str(e)}"
        }
        sys.stdout.write(json.dumps(error_result))
        sys.stdout.flush()
        sys.exit(1)
    except ValueError as ve:
        error_result = {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": str(ve)
        }
        sys.stdout.write(json.dumps(error_result))
        sys.stdout.flush()
        sys.exit(1)
    except Exception as ex:
        error_result = {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": f"An unexpected error occurred: {str(ex)}"
        }
        sys.stdout.write(json.dumps(error_result))
        sys.stdout.flush()
        sys.exit(1)
    finally:
        if 'video_file' in locals() and os.path.exists(video_file):
            os.remove(video_file)
        if 'audio_file' in locals() and os.path.exists(audio_file):
            os.remove(audio_file)
