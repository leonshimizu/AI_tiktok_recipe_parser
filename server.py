import os
import json
import subprocess
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_login import (
    LoginManager,
    login_user,
    logout_user,
    login_required,
    current_user
)
from user import User
from store import get_recipe_from_db, store_recipe_in_db
from db import get_connection

def create_app(test_config=None):
    app = Flask(__name__, static_folder='web/dist', static_url_path='/')

    # Use a secure secret key (use an environment variable in production)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'my-very-random-secret-key')

    if test_config:
        app.config.update(test_config)

    # Allow credentials across domains for session cookies
    CORS(app, supports_credentials=True)

    # Set up Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = '/login'

    @login_manager.user_loader
    def load_user(user_id):
        return User.get_by_id(user_id)

    # ------------------------------
    # Auth Routes
    # ------------------------------
    @app.route('/register', methods=['POST'])
    def register():
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        if not username or not password:
            return jsonify({"error": "Missing username or password"}), 400

        existing_user = User.get_by_username(username)
        if existing_user:
            return jsonify({"error": "Username already taken"}), 400

        new_id = User.create_user(username, password)
        return jsonify({"message": "User created successfully", "user_id": new_id}), 201

    @app.route('/login', methods=['POST'])
    def login():
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        if not username or not password:
            return jsonify({"error": "Missing username or password"}), 400

        user = User.get_by_username(username)
        if not user or not user.check_password(password):
            return jsonify({"error": "Invalid credentials"}), 401

        # This logs the user in and sets session cookie
        login_user(user)
        return jsonify({"message": "Login successful", "user_id": user.id}), 200

    @app.route('/logout', methods=['POST'])
    @login_required
    def logout():
        logout_user()
        return jsonify({"message": "Logged out"}), 200

    # ------------------------------
    # Favorites
    # ------------------------------
    @app.route('/favorites', methods=['GET', 'POST'])
    @login_required
    def favorites():
        if request.method == 'GET':
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("SELECT recipe_url FROM favorites WHERE user_id = %s", (current_user.id,))
            rows = cur.fetchall()
            cur.close()
            conn.close()
            favorite_urls = [row[0] for row in rows]
            return jsonify({"favorites": favorite_urls}), 200
        else:
            data = request.get_json()
            recipe_url = data.get('recipe_url')
            if not recipe_url:
                return jsonify({"error": "Missing recipe_url"}), 400
            try:
                conn = get_connection()
                cur = conn.cursor()
                cur.execute('''
                    INSERT INTO favorites (user_id, recipe_url)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id, recipe_url) DO NOTHING;
                ''', (current_user.id, recipe_url))
                conn.commit()
                cur.close()
                conn.close()
                return jsonify({"message": "Recipe favorited"}), 201
            except Exception as ex:
                print("Error favoriting recipe:", ex)
                return jsonify({"error": str(ex)}), 500

    # ------------------------------
    # Extract / Recipe
    # ------------------------------
    @app.route('/extract', methods=['POST'])
    def extract():
        data = request.get_json()
        url = data.get('url')
        location = data.get('zipcode')
        if not url:
            return jsonify({"error": "No URL provided"}), 400
        if not location:
            return jsonify({"error": "No location provided"}), 400

        # If caching:
        # transcript, cached_recipe = get_recipe_from_db(url)
        # if cached_recipe:
        #    return jsonify(cached_recipe), 200

        try:
            result = subprocess.run(
                ['python3', 'app.py', url, location],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                return jsonify({"error": f"Failed. code: {result.returncode}, stderr: {result.stderr}"}), 500

            recipe_data = json.loads(result.stdout)

            # If storing in DB:
            # store_recipe_in_db(url, transcript, recipe_data)

            return jsonify(recipe_data), 200
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON from app.py"}), 500
        except Exception as ex:
            return jsonify({"error": str(ex)}), 500

    @app.route('/health', methods=['GET'])
    def health_check():
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=True)
