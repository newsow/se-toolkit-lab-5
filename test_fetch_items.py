#!/usr/bin/env python3
"""Test script for fetch_items function."""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.etl import fetch_items


async def main():
    print("Testing fetch_items...")
    try:
        items = await fetch_items()
        print(f"✓ Successfully fetched {len(items)} items")
        print("\nFirst 5 items:")
        for item in items[:5]:
            print(f"  - {item}")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
