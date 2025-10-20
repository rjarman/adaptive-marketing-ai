from typing import List

from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session

from models import get_db
from models.schemas import IntegrationCreate, IntegrationResponse, DataSourceEnum
from services.integration_service import IntegrationService

router = APIRouter(
    tags=["integrations"],
)


@router.post("", response_model=IntegrationResponse)
def save_integration(
        integration_data: IntegrationCreate,
        db: Session = Depends(get_db)
):
    service = IntegrationService(db)
    integration = service.save_integration(integration_data.dataSource)

    return IntegrationResponse(
        id=integration.id,
        dataSource=DataSourceEnum(integration.data_source),
        createdAt=integration.created_at
    )


@router.get("", response_model=List[IntegrationResponse])
def get_integrations(db: Session = Depends(get_db)):
    service = IntegrationService(db)
    integrations = service.get_integrations()

    return [
        IntegrationResponse(
            id=integration.id,
            dataSource=DataSourceEnum(integration.data_source),
            createdAt=integration.created_at
        )
        for integration in integrations
    ]


@router.delete("/{data_source}")
def remove_integration(data_source: DataSourceEnum, db: Session = Depends(get_db)):
    service = IntegrationService(db)
    success = service.remove_integration(data_source)

    if success:
        return {"message": f"Integration for {data_source.value} removed successfully"}
    else:
        raise HTTPException(status_code=404, detail=f"Integration for {data_source.value} not found")
