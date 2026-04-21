// dashboard/pages/sites.js
// Add / manage staging sites (in-memory mock — no DB persistence needed for internal use)
import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const DEFAULT_SITES = [
  { id: 'site-acme',  name: 'Acme Corp',     url: 'https://acme-corp.webflow.io' },
  { id: 'site-bloom', name: 'Bloom Finance',  url: 'https://bloom-finance.webflow.io' },
  { id: 'site-nova',  name: 'Nova SaaS',      url: 'https://nova-saas.webflow.io' },
  { id: 'site-peak',  name: 'Peak Outdoors',  url: 'https://peak-outdoors.webflow.io' },
];

function slugify(str) {
  return 'site-' + str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function Sites() {
  const [sites, setSites]   = useState(DEFAULT_SITES);
  const [name,  setName]    = useState('');
  const [url,   setUrl]     = useState('');
  const [copied, setCopied] = useState('');

  function addSite(e) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setSites(prev => [...prev, { id: slugify(name), name: name.trim(), url: url.trim() }]);
    setName(''); setUrl('');
  }

  function removeSite(id) {
    setSites(prev => prev.filter(s => s.id !== id));
  }

  function copyEmbed(site) {
    const apiUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://your-app.onrender.com';
    const tag = `<script src="${apiUrl}/widget.js?siteId=${site.id}&apiUrl=${apiUrl}"></script>`;
    navigator.clipboard.writeText(tag);
    setCopied(site.id);
    setTimeout(() => setCopied(''), 2500);
  }

  return (
    <div style={s.page}>
      <Head><title>Sites — Webflow Approval</title></Head>

      <header style={s.header}>
        <div style={s.headerInner}>
          <Link href="/" style={s.back}>← Dashboard</Link>
          <span style={s.brand}>💬 Sites</span>
        </div>
      </header>

      <main style={s.main}>
        <h2 style={s.title}>Manage Staging Sites</h2>
        <p style={s.sub}>
          Sites below are also editable in <code>pages/index.js → STAGING_SITES</code>.
          Changes here are in-memory only (refresh to reset).
        </p>

        {/* Add form */}
        <form onSubmit={addSite} style={s.form}>
          <input style={s.input} placeholder="Client name" value={name} onChange={e => setName(e.target.value)} required />
          <input style={s.input} placeholder="Staging URL (https://…)" value={url} onChange={e => setUrl(e.target.value)} required />
          <button style={s.btnAdd} type="submit">+ Add Site</button>
        </form>

        {/* Table */}
        <div style={s.table}>
          <div style={s.thead}>
            <span style={{...s.th, flex:2}}>Name</span>
            <span style={{...s.th, flex:1}}>Site ID</span>
            <span style={{...s.th, flex:3}}>URL</span>
            <span style={{...s.th, flex:2}}>Actions</span>
          </div>
          {sites.map(site => (
            <div key={site.id} style={s.row}>
              <span style={{...s.td, flex:2, fontWeight:600}}>{site.name}</span>
              <span style={{...s.td, flex:1}}>
                <code style={s.code}>{site.id}</code>
              </span>
              <span style={{...s.td, flex:3}}>
                <a href={site.url} target="_blank" rel="noopener noreferrer" style={s.link}>{site.url}</a>
              </span>
              <span style={{...s.td, flex:2, gap:8, display:'flex'}}>
                <Link href={`/feedback/${site.id}`} style={s.btnView}>View Feedback</Link>
                <button style={s.btnCopy} onClick={() => copyEmbed(site)}>
                  {copied === site.id ? '✅ Copied!' : '📋 Embed'}
                </button>
                <button style={s.btnRemove} onClick={() => removeSite(site.id)}>✕</button>
              </span>
            </div>
          ))}
        </div>

        {/* Embed instructions */}
        <div style={s.instructions}>
          <h3 style={s.instrTitle}>How to embed the widget in Webflow</h3>
          <ol style={s.instrList}>
            <li>Click <strong>📋 Embed</strong> to copy the script tag for a site.</li>
            <li>In Webflow, go to <strong>Project Settings → Custom Code → Footer Code</strong>.</li>
            <li>Paste the script tag and publish your site.</li>
            <li>The 💬 Review button will appear on your staging site automatically.</li>
          </ol>
          <pre style={s.pre}>{`<script
  src="https://your-app.onrender.com/widget.js?siteId=site-acme&apiUrl=https://your-app.onrender.com"
></script>`}</pre>
        </div>
      </main>
    </div>
  );
}

const s = {
  page:       { minHeight: '100vh', background: '#F9FAFB', fontFamily: 'system-ui,sans-serif' },
  header:     { background: '#fff', borderBottom: '1px solid #E5E7EB' },
  headerInner:{ maxWidth: 960, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 },
  back:       { color: '#4F46E5', textDecoration: 'none', fontSize: 14 },
  brand:      { fontWeight: 700, fontSize: 16, color: '#111827' },
  main:       { maxWidth: 960, margin: '0 auto', padding: '40px 24px' },
  title:      { fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 6px' },
  sub:        { color: '#6B7280', fontSize: 13, margin: '0 0 28px' },
  form:       { display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  input:      { flex: '1 1 200px', border: '1px solid #D1D5DB', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none' },
  btnAdd:     { background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  table:      { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' },
  thead:      { display: 'flex', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', padding: '10px 16px' },
  th:         { color: '#6B7280', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' },
  row:        { display: 'flex', padding: '12px 16px', borderBottom: '1px solid #F3F4F6', alignItems: 'center' },
  td:         { fontSize: 14, color: '#374151' },
  code:       { background: '#F3F4F6', borderRadius: 4, padding: '2px 6px', fontSize: 12, fontFamily: 'monospace' },
  link:       { color: '#4F46E5', textDecoration: 'none', fontSize: 13 },
  btnView:    { background: '#EEF2FF', color: '#4F46E5', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' },
  btnCopy:    { background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnRemove:  { background: 'none', border: '1px solid #FECACA', color: '#EF4444', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' },
  instructions:{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginTop: 28 },
  instrTitle: { fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 12px' },
  instrList:  { paddingLeft: 20, color: '#374151', fontSize: 14, lineHeight: 1.8, margin: '0 0 16px' },
  pre:        { background: '#F3F4F6', borderRadius: 8, padding: 14, fontSize: 12, fontFamily: 'monospace', overflowX: 'auto', margin: 0 },
};
