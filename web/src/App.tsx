import React, { useState } from 'react';
import { ChefHat, Loader2, Link2, UtensilsCrossed, ScrollText } from 'lucide-react';

interface Ingredient {
  name: string;
  amount: string;
  cost: string;
}

interface Recipe {
  title?: string;
  ingredients?: Ingredient[];
  instructions?: string[];
  image_url?: string;
  notes?: string;
  total_cost_estimate?: string;
}

function App() {
  const [url, setUrl] = useState('');
  const [zipcode, setZipcode] = useState(''); // new field for ZIP code
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
        body: JSON.stringify({ url, zipcode }), // send ZIP code as well
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
            Transform your favorite TikTok cooking videos into detailed recipes and get cost estimates for your area!
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-12 space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste TikTok URL here..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            required
          />
          <input
            type="text"
            value={zipcode}
            onChange={(e) => setZipcode(e.target.value)}
            placeholder="Enter your ZIP code for cost estimates..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
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
            <div className="p-6 md:p-8 space-y-6">
              {recipe.title && (
                <h2 className="text-2xl font-bold text-gray-900">{recipe.title}</h2>
              )}

              {/* Ingredients with costs */}
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <UtensilsCrossed className="w-6 h-6 text-purple-600" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      Ingredients & Costs
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex flex-col md:flex-row md:items-center md:justify-between text-gray-700">
                        <div className="flex gap-2 items-center">
                          <span className="text-purple-600 font-medium">•</span>
                          <span>{ingredient.name} ({ingredient.amount})</span>
                        </div>
                        <span className="text-sm text-gray-500">{ingredient.cost}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructions */}
              {recipe.instructions && recipe.instructions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ScrollText className="w-6 h-6 text-purple-600" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      Instructions
                    </h3>
                  </div>
                  <ol className="space-y-3 list-decimal list-inside text-gray-700">
                    {recipe.instructions.map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                </div>
              )}

              {recipe.notes && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700">{recipe.notes}</p>
                </div>
              )}

              {recipe.total_cost_estimate && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Total Cost Estimate</h3>
                  <p className="text-gray-700">{recipe.total_cost_estimate}</p>
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
