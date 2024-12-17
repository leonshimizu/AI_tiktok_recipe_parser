import React, { useState } from 'react';
import { ChefHat, Loader2, Link2, UtensilsCrossed, ScrollText } from 'lucide-react';

interface Recipe {
  ingredients: string[];
  instructions: string[];
  image_url?: string;
  notes?: string;
  title?: string;
}

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRecipe(null);

    try {
      const response = await fetch('/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract recipe');
      }

      const data = await response.json();
      setRecipe(data);
    } catch (err) {
      setError('Failed to extract recipe. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <ChefHat className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            TikTok Recipe Extractor
          </h1>
          <p className="text-lg text-gray-600">
            Transform your favorite TikTok cooking videos into detailed recipes
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-12">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste TikTok URL here..."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Link2 className="w-5 h-5" />
                  Extract Recipe
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Recipe Result */}
        {recipe && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {recipe.image_url && (
              <img
                src={recipe.image_url}
                alt="Recipe"
                className="w-full h-64 object-cover"
              />
            )}
            <div className="p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Ingredients */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <UtensilsCrossed className="w-6 h-6 text-purple-600" />
                    <h2 className="text-xl font-semibold text-gray-900">
                      Ingredients
                    </h2>
                  </div>
                  <ul className="space-y-2">
                    {recipe.ingredients && recipe.ingredients.map((ingredient, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-gray-700"
                      >
                        <span className="text-purple-600 font-medium">•</span>
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ScrollText className="w-6 h-6 text-purple-600" />
                    <h2 className="text-xl font-semibold text-gray-900">
                      Instructions
                    </h2>
                  </div>
                  <ol className="space-y-3">
                    {recipe.instructions && recipe.instructions.map((instruction, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-gray-700"
                      >
                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
                          {index + 1}
                        </span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              {recipe.notes && (
                <div className="mt-6">
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Notes</h3>
                  <p className="text-gray-700">{recipe.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
