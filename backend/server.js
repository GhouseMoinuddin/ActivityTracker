const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
try {
  // Try to use environment variables for service account if provided 
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      })
    });
  } else {
    console.log("No specific service account variables found, attempting to use application default credentials...");
    admin.initializeApp();
  }
} catch (error) {
  console.error("Firebase Admin Initialization Error:", error.message);
}

const db = admin.firestore();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Activity Tracker Backend Active' });
});

// GET: Retrieve user data
app.get('/api/tracker/:email', async (req, res) => {
  const { email } = req.params;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const docRef = db.collection('trackerSync').doc(email);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      res.json({ data: docSnap.data(), exists: true });
    } else {
      res.json({ data: null, exists: false, message: 'No data found for this user' });
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: 'Failed to access Firestore' });
  }
});

// POST: Sync user data
app.post('/api/tracker/:email', async (req, res) => {
  const { email } = req.params;
  const payload = req.body;

  if (!email) return res.status(400).json({ error: 'Email is required' });
  
  try {
    const docRef = db.collection('trackerSync').doc(email);
    await docRef.set(payload, { merge: true });
    res.json({ success: true, message: 'Data synced successfully' });
  } catch (error) {
    console.error("Error syncing data:", error);
    res.status(500).json({ error: 'Failed to sync to Firestore' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
