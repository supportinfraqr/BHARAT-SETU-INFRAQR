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
    cmd = [
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--onefile",
        "--name", "attendance-engine",
        "--distpath", str(dist), "--workpath", str(work), "--specpath", str(spec),
        "--collect-all", "onnxruntime",
        "--copy-metadata", "onnxruntime-directml" if os.name == "nt" else "onnxruntime-gpu",
        "--hidden-import", "face_backend",
        "--hidden-import", "gpu_telemetry",
        "--hidden-import", "pynvml",
        "--hidden-import", "retinaface.commons.preprocess",
        "--hidden-import", "retinaface.commons.postprocess",
        "--exclude-module", "tensorflow",
        "--exclude-module", "tf_keras",
        "--exclude-module", "keras",
        "--exclude-module", "torch",
        "--exclude-module", "torchvision",
        "--exclude-module", "torchaudio",
        "--exclude-module", "pandas",
        "--exclude-module", "matplotlib",
        "--exclude-module", "sympy",
        "--exclude-module", "lightphe",
        "--exclude-module", "lightdsa",
        "--exclude-module", "IPython",
        "--exclude-module", "jupyter",
        str(ENGINE),
    ]
    for name in ("arcface.onnx", "retinaface.onnx"):
        cmd[cmd.index(str(ENGINE)):cmd.index(str(ENGINE))] = [
            "--add-data", f"{WEIGHTS / name}{os.pathsep}weights",
        ]
    if platform.system() == "Linux":
        try:
            import nvidia  # noqa: F401
            cmd[cmd.index(str(ENGINE)):cmd.index(str(ENGINE))] = ["--collect-all", "nvidia"]
        except Exception:
            pass
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
