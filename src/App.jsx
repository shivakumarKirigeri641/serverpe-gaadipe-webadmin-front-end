import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './lib/session.jsx';
import Layout from './components/Layout.jsx';
import SignIn from './pages/SignIn.jsx';
import Overview from './pages/Overview.jsx';
import Sources from './pages/Sources.jsx';
import Visitors from './pages/Visitors.jsx';
import Customers from './pages/Customers.jsx';
import FreeChecks from './pages/FreeChecks.jsx';

/**
 * THE WEBSITE ADMIN (user, 2026-10-07): gaadipe.in and its chat on their own —
 * where visitors come from, what they do, who signs in and who pays.
 * Read-only; the main admin panel still does everything else.
 */
export default function App() {
  const { me, ready } = useSession();
  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted">Loading…</div>;
  if (!me) return <SignIn />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/sources" element={<Sources />} />
        <Route path="/visitors" element={<Visitors />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/free-checks" element={<FreeChecks />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
