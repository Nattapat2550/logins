
## 0) TL;DR (Quick Start)

```bash
# 1) Clone
git clone <your-repo-url>
cd project

# 2) Create .env in backend/ (copy from .env.example and fill values)
cp backend/.env.example backend/.env

# 3) Install deps
cd backend && npm install

# 4) Init DB
# Create a PostgreSQL database and run the SQL:
psql "$DATABASE_URL" -f ../database.sql

# 5) Run backend locally
node server.js   # expects PORT, DATABASE_URL, etc. in .env

# 6) Serve frontend locally (simple)
# e.g. with any static server from frontend/:
npx http-server ../frontend -p 8080
```

* Default **JWT cookie** name: `token` (HttpOnly).
* **CORS**: frontend origin must be in `FRONTEND_URL`.
* **Allowed pages** (no token): index, about, contact, register, login, check, form, reset.
* **User-only pages**: home, about, contact, settings.
* **Admin-only pages**: admin, about, contact.

---

## 1) Tech Stack

* **Frontend**: Static HTML + CSS (light/dark theme, “tech” style) + Vanilla JS (fetch with `credentials: 'include'`)
* **Backend**: Node.js (Express) + `pg` for PostgreSQL
* **Auth**: JWT (HttpOnly cookie), bcrypt, Google OAuth 2.0, email verification & reset via Gmail API
* **DB**: PostgreSQL (tables: `users`, `verification_codes`, `password_reset_tokens`, `homepage_content`, `carousel_items`)
* **Deployment**: Render (Backend Web Service + Frontend Static Site + Managed Postgres)

---

## 2) Project Structure

```
project/
├── backend/
│   ├── package.json
│   ├── server.js                 # Express app entrypoint
│   ├── .env.example              # Template env vars
│   ├── config/
│   │   └── db.js                 # PostgreSQL pool/connection
│   ├── middleware/
│   │   └── auth.js               # authenticateJWT, isAdmin
│   ├── models/
│   │   ├── user.js               # User & token queries
│   │   └── carousel.js           # Carousel CRUD queries
│   ├── routes/
│   │   ├── auth.js               # register/login/oauth/verify/reset/logout
│   │   ├── users.js              # /me profile & avatar upload, delete
│   │   ├── admin.js              # Admin: users list/update
│   │   ├── homepage.js           # Homepage content get/update
│   │   └── carousel.js           # Carousel get/create/update/delete
│   └── utils/
│       ├── gmail.js              # Gmail API sender
│       └── generateCode.js       # 6-digit code generator
├── frontend/
│   ├── index.html
│   ├── register.html
│   ├── check.html
│   ├── form.html
│   ├── login.html
│   ├── reset.html
│   ├── home.html
│   ├── settings.html
│   ├── admin.html
│   ├── about.html
│   ├── contact.html
│   ├── css/
│   │   └── style.css             # Light/Dark tech theme + Carousel styles
│   ├── js/
│   │   ├── main.js               # API helper, theme, page guard, dropdown
│   │   ├── register.js
│   │   ├── check.js
│   │   ├── form.js
│   │   ├── login.js
│   │   ├── reset.js
│   │   ├── home.js               # buildCarousel(), homepage content
│   │   └── admin.js              # CMS for homepage + carousel, user table
│   └── images/
│       ├── user.png              # Default avatar
│       └── favicon.ico
└── database.sql                  # Schema (tables, constraints, indexes)
```

---

## 3) Environment Variables (backend/.env)

```env
# Runtime
PORT=5000
NODE_ENV=production
JWT_SECRET=your_jwt_secret

# CORS / Frontend
FRONTEND_URL=https://<your-frontend-onrender>.onrender.com

# Database
DATABASE_URL=postgresql://<user>:<pass>@<host>/<db>

# Google OAuth (Login)
GOOGLE_CLIENT_ID=<...>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<...>
GOOGLE_CALLBACK_URI=https://<your-backend>.onrender.com/api/auth/google/callback

# Gmail API (send emails)
GOOGLE_REDIRECT_URI=https://<your-backend>.onrender.com/oauth2callback
REFRESH_TOKEN=<long-lived-refresh-token>
SENDER_EMAIL=<your-gmail-address>
```

> Use OAuth client type **Web application** and set **Authorized redirect URI** exactly to `/api/auth/google/callback` on your backend domain.

---

## 4) Database Schema

Run `database.sql` to create tables:

* **users**
  `id SERIAL PK`, `username UNIQUE`, `email UNIQUE NOT NULL`,
  `password_hash NULLABLE`, `role DEFAULT 'user'`,
  `profile_picture_url TEXT DEFAULT 'images/user.png'`,
  `is_email_verified BOOLEAN DEFAULT false`,
  `oauth_provider VARCHAR(20)`, `oauth_id VARCHAR(255)`, timestamps.

