import { lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';

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
const DoctorLogin    = lazy(() => import('./pages/DoctorLogin'));
const DoctorRegister = lazy(() => import('./pages/DoctorRegister'));
const DoctorApp      = lazy(() => import('./pages/doctor/DoctorApp'));

const DOCTOR_SCREENS = new Set([
  'doctor', 'dcal', 'dappts', 'dhist', 'dpatients', 'ddocs',
  'davail', 'dnotif', 'dstats', 'dabo', 'dsettings', 'dchat',
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
  login:       DoctorLogin,
  docregister: DoctorRegister,
};

function AppShell() {
  const { state } = useApp();
  const { screen, toast, toastShow } = state;

  const Screen = DOCTOR_SCREENS.has(screen) ? DoctorApp : (SCREEN_MAP[screen] ?? Landing);

  return (
    <>
      <Suspense fallback={null}>
        <Screen />
      </Suspense>

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
