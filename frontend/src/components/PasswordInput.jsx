import { useState } from 'react';

// Password field with a show/hide eye — used by every password input in the
// app. Accepts the same props as <input> (value, onChange, placeholder,
// onKeyDown, style…); the eye sits inside the field, RTL-aware.
export default function PasswordInput({ style, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        {...props}
        type={show ? 'text' : 'password'}
        style={{ ...style, width: '100%', boxSizing: 'border-box', paddingInlineEnd: 42 }}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        tabIndex={-1}
        style={{
          position: 'absolute', insetInlineEnd: 6, top: '50%', transform: 'translateY(-50%)',
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer', color: '#6B7B76', padding: 0,
        }}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
        )}
      </button>
    </div>
  );
}