* **verification_codes**
  `(id, user_id FK, code VARCHAR(6), expires_at TIMESTAMPTZ)`

* **password_reset_tokens**
  `(id, user_id FK, token UNIQUE, expires_at, is_used BOOLEAN DEFAULT false)`

* **homepage_content**
  `(id, section_name UNIQUE, content TEXT)`

* **carousel_items**
  `(id SERIAL PK, idx INT, title TEXT, subtitle TEXT, description TEXT, image_dataurl TEXT, created_at TIMESTAMPTZ DEFAULT now())`

> `image_dataurl` stores base64 data URL for simplicity (no S3 required).

### Seed an admin (optional)

```sql
-- Create verified user with role admin, set password separately (via /complete-profile or manual hash).
INSERT INTO users(email, is_email_verified, role, username)
VALUES ('admin@example.com', true, 'admin', 'admin')
ON CONFLICT DO NOTHING;
```

---

## 5) Backend — Files & Responsibilities

### `server.js`

* Loads `.env`, sets up **CORS** (`origin: FRONTEND_URL`, `credentials: true`), `cookie-parser`, `json`, `/favicon.ico` returns `204`.
* Registers routes:

  * `/api/auth/*` (register, verify, login, google, logout, forgot/reset)
  * `/api/users/*` (profile fetch/update, avatar upload, delete)
  * `/api/admin/*` (user management)
  * `/api/homepage` (get public, admin update)
  * `/api/carousel` (get public, admin CRUD)
* Error handler (JSON).

### `config/db.js`

* Exports a `Pool` (`pg`) using `DATABASE_URL`.
* Ensures `ssl` on production (Render) if needed.

### `middleware/auth.js`

* `authenticateJWT`: reads `token` cookie, verifies JWT, sets `req.user = { id, role }`. 401 on failure.
* `isAdmin`: requires `authenticateJWT` first; checks `req.user.role === 'admin'`; 403 otherwise.

### `models/user.js`

* Functions:

  * `createUnverifiedUser(email)`, `findByEmail(email)`, `findById(id)`
  * `findByOAuthId(provider, oauthId)`
  * `verifyEmail(userId)`, `setUsernameAndPassword(userId, username, passwordHash)`
  * `updateProfile(userId, { username, profile_picture_url })`
  * `storeVerificationCode(userId, code, expiresAt)`, `consumeVerificationCode(email, code)`
  * `createResetToken(userId, token, expiresAt)`, `useResetToken(token)`
  * `deleteUser(userId)`, `getAllUsers()`
  * `setOAuthUser({ email, oauth_provider, oauth_id, profile_picture_url, is_email_verified })`

> **Note on 42P08 type mismatch**: ensure parameters use consistent types; prefer explicit casts for text/varchar if mixing. Queries are written with placeholders and compatible column types to avoid coercion errors.

### `models/carousel.js`

* CRUD for `carousel_items`:

  * `listSlides()` ordered by `idx ASC, id ASC`
  * `createSlide({ idx, title, subtitle, description, image_dataurl })`
  * `updateSlide(id, patch)`
  * `deleteSlide(id)`

### `routes/auth.js`

* **Email registration**:
  `POST /api/auth/register { email }` → create/ensure unverified user, generate 6-digit code, save, email via Gmail API → redirect user to `check.html`.
* **Verify code**:
  `POST /api/auth/verify-code { email, code }` → mark verified; delete code.
* **Complete profile (set username+password)**:
  `POST /api/auth/complete-profile { email, username, password }` → bcrypt hash → issue JWT cookie → success.
* **Email/password login**:
  `POST /api/auth/login { email, password }` → set cookie; redirect role→page.
* **Google OAuth**:

  * `GET /api/auth/google` → redirect to Google consent
  * `GET /api/auth/google/callback` → exchange code → upsert OAuth user → set cookie → redirect to `/admin.html` or `/home.html`
* **Logout**: `POST /api/auth/logout`
* **Forgot / Reset**:

  * `POST /api/auth/forgot-password { email }` → create token+expiry → send link `${FRONTEND_URL}/reset.html?token=...`
  * `POST /api/auth/reset-password { token, newPassword }` → verify token → update password hash → mark used

### `routes/users.js`

* `GET /api/users/me` (auth) → returns `{id, email, username, role, profile_picture_url}`
* `PUT /api/users/me { username }` (auth) → update username
* `POST /api/users/me/avatar` (multipart) (auth) → accept image < 2MB → store as dataURL → update `profile_picture_url`
* `DELETE /api/users/me` (auth) → delete account

### `routes/admin.js` (auth + isAdmin)

* `GET /api/admin/users` → list all users
* `PUT /api/admin/users/:id` → update user info (role, username, mark verify, etc.)

