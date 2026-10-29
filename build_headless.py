#!/usr/bin/env python3
"""Package the engine-only Linux headless bundle."""
import hashlib
import json
import os
import shutil
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HEADLESS = ROOT / "headless"
OUT = ROOT / "build-headless"
FILES = [
    "bss-attendancectl",
    "install-headless.sh",
    "uninstall-headless.sh",
    "bss-attendance.service",
    "bss-attendance.env.example",
    "backup.sh",
    "HEADLESS_LINUX.md",
]


def _sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    version = json.loads((ROOT / "package.json").read_text())["version"]
    engine = ROOT / "build-dist" / "attendance-engine"
    if not engine.is_file():
        engine = ROOT / "src-tauri" / "binaries" / "attendance-engine-x86_64-unknown-linux-gnu"
    if not engine.is_file():
        raise SystemExit("Linux engine binary not found. Build the sidecar first.")
    for name in FILES:
        if not (HEADLESS / name).is_file():
            raise SystemExit(f"Missing headless file: {name}")
    shutil.rmtree(OUT, ignore_errors=True)
    OUT.mkdir(parents=True)
    name = f"BSS-Attendance-{version}-Headless-Linux-x86_64.tar.gz"
    archive_path = OUT / name
    with tempfile.TemporaryDirectory() as temporary:
        stage = Path(temporary) / "bss-attendance"
        stage.mkdir()
        shutil.copy2(engine, stage / "attendance-engine")
        for item in FILES:
            shutil.copy2(HEADLESS / item, stage / item)
        for executable in ("attendance-engine", "bss-attendancectl", "install-headless.sh",
                           "uninstall-headless.sh", "backup.sh"):
            os.chmod(stage / executable, 0o755)
        checksums = []
        for path in sorted(stage.iterdir()):
            if path.name == "SHA256SUMS":
                continue
            checksums.append(f"{_sha256(path)}  {path.name}")
        (stage / "SHA256SUMS").write_text("\n".join(checksums) + "\n", encoding="utf-8")
        with tarfile.open(archive_path, "w:gz", compresslevel=6) as archive:
            archive.add(stage, arcname="bss-attendance")
    checksum = _sha256(archive_path)
    (OUT / f"{name}.sha256").write_text(f"{checksum}  {name}\n", encoding="utf-8")
    print(archive_path)
    print(f"{checksum}  {name}")


if __name__ == "__main__":
    main()
