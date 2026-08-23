const express = require("express");
const cors = require("cors");
const path = require("path");

const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const storeRoutes = require("./routes/stores");
const ratingRoutes = require("./routes/ratings");
const ownerRoutes = require("./routes/owner");

const pool = require("./config/db");

const app = express();

// =====================================================
// CORS
// =====================================================

app.use(
  cors({
    origin: true,
    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// =====================================================
// DATABASE
// =====================================================

app.locals.db = pool;

// =====================================================
// API ROOT
// GET /
// =====================================================

app.get("/", (req, res) => {
  res.json({
    message: "Roxiler Store Rating Application",
    status: "OK",
  });
});

// =====================================================
// HEALTH CHECK
// GET /api/health
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    message: "Roxiler API is running",
    status: "OK",
  });
});

// =====================================================
// API INFORMATION
// GET /api
// =====================================================

app.get("/api", (req, res) => {
  res.json({
    message: "Roxiler Store Rating API",
    status: "OK",

    routes: {
      auth: "/api/auth",
      admin: "/api/admin",
      stores: "/api/stores",
      ratings: "/api/ratings",
      owner: "/api/owner",
    },
  });
});

// =====================================================
// API ROUTES
// =====================================================

// AUTHENTICATION
app.use(
  "/api/auth",
  authRoutes
);

// ADMIN
app.use(
  "/api/admin",
  adminRoutes
);

// STORES
app.use(
  "/api/stores",
  storeRoutes
);

// RATINGS
app.use(
  "/api/ratings",
  ratingRoutes
);

// STORE OWNER
app.use(
  "/api/owner",
  ownerRoutes
);
// =====================================================
// SERVE REACT FRONTEND
// =====================================================

// React production build path:
// client/dist

const clientDistPath = path.join(
  __dirname,
  "../client/dist"
);

// Only serve the React frontend if the build exists.
// This backend is deployed separately on Render,
// so client/dist may not exist in this service.

if (require("fs").existsSync(clientDistPath)) {
  app.use(
    express.static(clientDistPath)
  );

  // =====================================================
  // REACT SPA FALLBACK
  // =====================================================

  app.use((req, res, next) => {
    if (
      req.method === "GET" &&
      !req.originalUrl.startsWith("/api/")
    ) {
      return res.sendFile(
        path.join(
          clientDistPath,
          "index.html"
        )
      );
    }

    next();
  });
}

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  return res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Global server error:",
      error
    );

    return res.status(500).json({
      message:
        "Internal server error",
    });
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = app;