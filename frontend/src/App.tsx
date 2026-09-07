import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { Landing } from "./pages/Landing";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { DashboardPage } from "./pages/Dashboard";
import { TripsPage } from "./pages/TripsPage";
import { TripWorkspace } from "./pages/trip/TripWorkspace";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminPage } from "./pages/AdminPage";
import { InsightsPage } from "./pages/InsightsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { PublicShare } from "./pages/PublicShare";
import { DiscoverPage } from "./pages/DiscoverPage";

function Guard({ role, children }: { role?: "traveler" | "admin"; children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-paper text-ink-soft">Opening TripWise…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/app"} replace />;
  }
  return <>{children}</>;
}

function Home() {
  const { user, ready } = useAuth();
  if (!ready) return <Landing />;
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/app" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/p/:token" element={<PublicShare />} />
      <Route
        element={
          <Guard>
            <AppShell />
          </Guard>
        }
      >
        <Route
          path="/app"
          element={
            <Guard role="traveler">
              <DashboardPage />
            </Guard>
          }
        />
        <Route
          path="/app/discover"
          element={
            <Guard role="traveler">
              <DiscoverPage />
            </Guard>
          }
        />
        <Route
          path="/app/trips"
          element={
            <Guard role="traveler">
              <TripsPage />
            </Guard>
          }
        />
        <Route
          path="/app/trips/:id"
          element={
            <Guard role="traveler">
              <TripWorkspace />
            </Guard>
          }
        />
        <Route
          path="/app/calendar"
          element={
            <Guard role="traveler">
              <CalendarPage />
            </Guard>
          }
        />
        <Route
          path="/app/insights"
          element={
            <Guard role="traveler">
              <InsightsPage />
            </Guard>
          }
        />
        <Route path="/app/profile" element={<ProfilePage />} />
        <Route
          path="/admin"
          element={
            <Guard role="admin">
              <AdminPage />
            </Guard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
