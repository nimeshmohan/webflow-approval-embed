# 💬 Webflow Client Approval Widget

An **internal** tool for collecting client feedback on Webflow staging sites — with pinning, drawing, text comments, and screenshots — backed by Firebase Firestore, and reviewed through a Next.js dashboard deployed on Render.

---

## Architecture

```
Webflow Staging Site
  └── widget.js (embedded)         → POST /api/feedback
         ↓
Next.js Dashboard (Render)
  └── pages/api/feedback.js        → Firebase Admin SDK
         ↓
Firebase Firestore
  └── /feedback/{docId}
         ↓
Firebase Cloud Functions
  └── onFeedbackCreated / onFeedbackUpdated → Resend / Nodemailer
```

---

## Quick Start

### 1. Firebase Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and init
firebase login
cd firebase/
firebase use --add   # select your project

# Deploy Firestore rules + indexes
firebase deploy --only firestore

# Deploy Cloud Functions
cd ../functions/
npm install
firebase deploy --only functions
```

Set function environment variables:
```bash
# Option A — Resend (recommended)
firebase functions:config:set resend.api_key="re_xxxx" notify.email="team@you.com" dashboard.url="https://your-app.onrender.com"

# Option B — Gmail
firebase functions:config:set gmail.user="you@gmail.com" gmail.password="app-password" notify.email="team@you.com"
```

### 2. Dashboard (Local Dev)

```bash
cd dashboard/
cp .env.local.example .env.local
# Fill in your Firebase config values in .env.local

npm install
npm run dev
# → http://localhost:3000
```

**Firebase emulator (optional):**
```bash
# From firebase/ directory
firebase emulators:start
# Set NEXT_PUBLIC_USE_EMULATOR=true in .env.local
```

### 3. Deploy to Render

1. Push this repo to GitHub.
2. Create a new Render **Web Service**, connect your repo.
3. Render will detect `render.yaml` automatically.
4. Set all env vars (see `.env.local.example`) in the Render dashboard under **Environment**.
5. Deploy — your app will be live at `https://webflow-approval-dashboard.onrender.com`.

---

## Embedding the Widget on Webflow

1. In Webflow: **Project Settings → Custom Code → Footer Code**
2. Paste:

```html
<script
  src="https://YOUR-APP.onrender.com/widget.js?siteId=YOUR-SITE-ID&apiUrl=https://YOUR-APP.onrender.com"
></script>
```

3. Publish your site.
4. The **💬 Review** button appears in the bottom-right corner.

> **Tip:** Use the Sites page (`/sites`) in the dashboard to copy embed snippets automatically.

---

## Widget Tools

| Tool       | How it works                                      |
|------------|---------------------------------------------------|
| 📍 Pin     | Click anywhere to drop a marker                   |
| ✏️ Draw    | Freehand draw on a canvas overlay                 |
| 💬 Text    | Click to place a text input box, Enter to confirm |
| 📸 Screenshot | Captures full-page screenshot via html2canvas  |

All items are bundled into a single feedback doc on **Submit**.

---

## Dashboard Pages

| Route                   | Description                                      |
|-------------------------|--------------------------------------------------|
| `/`                     | Login + site list with pending counts            |
| `/sites`                | Add/manage staging sites, copy embed codes       |
| `/feedback/[siteId]`    | Review all feedback for a site, approve/reject   |

---

## Firestore Data Model

```
/feedback/{docId}
  siteId:       string          // e.g. "site-acme"
  reviewer:     string          // name entered by client
  pageUrl:      string
  pageTitle:    string
  items: [
    {
      type:              "pin" | "draw" | "text" | "screenshot"
      x:                 number | null
      y:                 number | null
      content:           string
      screenshotDataUrl: string | null   // base64 PNG
      points:            [{x,y}] | null  // for draw type
    }
  ]
  status:       "pending" | "approved" | "rejected"
  timestamp:    ISO string
  createdAt:    Timestamp
  reviewNote:   string
  reviewedBy:   string
  reviewedAt:   Timestamp
```

---

## Email Notifications

Emails are sent by Firebase Cloud Functions (not the Next.js app):

- **onCreate** — when a client submits feedback
- **onUpdate** — when team approves/rejects

Choose your provider:
- **Resend** (recommended for free tier) — set `RESEND_API_KEY`
- **Gmail + Nodemailer** — set `GMAIL_USER` + `GMAIL_PASSWORD` (use App Password)

---

## Environment Variables

See `dashboard/.env.local.example` for full reference.

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Dashboard | Firebase client config |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Dashboard (server) | Admin SDK auth |
| `NEXT_PUBLIC_USE_EMULATOR` | Dashboard | Connect to local emulator |
| `RESEND_API_KEY` | Functions | Email via Resend |
| `GMAIL_USER` / `GMAIL_PASSWORD` | Functions | Email via Gmail |
| `NOTIFY_EMAIL` | Functions | Who receives notifications |
| `DASHBOARD_URL` | Functions | Link in email notifications |

---

## Project Structure

```
webflow-approval-embed/
├── widget.js                    # Vanilla JS embed (no build step)
├── public/icon.svg              # Widget icon
├── firebase/
│   ├── firebase.json            # Firebase project config
│   ├── firestore.rules          # Security rules
│   └── firestore.indexes.json   # Composite indexes
├── functions/
│   ├── index.js                 # Cloud Functions (email triggers)
│   └── package.json
├── dashboard/                   # Next.js 15 app
│   ├── pages/
│   │   ├── index.js             # Login + site list
│   │   ├── sites.js             # Site management
│   │   ├── feedback/[siteId].js # Feedback review
│   │   └── api/feedback.js      # REST API endpoint
│   ├── src/components/
│   │   └── Toolbar.js           # Tool type display
│   ├── firebase-init.js         # Firebase client init
│   ├── .env.local.example
│   └── package.json
├── render.yaml                  # Render.com deploy config
├── .gitignore
└── README.md
```

---

## Security Notes

- **Firestore rules** allow unauthenticated `create` (widget embed) but only authenticated reads/updates.
- The dashboard uses Firebase Email/Password auth — create users in the Firebase Console under Authentication.
- `FIREBASE_SERVICE_ACCOUNT_JSON` is **server-side only** — never expose it to the browser.
- Screenshot data URLs (base64 PNG) are stored directly in Firestore. For large volumes, consider moving to Firebase Storage instead.

---

## License

Internal use only. Not for redistribution.
