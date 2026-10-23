#!/usr/bin/env python3
"""Publish built attendance installers to the production download directory.

Runs on the production server after the Windows and Linux build jobs have
uploaded their files to .incoming-<run-id>/<platform>/.
"""
import argparse
import datetime
import json
import os
import shutil
from pathlib import Path


def one(paths, label):
    items = [p for p in paths if p.is_file()]
    if not items:
        raise SystemExit(f"Missing {label}")
    return items[0]


def relink(stable: Path, target: str):
    try:
        if stable.is_symlink() or stable.exists():
            stable.unlink()
    except FileNotFoundError:
        pass
    stable.symlink_to(target)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--root", default="/home/ubuntu/bss/FINAL/deploy-prod/downloads/attendance")
    args = parser.parse_args()

    root = Path(args.root)
    updates = root / "updates"
    incoming = root / f".incoming-{args.run_id}"
    win_dir = incoming / "windows"
    linux_dir = incoming / "linux"
    updates.mkdir(parents=True, exist_ok=True)

    win_exe = one(win_dir.glob("*.exe"), "Windows setup executable")
    win_msi = one(win_dir.glob("*.msi"), "Windows MSI")
    linux_app = one(linux_dir.glob("*.AppImage"), "Linux AppImage")
    win_sig = Path(str(win_exe) + ".sig")
    linux_sig = Path(str(linux_app) + ".sig")
    if not win_sig.is_file() or not linux_sig.is_file():
        raise SystemExit("Missing updater signature file")

    version = args.version
    base = "https://login.bharatshramsetu.com/downloads/attendance/updates"
    win_name = f"BSS-Attendance-{version}-Windows-Setup.exe"
    msi_name = f"BSS-Attendance-{version}-Windows-Setup.msi"
    linux_name = f"BSS-Attendance-{version}-Linux.AppImage"

    for source, name in (
        (win_exe, win_name),
        (win_sig, f"{win_name}.sig"),
        (win_msi, msi_name),
        (linux_app, linux_name),
        (linux_sig, f"{linux_name}.sig"),
    ):
        shutil.copy2(source, updates / name)

    keep = {win_name, f"{win_name}.sig", msi_name, linux_name, f"{linux_name}.sig"}
    for pattern in ("BSS-Attendance-*-Windows-Setup.exe", "BSS-Attendance-*-Windows-Setup.exe.sig",
                    "BSS-Attendance-*-Windows-Setup.msi", "BSS-Attendance-*-Linux.AppImage",
                    "BSS-Attendance-*-Linux.AppImage.sig"):
        for path in updates.glob(pattern):
            if path.name not in keep and path.is_file():
                path.unlink()

    manifest = {
        "version": version,
        "notes": f"BSS Attendance {version}",
        "pub_date": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        "platforms": {
            "windows-x86_64": {
                "signature": win_sig.read_text(encoding="utf-8").strip(),
                "url": f"{base}/{win_name}",
            },
            "linux-x86_64": {
                "signature": linux_sig.read_text(encoding="utf-8").strip(),
                "url": f"{base}/{linux_name}",
            },
        },
    }
    (updates / "latest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    relink(root / "BSS-Attendance-Windows-Setup.exe", f"updates/{win_name}")
    relink(root / "BSS-Attendance-Windows-Setup.msi", f"updates/{msi_name}")
    relink(root / "BSS-Attendance-Linux.AppImage", f"updates/{linux_name}")

    shutil.rmtree(incoming, ignore_errors=True)
    print(f"Published {version}")
    for path in sorted(updates.iterdir()):
        print(path.name, path.stat().st_size)


if __name__ == "__main__":
    main()
