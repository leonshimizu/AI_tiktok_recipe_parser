import os
import json
import subprocess
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

def create_app(test_config=None):
    app = Flask(__name__, static_folder='web/dist', static_url_path='/')
    CORS(app)
    app.config.from_mapping(SECRET_KEY='dev')

    if test_config is not None:
        app.config.update(test_config)

    @app.route('/extract', methods=['POST'])
    def extract():
        data = request.get_json()
        url = data.get('url')
        location = data.get('zipcode')  # previously 'zipcode', but now treated as location
        if not url:
            print("DEBUG: No URL provided")
            return jsonify({"error": "No URL provided"}), 400
        if not location:
            print("DEBUG: No location provided")
            return jsonify({"error": "No location provided"}), 400

        print(f"DEBUG: Received URL: {url}")
        print(f"DEBUG: Received location: {location}")

        try:
            # Run the app.py script and capture output
            result = subprocess.run(
                ['python3', 'app.py', url, location],
                capture_output=True,
                text=True
            )

            print("DEBUG: Completed subprocess call.")
            print("DEBUG: STDOUT from app.py:\n", result.stdout)
            print("DEBUG: STDERR from app.py:\n", result.stderr)
            print("DEBUG: Return code:", result.returncode)

            if result.returncode != 0:
                # The command failed
                print("ERROR: subprocess returned a non-zero exit code.")
                return jsonify({"error": f"Failed to process video. Return code: {result.returncode}. STDERR: {result.stderr}"}), 500

            # Attempt to parse JSON from stdout
            recipe_data = json.loads(result.stdout)
            print("DEBUG: JSON parsing successful.")
            return jsonify(recipe_data), 200

        except subprocess.CalledProcessError as e:
            print("ERROR: subprocess.CalledProcessError encountered.")
            print("STDOUT:", e.stdout)
            print("STDERR:", e.stderr)
            return jsonify({"error": f"Failed to process video: {str(e)}"}), 500
        except json.JSONDecodeError as je:
            print("ERROR: JSONDecodeError encountered.")
            print("RAW output that caused error:", result.stdout)
            return jsonify({"error": "Invalid JSON output from app.py"}), 500
        except Exception as ex:
            print("ERROR: Unexpected exception encountered.")
            print("Exception details:", ex)
            return jsonify({"error": f"Unexpected error: {str(ex)}"}), 500

    @app.route('/health', methods=['GET'])
    def health_check():
        # Optional: a simple health check route for Render
        return jsonify({"status": "ok"}), 200

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return app.send_static_file(path)
        else:
            return app.send_static_file('index.html')

    return app

app = create_app()

# For local testing you can still run the app with: python3 server.py
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))  # Read PORT from environment variable
    app.run(host='0.0.0.0', port=port)
