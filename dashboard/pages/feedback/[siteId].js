// dashboard/pages/feedback/[siteId].js
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { auth, db } from '../../firebase-init';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, serverTimestamp
} from 'firebase/firestore';

const STATUS_STYLES = {
  pending:  { bg: '#FEF3C7', color: '#92400E', label: 'Pending'  },
  approved: { bg: '#D1FAE5', color: '#065F46', label: 'Approved' },
  rejected: { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
};

const TYPE_ICONS = { pin: '📍', draw: '✏️', text: '💬', screenshot: '📸' };

export default function FeedbackPage() {
  const router  = useRouter();
  const siteId  = router.query.siteId;

  const [user,      setUser]      = useState(null);
  const [authLoad,  setAuthLoad]  = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [filter,    setFilter]    = useState('all');
  const [updating,  setUpdating]  = useState('');
  const [expanded,  setExpanded]  = useState(null);
  const [noteMap,   setNoteMap]   = useState({});

  // ── Auth gate ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.replace('/');
      setUser(u);
      setAuthLoad(false);
    });
    return unsub;
  }, [router]);

  // ── Live Firestore listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !siteId) return;

    const q = query(
      collection(db, 'feedback'),
      where('siteId', '==', siteId),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, siteId]);

  // ── Update status ────────────────────────────────────────────────────────────
  const updateStatus = useCallback(async (feedbackId, newStatus) => {
    setUpdating(feedbackId);
    try {
      await updateDoc(doc(db, 'feedback', feedbackId), {
        status: newStatus,
        reviewNote: noteMap[feedbackId] || '',
        reviewedBy: user.email,
        reviewedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setUpdating('');
    }
  }, [noteMap, user]);

  // ── Filtered list ────────────────────────────────────────────────────────────
  const displayed = filter === 'all'
    ? feedbacks
    : feedbacks.filter(f => f.status === filter);

  if (authLoad) return <div style={s.center}>⏳</div>;

  return (
    <div style={s.page}>
      <Head><title>Feedback — {siteId}</title></Head>

      <header style={s.header}>
        <div style={s.headerInner}>
          <Link href="/" style={s.back}>← Dashboard</Link>
          <span style={s.brand}>💬 Feedback: <code style={s.siteCode}>{siteId}</code></span>
          <div style={s.filterRow}>
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button
                key={f}
                style={{ ...s.filterBtn, ...(filter === f ? s.filterActive : {}) }}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && feedbacks.filter(fb => fb.status === 'pending').length > 0 &&
                  <span style={s.filterCount}>{feedbacks.filter(fb => fb.status === 'pending').length}</span>
                }
              </button>
            ))}
          </div>
        </div>
      </header>

      <main style={s.main}>
        {displayed.length === 0 && (
          <div style={s.empty}>
            <span style={{ fontSize: 48 }}>🎉</span>
            <p style={{ color: '#6B7280', marginTop: 8 }}>
              {filter === 'all' ? 'No feedback yet for this site.' : `No ${filter} items.`}
            </p>
          </div>
        )}

        {displayed.map(fb => {
          const st = STATUS_STYLES[fb.status] || STATUS_STYLES.pending;
          const isExpanded = expanded === fb.id;
          const items = Array.isArray(fb.items) ? fb.items : [];

          return (
            <div key={fb.id} style={s.card}>
              {/* Card header */}
              <div style={s.cardHeader}>
                <div style={s.cardMeta}>
                  <span style={{ ...s.statusBadge, background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                  <span style={s.reviewer}>👤 {fb.reviewer || 'Anonymous'}</span>
                  <span style={s.timestamp}>{new Date(fb.timestamp).toLocaleString()}</span>
                </div>
                <a href={fb.pageUrl} target="_blank" rel="noopener noreferrer" style={s.pageUrl}>
                  {fb.pageTitle || fb.pageUrl} ↗
                </a>
              </div>

              {/* Items summary */}
              <div style={s.itemPills}>
                {items.map((item, i) => (
                  <span key={i} style={s.pill}>
                    {TYPE_ICONS[item.type] || '📌'} {item.type}
                    {item.content ? ` — ${item.content.slice(0, 40)}${item.content.length > 40 ? '…' : ''}` : ''}
                  </span>
                ))}
              </div>

              {/* Screenshots */}
              {items.some(i => i.screenshotDataUrl) && (
                <div style={s.screenshots}>
                  {items.filter(i => i.screenshotDataUrl).map((item, idx) => (
                    <img
                      key={idx}
                      src={item.screenshotDataUrl}
                      alt="Screenshot"
                      style={s.screenshot}
                      onClick={() => setExpanded(isExpanded ? null : fb.id)}
                    />
                  ))}
                </div>
              )}

              {/* Expanded detail */}
              {isExpanded && (
                <div style={s.detailBox}>
                  {items.map((item, i) => (
                    <div key={i} style={s.detailRow}>
                      <span style={s.detailType}>{TYPE_ICONS[item.type]} {item.type}</span>
                      {item.x != null && <span style={s.detailMeta}>x:{Math.round(item.x)} y:{Math.round(item.y)}</span>}
                      {item.content && <span style={s.detailContent}>{item.content}</span>}
                    </div>
                  ))}
                </div>
              )}

              <button style={s.expandBtn} onClick={() => setExpanded(isExpanded ? null : fb.id)}>
                {isExpanded ? '▲ Collapse' : '▼ Show Details'}
              </button>

              {/* Review note */}
              {fb.status === 'pending' && (
                <textarea
                  style={s.noteArea}
                  placeholder="Optional note for reviewer (saved with action)…"
                  value={noteMap[fb.id] || ''}
                  onChange={e => setNoteMap(m => ({ ...m, [fb.id]: e.target.value }))}
                />
              )}

              {fb.reviewNote && fb.status !== 'pending' && (
                <p style={s.reviewNote}>📝 Note: {fb.reviewNote}</p>
              )}

              {/* Actions */}
              {fb.status === 'pending' && (
                <div style={s.actions}>
                  <button
                    style={{ ...s.btnApprove, opacity: updating === fb.id ? 0.6 : 1 }}
                    disabled={updating === fb.id}
                    onClick={() => updateStatus(fb.id, 'approved')}
                  >
                    {updating === fb.id ? '⏳' : '✅ Approve'}
                  </button>
                  <button
                    style={{ ...s.btnReject, opacity: updating === fb.id ? 0.6 : 1 }}
                    disabled={updating === fb.id}
                    onClick={() => updateStatus(fb.id, 'rejected')}
                  >
                    {updating === fb.id ? '⏳' : '❌ Reject'}
                  </button>
                </div>
              )}

              {fb.status !== 'pending' && (
                <div style={s.reviewedMeta}>
                  Reviewed by {fb.reviewedBy || 'unknown'} · {fb.reviewedAt?.toDate?.()?.toLocaleString?.() || ''}
                  <button style={s.btnReset} onClick={() => updateStatus(fb.id, 'pending')}>↩ Reset to Pending</button>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}

const s = {
  page:        { minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui,sans-serif' },
  center:      { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 32 },
  header:      { background: '#fff', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10 },
  headerInner: { maxWidth: 900, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  back:        { color: '#4F46E5', textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap' },
  brand:       { fontWeight: 700, fontSize: 15, color: '#111827', flex: 1 },
  siteCode:    { background: '#F3F4F6', borderRadius: 4, padding: '1px 6px', fontSize: 13 },
  filterRow:   { display: 'flex', gap: 6 },
  filterBtn:   { background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  filterActive:{ background: '#EEF2FF', color: '#4F46E5' },
  filterCount: { background: '#4F46E5', color: '#fff', borderRadius: 20, padding: '0 6px', fontSize: 11 },
  main:        { maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 16 },
  empty:       { textAlign: 'center', padding: '80px 0' },
  card:        { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20 },
  cardHeader:  { marginBottom: 12 },
  cardMeta:    { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
  statusBadge: { borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 },
  reviewer:    { color: '#374151', fontSize: 13 },
  timestamp:   { color: '#9CA3AF', fontSize: 12 },
  pageUrl:     { color: '#6B7280', fontSize: 12, textDecoration: 'none' },
  itemPills:   { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  pill:        { background: '#F3F4F6', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: '#374151' },
  screenshots: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  screenshot:  { maxWidth: 320, maxHeight: 200, objectFit: 'contain', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'zoom-in' },
  expandBtn:   { background: 'none', border: 'none', color: '#6B7280', fontSize: 12, cursor: 'pointer', padding: '4px 0', marginBottom: 8 },
  detailBox:   { background: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 },
  detailRow:   { display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' },
  detailType:  { fontWeight: 700, fontSize: 13, color: '#374151', minWidth: 100 },
  detailMeta:  { color: '#9CA3AF', fontSize: 11, fontFamily: 'monospace' },
  detailContent:{ color: '#374151', fontSize: 13 },
  noteArea:    { width: '100%', boxSizing: 'border-box', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', minHeight: 60, marginBottom: 10, outline: 'none' },
  reviewNote:  { color: '#374151', fontSize: 13, background: '#FFFBEB', borderLeft: '3px solid #FCD34D', padding: '6px 10px', borderRadius: 4, marginBottom: 10 },
  actions:     { display: 'flex', gap: 10 },
  btnApprove:  { background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnReject:   { background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  reviewedMeta:{ color: '#9CA3AF', fontSize: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  btnReset:    { background: 'none', border: '1px solid #D1D5DB', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: '#374151' },
};
