from sqlalchemy.orm import Session

from models.schemas import DataSourceEnum
from repositories.integration_repository import IntegrationRepository


class IntegrationService:
    def __init__(self, db: Session):
        self.repository = IntegrationRepository(db)

    def save_integration(self, data_source: DataSourceEnum):
        return self.repository.create(data_source)

    def get_integrations(self):
        return self.repository.get_all()

    def remove_integration(self, data_source: DataSourceEnum):
        return self.repository.delete_by_data_source(data_source)
