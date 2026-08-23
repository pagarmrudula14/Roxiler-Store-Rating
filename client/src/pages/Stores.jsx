import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Stores() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [order, setOrder] = useState("asc");

  const [selectedStore, setSelectedStore] = useState(null);
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // =====================================================
  // FETCH STORES
  // =====================================================

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/ratings/stores",
        {
          params: {
            name: search.trim(),
            sortBy,
            order,
          },
        }
      );

      const data = response.data;

      console.log(
        "Stores API response:",
        data
      );

      if (Array.isArray(data)) {
        setStores(data);
      } else if (
        Array.isArray(data?.stores)
      ) {
        setStores(data.stores);
      } else {
        setStores([]);
      }
    } catch (err) {
      console.error(
        "Failed to fetch stores:",
        err
      );

      setStores([]);

      setError(
        err.response?.data?.message ||
          "Unable to load stores."
      );
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, order]);

  // =====================================================
  // LOAD STORES
  // =====================================================

  useEffect(() => {
    if (!user) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    fetchStores();
  }, [
    user,
    navigate,
    fetchStores,
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
  // DASHBOARD
  // =====================================================

  const handleDashboard = () => {
    if (user?.role === "ADMIN") {
      navigate("/admin");
      return;
    }

    if (
      user?.role === "STORE_OWNER"
    ) {
      navigate("/owner");
    }
  };

  // =====================================================
  // SELECT STORE
  // =====================================================

  const handleStoreSelect = (store) => {
    console.log(
      "Selected store:",
      store
    );

    setSelectedStore(store);

    const existingRating = Number(
      store.user_rating || 0
    );

    setRating(existingRating);
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeRating = () => {
    if (submitting) {
      return;
    }

    setSelectedStore(null);
    setRating(0);
  };

  // =====================================================
  // SUBMIT / UPDATE RATING
  // =====================================================

  const handleSubmitRating = async () => {
    if (!selectedStore) {
      return;
    }

    const numericRating = Number(
      rating
    );

    if (
      !Number.isInteger(
        numericRating
      ) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      alert(
        "Please select a rating from 1 to 5."
      );

      return;
    }

    try {
      setSubmitting(true);

      const response =
        await api.post(
          "/ratings",
          {
            store_id:
              selectedStore.id,
            rating:
              numericRating,
          }
        );

      console.log(
        "Rating submitted:",
        response.data
      );

      const wasAlreadyRated =
        Number(
          selectedStore.user_rating ||
            0
        ) > 0;

      alert(
        wasAlreadyRated
          ? "Rating updated successfully!"
          : "Rating submitted successfully!"
      );

      setSelectedStore(null);
      setRating(0);

      await fetchStores();
    } catch (err) {
      console.error(
        "Failed to submit rating:",
        err
      );

      alert(
        err.response?.data
          ?.message ||
          "Unable to submit rating."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div style={styles.page}>
      {/* =================================================
          HEADER
      ================================================= */}

      <header style={styles.header}>
        <div
          style={styles.brandSection}
        >
          <div style={styles.logo}>
            R
          </div>

          <div>
            <h1 style={styles.brand}>
              Roxiler
            </h1>

            <p
              style={
                styles.brandSubtitle
              }
            >
              Store Rating Platform
            </p>
          </div>
        </div>

        <div
          style={styles.headerRight}
        >
          <div
            style={styles.userInfo}
          >
            <div
              style={styles.avatar}
            >
              {(user?.name || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user?.name || "User"}
              </strong>

              <p
                style={styles.role}
              >
                {user?.role ===
                "STORE_OWNER"
                  ? "Store Owner"
                  : user?.role ===
                    "ADMIN"
                  ? "Administrator"
                  : "Normal User"}
              </p>
            </div>
          </div>

          {(user?.role ===
            "ADMIN" ||
            user?.role ===
              "STORE_OWNER") && (
            <button
              type="button"
              style={
                styles.dashboardButton
              }
              onClick={
                handleDashboard
              }
            >
              📊 Dashboard
            </button>
          )}
<button
  type="button"
  style={styles.dashboardButton}
  onClick={() => navigate("/change-password")}
>
  🔒 Change Password
</button>

          <button
            type="button"
            style={
              styles.logoutButton
            }
            onClick={
              handleLogout
            }
          >
            Logout
          </button>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main
        style={styles.container}
      >
        <section
          style={styles.hero}
        >
          <div>
            <h2
              style={styles.heading}
            >
              Discover & Rate Stores
            </h2>

            <p
              style={
                styles.description
              }
            >
              Select a store to submit or
              update your rating.
            </p>
          </div>

          <div
            style={styles.totalBadge}
          >
            {stores.length} Store
            {stores.length !== 1
              ? "s"
              : ""}
          </div>
        </section>

        {/* =================================================
            FILTERS
        ================================================= */}

        <section
          style={styles.filters}
        >
          <input
            type="text"
            placeholder="🔍 Search store by name..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter"
              ) {
                fetchStores();
              }
            }}
            style={styles.search}
          />

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value
              )
            }
            style={styles.select}
          >
            <option value="name">
              Sort by Name
            </option>

            <option value="address">
              Sort by Address
            </option>

            <option value="rating">
              Sort by Rating
            </option>
          </select>

          <select
            value={order}
            onChange={(e) =>
              setOrder(
                e.target.value
              )
            }
            style={styles.select}
          >
            <option value="asc">
              Ascending
            </option>

            <option value="desc">
              Descending
            </option>
          </select>

          <button
            type="button"
            style={
              styles.searchButton
            }
            onClick={
              fetchStores
            }
          >
            Search
          </button>
        </section>

        {/* ERROR */}

        {error && (
          <div
            style={styles.error}
          >
            ⚠️ {error}
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div
            style={styles.loading}
          >
            <div
              style={styles.spinner}
            />

            <p>
              Loading stores...
            </p>
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          stores.length ===
            0 && (
            <div
              style={styles.empty}
            >
              <div
                style={
                  styles.emptyIcon
                }
              >
                🏪
              </div>

              <h3>
                No stores found
              </h3>

              <p>
                Try changing your
                search or check back
                later.
              </p>
            </div>
          )}

        {/* STORE GRID */}

        {!loading &&
          stores.length > 0 && (
            <div
              style={styles.grid}
            >
              {stores.map(
                (store) => {
                  const averageRating =
                    Number(
                      store.average_rating ||
                        0
                    );

                  const userRating =
                    Number(
                      store.user_rating ||
                        0
                    );

                  const totalRatings =
                    Number(
                      store.total_ratings ||
                        0
                    );

                  return (
                    <div
                      key={
                        store.id
                      }
                      style={{
                        ...styles.card,

                        border:
                          userRating >
                          0
                            ? "1px solid #c7d2fe"
                            : "1px solid #e5e7eb",
                      }}
                      onClick={() =>
                        handleStoreSelect(
                          store
                        )
                      }
                      onKeyDown={(
                        e
                      ) => {
                        if (
                          e.key ===
                            "Enter" ||
                          e.key ===
                            " "
                        ) {
                          e.preventDefault();

                          handleStoreSelect(
                            store
                          );
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {/* STORE HEADER */}

                      <div
                        style={
                          styles.cardHeader
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
                            {
                              store.name
                            }
                          </h3>

                          <span
                            style={
                              styles.storeId
                            }
                          >
                            Store #
                            {
                              store.id
                            }
                          </span>
                        </div>
                      </div>

                      {/* STORE INFO */}

                      <div
                        style={
                          styles.info
                        }
                      >
                        <div
                          style={
                            styles.infoRow
                          }
                        >
                          <span>
                            📧
                          </span>

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
                          <span>
                            📍
                          </span>

                          <span>
                            {store.address ||
                              "No address"}
                          </span>
                        </div>
                      </div>

                      {/* RATING */}

                      <div
                        style={
                          styles.ratingBox
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
                              styles.averageRating
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
                              / 5
                            </span>
                          </div>
                        </div>

                        <div
                          style={
                            styles.ratingCount
                          }
                        >
                          {
                            totalRatings
                          }

                          <span>
                            {" "}
                            rating
                            {totalRatings !==
                            1
                              ? "s"
                              : ""}
                          </span>
                        </div>
                      </div>

                      {/* USER RATING */}

                      {userRating >
                      0 ? (
                        <div
                          style={
                            styles.userRating
                          }
                        >
                          <div>
                            Your rating:
                          </div>

                          <strong>
                            {"⭐".repeat(
                              userRating
                            )}
                          </strong>

                          <span>
                            {" "}
                            (
                            {
                              userRating
                            }
                            /5)
                          </span>
                        </div>
                      ) : (
                        <div
                          style={
                            styles.notRated
                          }
                        >
                          You haven't
                          rated this
                          store yet.
                        </div>
                      )}

                      {/* RATE BUTTON */}

                      <button
                        type="button"
                        style={
                          styles.rateButton
                        }
                        onClick={(
                          e
                        ) => {
                          e.stopPropagation();

                          handleStoreSelect(
                            store
                          );
                        }}
                      >
                        {userRating >
                        0
                          ? "✏️ Update Rating"
                          : "⭐ Rate Store"}
                      </button>

                      <p
                        style={
                          styles.clickHint
                        }
                      >
                        Click anywhere
                        on this card to
                        rate
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          )}
      </main>

      {/* =================================================
          RATING MODAL
      ================================================= */}

      {selectedStore && (
        <div
          style={
            styles.modalOverlay
          }
          onClick={
            closeRating
          }
        >
          <div
            style={styles.modal}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              type="button"
              style={
                styles.closeButton
              }
              onClick={
                closeRating
              }
              disabled={
                submitting
              }
            >
              ×
            </button>

            <div
              style={
                styles.modalIcon
              }
            >
              ⭐
            </div>

            <h2
              style={
                styles.modalTitle
              }
            >
              Rate{" "}
              {
                selectedStore.name
              }
            </h2>

            <p
              style={
                styles.modalDescription
              }
            >
              {Number(
                selectedStore.user_rating ||
                  0
              ) > 0
                ? "Update your rating for this store."
                : "How would you rate your experience?"}
            </p>

            {/* STARS */}

            <div
              style={styles.stars}
            >
              {[1, 2, 3, 4, 5].map(
                (star) => (
                  <button
                    key={star}
                    type="button"
                    style={{
                      ...styles.star,

                      color:
                        star <=
                        rating
                          ? "#f59e0b"
                          : "#d1d5db",

                      transform:
                        star <=
                        rating
                          ? "scale(1.08)"
                          : "scale(1)",
                    }}
                    onClick={() =>
                      setRating(
                        star
                      )
                    }
                    disabled={
                      submitting
                    }
                    aria-label={`${star} stars`}
                  >
                    ★
                  </button>
                )
              )}
            </div>

            <div
              style={
                styles.selectedRating
              }
            >
              {rating === 0
                ? "Select a rating"
                : `${rating} out of 5 stars`}
            </div>

            {/* ACTIONS */}

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
                  closeRating
                }
                disabled={
                  submitting
                }
              >
                Cancel
              </button>

              <button
                type="button"
                style={{
                  ...styles.submitButton,

                  opacity:
                    rating === 0 ||
                    submitting
                      ? 0.6
                      : 1,
                }}
                onClick={
                  handleSubmitRating
                }
                disabled={
                  rating === 0 ||
                  submitting
                }
              >
                {submitting
                  ? "Submitting..."
                  : Number(
                      selectedStore.user_rating ||
                        0
                    ) > 0
                  ? "Update Rating"
                  : "Submit Rating"}
              </button>
            </div>
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
    justifyContent:
      "space-between",
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

  brandSubtitle: {
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
    margin: "2px 0 0",
    color: "#9ca3af",
    fontSize: "11px",
  },

  dashboardButton: {
    border:
      "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    padding: "10px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  logoutButton: {
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
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
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

  totalBadge: {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    padding: "10px 15px",
    borderRadius: "20px",
    color: "#374151",
    fontSize: "13px",
    fontWeight: "600",
  },

  filters: {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "15px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "25px",
  },

  search: {
    flex: 1,
    minWidth: "250px",
    padding: "12px 14px",
    border:
      "1px solid #d1d5db",
    borderRadius: "9px",
    outline: "none",
    fontSize: "14px",
  },

  select: {
    padding: "12px 13px",
    border:
      "1px solid #d1d5db",
    borderRadius: "9px",
    background: "#ffffff",
    cursor: "pointer",
  },

  searchButton: {
    border: "none",
    background: "#111827",
    color: "#ffffff",
    padding: "12px 20px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "600",
  },

  error: {
    background: "#fee2e2",
    border:
      "1px solid #fecaca",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "20px",
  },

  loading: {
    minHeight: "300px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#6b7280",
  },

  spinner: {
    width: "38px",
    height: "38px",
    border:
      "4px solid #e5e7eb",
    borderTop:
      "4px solid #111827",
    borderRadius: "50%",
    marginBottom: "12px",
  },

  empty: {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "60px 20px",
    textAlign: "center",
    color: "#6b7280",
  },

  emptyIcon: {
    fontSize: "45px",
    marginBottom: "10px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(310px, 1fr))",
    gap: "20px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "22px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.04)",
    cursor: "pointer",
    transition:
      "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
  },

  cardHeader: {
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

  ratingBox: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    padding: "18px 0 12px",
  },

  ratingLabel: {
    margin: 0,
    color: "#9ca3af",
    fontSize: "11px",
  },

  averageRating: {
    fontSize: "21px",
    fontWeight: "800",
    marginTop: "4px",
  },

  outOf: {
    color: "#9ca3af",
    fontSize: "13px",
    fontWeight: "500",
  },

  ratingCount: {
    background: "#f9fafb",
    padding: "8px 10px",
    borderRadius: "8px",
    fontWeight: "700",
    fontSize: "13px",
  },

  userRating: {
    background: "#fffbeb",
    color: "#92400e",
    padding: "9px 11px",
    borderRadius: "8px",
    fontSize: "12px",
    marginBottom: "12px",
  },

  notRated: {
    background: "#f9fafb",
    color: "#6b7280",
    padding: "9px 11px",
    borderRadius: "8px",
    fontSize: "12px",
    marginBottom: "12px",
  },

  rateButton: {
    width: "100%",
    border: "none",
    background: "#111827",
    color: "#ffffff",
    padding: "12px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "600",
  },

  clickHint: {
    margin: "9px 0 0",
    textAlign: "center",
    color: "#9ca3af",
    fontSize: "11px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(17, 24, 39, 0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
  },

  modal: {
    width: "100%",
    maxWidth: "440px",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "30px",
    position: "relative",
    textAlign: "center",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.2)",
  },

  closeButton: {
    position: "absolute",
    right: "15px",
    top: "15px",
    width: "32px",
    height: "32px",
    border: "none",
    borderRadius: "50%",
    background: "#f3f4f6",
    fontSize: "20px",
    cursor: "pointer",
  },

  modalIcon: {
    fontSize: "40px",
    marginBottom: "8px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "22px",
  },

  modalDescription: {
    color: "#6b7280",
    fontSize: "13px",
    margin: "8px 0 20px",
  },

  stars: {
    display: "flex",
    justifyContent: "center",
    gap: "5px",
    margin: "10px 0",
  },

  star: {
    border: "none",
    background: "transparent",
    fontSize: "42px",
    cursor: "pointer",
    padding: "2px",
    transition:
      "transform 0.1s ease",
  },

  selectedRating: {
    color: "#6b7280",
    fontSize: "13px",
    marginBottom: "25px",
  },

  modalActions: {
    display: "flex",
    gap: "10px",
  },

  cancelButton: {
    flex: 1,
    border:
      "1px solid #d1d5db",
    background: "#ffffff",
    padding: "12px",
    borderRadius: "9px",
    cursor: "pointer",
  },

  submitButton: {
    flex: 1,
    border: "none",
    background: "#111827",
    color: "#ffffff",
    padding: "12px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "600",
  },
};