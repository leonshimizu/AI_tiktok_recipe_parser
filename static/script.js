// static/script.js
const form = document.getElementById('extractForm');
const urlInput = document.getElementById('urlInput');
const submitBtn = document.getElementById('submitBtn');
const messageEl = document.getElementById('message');

// New elements
const outputContainer = document.getElementById('outputContainer');
const recipeImage = document.getElementById('recipeImage');
const recipeTitle = document.getElementById('recipeTitle');
const ingredientList = document.getElementById('ingredientList');
const instructionList = document.getElementById('instructionList');
const notesText = document.getElementById('notesText');
const jsonOutput = document.getElementById('jsonOutput');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;

  messageEl.classList.add('hidden');
  outputContainer.classList.add('hidden');
  jsonOutput.classList.add('hidden');
  jsonOutput.textContent = '';

  submitBtn.disabled = true;
  submitBtn.textContent = 'Extracting...';

  try {
    const response = await fetch('/extract', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url})
    });

    const data = await response.json();
    if (!response.ok) {
      messageEl.classList.remove('hidden');
      messageEl.textContent = data.error || 'Failed to extract recipe.';
      messageEl.className = 'p-4 rounded border text-sm bg-red-50 text-red-700 border-red-500 mb-4';
    } else {
      // Populate UI
      recipeTitle.textContent = data.title || 'No Title Found';
      
      // Ingredients
      ingredientList.innerHTML = '';
      if (Array.isArray(data.ingredients)) {
        data.ingredients.forEach(ing => {
          const li = document.createElement('li');
          li.textContent = ing;
          ingredientList.appendChild(li);
        });
      }

      // Instructions
      instructionList.innerHTML = '';
      if (Array.isArray(data.instructions)) {
        data.instructions.forEach(step => {
          const li = document.createElement('li');
          li.textContent = step;
          instructionList.appendChild(li);
        });
      }

      // Notes
      notesText.textContent = data.notes || '';

      // Image
      if (data.image_url) {
        recipeImage.src = data.image_url;
        recipeImage.classList.remove('hidden');
      } else {
        recipeImage.src = '';
        recipeImage.classList.add('hidden');
      }

      outputContainer.classList.remove('hidden');

      // For debugging or advanced users who may want to see the raw JSON
      jsonOutput.textContent = JSON.stringify(data, null, 2);
      jsonOutput.classList.remove('hidden');
    }
  } catch (err) {
    messageEl.classList.remove('hidden');
    messageEl.textContent = err.message || 'Network error.';
    messageEl.className = 'p-4 rounded border text-sm bg-red-50 text-red-700 border-red-500 mb-4';
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Extract Recipe';
});
