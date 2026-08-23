import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const name = formData.name.trim();
    const email = formData.email.trim();
    const address = formData.address.trim();
    const password = formData.password;

    // Name validation
    if (name.length < 20 || name.length > 60) {
      setError("Name must be between 20 and 60 characters.");
      return;
    }

    // Address validation
    if (address.length === 0 || address.length > 400) {
      setError("Address must be between 1 and 400 characters.");
      return;
    }

    // Password validation
    if (password.length < 8 || password.length > 16) {
      setError("Password must be between 8 and 16 characters.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("Password must contain at least one special character.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/signup", {
        name,
        email,
        address,
        password,
      });

      alert(
        "Account created successfully! Please login with your new account."
      );

      navigate("/login");
    } catch (error) {
      console.error("Signup error:", error);

      setError(
        error.response?.data?.message ||
          "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">Roxiler Rating</div>

        <h1>Create account</h1>

        <p className="muted">
          Register as a normal user.
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Name</label>

          <input
            type="text"
            name="name"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <small>
            20–60 characters
          </small>

          <label>Email</label>

          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label>Address</label>

          <textarea
            name="address"
            placeholder="Enter your address"
            rows="3"
            value={formData.address}
            onChange={handleChange}
            required
          />

          <label>Password</label>

          <input
            type="password"
            name="password"
            placeholder="8–16 chars, uppercase + special character"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Sign up"}
          </button>
        </form>

        <p className="auth-footer">
          Already registered?{" "}
          <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}