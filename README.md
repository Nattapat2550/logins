````markdown
# Full-Stack Auth + CMS Starter

Simple full-stack project with email/Google login, JWT (HttpOnly cookies), role-based access (user/admin), homepage CMS, and image carousel — ready to deploy on Render with PostgreSQL.

---

## 0) Quick Start

```bash
# 1) Clone
git clone <your-repo-url>
cd project

# 2) Create .env in backend/ (from example)
cp backend/.env.example backend/.env
# then fill in values (PORT, DATABASE_URL, FRONTEND_URL, Google keys, etc.)

# 3) Install backend deps
cd backend
npm install

# 4) Init PostgreSQL DB
# Make sure DATABASE_URL in .env points to your database first.
psql "$DATABASE_URL" -f ../database.sql

# 5) Run backend
node server.js   # or nodemon server.js if you use nodemon

# 6) Serve frontend (any static server)
cd ../frontend
npx http-server . -p 8080
# then open http://localhost:8080
````

Defaults / conventions:

* **JWT cookie name**: `token` (HttpOnly)
* **CORS**: backend only accepts requests from `FRONTEND_URL`
* **Public pages (no login)**: `index, about, contact, register, login, check, form, reset`
* **User-only pages**: `home, about, contact, settings`
* **Admin-only pages**: `admin, about, contact`

---

## 1) Tech Stack

**Frontend**

* Static HTML, CSS (light/dark “tech” theme)
* Vanilla JS with `fetch(..., { credentials: 'include' })`
* Simple image carousel and admin CMS UI

**Backend**

* Node.js + Express
* PostgreSQL via `pg`
* JWT Auth (HttpOnly cookie)
* bcrypt password hashing
* Google OAuth 2.0 (login)
* Gmail API for verification / reset emails

**Database**

* PostgreSQL (tables: `users`, `verification_codes`, `password_reset_tokens`, `homepage_content`, `carousel_items`)

**Deploy target**

* Render:

  * Backend Web Service
  * Frontend Static Site
  * Managed Postgres

---

## 2) Project Structure

```text
project/
├── backend/
│   ├── server.js           # Express app entrypoint
│   ├── .env.example
│   ├── package.json
│   ├── config/
│   │   └── db.js           # PostgreSQL pool
│   ├── middleware/
│   │   └── auth.js         # authenticateJWT, isAdmin
│   ├── models/
│   │   ├── user.js         # user & token queries
│   │   └── carousel.js     # carousel queries
│   ├── routes/
│   │   ├── auth.js         # register/login/oauth/verify/reset/logout
│   │   ├── users.js        # profile, avatar, delete
│   │   ├── admin.js        # user admin
│   │   ├── homepage.js     # homepage content CMS
│   │   └── carousel.js     # carousel CRUD
│   └── utils/
│       ├── gmail.js        # Gmail API sender
│       └── generateCode.js # 6-digit codes
├── frontend/
│   ├── *.html              # pages (index, login, home, admin, ...)
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── main.js         # API helper, theme, route guard
│   │   ├── register.js
│   │   ├── check.js
│   │   ├── form.js
│   │   ├── login.js
│   │   ├── reset.js
│   │   ├── home.js         # carousel + homepage content
│   │   └── admin.js        # admin CMS
│   └── images/
│       ├── user.png
│       └── favicon.ico
└── database.sql            # schema + indexes
```

---

## 3) Backend Environment Variables (`backend/.env`)

```env
# Runtime
PORT=5000
NODE_ENV=production
JWT_SECRET=your_jwt_secret_here

# CORS / Frontend
FRONTEND_URL=http://localhost:8080
# e.g. https://your-frontend.onrender.com in production

# Database
DATABASE_URL=postgresql://<user>:<pass>@<host>/<db>

# Google OAuth (Login)
GOOGLE_CLIENT_ID=<...>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<...>
GOOGLE_CALLBACK_URI=https://<your-backend>.onrender.com/api/auth/google/callback

