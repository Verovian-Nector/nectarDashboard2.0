import os
from typing import Optional

class Settings:
    """Application settings loaded from environment variables"""
    
    # Main domain configuration
    MAIN_DOMAIN: str = os.getenv("MAIN_DOMAIN", "localhost")
    
    # Database configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./parent.db")
    
    # Server configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8001"))
    
    # Child service configuration
    CHILD_SERVICE_PORT: int = int(os.getenv("CHILD_SERVICE_PORT", "8000"))
    
    @property
    def base_url(self) -> str:
        """Get the base URL for the main domain"""
        if self.MAIN_DOMAIN == "localhost":
            return f"http://{self.MAIN_DOMAIN}"
        return f"https://{self.MAIN_DOMAIN}"
    
    @property
    def child_service_base_url(self) -> str:
        """Get the base URL for child services"""
        if self.MAIN_DOMAIN == "localhost":
            return f"http://{{subdomain}}.{self.MAIN_DOMAIN}:{self.CHILD_SERVICE_PORT}"
        return f"https://{{subdomain}}.{self.MAIN_DOMAIN}"

# Global settings instance
settings = Settings()