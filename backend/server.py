"""
Stub backend for SILEX.

SILEX uses Supabase as its backend (Postgres + Auth + Realtime + Edge Functions)
and Cloudflare Workers (via TanStack Start) for any server-side API routes.

This minimal FastAPI app exists ONLY to keep the Emergent supervisor happy
(it expects a backend on port 8001). It does nothing functional.
"""
from fastapi import FastAPI

app = FastAPI(title="SILEX backend stub")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "silex-backend-stub"}
