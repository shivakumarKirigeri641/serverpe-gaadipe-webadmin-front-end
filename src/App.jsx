import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './lib/session.jsx';
import { PrefsProvider } from './lib/prefs.jsx';
import Layout from './components/Layout.jsx';
import SignIn from './pages/SignIn.jsx';
import Overview from './pages/Overview.jsx';
import Sources from './pages/Sources.jsx';
import Visitors from './pages/Visitors.jsx';
import Customers from './pages/Customers.jsx';
import FreeChecks from './pages/FreeChecks.jsx';
import Log from './pages/Log.jsx';
import Emails from './pages/Emails.jsx';
import Alerts from './pages/Alerts.jsx';
import Payments from './pages/Payments.jsx';
import ApiMonitor from './pages/ApiMonitor.jsx';
import Health from './pages/Health.jsx';
import Audit from './pages/Audit.jsx';
import Reports from './pages/Reports.jsx';
import Referrals from './pages/Referrals.jsx';
import Admins from './pages/Admins.jsx';
import Search from './pages/Search.jsx';
import Settings from './pages/Settings.jsx';

/**
 * THE WEBSITE ADMIN (user, 2026-10-07): the operations centre for gaadipe.in —
 * live customers, their journeys, payments, APIs, alerts — on the same server,
 * sign-in and permissions as the main admin panel.
 */
export default function App() {
  const { me, ready } = useSession();
  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted">Loading…</div>;
  if (!me) return <SignIn />;
  return (
    <PrefsProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/log" element={<Log />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/visitors" element={<Visitors />} />
          <Route path="/free-checks" element={<FreeChecks />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/api" element={<ApiMonitor />} />
          <Route path="/health" element={<Health />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/emails" element={<Emails />} />
          <Route path="/admins" element={<Admins />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </PrefsProvider>
  );
}
