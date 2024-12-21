// Favorites.tsx
import React, { useState } from 'react';

function Favorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadFavorites() {
    setLoading(true);
    try {
      const response = await fetch('/favorites', {
        method: 'GET',
        credentials: 'include', // Must send session cookie
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load favorites');
      }
      setFavorites(data.favorites || []);
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">Favorites</h2>
      <button
        onClick={loadFavorites}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
      >
        {loading ? 'Loading...' : 'Load Favorites'}
      </button>

      {favorites.length > 0 && (
        <ul className="mt-4 list-disc list-inside">
          {favorites.map((favUrl, idx) => (
            <li key={idx}>{favUrl}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Favorites;
