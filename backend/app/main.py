from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.utils.model_loader import model_manager
from app.routers import predictions, alerts, stats

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="XRAID API",
    description="Explainable Robust Adaptive Intrusion Detection System",
    version="1.0.0"
)

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
app.include_router(predictions.router, prefix="/api", tags=["predictions"])
app.include_router(alerts.router, prefix="/api", tags=["alerts"])
app.include_router(stats.router, prefix="/api", tags=["stats"])