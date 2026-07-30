import pytest
from fastapi.testclient import TestClient
from main import app
from core.database import db

# Mocking the client since we don't have a real MongoDB instance running during these simple tests
class MockCollection:
    async def find_one(self, query):
        if query.get("email") == "test@example.com":
            from core.security import get_password_hash
            from models.user_models import PyObjectId
            return {
                "_id": PyObjectId(),
                "email": "test@example.com",
                "role": "Admin",
                "is_active": True,
                "hashed_password": get_password_hash("testpassword"),
            }
        return None

    async def insert_one(self, document):
        class MockResult:
            from models.user_models import PyObjectId
            inserted_id = PyObjectId()
        return MockResult()

class MockDB:
    @property
    def users(self):
        return MockCollection()

client = TestClient(app)

# Override the database dependency
from core.database import get_db
app.dependency_overrides[get_db] = lambda: MockDB()


def test_login_success():
    response = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "testpassword"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_failure():
    response = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    
def test_signup_success():
    response = client.post(
        "/auth/signup",
        json={
            "email": "newuser@example.com",
            "password": "newpassword",
            "role": "Marketing Team",
            "is_active": True
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "id" in data
