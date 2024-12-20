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
    command = ["yt-dlp", "--verbose", url, "-o", video_filename]
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

def parse_with_gpt(transcript, description, location):
    # Updated prompt: location can be anywhere in the world, and we emphasize accuracy.
    prompt = f"""
You are a highly knowledgeable cooking assistant. I will provide a cooking video transcript, a video description, and a location (which can be anywhere in the world).

Your tasks:
1. Determine a concise, descriptive, and accurate title for the recipe. If unclear, infer the best possible title.
2. For each ingredient, always provide a measurement. If no measurement is found, infer a reasonable amount and append "(approx.)".
3. Estimate the local cost of each ingredient in the given location: "{location}". Provide approximate cost as a local currency price, e.g., "X.XX (local currency)". If unsure of currency, choose one that might be appropriate for that location (e.g., if location is "Tokyo, Japan", use JPY; if "Berlin, Germany" use EUR).
4. For each ingredient, also estimate macros (protein, carbs, fat, calories) as accurately as possible. If unsure, make a reasonable guess based on common nutritional data. Be careful and do your best.
5. Provide a clear list of instructions in logical order.
6. Include a notes field stating that measurements, costs, and macros are approximations.
7. Add "total_cost_estimate" summing all ingredients into a range like "X - Y (local currency)".
8. Add "total_macros" field summarizing total protein (g), carbs (g), fat (g), and calories for the entire dish as accurately as possible.
9. Add a "servings" field indicating how many servings this recipe makes. If unsure, infer a reasonable number.
   - If servings > 1, we will show macros per serving on the frontend, but you still provide total macros for the entire dish.

Output in strict JSON format. Use a structure like this:
{{
  "title": "Some Descriptive Title",
  "servings": X,
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

    try:
        video_file = download_tiktok_video(url)
        audio_file = extract_audio(video_file)
        transcript = transcribe_audio(audio_file)
        description, thumbnail_url = get_tiktok_data(url)
        combined_text = f"{transcript}\n\n{description}"
        moderate_text(combined_text)
        recipe = parse_with_gpt(transcript, description, location)

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
