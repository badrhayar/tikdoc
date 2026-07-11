import { useState } from 'react';
import PasswordInput from '../components/PasswordInput';
import { useApp } from '../context/AppContext';
import { useViewport } from '../hooks/useViewport';
import { GOOGLE_SVG, CITY_OPTS as CITY_LIST, CREDENTIAL_DOCS, SPEC_OPTS, cityCoord } from '../shared.jsx';
import LocationPicker from '../components/LocationPicker';
import PhoneField from '../components/PhoneField';
import Icon from '../components/Icon';
import { createDoctorProfile, uploadCredential, notifyVerification } from '../lib/api';
import Turnstile, { isCaptchaEnabled } from '../components/Turnstile';

const PRIMARY = '#16A06A';
const DARK = '#15314A';
const BORDER = '#EAEFEC';
const MUTED = '#6B7B76';
const INPUT_BG = '#F8FBF9';
const INPUT_BORDER = '#DCE5E0';

const CITY_OPTS = CITY_LIST.map((c) => c.label);

export default function DoctorRegister() {
  const { state, setState, go, authSignUp, isSupabaseConfigured } = useApp();
  const { isMobile } = useViewport();

  const dreg = state.dreg || {
    name: '', spec: 'generaliste', inpe: '', ordre: '',
    city: 'Casablanca', address: '', phone: '', email: '', fee: '300', pass: '', loc: null,
  };

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needConfirm, setNeedConfirm] = useState(false);
  const [docFiles, setDocFiles] = useState({});   // { docType: File }
  const [captcha, setCaptcha] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const resetCaptcha = () => { setCaptcha(''); setCaptchaKey((k) => k + 1); };

  const setDreg = (field, value) => {
    setState({ dreg: { ...state.dreg, [field]: value } });
  };

  const submitDoctor = async () => {
    setError('');
    if (!isSupabaseConfigured) { setError('Supabase non configuré — vérifiez votre fichier .env.'); return; }
    if (!dreg.name || !dreg.spec || !dreg.inpe || !dreg.city || !dreg.phone || !dreg.address || !dreg.email || !dreg.pass) {
      setError('Veuillez remplir tous les champs obligatoires (marqués d’un *).'); return;
    }
    if (dreg.pass.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (dreg.pass !== dreg.pass2) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    const missing = CREDENTIAL_DOCS.filter((d) => d.required && !docFiles[d.key]);
    if (missing.length) { setError('Documents obligatoires manquants : ' + missing.map((d) => d.label).join(', ')); return; }
    if (isCaptchaEnabled() && !captcha) { setError('Veuillez confirmer que vous n’êtes pas un robot.'); return; }
    setBusy(true);
    try {
      // Stash the profile payload BEFORE signUp: if email confirmation is on
      // there is no session yet, and AppContext finishes the registration from
      // this stash on the doctor's first real login.
      let sLat, sLng;
      if (dreg.loc && typeof dreg.loc.lat === 'number') { sLat = dreg.loc.lat; sLng = dreg.loc.lng; }
      else { [sLat, sLng] = cityCoord(dreg.city); }
      try {
        localStorage.setItem('tabibo_pending_dreg', JSON.stringify({
          profile: {
            lat: sLat, lng: sLng, specialty: dreg.spec, city: dreg.city,
            clinicAddress: dreg.address, feeMad: dreg.fee, languages: ['Français', 'Arabe'],
            cnssCnopss: !!(state.dregCnss || state.dregCnops), teleconsultation: false,
            bio: '', cnom: dreg.ordre,
          },
          notify: { doctorName: dreg.name, doctorEmail: dreg.email, specialty: dreg.spec, city: dreg.city, inpe: dreg.inpe, cnom: dreg.ordre },
        }));
      } catch (_) { /* private mode — the direct path below still works */ }
      const res = await authSignUp({
        email: dreg.email.trim(),
        password: dreg.pass,
        fullName: dreg.name,
        phone: dreg.phone,
        cinOrInpe: dreg.inpe,
        role: 'doctor',
        captchaToken: captcha,
      });
      if (!res.session || !res.appUser) {
        setNeedConfirm(true);   // email confirmation required → finish profile after first login
        return;
      }
      let dlat, dlng;
      if (dreg.loc && typeof dreg.loc.lat === 'number') { dlat = dreg.loc.lat; dlng = dreg.loc.lng; }
      else { [dlat, dlng] = cityCoord(dreg.city); }
      const doctorRow = await createDoctorProfile(res.appUser.id, {
        lat: dlat, lng: dlng,
        specialty: dreg.spec,
        city: dreg.city,
        clinicAddress: dreg.address,
        feeMad: dreg.fee,
        languages: ['Français', 'Arabe'],
        cnssCnopss: !!(state.dregCnss || state.dregCnops),
        teleconsultation: false,
        bio: '',
        cnom: dreg.ordre,
      });
      // Upload each submitted credential document — track failures instead of
      // swallowing them (a silently missing document stalls the review).
      const failedDocs = [];
      for (const d of CREDENTIAL_DOCS) {
        const file = docFiles[d.key];
        if (file) {
          try { await uploadCredential({ file, userId: res.appUser.id, doctorId: doctorRow.id, docType: d.key }); }
          catch (_) { failedDocs.push(d.label); }
        }
      }
      // Email the admins that a doctor is awaiting review.
      notifyVerification({ type: 'new_registration', doctorName: dreg.name, doctorEmail: dreg.email, specialty: dreg.spec, city: dreg.city, inpe: dreg.inpe, cnom: dreg.ordre });
      try { localStorage.removeItem('tabibo_pending_dreg'); } catch (_) {}
      // Show the doctor the "pending review" screen.
      setState({
        myDoctor: doctorRow,
        ...(failedDocs.length ? { toast: `⚠ Document(s) non téléversé(s) : ${failedDocs.join(', ')}. Renvoyez-les depuis votre espace.`, toastShow: true } : {}),
      });
      go('doctor');
    } catch (e) {
      setError(e?.message || 'Inscription impossible.');
      resetCaptcha();   // tokens are single-use — refresh for the next attempt
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1.5px solid ${INPUT_BORDER}`,
    background: INPUT_BG,
    fontSize: 14,
    color: DARK,
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: DARK,
    marginBottom: 6,
  };

  const sectionHeadingStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: '0 0 16px',
    padding: '0 0 10px',
    borderBottom: `1px solid ${BORDER}`,
  };

  const cnssActive = state.dregCnss;
  const cnopsActive = state.dregCnops;

  const toggleStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    border: `1.5px solid ${active ? PRIMARY : INPUT_BORDER}`,
    borderRadius: 10,
    background: active ? '#EAF6F0' : '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: active ? PRIMARY : DARK,
    userSelect: 'none',
  });

  const checkboxStyle = (active) => ({
    width: 18,
    height: 18,
    borderRadius: 5,
    border: `2px solid ${active ? PRIMARY : INPUT_BORDER}`,
    background: active ? PRIMARY : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left column: scrollable form */}
      <div
        style={{
          flex: '1.05 1 0',
          overflowY: 'auto',
          padding: isMobile ? '28px 18px' : '40px 48px',
          background: '#fff',
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {/* Logo */}
          <div
            onClick={() => go('home')}
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 36 }}
          >
            <img src="/icons/icon-192.png" alt="Tabibo" style={{ width: 36, height: 36, borderRadius: 10 }} />
            <span style={{ fontWeight: 700, fontSize: 22, color: DARK, letterSpacing: '-0.3px' }}>Tabib<span style={{ color: '#16A06A' }}>o</span></span>
          </div>

          {/* Free-trial banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#E9F8F0,#DBF1E6)', border: '1px solid #C3E8D8', borderRadius: 14, padding: '14px 18px', marginBottom: 22 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: '#fff', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px -4px rgba(22,160,106,0.5)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0E7C52' }}>Commencez votre essai gratuit de 14 jours</div>
              <div style={{ fontSize: 12.5, color: '#1F6B4D' }}>Aucun paiement à l'inscription. Profitez de toutes les fonctionnalités pendant 14 jours.</div>
            </div>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>
            Inscription médecin
          </h1>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 30px' }}>
            Créez votre espace professionnel sur Tabibo.
          </p>

          {/* Section 1: Identité professionnelle */}
          <div style={{ marginBottom: 32 }}>
            <p style={sectionHeadingStyle}>Identité professionnelle</p>

            {/* Nom complet */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nom complet <span style={{ color: '#C2466A' }}>*</span></label>
              <input
                type="text"
                placeholder="Dr. Prénom Nom"
                value={dreg.name}
                onChange={(e) => setDreg('name', e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Spécialité */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Spécialité <span style={{ color: '#C2466A' }}>*</span></label>
              <select
                value={dreg.spec}
                onChange={(e) => setDreg('spec', e.target.value)}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                {SPEC_OPTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* INPE + N° Ordre */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>INPE <span style={{ color: '#C2466A' }}>*</span></label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={dreg.inpe}
                  onChange={(e) => setDreg('inpe', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>N° Ordre</label>
                <input
                  type="text"
                  placeholder="Nº Ordre médecin"
                  value={dreg.ordre}
                  onChange={(e) => setDreg('ordre', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <p style={{ fontSize: 12, color: MUTED, margin: '0 0 0', lineHeight: 1.5 }}>
              Votre INPE sera vérifié auprès du Ministère de la Santé.
            </p>
          </div>

          {/* Section 2: Cabinet & contact */}
          <div style={{ marginBottom: 32 }}>
            <p style={sectionHeadingStyle}>Cabinet &amp; contact</p>

            {/* Ville + Téléphone */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Ville <span style={{ color: '#C2466A' }}>*</span></label>
                <select
                  value={dreg.city}
                  onChange={(e) => setDreg('city', e.target.value)}
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                >
                  {CITY_OPTS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Téléphone <span style={{ color: '#C2466A' }}>*</span></label>
                <PhoneField value={dreg.phone} onChange={(v) => setDreg('phone', v)} borderColor={INPUT_BORDER} bg={INPUT_BG} />
              </div>
            </div>

            {/* Adresse */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Adresse du cabinet <span style={{ color: '#C2466A' }}>*</span></label>
              <input
                type="text"
                placeholder="123 Rue, Quartier, Ville"
                value={dreg.address}
                onChange={(e) => setDreg('address', e.target.value)}
                style={inputStyle}
              />
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Localisation du cabinet sur la carte</label>
                <LocationPicker
                  city={dreg.city}
                  value={dreg.loc}
                  initialQuery={dreg.address}
                  onChange={(loc) => setDreg('loc', loc)}
                  onResolvePlace={({ address, city }) => {
                    setState({ dreg: { ...dreg, ...(address !== undefined ? { address } : {}), ...(city ? { city } : {}) } });
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 0 }}>
              <label style={labelStyle}>Email professionnel <span style={{ color: '#C2466A' }}>*</span></label>
              <input
                type="email"
                placeholder="docteur@exemple.ma"
                value={dreg.email}
                onChange={(e) => setDreg('email', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Section 3: Tarif & conventionnement */}
          <div style={{ marginBottom: 32 }}>
            <p style={sectionHeadingStyle}>Tarif &amp; conventionnement</p>

            {/* Fee */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Tarif de consultation</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <input
                  type="number"
                  placeholder="300"
                  value={dreg.fee}
                  onChange={(e) => setDreg('fee', e.target.value)}
                  style={{ ...inputStyle, borderRadius: '10px 0 0 10px', flex: 1 }}
                />
                <span
                  style={{
                    padding: '11px 14px',
                    background: INPUT_BG,
                    border: `1.5px solid ${INPUT_BORDER}`,
                    borderLeft: 'none',
                    borderRadius: '0 10px 10px 0',
                    fontSize: 14,
                    fontWeight: 600,
                    color: MUTED,
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                  }}
                >
                  MAD
                </span>
              </div>
            </div>

            {/* Convention toggles */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div
                style={toggleStyle(cnssActive)}
                onClick={() => setState({ dregCnss: !state.dregCnss })}
              >
                <div style={checkboxStyle(cnssActive)}>
                  {cnssActive && '✓'}
                </div>
                CNSS
              </div>
              <div
                style={toggleStyle(cnopsActive)}
                onClick={() => setState({ dregCnops: !state.dregCnops })}
              >
                <div style={checkboxStyle(cnopsActive)}>
                  {cnopsActive && '✓'}
                </div>
                CNOPS
              </div>
            </div>
          </div>

          {/* Section: Credential documents */}
          <div style={{ marginBottom: 28 }}>
            <p style={sectionHeadingStyle}>Documents justificatifs</p>
            <p style={{ fontSize: 12.5, color: MUTED, margin: '-6px 0 16px', lineHeight: 1.6 }}>
              Pour garantir la sécurité des patients, votre compte est vérifié par notre équipe avant activation. Téléversez des copies lisibles (PDF, JPG ou PNG).
            </p>
            {CREDENTIAL_DOCS.map((d) => {
              const f = docFiles[d.key];
              return (
                <div key={d.key} style={{ marginBottom: 12 }}>
                  <label style={{ ...labelStyle, marginBottom: 6 }}>
                    {d.label} {d.required ? <span style={{ color: '#C2466A' }}>*</span> : <span style={{ color: MUTED, fontWeight: 400 }}>(si spécialiste)</span>}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1.5px dashed ${f ? PRIMARY : INPUT_BORDER}`, background: f ? '#EAF6F0' : INPUT_BG, borderRadius: 10, padding: '11px 14px', cursor: 'pointer' }}>
                    <span style={{ color: f ? PRIMARY : MUTED, display: 'flex', flexShrink: 0 }}>
                      {f ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 5v12"/></svg>
                      )}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: f ? DARK : MUTED, fontWeight: f ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f ? f.name : 'Choisir un fichier…'}
                    </span>
                    <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => setDocFiles((m) => ({ ...m, [d.key]: e.target.files?.[0] || undefined }))} />
                  </label>
                </div>
              );
            })}
          </div>

          {/* Section 4: Password + Submit */}
          <div style={{ marginBottom: 28 }}>
            <p style={sectionHeadingStyle}>Mot de passe</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Mot de passe <span style={{ color: '#C2466A' }}>*</span></label>
                <PasswordInput
                  
                  placeholder="••••••••"
                  value={dreg.pass || ''}
                  onChange={(e) => setDreg('pass', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Confirmer le mot de passe <span style={{ color: '#C2466A' }}>*</span></label>
                <PasswordInput
                  
                  placeholder="••••••••"
                  value={dreg.pass2 || ''}
                  onChange={(e) => setDreg('pass2', e.target.value)}
                  style={{ ...inputStyle, borderColor: dreg.pass2 && dreg.pass2 !== dreg.pass ? '#C2466A' : INPUT_BORDER }}
                />
                {dreg.pass2 && dreg.pass2 !== dreg.pass && (
                  <div style={{ fontSize: 11.5, color: '#C2466A', marginTop: 4 }}>Les mots de passe ne correspondent pas.</div>
                )}
              </div>
            </div>

            {error && (
              <div style={{ background: '#FCE7EE', color: '#C2466A', borderRadius: 9, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
                {error}
              </div>
            )}
            {needConfirm && (
              <div style={{ background: '#E7F6EE', color: '#138257', borderRadius: 9, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
                Compte créé ✓ Un email de confirmation vient de vous être envoyé — cliquez sur le lien,
                puis connectez-vous : votre dossier sera transmis automatiquement à notre équipe (réponse sous 24h).
                Vous pourrez téléverser vos documents depuis votre espace après connexion.
              </div>
            )}

            {/* Bot protection */}
            <Turnstile key={captchaKey} onToken={setCaptcha} />

            <button
              onClick={submitDoctor}
              disabled={busy}
              style={{
                width: '100%',
                padding: '13px',
                background: PRIMARY,
                color: '#fff',
                border: 'none',
                borderRadius: 11,
                fontSize: 15,
                fontWeight: 600,
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.7 : 1,
                marginBottom: 20,
              }}
            >
              {busy ? 'Création…' : 'Créer mon compte médecin'}
            </button>


            <p style={{ textAlign: 'center', fontSize: 13, color: MUTED, margin: 0 }}>
              Déjà inscrit ?{' '}
              <span
                onClick={() => go('login')}
                style={{ color: PRIMARY, fontWeight: 600, cursor: 'pointer' }}
              >
                Se connecter
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Right column: green gradient with benefits (desktop only) */}
      <div
        style={{
          flex: '0.95 1 0',
          background: 'linear-gradient(145deg, #12935F 0%, #16A06A 45%, #1DB87A 100%)',
          display: isMobile ? 'none' : 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />

        {/* Tabibo logo card */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '16px 24px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 32,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          }}
        >
          <img src="/icons/icon-192.png" alt="Tabibo" style={{ width: 36, height: 36, borderRadius: 9 }} />
          <span style={{ fontWeight: 700, fontSize: 20, color: DARK, letterSpacing: '-0.3px' }}>Tabib<span style={{ color: '#16A06A' }}>o</span></span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              background: PRIMARY,
              color: '#fff',
              borderRadius: 6,
              padding: '2px 8px',
              letterSpacing: '0.04em',
            }}
          >
            PRO
          </span>
        </div>

        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#fff',
            textAlign: 'center',
            margin: '0 0 32px',
            lineHeight: 1.3,
            maxWidth: 280,
          }}
        >
          Développez votre cabinet avec Tabibo
        </h2>

        {/* Benefits */}
        {[
          {
            icon: 'calendar',
            title: 'Agenda intelligent',
            desc: 'Gérez vos créneaux, blocages et disponibilités en temps réel.',
          },
          {
            icon: 'chat',
            title: 'Rappels WhatsApp automatiques',
            desc: 'Réduisez les absences grâce aux rappels envoyés automatiquement.',
          },
          {
            icon: 'chart',
            title: 'Statistiques & facturation',
            desc: 'Suivez votre activité et générez vos factures en un clic.',
          },
        ].map((b) => (
          <div
            key={b.title}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              marginBottom: 24,
              width: '100%',
              maxWidth: 320,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name={b.icon} size={20} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{b.title}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.80)', margin: 0, lineHeight: 1.5 }}>{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
