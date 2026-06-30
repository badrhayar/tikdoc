import { lazy, Suspense, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { subscriptionState } from './shared.jsx';
import PWAInstall from './components/PWAInstall';
import ErrorBoundary from './components/ErrorBoundary';

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
};

function AppShell() {
  const { state, setState } = useApp();
  const { screen, toast, toastShow } = state;

  // Auto-dismiss the toast a few seconds after it appears.
  useEffect(() => {
    if (!toastShow) return;
    const id = setTimeout(() => setState({ toastShow: false }), 2600);
    return () => clearTimeout(id);
  }, [toastShow, toast]);

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
