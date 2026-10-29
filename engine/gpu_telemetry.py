"""Read-only GPU inventory and usage telemetry through NVML."""
import os
import threading

_lock = threading.Lock()
_initialized = False
_available = False
_error = ""
_pynvml = None


def _load():
    global _initialized, _available, _error, _pynvml
    if _initialized:
        return _available
    with _lock:
        if _initialized:
            return _available
        _initialized = True
        try:
            import pynvml as nvml
            nvml.nvmlInit()
            _pynvml = nvml
            _available = True
        except Exception as exc:  # noqa: BLE001
            _error = f"{type(exc).__name__}: {exc}"
            _available = False
        return _available


def _text(value):
    if isinstance(value, bytes):
        return value.decode("utf-8", "replace")
    return str(value or "")


def _mb(value):
    try:
        return round(float(value) / (1024 * 1024), 1)
    except (TypeError, ValueError):
        return None


def _number(value):
    try:
        return round(float(value), 1)
    except (TypeError, ValueError):
        return None


def _matches_pid(reported, engine_pid):
    try:
        reported = int(reported)
        if reported == int(engine_pid):
            return True
    except (TypeError, ValueError):
        return False
    try:
        with open(f"/proc/{reported}/status", encoding="utf-8") as handle:
            for line in handle:
                if line.startswith("Tgid:"):
                    return int(line.split()[1]) == int(engine_pid)
    except (OSError, ValueError, IndexError):
        pass
    return False


def _pid_memory(handle, pid, nvml):
    total = 0
    found = False
    for getter in ("nvmlDeviceGetComputeRunningProcesses", "nvmlDeviceGetGraphicsRunningProcesses"):
        try:
            processes = getattr(nvml, getter)(handle)
        except Exception:
            processes = []
        for process in processes or []:
            try:
                if not _matches_pid(getattr(process, "pid", -1), pid):
                    continue
                used = getattr(process, "usedGpuMemory", None)
                if used is None or int(used) < 0 or int(used) >= 2**60:
                    continue
                total += int(used)
                found = True
            except Exception:
                continue
    return _mb(total) if found else None


def collect_gpu_telemetry(engine_pid=None):
    engine_pid = int(engine_pid or os.getpid())
    result = {
        "available": False,
        "detected": None,
        "source": "NVML",
        "driver": "",
        "devices": [],
        "totals": {
            "memoryTotalMb": None,
            "memoryUsedMb": None,
            "memoryFreeMb": None,
            "utilizationPercent": None,
            "temperatureC": None,
            "powerW": None,
            "engineProcessMemoryMb": None,
        },
        "error": "",
    }
    if not _load():
        result["error"] = _error or "NVML unavailable"
        return result
    nvml = _pynvml
    result["available"] = True
    try:
        result["driver"] = _text(nvml.nvmlSystemGetDriverVersion())
    except Exception:
        pass
    try:
        count = int(nvml.nvmlDeviceGetCount())
    except Exception as exc:  # noqa: BLE001
        result["error"] = f"{type(exc).__name__}: {exc}"
        return result
    result["detected"] = count > 0
    devices = []
    totals = {"memoryTotalMb": 0.0, "memoryUsedMb": 0.0, "memoryFreeMb": 0.0,
              "utilizationPercent": None, "temperatureC": None,
              "powerW": None, "engineProcessMemoryMb": None}
    utilizations = []
    engine_memory = 0.0
    engine_found = False
    for index in range(count):
        try:
            handle = nvml.nvmlDeviceGetHandleByIndex(index)
            item = {
                "index": index,
                "name": _text(nvml.nvmlDeviceGetName(handle)),
                "uuid": _text(nvml.nvmlDeviceGetUUID(handle)),
                "memoryTotalMb": None,
                "memoryUsedMb": None,
                "memoryFreeMb": None,
                "utilizationPercent": None,
                "temperatureC": None,
                "powerW": None,
                "engineProcessMemoryMb": None,
            }
            try:
                memory = nvml.nvmlDeviceGetMemoryInfo(handle)
                item["memoryTotalMb"] = _mb(memory.total)
                item["memoryUsedMb"] = _mb(memory.used)
                item["memoryFreeMb"] = _mb(memory.free)
                totals["memoryTotalMb"] += item["memoryTotalMb"] or 0
                totals["memoryUsedMb"] += item["memoryUsedMb"] or 0
                totals["memoryFreeMb"] += item["memoryFreeMb"] or 0
            except Exception:
                pass
            try:
                rates = nvml.nvmlDeviceGetUtilizationRates(handle)
                item["utilizationPercent"] = _number(rates.gpu)
                if item["utilizationPercent"] is not None:
                    utilizations.append(item["utilizationPercent"])
            except Exception:
                pass
            try:
                item["temperatureC"] = _number(nvml.nvmlDeviceGetTemperature(handle, nvml.NVML_TEMPERATURE_GPU))
                if item["temperatureC"] is not None:
                    totals["temperatureC"] = max(totals["temperatureC"] or item["temperatureC"], item["temperatureC"])
            except Exception:
                pass
            try:
                item["powerW"] = _number(float(nvml.nvmlDeviceGetPowerUsage(handle)) / 1000.0)
                if item["powerW"] is not None:
                    totals["powerW"] = (totals["powerW"] or 0) + item["powerW"]
            except Exception:
                pass
            item["engineProcessMemoryMb"] = _pid_memory(handle, engine_pid, nvml)
            if item["engineProcessMemoryMb"] is not None:
                engine_memory += item["engineProcessMemoryMb"]
                engine_found = True
            devices.append(item)
        except Exception as exc:  # noqa: BLE001
            devices.append({"index": index, "name": "", "error": f"{type(exc).__name__}: {exc}"})
    if utilizations:
        totals["utilizationPercent"] = round(sum(utilizations) / len(utilizations), 1)
    if engine_found:
        totals["engineProcessMemoryMb"] = round(engine_memory, 1)
    result["devices"] = devices
    result["totals"] = totals
    return result
