require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

// =====================================================
// DATABASE AVAILABLE TO APP
// =====================================================

// Make database available to all routes through
// req.app.locals.db

app.locals.db = pool;

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    // -------------------------------------------------
    // TEST DATABASE CONNECTION
    // -------------------------------------------------

    await pool.query("SELECT 1");

    console.log("MySQL connected");

    // -------------------------------------------------
    // START EXPRESS SERVER
    // -------------------------------------------------

    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    // -------------------------------------------------
    // DATABASE CONNECTION ERROR
    // -------------------------------------------------

    console.error(
      "Unable to connect to MySQL:",
      error.message
    );

    process.exit(1);
  }
}

// =====================================================
// RUN SERVER
// =====================================================

startServer();