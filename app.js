const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginSection = document.getElementById('loginSection');
const userPanel = document.getElementById('userPanel');
const userNameLabel = document.getElementById('userName');
const logoutButton = document.getElementById('logoutButton');
const settingsPanel = document.getElementById('settingsPanel');
const preferencesForm = document.getElementById('preferencesForm');
const defaultRegionSelect = document.getElementById('defaultRegion');
const defaultSeveritySelect = document.getElementById('defaultSeverity');
const defaultNotesInput = document.getElementById('defaultNotes');
const categoryPrefInputs = Array.from(document.querySelectorAll('.pref-category'));
const quotePanel = document.getElementById('quotePanel');
const form = document.getElementById('quoteForm');
const preview = document.getElementById('preview');
const result = document.getElementById('result');
const historySection = document.getElementById('history');
const photoInput = document.getElementById('photo');
const resetButton = document.getElementById('resetButton');
const clearHistoryButton = document.getElementById('clearHistoryButton');
const notesInput = document.getElementById('notes');
const damageItems = Array.from(document.querySelectorAll('.damage-item'));
let currentQuote = null;
let currentUser = null;
let userPrefs = {};

const damageLabels = {
  bumperRepair: 'Bumper repair',
  panelRepair: 'Panel repair',
  paint: 'Paint and refinishing',
  replacement: 'Part replacement',
  dentRepair: 'Dent repair',
  windscreen: 'Windscreen repair/replacement',
  alloyWheel: 'Alloy wheel repair'
};

const severityLabels = {
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major'
};

function togglePreview() {
  const file = photoInput.files[0];
  if (!file) {
    preview.classList.add('hidden');
    preview.src = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
    preview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function setAuthenticatedState(user, prefs) {
  currentUser = user;
  userPrefs = prefs || {};
  loginSection.classList.add('hidden');
  userPanel.classList.remove('hidden');
  settingsPanel.classList.remove('hidden');
  quotePanel.classList.remove('hidden');
  userNameLabel.textContent = user.displayName || user.username;

  if (prefs.defaultRegion) {
    defaultRegionSelect.value = prefs.defaultRegion;
    document.getElementById('region').value = prefs.defaultRegion;
  }

  if (prefs.defaultNotes) {
    defaultNotesInput.value = prefs.defaultNotes;
    notesInput.placeholder = prefs.defaultNotes;
  }

  if (prefs.defaultSeverity) {
    defaultSeveritySelect.value = prefs.defaultSeverity;
    damageItems.forEach((item) => {
      const select = item.querySelector('select');
      if (select) select.value = prefs.defaultSeverity;
    });
  }

  if (Array.isArray(prefs.preferredCategories)) {
    categoryPrefInputs.forEach((input) => {
      input.checked = prefs.preferredCategories.includes(input.value);
    });
    damageItems.forEach((item) => {
      const checkbox = item.querySelector('input[name="damage"]');
      if (prefs.preferredCategories.includes(checkbox.value)) {
        checkbox.checked = true;
        updateDamageMeta(item, true);
      }
    });
  }
}

async function attemptSessionRestore() {
  const response = await fetch('/me');
  if (!response.ok) return false;

  const payload = await response.json();
  setAuthenticatedState(payload.user, payload.prefs);
  return true;
}

function updateDamageMeta(item, checked) {
  const meta = item.querySelector('.damage-meta');
  if (meta) {
    meta.classList.toggle('hidden', !checked);
  }
}

async function signIn(event) {
  event.preventDefault();
  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: usernameInput.value.trim(), password: passwordInput.value.trim() })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    alert(errorData?.error || 'Login failed.');
    return;
  }

  const payload = await response.json();
  setAuthenticatedState(payload.user, payload.prefs);
}

async function savePreferences(event) {
  event.preventDefault();
  const prefs = {
    defaultRegion: defaultRegionSelect.value,
    defaultNotes: defaultNotesInput.value.trim(),
    defaultSeverity: defaultSeveritySelect.value,
    preferredCategories: categoryPrefInputs.filter((input) => input.checked).map((input) => input.value)
  };

  const response = await fetch('/prefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    alert(errorData?.error || 'Could not save preferences.');
    return;
  }

  const payload = await response.json();
  userPrefs = payload.prefs;
  notesInput.placeholder = userPrefs.defaultNotes || notesInput.placeholder;
  alert('Preferences saved.');
}

function buildSelection() {
  return damageItems
    .filter((item) => item.querySelector('input[name="damage"]').checked)
    .map((item) => {
      const key = item.dataset.key;
      const select = item.querySelector(`select[name="severity-${key}"]`);
      return {
        key,
        label: damageLabels[key],
        severity: select ? select.value : 'moderate',
        notes: notesInput.value.trim()
      };
    });
}

