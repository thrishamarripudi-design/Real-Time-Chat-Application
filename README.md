# Chatty — MERN Realtime Chat App

A full-stack real-time chat application built with MongoDB, Express, React, Node.js, and Socket.io.

## Features

- Email/password auth with JWT stored in httpOnly cookies
- Real-time 1:1 messaging via Socket.io
- Online/offline presence indicators
- Text and image messages (Cloudinary uploads)
- Profile picture upload
- 32 DaisyUI themes, selectable in Settings
- Responsive UI with skeleton loading states
- Protected routes with persisted sessions

## Tech Stack

| Layer    | Tech                                                              |
|----------|--------------------------------------------------------------------|
| Frontend | React (Vite), Zustand, TailwindCSS + DaisyUI, Axios, React Router  |
| Backend  | Node.js, Express.js                                                |
| Database | MongoDB + Mongoose                                                 |
| Realtime | Socket.io                                                          |
| Auth     | JWT (httpOnly cookies) + bcrypt                                    |
| Storage  | Cloudinary (images)                                                |

## Project Structure

```
/backend
  /src
    /controllers   auth.controller.js, message.controller.js
    /models        user.model.js, message.model.js
    /routes        auth.route.js, message.route.js
    /middleware    auth.middleware.js
    /lib           db.js, socket.js, cloudinary.js, utils.js
    index.js
  .env.example
  package.json
/frontend
  /src
    /components
    /pages
    /store
    /lib
    App.jsx, main.jsx
  package.json
package.json   (root build/start scripts)
```

## Setup

### 1. Prerequisites

- Node.js 18+
- A MongoDB connection string (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- A free [Cloudinary](https://cloudinary.com) account (for image uploads)

### 2. Clone & configure environment variables

```bash
cd backend
cp .env.example .env
```

Fill in `backend/.env`:

```
MONGODB_URI=your_mongodb_connection_string
PORT=5001
JWT_SECRET=a_long_random_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=development
```

### 3. Install dependencies

From the project root:

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 4. Run in development (two terminals)

```bash
# Terminal 1 — backend (http://localhost:5001)
cd backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

The Vite dev server proxies `/api` requests to the backend, and the frontend connects to the backend's Socket.io server directly on port 5001.

### 5. Production build & run

From the project root:

```bash
npm run build   # installs both, builds the frontend into frontend/dist
npm start        # NODE_ENV=production node backend/src/index.js, serves frontend/dist
```

Set `NODE_ENV=production` in `backend/.env` before running `npm start` so Express serves the built frontend and handles the SPA catch-all route.

This single-server setup is deployable to any free-tier Node host (e.g. Render): set the build command to `npm run build` and the start command to `npm start`.

## How it works

- **Auth**: On signup/login, the backend signs a JWT and sets it as an httpOnly cookie. `GET /api/auth/check` is called on app load to restore sessions without exposing the token to JS.
- **Realtime**: On login, the client opens a Socket.io connection passing `userId` in the handshake query. The server keeps an in-memory `userId -> socketId` map, broadcasts `getOnlineUsers` on connect/disconnect, and emits `newMessage` to the specific receiver's socket when a message is sent.
- **Images**: Both profile pictures and message images are base64-encoded client-side, uploaded to Cloudinary by the backend, and only the resulting URL is stored in MongoDB.

## Stretch goals (not implemented — nice to have)

- Typing indicators
- Message read receipts
- Unread message counts per conversation
- Message deletion/editing
- Group chats
- Push notifications