### `routes/homepage.js`

* `GET /api/homepage` (public) → returns array of `{ section_name, content }`
* `PUT /api/homepage` (admin) → upsert section content (e.g., `welcome_header`, `main_paragraph`)

### `routes/carousel.js`

* `GET /api/carousel` (public) → ordered slides
* `POST /api/carousel` (admin) → create slide (`idx`, `title`, `subtitle`, `description`, `image_dataurl`)
* `PUT /api/carousel/:id` (admin) → patch any fields
* `DELETE /api/carousel/:id` (admin)

### `utils/gmail.js`

* One function `sendEmail({ to, subject, text/html })` using `googleapis` OAuth2 with a stored **refresh token** (scope `gmail.send`).

### `utils/generateCode.js`

* `generateCode()` → 6-digit numeric string.

---

## 6) Frontend — Files & Responsibilities

* **Global guard & helpers**

  * `js/main.js`

    * `api(path, { method, body })` wrapper (includes `credentials:'include'`)
    * Theme toggle (persist in `localStorage`)
    * **Page Access Control**:

      * **Guest allowed**: `index, about, contact, register, login, check, form, reset`
      * **User allowed**: `home, about, contact, settings`
      * **Admin allowed**: `admin, about, contact`
      * Redirects depending on `GET /api/users/me` success + role
    * Dropdown menu (click to toggle)

* **Auth screens**

  * `register.js` → submit `{ email }` to `/api/auth/register`, save `sessionStorage.pendingEmail`, go `check.html`
  * `check.js` → reads `pendingEmail`, submit `{ email, code }` `/api/auth/verify-code`
  * `form.js` → set `{ username, password }` `/api/auth/complete-profile`
  * `login.js` → submit `{ email, password }` `/api/auth/login`
  * `reset.js` → without `token`: request link; with `token`: set new password

* **App screens**

  * `home.js`

    * fetch `/api/users/me`, set navbar info
    * fetch `/api/homepage` → fill `welcome_header`, `main_paragraph`
    * fetch `/api/carousel` → **buildCarousel(items)**

      * **Pure CSS/JS** slider
      * `object-fit: fill` (ไม่ครอป), click prev/next **looping** (ไปแรก/ท้าย)
      * `.carousel-indicators` = **circular thumbnails** (click to jump)
      * caption box below
  * `settings.js`

    * `PUT /api/users/me` to update username
    * `POST /api/users/me/avatar` (multipart) to upload avatar
    * `DELETE /api/users/me` to remove account
  * `admin.js`

    * CMS: get/update homepage sections
    * CRUD carousel (upload image → to dataURL on client, send to backend)
    * Users table with `GET /api/admin/users` + `PUT /api/admin/users/:id`

* **Styling**

  * `css/style.css`

    * **Dual Theme**: bright **Light** (default) + **Dark tech** (toggle with 🌓)
    * Tech effects: gradient, glass, neon glow, shadows
    * Carousel styling (buttons, circular thumbnail indicators)
    * Typography nowrap/ellipsis for important elements

---

## 7) API Endpoints (Summary)

**Auth**

* `POST /api/auth/register` → `{ email }`
* `POST /api/auth/verify-code` → `{ email, code }`
* `POST /api/auth/complete-profile` → `{ email, username, password }`
* `POST /api/auth/login` → `{ email, password }`
* `POST /api/auth/logout`
* `POST /api/auth/forgot-password` → `{ email }`
* `POST /api/auth/reset-password` → `{ token, newPassword }`
* `GET /api/auth/google` (redirect)
* `GET /api/auth/google/callback` (OAuth callback)

**Users**

* `GET /api/users/me` (auth)
* `PUT /api/users/me` → `{ username }` (auth)
* `POST /api/users/me/avatar` (multipart, auth)
* `DELETE /api/users/me` (auth)

**Admin**

* `GET /api/admin/users` (admin)
* `PUT /api/admin/users/:id` (admin)

**Homepage**

* `GET /api/homepage` (public)
* `PUT /api/homepage` → `{ section_name, content }` (admin)

**Carousel**

* `GET /api/carousel` (public)
* `POST /api/carousel` → `{ idx, title, subtitle, description, image_dataurl }` (admin)
* `PUT /api/carousel/:id` (admin)
* `DELETE /api/carousel/:id` (admin)

---

## 8) Security & Sessions

* **JWT** signed with `JWT_SECRET`, stored in HttpOnly cookie (`token`)

  * `httpOnly: true`
  * `secure: true` in production
  * `sameSite: 'None'` recommended when frontend/backend are on different domains
* **RBAC**

  * `isAdmin` middleware protects `/api/admin/*`
* **Password hashing**: bcrypt
* **Email verification**: 6-digit code with expiry
* **Reset password**: single-use token with expiry
* **CORS**: `origin: FRONTEND_URL`, `credentials: true`

