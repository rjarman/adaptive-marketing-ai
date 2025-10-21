from datetime import datetime
from typing import Dict, Any

from sqlalchemy.orm import Session

from repositories.customer_repository import CustomerRepository
from repositories.integration_repository import IntegrationRepository
from services.data_sources_service import DataSourcesService


class CustomerSyncService:
    def __init__(self, db: Session):
        self.db = db
        self.customer_repo = CustomerRepository(db)
        self.data_sources_service = DataSourcesService()
        self.integration_repo = IntegrationRepository(db)

    def sync_all_connected_sources(self):
        integrations = self.integration_repo.get_all()

        for integration in integrations:
            self.sync_source_data(integration.data_source)

    def sync_source_data(self, data_source: str):
        customers_data = self.data_sources_service.get_customers_by_source(data_source)

        for customer_data in customers_data:
            normalized_data = self._normalize_customer_data(customer_data, data_source)
            self.customer_repo.create_or_update_customer(normalized_data)

    def _normalize_customer_data(self, raw_data: Dict[str, Any], data_source: str) -> Dict[str, Any]:
        if data_source.upper() == "SHOPIFY":
            return self._normalize_shopify_data(raw_data)
        elif data_source.upper() == "WEBSITE":
            return self._normalize_website_data(raw_data)
        elif data_source.upper() == "CRM":
            return self._normalize_crm_data(raw_data)
        else:
            raise ValueError(f"Unknown data source: {data_source}")

    def _normalize_shopify_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "source_customer_id": data["customer_id"],
            "data_source": "SHOPIFY",
            "email": data["email"],
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "phone": data.get("phone"),
            "total_value": data.get("total_spent", 0.0),
            "engagement_score": self._calculate_shopify_engagement_score(data),
            "lifecycle_stage": self._map_shopify_lifecycle_stage(data),
            "last_interaction": self._parse_datetime(data.get("last_order_date")),
            "source_data": data,

            "tags": data.get("tags", []),
            "segment": data.get("segment", "unknown"),
            "purchase_intent": self._map_shopify_purchase_intent(data),
            "accepts_marketing": data.get("accepts_marketing", True),

            "timezone": data.get("timezone"),
            "optimal_send_times": data.get("optimal_send_times"),
            "last_engagement_time": self._parse_datetime(data.get("last_order_date")),
            "engagement_frequency": data.get("engagement_frequency"),
            "seasonal_activity": data.get("seasonal_activity"),

            "preferred_channels": data.get("preferred_channels"),
            "channel_performance": data.get("channel_performance"),
            "device_preference": data.get("device_preference"),
            "social_platforms": data.get("social_platforms"),
            "communication_limits": data.get("communication_limits")
        }

    def _normalize_website_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "source_customer_id": data["customer_id"],
            "data_source": "WEBSITE",
            "email": data["email"],
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "phone": data.get("phone"),
            "total_value": 0.0,
            "engagement_score": data.get("behavior_score", 0),
            "lifecycle_stage": self._map_website_lifecycle_stage(data),
            "last_interaction": self._parse_datetime(data.get("last_visit")),

            "source_data": data,

            "tags": data.get("interests", []),
            "segment": data.get("conversion_status", "unknown"),
            "purchase_intent": self._map_website_purchase_intent(data),
            "accepts_marketing": data.get("newsletter_signup", True),

            "timezone": data.get("timezone"),
            "optimal_send_times": data.get("optimal_send_times"),
            "last_engagement_time": self._parse_datetime(data.get("last_visit")),
            "engagement_frequency": data.get("engagement_frequency"),
            "seasonal_activity": data.get("seasonal_activity"),

            "preferred_channels": data.get("preferred_channels"),
            "channel_performance": data.get("channel_performance"),
            "device_preference": data.get("device_preference", data.get("device_type", "unknown")),
            "social_platforms": data.get("social_platforms"),
            "communication_limits": data.get("communication_limits")
        }

    def _normalize_crm_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "source_customer_id": data["customer_id"],
            "data_source": "CRM",
            "email": data["email"],
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "phone": data.get("phone"),

            "total_value": data.get("deal_value", 0.0),
            "engagement_score": data.get("engagement_score", 0),
            "lifecycle_stage": data.get("lifecycle_stage", "lead"),
            "last_interaction": self._parse_datetime(data.get("last_contact")),

            "source_data": data,

            "tags": data.get("tags", []),
            "segment": self._map_crm_segment(data),
            "purchase_intent": data.get("purchase_intent", "medium"),
            "accepts_marketing": True,

            "timezone": data.get("timezone"),
            "optimal_send_times": data.get("optimal_send_times"),
            "last_engagement_time": self._parse_datetime(data.get("last_contact")),
            "engagement_frequency": data.get("engagement_frequency"),
            "seasonal_activity": data.get("seasonal_activity"),

            "preferred_channels": data.get("preferred_channels"),
            "channel_performance": data.get("channel_performance"),
            "device_preference": data.get("device_preference"),
            "social_platforms": data.get("social_platforms"),
            "communication_limits": data.get("communication_limits")
        }

    def _calculate_shopify_engagement_score(self, data: Dict[str, Any]) -> int:
        score = 0
        orders_count = data.get("orders_count", 0)
        score += min(orders_count * 10, 50)

        total_spent = data.get("total_spent", 0.0)
        if total_spent > 1000:
            score += 30
        elif total_spent > 500:
            score += 20
        elif total_spent > 100:
            score += 10

        last_order = data.get("last_order_date")
        if last_order and self._is_recent_date(last_order, days=30):
            score += 20

        return min(score, 100)

    @staticmethod
    def _map_shopify_lifecycle_stage(data: Dict[str, Any]) -> str:
        orders_count = data.get("orders_count", 0)
        if orders_count > 5:
            return "lead"
        elif orders_count > 0:
            return "customer"
        else:
            return "prospect"

    @staticmethod
    def _map_shopify_purchase_intent(data: Dict[str, Any]) -> str:
        cart_abandoned = data.get("cart_abandoned_at")
        orders_count = data.get("orders_count", 0)

        if cart_abandoned:
            return "high"
        elif orders_count > 3:
            return "high"
        elif orders_count > 0:
            return "medium"
        else:
            return "low"

    @staticmethod
    def _map_website_lifecycle_stage(data: Dict[str, Any]) -> str:
        conversion_status = data.get("conversion_status", "")
        if conversion_status == "converted":
            return "customer"
        elif conversion_status == "engaged":
            return "opportunity"
        elif conversion_status == "interested":
            return "lead"
        else:
            return "prospect"

    @staticmethod
    def _map_website_purchase_intent(data: Dict[str, Any]) -> str:
        behavior_score = data.get("behavior_score", 0)
        conversion_status = data.get("conversion_status", "")

        if conversion_status == "converted" or behavior_score > 80:
            return "high"
        elif behavior_score > 50:
            return "medium"
        else:
            return "low"

    @staticmethod
    def _map_crm_segment(data: Dict[str, Any]) -> str:
        deal_value = data.get("deal_value", 0.0)
        industry = data.get("industry", "unknown")

        if deal_value > 30000:
            return "enterprise"
        elif deal_value > 10000:
            return "high_value"
        elif "startup" in industry.lower():
            return "startup"
        else:
            return "standard"

    @staticmethod
    def _parse_datetime(date_str: str) -> datetime | None:
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except ValueError:
            return None

    def _is_recent_date(self, date_str: str, days: int = 30) -> bool:
        parsed_date = self._parse_datetime(date_str)
        if not parsed_date:
            return False

        now = datetime.now()
        diff = now - parsed_date.replace(tzinfo=None)
        return diff.days <= days

    def get_sync_stats(self) -> Dict[str, Any]:
        return {
            "total_customers": len(self.customer_repo.get_all_customers()),
            "customers_by_source": self.customer_repo.get_customer_count_by_source(),
            "last_sync": datetime.now().isoformat()
        }
