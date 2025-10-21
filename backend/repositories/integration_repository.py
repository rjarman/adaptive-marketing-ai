from typing import List

from sqlalchemy.orm import Session

from models.models import Integration
from models.schemas import DataSourceTypes


class IntegrationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data_source: DataSourceTypes) -> Integration:
        integration = Integration(data_source=data_source.value)
        self.db.add(integration)
        self.db.commit()
        self.db.refresh(integration)
        return integration

    def get_all(self) -> List[Integration]:
        return self.db.query(Integration).order_by(Integration.created_at.desc()).all()

    def delete_by_data_source(self, data_source: DataSourceTypes) -> bool:
        deleted_count = self.db.query(Integration).filter(Integration.data_source == data_source.value).delete()
        self.db.commit()
        return deleted_count > 0
