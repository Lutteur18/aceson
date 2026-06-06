const form = document.getElementById('quoteForm');
const preview = document.getElementById('preview');
const result = document.getElementById('result');
const photoInput = document.getElementById('photo');

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) {
    preview.style.display = 'none';
    preview.src = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

const damageLabels = {
  bumperRepair: 'Bumper repair',
  panelRepair: 'Panel repair',
  paint: 'Paint and refinishing',
  replacement: 'Part replacement',
  dentRepair: 'Dent repair',
  windscreen: 'Windscreen repair/replacement',
  alloyWheel: 'Alloy wheel repair'
};

function buildSelection() {
  return Array.from(form.querySelectorAll('input[name="damage"]:checked')).map((checkbox) => ({
    key: checkbox.value,
    label: damageLabels[checkbox.value] || checkbox.value,
    severity: 'moderate',
    notes: document.getElementById('notes').value.trim()
  }));
}

function renderQuote(quote) {
  const itemsHtml = quote.quoteItems.map(item => `
    <div class="quote-item">
      <div>
        <strong>${item.description}</strong><br />
        <span class="note">Severity: ${item.severity}</span>
      </div>
      <div>R ${item.cost.toLocaleString()}</div>
    </div>
  `).join('');

  result.innerHTML = `
    <h2>Quote summary</h2>
    <p><strong>Client:</strong> ${quote.client}</p>
    <p><strong>Vehicle:</strong> ${quote.vehicle}</p>
    <p><strong>Region:</strong> ${quote.region}</p>
    ${itemsHtml}
    <div class="quote-item"><strong>Subtotal</strong><span>R ${quote.subtotal.toLocaleString()}</span></div>
    <div class="quote-item"><strong>Labor (${quote.laborHours} hrs)</strong><span>R ${quote.laborCost.toLocaleString()}</span></div>
    <div class="quote-item"><strong>Total</strong><span>R ${quote.total.toLocaleString()}</span></div>
    <p class="note">${quote.pricingNote}</p>
  `;
  result.style.display = 'block';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData();
  const data = {
    client: document.getElementById('client').value.trim(),
    vehicle: document.getElementById('vehicle').value.trim(),
    region: document.getElementById('region').value,
    selection: buildSelection()
  };

  formData.append('data', JSON.stringify(data));
  if (photoInput.files[0]) {
    formData.append('photo', photoInput.files[0]);
  }

  const response = await fetch('/quote', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    result.style.display = 'block';
    result.innerHTML = '<p class="note">Unable to generate quote. Please try again.</p>';
    return;
  }

  const quote = await response.json();
  renderQuote(quote);
});
