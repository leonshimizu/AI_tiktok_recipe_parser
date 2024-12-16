# server.py
import os
import json
import subprocess
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

def create_app(test_config=None):
    app = Flask(__name__, static_folder='static', template_folder='templates')
    CORS(app)
    app.config.from_mapping(
        SECRET_KEY='dev'
    )

    if test_config is not None:
        app.config.update(test_config)

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/extract', methods=['POST'])
    def extract():
        data = request.get_json()
        url = data.get('url')
        if not url:
            return jsonify({"error": "No URL provided"}), 400

        try:
            result = subprocess.run(
                ['python3', 'app.py', url],
                capture_output=True,
                text=True,
                check=True
            )
            recipe_data = json.loads(result.stdout)
            return jsonify(recipe_data), 200

        except subprocess.CalledProcessError as e:
            return jsonify({"error": f"Failed to process video: {str(e)}"}), 500
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON output from app.py"}), 500
        except Exception as ex:
            return jsonify({"error": f"Unexpected error: {str(ex)}"}), 500

    return app

if __name__ == '__main__':
    # Make sure OPENAI_API_KEY is set in the environment
    # Run: python3 server.py
    app = create_app()
    app.run(host='0.0.0.0', port=3000, debug=True)