---

## 9) Render Deployment

### Backend (Web Service)

* Root: `backend/`
* **package.json**: ensure engines avoid Node 24 issues. Example:

  ```json
  "engines": { "node": ">=18 <25" }
  ```
* Build command: `npm install`
* Start command: `node server.js`
* Add environment variables from `.env`
* Ensure *Managed Postgres* `DATABASE_URL` configured

### Frontend (Static Site)

* Root: `frontend/`
* No build command
* Set `FRONTEND_URL` in backend to this site URL

### Database

* Use Render’s internal connection string as `DATABASE_URL`
* Run `database.sql` once to init schema

### Google OAuth

* Authorized redirect URI:
  `https://<your-backend>.onrender.com/api/auth/google/callback`
  Must match `GOOGLE_CALLBACK_URI` exactly.

---

## 10) Troubleshooting & Common Errors

* **`Cannot find module 'compression'`**
  If you added `require('compression')`, ensure it is in `package.json` or remove it. This project doesn’t require it by default.
* **`42P08 text versus character varying`**
  Parameter type mismatch in Postgres. Use consistent types in queries (we use placeholders and matching column types in models).
* **`/favicon.ico 404`**
  This backend returns `204` at `/favicon.ico`. Frontend also contains `images/favicon.ico`. Add `<link rel="icon" href="/favicon.ico">` in HTML.
* **Google OAuth `oauth_failed`**
  Check `GOOGLE_CALLBACK_URI` EXACT match, client ID/secret, consent screen status, and domain allowed.
* **Cookies not set**
  Ensure `sameSite:'None'`, `secure:true` (HTTPS), browser not blocking third-party cookies, and frontend `fetch(..., { credentials:'include' })`.

---

## 11) Local Development

* Backend: `node server.js` (uses `.env`)
* Frontend: any static server (Live Server, http-server, nginx, etc.)
* Set `FRONTEND_URL=http://localhost:8080` when testing locally, and make sure your local server runs at that URL.

**Sample cURL (login)**

```bash
curl -i -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}'
# Set-Cookie: token=...; HttpOnly; Secure; SameSite=None
```

---

## 12) Admin CMS — Carousel & Homepage

* **Homepage**

  * Edit `welcome_header` and `main_paragraph` via `admin.html`
* **Carousel**

  * Add slide: upload image (converted to dataURL), set `idx`, `title`, `subtitle`, `description`
  * Reorder by `idx`
  * Indicators show circular thumbnails; prev/next wraps around (loop)
  * Image fill mode: `object-fit: fill` (no crop)

---

## 13) Page Access Control (Frontend)

* **Guest (no token)**: `index.html`, `about.html`, `contact.html`, `register.html`, `login.html`, `check.html`, `form.html`, `reset.html`
* **User**: `home.html`, `about.html`, `contact.html`, `settings.html`
* **Admin**: `admin.html`, `about.html`, `contact.html`

Implemented in `frontend/js/main.js`:

* On load, it calls `/api/users/me`:

  * if success → redirects to allowed set by role if page not permitted
  * if fail → only guest-allowed pages are accessible, otherwise redirect `index.html`

---

## 14) Extensibility & Future Work

* Switch avatar/carousel storage to S3 or Cloud Storage
* Add rate limiting, helmet, CSRF protections (if forms migrated to non-AJAX)
* Add audit logs for admin actions
* i18n for UI and transactional emails
* Replace Gmail API with transactional email service (SendGrid/Mailgun)

---

## 15) File-by-File (Frontend)

* **`index.html`**: Public landing; “Login” & “Register”
* **`register.html`**: Email registration form (+ “Sign up with Google”)
* **`check.html`**: Enter verification code (email auto-filled from `sessionStorage.pendingEmail`)
* **`form.html`**: Set username & password (after verification or Google first-time)
* **`login.html`**: Email/password login + remember me + forgot password + Google login
* **`reset.html`**: Request reset link or submit new password with `token`
* **`home.html`**: User dashboard; navbar (profile dropdown by click), **carousel**, content loaded from `/api/homepage`
* **`settings.html`**: Update username & upload avatar (file only; no URL field)
* **`admin.html`**: Admin dashboard: homepage editor, carousel CRUD, users table
* **`about.html`, `contact.html`**: Static
* **`css/style.css`**: Light/Dark themes & components styling, carousel, tables, forms
* **`js/main.js`**: API helper, theme toggler, page guard, dropdown
* **`js/<page>.js`**: Per-page logic as described above
* **`images/user.png`**, **`favicon.ico`**

---

## 16) License & Credits

* You may customize and distribute within your project/company needs.
* OAuth and Gmail API usage requires compliance with Google policies.

---
