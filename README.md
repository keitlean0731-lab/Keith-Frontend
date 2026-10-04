# LavaLust frontend

Vue 3 frontend for the LavaLust API backend.

## Setup

1. Make sure the backend is running.
2. Copy `.env.example` to `.env`.
3. Set `VITE_API_URL` to the URL serving LavaLust, for example:

```dotenv
VITE_API_URL=http://localhost:8000
```

4. Install and start the frontend:

```powershell
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` when that port is available.

## Included flows

- Login and registration
- Access-token storage for the current browser session
- Automatic access-token refresh after a 401 response
- Refresh-token rotation through the LavaLust API
- Logout and local token cleanup
- Product overview and catalog management
- Admin-only product creation and deletion
- Admin-only team access view
- Loading, empty, error, and offline API states
- Responsive desktop and mobile layouts

The backend must have `JWT_SECRET`, `REFRESH_TOKEN_KEY`, and a matching
`CORS_ALLOWED_ORIGIN` configured in its `.env` file.
