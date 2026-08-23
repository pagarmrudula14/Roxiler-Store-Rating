const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();
const authenticateToken = require("../middleware/auth");

// =====================================================
// AUTHENTICATION
// =====================================================

router.use(authenticateToken);

// =====================================================
// ADMIN ACCESS CHECK
// =====================================================

router.use((req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "Administrator access required",
    });
  }

  next();
});

// =====================================================
// VALIDATION HELPERS
// =====================================================

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validatePassword = (password) => {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 16
  ) {
    return "Password must be between 8 and 16 characters";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character";
  }

  return null;
};

// =====================================================
// ADMIN DASHBOARD
// GET /api/admin/dashboard
// =====================================================

router.get("/dashboard", async (req, res) => {
  try {
    const db = req.app.locals.db;

    const [[usersResult]] = await db.query(
      "SELECT COUNT(*) AS totalUsers FROM users"
    );

    const [[storesResult]] = await db.query(
      "SELECT COUNT(*) AS totalStores FROM stores"
    );

    const [[ratingsResult]] = await db.query(
      "SELECT COUNT(*) AS totalRatings FROM ratings"
    );

    return res.json({
      totalUsers: Number(usersResult.totalUsers || 0),
      totalStores: Number(storesResult.totalStores || 0),
      totalRatings: Number(ratingsResult.totalRatings || 0),
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return res.status(500).json({
      message: "Unable to load admin dashboard",
    });
  }
});

// =====================================================
// GET USERS
// GET /api/admin/users
//
// Includes:
// - Name
// - Email
// - Address
// - Role
// - Store Owner average rating
// - Total ratings
// - Sorting
// - Name filter
// - Email filter
// - Address filter
// - Role filter
// =====================================================

router.get("/users", async (req, res) => {
  try {
    const db = req.app.locals.db;

    const {
      name = "",
      email = "",
      address = "",
      role = "",
      sortBy = "name",
      order = "asc",
    } = req.query;

    // -------------------------------------------------
    // SAFE SORTING
    // -------------------------------------------------

    const allowedSortFields = {
      name: "u.name",
      email: "u.email",
      address: "u.address",
      role: "u.role",
      rating: "owner_rating",
      total_ratings: "total_ratings",
    };

    const sortColumn =
      allowedSortFields[sortBy] || "u.name";

    const sortOrder =
      String(order).toLowerCase() === "desc"
        ? "DESC"
        : "ASC";

    // -------------------------------------------------
    // BASE QUERY
    // -------------------------------------------------

    let query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.address,
        u.role,
        u.created_at,

        ROUND(
          COALESCE(
            AVG(
              CASE
                WHEN u.role = 'STORE_OWNER'
                THEN r.rating
                ELSE NULL
              END
            ),
            0
          ),
          1
        ) AS owner_rating,

        COUNT(
          CASE
            WHEN u.role = 'STORE_OWNER'
            THEN r.id
            ELSE NULL
          END
        ) AS total_ratings

      FROM users u

      LEFT JOIN stores s
        ON s.owner_id = u.id

      LEFT JOIN ratings r
        ON r.store_id = s.id

      WHERE 1 = 1
    `;

    const params = [];

    // -------------------------------------------------
    // SEARCH NAME
    // -------------------------------------------------

    if (String(name).trim()) {
      query += `
        AND u.name LIKE ?
      `;

      params.push(`%${String(name).trim()}%`);
    }

    // -------------------------------------------------
    // SEARCH EMAIL
    // -------------------------------------------------

    if (String(email).trim()) {
      query += `
        AND u.email LIKE ?
      `;

      params.push(`%${String(email).trim()}%`);
    }

    // -------------------------------------------------
    // SEARCH ADDRESS
    // -------------------------------------------------

    if (String(address).trim()) {
      query += `
        AND u.address LIKE ?
      `;

      params.push(`%${String(address).trim()}%`);
    }

    // -------------------------------------------------
    // FILTER ROLE
    // -------------------------------------------------

    if (String(role).trim()) {
      const allowedRoles = [
        "USER",
        "STORE_OWNER",
        "ADMIN",
      ];

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          message: "Invalid role filter",
        });
      }

      query += `
        AND u.role = ?
      `;

      params.push(role);
    }

    // -------------------------------------------------
    // GROUP
    // -------------------------------------------------

    query += `
      GROUP BY
        u.id,
        u.name,
        u.email,
        u.address,
        u.role,
        u.created_at
    `;

    // -------------------------------------------------
    // SORT
    // -------------------------------------------------

    query += `
      ORDER BY
        ${sortColumn}
        ${sortOrder}
    `;

    // -------------------------------------------------
    // EXECUTE
    // -------------------------------------------------

    const [users] = await db.query(
      query,
      params
    );

    // -------------------------------------------------
    // FORMAT USERS
    // -------------------------------------------------

    const formattedUsers = users.map((user) => ({
      id: Number(user.id),

      name: user.name || "",

      email: user.email || "",

      address: user.address || "",

      role: user.role || "",

      rating:
        user.role === "STORE_OWNER"
          ? Number(user.owner_rating || 0)
          : 0,

      total_ratings:
        user.role === "STORE_OWNER"
          ? Number(user.total_ratings || 0)
          : 0,

      created_at: user.created_at || null,
    }));

    return res.json(formattedUsers);
  } catch (error) {
    console.error("Get admin users error:", error);

    return res.status(500).json({
      message: "Unable to load users",
    });
  }
});

// =====================================================
// GET USER DETAILS
// GET /api/admin/users/:id
// =====================================================

router.get("/users/:id", async (req, res) => {
  try {
    const db = req.app.locals.db;

    const userId = Number(req.params.id);

    // -------------------------------------------------
    // VALIDATE USER ID
    // -------------------------------------------------

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    // -------------------------------------------------
    // GET USER DETAILS
    // -------------------------------------------------

    const [users] = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.address,
        u.role,

        ROUND(
          COALESCE(
            AVG(
              CASE
                WHEN u.role = 'STORE_OWNER'
                THEN r.rating
                ELSE NULL
              END
            ),
            0
          ),
          1
        ) AS rating,

        COUNT(
          CASE
            WHEN u.role = 'STORE_OWNER'
            THEN r.id
            ELSE NULL
          END
        ) AS total_ratings

      FROM users u

      LEFT JOIN stores s
        ON s.owner_id = u.id

      LEFT JOIN ratings r
        ON r.store_id = s.id

      WHERE u.id = ?

      GROUP BY
        u.id,
        u.name,
        u.email,
        u.address,
        u.role
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = users[0];

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.json({
      id: Number(user.id),

      name: user.name || "",

      email: user.email || "",

      address: user.address || "",

      role: user.role || "",

      rating:
        user.role === "STORE_OWNER"
          ? Number(user.rating || 0)
          : 0,

      total_ratings:
        user.role === "STORE_OWNER"
          ? Number(user.total_ratings || 0)
          : 0,
    });
  } catch (error) {
    console.error(
      "Get admin user details error:",
      error
    );

    return res.status(500).json({
      message: "Unable to load user details",
    });
  }
});

// =====================================================
// CREATE USER
// POST /api/admin/users
// =====================================================

router.post("/users", async (req, res) => {
  try {
    const db = req.app.locals.db;

    const {
      name,
      email,
      password,
      address,
      role = "USER",
    } = req.body;

    // -------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------

    if (
      !name ||
      !email ||
      !password ||
      !address
    ) {
      return res.status(400).json({
        message:
          "Name, email, password and address are required",
      });
    }

    // -------------------------------------------------
    // CLEAN INPUT
    // -------------------------------------------------

    const cleanName = String(name).trim();

    const cleanEmail = String(email)
      .trim()
      .toLowerCase();

    const cleanAddress = String(address).trim();

    // -------------------------------------------------
    // NAME VALIDATION
    // -------------------------------------------------

    if (
      cleanName.length < 20 ||
      cleanName.length > 60
    ) {
      return res.status(400).json({
        message:
          "Name must be between 20 and 60 characters",
      });
    }

    // -------------------------------------------------
    // EMAIL VALIDATION
    // -------------------------------------------------

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message:
          "Please enter a valid email address",
      });
    }

    // -------------------------------------------------
    // ADDRESS VALIDATION
    // -------------------------------------------------

    if (cleanAddress.length > 400) {
      return res.status(400).json({
        message:
          "Address must not exceed 400 characters",
      });
    }

    // -------------------------------------------------
    // PASSWORD VALIDATION
    // -------------------------------------------------

    const passwordError =
      validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    // -------------------------------------------------
    // ROLE VALIDATION
    // -------------------------------------------------

    const allowedRoles = [
      "USER",
      "STORE_OWNER",
      "ADMIN",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    // -------------------------------------------------
    // DUPLICATE EMAIL
    // -------------------------------------------------

    const [existing] = await db.query(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [cleanEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message:
          "Email already registered",
      });
    }

    // -------------------------------------------------
    // HASH PASSWORD
    // -------------------------------------------------

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // -------------------------------------------------
    // INSERT USER
    // -------------------------------------------------

    const [result] = await db.query(
      `
      INSERT INTO users
      (
        name,
        email,
        password,
        address,
        role
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        cleanName,
        cleanEmail,
        hashedPassword,
        cleanAddress,
        role,
      ]
    );

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(201).json({
      message: "User created successfully",

      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        address: cleanAddress,
        role,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "Email already registered",
      });
    }

    return res.status(500).json({
      message: "Unable to create user",
    });
  }
});

