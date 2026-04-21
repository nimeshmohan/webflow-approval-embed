// dashboard/pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { auth, db } from '../firebase-init';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';

// ─── Hardcoded staging sites (edit as needed) ─────────────────────────────────
const STAGING_SITES = [
  { id: 'site-acme',    name: 'Acme Corp',          url: 'https://acme-corp.webflow.io' },
  { id: 'site-bloom',   name: 'Bloom Finance',       url: 'https://bloom-finance.webflow.io' },
  { id: 'site-nova',    name: 'Nova SaaS',           url: 'https://nova-saas.webflow.io' },
  { id: 'site-peak',    name: 'Peak Outdoors',       url: 'https://peak-outdoors.webflow.io' },
  { id: 'site-newclient', name: 'New Client', url: 'https://marmoremena-website.webflow.io/' }
];

export default function Home() {
  const router = useRouter();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [authErr, setAuthErr] = useState('');
  const [counts,  setCounts]  = useState({});

  // ── Auth gate ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Load pending counts per site ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    async function loadCounts() {
      const map = {};
      await Promise.all(
        STAGING_SITES.map(async (site) => {
          try {
            const q = query(
              collection(db, 'feedback'),
              where('siteId', '==', site.id),
              where('status', '==', 'pending')
            );
            const snap = await getCountFromServer(q);
            map[site.id] = snap.data().count;
          } catch {
            map[site.id] = '?';
          }
        })
      );
      setCounts(map);
    }
    loadCounts();
  }, [user]);

  async function handleLogin(e) {
    e.preventDefault();
    setAuthErr('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      setAuthErr('Invalid credentials. Check email / password.');
    }
  }

  if (loading) return <div style={styles.center}><span style={styles.spinner}>⏳</span></div>;

  // ── Login screen ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={styles.loginWrap}>
        <Head><title>Webflow Approval — Login</title></Head>
        <div style={styles.loginCard}>
          <div style={styles.logo}>💬</div>
          <h1 style={styles.loginTitle}>Webflow Approval</h1>
          <p style={styles.loginSub}>Internal review dashboard</p>
          <form onSubmit={handleLogin}>
            <input
              style={styles.input} type="email" placeholder="Email"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
            <input
              style={styles.input} type="password" placeholder="Password"
              value={pass}  onChange={e => setPass(e.target.value)}  required
            />
            {authErr && <p style={styles.error}>{authErr}</p>}
            <button style={styles.btnPrimary} type="submit">Sign In →</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <Head><title>Webflow Approval Dashboard</title></Head>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <span style={styles.brand}>💬 Webflow Approval</span>
          <div style={styles.headerRight}>
            <span style={styles.userLabel}>{user.email}</span>
            <button style={styles.btnGhost} onClick={() => signOut(auth)}>Sign out</button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main style={styles.main}>
        <h2 style={styles.pageTitle}>Staging Sites</h2>
        <p style={styles.pageSub}>Click a site to review client feedback.</p>

        <div style={styles.grid}>
          {STAGING_SITES.map((site) => (
            <Link key={site.id} href={`/feedback/${site.id}`} style={{ textDecoration: 'none' }}>
              <div style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={styles.cardName}>{site.name}</span>
                  {counts[site.id] > 0 && (
                    <span style={styles.badge}>{counts[site.id]} pending</span>
                  )}
                </div>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.cardUrl}
                  onClick={e => e.stopPropagation()}
                >
                  {site.url} ↗
                </a>
                <div style={styles.cardFooter}>
                  <span style={styles.cardAction}>View Feedback →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page:       { minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui, sans-serif' },
  center:     { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 32 },
  spinner:    {},
  header:     { background: '#fff', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10 },
  headerInner:{ maxWidth: 900, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brand:      { fontWeight: 700, fontSize: 16, color: '#111827' },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 12 },
  userLabel:  { color: '#6B7280', fontSize: 13 },
  btnGhost:   { background: 'none', border: '1px solid #D1D5DB', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 },
  main:       { maxWidth: 900, margin: '0 auto', padding: '40px 24px' },
  pageTitle:  { fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 6px' },
  pageSub:    { color: '#6B7280', margin: '0 0 28px', fontSize: 14 },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  card:       { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px', cursor: 'pointer',
                transition: 'box-shadow .15s, border-color .15s',
                ':hover': { borderColor: '#4F46E5', boxShadow: '0 4px 12px rgba(79,70,229,.15)' } },
  cardTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardName:   { fontWeight: 600, color: '#111827', fontSize: 15 },
  badge:      { background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 600 },
  cardUrl:    { color: '#6B7280', fontSize: 12, display: 'block', marginBottom: 16, wordBreak: 'break-all' },
  cardFooter: { borderTop: '1px solid #F3F4F6', paddingTop: 12, marginTop: 4 },
  cardAction: { color: '#4F46E5', fontWeight: 600, fontSize: 13 },
  // Login
  loginWrap:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg,#EEF2FF 0%,#F9FAFB 100%)', fontFamily: 'system-ui, sans-serif' },
  loginCard:  { background: '#fff', borderRadius: 16, padding: '40px 36px', width: 360,
                boxShadow: '0 16px 48px rgba(0,0,0,0.1)' },
  logo:       { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  loginTitle: { textAlign: 'center', margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111827' },
  loginSub:   { textAlign: 'center', color: '#6B7280', fontSize: 13, margin: '0 0 28px' },
  input:      { display: 'block', width: '100%', boxSizing: 'border-box', border: '1px solid #D1D5DB',
                borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 12, outline: 'none' },
  error:      { color: '#EF4444', fontSize: 13, margin: '-6px 0 12px' },
  btnPrimary: { display: 'block', width: '100%', background: '#4F46E5', color: '#fff', border: 'none',
                borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
};
