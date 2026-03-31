const express = require('express');
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You can either set GOOGLE_APPLICATION_CREDENTIALS environment variable
// or paste the service account JSON directly (not recommended for public repos)
const serviceAccount = require('./serviceAccountKey.json'); // download from Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname)); // serve index.html

const ADMIN_PASSWORD = 'lordvolde';
const COLLECTION = 'adpl';
const DOC_ID = 'mainData';

// Helper: read data from Firestore
async function readData() {
  const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
  if (!doc.exists) {
    // Create default structure if missing
    const defaultData = {
      playerPredictions: {},
      actualResults: { matches: {}, seasonActual: { tournamentWinner: null, top4: [], orangeCapWinner: null, purpleCapWinner: null, pottWinner: null } },
      previousWinners: [{ year: "2025", winnerName: "Syed Askari" }]
    };
    await db.collection(COLLECTION).doc(DOC_ID).set(defaultData);
    return defaultData;
  }
  return doc.data();
}

// Helper: write data to Firestore
async function writeData(data) {
  await db.collection(COLLECTION).doc(DOC_ID).set(data);
}

// ======================== API ENDPOINTS (unchanged logic) ========================
app.get('/api/data', async (req, res) => {
  const data = await readData();
  res.json(data);
});

app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) res.json({ success: true });
  else res.status(401).json({ success: false, error: "Wrong password" });
});

app.post('/api/admin/updatePredictions', async (req, res) => {
  const { playerName, predictions, adminPassword } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ success: false, error: "Unauthorized" });
  const data = await readData();
  if (!data.playerPredictions[playerName]) data.playerPredictions[playerName] = { predictions: {} };
  data.playerPredictions[playerName].predictions = predictions;
  await writeData(data);
  res.json({ success: true });
});

app.post('/api/admin/updateMatchResults', async (req, res) => {
  const { matches, adminPassword } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ success: false, error: "Unauthorized" });
  const data = await readData();
  data.actualResults.matches = matches;
  await writeData(data);
  res.json({ success: true });
});

app.post('/api/admin/updateSeasonActuals', async (req, res) => {
  const { seasonActual, adminPassword } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ success: false, error: "Unauthorized" });
  const data = await readData();
  data.actualResults.seasonActual = seasonActual;
  await writeData(data);
  res.json({ success: true });
});

app.post('/api/admin/updatePreviousWinners', async (req, res) => {
  const { action, year, winnerName, adminPassword } = req.body;
  if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ success: false, error: "Unauthorized" });
  const data = await readData();
  if (action === 'add' && year && winnerName) {
    data.previousWinners.unshift({ year, winnerName });
    await writeData(data);
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, error: "Invalid action or missing fields" });
  }
});

app.listen(PORT, () => {
  console.log(`ADPL Server running on http://localhost:${PORT}`);
  console.log(`Data is now stored in Firebase Firestore – never resets!`);
});