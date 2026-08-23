import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user } = response.data;

      // =================================================
      // SAVE JWT + USER
      // =================================================

      login(user, token);

      // =================================================
      // REDIRECT BASED ON ROLE
      // =================================================

      if (user.role === "ADMIN") {
        navigate("/admin", {
          replace: true,
        });
      } else if (
        user.role === "STORE_OWNER"
      ) {
        navigate("/owner", {
          replace: true,
        });
      } else {
        navigate("/stores", {
          replace: true,
        });
      }
    } catch (error) {
      console.error(
        "Login failed:",
        error
      );

      // =================================================
      // INVALID LOGIN
      // =================================================

      if (
        error.response?.status === 401
      ) {
        setError(
          error.response?.data?.message ||
            "Invalid email or password."
        );
      }

      // =================================================
      // FORBIDDEN
      // =================================================

      else if (
        error.response?.status === 403
      ) {
        setError(
          error.response?.data?.message ||
            "You are not allowed to login."
        );
      }

      // =================================================
      // SERVER CONNECTION ERROR
      // =================================================

      else if (!error.response) {
        setError(
          "Cannot connect to server. Make sure the backend is running on port 5001."
        );
      }

      // =================================================
      // OTHER ERROR
      // =================================================

      else {
        setError(
          error.response?.data?.message ||
            "Unable to login. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          Roxiler Rating
        </div>

        <h1>Welcome back</h1>

        <p className="muted">
          Sign in to continue to your account.
        </p>

        <form onSubmit={handleLogin}>
          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            autoComplete="email"
            required
          />

          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            autoComplete="current-password"
            required
          />

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <p className="auth-footer">
          New user?{" "}
          <Link to="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}