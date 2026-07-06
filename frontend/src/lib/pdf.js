// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · client-side PDF generation (jsPDF) for ordonnances and receipts.
// All documents share a clean A5/A4 letterhead built from the doctor's profile.
// ─────────────────────────────────────────────────────────────────────────────
import { jsPDF } from 'jspdf';

const GREEN = [22, 160, 106];
const DARK = [21, 49, 74];
const MUT = [107, 123, 118];

// Load the Tabibo brand icon once and cache it as a PNG data URL so it can be
// embedded in generated PDFs (same-origin → the canvas never taints). Resolves
// to null if unavailable, and the letterhead falls back to the wordmark alone.
let _logoPromise = null;
export function loadBrandLogo() {
  if (_logoPromise) return _logoPromise;
  _logoPromise = new Promise((resolve) => {
    try {
      if (typeof document === 'undefined') { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || 192;
          c.height = img.naturalHeight || 192;
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = '/icons/icon-192.png';
    } catch { resolve(null); }
  });
  return _logoPromise;
}

// Shared header: brand + doctor identity block. Returns the y to continue from.
function header(doc, d) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...DARK);
  doc.text(d.doctorName || 'Médecin', 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...MUT);
  let y = 28;
  if (d.specialty) { doc.text(d.specialty, 14, y); y += 5; }
  const ids = [d.cnom ? `Ordre n° ${d.cnom}` : null, d.inpe ? `INPE ${d.inpe}` : null].filter(Boolean).join('   ·   ');
  if (ids) { doc.text(ids, 14, y); y += 5; }
  const loc = [d.clinic, d.city].filter(Boolean).join(', ');
  if (loc) { doc.text(loc, 14, y); y += 5; }
  if (d.phone) { doc.text(String(d.phone), 14, y); y += 5; }

  // Tabibo brand mark (icon + two-tone wordmark), top-right — matches the site.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const tw1 = doc.getTextWidth('Tabib');
  const tw2 = doc.getTextWidth('o');
  const logoSz = d.logo ? 7.4 : 0;
  const gap = d.logo ? 2.4 : 0;
  const total = logoSz + gap + tw1 + tw2;
  const bx = W - 14 - total;
  const by = 19.5;
  if (d.logo) { try { doc.addImage(d.logo, 'PNG', bx, by - 6, logoSz, logoSz); } catch (e) { /* ignore */ } }
  const tx = bx + logoSz + gap;
  doc.setTextColor(...DARK);
  doc.text('Tabib', tx, by);
  doc.setTextColor(...GREEN);
  doc.text('o', tx + tw1, by);

  doc.setDrawColor(225, 232, 228);
  doc.line(14, y + 1, W - 14, y + 1);
  return y + 10;
}

function footer(doc) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUT);
  doc.text('Document généré via Tabibo · tabibo.ma', W / 2, H - 10, { align: 'center' });
}

function patientLine(doc, d, y) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text(`Patient : ${d.patientName || '—'}`, 14, y);
  doc.setTextColor(...MUT);
  doc.text(d.dateLabel || '', W - 14, y, { align: 'right' });
  return y + 8;
}

/** Ordonnance médicale. items: [{drug,dosage,duration,instructions}]. */
export function buildPrescriptionPDF(d) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = header(doc, d);
  y = patientLine(doc, d, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...GREEN);
  doc.text('Ordonnance', 14, y + 2);
  // Unique reference + QR (anti-falsification; FSE-ready) top-right of the body.
  if (d.ref) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUT);
    doc.text(`Réf : ${d.ref}`, W - 14, y - 2, { align: 'right' });
    if (d.qr) { try { doc.addImage(d.qr, 'PNG', W - 36, y + 1, 22, 22); } catch (e) { /* ignore */ } }
  }
  y += 10;

  doc.setFontSize(11);
  (d.items || []).forEach((it, i) => {
    if (y > 250) { doc.addPage(); y = 24; }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(`${i + 1}.  ${it.drug || ''}`, 16, y);
    y += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUT);
    const sub = [it.dosage, it.duration].filter(Boolean).join('  ·  ');
    if (sub) { doc.text(sub, 22, y); y += 5; }
    if (it.instructions) {
      const lines = doc.splitTextToSize(it.instructions, W - 40);
      doc.text(lines, 22, y); y += lines.length * 5;
    }
    y += 3;
  });

  if (d.notes) {
    y += 4;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...MUT);
    const lines = doc.splitTextToSize(`Remarques : ${d.notes}`, W - 28);
    doc.text(lines, 14, y); y += lines.length * 5;
  }

  // Signature box (bottom-right)
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(225, 232, 228);
  doc.line(W - 78, H - 38, W - 14, H - 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUT);
  doc.text('Signature et cachet', W - 46, H - 33, { align: 'center' });

  footer(doc);
  return doc;
}

/** Reçu de paiement for a paid consultation. */
export function buildReceiptPDF(d) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();
  let y = header(doc, d);
  y = patientLine(doc, d, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...GREEN);
  doc.text('Reçu de paiement', 14, y + 2);
  y += 12;

  const row = (label, value, bold) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...MUT);
    doc.text(label, 16, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...DARK);
    doc.text(String(value ?? '—'), W - 16, y, { align: 'right' });
    y += 8;
  };
  row('Prestation', d.service || 'Consultation');
  row('Mode de paiement', d.method || '—');
  if (d.ref) row('Référence', d.ref);
  doc.setDrawColor(225, 232, 228); doc.line(16, y - 2, W - 16, y - 2); y += 4;
  row('Montant réglé', `${d.amount ?? 0} MAD`, true);

  footer(doc);
  return doc;
}

export function pdfDownload(doc, filename) { doc.save(filename); }
export function pdfDataUrl(doc) { return doc.output('datauristring'); }
export function pdfOpen(doc) {
  try { doc.output('dataurlnewwindow'); }
  catch { window.open(doc.output('bloburl'), '_blank'); }
}
