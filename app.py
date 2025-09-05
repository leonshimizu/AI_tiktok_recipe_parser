"""
AI TikTok Recipe Parser - Main Application
Extracts recipes from TikTok/social media videos using AI

Features:
- Pipeline processing (connection warming during metadata extraction)
- Async OpenAI API calls
- yt-dlp Python library (faster than subprocess)
- Smart caching
- Performance logging
- Real-time streaming progress updates
"""

import sys
import os
import json
import time
import asyncio
import warnings
from typing import Tuple, Dict, Any
import yt_dlp
from openai import AsyncOpenAI

# Suppress warnings for cleaner output
warnings.filterwarnings("ignore")

# Try to load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not available. Make sure to set environment variables manually.", file=sys.stderr)

# Set up the async OpenAI client
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Caching for performance
metadata_cache = {}
recipe_cache = {}

class RecipeProcessor:
    """Main recipe processing class with pipeline optimization and streaming"""
    
    def __init__(self, streaming_mode=False):
        self.ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extract_flat': False,
        }
        self.connection_warmed = False
        self.streaming_mode = streaming_mode
    
    def emit_progress(self, message: str, data: Dict[str, Any] = None):
        """Emit progress update (streaming or stderr)"""
        if self.streaming_mode:
            progress = {
                "type": "progress",
                "message": message,
                "timestamp": time.time(),
                "data": data or {}
            }
            print(f"data: {json.dumps(progress)}\n", flush=True)
        else:
            print(message, file=sys.stderr)
    
    def emit_result(self, recipe: Dict[str, Any]):
        """Emit final result (streaming or stdout)"""
        if self.streaming_mode:
            result = {
                "type": "result",
                "recipe": recipe,
                "timestamp": time.time()
            }
            print(f"data: {json.dumps(result)}\n", flush=True)
        else:
            print(json.dumps(recipe))
    
    async def warm_connection(self):
        """Warm up OpenAI connection to reduce latency"""
        if self.connection_warmed:
            return
        
        if self.streaming_mode:
            self.emit_progress("🔥 Warming AI connection...")
        
        try:
            # Make a minimal API call to establish connection
            await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1
            )
            self.connection_warmed = True
            if self.streaming_mode:
                self.emit_progress("✅ AI connection ready")
            else:
                print(f"🔥 Connection warmed", file=sys.stderr)
        except Exception as e:
            if self.streaming_mode:
                self.emit_progress(f"⚠️ Connection warming failed: {str(e)}")
            # Ignore errors, this is just for warming up
    
    async def extract_metadata(self, url: str) -> Tuple[str, str, Dict[str, Any]]:
        """Extract video metadata using yt-dlp with connection warming"""
        
        if self.streaming_mode:
            self.emit_progress("🔄 Extracting video metadata...")
        
        # Check cache first
        if url in metadata_cache:
            if self.streaming_mode:
                self.emit_progress("💾 Using cached metadata")
            else:
                print(f"💾 Cache hit for metadata", file=sys.stderr)
            return metadata_cache[url]
        
        def extract_sync():
            """Synchronous metadata extraction"""
            try:
                with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                    info_dict = ydl.extract_info(url, download=False)
                    
                    description = info_dict.get('description', '') or ''
                    thumbnail = info_dict.get('thumbnail', '') or ''
                    title = info_dict.get('title', '') or ''
                    
                    return description, thumbnail, {
                        'title': title,
                        'uploader': info_dict.get('uploader', ''),
                        'duration': info_dict.get('duration', 0),
                    }
            except Exception as e:
                print(f"❌ Metadata extraction failed: {e}", file=sys.stderr)
                return "", "", {}
        
        # Start connection warming in parallel with metadata extraction
        warmup_task = asyncio.create_task(self.warm_connection())
        
        # Run metadata extraction in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, extract_sync)
        
        # Ensure connection is warmed
        await warmup_task
        
        # Add streaming progress for successful extraction
        if self.streaming_mode and result[0]:  # If description exists
            title = result[2].get('title', 'Unknown')
            self.emit_progress(
                f"📊 Found video: \"{title}\"",
                {"description_length": len(result[0]), "title": title}
            )
        elif self.streaming_mode:
            self.emit_progress("❌ No video description found")
        
        # Cache the result
        metadata_cache[url] = result
        return result
    
    async def process_with_gpt(self, description: str, location: str, extra_info: Dict[str, Any]) -> Dict[str, Any]:
        """Process recipe using GPT with optimized prompt"""
        
        # Check recipe cache
        cache_key = f"{description[:50]}_{location}"
        if cache_key in recipe_cache:
            if self.streaming_mode:
                self.emit_progress("💾 Using cached recipe")
            else:
                print(f"💾 Cache hit for recipe", file=sys.stderr)
            return recipe_cache[cache_key]
        
        if self.streaming_mode:
            self.emit_progress("🤖 Processing with AI...")
            self.emit_progress("📝 Analyzing ingredients...")
        
        # Use title from metadata for better context
        title_hint = extra_info.get('title', '')
        context = f"Title: {title_hint}\n" if title_hint else ""
        
        # Optimized prompt for speed and accuracy
        prompt = f"""{context}Extract recipe from: "{description}"
Location: {location}

Return JSON with this exact structure:
{{"title":"Recipe Name","servings":4,"prep_time_minutes":10,"cook_time_minutes":15,"equipment":["bowl","spatula"],"ingredients":[{{"name":"ingredient","amount":"1 cup","cost":"2.00 (local currency)","protein_g":5,"carbs_g":10,"fat_g":2,"calories":80}}],"instructions":["step1","step2"],"notes":"Measurements and costs are approximate","total_cost_estimate":"5-7 (local currency)","total_macros":{{"protein_g":20,"carbs_g":40,"fat_g":10,"calories":320}},"dietary_substitutions":{{"gluten_free":"substitute","vegan":"substitute"}}}}"""
        
        try:
            # Connection should already be warm from pipeline
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{
                    "role": "system", 
                    "content": "Extract recipe data. Return only valid JSON."
                }, {
                    "role": "user", 
                    "content": prompt
                }],
                temperature=0,
                max_tokens=1200
            )
            
            if self.streaming_mode:
                self.emit_progress("🍽️ Calculating nutrition & costs...")
            
            content = response.choices[0].message.content.strip()
            recipe_data = json.loads(content)
            
            # Use metadata title if GPT didn't provide a good one
            if not recipe_data.get('title') or recipe_data['title'] == "Recipe Name":
                if title_hint:
                    recipe_data['title'] = title_hint
            
            if self.streaming_mode:
                self.emit_progress("✅ Recipe extraction complete!")
            
            # Cache the result
            recipe_cache[cache_key] = recipe_data
            return recipe_data
            
        except Exception as e:
            print(f"❌ GPT processing failed: {e}", file=sys.stderr)
            raise

