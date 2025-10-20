from openai import AsyncOpenAI

from core.settings import settings

openai_client = AsyncOpenAI(
    api_key=settings.openai_api_key,
    base_url=settings.openai_base_url
)
