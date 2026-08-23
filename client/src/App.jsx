import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Stores from "./pages/Stores";

import ProtectedRoute from "./components/ProtectedRoute";

import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import OwnerDashboard from "./pages/OwnerDashboard";

import { useAuth } from "./context/AuthContext";

function HomeRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === "STORE_OWNER") {
    return <Navigate to="/owner" replace />;
  }

  return <Navigate to="/stores" replace />;
}

function App() {
  return (
    <Routes>

      {/* =========================
          AUTH
      ========================= */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/signup"
        element={<Signup />}
      />

      {/* =========================
          NORMAL USER / STORES
      ========================= */}

      <Route
        path="/stores"
        element={
          <ProtectedRoute>
            <Stores />
          </ProtectedRoute>
        }
      />

      {/* =========================
          ADMIN DASHBOARD
      ========================= */}

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* =========================
          ADMIN USERS
      ========================= */}

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />

      {/* =========================
          STORE OWNER DASHBOARD
      ========================= */}

      <Route
        path="/owner"
        element={
          <ProtectedRoute allowedRoles={["STORE_OWNER"]}>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />

      {/* =========================
          HOME
      ========================= */}

      <Route
        path="/"
        element={<HomeRedirect />}
      />

      {/* =========================
          UNKNOWN ROUTES
      ========================= */}

      <Route
        path="*"
        element={<HomeRedirect />}
      />

    </Routes>
  );
}

export default App;