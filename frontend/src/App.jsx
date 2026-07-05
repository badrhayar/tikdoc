import { lazy, Suspense, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { subscriptionState, docDisplayName } from './shared.jsx';
import { subscribeToIncomingCalls } from './lib/api';
import PWAInstall from './components/PWAInstall';
import ErrorBoundary from './components/ErrorBoundary';
import TeleconsultRoom from './components/TeleconsultRoom';

const Landing        = lazy(() => import('./pages/Landing'));
const Search         = lazy(() => import('./pages/Search'));
const Profile        = lazy(() => import('./pages/Profile'));
const Confirm        = lazy(() => import('./pages/Confirm'));
const Invoice        = lazy(() => import('./pages/Invoice'));
const SMS            = lazy(() => import('./pages/SMS'));
const BookingInfo    = lazy(() => import('./pages/BookingInfo'));
const PatientLogin   = lazy(() => import('./pages/PatientLogin'));
const PatientRegister = lazy(() => import('./pages/PatientRegister'));
const PatientAccount = lazy(() => import('./pages/PatientAccount'));
const About          = lazy(() => import('./pages/About'));
const ForPatients    = lazy(() => import('./pages/ForPatients'));
const ForDoctors     = lazy(() => import('./pages/ForDoctors'));
const DoctorLogin    = lazy(() => import('./pages/DoctorLogin'));
const DoctorRegister = lazy(() => import('./pages/DoctorRegister'));
const DoctorApp      = lazy(() => import('./pages/doctor/DoctorApp'));
const Admin          = lazy(() => import('./pages/Admin'));
const DoctorPending  = lazy(() => import('./pages/DoctorPending'));
const DoctorBlocked  = lazy(() => import('./pages/DoctorBlocked'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword'));
const Contact        = lazy(() => import('./pages/Contact'));
const PatientMessages = lazy(() => import('./pages/PatientMessages'));

const DOCTOR_SCREENS = new Set([
  'doctor', 'dcal', 'dappts', 'dhist', 'dpatients', 'ddocs',
  'davail', 'dnotif', 'dstats', 'dabo', 'dsettings', 'dchat', 'dshare',
  'dprescribe', 'dstaff',
]);

const SCREEN_MAP = {
  home:        Landing,
  search:      Search,
  profile:     Profile,
  confirm:     Confirm,
  invoice:     Invoice,
  sms:         SMS,
  pinfo:       BookingInfo,
  plogin:      PatientLogin,
  pregister:   PatientRegister,
  paccount:    PatientAccount,
  about:       About,
  forpatients: ForPatients,
  fordoctors:  ForDoctors,
  login:       DoctorLogin,
  docregister: DoctorRegister,
  admin:       Admin,
  forgotpw:    ForgotPassword,
  resetpw:     ResetPassword,
  contact:     Contact,
  pmessages:   PatientMessages,
};

function AppShell() {
  const { state, setState } = useApp();
  const { screen, toast, toastShow } = state;
  const [incomingCall, setIncomingCall] = useState(null);

  // Auto-dismiss the toast a few seconds after it appears.
  useEffect(() => {
    if (!toastShow) return;
    const id = setTimeout(() => setState({ toastShow: false }), 2600);
    return () => clearTimeout(id);
  }, [toastShow, toast]);

  // Ring the signed-in user when a doctor starts a teleconsultation (app-wide).
  const meId = state.appUser?.id;
  useEffect(() => {
    if (!meId) return undefined;
    const unsub = subscribeToIncomingCalls(meId, (payload) => setIncomingCall(payload));
    return () => unsub();
  }, [meId]);
  // Incoming call rings for ~45s if unanswered.
  useEffect(() => {
    if (!incomingCall) return undefined;
    const id = setTimeout(() => setIncomingCall(null), 45000);
    return () => clearTimeout(id);
  }, [incomingCall]);

  const myName = state.appUser?.full_name || state.patient?.name || 'Utilisateur';

  // Gate a signed-in doctor: unverified → pending screen; verified but
  // blocked / expired subscription → blocked screen.
  const md = state.myDoctor;
  const isDoctor = state.appUser?.role === 'doctor';
  const notApproved = isDoctor && md && md.verification_status && md.verification_status !== 'approved';
  const sub = isDoctor && md ? subscriptionState(md) : null;
  const blockedDoctor = isDoctor && md && md.verification_status === 'approved' && sub && !sub.canUse;

  let Screen;
  if (DOCTOR_SCREENS.has(screen)) {
    if (notApproved) Screen = DoctorPending;
    else if (blockedDoctor) Screen = DoctorBlocked;
    else Screen = DoctorApp;
  } else {
    Screen = SCREEN_MAP[screen] ?? Landing;
  }

  return (
    <>
      <Suspense fallback={null}>
        <ErrorBoundary resetKey={screen}>
          <Screen />
        </ErrorBoundary>
      </Suspense>

      <PWAInstall />

      {/* Teleconsultation video overlay — launched anywhere via setState({ teleRoom }) */}
      {state.teleRoom && (
        <TeleconsultRoom room={state.teleRoom} displayName={myName} onClose={() => setState({ teleRoom: null })} />
      )}

      {/* Incoming teleconsultation — the patient is "rung" when the doctor starts */}
      {incomingCall && !state.teleRoom && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 250, width: 'min(420px, calc(100vw - 24px))', background: '#fff', borderRadius: 16, boxShadow: '0 18px 50px rgba(13,43,30,0.28)', border: '1px solid #E6EEE9', padding: 16, display: 'flex', alignItems: 'center', gap: 13, animation: 'saRise .22s ease' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#E7F6EE', color: '#16A06A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#15314A' }}>Téléconsultation entrante</div>
            <div style={{ fontSize: 12.5, color: '#6B7B76', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docDisplayName(incomingCall.doctorName, incomingCall.spec)} souhaite démarrer l’appel</div>
          </div>
          <button onClick={() => setIncomingCall(null)} style={{ background: '#F3F4F6', border: 'none', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, fontWeight: 700, color: '#6B7280', cursor: 'pointer', flexShrink: 0 }}>Ignorer</button>
          <button onClick={() => { setState({ teleRoom: incomingCall.room }); setIncomingCall(null); }} style={{ background: 'linear-gradient(135deg,#1AAE74,#12875A)', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 12.5, fontWeight: 700, color: '#fff', cursor: 'pointer', flexShrink: 0 }}>Rejoindre</button>
        </div>
      )}

      {toastShow && (
        <div
          style={{
            position: 'fixed',
            bottom: 26,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 120,
            background: '#15314A',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 10,
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
