const express = require("express");

const router = express.Router();

const db = require("../config/db");
const authenticateToken = require("../middleware/auth");

router.use(authenticateToken);

// =====================================================
// NORMAL USER ACCESS CHECK
// =====================================================
//
// Ratings functionality belongs to NORMAL USERS.
//
// ADMIN and STORE_OWNER have their own functionality
// and should not submit ratings through these routes.
//
// =====================================================

router.use((req, res, next) => {
  if (req.user.role !== "USER") {
    return res.status(403).json({
      message:
        "Only normal users can access store rating functionality.",
    });
  }

  next();
});

// =====================================================
// GET ALL STORES WITH RATINGS
// GET /api/ratings/stores
//
// Normal User requirements:
// - View all registered stores
// - Search by Store Name
// - Search by Store Address
// - View Store Name
// - View Address
// - View Overall Rating
// - View User's Submitted Rating
// - Submit rating
// - Modify submitted rating
// - Sorting support
// =====================================================

router.get("/stores", async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      name = "",
      address = "",
      sortBy = "name",
      order = "asc",
    } = req.query;

    // -------------------------------------------------
    // SAFE SORTING
    // -------------------------------------------------
    //
    // User-controlled values must NEVER be directly
    // inserted into SQL unless they are whitelisted.
    //
    // -------------------------------------------------

    const allowedSortColumns = {
      name: "s.name",
      address: "s.address",
      rating: "average_rating",
    };

    const sortColumn =
      allowedSortColumns[sortBy] ||
      "s.name";

    const sortOrder =
      String(order).toLowerCase() === "desc"
        ? "DESC"
        : "ASC";

    // -------------------------------------------------
    // CLEAN SEARCH VALUES
    // -------------------------------------------------

    const cleanName =
      String(name).trim();

    const cleanAddress =
      String(address).trim();

    const searchName =
      `%${cleanName}%`;

    const searchAddress =
      `%${cleanAddress}%`;

    // -------------------------------------------------
    // GET STORES
    // -------------------------------------------------
    //
    // We use LEFT JOIN so stores with ZERO ratings
    // are also displayed.
    //
    // user_rating is specifically the rating submitted
    // by the currently logged-in normal user.
    //
    // -------------------------------------------------

    const query = `
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

      WHERE
        s.name LIKE ?
        AND s.address LIKE ?

      GROUP BY
        s.id,
        s.name,
        s.email,
        s.address

      ORDER BY
        ${sortColumn}
        ${sortOrder}
    `;

    const [rows] = await db.query(
      query,
      [
        userId,
        searchName,
        searchAddress,
      ]
    );

    // -------------------------------------------------
    // FORMAT RESPONSE
    // -------------------------------------------------

    const stores = rows.map(
      (store) => ({
        id: Number(store.id),

        name:
          store.name || "",

        email:
          store.email || "",

        address:
          store.address || "",

        average_rating:
          Number(
            store.average_rating
          ) || 0,

        total_ratings:
          Number(
            store.total_ratings
          ) || 0,

        user_rating:
          store.user_rating === null
            ? 0
            : Number(
                store.user_rating
              ),
      })
    );

    return res.json(stores);
  } catch (error) {
    console.error(
      "GET /ratings/stores error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to fetch stores.",
    });
  }
});

// =====================================================
// GET CURRENT USER'S RATING FOR A STORE
// GET /api/ratings/store/:storeId
//
// Used when the frontend needs to check whether the
// logged-in user has already rated a particular store.
//
// =====================================================

