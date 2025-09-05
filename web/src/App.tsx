import React, { useState, useRef } from 'react';
import {
  ChefHat,
  Loader2,
  UtensilsCrossed,
  ScrollText,
  ChevronDown,
  ChevronUp,
  Zap,
  Activity
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

interface ProgressUpdate {
  type: 'progress' | 'result' | 'error';
  message?: string;
  recipe?: Recipe;
  data?: any;
}

interface StreamingStep {
  id: string;
  label: string;
  description: string;
  icon: string;
  completed: boolean;
  active: boolean;
  duration?: number;
}

function App() {
  const [url, setUrl] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState('');
  const [showMacros, setShowMacros] = useState(false);

  // Streaming functionality
  const [streamingMode, setStreamingMode] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingSteps, setStreamingSteps] = useState<StreamingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const streamRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Collapsible toggles for new sections
  const [showEquipment, setShowEquipment] = useState(false);
  const [showSubstitutions, setShowSubstitutions] = useState(false);

  // Track if the image failed to load
  const [imageError, setImageError] = useState(false);

  // Initialize streaming steps
  const initializeStreamingSteps = () => {
    const steps: StreamingStep[] = [
      {
        id: 'start',
        label: 'Starting',
        description: 'Initializing recipe extraction',
        icon: '🚀',
        completed: false,
        active: false
      },
      {
        id: 'metadata',
        label: 'Video Analysis',
        description: 'Extracting video metadata and content',
        icon: '🔄',
        completed: false,
        active: false
      },
      {
        id: 'ai_connection',
        label: 'AI Setup',
        description: 'Connecting to AI processing engine',
        icon: '🔥',
        completed: false,
        active: false
      },
      {
        id: 'ai_processing',
        label: 'Recipe Processing',
        description: 'Analyzing ingredients and instructions',
        icon: '🤖',
        completed: false,
        active: false
      },
      {
        id: 'nutrition',
        label: 'Nutrition Analysis',
        description: 'Calculating costs and macros',
        icon: '🍽️',
        completed: false,
        active: false
      },
      {
        id: 'complete',
        label: 'Complete',
        description: 'Recipe extraction finished',
        icon: '✅',
        completed: false,
        active: false
      }
    ];
    setStreamingSteps(steps);
    setCurrentStep(0);
  };

  // Map progress messages to steps
  const updateStepFromMessage = (message: string) => {
    const stepMappings = [
      { keywords: ['Starting', 'starting'], stepId: 'start' },
      { keywords: ['metadata', 'video', 'Extracting'], stepId: 'metadata' },
      { keywords: ['Warming', 'connection', 'AI connection'], stepId: 'ai_connection' },
      { keywords: ['Processing with AI', 'Analyzing ingredients'], stepId: 'ai_processing' },
      { keywords: ['nutrition', 'costs', 'Calculating'], stepId: 'nutrition' },
      { keywords: ['complete', 'Complete', 'finished'], stepId: 'complete' }
    ];

    const matchedMapping = stepMappings.find(mapping => 
      mapping.keywords.some(keyword => message.includes(keyword))
    );

    if (matchedMapping) {
      setStreamingSteps(prev => prev.map((step, index) => {
        if (step.id === matchedMapping.stepId) {
          setCurrentStep(index);
          return { ...step, active: true, completed: false };
        } else if (prev.findIndex(s => s.id === matchedMapping.stepId) > prev.findIndex(s => s.id === step.id)) {
          return { ...step, active: false, completed: true };
        }
        return { ...step, active: false };
      }));
    }
  };

  // Calculate estimated time remaining
  const updateTimeEstimate = () => {
    if (!startTime || currentStep === 0) return;
    
    const elapsed = (Date.now() - startTime) / 1000;
    const totalSteps = streamingSteps.length;
    const avgTimePerStep = elapsed / (currentStep + 1);
    const remaining = (totalSteps - currentStep - 1) * avgTimePerStep;
    
    setEstimatedTimeRemaining(Math.max(0, Math.round(remaining)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRecipe(null);
    setProgress([]);
    setImageError(false);

    if (streamingMode) {
      await handleStreamingSubmit();
    } else {
      await handleRegularSubmit();
    }
  };

  const handleRegularSubmit = async () => {
    setLoadingStep('Fetching video metadata...');

    try {
      // Add a small delay to show the loading step
      setTimeout(() => setLoadingStep('Processing with AI...'), 1000);
      
      const response = await fetch('/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, zipcode: location }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract recipe');
      }

      setLoadingStep('Finalizing recipe...');
      const data: Recipe = await response.json();
      setRecipe(data);
    } catch (err) {
      setError('Failed to extract recipe. Please check the URL and try again.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleStreamingSubmit = async () => {
    setIsStreaming(true);
    setProgress([]);
    setStartTime(Date.now());
    initializeStreamingSteps();

    try {
      const response = await fetch('/extract-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ url, zipcode: location }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      streamRef.current = reader;
      const decoder = new TextDecoder();

      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              setIsStreaming(false);
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            lines.forEach(line => {
              if (line.startsWith('data: ')) {
                try {
                  const data: ProgressUpdate = JSON.parse(line.slice(6));
                  
                  if (data.type === 'progress') {
                    const message = data.message || '';
                    setProgress(prev => [...prev, message]);
                    updateStepFromMessage(message);
                    updateTimeEstimate();
                  } else if (data.type === 'result') {
                    setRecipe(data.recipe || null);
                    setEstimatedTimeRemaining(0);
                    celebrateCompletion();
                  } else if (data.type === 'error') {
                    setError(data.message || 'Unknown error occurred');
                    setIsStreaming(false);
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e);
                }
              }
            });
          }
        } catch (error) {
          console.error('Stream reading error:', error);
          setError('Streaming failed. Please try again.');
          setIsStreaming(false);
        }
      };

      readStream();
    } catch (err) {
      setError('Failed to start streaming. Please try again.');
      setIsStreaming(false);
    } finally {
      setLoading(false);
    }
  };

  const stopStreaming = () => {
    if (streamRef.current) {
      streamRef.current.cancel();
      streamRef.current = null;
    }
    setIsStreaming(false);
    setLoading(false);
    setEstimatedTimeRemaining(null);
    
    // Reset streaming steps
    setStreamingSteps(prev => prev.map(step => ({ 
      ...step, 
      active: false, 
      completed: false 
    })));
    setCurrentStep(0);
  };

  // Add completion celebration effect
  const celebrateCompletion = () => {
    // Mark final step as completed with animation
    setStreamingSteps(prev => prev.map((step, index) => ({
      ...step,
      completed: true,
      active: index === prev.length - 1
    })));
    
    // Brief delay then show results
    setTimeout(() => {
      setIsStreaming(false);
      setLoading(false);
    }, 1000);
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
            disabled={loading || isStreaming}
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter your location (city, country)..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            required
            disabled={loading || isStreaming}
          />

          {/* Streaming Mode Toggle */}
          <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-gray-700">Fast Mode</span>
              <span className="text-sm text-gray-500">(~6s)</span>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={streamingMode}
                onChange={(e) => setStreamingMode(e.target.checked)}
                className="sr-only peer"
                disabled={loading || isStreaming}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
            
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              <span className="font-medium text-gray-700">Streaming Mode</span>
              <span className="text-sm text-gray-500">(~7s, live progress)</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || isStreaming}
              className="flex-1 bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 min-w-48"
            >
              {loading || isStreaming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">
                    {streamingMode ? 'Streaming...' : loadingStep}
                  </span>
                </>
              ) : (
                <>
                  {streamingMode ? (
                    <Activity className="w-5 h-5" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                  {streamingMode ? 'Stream Recipe' : 'Extract Recipe'}
                </>
              )}
            </button>
            
            {isStreaming && (
              <button
                type="button"
                onClick={stopStreaming}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Stop
              </button>
            )}
          </div>
        </form>

        {/* Enhanced Progress Display for Streaming Mode */}
        {streamingMode && (isStreaming || streamingSteps.length > 0) && (
          <div className="mb-8 bg-white rounded-2xl shadow-xl p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Recipe Processing
              </h3>
              {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                <div className="text-sm text-gray-600 bg-purple-50 px-3 py-1 rounded-full">
                  ~{estimatedTimeRemaining}s remaining
                </div>
              )}
            </div>

            {/* Visual Progress Steps */}
            <div className="space-y-4">
              {streamingSteps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4">
                  {/* Step Icon */}
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full text-lg
                    ${step.completed 
                      ? 'bg-green-100 text-green-600' 
                      : step.active 
                        ? 'bg-purple-100 text-purple-600 animate-pulse' 
                        : 'bg-gray-100 text-gray-400'
                    }
                  `}>
                    {step.completed ? '✅' : step.active ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>{step.icon}</span>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    <div className={`
                      font-semibold
                      ${step.completed 
                        ? 'text-green-700' 
                        : step.active 
                          ? 'text-purple-700' 
                          : 'text-gray-500'
                      }
                    `}>
                      {step.label}
                    </div>
                    <div className={`
                      text-sm
                      ${step.completed 
                        ? 'text-green-600' 
                        : step.active 
                          ? 'text-purple-600' 
                          : 'text-gray-400'
                      }
                    `}>
                      {step.description}
                    </div>
                  </div>

                  {/* Progress Line */}
                  {index < streamingSteps.length - 1 && (
                    <div className="absolute left-5 mt-10 w-0.5 h-6 bg-gray-200">
                      <div className={`
                        w-full transition-all duration-500
                        ${step.completed ? 'h-full bg-green-400' : 'h-0 bg-purple-400'}
                      `} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Overall Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(((currentStep + 1) / streamingSteps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep + 1) / streamingSteps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Collapsible Raw Progress Log */}
            {progress.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  View detailed logs ({progress.length} events)
                </summary>
                <div className="mt-2 bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs max-h-40 overflow-y-auto">
                  {progress.map((message, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-gray-500">
                        [{new Date().toLocaleTimeString()}]
                      </span>
                      <span>{message}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Recipe Output */}
        {recipe && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            {/* Recipe Image with improved styling */}
            {recipe.image_url && !imageError && (
              <div className="relative w-full h-80 bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
                <img
                  src={recipe.image_url}
                  alt="Recipe"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  onError={() => setImageError(true)}
                />
              </div>
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
