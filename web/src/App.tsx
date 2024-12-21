import React, { useState } from 'react';
import {
  ChefHat,
  Loader2,
  Link2,
  UtensilsCrossed,
  ScrollText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Ingredient {
  name: string;
  amount: string;
  cost: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
}

interface TotalMacros {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
}

// NEW: Additional fields for equipment, times, and dietary subs
interface DietarySubstitutions {
  [restriction: string]: string;
}

interface Recipe {
  title?: string;
  servings?: number;
  ingredients?: Ingredient[];
  instructions?: string[];
  image_url?: string;
  notes?: string;
  total_cost_estimate?: string;
  total_macros?: TotalMacros;

  // Additional fields
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  equipment?: string[];
  dietary_substitutions?: DietarySubstitutions;
}

function App() {
  const [url, setUrl] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState('');
  const [showMacros, setShowMacros] = useState(false);

  // Collapsible toggles for new sections
  const [showEquipment, setShowEquipment] = useState(false);
  const [showSubstitutions, setShowSubstitutions] = useState(false);

  // Track if the image failed to load
  const [imageError, setImageError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRecipe(null);

    try {
      const response = await fetch('/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, zipcode: location }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract recipe');
      }

      const data: Recipe = await response.json();
      setRecipe(data);
      setImageError(false);
    } catch (err) {
      setError('Failed to extract recipe. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMacros = () => setShowMacros(!showMacros);
  const toggleEquipment = () => setShowEquipment(!showEquipment);
  const toggleSubstitutions = () => setShowSubstitutions(!showSubstitutions);

  // Renders macros
  const renderMacros = () => {
    if (!recipe?.total_macros) return null;
    const { protein_g, carbs_g, fat_g, calories } = recipe.total_macros;
    const servings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;

    const perServingProtein = (protein_g / servings).toFixed(1);
    const perServingCarbs = (carbs_g / servings).toFixed(1);
    const perServingFat = (fat_g / servings).toFixed(1);
    const perServingCalories = (calories / servings).toFixed(0);

    return (
      <div className="mt-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center justify-between">
          Macros
          <button
            onClick={toggleMacros}
            className="text-sm text-purple-600 hover:underline flex items-center gap-1"
          >
            {showMacros ? 'Hide' : 'Show'}
            {showMacros ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </h3>
        {showMacros && (
          <div className="text-gray-700 space-y-4">
            <div>
              <h4 className="font-semibold">Total Macros (Entire Dish):</h4>
              <p>Protein: {protein_g} g</p>
              <p>Carbs: {carbs_g} g</p>
              <p>Fat: {fat_g} g</p>
              <p>Calories: {calories}</p>
            </div>

            {servings > 1 && (
              <div>
                <h4 className="font-semibold">Per Serving (Serves {servings}):</h4>
                <p>Protein: {perServingProtein} g</p>
                <p>Carbs: {perServingCarbs} g</p>
                <p>Fat: {perServingFat} g</p>
                <p>Calories: {perServingCalories}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Renders equipment & times
  const renderEquipmentAndTimes = () => {
    if (!recipe) return null;
    const { prep_time_minutes, cook_time_minutes, equipment } = recipe;
    if (!prep_time_minutes && !cook_time_minutes && !equipment) return null;

    return (
      <div className="mt-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center justify-between">
          Equipment & Times
          <button
            onClick={toggleEquipment}
            className="text-sm text-purple-600 hover:underline flex items-center gap-1"
          >
            {showEquipment ? 'Hide' : 'Show'}
            {showEquipment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </h3>
        {showEquipment && (
          <div className="text-gray-700 space-y-4">
            {prep_time_minutes && <p>Prep time: {prep_time_minutes} minutes</p>}
            {cook_time_minutes && <p>Cook time: {cook_time_minutes} minutes</p>}
            {equipment && equipment.length > 0 && (
              <div>
                <p className="font-semibold">Equipment needed:</p>
                <ul className="list-disc list-inside pl-5 space-y-1">
                  {equipment.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Renders dietary substitutions
  const renderDietarySubstitutions = () => {
    if (!recipe?.dietary_substitutions) return null;
    const subs = recipe.dietary_substitutions;
    const restrictionKeys = Object.keys(subs);
    if (restrictionKeys.length === 0) return null;

    return (
      <div className="mt-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center justify-between">
          Dietary Substitutions
          <button
            onClick={toggleSubstitutions}
            className="text-sm text-purple-600 hover:underline flex items-center gap-1"
          >
            {showSubstitutions ? 'Hide' : 'Show'}
            {showSubstitutions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </h3>
        {showSubstitutions && (
          <div className="text-gray-700 space-y-4">
            {restrictionKeys.map((key) => (
              <div key={key}>
                <p className="font-semibold capitalize">{key.replace('_', ' ')}:</p>
                <p>{subs[key]}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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
            Recipe Extractor
          </h1>
          <p className="text-lg text-gray-600">
            Transform your favorite short cooking videos into detailed recipes with cost, macros,
            equipment lists, times, and dietary substitutions!
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-12 space-y-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video URL here..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            required
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter your location (city, country)..."
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

        {/* Recipe Output */}
        {recipe && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Only render <img> if we have a URL and haven't encountered an error */}
            {recipe.image_url && !imageError && (
              <img
                src={recipe.image_url}
                alt="Recipe"
                className="w-full h-64 object-cover"
                onError={() => setImageError(true)}
              />
            )}
            <div className="p-6 md:p-8 space-y-6">
              {/* Title */}
              {recipe.title && (
                <h2 className="text-2xl font-bold text-gray-900">{recipe.title}</h2>
              )}

              {/* Servings */}
              {recipe.servings && recipe.servings > 0 && (
                <div className="text-gray-700">
                  <p>
                    <strong>Servings:</strong> {recipe.servings}
                  </p>
                </div>
              )}

              {/* Equipment & Times */}
              {renderEquipmentAndTimes()}

              {/* Ingredients */}
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <UtensilsCrossed className="w-6 h-6 text-purple-600" />
                    <h3 className="text-xl font-semibold text-gray-900">
                      Ingredients &amp; Costs
                    </h3>
                  </div>
                  <ul className="space-y-4">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex flex-col text-gray-700">
                        <div className="flex gap-2 items-center">
                          <span className="text-purple-600 font-medium">•</span>
                          <span className="font-semibold">
                            {ingredient.name} ({ingredient.amount})
                          </span>
                          <span className="text-sm text-gray-500">
                            {ingredient.cost}
                          </span>
                        </div>
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

              {/* Notes */}
              {recipe.notes && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700">{recipe.notes}</p>
                </div>
              )}

              {/* Total Cost */}
              {recipe.total_cost_estimate && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Total Cost Estimate
                  </h3>
                  <p className="text-gray-700">{recipe.total_cost_estimate}</p>
                </div>
              )}

              {/* Macros */}
              {renderMacros()}

              {/* Dietary Substitutions */}
              {renderDietarySubstitutions()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
