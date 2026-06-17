# AMC Tracker (Cloudflare Native)

Production-ready AMC (Annual Maintenance Contract) Tracker migrated to Cloudflare Workers, D1, R2, and Durable Objects.

## Architecture

- **Frontend**: Next.js 14, tRPC Client, Tailwind CSS, Shadcn UI
- **Backend**: Cloudflare Workers, tRPC Server
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Storage**: Cloudflare R2
- **Realtime**: Cloudflare Durable Objects (WebSockets)
- **AI**: RunPod API Integration

## Getting Started

### 1. Prerequisites
- `node` & `npm`
- `wrangler` CLI (`npm i -g wrangler`)

### 2. Backend Setup
```bash
cd backend
npm install
# Create D1 database
npx wrangler d1 create amc-db
# Push schema
npm run db:migrate
# Run locally
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install --legacy-peer-deps
# Update .env.local with NEXT_PUBLIC_TRPC_URL=http://localhost:8787/trpc
npm run dev
```

## Environment Variables

### Backend (`backend/.env` or Wrangler Secrets)
- `JWT_SECRET`: Secret for signing JWTs
- `GOOGLE_CLIENT_ID`: Google OAuth ID
- `RUNPOD_API_KEY`: API key for AI workflows
- `RUNPOD_ENDPOINT_ID`: Endpoint for AI actions

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_TRPC_URL`: URL of the Worker (e.g., http://localhost:8787/trpc)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth ID
