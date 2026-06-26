# Backend — MERN Blog API

Express + MongoDB API for the Draftcode blog app.

## Setup

```bash
cd be-blog-app-master
cp example.env .env
npm install
```

Configure `.env`:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (e.g. `5000`) |
| `DB_URL` | MongoDB connection string |
| `JWT_TOKEN` | Secret for signing JWTs |
| `USER` / `PASS` | Gmail credentials for password reset emails |
| `FRONTEND_URL` | Frontend origin for reset links |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account string (for Google token verification) |
| `ADMIN_EMAIL` | Email for the **first** admin (bootstrap only) |
| `ADMIN_PASSWORD` | Password when creating a new admin account via bootstrap |
| `ADMIN_USERNAME` | Optional username for a new bootstrap admin (defaults to email local-part) |

## Run

```bash
npm run dev      # nodemon
npm start        # production
npm run seed:admin   # one-off bootstrap (see Admin setup below)
```

## API

- `/api/user` — auth, profile, admin user list, admin role management
- `/api/blog` — blog CRUD
- `/api/comment` — comments

Admin routes require a user with `isAdmin: true` in the database (verified server-side from MongoDB, not from the client).

### Admin role API

```
PATCH /api/user/:id/admin-role
Authorization: Bearer <token>
Body: { "isAdmin": true | false }
```

Only existing admins can promote or demote users. The last admin cannot be demoted.

## Admin setup (production)

There are three supported ways to create the **first** admin. All are safe: bootstrap only runs when **no** admin exists in the database.

### Option 1 — Automatic on deploy (recommended)

Set these environment variables on your hosting platform before the first deploy:

```env
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=your-secure-password
ADMIN_USERNAME=yourname   # optional
```

When the server starts, it will:

1. If an admin already exists → do nothing
2. If a user with `ADMIN_EMAIL` already exists → promote them to admin
3. Otherwise → create a new admin account with the given email/password

Remove `ADMIN_PASSWORD` from env after the first successful deploy if you prefer (bootstrap will no-op once an admin exists).

### Option 2 — One-off seed script

With `DB_URL` and admin env vars set locally or on the server:

```bash
npm run seed:admin
```

Use this for manual setup without restarting the app, or in CI before first traffic.

### Option 3 — Dashboard (after first admin exists)

Log in as an admin → **Dashboard → Users** → use **Make admin** / **Remove admin** on any user.

### Option 4 — MongoDB (manual fallback)

Register a normal account in the app, then in MongoDB Atlas:

```js
db.users.updateOne(
  { email: "you@example.com" },
  { $set: { isAdmin: true } }
)
```

Log out and log back in to refresh the session.

## Deployment

Suggested stack:

| Service | Example hosts |
|---------|----------------|
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) |
| Backend API | Railway, Render, Fly.io |
| Frontend | Netlify, Vercel (or serve `client/dist` from this server) |

### Backend checklist

1. Create a MongoDB Atlas cluster and copy the connection string into `DB_URL`.
2. Set `JWT_TOKEN` to a long random string.
3. Set `NODE_ENV=production`.
4. Set `FRONTEND_URL` to your deployed frontend URL (password reset links).
5. Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` for first deploy (see above).
6. Configure `FIREBASE_SERVICE_ACCOUNT` if using Google sign-in.
7. Run `npm start` (or platform equivalent).

### Frontend checklist

Build the React app separately and set `VITE_API_URL` to your backend origin, e.g.:

```env
VITE_API_URL=https://your-api.example.com
```

Then deploy the `dist` folder to Netlify/Vercel, or copy the build into `be-blog-app-master/client/dist` to serve from Express.

### Production notes

- Uploaded blog images are stored in `uploads/` on disk. Ephemeral hosts (Railway/Render free tiers) may lose files on redeploy — consider S3/Cloudinary for persistent storage later.
- Restrict CORS to your frontend origin when you know the production URL.
- Email login sets `secure` cookies in production; ensure HTTPS on both frontend and API.

## Tests

```bash
npm test
```

## Frontend

The React client lives in `fe-blog-app-master`. Run it separately and proxy `/api` to this server in development.
