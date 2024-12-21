# db.py
import psycopg2
import os

# Example DSN for your local DB:
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://myuser:mypassword@localhost:5432/my_recipe_db")

def get_connection():
    """Get a new connection to the local PostgreSQL DB."""
    return psycopg2.connect(DATABASE_URL)
