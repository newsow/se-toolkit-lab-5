"""Unit-test configuration — runs before any test module is imported."""

import os

# The import chain (routers → database → settings) requires API_KEY.
# Unit tests never call the real API, so a dummy value is sufficient.
# Must be set before any app imports to override .env.secret
os.environ["API_KEY"] = "test"
