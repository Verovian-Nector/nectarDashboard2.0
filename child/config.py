from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Pydantic v2 settings style
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Allow disabling SQLAlchemy pooling for tests
    DB_DISABLE_POOLING: bool = False


settings = Settings()