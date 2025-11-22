import os
from typing import Optional

class Settings:
    """Application settings loaded from environment variables"""
    
    # Main domain configuration
    MAIN_DOMAIN: str = os.getenv("MAIN_DOMAIN", "localhost")
    
    # Database configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "parent_db")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASS: str = os.getenv("DB_PASS", "postgres")
    
    # Server configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Child service configuration
    CHILD_SERVICE_PORT: int = int(os.getenv("CHILD_SERVICE_PORT", "8001"))
    
    # Cloudflare configuration
    CLOUDFLARE_API_KEY: Optional[str] = os.getenv("CLOUDFLARE_API_KEY")
    CLOUDFLARE_ZONE_ID: Optional[str] = os.getenv("CLOUDFLARE_ZONE_ID")
    
    # Lightsail IP for DNS records
    LIGHTSAIL_IP: str = os.getenv("LIGHTSAIL_IP", "127.0.0.1")
    
    # JWT Configuration
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-jwt-secret-here")
    
    @property
    def database_url(self) -> str:
        """Get the database URL"""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        # Default to SQLite for development
        return "sqlite:///./parent.db"
    
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
    
    @property
    def is_cloudflare_configured(self) -> bool:
        """Check if Cloudflare API is configured"""
        return bool(self.CLOUDFLARE_API_KEY and self.CLOUDFLARE_ZONE_ID)

# Global settings instance
settings = Settings()