# 🎬 YT Watch Party

Watch YouTube videos in sync with friends in real-time.

## Tech Stack

- **Frontend:** React + Vite, Socket.IO Client, React Router
- **Backend:** Node.js, Express, Socket.IO, MongoDB (Mongoose)
- **Deploy:** Render (backend) + Vercel/Netlify (frontend)

## Features

- Create or join rooms with a code
- Synchronized play, pause, seek for all participants
- Host can load any YouTube video
- Role system: Host → Moderator → Participant
- Host can promote/demote moderators and kick participants
- Auto-sync when a new user joins

## Local Development

### Backend
```bash
cd backend
npm install
# create .env from .env.example and fill in values
npm run dev
```

### Frontend
```bash
cd frontend
npm install
# create .env from .env.example and fill in values
npm run dev
```

## Deployment

### Backend → Render
1. Push code to GitHub
2. Create new **Web Service** on [render.com](https://render.com)
3. Root Directory: `backend`
4. Build Command: `npm install`
5. Start Command: `node server.js`
6. Add environment variables:
   - `MONGO_URI` = your MongoDB Atlas URI
   - `PORT` = 5000

### Frontend → Vercel
1. Create new project on [vercel.com](https://vercel.com)
2. Root Directory: `frontend`
3. Framework: Vite
4. Add environment variable:
   - `VITE_BACKEND_URL` = your Render backend URL

### Frontend → Netlify
1. Create new site on [netlify.com](https://netlify.com)
2. Base directory: `frontend`
3. Build command: `npm run build`
4. Publish directory: `frontend/dist`
5. Add environment variable:
   - `VITE_BACKEND_URL` = your Render backend URL

## Environment Variables

### backend/.env
```
PORT=5000
MONGO_URI=mongodb+srv://...
```

### frontend/.env
```
VITE_BACKEND_URL=http://localhost:5000
```
