# Basic Auto Finance Quote

## Tech stack
- Frontend: Vue 3 + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Storage: JSON file on disk (`backend/data/quotes.json`)

## How to run

### Backend
cd backend
npm install
npm run dev

Backend runs at http://localhost:4000

### Frontend
cd frontend
npm install
npm run dev

Frontend runs at the URL Vite prints (e.g. http://localhost:5173 or http://localhost:5174).

## Notes / trade-offs
- Quotes are stored in a simple JSON file instead of a real database for simplicity.
- No authentication; all quotes are shared.
- Basic styling only; focus was on structure and calculations.

