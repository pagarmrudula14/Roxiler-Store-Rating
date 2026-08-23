const express = require("express");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const authenticateToken = require("../middleware/auth");

const router = express.Router();

// =====================================================

// VALIDATION HELPERS

// =====================================================

// Standard email validation.

//

// IMPORTANT:

// The correct regex uses:

// \.

// and NOT:

// **\\.**

//

// This validation is used for signup, login and

// password-related authenticated requests when needed.

const emailRegex =

  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =====================================================

// PASSWORD VALIDATION

// =====================================================

//

// Company requirements:

//

// - Minimum 8 characters

// - Maximum 16 characters

// - At least one uppercase letter

// - At least one special character

//

// Numbers are not mandatory according to the challenge.

// Lowercase letters are also not mandatory.

//

// Spaces are technically allowed because the challenge

// does not prohibit them.

//

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

// NAME VALIDATION

// =====================================================

//

// Company requirement:

//

// Name: minimum 20 characters

// Name: maximum 60 characters

//

const validateName = (name) => {

  if (

    typeof name !== "string" ||

    name.length < 20 ||

    name.length > 60

  ) {

    return "Name must be between 20 and 60 characters";

  }

  return null;

};

// =====================================================

// ADDRESS VALIDATION

// =====================================================

//

// Company requirement:

//

// Address: maximum 400 characters

//

const validateAddress = (address) => {

  if (

    typeof address !== "string" ||

    address.length > 400

  ) {

    return "Address must not exceed 400 characters";

  }

  return null;

};

// =====================================================

// SIGNUP

// POST /api/auth/signup

// =====================================================

//

// Company requirements:

//

// - Normal User registration

// - Name: 20–60 characters

// - Email: valid email

// - Address: maximum 400 characters

// - Password: 8–16 characters

// - At least one uppercase character

// - At least one special character

//

// IMPORTANT:

//

// Public signup must ALWAYS create a normal USER.

//

// A person cannot send:

//

// role: "ADMIN"

//

// or:

// role: "STORE_OWNER"

//

// through this endpoint.

//

// Only an administrator can create those roles.

//

router.post("/signup", async (req, res) => {

  try {

    const db = req.app.locals.db;

    let {

      name,

      email,

      address,

      password,

    } = req.body;

    // =================================================

    // CLEAN INPUT

    // =================================================

    name =

      typeof name === "string"

        ? name.trim()

        : "";

    email =

      typeof email === "string"

        ? email.trim().toLowerCase()

        : "";

    address =

      typeof address === "string"

        ? address.trim()

        : "";

    // Password should NOT be trimmed because spaces can

    // technically be part of a password.

    password =

      typeof password === "string"

        ? password

        : "";

    // =================================================

    // REQUIRED FIELDS

    // =================================================

    if (

      !name ||

      !email ||

      !address ||

      !password

    ) {

      return res.status(400).json({

        message: "All fields are required",

      });

    }

    // =================================================

    // NAME VALIDATION

    // =================================================

    const nameError =

      validateName(name);

    if (nameError) {

      return res.status(400).json({

        message: nameError,

      });

    }

    // =================================================

    // EMAIL VALIDATION

    // =================================================

    if (!emailRegex.test(email)) {

      return res.status(400).json({

        message:

          "Please enter a valid email address",

      });

    }

    // =================================================

    // ADDRESS VALIDATION

    // =================================================

    const addressError =

      validateAddress(address);

    if (addressError) {

      return res.status(400).json({

        message: addressError,

      });

    }

    // =================================================

    // PASSWORD VALIDATION

    // =================================================

    const passwordError =

      validatePassword(password);

    if (passwordError) {

      return res.status(400).json({

        message: passwordError,

      });

    }

    // =================================================

    // CHECK DUPLICATE EMAIL

    // =================================================

    const [existingUsers] =

      await db.query(

        `

        SELECT

          id

        FROM users

        WHERE email = ?

        LIMIT 1

        `,

        [email]

      );

    if (existingUsers.length > 0) {

      return res.status(409).json({

        message:

          "Email already registered",

      });

    }

    // =================================================

    // HASH PASSWORD

    // =================================================

    const hashedPassword =

      await bcrypt.hash(

        password,

        10

      );

    // =================================================

    // CREATE NORMAL USER

    // =================================================

    //

    // Public signup must ALWAYS create USER.

    //

    // A user cannot choose ADMIN or STORE_OWNER

    // through signup.

    //

    const [result] =

      await db.query(

        `

        INSERT INTO users

        (

          name,

          email,

          password,

          address,

          role

        )

        VALUES (?, ?, ?, ?, 'USER')

        `,

        [

          name,

          email,

          hashedPassword,

          address,

        ]

      );

    // =================================================

    // JWT SECRET CHECK

    // =================================================

    if (!process.env.JWT_SECRET) {

      console.error(

        "JWT_SECRET is not configured"

      );

      return res.status(500).json({

        message:

          "Server configuration error",

      });

    }

    // =================================================

    // CREATE JWT

    // =================================================

    const token = jwt.sign(

      {

        id: result.insertId,

        role: "USER",

      },

      process.env.JWT_SECRET,

      {

        expiresIn: "7d",

      }

    );

    // =================================================

    // RESPONSE

    // =================================================

    return res.status(201).json({

      message:

        "Account created successfully",

      token,

      user: {

        id: result.insertId,

        name,

        email,

        address,

        role: "USER",

      },

    });

  } catch (error) {

    console.error(

      "Signup error:",

      error

    );

    // =================================================

    // HANDLE MYSQL DUPLICATE EMAIL

    // =================================================

    if (

      error.code ===

      "ER_DUP_ENTRY"

    ) {

      return res.status(409).json({

        message:

          "Email already registered",

      });

    }

    return res.status(500).json({

      message:

        "Server error during signup",

    });

  }

});

