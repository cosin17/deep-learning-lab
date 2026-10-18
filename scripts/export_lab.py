#!/usr/bin/env python3
"""Export an offline lab using only Python's standard library."""
import argparse
import json
from pathlib import Path
import shutil
import sys


def export_lab(output: Path, topic: str = "fold", language: str = "zh") -> Path:
    if topic not in {"fold", "gradient", "convolution"}:
        raise ValueError("Unsupported topic")
    if language not in {"zh", "en"}:
        raise ValueError("Unsupported language")
    output = output.expanduser().resolve()
    if output.exists():
        raise FileExistsError("Destination already exists; choose a new directory: " + str(output))
    skill_root = Path(__file__).resolve().parents[1]
    source = skill_root / "assets" / "lab"
    names = ("index.html", "style.css", "core.js", "app.js")
    for name in names:
        if not (source / name).is_file():
            raise FileNotFoundError("Missing lab resource: " + name)
    html = (source / "index.html").read_text(encoding="utf-8")
    html = html.replace('data-initial-topic="fold"', 'data-initial-topic="' + topic + '"', 1)
    html = html.replace('data-initial-language="zh"', 'data-initial-language="' + language + '"', 1)
    html = html.replace('<html lang="zh-CN"', '<html lang="' + ("en" if language == "en" else "zh-CN") + '"', 1)
    output.mkdir(parents=True)
    for name in names[1:]:
        shutil.copy2(source / name, output / name)
    (output / "index.html").write_text(html, encoding="utf-8")
    shutil.copy2(skill_root / "LICENSE", output / "LICENSE")
    return output / "index.html"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="New destination directory")
    parser.add_argument("--topic", choices=["fold", "gradient", "convolution"], default="fold")
    parser.add_argument("--lang", choices=["zh", "en"], default="zh")
    args = parser.parse_args()
    try:
        entry = export_lab(args.output, args.topic, args.lang)
    except (OSError, ValueError) as error:
        parser.exit(2, str(error) + "\n")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps({"index": str(entry), "topic": args.topic, "language": args.lang}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
