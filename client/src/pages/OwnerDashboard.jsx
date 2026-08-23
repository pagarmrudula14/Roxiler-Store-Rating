import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stores, setStores] = useState([]);
  const [ratings, setRatings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // FETCH OWNER DASHBOARD
  // =====================================================

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/owner/dashboard"
      );

      console.log(
        "Owner dashboard response:",
        response.data
      );

      setStores(
        Array.isArray(response.data.stores)
          ? response.data.stores
          : []
      );

      setRatings(
        Array.isArray(response.data.ratings)
          ? response.data.ratings
          : []
      );
    } catch (err) {
      console.error(
        "Owner dashboard error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load owner dashboard."
      );

      setStores([]);
      setRatings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // AUTH CHECK
  // =====================================================

  useEffect(() => {
    if (!user) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    if (user.role !== "STORE_OWNER") {
      navigate("/stores", {
        replace: true,
      });

      return;
    }

    fetchDashboard();
  }, [
    user,
    navigate,
    fetchDashboard,
  ]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    logout();

    navigate("/login", {
      replace: true,
    });
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>

          <h2>
            Loading dashboard...
          </h2>

          <p>
            Please wait while we load your
            store information.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div style={styles.page}>

      {/* =================================================
          HEADER
      ================================================= */}

      <header style={styles.header}>
        <div style={styles.brandSection}>
          <div style={styles.logo}>
            R
          </div>

          <div>
            <h1 style={styles.brand}>
              Roxiler
            </h1>

            <p style={styles.subtitle}>
              Store Owner Dashboard
            </p>
          </div>
        </div>

        <div style={styles.headerRight}>

          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {(user?.name || "O")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user?.name || "Store Owner"}
              </strong>

              <div style={styles.role}>
                Store Owner
              </div>
            </div>
          </div>

          <button
            type="button"
            style={styles.backToStores}
            onClick={() =>
              navigate("/stores")
            }
          >
            🏪 Stores
          </button>

          <button
            type="button"
            style={styles.logout}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main style={styles.container}>

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* =================================================
            PAGE TITLE
        ================================================= */}

        <section style={styles.hero}>
          <div>
            <h2 style={styles.heading}>
              Owner Dashboard
            </h2>

            <p style={styles.description}>
              Monitor your stores and view
              customer ratings.
            </p>
          </div>
        </section>

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <section style={styles.summaryGrid}>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              🏪
            </div>

            <div>
              <p style={styles.summaryLabel}>
                Your Stores
              </p>

              <h3 style={styles.summaryValue}>
                {stores.length}
              </h3>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              ⭐
            </div>

            <div>
              <p style={styles.summaryLabel}>
                Total Ratings
              </p>

              <h3 style={styles.summaryValue}>
                {ratings.length}
              </h3>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              📊
            </div>

            <div>
              <p style={styles.summaryLabel}>
                Overall Average
              </p>

              <h3 style={styles.summaryValue}>
                {ratings.length > 0
                  ? (
                      ratings.reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.rating || 0
                          ),
                        0
                      ) /
                      ratings.length
                    ).toFixed(1)
                  : "0.0"}
                <span style={styles.outOf}>
                  {" "}
                  / 5
                </span>
              </h3>
            </div>
          </div>

        </section>

        {/* =================================================
            YOUR STORES
        ================================================= */}

        <section style={styles.section}>

          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Your Stores
              </h2>

              <p style={styles.sectionSubtitle}>
                Stores assigned to your account
              </p>
            </div>
          </div>

          {stores.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                🏪
              </div>

              <h3>
                No store assigned
              </h3>

              <p>
                No store has been assigned to
                you yet.
              </p>
            </div>
          ) : (
            <div style={styles.grid}>

              {stores.map((store) => {

                const averageRating =
                  Number(
                    store.average_rating || 0
                  );

                const totalRatings =
                  Number(
                    store.total_ratings || 0
                  );

                return (
                  <div
                    key={store.id}
                    style={styles.card}
                  >

                    <div
                      style={
                        styles.storeHeader
                      }
                    >
                      <div
                        style={
                          styles.storeIcon
                        }
                      >
                        🏪
                      </div>

                      <div>
                        <h3
                          style={
                            styles.storeName
                          }
                        >
                          {store.name}
                        </h3>

                        <span
                          style={
                            styles.storeId
                          }
                        >
                          Store #{store.id}
                        </span>
                      </div>
                    </div>

                    <div
                      style={styles.info}
                    >

                      <div
                        style={
                          styles.infoRow
                        }
                      >
                        <span>📧</span>

                        <span>
                          {store.email ||
                            "No email"}
                        </span>
                      </div>

                      <div
                        style={
                          styles.infoRow
                        }
                      >
                        <span>📍</span>

                        <span>
                          {store.address ||
                            "No address"}
                        </span>
                      </div>

                    </div>

                    <div
                      style={
                        styles.storeRating
                      }
                    >
                      <div>
                        <p
                          style={
                            styles.ratingLabel
                          }
                        >
                          Average Rating
                        </p>

                        <div
                          style={
                            styles.ratingValue
                          }
                        >
                          ⭐{" "}
                          {averageRating.toFixed(
                            1
                          )}

                          <span
                            style={
                              styles.outOf
                            }
                          >
                            {" "}
                            / 5
                          </span>
                        </div>
                      </div>

                      <div
                        style={
                          styles.ratingCount
                        }
                      >
                        {totalRatings}

                        <span>
                          {" "}
                          rating
                          {totalRatings !== 1
                            ? "s"
                            : ""}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </section>

        {/* =================================================
            CUSTOMER RATINGS
        ================================================= */}

        <section style={styles.section}>

          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Customer Ratings
              </h2>

              <p style={styles.sectionSubtitle}>
                Customers who rated your stores
              </p>
            </div>

            <div
              style={styles.ratingBadge}
            >
              {ratings.length} Rating
              {ratings.length !== 1
                ? "s"
                : ""}
            </div>
          </div>

          {ratings.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                ⭐
              </div>

              <h3>
                No ratings yet
              </h3>

              <p>
                Customer ratings will appear
                here once someone rates your
                store.
              </p>
            </div>
          ) : (
            <div
              style={styles.tableWrapper}
            >
              <table
                style={styles.table}
              >

                <thead>
                  <tr>

                    <th style={styles.th}>
                      Customer
                    </th>

                    <th style={styles.th}>
                      Email
                    </th>

                    <th style={styles.th}>
                      Store
                    </th>

                    <th style={styles.th}>
                      Rating
                    </th>

                    <th style={styles.th}>
                      Date
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {ratings.map(
                    (rating) => (
                      <tr
                        key={rating.id}
                        style={
                          styles.tableRow
                        }
                      >

                        <td
                          style={styles.td}
                        >
                          <div
                            style={
                              styles.customer
                            }
                          >
                            <div
                              style={
                                styles.customerAvatar
                              }
                            >
                              {(
                                rating.user_name ||
                                "U"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <strong>
                              {
                                rating.user_name
                              }
                            </strong>
                          </div>
                        </td>

                        <td
                          style={styles.td}
                        >
                          {
                            rating.user_email
                          }
                        </td>

                        <td
                          style={styles.td}
                        >
                          {
                            rating.store_name
                          }
                        </td>

                        <td
                          style={styles.td}
                        >
                          <span
                            style={
                              styles.ratingPill
                            }
                          >
                            ⭐{" "}
                            {Number(
                              rating.rating
                            )}
                            /5
                          </span>
                        </td>

                        <td
                          style={styles.td}
                        >
                          {rating.updated_at
                            ? new Date(
                                rating.updated_at
                              ).toLocaleDateString()
                            : "-"}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>
            </div>
          )}

        </section>

        {/* =================================================
            BACK BUTTON
        ================================================= */}

        <button
          type="button"
          style={styles.backButton}
          onClick={() =>
            navigate("/stores")
          }
        >
          ← Back to Stores
        </button>

      </main>
    </div>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#111827",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  header: {
    background: "#ffffff",
    borderBottom:
      "1px solid #e5e7eb",
    padding: "16px 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },

  brandSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  logo: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
    fontWeight: "800",
  },

  brand: {
    margin: 0,
    fontSize: "21px",
    fontWeight: "800",
  },

  subtitle: {
    margin: "2px 0 0",
    color: "#9ca3af",
    fontSize: "11px",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginRight: "8px",
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },

  role: {
    fontSize: "11px",
    color: "#9ca3af",
    marginTop: "2px",
  },

  backToStores: {
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    padding: "10px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  logout: {
    border: "none",
    background: "#fee2e2",
    color: "#dc2626",
    padding: "10px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  container: {
    maxWidth: "1250px",
    margin: "0 auto",
    padding: "35px 30px 60px",
  },

  hero: {
    marginBottom: "25px",
  },

  heading: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "800",
  },

  description: {
    margin: "7px 0 0",
    color: "#6b7280",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginBottom: "35px",
  },

  summaryCard: {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.03)",
  },

  summaryIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
  },

  summaryLabel: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "12px",
  },

  summaryValue: {
    margin: "4px 0 0",
    fontSize: "25px",
    fontWeight: "800",
  },

  outOf: {
    color: "#9ca3af",
    fontSize: "13px",
    fontWeight: "500",
  },

  section: {
    marginTop: "35px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "21px",
    fontWeight: "800",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#9ca3af",
    fontSize: "12px",
  },

  ratingBadge: {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    padding: "9px 13px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
  },

  card: {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "22px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.04)",
  },

  storeHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },

  storeIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  storeName: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
  },

  storeId: {
    color: "#9ca3af",
    fontSize: "11px",
  },

  info: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    paddingBottom: "18px",
    borderBottom:
      "1px solid #f0f0f0",
  },

  infoRow: {
    display: "flex",
    gap: "9px",
    fontSize: "13px",
    color: "#4b5563",
    wordBreak: "break-word",
  },

  storeRating: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "18px",
  },

  ratingLabel: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "11px",
  },

  ratingValue: {
    fontSize: "22px",
    fontWeight: "800",
    marginTop: "4px",
  },

  ratingCount: {
    background: "#f9fafb",
    padding: "8px 10px",
    borderRadius: "8px",
    fontWeight: "700",
    fontSize: "12px",
  },

  tableWrapper: {
    overflowX: "auto",
    background: "#ffffff",
    borderRadius: "14px",
    border:
      "1px solid #e5e7eb",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "15px",
    background: "#f9fafb",
    borderBottom:
      "1px solid #e5e7eb",
    fontSize: "12px",
    color: "#6b7280",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "15px",
    borderBottom:
      "1px solid #f0f0f0",
    fontSize: "13px",
    color: "#374151",
  },

  tableRow: {
    background: "#ffffff",
  },

  customer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  customerAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "700",
  },

  ratingPill: {
    display: "inline-block",
    background: "#fffbeb",
    color: "#92400e",
    padding: "6px 9px",
    borderRadius: "7px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  empty: {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "45px 20px",
    textAlign: "center",
    color: "#6b7280",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  error: {
    background: "#fee2e2",
    border:
      "1px solid #fecaca",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "25px",
  },

  backButton: {
    marginTop: "35px",
    border: "none",
    background: "#111827",
    color: "#ffffff",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f7fb",
  },

  loadingBox: {
    textAlign: "center",
    color: "#374151",
  },

  spinner: {
    width: "38px",
    height: "38px",
    border:
      "4px solid #e5e7eb",
    borderTop:
      "4px solid #111827",
    borderRadius: "50%",
    margin:
      "0 auto 15px",
  },
};