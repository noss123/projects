from datetime import datetime
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict
from .user_models import PyObjectId

class ChannelBase(BaseModel):
    platform_name: str # e.g., 'LinkedIn', 'META', 'GoogleAnalytics'
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    status: str = "Connected"

class ChannelCreate(ChannelBase):
    access_token: str # Will be encrypted before storing
    refresh_token: Optional[str] = None

class ChannelDB(ChannelBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    # Using PyObjectId here assumes the Channel is tied to a user
    user_id: PyObjectId
    encrypted_access_token: str
    encrypted_refresh_token: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class ChannelResponse(ChannelBase):
    id: str
    user_id: str
