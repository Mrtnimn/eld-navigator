import os
import subprocess
import sys

port = os.environ.get("PORT", "8080")
cmd = [
    "gunicorn",
    "eld_planner.wsgi:application",
    "--bind", f"0.0.0.0:{port}",
    "--log-file", "-"
]
print(f"Starting: {' '.join(cmd)}", flush=True)
sys.exit(subprocess.call(cmd))