function renderQuote(quote) {
  const itemsHtml = quote.quoteItems
    .map((item) => `
      <div class="quote-item">
        <div>
          <strong>${item.description}</strong>
          <div class="note">Severity: ${severityLabels[item.severity] || item.severity}</div>
        </div>
        <div>R ${item.cost.toLocaleString()}</div>
      </div>
    `)
    .join('');

  result.innerHTML = `
    <h2>Quote summary</h2>
    <p class="note small">Generated ${new Date().toLocaleString()}</p>
    <p><strong>Client:</strong> ${quote.client}</p>
    <p><strong>Vehicle:</strong> ${quote.vehicle}</p>
    <p><strong>Region:</strong> ${quote.region}</p>
    ${itemsHtml}
    <div class="quote-item"><strong>Subtotal</strong><span>R ${quote.subtotal.toLocaleString()}</span></div>
    <div class="quote-item"><strong>Labor (${quote.laborHours} hrs)</strong><span>R ${quote.laborCost.toLocaleString()}</span></div>
    <div class="quote-item"><strong>Total</strong><span>R ${quote.total.toLocaleString()}</span></div>
    <div class="form-actions" style="margin-top: 1rem;">
      <button type="button" id="copyQuoteButton" class="secondary">Copy quote</button>
      <button type="button" id="downloadQuoteButton" class="secondary">Download quote</button>
    </div>
    <p class="note">${quote.pricingNote}</p>
  `;
  result.classList.remove('hidden');
}

function renderHistory(saved) {
  if (!saved.length) {
    historySection.classList.add('hidden');
    historySection.innerHTML = '';
    return;
  }

  const historyHtml = saved
    .slice(0, 4)
    .map((quote) => `
      <div class="history-card">
        <div class="history-head">
          <strong>${quote.vehicle}</strong>
          <span>${new Date(quote.createdAt).toLocaleString()}</span>
        </div>
        <div>R ${quote.total.toLocaleString()}</div>
      </div>
    `)
    .join('');

  historySection.innerHTML = `
    <h2>Recent quotes</h2>
    ${historyHtml}
  `;
  historySection.classList.remove('hidden');
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('quoteHistory') || '[]');
  } catch (err) {
    return [];
  }
}

function saveHistory(quote) {
  const stored = loadHistory();
  const next = [{ ...quote, createdAt: new Date().toISOString() }, ...stored].slice(0, 6);
  localStorage.setItem('quoteHistory', JSON.stringify(next));
  renderHistory(next);
}

function copyQuote() {
  if (!currentQuote) return;
  const lines = [
    `Client: ${currentQuote.client}`,
    `Vehicle: ${currentQuote.vehicle}`,
    `Region: ${currentQuote.region}`,
    '---',
    ...currentQuote.quoteItems.map((item) => `${item.description} (${item.severity}) - R ${item.cost.toLocaleString()}`),
    '---',
    `Subtotal: R ${currentQuote.subtotal.toLocaleString()}`,
    `Labor: R ${currentQuote.laborCost.toLocaleString()}`,
    `Total: R ${currentQuote.total.toLocaleString()}`
  ];
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    result.innerHTML += '<p class="note">Quote copied to clipboard.</p>';
  });
}

function downloadQuote() {
  if (!currentQuote) return;
  const text = [
    'Autobody Quote',
    `Client: ${currentQuote.client}`,
    `Vehicle: ${currentQuote.vehicle}`,
    `Region: ${currentQuote.region}`,
    '',
    ...currentQuote.quoteItems.map((item) => `${item.description} (${item.severity}) - R ${item.cost.toLocaleString()}`),
    '',
    `Subtotal: R ${currentQuote.subtotal.toLocaleString()}`,
    `Labor: R ${currentQuote.laborCost.toLocaleString()}`,
    `Total: R ${currentQuote.total.toLocaleString()}`
  ].join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentQuote.vehicle.replace(/\s+/g, '_')}_quote.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

photoInput.addEventListener('change', togglePreview);

damageItems.forEach((item) => {
  const checkbox = item.querySelector('input[name="damage"]');
  checkbox.addEventListener('change', () => updateDamageMeta(item, checkbox.checked));
  updateDamageMeta(item, checkbox.checked);
});

resetButton.addEventListener('click', () => {
  currentQuote = null;
  form.reset();
  preview.classList.add('hidden');
  preview.src = '';
  damageItems.forEach((item) => updateDamageMeta(item, false));
  result.classList.add('hidden');
  result.innerHTML = '';
});

clearHistoryButton.addEventListener('click', () => {
  localStorage.removeItem('quoteHistory');
  renderHistory([]);
});

result.addEventListener('click', (event) => {
  if (event.target.id === 'copyQuoteButton') {
    copyQuote();
  }
  if (event.target.id === 'downloadQuoteButton') {
    downloadQuote();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const selection = buildSelection();

  if (!selection.length) {
    result.classList.remove('hidden');
    result.innerHTML = '<p class="note">Please select at least one damage type before generating a quote.</p>';
    return;
  }

  const formData = new FormData();
  const payload = {
    client: document.getElementById('client').value.trim(),
    vehicle: document.getElementById('vehicle').value.trim(),
    region: document.getElementById('region').value,
    selection
  };

  formData.append('data', JSON.stringify(payload));
  if (photoInput.files[0]) {
    formData.append('photo', photoInput.files[0]);
  }

  const response = await fetch('/quote', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    result.classList.remove('hidden');
    result.innerHTML = `<p class="note">${errorData?.error || 'Unable to generate quote. Please try again.'}</p>`;
    return;
  }

  const quote = await response.json();
  currentQuote = quote;
  renderQuote(quote);
  saveHistory(quote);
});

loginForm.addEventListener('submit', signIn);
preferencesForm.addEventListener('submit', savePreferences);
logoutButton.addEventListener('click', async () => {
  await fetch('/logout', { method: 'POST' });
  window.location.reload();
});

attemptSessionRestore();
renderHistory(loadHistory());
