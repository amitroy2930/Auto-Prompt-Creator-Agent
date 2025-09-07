import yaml
import json
import sys

def load_file(file_path, file_type="text"):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            if file_type == "yaml":
                return yaml.safe_load(f)
            elif file_type == "json":
                return json.load(f)
            else:  # Default: read as plain text
                return f.read()
    except Exception as e:
        print(f"Failed to load {file_path}: {e}")
        sys.exit(1)