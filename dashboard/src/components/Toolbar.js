// dashboard/src/components/Toolbar.js
// Reusable toolbar component showing annotation type icons.
// Used in the feedback detail view to visually distinguish item types.

import React from 'react';

const TOOLS = [
  { type: 'pin',        icon: '📍', label: 'Pin',        desc: 'Click-to-mark a specific location' },
  { type: 'draw',       icon: '✏️', label: 'Draw',       desc: 'Freehand drawing on the page'      },
  { type: 'text',       icon: '💬', label: 'Text',       desc: 'Typed comment at a position'       },
  { type: 'screenshot', icon: '📸', label: 'Screenshot', desc: 'Full-page screenshot captured'     },
];

export default function Toolbar({ activeTool, onSelect }) {
  return (
    <div style={styles.wrap}>
      {TOOLS.map(tool => (
        <button
          key={tool.type}
          title={tool.desc}
          style={{
            ...styles.btn,
            ...(activeTool === tool.type ? styles.active : {}),
          }}
          onClick={() => onSelect && onSelect(tool.type)}
        >
          <span style={styles.icon}>{tool.icon}</span>
          <span style={styles.label}>{tool.label}</span>
        </button>
      ))}
    </div>
  );
}

const styles = {
  wrap:  {
    display: 'flex',
    gap: 8,
    background: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    padding: '8px 10px',
    width: 'fit-content',
  },
  btn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    background: '#F9FAFB',
    border: '2px solid transparent',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'background .1s, border-color .1s',
    minWidth: 56,
  },
  active: {
    background: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  icon:  { fontSize: 20 },
  label: { fontSize: 11, fontWeight: 600, color: '#6B7280', fontFamily: 'system-ui,sans-serif' },
};
