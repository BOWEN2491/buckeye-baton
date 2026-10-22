"""Print versions and credential presence only; never credential contents."""
import importlib.metadata
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from dotenv import load_dotenv

root = Path(__file__).resolve().parents[1]
load_dotenv(root / ".env", override=False)
print("PROJECT=" + str(root))
print("PYTHON=" + sys.executable)
print("PYTHON_VERSION=" + sys.version.split()[0])
print("PROJECT_VENV=" + str(Path(sys.prefix).resolve() == (root / ".venv").resolve()))
print("API_KEY_PRESENT=" + str(bool(os.getenv("OPENAI_API_KEY", "").strip())))
for name in ["fastapi", "uvicorn", "openai", "python-dotenv", "streamlit", "pandas", "requests", "plotly"]:
    try:
        print(name + "=" + importlib.metadata.version(name))
    except importlib.metadata.PackageNotFoundError:
        print(name + "=MISSING")
for executable in ["node", "git"]:
    path = shutil.which(executable)
    if path:
        result = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=10)
        print(executable.upper() + "=" + result.stdout.strip())
    else:
        print(executable.upper() + "=MISSING")
package = root / "frontend" / "package.json"
if package.exists():
    print("FRONTEND_DEPENDENCIES=" + json.dumps(json.loads(package.read_text())["dependencies"]))
