import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = os.environ.get('OPENAI_API_KEY')
    openai_base_url: str = os.environ.get('OPENAI_BASE_URL')
    openai_model: str = os.environ.get('OPENAI_MODEL')
    database_url: str = os.environ.get('DATABASE_URL')

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
