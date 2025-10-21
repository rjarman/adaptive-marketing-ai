from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apis.routes import api_router

app = FastAPI(
    title="Adaptive Marketing AI API",
    description="Adaptive marketing engine that connects to multiple platforms to generate campaign queries and answer natural language questions across channels.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api")