router.get(
  "/store/:storeId",
  async (req, res) => {
    try {
      const userId =
        Number(req.user.id);

      const storeId =
        Number(req.params.storeId);

      // -------------------------------------------------
      // VALIDATE USER ID
      // -------------------------------------------------

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return res.status(401).json({
          message:
            "Invalid authenticated user.",
        });
      }

      // -------------------------------------------------
      // VALIDATE STORE ID
      // -------------------------------------------------

      if (
        !Number.isInteger(storeId) ||
        storeId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid store ID.",
        });
      }

      // -------------------------------------------------
      // CHECK STORE EXISTS
      // -------------------------------------------------

      const [storeRows] =
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
        storeRows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Store not found.",
        });
      }

      // -------------------------------------------------
      // GET USER RATING
      // -------------------------------------------------

      const [rows] =
        await db.query(
          `
            SELECT
              id,
              rating,
              created_at,
              updated_at
            FROM ratings
            WHERE store_id = ?
            AND user_id = ?
            LIMIT 1
          `,
          [
            storeId,
            userId,
          ]
        );

      return res.json({
        store_id: storeId,

        rating:
          rows.length > 0
            ? Number(
                rows[0].rating
              )
            : 0,

        hasRated:
          rows.length > 0,

        rating_id:
          rows.length > 0
            ? Number(rows[0].id)
            : null,
      });
    } catch (error) {
      console.error(
        "GET /ratings/store/:storeId error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to fetch rating.",
      });
    }
  }
);

// =====================================================
// POST / UPDATE RATING
// POST /api/ratings
//
// Requirements:
// - Rating must be between 1 and 5
// - Normal user can submit rating
// - Normal user can modify existing rating
// - One rating per user per store
//
// =====================================================