async def process_video(url: str, location: str, streaming_mode: bool = False) -> Dict[str, Any]:
    """Main processing function with pipeline optimization and optional streaming"""
    
    start_time = time.time()
    processor = RecipeProcessor(streaming_mode=streaming_mode)
    
    if streaming_mode:
        processor.emit_progress(f"🚀 Starting recipe extraction...")
    else:
        print(f"🚀 Starting recipe extraction for: {url}", file=sys.stderr)
    
    try:
        # Step 1: Extract metadata (with connection warming in parallel)
        metadata_start = time.time()
        description, thumbnail_url, extra_info = await processor.extract_metadata(url)
        metadata_time = time.time() - metadata_start
        
        print(f"📊 Metadata + warmup took: {metadata_time:.2f}s", file=sys.stderr)
        print(f"📊 Description length: {len(description)} characters", file=sys.stderr)
        
        if not description:
            raise ValueError("No description found in video metadata")
        
        # Step 2: Process with GPT (connection already warm)
        gpt_start = time.time()
        recipe = await processor.process_with_gpt(description, location, extra_info)
        gpt_time = time.time() - gpt_start
        print(f"🤖 GPT processing took: {gpt_time:.2f}s", file=sys.stderr)
        
        # Add thumbnail
        if thumbnail_url:
            recipe["image_url"] = thumbnail_url
        
        total_time = time.time() - start_time
        
        if streaming_mode:
            processor.emit_result(recipe)
            processor.emit_progress(f"🎉 Complete! Total time: {total_time:.2f}s")
        else:
            print(f"✅ Total processing time: {total_time:.2f}s", file=sys.stderr)
        
        return recipe
        
    except Exception as e:
        print(f"❌ Processing failed: {e}", file=sys.stderr)
        return {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": str(e)
        }

async def main():
    """Main async function"""
    # Check for streaming mode flag
    streaming_mode = "--stream" in sys.argv
    if streaming_mode:
        sys.argv.remove("--stream")
    
    if len(sys.argv) != 3:
        error_result = {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": "Usage: python app.py <url> <location> [--stream]"
        }
        if streaming_mode:
            print("Content-Type: text/event-stream")
            print("Cache-Control: no-cache")
            print("Connection: keep-alive")
            print()
            progress = {
                "type": "error",
                "message": error_result["error"]
            }
            print(f"data: {json.dumps(progress)}\n")
        else:
            print(json.dumps(error_result))
        sys.exit(1)
    
    url = sys.argv[1]
    location = sys.argv[2]
    
    if streaming_mode:
        # Set up SSE headers
        print("Content-Type: text/event-stream")
        print("Cache-Control: no-cache")
        print("Connection: keep-alive")
        print()
    
    try:
        recipe = await process_video(url, location, streaming_mode=streaming_mode)
        
        # Only print JSON for non-streaming mode (streaming mode handles output internally)
        if not streaming_mode:
            print(json.dumps(recipe))
        
    except Exception as e:
        error_result = {
            "title": "",
            "ingredients": [],
            "instructions": [],
            "notes": "",
            "error": f"Unexpected error: {str(e)}"
        }
        
        if streaming_mode:
            error_progress = {
                "type": "error",
                "message": f"Processing failed: {str(e)}"
            }
            print(f"data: {json.dumps(error_progress)}\n")
        else:
            print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())