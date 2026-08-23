import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // =====================================================
  // STATE
  // =====================================================

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStores: 0,
    totalRatings: 0,
  });

  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeSection, setActiveSection] =
    useState("dashboard");

  // User modal
  const [showUserForm, setShowUserForm] =
    useState(false);

  const [editingUserId, setEditingUserId] =
    useState(null);

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    role: "USER",
  });

  // Store modal
  const [showStoreForm, setShowStoreForm] =
    useState(false);

  const [editingStoreId, setEditingStoreId] =
    useState(null);

  const [storeForm, setStoreForm] = useState({
    name: "",
    email: "",
    address: "",
    owner_id: "",
  });

  // Search / sorting
  const [userSearch, setUserSearch] =
    useState("");

  const [userRole, setUserRole] =
    useState("");

  const [userSort, setUserSort] =
    useState("name");

  const [userOrder, setUserOrder] =
    useState("asc");

  const [storeSearch, setStoreSearch] =
    useState("");

  const [storeSort, setStoreSort] =
    useState("name");

  const [storeOrder, setStoreOrder] =
    useState("asc");

  // =====================================================
  // DASHBOARD
  // =====================================================

  const fetchDashboard = async () => {
    try {
      const response = await api.get(
        "/admin/dashboard"
      );

      setStats({
        totalUsers:
          Number(response.data.totalUsers) || 0,

        totalStores:
          Number(response.data.totalStores) || 0,

        totalRatings:
          Number(response.data.totalRatings) || 0,
      });
    } catch (err) {
      console.error(
        "Dashboard error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load dashboard."
      );
    }
  };

  // =====================================================
  // USERS
  // =====================================================

  const fetchUsers = async () => {
    try {
      const response = await api.get(
        "/admin/users",
        {
          params: {
            name: userSearch,
            role: userRole,
            sortBy: userSort,
            order: userOrder,
          },
        }
      );

      setUsers(response.data || []);
    } catch (err) {
      console.error(
        "Users error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load users."
      );
    }
  };

  // =====================================================
  // STORES
  // =====================================================

  const fetchStores = async () => {
    try {
      const response = await api.get(
        "/admin/stores",
        {
          params: {
            name: storeSearch,
            sortBy: storeSort,
            order: storeOrder,
          },
        }
      );

      setStores(response.data || []);
    } catch (err) {
      console.error(
        "Stores error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load stores."
      );
    }
  };

  // =====================================================
  // LOAD EVERYTHING
  // =====================================================

  const loadAll = async () => {
    setLoading(true);
    setError("");

    await Promise.all([
      fetchDashboard(),
      fetchUsers(),
      fetchStores(),
    ]);

    setLoading(false);
  };

  // =====================================================
  // AUTH CHECK
  // =====================================================

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "ADMIN") {
      navigate("/stores");
      return;
    }

    loadAll();
  }, [user]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // =====================================================
  // SECTION CHANGE
  // =====================================================

  const changeSection = (section) => {
    setActiveSection(section);
    setError("");

    if (section === "users") {
      fetchUsers();
    }

    if (section === "stores") {
      fetchStores();
    }

    if (section === "dashboard") {
      fetchDashboard();
    }
  };

  // =====================================================
  // USER FORM RESET
  // =====================================================

  const resetUserForm = () => {
    setUserForm({
      name: "",
      email: "",
      password: "",
      address: "",
      role: "USER",
    });

    setEditingUserId(null);
    setShowUserForm(false);
  };

  // =====================================================
  // OPEN ADD USER
  // =====================================================

  const openAddUser = () => {
    setEditingUserId(null);

    setUserForm({
      name: "",
      email: "",
      password: "",
      address: "",
      role: "USER",
    });

    setError("");
    setShowUserForm(true);
  };

  // =====================================================
  // OPEN EDIT USER
  // =====================================================

  const openEditUser = (item) => {
    setEditingUserId(item.id);

    setUserForm({
      name: item.name || "",
      email: item.email || "",
      password: "",
      address: item.address || "",
      role: item.role || "USER",
    });

    setError("");
    setShowUserForm(true);
  };

  // =====================================================
  // CREATE / UPDATE USER
  // =====================================================

  const handleUserSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      if (editingUserId) {
        const payload = {
          name: userForm.name,
          email: userForm.email,
          address: userForm.address,
          role: userForm.role,
        };

        if (
          userForm.password &&
          userForm.password.trim()
        ) {
          payload.password =
            userForm.password;
        }

        await api.put(
          `/admin/users/${editingUserId}`,
          payload
        );

        alert("User updated successfully.");
      } else {
        await api.post(
          "/admin/users",
          userForm
        );

        alert("User created successfully.");
      }

      resetUserForm();

      await fetchUsers();
      await fetchDashboard();
    } catch (err) {
      console.error(
        "User save error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to save user."
      );
    }
  };

  // =====================================================
  // DELETE USER
  // =====================================================

  const handleDeleteUser = async (item) => {
    if (
      Number(item.id) ===
      Number(user?.id)
    ) {
      alert(
        "You cannot delete your own administrator account."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(
        `/admin/users/${item.id}`
      );

      alert("User deleted successfully.");

      await fetchUsers();
      await fetchDashboard();
      await fetchStores();
    } catch (err) {
      console.error(
        "Delete user error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to delete user."
      );
    }
  };

  // =====================================================
  // STORE FORM RESET
  // =====================================================

  const resetStoreForm = () => {
    setStoreForm({
      name: "",
      email: "",
      address: "",
      owner_id: "",
    });

    setEditingStoreId(null);
    setShowStoreForm(false);
  };

  // =====================================================
  // OPEN ADD STORE
  // =====================================================

  const openAddStore = () => {
    setEditingStoreId(null);

    setStoreForm({
      name: "",
      email: "",
      address: "",
      owner_id: "",
    });

    setError("");
    setShowStoreForm(true);
  };

  // =====================================================
  // OPEN EDIT STORE
  // =====================================================

  const openEditStore = (store) => {
    setEditingStoreId(store.id);

    setStoreForm({
      name: store.name || "",
      email: store.email || "",
      address: store.address || "",
      owner_id: String(
        store.owner_id || ""
      ),
    });

    setError("");
    setShowStoreForm(true);
  };

  // =====================================================
  // CREATE / UPDATE STORE
  // =====================================================

  const handleStoreSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      const payload = {
        name: storeForm.name,
        email: storeForm.email,
        address: storeForm.address,
        owner_id: Number(
          storeForm.owner_id
        ),
      };

      if (editingStoreId) {
        await api.put(
          `/admin/stores/${editingStoreId}`,
          payload
        );

        alert("Store updated successfully.");
      } else {
        await api.post(
          "/admin/stores",
          payload
        );

        alert("Store created successfully.");
      }

      resetStoreForm();

      await fetchStores();
      await fetchDashboard();
    } catch (err) {
      console.error(
        "Store save error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to save store."
      );
    }
  };

  // =====================================================
  // DELETE STORE
  // =====================================================

  const handleDeleteStore = async (store) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${store.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(
        `/admin/stores/${store.id}`
      );

      alert("Store deleted successfully.");

      await fetchStores();
      await fetchDashboard();
    } catch (err) {
      console.error(
        "Delete store error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to delete store."
      );
    }
  };

  // =====================================================
  // STORE OWNERS
  // =====================================================

  const storeOwners = users.filter(
    (item) =>
      item.role === "STORE_OWNER"
  );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.spinner}></div>

        <p>
          Loading admin dashboard...
        </p>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div style={styles.page}>

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside style={styles.sidebar}>

        <div style={styles.logoArea}>

          <div style={styles.logoIcon}>
            R
          </div>

          <div>
            <h2 style={styles.logoText}>
              Roxiler
            </h2>

            <span style={styles.logoSub}>
              Admin Panel
            </span>
          </div>

        </div>

        <nav style={styles.nav}>

          <button
            style={
              activeSection === "dashboard"
                ? styles.navActive
                : styles.navButton
            }
            onClick={() =>
              changeSection("dashboard")
            }
          >
            📊 Dashboard
          </button>

          <button
            style={
              activeSection === "users"
                ? styles.navActive
                : styles.navButton
            }
            onClick={() =>
              changeSection("users")
            }
          >
            👥 Users
          </button>

          <button
            style={
              activeSection === "stores"
                ? styles.navActive
                : styles.navButton
            }
            onClick={() =>
              changeSection("stores")
            }
          >
            🏪 Stores
          </button>

        </nav>

        <button
          style={styles.logout}
          onClick={handleLogout}
        >
          ↪ Logout
        </button>

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <main style={styles.main}>

        {/* HEADER */}

        <header style={styles.header}>

          <div>

            <h1 style={styles.title}>
              {activeSection ===
              "dashboard"
                ? "Dashboard"
                : activeSection ===
                  "users"
                ? "User Management"
                : "Store Management"}
            </h1>

            <p style={styles.subtitle}>
              Welcome back{" "}
              <strong>
                {user?.name ||
                  "Administrator"}
              </strong>
            </p>

          </div>

          <div style={styles.profile}>

            <div style={styles.avatar}>
              {(user?.name || "A")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>

              <strong>
                {user?.name || "Admin"}
              </strong>

              <div
                style={styles.profileRole}
              >
                System Administrator
              </div>

            </div>

          </div>

        </header>

        {/* ERROR */}

        {error && (
          <div style={styles.error}>
            ⚠️ {error}

            <button
              style={styles.errorClose}
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>
          </div>
        )}

        {/* =================================================
            DASHBOARD
        ================================================= */}

        {activeSection ===
          "dashboard" && (
          <>
            <section
              style={styles.statsGrid}
            >

              <div
                style={styles.statCard}
              >
                <div
                  style={styles.statIcon}
                >
                  👥
                </div>

                <div>
                  <p
                    style={
                      styles.statLabel
                    }
                  >
                    Total Users
                  </p>

                  <h2
                    style={
                      styles.statNumber
                    }
                  >
                    {stats.totalUsers}
                  </h2>

                  <span
                    style={
                      styles.statSub
                    }
                  >
                    Registered users
                  </span>
                </div>
              </div>

              <div
                style={styles.statCard}
              >
                <div
                  style={styles.statIcon}
                >
                  🏪
                </div>

                <div>
                  <p
                    style={
                      styles.statLabel
                    }
                  >
                    Total Stores
                  </p>

                  <h2
                    style={
                      styles.statNumber
                    }
                  >
                    {stats.totalStores}
                  </h2>

                  <span
                    style={
                      styles.statSub
                    }
                  >
                    Registered stores
                  </span>
                </div>
              </div>

              <div
                style={styles.statCard}
              >
                <div
                  style={styles.statIcon}
                >
                  ⭐
                </div>

                <div>
                  <p
                    style={
                      styles.statLabel
                    }
                  >
                    Total Ratings
                  </p>

                  <h2
                    style={
                      styles.statNumber
                    }
                  >
                    {stats.totalRatings}
                  </h2>

                  <span
                    style={
                      styles.statSub
                    }
                  >
                    Submitted ratings
                  </span>
                </div>
              </div>

            </section>

            {/* QUICK ACTIONS */}

            <section style={styles.section}>

              <h2>
                Quick Actions
              </h2>

              <p
                style={
                  styles.sectionSub
                }
              >
                Manage your Roxiler
                platform
              </p>

              <div
                style={
                  styles.actionsGrid
                }
              >

                <button
                  style={styles.action}
                  onClick={
                    openAddUser
                  }
                >
                  ➕

                  <div>
                    <strong>
                      Add User
                    </strong>

                    <p>
                      Create user, admin
                      or store owner
                    </p>
                  </div>
                </button>

                <button
                  style={styles.action}
                  onClick={
                    openAddStore
                  }
                >
                  🏪

                  <div>
                    <strong>
                      Add Store
                    </strong>

                    <p>
                      Register a new
                      store
                    </p>
                  </div>
                </button>

                <button
                  style={styles.action}
                  onClick={() =>
                    changeSection(
                      "users"
                    )
                  }
                >
                  👥

                  <div>
                    <strong>
                      Manage Users
                    </strong>

                    <p>
                      View and manage
                      users
                    </p>
                  </div>
                </button>

                <button
                  style={styles.action}
                  onClick={() =>
                    changeSection(
                      "stores"
                    )
                  }
                >
                  📋

                  <div>
                    <strong>
                      Manage Stores
                    </strong>

                    <p>
                      View and manage
                      stores
                    </p>
                  </div>
                </button>

              </div>

            </section>

            {/* SYSTEM OVERVIEW */}

            <section style={styles.section}>

              <div
                style={
                  styles.overviewHeader
                }
              >

                <div>

                  <h2>
                    System Overview
                  </h2>

                  <p
                    style={
                      styles.sectionSub
                    }
                  >
                    Current platform
                    information
                  </p>

                </div>

                <button
                  style={styles.refresh}
                  onClick={loadAll}
                >
                  ↻ Refresh
                </button>

              </div>

              <div
                style={styles.overview}
              >

                <div
                  style={
                    styles.overviewRow
                  }
                >
                  <span>
                    Platform Status
                  </span>

                  <strong
                    style={
                      styles.active
                    }
                  >
                    ● Active
                  </strong>
                </div>

                <div
                  style={
                    styles.overviewRow
                  }
                >
                  <span>
                    User Accounts
                  </span>

                  <strong>
                    {stats.totalUsers}
                  </strong>
                </div>

                <div
                  style={
                    styles.overviewRow
                  }
                >
                  <span>
                    Registered Stores
                  </span>

                  <strong>
                    {stats.totalStores}
                  </strong>
                </div>

                <div
                  style={
                    styles.overviewRow
                  }
                >
                  <span>
                    Ratings Submitted
                  </span>

                  <strong>
                    {stats.totalRatings}
                  </strong>
                </div>

              </div>

            </section>
          </>
        )}

        {/* =================================================
            USERS
        ================================================= */}

        {activeSection === "users" && (
          <section>

            <div
              style={styles.toolbar}
            >

              <input
                style={styles.search}
                placeholder="Search by name..."
                value={userSearch}
                onChange={(e) =>
                  setUserSearch(
                    e.target.value
                  )
                }
              />

              <select
                style={styles.select}
                value={userRole}
                onChange={(e) =>
                  setUserRole(
                    e.target.value
                  )
                }
              >
                <option value="">
                  All Roles
                </option>

                <option value="USER">
                  User
                </option>

                <option value="STORE_OWNER">
                  Store Owner
                </option>

                <option value="ADMIN">
                  Admin
                </option>
              </select>

              <select
                style={styles.select}
                value={userSort}
                onChange={(e) =>
                  setUserSort(
                    e.target.value
                  )
                }
              >
                <option value="name">
                  Sort: Name
                </option>

                <option value="email">
                  Sort: Email
                </option>

                <option value="role">
                  Sort: Role
                </option>

                <option value="address">
                  Sort: Address
                </option>
              </select>

              <select
                style={styles.select}
                value={userOrder}
                onChange={(e) =>
                  setUserOrder(
                    e.target.value
                  )
                }
              >
                <option value="asc">
                  Ascending
                </option>

                <option value="desc">
                  Descending
                </option>
              </select>

              <button
                style={styles.refresh}
                onClick={fetchUsers}
              >
                Search
              </button>

              <button
                style={styles.primary}
                onClick={
                  openAddUser
                }
              >
                + Add User
              </button>

            </div>

            <div
              style={
                styles.tableWrapper
              }
            >

              <table
                style={styles.table}
              >

                <thead>

                  <tr>

                    <th
                      style={styles.th}
                    >
                      ID
                    </th>

                    <th
                      style={styles.th}
                    >
                      Name
                    </th>

                    <th
                      style={styles.th}
                    >
                      Email
                    </th>

                    <th
                      style={styles.th}
                    >
                      Address
                    </th>

                    <th
                      style={styles.th}
                    >
                      Role
                    </th>

                    <th
                      style={styles.th}
                    >
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {users.map(
                    (item) => (
                      <tr
                        key={item.id}
                      >

                        <td
                          style={
                            styles.td
                          }
                        >
                          {item.id}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {item.name}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {item.email}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {item.address}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          <span
                            style={
                              styles.roleBadge
                            }
                          >
                            {item.role}
                          </span>
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >

                          <div
                            style={
                              styles.actionButtons
                            }
                          >

                            <button
                              style={
                                styles.editButton
                              }
                              onClick={() =>
                                openEditUser(
                                  item
                                )
                              }
                            >
                              ✏️ Edit
                            </button>

                            <button
                              style={
                                styles.deleteButton
                              }
                              onClick={() =>
                                handleDeleteUser(
                                  item
                                )
                              }
                              disabled={
                                Number(
                                  item.id
                                ) ===
                                Number(
                                  user?.id
                                )
                              }
                            >
                              🗑 Delete
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

              {users.length ===
                0 && (
                <div
                  style={
                    styles.empty
                  }
                >
                  No users found.
                </div>
              )}

            </div>

          </section>
        )}

        {/* =================================================
            STORES
        ================================================= */}

        {activeSection === "stores" && (
          <section>

            <div
              style={styles.toolbar}
            >

              <input
                style={styles.search}
                placeholder="Search store name..."
                value={storeSearch}
                onChange={(e) =>
                  setStoreSearch(
                    e.target.value
                  )
                }
              />

              <select
                style={styles.select}
                value={storeSort}
                onChange={(e) =>
                  setStoreSort(
                    e.target.value
                  )
                }
              >
                <option value="name">
                  Sort: Name
                </option>

                <option value="email">
                  Sort: Email
                </option>

                <option value="address">
                  Sort: Address
                </option>

                <option value="rating">
                  Sort: Rating
                </option>
              </select>

              <select
                style={styles.select}
                value={storeOrder}
                onChange={(e) =>
                  setStoreOrder(
                    e.target.value
                  )
                }
              >
                <option value="asc">
                  Ascending
                </option>

                <option value="desc">
                  Descending
                </option>
              </select>

              <button
                style={styles.refresh}
                onClick={
                  fetchStores
                }
              >
                Search
              </button>

              <button
                style={styles.primary}
                onClick={
                  openAddStore
                }
              >
                + Add Store
              </button>

            </div>

            <div
              style={
                styles.tableWrapper
              }
            >

              <table
                style={styles.table}
              >

                <thead>

                  <tr>

                    <th
                      style={styles.th}
                    >
                      ID
                    </th>

                    <th
                      style={styles.th}
                    >
                      Store
                    </th>

                    <th
                      style={styles.th}
                    >
                      Email
                    </th>

                    <th
                      style={styles.th}
                    >
                      Address
                    </th>

                    <th
                      style={styles.th}
                    >
                      Owner
                    </th>

                    <th
                      style={styles.th}
                    >
                      Rating
                    </th>

                    <th
                      style={styles.th}
                    >
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {stores.map(
                    (store) => (
                      <tr
                        key={store.id}
                      >

                        <td
                          style={
                            styles.td
                          }
                        >
                          {store.id}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          <strong>
                            {store.name}
                          </strong>
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {store.email}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          {store.address}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >

                          <div>
                            <strong>
                              {store.owner_name ||
                                "Unknown"}
                            </strong>

                            <div
                              style={
                                styles.ownerEmail
                              }
                            >
                              {store.owner_email ||
                                ""}
                            </div>
                          </div>

                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >
                          ⭐{" "}
                          {Number(
                            store.rating ||
                              0
                          ).toFixed(1)}
                        </td>

                        <td
                          style={
                            styles.td
                          }
                        >

                          <div
                            style={
                              styles.actionButtons
                            }
                          >

                            <button
                              style={
                                styles.editButton
                              }
                              onClick={() =>
                                openEditStore(
                                  store
                                )
                              }
                            >
                              ✏️ Edit
                            </button>

                            <button
                              style={
                                styles.deleteButton
                              }
                              onClick={() =>
                                handleDeleteStore(
                                  store
                                )
                              }
                            >
                              🗑 Delete
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

              {stores.length ===
                0 && (
                <div
                  style={
                    styles.empty
                  }
                >
                  No stores found.
                </div>
              )}

            </div>

          </section>
        )}

      </main>

      {/* =================================================
          USER MODAL
      ================================================= */}

      {showUserForm && (
        <div
          style={
            styles.modalOverlay
          }
        >

          <div style={styles.modal}>

            <div
              style={
                styles.modalHeader
              }
            >

              <div>
                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  {editingUserId
                    ? "Edit User"
                    : "Add User"}
                </h2>

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  {editingUserId
                    ? "Update user information"
                    : "Create a new platform user"}
                </p>
              </div>

              <button
                style={styles.close}
                onClick={
                  resetUserForm
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleUserSubmit
              }
            >

              <label
                style={styles.label}
              >
                Name
              </label>

              <input
                style={styles.input}
                value={
                  userForm.name
                }
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    name: e.target.value,
                  })
                }
                placeholder="20-60 characters"
                required
              />

              <label
                style={styles.label}
              >
                Email
              </label>

              <input
                style={styles.input}
                type="email"
                value={
                  userForm.email
                }
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    email:
                      e.target.value,
                  })
                }
                required
              />

              <label
                style={styles.label}
              >
                {editingUserId
                  ? "New Password (optional)"
                  : "Password"}
              </label>

              <input
                style={styles.input}
                type="password"
                value={
                  userForm.password
                }
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    password:
                      e.target.value,
                  })
                }
                placeholder="8-16 chars, uppercase + special"
                required={
                  !editingUserId
                }
              />

              {editingUserId && (
                <p
                  style={
                    styles.helperText
                  }
                >
                  Leave blank to keep
                  the existing password.
                </p>
              )}

              <label
                style={styles.label}
              >
                Address
              </label>

              <textarea
                style={
                  styles.textarea
                }
                value={
                  userForm.address
                }
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    address:
                      e.target.value,
                  })
                }
                required
              />

              <label
                style={styles.label}
              >
                Role
              </label>

              <select
                style={styles.input}
                value={
                  userForm.role
                }
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    role:
                      e.target.value,
                  })
                }
              >

                <option value="USER">
                  Normal User
                </option>

                <option value="STORE_OWNER">
                  Store Owner
                </option>

                <option value="ADMIN">
                  Administrator
                </option>

              </select>

              <div
                style={
                  styles.modalActions
                }
              >

                <button
                  type="button"
                  style={
                    styles.cancelButton
                  }
                  onClick={
                    resetUserForm
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={
                    styles.submit
                  }
                >
                  {editingUserId
                    ? "Update User"
                    : "Create User"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =================================================
          STORE MODAL
      ================================================= */}

      {showStoreForm && (
        <div
          style={
            styles.modalOverlay
          }
        >

          <div style={styles.modal}>

            <div
              style={
                styles.modalHeader
              }
            >

              <div>

                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  {editingStoreId
                    ? "Edit Store"
                    : "Add Store"}
                </h2>

                <p
                  style={
                    styles.modalSubtitle
                  }
                >
                  {editingStoreId
                    ? "Update store information"
                    : "Register a new store"}
                </p>

              </div>

              <button
                style={styles.close}
                onClick={
                  resetStoreForm
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleStoreSubmit
              }
            >

              <label
                style={styles.label}
              >
                Store Name
              </label>

              <input
                style={styles.input}
                value={
                  storeForm.name
                }
                onChange={(e) =>
                  setStoreForm({
                    ...storeForm,
                    name: e.target.value,
                  })
                }
                required
              />

              <label
                style={styles.label}
              >
                Store Email
              </label>

              <input
                style={styles.input}
                type="email"
                value={
                  storeForm.email
                }
                onChange={(e) =>
                  setStoreForm({
                    ...storeForm,
                    email:
                      e.target.value,
                  })
                }
                required
              />

              <label
                style={styles.label}
              >
                Address
              </label>

              <textarea
                style={
                  styles.textarea
                }
                value={
                  storeForm.address
                }
                onChange={(e) =>
                  setStoreForm({
                    ...storeForm,
                    address:
                      e.target.value,
                  })
                }
                required
              />

              <label
                style={styles.label}
              >
                Store Owner
              </label>

              <select
                style={styles.input}
                value={
                  storeForm.owner_id
                }
                onChange={(e) =>
                  setStoreForm({
                    ...storeForm,
                    owner_id:
                      e.target.value,
                  })
                }
                required
              >

                <option value="">
                  Select Store Owner
                </option>

                {storeOwners.map(
                  (owner) => (
                    <option
                      key={owner.id}
                      value={owner.id}
                    >
                      {owner.name} -{" "}
                      {owner.email}
                    </option>
                  )
                )}

              </select>

              {storeOwners.length ===
                0 && (
                <p
                  style={
                    styles.warning
                  }
                >
                  No STORE_OWNER exists.
                  Create a store owner
                  user first.
                </p>
              )}

              <div
                style={
                  styles.modalActions
                }
              >

                <button
                  type="button"
                  style={
                    styles.cancelButton
                  }
                  onClick={
                    resetStoreForm
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={
                    styles.submit
                  }
                  disabled={
                    storeOwners.length ===
                    0
                  }
                >
                  {editingStoreId
                    ? "Update Store"
                    : "Create Store"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f7fb",
    color: "#1f2937",
    fontFamily:
      "Inter, Arial, sans-serif",
    display: "flex",
  },

  sidebar: {
    width: "250px",
    minHeight: "100vh",
    background: "#fff",
    borderRight:
      "1px solid #e5e7eb",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
  },

  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding:
      "8px 10px 25px",
    borderBottom:
      "1px solid #f0f0f0",
  },

  logoIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "#111827",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "20px",
  },

  logoText: {
    margin: 0,
    fontSize: "20px",
  },

  logoSub: {
    color: "#9ca3af",
    fontSize: "12px",
  },

  nav: {
    marginTop: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  navButton: {
    border: "none",
    background: "transparent",
    padding: "13px 15px",
    borderRadius: "10px",
    textAlign: "left",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: "14px",
  },

  navActive: {
    border: "none",
    background: "#111827",
    padding: "13px 15px",
    borderRadius: "10px",
    textAlign: "left",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },

  logout: {
    marginTop: "auto",
    border: "none",
    background: "#fff1f2",
    color: "#dc2626",
    padding: "13px 15px",
    borderRadius: "10px",
    cursor: "pointer",
    textAlign: "left",
  },

  main: {
    marginLeft: "250px",
    width:
      "calc(100% - 250px)",
    padding: "32px 40px",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },

  title: {
    margin: "0 0 6px",
    fontSize: "30px",
    color: "#111827",
  },

  subtitle: {
    margin: 0,
    color: "#6b7280",
  },

  profile: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#fff",
    border:
      "1px solid #e5e7eb",
    padding: "8px 14px",
    borderRadius: "10px",
  },

  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#111827",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },

  profileRole: {
    color: "#9ca3af",
    fontSize: "11px",
    marginTop: "3px",
  },

  error: {
    position: "relative",
    background: "#fee2e2",
    border:
      "1px solid #fecaca",
    color: "#991b1b",
    padding: "14px 42px 14px 14px",
    borderRadius: "10px",
    marginBottom: "20px",
  },

  errorClose: {
    position: "absolute",
    right: "12px",
    top: "8px",
    border: "none",
    background: "transparent",
    color: "#991b1b",
    fontSize: "22px",
    cursor: "pointer",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "20px",
    marginBottom: "32px",
  },

  statCard: {
    background: "#fff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "15px",
    padding: "23px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  statIcon: {
    width: "58px",
    height: "58px",
    borderRadius: "14px",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  },

  statLabel: {
    margin: "0 0 5px",
    color: "#6b7280",
    fontSize: "13px",
  },

  statNumber: {
    margin: 0,
    fontSize: "29px",
  },

  statSub: {
    color: "#9ca3af",
    fontSize: "11px",
  },

  section: {
    marginBottom: "30px",
  },

  sectionSub: {
    color: "#9ca3af",
    fontSize: "13px",
    marginTop: "4px",
  },

  actionsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, 1fr)",
    gap: "16px",
    marginTop: "16px",
  },

  action: {
    border:
      "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "20px",
  },

  overviewHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  refresh: {
    border:
      "1px solid #e5e7eb",
    background: "#fff",
    padding: "9px 14px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  overview: {
    background: "#fff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "14px",
    overflow: "hidden",
    marginTop: "15px",
  },

  overviewRow: {
    minHeight: "58px",
    padding: "0 20px",
    borderBottom:
      "1px solid #f0f0f0",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  active: {
    color: "#16a34a",
  },

  toolbar: {
    display: "flex",
    gap: "10px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  search: {
    padding: "11px 13px",
    border:
      "1px solid #d1d5db",
    borderRadius: "8px",
    minWidth: "220px",
    outline: "none",
  },

  select: {
    padding: "11px 13px",
    border:
      "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#fff",
    outline: "none",
  },

  primary: {
    border: "none",
    background: "#111827",
    color: "#fff",
    padding: "11px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  tableWrapper: {
    background: "#fff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "14px",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse:
      "collapse",
    minWidth: "900px",
  },

  th: {
    textAlign: "left",
    padding: "14px",
    background: "#f9fafb",
    borderBottom:
      "1px solid #e5e7eb",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px",
    borderBottom:
      "1px solid #f0f0f0",
    fontSize: "13px",
    verticalAlign: "middle",
  },

  roleBadge: {
    background: "#f3f4f6",
    padding: "5px 9px",
    borderRadius: "15px",
    fontSize: "11px",
    fontWeight: "600",
  },

  actionButtons: {
    display: "flex",
    gap: "7px",
    alignItems: "center",
  },

  editButton: {
    border:
      "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "7px 10px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },

  deleteButton: {
    border:
      "1px solid #fecaca",
    background: "#fef2f2",
    color: "#dc2626",
    padding: "7px 10px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },

  ownerEmail: {
    color: "#9ca3af",
    fontSize: "11px",
    marginTop: "3px",
  },

  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#9ca3af",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },

  modal: {
    background: "#fff",
    width: "100%",
    maxWidth: "520px",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: "15px",
    padding: "25px",
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.2)",
  },

  modalHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  modalSubtitle: {
    margin:
      "5px 0 0",
    color: "#9ca3af",
    fontSize: "12px",
  },

  close: {
    border: "none",
    background: "#f3f4f6",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "20px",
  },

  label: {
    display: "block",
    margin: "12px 0 6px",
    fontSize: "13px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px",
    border:
      "1px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "80px",
    padding: "11px",
    border:
      "1px solid #d1d5db",
    borderRadius: "8px",
    resize: "vertical",
    outline: "none",
  },

  helperText: {
    color: "#6b7280",
    fontSize: "11px",
    margin: "5px 0",
  },

  modalActions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },

  cancelButton: {
    flex: 1,
    border:
      "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    padding: "12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  submit: {
    flex: 1,
    border: "none",
    background: "#111827",
    color: "#fff",
    padding: "12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  warning: {
    color: "#b45309",
    background: "#fffbeb",
    padding: "10px",
    borderRadius: "7px",
    fontSize: "12px",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
  },

  spinner: {
    width: "38px",
    height: "38px",
    border:
      "4px solid #e5e7eb",
    borderTopColor:
      "#111827",
    borderRadius: "50%",
    marginBottom: "12px",
  },
};