from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "TripWise API"
    secret_key: str = "tripwise-dev-secret-change-me-please-32b"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    database_url: str = "postgresql+psycopg://tripwise:tripwise@localhost:5432/tripwise"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    skip_seed: bool = False

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
