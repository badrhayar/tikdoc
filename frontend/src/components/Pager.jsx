import { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Shared pagination for every long list in the app (patient + doctor).
//   const pager = usePager(items, 5);
//   pager.items                       → the rows of the current page
//   <Pager pager={pager} lang={lang} compact={isMobile} />
// Desktop: "Affichage X–Y sur N" + ← Précédent / Suivant →.
// Mobile (compact): small round ‹ › arrows with "page / pages" between them.
// Renders nothing when the list fits on one page — short lists stay untouched.
// ─────────────────────────────────────────────────────────────────────────────

const L = {
  fr: { prev: 'Précédent', next: 'Suivant', of: (f, t, n) => `Affichage ${f}–${t} sur ${n}` },
  en: { prev: 'Previous', next: 'Next', of: (f, t, n) => `Showing ${f}–${t} of ${n}` },
  ar: { prev: 'السابق', next: 'التالي', of: (f, t, n) => `عرض ${f}–${t} من ${n}` },
};

export function usePager(items, perPage = 5) {
  const [page, setPage] = useState(0);
  const list = items || [];
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const cur = Math.min(page, pages - 1);   // auto-clamp when a filter shrinks the list
  return {
    items: list.slice(cur * perPage, cur * perPage + perPage),
    page: cur,
    pages,
    total,
    from: total ? cur * perPage + 1 : 0,
    to: Math.min(total, (cur + 1) * perPage),
    prev: () => setPage(Math.max(0, cur - 1)),
    next: () => setPage(Math.min(pages - 1, cur + 1)),
    reset: () => setPage(0),
  };
}

const Chevron = ({ dir }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    {dir === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
  </svg>
);

export default function Pager({ pager, lang = 'fr', compact = false, style }) {
  if (!pager || pager.pages <= 1) return null;
  const t = L[lang] || L.fr;
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const canPrev = pager.page > 0;
  const canNext = pager.page < pager.pages - 1;
  // "back" points against the reading direction, "forward" with it.
  const backGlyph = rtl ? 'right' : 'left';
  const fwdGlyph = rtl ? 'left' : 'right';

  if (compact) {
    const round = (on) => ({
      width: 38, height: 38, borderRadius: '50%', border: '1px solid #D5E5DD',
      background: on ? '#fff' : '#F4F8F5', color: on ? '#15314A' : '#B9C6C0',
      cursor: on ? 'pointer' : 'default', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 0, flexShrink: 0,
    });
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 12, ...style }}>
        <button type="button" aria-label={t.prev} onClick={pager.prev} disabled={!canPrev} style={round(canPrev)}>
          <Chevron dir={backGlyph} />
        </button>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#6B7B76', fontVariantNumeric: 'tabular-nums', minWidth: 44, textAlign: 'center' }}>
          {pager.page + 1} / {pager.pages}
        </span>
        <button type="button" aria-label={t.next} onClick={pager.next} disabled={!canNext} style={round(canNext)}>
          <Chevron dir={fwdGlyph} />
        </button>
      </div>
    );
  }

  const btn = (on, primary) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 15px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: `1.5px solid ${primary && on ? '#0F6E56' : '#D5E5DD'}`,
    background: primary && on ? 'linear-gradient(135deg, #148662 0%, #0F6E56 48%, #0C4A37 100%)' : '#fff',
    color: primary && on ? '#fff' : on ? '#15314A' : '#B9C6C0',
    cursor: on ? 'pointer' : 'default',
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', paddingTop: 12, ...style }}>
      <span style={{ fontSize: 12.5, color: '#6B7B76', fontVariantNumeric: 'tabular-nums' }}>
        {t.of(pager.from, pager.to, pager.total)}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={pager.prev} disabled={!canPrev} style={btn(canPrev, false)}>
          <Chevron dir={backGlyph} /> {t.prev}
        </button>
        <button type="button" onClick={pager.next} disabled={!canNext} style={btn(canNext, true)}>
          {t.next} <Chevron dir={fwdGlyph} />
        </button>
      </div>
    </div>
  );
}
