const express = require("express");

const router = express.Router();

const authenticateToken = require("../middleware/auth");

router.use(authenticateToken);

// =====================================================
// STORE OWNER ACCESS CHECK
// =====================================================
//
// Every route in this file belongs only to STORE_OWNER.
//
// This prevents ADMIN and NORMAL USER accounts from
// accessing Store Owner dashboard information.
//
// =====================================================

router.use((req, res, next) => {
  if (req.user.role !== "STORE_OWNER") {
    return res.status(403).json({
      message: "Store owner access required",
    });
  }

  next();
});

// =====================================================
// STORE OWNER DASHBOARD
// GET /api/owner/dashboard
//
// Requirements:
// - Store Owner can log in
// - Store Owner can view their store
// - Store Owner can see average rating
// - Store Owner can see users who submitted ratings
//
// =====================================================

router.get("/dashboard", async (req, res) => {
  try {
    const db = req.app.locals.db;

    // =================================================
    // VALIDATE OWNER ID
    // =================================================

    const ownerId =
      Number(req.user.id);

    if (
      !Number.isInteger(ownerId) ||
      ownerId <= 0
    ) {
      return res.status(401).json({
        message:
          "Invalid authenticated user",
      });
    }

    // =================================================
    // GET OWNER'S STORES
    // =================================================
    //
    // LEFT JOIN is important because a newly-created
    // store may have zero ratings.
    //
    // Such a store must still appear on the dashboard.
    //
    // =================================================

    const [stores] =
      await db.query(
        `
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

          COUNT(r.id) AS total_ratings

        FROM stores s

        LEFT JOIN ratings r
          ON s.id = r.store_id

        WHERE s.owner_id = ?

        GROUP BY
          s.id,
          s.name,
          s.email,
          s.address

        ORDER BY
          s.name ASC
        `,
        [ownerId]
      );

    // =================================================
    // GET ALL RATINGS FOR OWNER'S STORES
    // =================================================
    //
    // IMPORTANT:
    //
    // The query starts from ratings and joins stores
    // using owner_id.
    //
    // Therefore a Store Owner can ONLY see ratings
    // belonging to stores they own.
    //
    // =================================================

    const [ratings] =
      await db.query(
        `
        SELECT
          r.id,
          r.rating,
          r.store_id,
          r.created_at,
          r.updated_at,

          s.name AS store_name,

          u.id AS user_id,
          u.name AS user_name,
          u.email AS user_email,
          u.address AS user_address

        FROM ratings r

        INNER JOIN stores s
          ON r.store_id = s.id

        INNER JOIN users u
          ON r.user_id = u.id

        WHERE s.owner_id = ?

        ORDER BY
          r.updated_at DESC,
          r.id DESC
        `,
        [ownerId]
      );

    // =================================================
    // GET TOTAL NUMBER OF RATINGS
    // =================================================

    const totalRatings =
      ratings.length;

    // =================================================
    // CALCULATE OVERALL AVERAGE
    // =================================================
    //
    // The database already calculates average rating
    // per store.
    //
    // For convenience, we also provide an overall
    // average across all ratings belonging to this
    // owner's stores.
    //
    // =================================================

    let overallRating = 0;

    if (ratings.length > 0) {
      const ratingSum =
        ratings.reduce(
          (sum, item) =>
            sum + Number(item.rating),
          0
        );

      overallRating =
        Number(
          (
            ratingSum /
            ratings.length
          ).toFixed(1)
        );
    }

    // =================================================
    // FORMAT STORES
    // =================================================

    const formattedStores =
      stores.map(
        (store) => ({
          id:
            Number(store.id),

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
        })
      );

    // =================================================
    // FORMAT RATINGS
    // =================================================
    //
    // Includes:
    // - User Name
    // - User Email
    // - User Address
    // - Rating
    // - Store
    // - Dates
    //
    // =================================================

    const formattedRatings =
      ratings.map(
        (rating) => ({
          id:
            Number(rating.id),

          rating:
            Number(
              rating.rating
            ),

          store_id:
            Number(
              rating.store_id
            ),

          store_name:
            rating.store_name ||
            "",

          user_id:
            Number(
              rating.user_id
            ),

          user_name:
            rating.user_name ||
            "",

          user_email:
            rating.user_email ||
            "",

          user_address:
            rating.user_address ||
            "",

          created_at:
            rating.created_at,

          updated_at:
            rating.updated_at,
        })
      );

    // =================================================
    // RESPONSE
    // =================================================

    return res.json({
      stores:
        formattedStores,

      ratings:
        formattedRatings,

      total_ratings:
        totalRatings,

      overall_rating:
        overallRating,
    });
  } catch (error) {
    console.error(
      "Owner dashboard error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load owner dashboard",
    });
  }
});

