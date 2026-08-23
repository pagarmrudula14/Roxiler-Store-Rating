import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    name: "",
    email: "",
    address: "",
    role: "",
    sortBy: "name",
    order: "asc",
  });

  const [showAddForm, setShowAddForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    role: "USER",
  });

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (filters.name) params.name = filters.name;
      if (filters.email) params.email = filters.email;
      if (filters.address) params.address = filters.address;
      if (filters.role) params.role = filters.role;

      params.sortBy = filters.sortBy;
      params.order = filters.order;

      const response = await api.get("/admin/users", { params });

      setUsers(response.data);
    } catch (err) {
      console.error("Get users error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [
    filters.name,
    filters.email,
    filters.address,
    filters.role,
    filters.sortBy,
    filters.order,
  ]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    setFormError("");
    setFormSuccess("");

    if (form.name.trim().length < 20 || form.name.trim().length > 60) {
      setFormError("Name must be between 20 and 60 characters.");
      return;
    }

    if (form.address.trim().length > 400) {
      setFormError("Address must not exceed 400 characters.");
      return;
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;

    if (!passwordRegex.test(form.password)) {
      setFormError(
        "Password must be 8-16 characters with at least one uppercase letter and one special character."
      );
      return;
    }

    try {
      setSaving(true);

      await api.post("/admin/users", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        address: form.address.trim(),
        role: form.role,
      });

      setFormSuccess("User created successfully.");

      setForm({
        name: "",
        email: "",
        password: "",
        address: "",
        role: "USER",
      });

      setShowAddForm(false);

      fetchUsers();
    } catch (err) {
      console.error("Create user error:", err);

      setFormError(
        err.response?.data?.message ||
          "Unable to create user."
      );
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      name: "",
      email: "",
      address: "",
      role: "",
      sortBy: "name",
      order: "asc",
    });
  };

  return (
    <div className="admin-users-page">
      <header className="page-header">
        <div>
          <button
            className="back-btn"
            onClick={() => navigate("/admin")}
          >
            ← Dashboard
          </button>

          <h1>User Management</h1>
          <p>View, filter, sort and create users.</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => {
            setShowAddForm(true);
            setFormError("");
            setFormSuccess("");
          }}
        >
          + Add User
        </button>
      </header>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {formSuccess && (
        <div className="success-box">
          {formSuccess}
        </div>
      )}

      {showAddForm && (
        <section className="form-card">
          <div className="section-title">
            <div>
              <h2>Add New User</h2>
              <p>Create USER, ADMIN or STORE OWNER.</p>
            </div>

            <button
              className="close-btn"
              onClick={() => setShowAddForm(false)}
            >
              ✕
            </button>
          </div>

          {formError && (
            <div className="error-box">
              {formError}
            </div>
          )}

          <form onSubmit={handleAddUser}>
            <div className="form-grid">
              <div>
                <label>Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="20-60 characters"
                  required
                />
              </div>

              <div>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleFormChange}
                  placeholder="8-16 characters"
                  required
                />
              </div>

              <div>
                <label>Role</label>

                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                >
                  <option value="USER">Normal User</option>
                  <option value="STORE_OWNER">
                    Store Owner
                  </option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="full-width">
                <label>Address</label>

                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleFormChange}
                  placeholder="Maximum 400 characters"
                  maxLength={400}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="filters-card">
        <div className="section-title">
          <div>
            <h2>Search & Filters</h2>
          </div>

          <button
            className="secondary-btn"
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>

        <div className="filters-grid">
          <input
            name="name"
            value={filters.name}
            onChange={handleFilterChange}
            placeholder="Search name"
          />

          <input
            name="email"
            value={filters.email}
            onChange={handleFilterChange}
            placeholder="Search email"
          />

          <input
            name="address"
            value={filters.address}
            onChange={handleFilterChange}
            placeholder="Search address"
          />

          <select
            name="role"
            value={filters.role}
            onChange={handleFilterChange}
          >
            <option value="">All Roles</option>
            <option value="USER">Normal User</option>
            <option value="STORE_OWNER">Store Owner</option>
            <option value="ADMIN">Administrator</option>
          </select>

          <select
            name="sortBy"
            value={filters.sortBy}
            onChange={handleFilterChange}
          >
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="address">Sort by Address</option>
            <option value="role">Sort by Role</option>
          </select>

          <select
            name="order"
            value={filters.order}
            onChange={handleFilterChange}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </section>

      <section className="users-card">
        <div className="table-header">
          <div>
            <h2>Users</h2>
            <span>{users.length} users found</span>
          </div>

          <button
            className="refresh-btn"
            onClick={fetchUsers}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="loading">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="empty">
            No users found.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Role</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.address}</td>
                    <td>
                      <span className="role-badge">
                        {user.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .admin-users-page {
          min-height: 100vh;
          background: #f6f7fb;
          padding: 32px 40px;
          color: #1f2937;
          font-family: Inter, Arial, sans-serif;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 28px;
        }

        .back-btn {
          border: none;
          background: transparent;
          padding: 0;
          margin-bottom: 10px;
          color: #6b7280;
          cursor: pointer;
        }

        .page-header h1 {
          margin: 0 0 6px;
          font-size: 30px;
          color: #111827;
        }

        .page-header p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .primary-btn {
          border: none;
          background: #111827;
          color: white;
          padding: 11px 17px;
          border-radius: 9px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .primary-btn:hover {
          background: #000;
        }

        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .secondary-btn {
          border: 1px solid #e5e7eb;
          background: white;
          color: #374151;
          padding: 9px 14px;
          border-radius: 8px;
          cursor: pointer;
        }

        .error-box {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #b91c1c;
          padding: 13px 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .success-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
          padding: 13px 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .form-card,
        .filters-card,
        .users-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 22px;
        }

        .section-title,
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-title h2,
        .table-header h2 {
          margin: 0 0 4px;
          font-size: 18px;
        }

        .section-title p,
        .table-header span {
          margin: 0;
          color: #9ca3af;
          font-size: 12px;
        }

        .close-btn {
          border: none;
          background: #f3f4f6;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          cursor: pointer;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 17px;
        }

        .form-grid > div {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        label {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
          background: white;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #111827;
        }

        textarea {
          min-height: 90px;
          resize: vertical;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }

        th {
          background: #f9fafb;
          text-align: left;
          padding: 13px;
          font-size: 12px;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
        }

        td {
          padding: 14px 13px;
          font-size: 13px;
          border-bottom: 1px solid #f0f0f0;
          vertical-align: top;
        }

        .role-badge {
          display: inline-block;
          background: #f3f4f6;
          color: #374151;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }

        .refresh-btn {
          border: 1px solid #e5e7eb;
          background: white;
          padding: 8px 13px;
          border-radius: 8px;
          cursor: pointer;
        }

        .loading,
        .empty {
          text-align: center;
          padding: 50px;
          color: #9ca3af;
        }

        @media (max-width: 900px) {
          .filters-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .full-width {
            grid-column: auto;
          }
        }

        @media (max-width: 600px) {
          .admin-users-page {
            padding: 20px;
          }

          .page-header {
            align-items: flex-start;
            flex-direction: column;
            gap: 15px;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}