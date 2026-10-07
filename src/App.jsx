import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './lib/session.jsx';
import { PrefsProvider } from './lib/prefs.jsx';
import { LiveProvider } from './lib/live.jsx';
import Live from './pages/Live.jsx';
import Sessions from './pages/Sessions.jsx';
import SessionRoom from './pages/SessionRoom.jsx';
import CustomerRoom from './pages/CustomerRoom.jsx';
import Analytics from './pages/Analytics.jsx';
import Privacy from './pages/Privacy.jsx';
import Leads from './pages/Leads.jsx';
import Insights from './pages/Insights.jsx';
import Vehicles from './pages/Vehicles.jsx';
import Broadcast from './pages/Broadcast.jsx';
import Transfers from './pages/Transfers.jsx';
import ServerLog from './pages/ServerLog.jsx';
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
    <PrefsProvider><LiveProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/live" element={<Live />} />
          <Route path="/log" element={<Log />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerRoom />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/sessions/:id" element={<SessionRoom />} />
          <Route path="/visitors" element={<Visitors />} />
          <Route path="/free-checks" element={<FreeChecks />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/api" element={<ApiMonitor />} />
          <Route path="/health" element={<Health />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/emails" element={<Emails />} />
          <Route path="/admins" element={<Admins />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/:reg" element={<Vehicles />} />
          <Route path="/broadcast" element={<Broadcast />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/server-log" element={<ServerLog />} />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </LiveProvider></PrefsProvider>
  );
}
