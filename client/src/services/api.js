import axios from "axios";

// =====================================================
// AXIOS API CLIENT
// =====================================================

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "https://roxiler-store-rating-j6fz.onrender.com/api",

  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// ATTACH JWT TOKEN TO EVERY REQUEST
// =====================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("roxiler_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    // TOKEN EXPIRED / INVALID
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;

      // Don't redirect if already on login page
      if (currentPath !== "/login") {
        localStorage.removeItem("roxiler_token");
        localStorage.removeItem("roxiler_user");

        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// =====================================================
// EXPORT
// =====================================================

export default api;