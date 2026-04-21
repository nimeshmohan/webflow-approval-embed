// dashboard/pages/api/feedback.js
// Receives POST from the widget embed script and writes to Firestore.
// Also handles GET for listing feedback (optional dashboard use).

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Firebase Admin init (server-side) ───────────────────────────────────────
function getAdminDb() {
  if (!getApps().length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : null;

    if (serviceAccount) {
      initializeApp({ credential: cert(serviceAccount) });
    } else {
      // Fallback: use GOOGLE_APPLICATION_CREDENTIALS env var or emulator
      initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project' });
    }
  }
  return getFirestore();
}

// ─── CORS helper ─────────────────────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // ── POST: widget submits feedback ─────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (!body.siteId) {
        return res.status(400).json({ error: 'siteId is required' });
      }

      const doc = {
        siteId:     body.siteId,
        reviewer:   body.reviewer || 'Anonymous',
        pageUrl:    body.pageUrl  || '',
        pageTitle:  body.pageTitle || '',
        items:      Array.isArray(body.items) ? body.items : [],
        status:     'pending',
        timestamp:  body.timestamp || new Date().toISOString(),
        createdAt:  new Date(),
        reviewNote: '',
        reviewedBy: '',
      };

      const adminDb = getAdminDb();

      // ── Emulator support ──────────────────────────────────────────────────
      if (process.env.FIRESTORE_EMULATOR_HOST) {
        process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
      }

      const ref = await adminDb.collection('feedback').add(doc);

      return res.status(201).json({ id: ref.id, message: 'Feedback saved successfully' });
    } catch (err) {
      console.error('[WFA API] POST /api/feedback error:', err);
      return res.status(500).json({ error: 'Failed to save feedback', detail: err.message });
    }
  }

  // ── GET: list feedback for a siteId ──────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { siteId, status } = req.query;
      const adminDb = getAdminDb();

      let q = adminDb.collection('feedback');
      if (siteId) q = q.where('siteId', '==', siteId);
      if (status) q = q.where('status', '==', status);
      q = q.orderBy('createdAt', 'desc').limit(100);

      const snap = await q.get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.()?.toISOString() }));

      return res.status(200).json({ items });
    } catch (err) {
      console.error('[WFA API] GET /api/feedback error:', err);
      return res.status(500).json({ error: 'Failed to fetch feedback', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
