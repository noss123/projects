from datetime import datetime
from typing import Optional, Dict, Any
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict
from .user_models import PyObjectId

class WidgetBase(BaseModel):
    widget_type: str
    configuration: Dict[str, Any] = Field(default_factory=dict)
    dashboard_position: Optional[Dict[str, int]] = None

class WidgetCreate(WidgetBase):
    pass

class WidgetDB(WidgetBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class WidgetResponse(WidgetBase):
    id: str
    user_id: str
