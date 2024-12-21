// AddFavorite.tsx
import React from 'react';

interface Props {
  recipeUrl: string;
}

function AddFavorite({ recipeUrl }: Props) {
  async function handleAddFavorite() {
    if (!recipeUrl) {
      alert('No recipe URL found');
      return;
    }
    try {
      const response = await fetch('/favorites', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_url: recipeUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to favorite the recipe');
      }
      alert('Recipe favorited!');
    } catch (error) {
      console.error('Error favoriting recipe:', error);
    }
  }

  return (
    <button
      onClick={handleAddFavorite}
      className="bg-green-500 text-white px-4 py-2 rounded-md"
    >
      Favorite This Recipe
    </button>
  );
}

export default AddFavorite;
