from typing import List

from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session

from models import get_db
from models.schemas import IntegrationCreate, IntegrationResponse, DataSourceTypes, IntegrationDeleteResponse
from repositories.customer_repository import CustomerRepository
from services.customer_sync_service import CustomerSyncService
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

    sync_service = CustomerSyncService(db)
    sync_service.sync_all_connected_sources()

    return IntegrationResponse(
        id=integration.id,
        dataSource=DataSourceTypes(integration.data_source),
        createdAt=integration.created_at
    )


@router.get("", response_model=List[IntegrationResponse])
def get_integrations(db: Session = Depends(get_db)):
    service = IntegrationService(db)
    integrations = service.get_integrations()

    return [
        IntegrationResponse(
            id=integration.id,
            dataSource=DataSourceTypes(integration.data_source),
            createdAt=integration.created_at
        )
        for integration in integrations
    ]


@router.delete("/{data_source}", response_model=IntegrationDeleteResponse)
def remove_integration(data_source: DataSourceTypes, db: Session = Depends(get_db)):
    service = IntegrationService(db)
    customer_repo = CustomerRepository(db)

    integrations = service.get_integrations()
    integration_exists = any(integration.data_source == data_source.value for integration in integrations)

    if not integration_exists:
        raise HTTPException(status_code=404, detail=f"Integration for {data_source.value} not found")

    customers_before = customer_repo.get_customers_by_source(data_source.value)
    customer_count = len(customers_before)

    success = service.remove_integration(data_source)

    if success:
        customer_repo.delete_customers_by_source(data_source.value)
        return IntegrationDeleteResponse(
            message=f"Integration for {data_source.value} removed successfully",
            customers_removed=customer_count,
            data_cleanup="completed"
        )
    else:
        raise HTTPException(status_code=500, detail=f"Failed to remove integration for {data_source.value}")
