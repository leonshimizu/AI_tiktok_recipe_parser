// static/script.js
const form = document.getElementById('extractForm');
const urlInput = document.getElementById('urlInput');
const submitBtn = document.getElementById('submitBtn');
const messageEl = document.getElementById('message');
const outputEl = document.getElementById('output');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;

  messageEl.classList.add('hidden');
  outputEl.classList.add('hidden');
  outputEl.textContent = '';

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
      messageEl.className = 'p-4 rounded border text-sm bg-red-50 text-red-700 border-red-500';
    } else {
      outputEl.classList.remove('hidden');
      outputEl.textContent = JSON.stringify(data, null, 2);
    }
  } catch (err) {
    messageEl.classList.remove('hidden');
    messageEl.textContent = err.message || 'Network error.';
    messageEl.className = 'p-4 rounded border text-sm bg-red-50 text-red-700 border-red-500';
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Extract Recipe';
});
