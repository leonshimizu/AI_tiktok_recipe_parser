# user.py

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash
from db import get_connection

class User(UserMixin):
    """
    Basic user model for Flask-Login usage.
    """

    def __init__(self, id, username, password_hash):
        self.id = id
        self.username = username
        self.password_hash = password_hash

    @classmethod
    def get_by_id(cls, user_id):
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, username, password_hash FROM users WHERE id = %s;", (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return cls(row[0], row[1], row[2])
        return None

    @classmethod
    def get_by_username(cls, username):
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, username, password_hash FROM users WHERE username = %s;", (username,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return cls(row[0], row[1], row[2])
        return None

    @staticmethod
    def create_user(username, password):
        pw_hash = generate_password_hash(password)
        conn = get_connection()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO users (username, password_hash)
            VALUES (%s, %s)
            RETURNING id;
        ''', (username, pw_hash))
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return new_id

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
