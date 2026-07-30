"""
One-off seed script to insert sample user profiles into MongoDB.

Usage:
    cd src/backend
    python scripts/seed_user.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from core.security import get_password_hash


async def seed():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.database_name]

    sample_users = [
        {"email": "priya@clubartizen.com", "password": "admin123", "role": "Admin"},
        {"email": "arjun@clubartizen.com", "password": "founder123", "role": "Co-Founder"},
        {"email": "mira@clubartizen.com", "password": "market123", "role": "Marketing Team"},
        {"email": "rahul@clubartizen.com", "password": "market123", "role": "Marketing Team"},
    ]

    created = 0
    skipped = 0

    for user in sample_users:
        existing = await db.users.find_one({"email": user["email"]})
        if existing:
            skipped += 1
            print(f"- Skipped existing user: {user['email']} (id={existing['_id']})")
            continue

        user_doc = {
            "email": user["email"],
            "hashed_password": get_password_hash(user["password"]),
            "role": user["role"],
            "is_active": True,
        }

        result = await db.users.insert_one(user_doc)
        created += 1
        print(f"+ Created user: {user['email']} (role={user['role']}, id={result.inserted_id})")

    print("\nSeed summary")
    print(f"  Database: {settings.database_name}")
    print(f"  Created: {created}")
    print(f"  Skipped: {skipped}")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