router.post(
  "/",
  async (req, res) => {
    let connection;

    try {
      const userId =
        Number(req.user.id);

      const storeId =
        Number(req.body.store_id);

      const rating =
        Number(req.body.rating);

      // -------------------------------------------------
      // VALIDATE USER
      // -------------------------------------------------

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return res.status(401).json({
          message:
            "Invalid authenticated user.",
        });
      }

      // -------------------------------------------------
      // VALIDATE STORE ID
      // -------------------------------------------------

      if (
        !Number.isInteger(storeId) ||
        storeId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid store ID.",
        });
      }

      // -------------------------------------------------
      // VALIDATE RATING
      // -------------------------------------------------
      //
      // Challenge requirement:
      // Rating range = 1 to 5
      //
      // Only integer ratings are accepted.
      //
      // -------------------------------------------------

      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        return res.status(400).json({
          message:
            "Rating must be an integer between 1 and 5.",
        });
      }

      // -------------------------------------------------
      // CHECK STORE EXISTS
      // -------------------------------------------------

      const [storeRows] =
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
        storeRows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Store not found.",
        });
      }

      // -------------------------------------------------
      // GET DATABASE CONNECTION
      // -------------------------------------------------
      //
      // A transaction makes the rating operation safer.
      //
      // If something fails, the transaction is rolled
      // back instead of leaving incomplete changes.
      //
      // -------------------------------------------------

      connection =
        await db.getConnection();

      await connection.beginTransaction();

      // -------------------------------------------------
      // CHECK EXISTING RATING
      // -------------------------------------------------

      const [
        existingRows,
      ] = await connection.query(
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

      let action;
      let ratingId;

      // -------------------------------------------------
      // UPDATE EXISTING RATING
      // -------------------------------------------------

      if (
        existingRows.length > 0
      ) {
        ratingId =
          Number(
            existingRows[0].id
          );

        await connection.query(
          `
            UPDATE ratings
            SET
              rating = ?,
              updated_at =
                CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [
            rating,
            ratingId,
          ]
        );

        action = "updated";
      }

      // -------------------------------------------------
      // INSERT NEW RATING
      // -------------------------------------------------

      else {
        const [
          insertResult,
        ] = await connection.query(
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
            rating,
          ]
        );

        ratingId =
          Number(
            insertResult.insertId
          );

        action = "created";
      }

      // -------------------------------------------------
      // COMMIT
      // -------------------------------------------------

      await connection.commit();

      // -------------------------------------------------
      // RELEASE CONNECTION
      // -------------------------------------------------

      connection.release();
      connection = null;

      // -------------------------------------------------
      // GET FRESH STORE RATING
      // -------------------------------------------------

      const [
        ratingRows,
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

      // -------------------------------------------------
      // GET CURRENT USER RATING
      // -------------------------------------------------

      const [
        userRatingRows,
      ] = await db.query(
        `
          SELECT
            rating
          FROM ratings

          WHERE store_id = ?
          AND user_id = ?

          LIMIT 1
        `,
        [
          storeId,
          userId,
        ]
      );

      const averageRating =
        Number(
          ratingRows[0]
            ?.average_rating
        ) || 0;

      const totalRatings =
        Number(
          ratingRows[0]
            ?.total_ratings
        ) || 0;

      const userRating =
        userRatingRows.length > 0
          ? Number(
              userRatingRows[0]
                .rating
            )
          : 0;

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.status(
        action === "created"
          ? 201
          : 200
      ).json({
        message:
          action === "updated"
            ? "Rating updated successfully."
            : "Rating submitted successfully.",

        action,

        rating_id:
          ratingId,

        store_id:
          storeId,

        rating:
          userRating,

        user_rating:
          userRating,

        average_rating:
          averageRating,

        total_ratings:
          totalRatings,
      });
    } catch (error) {
      // -------------------------------------------------
      // ROLLBACK TRANSACTION
      // -------------------------------------------------

      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Rating rollback error:",
            rollbackError
          );
        }

        connection.release();
      }

      console.error(
        "POST /ratings error:",
        error
      );

      // -------------------------------------------------
      // DUPLICATE RATING
      // -------------------------------------------------
      //
      // This protects against a duplicate
      // (user_id, store_id) record if the database
      // has a UNIQUE constraint.
      //
      // -------------------------------------------------

      if (
        error.code ===
        "ER_DUP_ENTRY"
      ) {
        return res.status(409).json({
          message:
            "You have already submitted a rating for this store. Please modify your existing rating.",
        });
      }

      return res.status(500).json({
        message:
          "Unable to submit rating.",
      });
    }
  }
);

// =====================================================
// DELETE USER RATING
// DELETE /api/ratings/:storeId
//
// This is not explicitly required by the challenge,
// but is useful for maintaining a user's rating.
//
// =====================================================

router.delete(
  "/:storeId",
  async (req, res) => {
    try {
      const userId =
        Number(req.user.id);

      const storeId =
        Number(req.params.storeId);

      // -------------------------------------------------
      // VALIDATE STORE ID
      // -------------------------------------------------

      if (
        !Number.isInteger(storeId) ||
        storeId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid store ID.",
        });
      }

      // -------------------------------------------------
      // CHECK STORE EXISTS
      // -------------------------------------------------

      const [storeRows] =
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
        storeRows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Store not found.",
        });
      }

      // -------------------------------------------------
      // DELETE ONLY CURRENT USER'S RATING
      // -------------------------------------------------

      const [
        result,
      ] = await db.query(
        `
          DELETE FROM ratings
          WHERE user_id = ?
          AND store_id = ?
        `,
        [
          userId,
          storeId,
        ]
      );

      if (
        result.affectedRows === 0
      ) {
        return res.status(404).json({
          message:
            "Rating not found.",
        });
      }

      // -------------------------------------------------
      // GET UPDATED STORE RATING
      // -------------------------------------------------

      const [
        ratingRows,
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

      const averageRating =
        Number(
          ratingRows[0]
            ?.average_rating
        ) || 0;

      const totalRatings =
        Number(
          ratingRows[0]
            ?.total_ratings
        ) || 0;

      return res.json({
        message:
          "Rating deleted successfully.",

        store_id:
          storeId,

        user_rating:
          0,

        average_rating:
          averageRating,

        total_ratings:
          totalRatings,
      });
    } catch (error) {
      console.error(
        "DELETE /ratings/:storeId error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to delete rating.",
      });
    }
  }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;