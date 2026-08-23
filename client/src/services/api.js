import axios from "axios";

// =====================================================
// AXIOS API CLIENT
// =====================================================
//
// Development:
// VITE_API_URL can point to:
// http://localhost:5001/api
//
// Production:
// If VITE_API_URL is not provided, "/api" is used.
// This allows React and Express to work from the
// same deployed domain.
//
// =====================================================

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "/api",

  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// ATTACH JWT TOKEN TO EVERY REQUEST
// =====================================================

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("roxiler_token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =====================================================
// HANDLE API RESPONSES
// =====================================================

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // -------------------------------------------------
    // TOKEN EXPIRED / INVALID
    // -------------------------------------------------

    if (
      error.response?.status === 401
    ) {
      const currentPath =
        window.location.pathname;

      // Don't automatically redirect if already
      // on the login page.
      if (
        currentPath !== "/login"
      ) {
        localStorage.removeItem(
          "roxiler_token"
        );

        localStorage.removeItem(
          "roxiler_user"
        );

        window.location.href =
          "/login";
      }
    }

    return Promise.reject(error);
  }
);

// =====================================================
// EXPORT
// =====================================================

export default api;