// =====================================================
// GET OWNER'S STORES
// GET /api/owner/stores
//
// This endpoint gives the frontend a dedicated store
// list if it wants to display the owner's stores
// separately from the dashboard.
//
// Supports:
// - Name search
// - Address search
// - Sorting
//
// =====================================================

router.get(
  "/stores",
  async (req, res) => {
    try {
      const db = req.app.locals.db;

      const ownerId =
        Number(req.user.id);

      if (
        !Number.isInteger(ownerId) ||
        ownerId <= 0
      ) {
        return res.status(401).json({
          message:
            "Invalid authenticated user",
        });
      }

      const {
        name = "",
        address = "",
        sortBy = "name",
        order = "asc",
      } = req.query;

      // -------------------------------------------------
      // SAFE SORTING
      // -------------------------------------------------

      const allowedSortColumns = {
        name: "s.name",
        email: "s.email",
        address: "s.address",
        rating: "average_rating",
        total_ratings:
          "total_ratings",
      };

      const sortColumn =
        allowedSortColumns[
          sortBy
        ] || "s.name";

      const sortOrder =
        String(order).toLowerCase() ===
        "desc"
          ? "DESC"
          : "ASC";

      // -------------------------------------------------
      // SEARCH VALUES
      // -------------------------------------------------

      const searchName =
        `%${String(name).trim()}%`;

      const searchAddress =
        `%${String(address).trim()}%`;

      // -------------------------------------------------
      // QUERY
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

          COUNT(r.id) AS total_ratings

        FROM stores s

        LEFT JOIN ratings r
          ON s.id = r.store_id

        WHERE
          s.owner_id = ?

          AND s.name LIKE ?

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

      const [stores] =
        await db.query(
          query,
          [
            ownerId,
            searchName,
            searchAddress,
          ]
        );

      // -------------------------------------------------
      // FORMAT
      // -------------------------------------------------

      const formattedStores =
        stores.map(
          (store) => ({
            id:
              Number(store.id),

            name:
              store.name || "",

            email:
              store.email || "",

            address:
              store.address || "",

            average_rating:
              Number(
                store.average_rating ||
                  0
              ),

            total_ratings:
              Number(
                store.total_ratings ||
                  0
              ),
          })
        );

      return res.json(
        formattedStores
      );
    } catch (error) {
      console.error(
        "Get owner stores error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load owner stores",
      });
    }
  }
);

// =====================================================
// GET USERS WHO RATED OWNER'S STORE
// GET /api/owner/ratings
//
// Requirements:
// - Store Owner can see users who submitted ratings
// - Show rating
// - Show user information
// - Show store
// - Sorting
//
// =====================================================

