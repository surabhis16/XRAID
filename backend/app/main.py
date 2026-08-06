from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.utils.model_loader import model_manager
from app.routers import predictions, alerts, stats, auth
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="XRAID API",
    description="Explainable Robust Adaptive Intrusion Detection System",
    version="1.0.0"
)
# rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    model_manager.load_models()

@app.get("/")
async def root():
    return {
        "status": "running",
        "service": "XRAID API",
        "models_loaded": model_manager.models_loaded
    }

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(predictions.router, prefix="/api", tags=["predictions"])
app.include_router(alerts.router, prefix="/api", tags=["alerts"])
app.include_router(stats.router, prefix="/api", tags=["stats"])