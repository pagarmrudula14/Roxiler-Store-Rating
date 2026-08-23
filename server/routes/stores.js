const express = require("express");

const router = express.Router();

const authenticateToken = require("../middleware/auth");

// =====================================================
// AUTHENTICATION
// =====================================================

// Store listing and rating compatibility endpoint
// require authentication.

router.use(authenticateToken);

// =====================================================
// GET ALL STORES
// GET /api/stores
// =====================================================
//
// Normal User requirements:
//
// - View all registered stores
// - Search by Name
// - Search by Address
// - Display Store Name
// - Display Address
// - Display Overall Rating
// - Display User's Submitted Rating
// - Support sorting
//
// Authentication is required because the response contains
// the currently logged-in user's submitted rating.
// =====================================================

router.get("/", async (req, res) => {
  try {
    const db = req.app.locals.db;

    // =================================================
    // GET AUTHENTICATED USER
    // =================================================

    const userId = Number(req.user.id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        message: "Invalid authenticated user",
      });
    }

    // =================================================
    // QUERY PARAMETERS
    // =================================================

    const {
      name = "",
      address = "",
      sortBy = "name",
      order = "asc",
    } = req.query;

    // =================================================
    // CLEAN SEARCH INPUT
    // =================================================

    const searchName =
      typeof name === "string"
        ? name.trim()
        : "";

    const searchAddress =
      typeof address === "string"
        ? address.trim()
        : "";

    // =================================================
    // SAFE SORTING
    // =================================================

    const allowedSortFields = {
      name: "s.name",
      address: "s.address",
      rating: "average_rating",
    };

    const sortColumn =
      allowedSortFields[sortBy] ||
      "s.name";

    const sortOrder =
      String(order).toLowerCase() === "desc"
        ? "DESC"
        : "ASC";

    // =================================================
    // BASE QUERY
    // =================================================

    let query = `
      SELECT
        s.id,
        s.name,
        s.email,
        s.address,

        ROUND(
          COALESCE(
            AVG(r.rating),
            0
          ),
          1
        ) AS average_rating,

        COUNT(r.id) AS total_ratings,

        MAX(
          CASE
            WHEN r.user_id = ? THEN r.rating
            ELSE NULL
          END
        ) AS user_rating

      FROM stores s

      LEFT JOIN ratings r
        ON s.id = r.store_id

      WHERE 1 = 1
    `;

    const params = [userId];

    // =================================================
    // SEARCH BY STORE NAME
    // =================================================

    if (searchName) {
      query += `
        AND s.name LIKE ?
      `;

      params.push(
        `%${searchName}%`
      );
    }

    // =================================================
    // SEARCH BY ADDRESS
    // =================================================

    if (searchAddress) {
      query += `
        AND s.address LIKE ?
      `;

      params.push(
        `%${searchAddress}%`
      );
    }

    // =================================================
    // GROUP RESULTS
    // =================================================

    query += `
      GROUP BY
        s.id,
        s.name,
        s.email,
        s.address
    `;

    // =================================================
    // SORT RESULTS
    // =================================================

    query += `
      ORDER BY
        ${sortColumn}
        ${sortOrder},
        s.id ASC
    `;

    // =================================================
    // EXECUTE QUERY
    // =================================================

    const [stores] =
      await db.query(
        query,
        params
      );

    // =================================================
    // FORMAT RESPONSE
    // =================================================

    const formattedStores =
      stores.map(
        (store) => ({
          id: Number(
            store.id
          ),

          name:
            store.name || "",

          email:
            store.email || "",

          address:
            store.address || "",

          average_rating:
            Number(
              store.average_rating || 0
            ),

          total_ratings:
            Number(
              store.total_ratings || 0
            ),

          user_rating:
            store.user_rating === null ||
            store.user_rating === undefined
              ? 0
              : Number(
                  store.user_rating
                ),
        })
      );

    return res.json(
      formattedStores
    );
  } catch (error) {
    console.error(
      "Get stores error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load stores",
    });
  }
});

// =====================================================
// POST / UPDATE RATING
// POST /api/stores/:id/rate
//
// Compatibility endpoint.
//
// Main rating functionality is implemented in:
//
// POST /api/ratings
//
// This endpoint is kept so existing frontend code does
// not break.
// =====================================================

