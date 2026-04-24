from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.core.config import settings
from app.api.routes import api_router
from app.services.vector_store import vector_store_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    await vector_store_service.initialize()
    
    # Start the Skill Background Runner - Skills run FOREVER
    try:
        from app.services.skill_background_runner import start_skill_runner, stop_skill_runner
        await start_skill_runner()
        print("🧠 Living Intelligence OS activated - Skills are autonomous agents")
    except Exception as e:
        print(f"Warning: Could not start skill runner: {e}")
    
    # Start the Skill Metrics Updater - Keeps skill data fresh
    metrics_task = None
    try:
        from app.services.skill_metrics_updater import skill_metrics_updater
        import asyncio
        metrics_task = asyncio.create_task(skill_metrics_updater.start())
        print("📊 Skill Metrics Updater activated - Real-time progress tracking")
    except Exception as e:
        print(f"Warning: Could not start metrics updater: {e}")
    
    # Start the Reminder Notifier - Sends notifications for due reminders
    reminder_task = None
    try:
        from app.services.reminder_notifier import reminder_notifier
        import asyncio
        reminder_task = asyncio.create_task(reminder_notifier.start())
        print("🔔 Reminder Notifier activated - Real-time reminder notifications")
    except Exception as e:
        print(f"Warning: Could not start reminder notifier: {e}")
    
    yield
    
    # Cleanup on shutdown
    try:
        from app.services.skill_background_runner import stop_skill_runner
        await stop_skill_runner()
    except:
        pass
    
    try:
        from app.services.skill_metrics_updater import skill_metrics_updater
        skill_metrics_updater.stop()
        if metrics_task:
            metrics_task.cancel()
    except:
        pass
    
    try:
        from app.services.reminder_notifier import reminder_notifier
        await reminder_notifier.stop()
        if reminder_task:
            reminder_task.cancel()
    except:
        pass
    
    await vector_store_service.close()

app = FastAPI(
    title="AI Knowledge Platform API",
    description="Backend API for AI-powered knowledge management - Living Intelligence OS",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.APP_ENV == "development"
    )