// =====================================================
// UPDATE USER
// PUT /api/admin/users/:id
// =====================================================

router.put("/users/:id", async (req, res) => {
  try {
    const db = req.app.locals.db;

    const userId = Number(req.params.id);

    // -------------------------------------------------
    // VALIDATE USER ID
    // -------------------------------------------------

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const {
      name,
      email,
      address,
      role,
      password,
    } = req.body;

    // -------------------------------------------------
    // CHECK USER EXISTS
    // -------------------------------------------------

    const [users] = await db.query(
      `
      SELECT
        id,
        name,
        email,
        address,
        role
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // -------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------

    if (
      !name ||
      !email ||
      !address ||
      !role
    ) {
      return res.status(400).json({
        message:
          "Name, email, address and role are required",
      });
    }

    // -------------------------------------------------
    // CLEAN INPUT
    // -------------------------------------------------

    const cleanName = String(name).trim();

    const cleanEmail = String(email)
      .trim()
      .toLowerCase();

    const cleanAddress =
      String(address).trim();

    // -------------------------------------------------
    // NAME VALIDATION
    // -------------------------------------------------

    if (
      cleanName.length < 20 ||
      cleanName.length > 60
    ) {
      return res.status(400).json({
        message:
          "Name must be between 20 and 60 characters",
      });
    }

    // -------------------------------------------------
    // EMAIL VALIDATION
    // -------------------------------------------------

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message:
          "Please enter a valid email address",
      });
    }

    // -------------------------------------------------
    // ADDRESS VALIDATION
    // -------------------------------------------------

    if (cleanAddress.length > 400) {
      return res.status(400).json({
        message:
          "Address must not exceed 400 characters",
      });
    }

    // -------------------------------------------------
    // ROLE VALIDATION
    // -------------------------------------------------

    const allowedRoles = [
      "USER",
      "STORE_OWNER",
      "ADMIN",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    // -------------------------------------------------
    // PREVENT ADMIN FROM REMOVING OWN ADMIN ROLE
    // -------------------------------------------------

    if (
      userId === Number(req.user.id) &&
      role !== "ADMIN"
    ) {
      return res.status(400).json({
        message:
          "You cannot remove your own administrator role",
      });
    }

    // -------------------------------------------------
    // CHECK IF USER OWNS STORES
    // -------------------------------------------------

    const [ownedStores] = await db.query(
      `
      SELECT id
      FROM stores
      WHERE owner_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (
      ownedStores.length > 0 &&
      role !== "STORE_OWNER"
    ) {
      return res.status(400).json({
        message:
          "This user owns a store and must remain STORE_OWNER",
      });
    }

    // -------------------------------------------------
    // DUPLICATE EMAIL
    // -------------------------------------------------

    const [duplicateEmail] =
      await db.query(
        `
        SELECT id
        FROM users
        WHERE email = ?
        AND id <> ?
        LIMIT 1
        `,
        [
          cleanEmail,
          userId,
        ]
      );

    if (duplicateEmail.length > 0) {
      return res.status(409).json({
        message:
          "Email already registered",
      });
    }

    // -------------------------------------------------
    // UPDATE WITH PASSWORD
    // -------------------------------------------------

    if (
      password &&
      String(password).length > 0
    ) {
      const cleanPassword =
        String(password);

      const passwordError =
        validatePassword(
          cleanPassword
        );

      if (passwordError) {
        return res.status(400).json({
          message: passwordError,
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          cleanPassword,
          10
        );

      await db.query(
        `
        UPDATE users
        SET
          name = ?,
          email = ?,
          address = ?,
          role = ?,
          password = ?
        WHERE id = ?
        `,
        [
          cleanName,
          cleanEmail,
          cleanAddress,
          role,
          hashedPassword,
          userId,
        ]
      );
    } else {
      // -------------------------------------------------
      // UPDATE WITHOUT PASSWORD
      // -------------------------------------------------

      await db.query(
        `
        UPDATE users
        SET
          name = ?,
          email = ?,
          address = ?,
          role = ?
        WHERE id = ?
        `,
        [
          cleanName,
          cleanEmail,
          cleanAddress,
          role,
          userId,
        ]
      );
    }

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.json({
      message: "User updated successfully",

      user: {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        address: cleanAddress,
        role,
      },
    });
  } catch (error) {
    console.error(
      "Update user error:",
      error
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "Email already registered",
      });
    }

    return res.status(500).json({
      message:
        "Unable to update user",
    });
  }
});

// =====================================================
// DELETE USER
// DELETE /api/admin/users/:id
// =====================================================

router.delete("/users/:id", async (req, res) => {
  try {
    const db = req.app.locals.db;

    const userId = Number(req.params.id);

    // -------------------------------------------------
    // VALIDATE USER ID
    // -------------------------------------------------

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    // -------------------------------------------------
    // PREVENT SELF DELETE
    // -------------------------------------------------

    if (
      userId === Number(req.user.id)
    ) {
      return res.status(400).json({
        message:
          "You cannot delete your own administrator account",
      });
    }

    // -------------------------------------------------
    // CHECK USER
    // -------------------------------------------------

    const [users] = await db.query(
      `
      SELECT
        id,
        role
      FROM users
      WHERE id = ?
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // -------------------------------------------------
    // CHECK OWNED STORES
    // -------------------------------------------------

    const [ownedStores] =
      await db.query(
        `
        SELECT
          id,
          name
        FROM stores
        WHERE owner_id = ?
        `,
        [userId]
      );

    if (ownedStores.length > 0) {
      return res.status(400).json({
        message:
          "Cannot delete this user because they own one or more stores",
        stores: ownedStores,
      });
    }

    // -------------------------------------------------
    // DELETE USER
    // -------------------------------------------------

    await db.query(
      `
      DELETE FROM users
      WHERE id = ?
      `,
      [userId]
    );

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.json({
      message:
        "User deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete user error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to delete user",
    });
  }
});

// =====================================================
// GET STORES
// GET /api/admin/stores
// =====================================================

router.get("/stores", async (req, res) => {
  try {
    const db = req.app.locals.db;

    const {
      name = "",
      email = "",
      address = "",
      owner_id = "",
      sortBy = "name",
      order = "asc",
    } = req.query;

    // -------------------------------------------------
    // SAFE SORTING
    // -------------------------------------------------

    const allowedSortFields = {
      name: "s.name",
      email: "s.email",
      address: "s.address",
      owner: "u.name",
      rating: "average_rating",
      total_ratings: "total_ratings",
    };

    const sortColumn =
      allowedSortFields[sortBy] ||
      "s.name";

    const sortOrder =
      String(order).toLowerCase() === "desc"
        ? "DESC"
        : "ASC";

    // -------------------------------------------------
    // BASE QUERY
    // -------------------------------------------------

    let query = `
      SELECT
        s.id,
        s.name,
        s.email,
        s.address,
        s.owner_id,

        u.name AS owner_name,
        u.email AS owner_email,

        ROUND(
          COALESCE(
            AVG(r.rating),
            0
          ),
          1
        ) AS average_rating,

        COUNT(r.id) AS total_ratings

      FROM stores s

      LEFT JOIN users u
        ON s.owner_id = u.id

      LEFT JOIN ratings r
        ON s.id = r.store_id

      WHERE 1 = 1
    `;

    const params = [];

    // -------------------------------------------------
    // SEARCH NAME
    // -------------------------------------------------

    if (String(name).trim()) {
      query += `
        AND s.name LIKE ?
      `;

      params.push(
        `%${String(name).trim()}%`
      );
    }

    // -------------------------------------------------
    // SEARCH EMAIL
    // -------------------------------------------------

    if (String(email).trim()) {
      query += `
        AND s.email LIKE ?
      `;

      params.push(
        `%${String(email).trim()}%`
      );
    }

    // -------------------------------------------------
    // SEARCH ADDRESS
    // -------------------------------------------------

    if (String(address).trim()) {
      query += `
        AND s.address LIKE ?
      `;

      params.push(
        `%${String(address).trim()}%`
      );
    }

    // -------------------------------------------------
    // FILTER OWNER
    // -------------------------------------------------

    if (String(owner_id).trim()) {
      const ownerId =
        Number(owner_id);

      if (
        !Number.isInteger(ownerId) ||
        ownerId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid owner ID",
        });
      }

      query += `
        AND s.owner_id = ?
      `;

      params.push(ownerId);
    }

    // -------------------------------------------------
    // GROUP
    // -------------------------------------------------

    query += `
      GROUP BY
        s.id,
        s.name,
        s.email,
        s.address,
        s.owner_id,
        u.name,
        u.email
    `;

    // -------------------------------------------------
    // SORT
    // -------------------------------------------------

    query += `
      ORDER BY
        ${sortColumn}
        ${sortOrder}
    `;

    // -------------------------------------------------
    // EXECUTE
    // -------------------------------------------------

    const [stores] =
      await db.query(
        query,
        params
      );

    // -------------------------------------------------
    // FORMAT
    // -------------------------------------------------

    const formattedStores =
      stores.map((store) => ({
        id: Number(store.id),

        name: store.name || "",

        email: store.email || "",

        address:
          store.address || "",

        owner_id:
          store.owner_id
            ? Number(store.owner_id)
            : null,

        owner_name:
          store.owner_name || "",

        owner_email:
          store.owner_email || "",

        rating:
          Number(
            store.average_rating || 0
          ),

        total_ratings:
          Number(
            store.total_ratings || 0
          ),
      }));

    return res.json(
      formattedStores
    );
  } catch (error) {
    console.error(
      "Get admin stores error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load stores",
    });
  }
});

// =====================================================
// CREATE STORE
// POST /api/admin/stores
// =====================================================

router.post("/stores", async (req, res) => {
  try {
    const db = req.app.locals.db;

    const {
      name,
      email,
      address,
      owner_id,
    } = req.body;

    // -------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------

    if (
      !name ||
      !email ||
      !address ||
      !owner_id
    ) {
      return res.status(400).json({
        message:
          "Store name, email, address and owner are required",
      });
    }

    // -------------------------------------------------
    // CLEAN INPUT
    // -------------------------------------------------

    const cleanName =
      String(name).trim();

    const cleanEmail =
      String(email)
        .trim()
        .toLowerCase();

    const cleanAddress =
      String(address).trim();

    const ownerId =
      Number(owner_id);

    // -------------------------------------------------
    // VALIDATE NAME
    // -------------------------------------------------

    if (
      cleanName.length < 1 ||
      cleanName.length > 60
    ) {
      return res.status(400).json({
        message:
          "Store name must be between 1 and 60 characters",
      });
    }

    // -------------------------------------------------
    // VALIDATE EMAIL
    // -------------------------------------------------

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message:
          "Please enter a valid store email address",
      });
    }

    // -------------------------------------------------
    // VALIDATE ADDRESS
    // -------------------------------------------------

    if (
      cleanAddress.length < 1 ||
      cleanAddress.length > 400
    ) {
      return res.status(400).json({
        message:
          "Address must be between 1 and 400 characters",
      });
    }

    // -------------------------------------------------
    // VALIDATE OWNER ID
    // -------------------------------------------------

    if (
      !Number.isInteger(ownerId) ||
      ownerId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid owner",
      });
    }

    // -------------------------------------------------
    // CHECK OWNER
    // -------------------------------------------------

    const [owners] = await db.query(
      `
      SELECT
        id,
        name,
        email,
        role
      FROM users
      WHERE id = ?
      `,
      [ownerId]
    );

    if (owners.length === 0) {
      return res.status(404).json({
        message:
          "Store owner not found",
      });
    }

    if (
      owners[0].role !== "STORE_OWNER"
    ) {
      return res.status(400).json({
        message:
          "Selected user must have STORE_OWNER role",
      });
    }

    // -------------------------------------------------
    // CREATE STORE
    // -------------------------------------------------

    const [result] = await db.query(
      `
      INSERT INTO stores
      (
        name,
        email,
        address,
        owner_id
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        cleanName,
        cleanEmail,
        cleanAddress,
        ownerId,
      ]
    );

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(201).json({
      message:
        "Store created successfully",

      store: {
        id: result.insertId,

        name: cleanName,

        email: cleanEmail,

        address: cleanAddress,

        owner_id: ownerId,
      },
    });
  } catch (error) {
    console.error(
      "Create store error:",
      error
    );

    if (
      error.code === "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        message:
          "Store with this information already exists",
      });
    }

    return res.status(500).json({
      message:
        "Unable to create store",
    });
  }
});

