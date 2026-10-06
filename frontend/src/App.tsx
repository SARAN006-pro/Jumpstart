import { useEffect, type ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "./store/auth";
import FloatingTimer from "./components/timer/FloatingTimer";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Roadmaps from "./pages/Roadmaps";
import RoadmapDetail from "./pages/RoadmapDetail";
import Resources from "./pages/Resources";
import Notes from "./pages/Notes";
import Goals from "./pages/Goals";
import Progress from "./pages/Progress";
import Certifications from "./pages/Certifications";
import Projects from "./pages/Projects";
import Schedule from "./pages/Schedule";
import Settings from "./pages/Settings";

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink-800">
        <Loader2 size={28} className="animate-spin text-ember-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <FloatingTimer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/app/roadmaps"
          element={
            <RequireAuth>
              <Roadmaps />
            </RequireAuth>
          }
        />
        <Route
          path="/app/roadmaps/:id"
          element={
            <RequireAuth>
              <RoadmapDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/app/resources"
          element={
            <RequireAuth>
              <Resources />
            </RequireAuth>
          }
        />
        <Route
          path="/app/notes"
          element={
            <RequireAuth>
              <Notes />
            </RequireAuth>
          }
        />
        <Route
          path="/app/goals"
          element={
            <RequireAuth>
              <Goals />
            </RequireAuth>
          }
        />
        <Route
          path="/app/progress"
          element={
            <RequireAuth>
              <Progress />
            </RequireAuth>
          }
        />
        <Route
          path="/app/certifications"
          element={
            <RequireAuth>
              <Certifications />
            </RequireAuth>
          }
        />
      <Route
        path="/app/projects"
        element={
          <RequireAuth>
            <Projects />
          </RequireAuth>
        }
      />
      <Route
        path="/app/schedule"
        element={
          <RequireAuth>
            <Schedule />
          </RequireAuth>
        }
      />
      <Route
        path="/app/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
