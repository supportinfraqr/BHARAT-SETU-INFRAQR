#!/usr/bin/env python3
"""Build the Python engine and place it where Tauri expects the sidecar."""
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENGINE = ROOT / "engine" / "attendance_engine.py"
WEIGHTS = ROOT / "face_embedding" / "weights"


def target_triple():
    env = os.environ.get("TAURI_ENV_TARGET_TRIPLE") or os.environ.get("TARGET")
    if env:
        return env
    try:
        out = subprocess.check_output(["rustc", "-vV"], text=True)
        for line in out.splitlines():
            if line.startswith("host:"):
                return line.split(":", 1)[1].strip()
    except Exception:
        pass
    if platform.system() == "Windows":
        return "x86_64-pc-windows-msvc"
    return "x86_64-unknown-linux-gnu"


def main():
    triple = target_triple()
    work = ROOT / "build-work"
    dist = ROOT / "build-dist"
    spec = ROOT / "build-spec"
    for path in (work, dist, spec):
        shutil.rmtree(path, ignore_errors=True)
    add_data = f"{WEIGHTS}{os.pathsep}weights"
    cmd = [
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--onefile",
        "--name", "attendance-engine",
        "--distpath", str(dist), "--workpath", str(work), "--specpath", str(spec),
        "--add-data", add_data,
        "--collect-submodules", "deepface", "--collect-data", "deepface",
        "--collect-submodules", "retinaface",
        "--hidden-import", "retinaface",
        str(ENGINE),
    ]
    subprocess.check_call(cmd, cwd=str(ROOT))
    exe = dist / ("attendance-engine.exe" if os.name == "nt" else "attendance-engine")
    if not exe.exists():
        raise SystemExit(f"PyInstaller did not produce {exe}")
    out = ROOT / "src-tauri" / "binaries" / f"attendance-engine-{triple}{exe.suffix}"
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(exe, out)
    print(f"sidecar: {out}")


if __name__ == "__main__":
    main()
