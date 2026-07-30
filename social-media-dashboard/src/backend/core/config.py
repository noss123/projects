"""
Application configuration loaded from environment variables / .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Google Analytics 4
    ga4_property_id: str = ""
    google_application_credentials: str = ""

    # YouTube Data API v3
    youtube_api_key: str = ""
    youtube_channel_id: str = ""

    # YouTube Analytics API (OAuth 2.0)
    youtube_client_id: str = ""
    youtube_client_secret: str = ""
    youtube_refresh_token: str = ""
    youtube_token_uri: str = "https://oauth2.googleapis.com/token"

    # LinkedIn API
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_org_urn: str = ""
    linkedin_access_token: str = ""
    linkedin_api_version: str = "202401"
    linkedin_conversion_api_version: str = "202401"
    linkedin_ad_account_urn: str = ""

    # Database
    mongodb_uri: str = "mongodb://localhost:27017" # default fallback
    database_name: str = "club_artizen_analytics"
    instagram_collection_name: str = "instagram_insights_data"
    instagram_posts_collection_name: str = "instagram_post_insights_data"
    instagram_dashboard_layout_collection_name: str = "instagram_dashboard_layouts"
    facebook_collection_name: str = "facebook_insights_data"
    facebook_dashboard_layout_collection_name: str = "facebook_dashboard_layouts"
    linkedin_collection_name: str = "linkedin_insights_data"
    linkedin_posts_collection_name: str = "linkedin_post_insights_data"
    linkedin_dashboard_layout_collection_name: str = "linkedin_dashboard_layouts"

    # Security / JWT
    secret_key: str = "supersecretkey" # CHANGE IN PRODUCTION
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7 # 7 days

    # Gemini AI (for competitor trend analysis)
    gemini_api_key: str = ""

    # Groq AI (free alternative — fallback when Gemini quota is exhausted)
    groq_api_key: str = ""

    # Scheduled scraping interval (hours)
    scrape_interval_hours: int = 6

    # App
    app_env: str = "development"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def ga_credentials_available(self) -> bool:
        """True when a property ID and credentials path are both set."""
        return bool(self.ga4_property_id and self.google_application_credentials)

    @property
    def yt_credentials_available(self) -> bool:
        """True when a YouTube API key and channel ID are both set."""
        return bool(self.youtube_api_key and self.youtube_channel_id)

    @property
    def yt_analytics_credentials_available(self) -> bool:
        """True when OAuth credentials for YouTube Analytics are configured."""
        return bool(
            self.youtube_client_id
            and self.youtube_client_secret
            and self.youtube_refresh_token
        )

    @property
    def linkedin_credentials_available(self) -> bool:
        """True when LinkedIn API credentials are both set."""
        return bool(self.linkedin_client_id and self.linkedin_client_secret)

    @property
    def linkedin_live_api_ready(self) -> bool:
        """True when token and ad account URN are available for live ad analytics."""
        return bool(self.linkedin_access_token and self.linkedin_ad_account_urn)

    @property
    def cors_origins_list(self) -> list[str]:
        """Comma-separated origins from env into a FastAPI-compatible list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def gemini_available(self) -> bool:
        """True when a Gemini API key is set."""
        return bool(self.gemini_api_key)

    @property
    def groq_available(self) -> bool:
        """True when a Groq API key is set."""
        return bool(self.groq_api_key)


settings = Settings()

