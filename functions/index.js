const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ─── Choose email provider ────────────────────────────────────────────────────
// Set RESEND_API_KEY in Firebase env  → uses Resend (recommended)
// Set GMAIL_USER + GMAIL_PASSWORD     → falls back to Nodemailer / Gmail
// ─────────────────────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  const resendKey = process.env.RESEND_API_KEY || functions.config().resend?.api_key;
  const gmailUser = process.env.GMAIL_USER || functions.config().gmail?.user;
  const gmailPass = process.env.GMAIL_PASSWORD || functions.config().gmail?.password;
  const fromAddr  = process.env.FROM_EMAIL || 'nimeshvellinezhi@gmail.com';
  const toAddr    = to || process.env.NOTIFY_EMAIL || gmailUser;

  if (!toAddr) {
    console.warn('[WFA] No recipient address configured. Set NOTIFY_EMAIL env var.');
    return;
  }

  if (resendKey) {
    // ── Resend ────────────────────────────────────────────────────────────────
    const { Resend } = require('resend');
    const resend = new Resend(resendKey);
    await resend.emails.send({ from: fromAddr, to: toAddr, subject, html });
    console.log('[WFA] Email sent via Resend to', toAddr);
  } else if (gmailUser && gmailPass) {
    // ── Nodemailer + Gmail ────────────────────────────────────────────────────
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });
    await transporter.sendMail({ from: gmailUser, to: toAddr, subject, html });
    console.log('[WFA] Email sent via Gmail to', toAddr);
  } else {
    console.warn('[WFA] No email provider configured. Skipping email.');
  }
}

// ─── Trigger: new feedback created ───────────────────────────────────────────
exports.onFeedbackCreated = functions.firestore
  .document('feedback/{docId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const docId = context.params.docId;

    const itemCount = Array.isArray(data.items) ? data.items.length : 0;
    const subject = `🔔 New review feedback — ${data.siteId}`;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;">
        <h2 style="color:#4F46E5;">New Client Feedback Received</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#6B7280;width:120px;">Site ID</td><td><strong>${data.siteId}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6B7280;">Reviewer</td><td>${data.reviewer || 'Anonymous'}</td></tr>
          <tr><td style="padding:6px 0;color:#6B7280;">Page</td><td><a href="${data.pageUrl}">${data.pageTitle || data.pageUrl}</a></td></tr>
          <tr><td style="padding:6px 0;color:#6B7280;">Items</td><td>${itemCount} comment(s)</td></tr>
          <tr><td style="padding:6px 0;color:#6B7280;">Time</td><td>${data.timestamp}</td></tr>
        </table>
        <p style="margin-top:20px;">
          <a href="${process.env.DASHBOARD_URL || '#'}/feedback/${data.siteId}"
             style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
            View in Dashboard →
          </a>
        </p>
        <p style="color:#9CA3AF;font-size:12px;">Webflow Approval Widget · Internal Use</p>
      </div>
    `;

    try {
      await sendEmail({ subject, html });
    } catch (err) {
      console.error('[WFA] Failed to send new feedback email:', err);
    }

    return null;
  });

// ─── Trigger: feedback status updated ────────────────────────────────────────
exports.onFeedbackUpdated = functions.firestore
  .document('feedback/{docId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();

    // Only act when status changes
    if (before.status === after.status) return null;

    const statusEmoji = after.status === 'approved' ? '✅' : after.status === 'rejected' ? '❌' : '🔄';
    const subject = `${statusEmoji} Feedback ${after.status} — ${after.siteId}`;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;">
        <h2 style="color:#4F46E5;">Feedback Status Updated</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#6B7280;width:120px;">Site ID</td><td><strong>${after.siteId}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6B7280;">Reviewer</td><td>${after.reviewer || 'Anonymous'}</td></tr>
          <tr><td style="padding:6px 0;color:#6B7280;">Page</td><td><a href="${after.pageUrl}">${after.pageTitle || after.pageUrl}</a></td></tr>
          <tr><td style="padding:6px 0;color:#6B7280;">Old Status</td><td>${before.status}</td></tr>
          <tr><td style="padding:6px 0;color:#6B7280;">New Status</td>
            <td><strong style="color:${after.status === 'approved' ? '#10B981' : '#EF4444'}">${after.status.toUpperCase()}</strong></td></tr>
          ${after.reviewNote ? `<tr><td style="padding:6px 0;color:#6B7280;">Note</td><td>${after.reviewNote}</td></tr>` : ''}
        </table>
        <p style="margin-top:20px;">
          <a href="${process.env.DASHBOARD_URL || '#'}/feedback/${after.siteId}"
             style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
            View in Dashboard →
          </a>
        </p>
        <p style="color:#9CA3AF;font-size:12px;">Webflow Approval Widget · Internal Use</p>
      </div>
    `;

    try {
      await sendEmail({ subject, html });
    } catch (err) {
      console.error('[WFA] Failed to send status update email:', err);
    }

    return null;
  });