// =====================================================
// UPDATE STORE
// PUT /api/admin/stores/:id
// =====================================================

router.put("/stores/:id", async (req, res) => {
  try {
    const db = req.app.locals.db;

    const storeId =
      Number(req.params.id);

    // -------------------------------------------------
    // VALIDATE STORE ID
    // -------------------------------------------------

    if (
      !Number.isInteger(storeId) ||
      storeId <= 0
    ) {
      return res.status(400).json({
        message:
          "Invalid store ID",
      });
    }

    const {
      name,
      email,
      address,
      owner_id,
    } = req.body;

    // -------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------

    if (
      !name ||
      !email ||
      !address ||
      !owner_id
    ) {
      return res.status(400).json({
        message:
          "Store name, email, address and owner are required",
      });
    }

    // -------------------------------------------------
    // CLEAN INPUT
    // -------------------------------------------------

    const cleanName =
      String(name).trim();

    const cleanEmail =
      String(email)
        .trim()
        .toLowerCase();

    const cleanAddress =
      String(address).trim();

    const ownerId =
      Number(owner_id);

    // -------------------------------------------------
    // VALIDATE NAME
    // -------------------------------------------------

    if (
      cleanName.length < 1 ||
      cleanName.length > 60
    ) {
      return res.status(400).json({
        message:
          "Store name must be between 1 and 60 characters",
      });
    }

    // -------------------------------------------------
    // VALIDATE EMAIL
    // -------------------------------------------------

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message:
          "Please enter a valid store email address",
      });
    }

    // -------------------------------------------------
    // VALIDATE ADDRESS
    // -------------------------------------------------

    if (
      cleanAddress.length < 1 ||
      cleanAddress.length > 400
    ) {
      return res.status(400).json({
        message:
          "Address must be between 1 and 400 characters",
      });
    }

    // -------------------------------------------------
    // VALIDATE OWNER
    // -------------------------------------------------

    if (
      !Number.isInteger(ownerId) ||
      ownerId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid owner",
      });
    }

    // -------------------------------------------------
    // CHECK STORE EXISTS
    // -------------------------------------------------

    const [stores] =
      await db.query(
        `
        SELECT id
        FROM stores
        WHERE id = ?
        `,
        [storeId]
      );

    if (stores.length === 0) {
      return res.status(404).json({
        message:
          "Store not found",
      });
    }

    // -------------------------------------------------
    // CHECK OWNER
    // -------------------------------------------------

    const [owners] =
      await db.query(
        `
        SELECT
          id,
          name,
          email,
          role
        FROM users
        WHERE id = ?
        `,
        [ownerId]
      );

    if (owners.length === 0) {
      return res.status(404).json({
        message:
          "Store owner not found",
      });
    }

    if (
      owners[0].role !==
      "STORE_OWNER"
    ) {
      return res.status(400).json({
        message:
          "Selected user must have STORE_OWNER role",
      });
    }

    // -------------------------------------------------
    // UPDATE STORE
    // -------------------------------------------------

    await db.query(
      `
      UPDATE stores
      SET
        name = ?,
        email = ?,
        address = ?,
        owner_id = ?
      WHERE id = ?
      `,
      [
        cleanName,
        cleanEmail,
        cleanAddress,
        ownerId,
        storeId,
      ]
    );

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.json({
      message:
        "Store updated successfully",

      store: {
        id: storeId,

        name: cleanName,

        email: cleanEmail,

        address: cleanAddress,

        owner_id: ownerId,
      },
    });
  } catch (error) {
    console.error(
      "Update store error:",
      error
    );

    if (
      error.code === "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        message:
          "Store with this information already exists",
      });
    }

    return res.status(500).json({
      message:
        "Unable to update store",
    });
  }
});

// =====================================================
// DELETE STORE
// DELETE /api/admin/stores/:id
// =====================================================

router.delete(
  "/stores/:id",
  async (req, res) => {
    try {
      const db = req.app.locals.db;

      const storeId =
        Number(req.params.id);

      // -------------------------------------------------
      // VALIDATE STORE ID
      // -------------------------------------------------

      if (
        !Number.isInteger(storeId) ||
        storeId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid store ID",
        });
      }

      // -------------------------------------------------
      // CHECK STORE EXISTS
      // -------------------------------------------------

      const [stores] =
        await db.query(
          `
          SELECT
            id,
            name
          FROM stores
          WHERE id = ?
          `,
          [storeId]
        );

      if (stores.length === 0) {
        return res.status(404).json({
          message:
            "Store not found",
        });
      }

      // -------------------------------------------------
      // DELETE STORE
      // -------------------------------------------------

      await db.query(
        `
        DELETE FROM stores
        WHERE id = ?
        `,
        [storeId]
      );

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.json({
        message:
          "Store deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete store error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to delete store",
      });
    }
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;