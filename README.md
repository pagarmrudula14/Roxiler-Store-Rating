# Roxiler Store Rating System

Full-stack assessment project using:
- React.js
- Express.js
- MySQL

The application will support:
- System Administrator
- Normal User
- Store Owner
- Single login with role-based access
- Store ratings from 1 to 5
- Admin dashboard, users/stores management
- User store search and rating
- Store owner dashboard
- Required form validation
- Sorting and filtering

## Project structure

client/  -> React frontend
server/  -> Express backend
database/ -> MySQL schema

## Start

1. Create the MySQL database using `database/schema.sql`.
2. Copy `server/.env.example` to `server/.env` and add your MySQL details.
3. Run the backend:
   `cd server`
   `npm install`
   `npm run dev`
4. Run the frontend:
   `cd client`
   `npm install`
   `npm run dev`

The frontend will call the backend through the configured API base URL.
