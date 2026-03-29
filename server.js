const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_PASSWORD = 'lordvolde';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const defaultData = {
                playerPredictions: {},
                actualResults: { matches: {}, seasonActual: { tournamentWinner: null, top4: [], orangeCapWinner: null, purpleCapWinner: null, pottWinner: null } },
                previousWinners: []
            };
            const IPL_MATCHES = [
                "M1 RCB VS SRH", "M2 MI VS KKR", "M3 RR VS CSK", "M4 PBKS VS GT", "M5 LSG VS DC",
                "M6 KKR VS SRH", "M7 CSK VS PBKS", "M8 DC VS MI", "M9 GT VS RR", "M10 SRH VS LSG",
                "M11 RCB VS CSK", "M12 KKR VS PBKS", "M13 RR VS MI", "M14 DC VS GT", "M15 KKR VS LSG",
                "M16 RR VS RCB", "M17 PBKS VS SRH", "M18 CSK VS DC", "M19 LSG VS GT", "M20 MI VS RCB",
                "M21 SRH VS RR", "M22 CSK VS KKR", "M23 RCB VS LSG", "M24 MI VS PBKS", "M25 GT VS KKR",
                "M26 RCB VS DC", "M27 SRH VS CSK", "M28 KKR VS RR", "M29 PBKS VS LSG", "M30 GT VS MI",
                "M31 SRH VS DC", "M32 RCB VS GT", "M33 MI VS CSK", "M34 RCB VS GT", "M35 DC VS PBKS",
                "M36 RR VS SRH", "M37 GT VS CSK", "M38 LSG VS KKR", "M39 DC VS RCB", "M40 PBKS VS RR",
                "M41 MI VS SRH", "M42 GT VS RCB", "M43 RR VS DC", "M44 CSK VS MI", "M45 SRH VS KKR",
                "M46 GT VS PBKS", "M47 LSG VS RCB", "M48 DC VS CSK", "M49 SRH VS PBKS", "M50 LSG VS RCB",
                "M51 DC VS KKR", "M52 RR VS GT", "M53 CSK VS LSG", "M54 RCB VS MI", "M55 PBKS VS DC",
                "M56 GT VS SRH", "M57 RCB VS KKR", "M58 PBKS VS MI", "M59 LSG VS CSK", "M60 KKR VS GT",
                "M61 PBKS VS RCB", "M62 DC VS RR", "M63 CSK VS SRH", "M64 RR VS LSG", "M65 KKR VS MI",
                "M66 CSK VS GT", "M67 SRH VS RCB", "M68 LSG VS PBKS", "M69 MI VS RR", "M70 KKR VS DC",
                "QUALIFIER 1", "ELIMINATOR", "QUALIFIER 2", "FINAL"
            ];
            const ADPL_PLAYERS = [
                "Samarth Gangwar", "Divyansh Tyagi", "Dhairya Kumar", "Akshay Pratap",
                "Saksham Rathore", "Syed Askari", "Shaz Huassain", "Aqdas Raza",
                "Shubh Saxena", "Chirag Saxena", "Amrit Johri", "Hirdyansh Sahni"
            ];
            for (let player of ADPL_PLAYERS) {
                let matchPreds = {};
                IPL_MATCHES.forEach((_, idx) => { matchPreds[idx] = { winner: "", motm: "" }; });
                defaultData.playerPredictions[player] = {
                    predictions: {
                        matchPredictions: matchPreds,
                        season: {
                            tournamentWinner: null,
                            top4: [],
                            orangeCap: { first: null, second: null, third: null },
                            purpleCap: { first: null, second: null, third: null },
                            pott: { first: null, second: null, third: null }
                        }
                    }
                };
            }
            defaultData.previousWinners = [{ year: "2025", winnerName: "Syed Askari" }];
            fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        const raw = fs.readFileSync(DATA_FILE);
        return JSON.parse(raw);
    } catch (err) {
        console.error("Error reading data.json", err);
        return { playerPredictions: {}, actualResults: { matches: {}, seasonActual: {} }, previousWinners: [] };
    }
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/data', (req, res) => {
    const data = readData();
    res.json(data);
});

app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) res.json({ success: true });
    else res.status(401).json({ success: false, error: "Wrong password" });
});

app.post('/api/admin/updatePredictions', (req, res) => {
    const { playerName, predictions, adminPassword } = req.body;
    if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ success: false, error: "Unauthorized" });
    const data = readData();
    if (!data.playerPredictions[playerName]) data.playerPredictions[playerName] = { predictions: {} };
    data.playerPredictions[playerName].predictions = predictions;
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/updateMatchResults', (req, res) => {
    const { matches, adminPassword } = req.body;
    if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ success: false, error: "Unauthorized" });
    const data = readData();
    data.actualResults.matches = matches;
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/updateSeasonActuals', (req, res) => {
    const { seasonActual, adminPassword } = req.body;
    if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ success: false, error: "Unauthorized" });
    const data = readData();
    data.actualResults.seasonActual = seasonActual;
    writeData(data);
    res.json({ success: true });
});

app.post('/api/admin/updatePreviousWinners', (req, res) => {
    const { action, year, winnerName, adminPassword } = req.body;
    if (adminPassword !== ADMIN_PASSWORD) return res.status(401).json({ success: false, error: "Unauthorized" });
    const data = readData();
    if (action === 'add' && year && winnerName) {
        data.previousWinners.unshift({ year, winnerName });
        writeData(data);
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: "Invalid action or missing fields" });
    }
});

app.listen(PORT, () => {
    console.log(`ADPL Server running on http://localhost:${PORT}`);
});