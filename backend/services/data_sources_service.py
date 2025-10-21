import json
from pathlib import Path
from typing import List, Dict, Any


class DataSourcesService:
    def __init__(self):
        self.data_dir = Path(__file__).parent.parent / "data"

    def _get_shopify_customers(self) -> List[Dict[str, Any]]:
        file_path = self.data_dir / "shopify_customers.json"
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    def _get_website_customers(self) -> List[Dict[str, Any]]:
        file_path = self.data_dir / "website_customers.json"
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    def _get_crm_customers(self) -> List[Dict[str, Any]]:
        file_path = self.data_dir / "crm_customers.json"
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    def get_customers_by_source(self, source: str) -> List[Dict[str, Any]]:
        source_map = {
            "SHOPIFY": self._get_shopify_customers,
            "WEBSITE": self._get_website_customers,
            "CRM": self._get_crm_customers
        }

        if source.upper() in source_map:
            return source_map[source.upper()]()
        else:
            return []
