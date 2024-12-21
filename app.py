# app.py
import sys
import subprocess
import uuid
import os
import json
import whisper
import warnings
from openai import OpenAI

# If using caching or DB helpers, uncomment as needed:
# from store import get_recipe_from_db, store_recipe_in_db

# Suppress Python warnings
warnings.filterwarnings("ignore")

# Set up the OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def download_tiktok_video(url):
    """
    Downloads a video from the given URL (TikTok, YouTube Shorts, etc.)
    using yt-dlp. Forces best video + best audio, then merges to mp4.
    """
    video_filename = f"video_{uuid.uuid4().hex}.mp4"
    command = [
        "yt-dlp",
        "--verbose",
        "-f", "bv*+ba/b",  # Pick bestvideo+bestaudio if available, else fallback
        "--merge-output-format", "mp4",  # Merge into a single MP4
        url,
        "-o", video_filename
    ]
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return video_filename

def get_tiktok_data(url):
    """
    Uses yt-dlp --dump-json to retrieve metadata, including description and thumbnail.
    """
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
    """
    Extracts audio from the merged MP4, to a WAV file with 16kHz / 1 channel.
    """
    audio_filename = f"audio_{uuid.uuid4().hex}.wav"
    command = [
        "ffmpeg", "-i", video_file,
        "-ar", "16000", "-ac", "1",
        "-vn", audio_filename, "-y"
    ]
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return audio_filename

def transcribe_audio(audio_file):
    """
    Uses openai-whisper (whisper) to transcribe the WAV audio.
    """
    model = whisper.load_model("base")
    result = model.transcribe(audio_file)
    return result["text"]

def moderate_text(text):
    """
    Check transcript + description with OpenAI's moderation endpoint.
    If flagged, raise ValueError.
    """
    response = client.moderations.create(
        model="omni-moderation-latest",
        input=text
    )
    if response.results[0].flagged:
        raise ValueError("The combined transcript and description contain disallowed content.")
    return True

def parse_with_gpt(transcript, description, location):
    """
    Updated prompt to produce a structured JSON recipe with cost, macros,
    an inferred number of servings, cooking/prep times, equipment, dietary substitutions, etc.
    """
    prompt = f"""
You are a highly knowledgeable cooking assistant. I will provide a cooking video transcript, 
a video description, and a location (which can be anywhere in the world).

Your tasks:
1. Determine a concise, accurate title for the recipe.
2. For each ingredient, always provide a measurement. If no measurement is found, 
   infer a reasonable amount and append "(approx.)".
3. Estimate local cost of each ingredient in the given location "{location}" as "X.XX (local currency)".
4. For each ingredient, also estimate macros (protein, carbs, fat, calories) as accurately as possible.
5. Provide a list of instructions in logical order.
6. Include total cooking time ("cook_time_minutes") and total prep time ("prep_time_minutes").
7. Provide a list of required kitchen equipment under "equipment".
8. Include a 'notes' field stating that measurements, costs, and macros are approximations.
9. Add "total_cost_estimate" summing all ingredients into a range like "X - Y (local currency)".
10. Add "total_macros" summarizing total protein, carbs, fat, and calories for the entire dish.
11. Add a "servings" field indicating how many servings this recipe makes.
12. Provide a "dietary_substitutions" field for common dietary restrictions (e.g., gluten_free, vegan, dairy_free),
   suggesting alternative ingredients if relevant.

Output in strict JSON format. Example structure:

{{
  "title": "Some Descriptive Title",
  "servings": 4,
  "prep_time_minutes": 10,
  "cook_time_minutes": 20,
  "equipment": [
    "Mixing bowl",
    "Pan",
    "Spatula"
  ],
  "ingredients": [
    {{
      "name": "Ingredient Name",
      "amount": "X unit(s)",
      "cost": "X.XX (local currency)",
      "protein_g": X,
      "carbs_g": X,
      "fat_g": X,
      "calories": X
    }},
    ...
  ],
  "instructions": [...],
  "notes": "Measurements, costs, and macros are approximate.",
  "total_cost_estimate": "X - Y (local currency)",
  "total_macros": {{
    "protein_g": X,
    "carbs_g": X,
    "fat_g": X,
    "calories": X
  }},
  "dietary_substitutions": {{
    "gluten_free": "...",
    "vegan": "...",
    "dairy_free": "..."
  }}
}}

Transcript:
\"\"\"{transcript}\"\"\"

Description:
\"\"\"{description}\"\"\"

Location: \"{location}\"
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
    # Expecting exactly 2 arguments: <url> <location>
    if len(sys.argv) != 3:
        error_result = {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": "Usage: python app.py <tiktok_url> <location>"
        }
        sys.stdout.write(json.dumps(error_result))
        sys.stdout.flush()
        sys.exit(1)

    url = sys.argv[1]
    location = sys.argv[2]

    # Optionally, if using caching:
    # existing_transcript, existing_recipe = get_recipe_from_db(url)
    # if existing_recipe:
    #     sys.stdout.write(json.dumps(existing_recipe))
    #     sys.stdout.flush()
    #     sys.exit(0)

    try:
        # 1. Download
        video_file = download_tiktok_video(url)

        # 2. Extract Audio
        audio_file = extract_audio(video_file)

        # 3. Transcribe
        transcript = transcribe_audio(audio_file)

        # 4. Gather description + thumbnail
        description, thumbnail_url = get_tiktok_data(url)

        # 5. Moderate
        combined_text = f"{transcript}\n\n{description}"
        moderate_text(combined_text)

        # 6. Parse with GPT
        recipe = parse_with_gpt(transcript, description, location)

        # If we got a thumbnail URL, include it
        if thumbnail_url:
            recipe["image_url"] = thumbnail_url

        # Optionally store in DB:
        # store_recipe_in_db(url, transcript, recipe)

        # Print JSON
        sys.stdout.write(json.dumps(recipe))
        sys.stdout.flush()

    except subprocess.CalledProcessError as e:
        # If yt-dlp or ffmpeg fails
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
        # If moderation or JSON decode fails
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
        # Catch-all
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
        # Cleanup
        if 'video_file' in locals() and os.path.exists(video_file):
            os.remove(video_file)
        if 'audio_file' in locals() and os.path.exists(audio_file):
            os.remove(audio_file)
