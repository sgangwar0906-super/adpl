const express = require('express');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= FIREBASE INIT =================

// 🔥 Use ENV variable instead of file
let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
} catch (e) {
  console.error("❌ FIREBASE_KEY parsing failed:", e);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("✅ Firebase initialized");
} catch (e) {
  console.error("🔥 Firebase init error:", e);
}

const db = admin.firestore();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.static(__dirname)); // serve index.html

// ================= CONFIG =================
const ADMIN_PASSWORD = 'lordvolde';
const COLLECTION = 'adpl';
const DOC_ID = 'mainData';

// ================= HELPERS =================

// Read data safely
async function readData() {
  try {
    const docRef = db.collection(COLLECTION).doc(DOC_ID);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log("⚠️ No data found, creating default...");

      const defaultData = {
        playerPredictions: {},
        actualResults: {
          matches: {},
          seasonActual: {
            tournamentWinner: null,
            top4: [],
            orangeCapWinner: null,
            purpleCapWinner: null,
            pottWinner: null
          }
        },
        previousWinners: []
      };

      await docRef.set(defaultData);
      return defaultData;
    }

    return doc.data();
  } catch (err) {
    console.error("❌ Error reading data:", err);
    throw err;
  }
}

// Write data safely
async function writeData(data) {
  try {
    await db.collection(COLLECTION).doc(DOC_ID).set(data);
  } catch (err) {
    console.error("❌ Error writing data:", err);
    throw err;
  }
}

// ================= API ROUTES =================

// Get all data
app.get('/api/data', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// Verify admin
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Wrong password" });
  }
});

// Update player predictions
app.post('/api/admin/updatePredictions', async (req, res) => {
  const { playerName, predictions, adminPassword } = req.body;

  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const data = await readData();

    if (!data.playerPredictions[playerName]) {
      data.playerPredictions[playerName] = { predictions: {} };
    }

    data.playerPredictions[playerName].predictions = predictions;

    await writeData(data);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Update failed" });
  }
});

// Update match results
app.post('/api/admin/updateMatchResults', async (req, res) => {
  const { matches, adminPassword } = req.body;

  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const data = await readData();

    data.actualResults.matches = matches;

    await writeData(data);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Update failed" });
  }
});

// Update season results
app.post('/api/admin/updateSeasonActuals', async (req, res) => {
  const { seasonActual, adminPassword } = req.body;

  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const data = await readData();

    data.actualResults.seasonActual = seasonActual;

    await writeData(data);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Update failed" });
  }
});

// Add previous winner
app.post('/api/admin/updatePreviousWinners', async (req, res) => {
  const { action, year, winnerName, adminPassword } = req.body;

  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const data = await readData();

    if (action === 'add' && year && winnerName) {
      data.previousWinners.unshift({ year, winnerName });

      await writeData(data);

      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: "Invalid input" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: "Update failed" });
  }
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔥 Using Firebase (persistent storage)`);
});