from fastapi import Depends, APIRouter
from sqlalchemy.orm import Session

from models import get_db
from services.customer_sync_service import CustomerSyncService

router = APIRouter(
    tags=["customers"],
)


@router.get("/sync-cron")
async def sync_cron_job(db: Session = Depends(get_db)):
    sync_service = CustomerSyncService(db)
    try:
        sync_service.sync_all_connected_sources()
        stats = sync_service.get_sync_stats()

        return {
            "message": "Customer data synchronized successfully via Vercel Cron",
            "status": "success",
            "stats": stats,
            "timestamp": stats.get("last_sync")
        }
    except Exception as e:
        return {
            "message": f"Cron sync failed: {str(e)}",
            "status": "error",
            "timestamp": sync_service.get_sync_stats().get("last_sync") if 'sync_service' in locals() else None
        }
