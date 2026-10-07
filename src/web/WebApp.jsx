import { Navigate, Route, Routes } from 'react-router-dom';
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
 * THE WEBSITE SCREENS (user, 2026-10-07), mounted at /web inside the main panel
 * (src/App.jsx): gaadipe.in's live customers, visits, journeys, leads, payments
 * and controls, drawn in the main panel's frame with its sidebar and title bar.
 */
export default function WebApp() {
  return (
    <PrefsProvider><LiveProvider>
      <Layout>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="live" element={<Live />} />
          <Route path="log" element={<Log />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerRoom />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="sessions/:id" element={<SessionRoom />} />
          <Route path="visitors" element={<Visitors />} />
          <Route path="free-checks" element={<FreeChecks />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="sources" element={<Sources />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="api" element={<ApiMonitor />} />
          <Route path="health" element={<Health />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="audit" element={<Audit />} />
          <Route path="emails" element={<Emails />} />
          <Route path="admins" element={<Admins />} />
          <Route path="settings" element={<Settings />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="leads" element={<Leads />} />
          <Route path="insights" element={<Insights />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="vehicles/:reg" element={<Vehicles />} />
          <Route path="broadcast" element={<Broadcast />} />
          <Route path="transfers" element={<Transfers />} />
          <Route path="server-log" element={<ServerLog />} />
          <Route path="search" element={<Search />} />
          <Route path="*" element={<Navigate to="/web" replace />} />
        </Routes>
      </Layout>
    </LiveProvider></PrefsProvider>
  );
}