router.post(
  "/:id/rate",
  async (req, res) => {
    try {
      const db = req.app.locals.db;

      // =================================================
      // GET AUTHENTICATED USER
      // =================================================

      const userId = Number(
        req.user.id
      );

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return res.status(401).json({
          message:
            "Invalid authenticated user",
        });
      }

      // =================================================
      // GET STORE ID
      // =================================================

      const storeId = Number(
        req.params.id
      );

      if (
        !Number.isInteger(storeId) ||
        storeId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid store ID",
        });
      }

      // =================================================
      // GET RATING
      // =================================================

      const numericRating =
        Number(
          req.body.rating
        );

      // =================================================
      // VALIDATE RATING
      // =================================================

      if (
        !Number.isInteger(
          numericRating
        ) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res.status(400).json({
          message:
            "Rating must be an integer between 1 and 5",
        });
      }

      // =================================================
      // CHECK STORE
      // =================================================

      const [stores] =
        await db.query(
          `
          SELECT
            id,
            name
          FROM stores
          WHERE id = ?
          LIMIT 1
          `,
          [storeId]
        );

      if (
        stores.length === 0
      ) {
        return res.status(404).json({
          message:
            "Store not found",
        });
      }

      // =================================================
      // CHECK EXISTING RATING
      // =================================================

      const [existingRating] =
        await db.query(
          `
          SELECT
            id,
            rating
          FROM ratings
          WHERE user_id = ?
          AND store_id = ?
          LIMIT 1
          `,
          [
            userId,
            storeId,
          ]
        );

      // =================================================
      // UPDATE EXISTING RATING
      // =================================================

      if (
        existingRating.length > 0
      ) {
        await db.query(
          `
          UPDATE ratings
          SET
            rating = ?,
            updated_at =
              CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            numericRating,
            existingRating[0].id,
          ]
        );

        // -----------------------------------------------
        // GET UPDATED AVERAGE
        // -----------------------------------------------

        const [
          ratingSummary,
        ] = await db.query(
          `
          SELECT
            ROUND(
              COALESCE(
                AVG(rating),
                0
              ),
              1
            ) AS average_rating,

            COUNT(*) AS total_ratings

          FROM ratings

          WHERE store_id = ?
          `,
          [storeId]
        );

        return res.json({
          message:
            "Rating updated successfully",

          action:
            "updated",

          store_id:
            storeId,

          rating:
            numericRating,

          average_rating:
            Number(
              ratingSummary[0]
                ?.average_rating || 0
            ),

          total_ratings:
            Number(
              ratingSummary[0]
                ?.total_ratings || 0
            ),

          user_rating:
            numericRating,
        });
      }

      // =================================================
      // INSERT NEW RATING
      // =================================================

      await db.query(
        `
        INSERT INTO ratings
        (
          user_id,
          store_id,
          rating
        )
        VALUES
        (?, ?, ?)
        `,
        [
          userId,
          storeId,
          numericRating,
        ]
      );

      // =================================================
      // GET UPDATED AVERAGE
      // =================================================

      const [
        ratingSummary,
      ] = await db.query(
        `
        SELECT
          ROUND(
            COALESCE(
              AVG(rating),
              0
            ),
            1
          ) AS average_rating,

          COUNT(*) AS total_ratings

        FROM ratings

        WHERE store_id = ?
        `,
        [storeId]
      );

      // =================================================
      // RESPONSE
      // =================================================

      return res.status(201).json({
        message:
          "Rating submitted successfully",

        action:
          "created",

        store_id:
          storeId,

        rating:
          numericRating,

        average_rating:
          Number(
            ratingSummary[0]
              ?.average_rating || 0
          ),

        total_ratings:
          Number(
            ratingSummary[0]
              ?.total_ratings || 0
          ),

        user_rating:
          numericRating,
      });
    } catch (error) {
      console.error(
        "Submit store rating error:",
        error
      );

      // =================================================
      // HANDLE UNIQUE CONSTRAINT
      // =================================================

      if (
        error.code ===
        "ER_DUP_ENTRY"
      ) {
        return res.status(409).json({
          message:
            "You have already rated this store",
        });
      }

      return res.status(500).json({
        message:
          "Unable to submit rating",
      });
    }
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;