router.get(
  "/ratings",
  async (req, res) => {
    try {
      const db = req.app.locals.db;

      const ownerId =
        Number(req.user.id);

      if (
        !Number.isInteger(ownerId) ||
        ownerId <= 0
      ) {
        return res.status(401).json({
          message:
            "Invalid authenticated user",
        });
      }

      const {
        name = "",
        email = "",
        address = "",
        store_id = "",
        sortBy = "updated_at",
        order = "desc",
      } = req.query;

      // -------------------------------------------------
      // SAFE SORTING
      // -------------------------------------------------

      const allowedSortColumns = {
        name: "u.name",
        email: "u.email",
        address: "u.address",
        rating: "r.rating",
        store: "s.name",
        created_at: "r.created_at",
        updated_at: "r.updated_at",
      };

      const sortColumn =
        allowedSortColumns[
          sortBy
        ] || "r.updated_at";

      const sortOrder =
        String(order).toLowerCase() ===
        "asc"
          ? "ASC"
          : "DESC";

      // -------------------------------------------------
      // BASE QUERY
      // -------------------------------------------------

      let query = `
        SELECT
          r.id,
          r.rating,
          r.store_id,

          r.created_at,
          r.updated_at,

          s.name AS store_name,

          u.id AS user_id,
          u.name AS user_name,
          u.email AS user_email,
          u.address AS user_address

        FROM ratings r

        INNER JOIN stores s
          ON r.store_id = s.id

        INNER JOIN users u
          ON r.user_id = u.id

        WHERE
          s.owner_id = ?
      `;

      const params = [
        ownerId,
      ];

      // -------------------------------------------------
      // SEARCH USER NAME
      // -------------------------------------------------

      if (
        String(name).trim()
      ) {
        query += `
          AND u.name LIKE ?
        `;

        params.push(
          `%${String(
            name
          ).trim()}%`
        );
      }

      // -------------------------------------------------
      // SEARCH USER EMAIL
      // -------------------------------------------------

      if (
        String(email).trim()
      ) {
        query += `
          AND u.email LIKE ?
        `;

        params.push(
          `%${String(
            email
          ).trim()}%`
        );
      }

      // -------------------------------------------------
      // SEARCH USER ADDRESS
      // -------------------------------------------------

      if (
        String(address).trim()
      ) {
        query += `
          AND u.address LIKE ?
        `;

        params.push(
          `%${String(
            address
          ).trim()}%`
        );
      }

      // -------------------------------------------------
      // FILTER STORE
      // -------------------------------------------------

      if (
        String(store_id).trim()
      ) {
        const storeId =
          Number(store_id);

        if (
          !Number.isInteger(
            storeId
          ) ||
          storeId <= 0
        ) {
          return res.status(400).json({
            message:
              "Invalid store ID",
          });
        }

        query += `
          AND s.id = ?
        `;

        params.push(
          storeId
        );
      }

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

      const [ratings] =
        await db.query(
          query,
          params
        );

      // -------------------------------------------------
      // FORMAT
      // -------------------------------------------------

      const formattedRatings =
        ratings.map(
          (rating) => ({
            id:
              Number(
                rating.id
              ),

            rating:
              Number(
                rating.rating
              ),

            store_id:
              Number(
                rating.store_id
              ),

            store_name:
              rating.store_name ||
              "",

            user_id:
              Number(
                rating.user_id
              ),

            user_name:
              rating.user_name ||
              "",

            user_email:
              rating.user_email ||
              "",

            user_address:
              rating.user_address ||
              "",

            created_at:
              rating.created_at,

            updated_at:
              rating.updated_at,
          })
        );

      return res.json(
        formattedRatings
      );
    } catch (error) {
      console.error(
        "Get owner ratings error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load owner ratings",
      });
    }
  }
);

// =====================================================
// GET OWNER SUMMARY
// GET /api/owner/summary
//
// Provides simple dashboard statistics.
//
// =====================================================

router.get(
  "/summary",
  async (req, res) => {
    try {
      const db = req.app.locals.db;

      const ownerId =
        Number(req.user.id);

      if (
        !Number.isInteger(ownerId) ||
        ownerId <= 0
      ) {
        return res.status(401).json({
          message:
            "Invalid authenticated user",
        });
      }

      // -------------------------------------------------
      // STORE COUNT
      // -------------------------------------------------

      const [
        storeCountResult,
      ] = await db.query(
        `
          SELECT
            COUNT(*) AS totalStores
          FROM stores
          WHERE owner_id = ?
        `,
        [ownerId]
      );

      // -------------------------------------------------
      // RATING COUNT + AVERAGE
      // -------------------------------------------------

      const [
        ratingResult,
      ] = await db.query(
        `
          SELECT
            COUNT(r.id) AS totalRatings,

            ROUND(
              COALESCE(
                AVG(r.rating),
                0
              ),
              1
            ) AS averageRating

          FROM ratings r

          INNER JOIN stores s
            ON r.store_id = s.id

          WHERE s.owner_id = ?
        `,
        [ownerId]
      );

      return res.json({
        totalStores:
          Number(
            storeCountResult[0]
              ?.totalStores
          ) || 0,

        totalRatings:
          Number(
            ratingResult[0]
              ?.totalRatings
          ) || 0,

        averageRating:
          Number(
            ratingResult[0]
              ?.averageRating
          ) || 0,
      });
    } catch (error) {
      console.error(
        "Owner summary error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load owner summary",
      });
    }
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;