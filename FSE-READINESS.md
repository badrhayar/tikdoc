# Tier 3 — FSE / e-claim readiness (scoping)

Morocco is dematerializing AMO reimbursement (Feuille de Soins Électronique) and
prescriptions. This is Tabibo's **moat**: the first software a doctor can't run
their practice without. This doc scopes what's real, what we build now, and what
waits for the government channel. (Sources: CNSS, ANAM, ADD, Ministry of Health,
Médias24, Le Matin — mid-2026.)

## The landscape (confirmed)

- **FSE is run by the CNSS.** Pilot in **Kénitra ~end-March 2026**, progressive
  national rollout **April–June 2026**, with a paper+electronic hybrid transition.
- **How it works:** the doctor generates the care sheet from their software → a
  **unique FSE number + QR code** → the patient's prescription carries it → the
  pharmacist scans it → dispensation auto-reports to CNSS. No paper, no vignettes.
- **Two integration channels:** (1) interoperability with the doctor's existing
  software (this is us), or (2) a free CNSS "Portail FSE".
- **Integration is gated by a CNSS homologation (certification) program with a
  PROPRIETARY protocol.** As of now there is **no public API, OpenAPI spec, or
  developer portal** — the protocol is shared privately with certified vendors
  (e.g. Nabady is a key technical partner already interfacing with CNSS).
- **Referentials the FSE uses:**
  - Prescriber ID: **INPE** — 9 digits, issued by ANAM, mandatory on AMO forms.
  - Patient ID: **CNSS immatriculation number** + CIN (no unified patient ID yet).
  - Acts: **NGAP** (lettres clés C/CS, K/KC, Z, B… × coefficient) priced by the
    **TNR** (ANAM reference tariff). A new **CCAM (~7000 acts)** was published in
    2024 but is **not yet tariffed/operational**. NGAP is downloadable as open
    data from data.gov.ma.
  - Medications: Ministry **GMR** (Guide des Médicaments Remboursables), keyed on
    **EAN-13 + DCI** with PPM public prices.

## The hard constraint

**We cannot build a live FSE integration today** — there is no public API and the
system is in pilot. Live submission requires joining the CNSS vendor-certification
program once it opens to third parties (expected as rollout proceeds, 2026).

So Tier 3 = **be certification-ready**: capture exactly the data the FSE needs,
align the prescription with the national "unique code + QR" model, and ingest the
official referentials — so that when CNSS opens onboarding we are days, not
months, from homologation.

## ⚠️ Compliance action item — CNDP (do this regardless of FSE)

Health data is **"sensitive"** under Law 09-08. A health-tech company must obtain
**prior CNDP authorization** (not a simple declaration) before processing — and
CNDP began **active enforcement in 2025 with healthcare as a named priority**.
Two concrete actions:
1. **File the CNDP prior-authorization request** for Tabibo's processing of
   patient health data (form F112-style: purposes, security, recipients,
   retention, who can access).
2. **Check your Supabase project region.** Cross-border transfer rules (Art.
   43–44): the EU/EEA is on CNDP's adequate list; **the USA is not**. If your
   Supabase project is hosted in a US region, hosting Moroccan medical data there
   needs an Art. 44 basis or CNDP authorization — **prefer an EU region** (e.g.
   Frankfurt) to rely on adequacy. Verify and, if needed, migrate the project.
   Penalties run to **300,000 MAD + prison**, doubled for companies.

## What we build now (FSE-readiness roadmap)

**Step 1 — done in this release:**
- `prescriptions.ref` — a unique reference printed + QR-encoded on every
  ordonnance (anti-falsification; the field we swap for the CNSS FSE number once
  issued). Aligns us with the national "code + QR" prescription model today.
- `doctor_patients.amo_number` — capture the patient's AMO/immatriculation number
  (a required FSE field), alongside the existing insurer (CNSS/CNOPS/private).

**Step 2 — next:**
- **Acts & tarification:** ingest the NGAP open-data list; let a doctor tag each
  consultation/act with its NGAP key+coefficient and TNR base, so a structured,
  priced act is attached to every visit (the core of an FSE line).
- **Feuille de soins generator:** a structured care-sheet (PDF + stored record)
  carrying doctor INPE, patient AMO number, acts (NGAP) + amounts — the exact FSE
  payload, ready to print today and to transmit later.
- **GMR medication picker:** autocomplete prescriptions from the GMR (EAN-13 +
  DCI + PPM), so prescriptions become coded, not free-text.

**Step 3 — when CNSS opens vendor onboarding:**
- Apply for **homologation**; implement the CNSS proprietary protocol behind the
  data we already capture; replace our `ref` with the issued FSE number; switch
  the QR to the CNSS-specified payload. Because the data model is already in
  place, this becomes an adapter, not a rebuild.

## Watch list
- CNSS vendor-certification / "éditeurs" onboarding announcement (the trigger).
- CCAM tariffication (would change the act-coding target from NGAP to CCAM).
- Law 54.23 CNOPS→CNSS merger (BO 29 Jan 2026) — consolidates AMO under CNSS.
