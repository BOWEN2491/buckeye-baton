"""Explicit, optional API test. Never prints the API key or raw API errors."""
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI, APIStatusError, APIConnectionError

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
if not os.environ.get("OPENAI_API_KEY", "").strip():
    print("MISSING_KEY: Set OPENAI_API_KEY in this terminal, or in the local ignored .env file.")
    sys.exit(2)
try:
    # An explicit base URL prevents an unrelated shell setting from routing the key elsewhere.
    with OpenAI(base_url="https://api.openai.com/v1", timeout=30, max_retries=0) as client:
        response = client.responses.create(
            model=os.environ.get("OPENAI_MODEL") or "gpt-6-luna",
            input="Reply with only OK.",
            max_output_tokens=64,
            store=False,
        )
    print("API_SUCCESS; status=" + response.status)
    print(response.output_text)
except APIStatusError as error:
    code = str(error.code or "unknown")
    safe_code = code if re.fullmatch(r"[a-zA-Z0-9_]+", code) else "unknown"
    print(f"API_ERROR: HTTP {error.status_code}; code={safe_code}")
    sys.exit(1)
except APIConnectionError:
    print("NETWORK_ERROR: Connection failed or timed out.")
    sys.exit(1)
