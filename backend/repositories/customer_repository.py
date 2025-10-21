from datetime import datetime
from typing import List, Dict, Any

from sqlalchemy import and_
from sqlalchemy.orm import Session

from models.models import Customer


class CustomerRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_or_update_customer(self, customer_data: Dict[str, Any]) -> Customer:
        existing_customer = self.db.query(Customer).filter(
            and_(
                Customer.source_customer_id == customer_data["source_customer_id"],
                Customer.data_source == customer_data["data_source"]
            )
        ).first()

        if existing_customer:
            for key, value in customer_data.items():
                if hasattr(existing_customer, key):
                    setattr(existing_customer, key, value)
            existing_customer.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing_customer)
            return existing_customer
        else:
            customer = Customer(**customer_data)
            self.db.add(customer)
            self.db.commit()
            self.db.refresh(customer)
            return customer

    def get_all_customers(self) -> List[Customer]:
        return self.db.query(Customer).all()

    def get_customers_by_source(self, data_source: str) -> List[Customer]:
        return self.db.query(Customer).filter(Customer.data_source == data_source).all()

    def delete_customers_by_source(self, data_source: str) -> int:
        deleted_count = self.db.query(Customer).filter(Customer.data_source == data_source).delete()
        self.db.commit()
        return deleted_count

    def get_customer_count_by_source(self) -> Dict[str, int]:
        sources = self.db.query(Customer.data_source).distinct().all()
        counts = {}
        for source in sources:
            count = self.db.query(Customer).filter(Customer.data_source == source[0]).count()
            counts[source[0]] = count
        return counts
