from fastapi import APIRouter

from apis import (
    integration_route, chat_route, customer_route,
)

api_router = APIRouter()
api_router.include_router(integration_route.router, prefix="/integrations")
api_router.include_router(chat_route.router, prefix="/chat")
api_router.include_router(customer_route.router, prefix="/customers")
