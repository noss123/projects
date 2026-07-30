from motor.motor_asyncio import AsyncIOMotorClient

from core.config import settings

class Database:
    client: AsyncIOMotorClient = None

db = Database()

def get_db():
    """Dependency injection to get the database client."""
    return db.client[settings.database_name]
