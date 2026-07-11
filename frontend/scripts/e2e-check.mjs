// Tabibo E2E check — run `npm run test:e2e` after `npm run build`.
// Self-contained: starts `vite preview`, walks EVERY screen at desktop and two
// phone widths, fails on React crashes, page errors, or any element bleeding
// past the viewport (scroll containers excluded), then drives the sales demo
// (waiting room → consultation, congés conflict). Exit code 0 = ship it.
//
// Needs a Chromium/Chrome binary. Resolution order:
//   1. $PW_CHROME (explicit path)   2. channel: 'chrome' (system Chrome)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const PORT = 4399;
const BASE = `http://localhost:${PORT}`;
const SCREENS = [
  'home', 'search', 'profile', 'confirm', 'pinfo', 'plogin',
  'pregister', 'paccount', 'about', 'forpatients', 'fordoctors', 'login',
  'docregister', 'admin', 'contact', 'pmessages', 'confidentialite', 'verified',
  'doctor', 'dcal', 'dappts', 'dhist', 'dpatients', 'ddocs', 'davail',
  'dnotif', 'dstats', 'dabo', 'dsettings', 'dchat', 'dshare', 'dprescribe', 'dstaff',
];
const WIDTHS = [1366, 390, 360];

let failures = 0;
const fail = (msg) => { failures++; console.error('  ✗', msg); };

// ── start the preview server ─────────────────────────────────────────────────
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore', detached: true,
});
const waitFor = async (url, ms = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(url); if (r.ok) return; } catch (_) {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('preview server did not start');
};
await waitFor(BASE + '/');

const launchOpts = process.env.PW_CHROME
  ? { executablePath: process.env.PW_CHROME }
  : { channel: 'chrome' };
const browser = await chromium.launch(launchOpts);

try {
  // ── 1. every screen × every width: no crash, no overflow ──────────────────
  for (const width of WIDTHS) {
    console.log(`\n── ${width}px ──`);
    const ctx = await browser.newContext({ viewport: { width, height: 850 } });
    const page = await ctx.newPage();
    for (const scr of SCREENS) {
      const errs = [];
      page.removeAllListeners('pageerror');
      page.on('pageerror', (e) => errs.push(String(e.message).split('\n')[0]));
      await page.goto(BASE + '/', { waitUntil: 'load', timeout: 20000 });
      await page.evaluate((s) => sessionStorage.setItem('tabibo_screen', s), scr);
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(600);
      const res = await page.evaluate(() => {
        const iw = window.innerWidth;
        const crashed = document.body.innerText.includes('Une erreur est survenue');
        let overflow = null;
        for (const el of document.querySelectorAll('body *')) {
          if (!(el instanceof HTMLElement)) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          let p = el.parentElement, scrollable = false;
          while (p && p !== document.body) {
            const pcs = getComputedStyle(p);
            if (/(auto|scroll)/.test(pcs.overflowX) || /(auto|scroll)/.test(pcs.overflow)) { scrollable = true; break; }
            p = p.parentElement;
          }
          if (scrollable) continue;
          if (r.right > iw + 2 || r.left < -2) {
            overflow = `${el.tagName.toLowerCase()} "${(el.innerText || '').trim().slice(0, 30)}" R${Math.round(r.right)}/${iw}`;
            break;
          }
        }
        return { crashed, overflow };
      });
      if (res.crashed) fail(`${scr}@${width}: CRASH (ErrorBoundary)`);
      if (res.overflow) fail(`${scr}@${width}: OVERFLOW ${res.overflow}`);
      if (errs.length) fail(`${scr}@${width}: pageerror ${errs[0]}`);
    }
    await ctx.close();
    console.log('  screens done');
  }

  // ── 2. sales-demo interactions (real clicks, seeded data) ─────────────────
  console.log('\n── demo interactions ──');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/fordoctors', { waitUntil: 'domcontentloaded' });
  await page.getByText('Essayer la démo interactive', { exact: false }).first().click();
  await page.waitForTimeout(1200);

  if (await page.getByText('Ma journée', { exact: false }).count() === 0) fail('demo: dashboard did not load');
  // waiting room → consultation
  const move = page.getByText('Consultation', { exact: true }).first();
  if (await move.count()) {
    await move.click();
    await page.waitForTimeout(500);
    if (await page.getByText('En consultation', { exact: false }).count() === 0) fail('demo: consultation strip missing after move');
  }
  // congés conflict detection
  await page.getByText('Disponibilités', { exact: true }).first().click();
  await page.waitForTimeout(900);
  const today = await page.evaluate(() => {
    const d = new Date(); const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
  const dates = page.locator('input[type=date]');
  await dates.nth(0).fill(today);
  await dates.nth(1).fill(today);
  await page.getByText("Enregistrer l'absence", { exact: false }).click();
  await page.waitForTimeout(500);
  if (await page.getByText('rendez-vous à venir pendant cette période', { exact: false }).count() === 0) {
    fail('demo: congés conflict warning missing');
  }
  await ctx.close();
} finally {
  await browser.close();
  try { process.kill(-server.pid); } catch (_) { try { server.kill(); } catch (_) {} }
}

if (failures) {
  console.error(`\n✗ E2E: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\n✓ E2E: all screens clean at 1366/390/360 px + demo flows OK');