// =====================================================

// LOGIN

// POST /api/auth/login

// =====================================================

//

// One login system for:

//

// - ADMIN

// - USER

// - STORE_OWNER

//

// The role stored in the database determines where

// the frontend sends the user.

//

router.post("/login", async (req, res) => {

  try {

    const db = req.app.locals.db;

    let {

      email,

      password,

    } = req.body;

    // =================================================

    // CLEAN INPUT

    // =================================================

    email =

      typeof email === "string"

        ? email.trim().toLowerCase()

        : "";

    password =

      typeof password === "string"

        ? password

        : "";

    // =================================================

    // REQUIRED FIELDS

    // =================================================

    if (!email || !password) {

      return res.status(400).json({

        message:

          "Email and password are required",

      });

    }

    // =================================================

    // EMAIL VALIDATION

    // =================================================

    if (!emailRegex.test(email)) {

      return res.status(400).json({

        message:

          "Please enter a valid email address",

      });

    }

    // =================================================

    // FIND USER

    // =================================================

    const [users] =

      await db.query(

        `

        SELECT

          id,

          name,

          email,

          password,

          address,

          role

        FROM users

        WHERE email = ?

        LIMIT 1

        `,

        [email]

      );

    if (users.length === 0) {

      return res.status(401).json({

        message:

          "Invalid email or password",

      });

    }

    const user = users[0];

    // =================================================

    // CHECK PASSWORD

    // =================================================

    const passwordMatch =

      await bcrypt.compare(

        password,

        user.password

      );

    if (!passwordMatch) {

      return res.status(401).json({

        message:

          "Invalid email or password",

      });

    }

    // =================================================

    // VALIDATE STORED ROLE

    // =================================================

    const allowedRoles = [

      "ADMIN",

      "USER",

      "STORE_OWNER",

    ];

    if (

      !allowedRoles.includes(

        user.role

      )

    ) {

      console.error(

        `Invalid role "${user.role}" for user ${user.id}`

      );

      return res.status(403).json({

        message:

          "User account has an invalid role",

      });

    }

    // =================================================

    // JWT SECRET CHECK

    // =================================================

    if (!process.env.JWT_SECRET) {

      console.error(

        "JWT_SECRET is not configured"

      );

      return res.status(500).json({

        message:

          "Server configuration error",

      });

    }

    // =================================================

    // CREATE JWT

    // =================================================

    const token = jwt.sign(

      {

        id: user.id,

        role: user.role,

      },

      process.env.JWT_SECRET,

      {

        expiresIn: "7d",

      }

    );

    // =================================================

    // RESPONSE

    // =================================================

    return res.json({

      message:

        "Login successful",

      token,

      user: {

        id: user.id,

        name: user.name,

        email: user.email,

        address: user.address,

        role: user.role,

      },

    });

} catch (error) {

  console.error(
    "Login error:",
    error
  );

  return res.status(500).json({
    message: error.message || "Server error during login",
  });

} 

});

