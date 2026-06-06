const path = require('path');
const express = require('express');
const session = require('express-session');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3000;

const users = {
  secunda: { password: 'dealer123', company: 'Secunda Auto', displayName: 'Secunda Auto' },
  metro: { password: 'metro321', company: 'Metro Dealership', displayName: 'Metro Dealership' }
};

const userPrefs = {
  secunda: {
    defaultRegion: 'Secunda',
    defaultNotes: 'Use authorized parts and repair standards.',
    defaultSeverity: 'moderate',
    preferredCategories: ['bumperRepair', 'dentRepair', 'paint']
  }
};

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));
app.use(
  session({
    secret: 'autobody-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  })
);

function calculateQuote(data) {
  const regionFactors = {
    Secunda: 1.0,
    Surrounding: 1.05,
    Other: 1.12
  };

  const laborRate = 420; // ZAR per hour
  const baseCosts = {
    bumperRepair: 2400,
    panelRepair: 3200,
    paint: 1900,
    replacement: 5200,
    dentRepair: 1100,
    windscreen: 3600,
    alloyWheel: 2500
  };

  const selection = Array.isArray(data.selection) ? data.selection : [];
  const quoteItems = [];
  let subtotal = 0;

  selection.forEach((item) => {
    const itemKey = item.key;
    if (!baseCosts[itemKey]) return;

    const severityFactor = item.severity === 'major' ? 1.45 : item.severity === 'moderate' ? 1.2 : 1.0;
    const regionFactor = regionFactors[data.region] || 1.0;
    const cost = Math.round(baseCosts[itemKey] * severityFactor * regionFactor);

    quoteItems.push({
      description: item.label,
      severity: item.severity || 'moderate',
      cost,
      notes: item.notes || ''
    });
    subtotal += cost;
  });

  const laborHours = Math.max(1, Math.ceil(quoteItems.length * 1.3));
  const laborCost = laborHours * laborRate;
  const total = subtotal + laborCost;

  return {
    client: data.client || 'Dealership',
    vehicle: data.vehicle || 'Used car',
    region: data.region || 'Secunda',
    quoteItems,
    laborHours,
    laborCost,
    subtotal,
    total,
    pricingNote: 'Estimates are based on typical used-car collision repairs and local alloy/body labor rates in and around Secunda.'
  };
}

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  req.session.user = { username, company: user.company, displayName: user.displayName };
  res.json({ user: req.session.user, prefs: userPrefs[username] || {} });
});

app.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not signed in.' });
  }

  const prefs = userPrefs[req.session.user.username] || {};
  res.json({ user: req.session.user, prefs });
});

app.post('/prefs', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not signed in.' });
  }

  const { defaultRegion, defaultNotes, defaultSeverity, preferredCategories } = req.body || {};
  userPrefs[req.session.user.username] = {
    defaultRegion: defaultRegion || 'Secunda',
    defaultNotes: defaultNotes || '',
    defaultSeverity: defaultSeverity || 'moderate',
    preferredCategories: Array.isArray(preferredCategories) ? preferredCategories : []
  };

  res.json({ prefs: userPrefs[req.session.user.username] });
});

app.post('/quote', upload.single('photo'), (req, res) => {
  let payload;

  try {
    payload = JSON.parse(req.body.data || '{}');
  } catch (error) {
    return res.status(400).json({ error: 'Invalid request payload.' });
  }

  if (!Array.isArray(payload.selection) || payload.selection.length === 0) {
    return res.status(400).json({ error: 'Please select at least one damage item before requesting a quote.' });
  }

  const quote = calculateQuote(payload);

  if (req.file) {
    quote.photoName = req.file.originalname;
  }

  res.json(quote);
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Autobody quote app running at http://localhost:${PORT}`);
});
