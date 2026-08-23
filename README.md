# 🏪 Roxiler Store Rating Platform

A full-stack web application developed for the **FullStack Intern Coding Challenge**.

The platform allows users to register, log in, browse stores, submit ratings from **1 to 5**, update ratings, and access different features based on their role.

---

## 🌐 Live Demo

| Service | Live Link |
|---|---|
| 🎨 Frontend | https://roxiler-store-rating-frontend-alri.onrender.com |
| ⚙️ Backend API | https://roxiler-store-rating-j6fz.onrender.com |

---

# 🛠 Tech Stack

| Layer | Technology |

| Frontend | React.js |
| Routing | React Router |
| API Communication | Axios |
| Backend | Node.js + Express.js |
| Database | MySQL |
| Cloud Database | Aiven MySQL |
| Authentication | JWT |
| Authorization | Role-Based Access Control |
| Frontend Deployment | Render Static Site |
| Backend Deployment | Render Web Service |

---

# 🏗 Application Architecture

```text
┌──────────────────────┐
│   React Frontend     │
│   (Render Static)    │
└──────────┬───────────┘
           │
           │ REST API / HTTP
           ▼
┌──────────────────────┐
│  Express.js Backend  │
│  (Render Web Service)│
│                      │
│ • Authentication     │
│ • Authorization      │
│ • Validation         │
│ • Business Logic     │
└──────────┬───────────┘
           │
           │ MySQL Queries
           ▼
┌──────────────────────┐
│    Aiven MySQL       │
│   Cloud Database     │
└──────────────────────┘

Application Flow:-

-User
  ↓
-React Frontend
  ↓
-Express.js REST API
  ↓
-Authentication & Business Logic
  ↓
-MySQL Database


👥 User Roles

The application supports three different roles.

 Role	             Main Access
👨‍💼 ADMIN	         User, Store and Rating Management
👤 USER	         Browse and Rate Stores
🏪 STORE_OWNER 	View Store Ratings and Users


👨‍💼 System Administrator Features

The System Administrator can:

* Add new stores
* Add normal users
* Add admin users
* View dashboard statistics
* View total users
* View total stores
* View total submitted ratings
* View all stores
* View users
* View user details
* View Store Owner rating information
* Filter listings
* Sort listings
* Log out securely

Store Information

* Field
* Name
* Email
* Address
* Overall Rating

User Information

* Field
* Name
* Email
* Address
* Role

Filtering

Admin listings support filtering based on:
* Name
* Email
* Address
* Role
👤 Normal User Features

A Normal User can:

* Sign up
* Log in
* Change/update password
* View registered stores
* Search stores by Name
* Search stores by Address
* View overall store ratings
* View their submitted rating
* Submit ratings
* Modify/update submitted ratings
* Log out securely

Store Listing Information -:

* Field
* Store Name
* Address
* Overall Rating
* User's Submitted Rating
* Submit Rating
* Update Rating

🏪 Store Owner Features

A Store Owner can:

* Log in
* Change/update password
* Access the Store Owner Dashboard
* View users who submitted ratings
* View the average rating of their store
* Log out securely

⭐ Rating System
Requirement	               Implementation
Rating Range	            1 to 5
Submit Rating.          	✅ Supported
Update Rating	            ✅ Supported
Overall Store Rating	      ✅ Supported
Average Rating.            ✅ Supported
User Rating per Store	   One rating record per user/store

🔐 Authentication & Authorization

A single authentication system is used for all users.

Login
  │
  ▼
Authentication
  │
  ▼
Check User Role
  │
  ├── ADMIN ───────► Admin Dashboard
  │
  ├── USER ────────► Store Listing & Rating
  │
  └── STORE_OWNER ─► Owner Dashboard

📝 Form Validation Constraints

Field	Validation.       Constraint
Name	                  Minimum 20 characters
Name	                  Maximum 60 characters
Address              	Maximum 400 characters
Password             	Minimum 8 characters
Password             	Maximum 16 characters
Password	               At least one uppercase letter
Password             	At least one special character
Email	                  Standard email validation
Rating	               Minimum 1
Rating	               Maximum 5

🔍 Search, Filtering & Sorting

The application supports:- 

Feature	Supported
Search Store by Name	      ✅
Search Store by Address	   ✅
Filter Users	            ✅
Filter Stores           	✅
Filter by Name	            ✅
Filter by Email         	✅
Filter by Address       	✅
Filter by Role	            ✅
Ascending Sorting       	✅
Descending Sorting	      ✅


🗄 Database Design

The application uses three core tables.

┌───────────────┐
│     USERS     │
│               │
│ id            │
│ name          │
│ email         │
│ password      │
│ address       │
│ role          │
└───────┬───────┘
        │
        │ Store Owner
        ▼
┌───────────────┐
│    STORES     │
│               │
│ id            │
│ name          │
│ email         │
│ address       │
│ owner_id      │
└───────┬───────┘
        │
        │
        ▼
┌───────────────┐
│    RATINGS    │
│               │
│ id            │
│ user_id       │
│ store_id      │
│ rating        │
└───────────────┘

🚀 Deployment
Component	               Platform
React Frontend            	Render Static Site
Express Backend           	Render Web Service
MySQL Database            	Aiven

Frontend -
https://roxiler-store-rating-frontend-alri.onrender.com

Backend -
https://roxiler-store-rating-j6fz.onrender.com



