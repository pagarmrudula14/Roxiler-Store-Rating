const express = require("express");
const cors = require("cors");

const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const storeRoutes = require("./routes/stores");
const ratingRoutes = require("./routes/ratings");
const ownerRoutes = require("./routes/owner");

const pool = require("./config/db");

const app = express();

// ==========================================
// CORS
// ==========================================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
    ],

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

// ==========================================
// BODY PARSER
// ==========================================

app.use(express.json());

app.use(express.urlencoded({
  extended: true,
}));

// ==========================================
// DATABASE
// ==========================================

app.locals.db = pool;

// ==========================================
// ROOT ROUTE
// GET /
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message: "Roxiler Store Rating API is running",
    status: "OK",
  });
});

// ==========================================
// HEALTH CHECK
// GET /api/health
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({
    message: "Roxiler API is running",
    status: "OK",
  });
});

// ==========================================
// API INFORMATION
// GET /api
// ==========================================

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

// ==========================================
// ROUTES
// ==========================================

// ------------------------------------------
// AUTHENTICATION
// ------------------------------------------

app.use(
  "/api/auth",
  authRoutes
);

// ------------------------------------------
// ADMIN
// ------------------------------------------

app.use(
  "/api/admin",
  adminRoutes
);

// ------------------------------------------
// STORES
// ------------------------------------------

app.use(
  "/api/stores",
  storeRoutes
);

// ------------------------------------------
// RATINGS
// ------------------------------------------

app.use(
  "/api/ratings",
  ratingRoutes
);

// ------------------------------------------
// STORE OWNER
// ------------------------------------------

app.use(
  "/api/owner",
  ownerRoutes
);

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  console.error(
    "Global server error:",
    error
  );

  return res.status(500).json({
    message: "Internal server error",
  });
});

// ==========================================
// EXPORT
// ==========================================

module.exports = app;