// =====================================================

// UPDATE PASSWORD

// PUT /api/auth/password

// =====================================================

//

// Requirement:

//

// Normal User:

// - Can update password after login

//

// Store Owner:

// - Can update password after login

//

// Admin:

// - Also allowed to update their password.

//

// Authentication is required because the user ID is

// taken from the verified JWT instead of trusting an ID

// supplied by the frontend.

//

router.put(

  "/password",

  authenticateToken,

  async (req, res) => {

    try {

      const db =

        req.app.locals.db;

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

      // GET PASSWORDS

      // =================================================

      let {

        currentPassword,

        newPassword,

        confirmPassword,

      } = req.body;

      currentPassword =

        typeof currentPassword ===

        "string"

          ? currentPassword

          : "";

      newPassword =

        typeof newPassword ===

        "string"

          ? newPassword

          : "";

      confirmPassword =

        typeof confirmPassword ===

        "string"

          ? confirmPassword

          : "";

      // =================================================

      // REQUIRED FIELDS

      // =================================================

      if (

        !currentPassword ||

        !newPassword ||

        !confirmPassword

      ) {

        return res.status(400).json({

          message:

            "Current password, new password and confirm password are required",

        });

      }

      // =================================================

      // CHECK NEW PASSWORD MATCH

      // =================================================

      if (

        newPassword !==

        confirmPassword

      ) {

        return res.status(400).json({

          message:

            "New password and confirm password do not match",

        });

      }

      // =================================================

      // VALIDATE NEW PASSWORD

      // =================================================

      const passwordError =

        validatePassword(

          newPassword

        );

      if (passwordError) {

        return res.status(400).json({

          message:

            passwordError,

        });

      }

      // =================================================

      // GET USER

      // =================================================

      const [users] =

        await db.query(

          `

          SELECT

            id,

            password,

            role

          FROM users

          WHERE id = ?

          LIMIT 1

          `,

          [userId]

        );

      if (users.length === 0) {

        return res.status(404).json({

          message:

            "User not found",

        });

      }

      const user = users[0];

      // =================================================

      // VALIDATE ROLE

      // =================================================

      const allowedRoles = [

        "ADMIN",

        "USER",

        "STORE_OWNER",

      ];

      if (

        !allowedRoles.includes(

          user.role

        )

      ) {

        return res.status(403).json({

          message:

            "User account has an invalid role",

        });

      }

      // =================================================

      // VERIFY CURRENT PASSWORD

      // =================================================

      const currentPasswordMatch =

        await bcrypt.compare(

          currentPassword,

          user.password

        );

      if (

        !currentPasswordMatch

      ) {

        return res.status(401).json({

          message:

            "Current password is incorrect",

        });

      }

      // =================================================

      // PREVENT SAME PASSWORD

      // =================================================

      const samePassword =

        await bcrypt.compare(

          newPassword,

          user.password

        );

      if (samePassword) {

        return res.status(400).json({

          message:

            "New password must be different from current password",

        });

      }

      // =================================================

      // HASH NEW PASSWORD

      // =================================================

      const hashedPassword =

        await bcrypt.hash(

          newPassword,

          10

        );

      // =================================================

      // UPDATE PASSWORD

      // =================================================

      await db.query(

        `

        UPDATE users

        SET password = ?

        WHERE id = ?

        `,

        [

          hashedPassword,

          userId,

        ]

      );

      // =================================================

      // RESPONSE

      // =================================================

      return res.json({

        message:

          "Password updated successfully",

      });

    } catch (error) {

      console.error(

        "Update password error:",

        error

      );

      return res.status(500).json({

        message:

          "Unable to update password",

      });

    }

  }

);

// =====================================================

// EXPORT

// =====================================================

module.exports = router;