# Gmail API (Send Emails)
GOOGLE_REDIRECT_URI=https://<your-backend>.onrender.com/oauth2callback
REFRESH_TOKEN=<gmail-api-refresh-token>
SENDER_EMAIL=<your@gmail.com>
```

Notes:

* Use **OAuth client type: Web application** for Google OAuth.
* `GOOGLE_CALLBACK_URI` must exactly match one of the **Authorized redirect URIs** in Google Cloud console.

---

## 4) Database Schema (Overview)

Run:

```bash
psql "$DATABASE_URL" -f database.sql
```

Main tables:

* **`users`**

  * `id SERIAL PK`
  * `email UNIQUE NOT NULL`
  * `username`
  * `password_hash` (nullable for pure OAuth users)
  * `role` (`'user'`/`'admin'`, default `'user'`)
  * `profile_picture_url` (default `images/user.png`)
  * `is_email_verified` (boolean)
  * `oauth_provider`, `oauth_id` for Google login
  * timestamps

* **`verification_codes`**

  * 6-digit email verification codes with expiry

* **`password_reset_tokens`**

  * Single-use reset tokens with expiry

* **`homepage_content`**

  * Key–value sections like `welcome_header`, `main_paragraph`

* **`carousel_items`**

  * Slides: `idx`, `title`, `subtitle`, `description`, `image_dataurl`, `created_at`

### Optional: seed an admin user

```sql
INSERT INTO users(email, is_email_verified, role, username)
VALUES ('admin@example.com', true, 'admin', 'admin')
ON CONFLICT DO NOTHING;
```

(Then set password via `/complete-profile` flow or manually hash.)

---

## 5) Backend Responsibilities

### `server.js`

* Loads `.env`

* Configures:

  * CORS with `origin: FRONTEND_URL` and `credentials: true`
  * `cookie-parser`
  * JSON body parsing
  * `/favicon.ico` → `204` response

* Registers routes:

  * `/api/auth/*`
  * `/api/users/*`
  * `/api/admin/*`
  * `/api/homepage`
  * `/api/carousel`

* Central error handler returning JSON.

### `middleware/auth.js`

* `authenticateJWT`

  * Reads `token` cookie
  * Verifies JWT with `JWT_SECRET`
  * Attaches `req.user = { id, role }`
* `isAdmin`

  * Requires `authenticateJWT`
  * Enforces `req.user.role === 'admin'`

### `routes/auth.js` (summary)

* `POST /api/auth/register` — start email registration (send 6-digit code)
* `POST /api/auth/verify-code` — verify code & mark email verified
* `POST /api/auth/complete-profile` — set username & password (after verify or first-time Google)
* `POST /api/auth/login` — email/password login, sets JWT cookie
* `POST /api/auth/logout` — clears cookie
* `POST /api/auth/forgot-password` — send reset link
* `POST /api/auth/reset-password` — reset password using token
* `GET /api/auth/google` — redirect to Google
* `GET /api/auth/google/callback` — handle OAuth callback, upsert user, set cookie

### `routes/users.js`

* `GET /api/users/me` — get current user (id, email, username, role, avatar URL)
* `PUT /api/users/me` — update username
* `POST /api/users/me/avatar` — upload avatar (multipart, stored as data URL)
* `DELETE /api/users/me` — delete own account

### `routes/admin.js` (admin only)

* `GET /api/admin/users` — list all users
* `PUT /api/admin/users/:id` — update user (role, verification, etc.)

### `routes/homepage.js`

* `GET /api/homepage` — public homepage sections
* `PUT /api/homepage` — admin updates/creates sections

### `routes/carousel.js`

* `GET /api/carousel` — public list of slides
* `POST /api/carousel` — admin create slide
* `PUT /api/carousel/:id` — admin update slide
* `DELETE /api/carousel/:id` — admin delete slide

---

## 6) Frontend Behavior

### Global (in `js/main.js`)

* `API_BASE_URL` — points to backend (e.g. `http://localhost:5000`)

* `api(path, options)` helper:

  * Prefixes `API_BASE_URL`
  * Sends JSON
  * Uses `credentials: 'include'` for cookies

* **Theme toggle** (light/dark), stored in `localStorage`

* **Page access control**:

  * On every page load, calls `/api/users/me`
  * If no token or invalid → only public pages allowed
  * If user → can access user pages
  * If admin → can access admin pages
  * Redirects automatically when visiting a page you have no access to

### Auth Flow

* `register.html` / `register.js`

  * Send email to `/api/auth/register`
  * Stores `pendingEmail` in `sessionStorage`
  * Redirects to `check.html`

* `check.html` / `check.js`

  * Reads `pendingEmail`
  * Submits code → `/api/auth/verify-code`
  * On success, go to `form.html`

* `form.html` / `form.js`

  * Submits `username` + `password` → `/api/auth/complete-profile`
  * On success, sets cookie and redirects (`home` or `admin` by role)

* `login.html` / `login.js`

  * Email/password login → `/api/auth/login`
  * Also provides “Sign in with Google”

* `reset.html` / `reset.js`

  * Without `token` query → request reset link
  * With `token` query → set new password

### App Pages

* `home.html` / `home.js`

  * Displays logged-in user data from `/api/users/me`
  * Loads homepage sections via `/api/homepage`
  * Loads carousel via `/api/carousel` and builds slider

* `settings.html`

  * Change username
  * Upload avatar (`/api/users/me/avatar`)
  * Delete account (`DELETE /api/users/me`)

* `admin.html` / `admin.js`

  * Homepage CMS:

    * Edit `homepage_content` sections
  * Carousel CMS:

    * Create, edit, delete slides
    * Client converts uploaded image to data URL → sends to backend
  * User management:

    * Table of users from `/api/admin/users`
    * Update roles / flags via `PUT /api/admin/users/:id`

---

## 7) Security & Sessions

* **JWT**:

  * Signed with `JWT_SECRET`
  * Stored as HttpOnly cookie `token`
  * Use `secure: true` and `sameSite: 'None'` in production (cross-domain)

* **Passwords**: hashed with bcrypt

* **Email verification**: 6-digit numeric code with expiry

* **Password reset**: one-time tokens with expiry

* **CORS**:

  * `origin` = `FRONTEND_URL`
  * `credentials: true`

---

## 8) Deploying on Render (Summary)

**Backend Web Service**

* Root: `backend/`
* Build command: `npm install`
* Start command: `node server.js`
* Add env vars (copy from `.env`)
* Use Render’s Postgres URL as `DATABASE_URL`
* Recommended in `package.json`:

  ```json
  "engines": { "node": ">=18 <25" }
  ```

**Frontend Static Site**

* Root: `frontend/`
* No build command needed
* In backend `.env`, set:

  ```env
  FRONTEND_URL=https://<your-frontend>.onrender.com
  ```

**Database**

* Create Render Managed PostgreSQL
* Set `DATABASE_URL` in backend service
* Run `database.sql` once (from local machine or Render shell)

**Google OAuth**

* Authorized redirect URI:

  ```text
  https://<your-backend>.onrender.com/api/auth/google/callback
  ```

  (Must match `GOOGLE_CALLBACK_URI`)

---

## 9) Local Development Tips

```bash
# backend
cd backend
node server.js          # uses backend/.env

# frontend
cd ../frontend
npx http-server . -p 8080

# set FRONTEND_URL=http://localhost:8080 in backend/.env
```

Example login request:

```bash
curl -i -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
# response will set HttpOnly "token" cookie
```

---

