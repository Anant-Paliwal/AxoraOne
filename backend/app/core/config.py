
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Application
    APP_ENV: str = "development"
    SECRET_KEY: str
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:8080", "http://localhost:3000", "http://127.0.0.1:8080", "http://127.0.0.1:5173"]
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_JWT_SECRET: str = ""
    
    # Google Gemini API
    GEMINI_API_KEY: str = ""
    
    # AI API (OpenRouter or OpenAI)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENAI_API_KEY: str = ""
    
    # Brave Search API
    BRAVE_API_KEY: str = ""
    
    # Vector Database
    CHROMA_PERSIST_DIR: str = "./data/chroma"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Upstash Vector
    UPSTASH_VECTOR_REST_URL: str = ""
    UPSTASH_VECTOR_REST_TOKEN: str = ""
    
    # Upstash Redis (REST API)
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""
    
    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    
    # Razorpay Plan IDs
    RAZORPAY_PRO_MONTHLY_PLAN_ID: str = ""
    RAZORPAY_PRO_YEARLY_PLAN_ID: str = ""
    RAZORPAY_PRO_PLUS_MONTHLY_PLAN_ID: str = ""
    RAZORPAY_PRO_PLUS_YEARLY_PLAN_ID: str = ""
    
    # Frontend URL (for webhooks and redirects)
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Integrations V1 - OAuth and API Integrations
    ENCRYPTION_KEY: str = ""
    
    # Google OAuth (Drive & Calendar)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/integrations/google/callback"
    
    # Slack OAuth
    SLACK_CLIENT_ID: str = ""
    SLACK_CLIENT_SECRET: str = ""
    SLACK_REDIRECT_URI: str = "http://localhost:8000/api/v1/integrations/slack/callback"
    
    # GitHub OAuth
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/integrations/github/callback"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
