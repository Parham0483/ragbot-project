#!/usr/bin/env python
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

def main():
    BASE_DIR = Path(__file__).resolve().parent
    load_dotenv(BASE_DIR / ".env")

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ragbot_backend.settings")

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
