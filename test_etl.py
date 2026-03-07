#!/usr/bin/env python3
"""Test script for the ETL pipeline."""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database import engine, get_session
from app.etl import fetch_items, fetch_logs, load_items, load_logs, sync
from app.models.interaction import InteractionLog
from app.models.item import ItemRecord
from app.models.learner import Learner
from sqlmodel import SQLModel


async def test_fetch_items():
    """Test fetch_items function."""
    print("\n=== Testing fetch_items ===")
    try:
        items = await fetch_items()
        print(f"✓ Successfully fetched {len(items)} items")
        print("\nFirst 3 items:")
        for item in items[:3]:
            print(f"  - type={item.get('type')}, lab={item.get('lab')}, task={item.get('task')}, title={item.get('title')}")
        return items
    except Exception as e:
        print(f"✗ Error: {e}")
        return None


async def test_fetch_logs():
    """Test fetch_logs function."""
    print("\n=== Testing fetch_logs ===")
    try:
        logs = await fetch_logs()
        print(f"✓ Successfully fetched {len(logs)} logs")
        if logs:
            print("\nFirst log:")
            log = logs[0]
            print(f"  - id={log.get('id')}, lab={log.get('lab')}, task={log.get('task')}, student_id={log.get('student_id')}")
        return logs
    except Exception as e:
        print(f"✗ Error: {e}")
        return None


async def test_full_sync():
    """Test the full sync pipeline."""
    print("\n=== Testing full sync ===")
    try:
        async for session in get_session():
            result = await sync(session)
            print(f"✓ Sync completed!")
            print(f"  - New records: {result['new_records']}")
            print(f"  - Total records: {result['total_records']}")
            break
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_db_models():
    """Test that database models can be imported and tables exist."""
    print("\n=== Testing database connection ===")
    try:
        async with engine.begin() as conn:
            # Create all tables
            await conn.run_sync(SQLModel.metadata.create_all)
        print("✓ Database tables created/verified")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


async def main():
    print("ETL Pipeline Test Suite")
    print("=" * 50)

    # Test 1: Database setup
    db_ok = await test_db_models()
    if not db_ok:
        print("\n✗ Database setup failed, stopping tests")
        return False

    # Test 2: Fetch items
    items = await test_fetch_items()
    if items is None:
        print("\n✗ fetch_items failed, stopping tests")
        return False

    # Test 3: Fetch logs
    logs = await test_fetch_logs()
    if logs is None:
        print("\n✗ fetch_logs failed, stopping tests")
        return False

    # Test 4: Full sync
    sync_ok = await test_full_sync()
    if not sync_ok:
        print("\n✗ Full sync failed")
        return False

    print("\n" + "=" * 50)
    print("✓ All tests passed!")
    return True


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
