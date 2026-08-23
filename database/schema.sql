CREATE DATABASE IF NOT EXISTS roxiler_rating_system;

USE roxiler_rating_system;

-- =========================================
-- USERS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,

    name VARCHAR(60) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    address VARCHAR(400) NOT NULL,

    role ENUM(
        'ADMIN',
        'USER',
        'STORE_OWNER'
    ) NOT NULL DEFAULT 'USER',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================
-- STORES TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS stores (
    id INT PRIMARY KEY AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL,

    email VARCHAR(255) NOT NULL,

    address VARCHAR(400) NOT NULL,

    owner_id INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_store_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- =========================================
-- RATINGS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,

    user_id INT NOT NULL,

    store_id INT NOT NULL,

    rating TINYINT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_rating
        CHECK (
            rating >= 1
            AND rating <= 5
        ),

    CONSTRAINT fk_rating_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_rating_store
        FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT unique_user_store_rating
        UNIQUE (user_id, store_id)
);

-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX idx_users_name
    ON users(name);

CREATE INDEX idx_users_email
    ON users(email);

CREATE INDEX idx_users_role
    ON users(role);

CREATE INDEX idx_stores_name
    ON stores(name);

CREATE INDEX idx_stores_address
    ON stores(address);

CREATE INDEX idx_stores_owner_id
    ON stores(owner_id);

CREATE INDEX idx_ratings_store_id
    ON ratings(store_id);

CREATE INDEX idx_ratings_user_id
    ON ratings(user_id);