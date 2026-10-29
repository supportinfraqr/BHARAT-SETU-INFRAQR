"""ONNX Runtime face detection and embedding backend."""
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np

DETECT_THRESHOLD = 0.9
MIN_GPU_MEMORY_MB = 1024
NMS_THRESHOLD = 0.4
DECAY4 = 0.5
FEATURE_STRIDES = (32, 16, 8)
ANCHORS_FPN = {
    "stride32": np.array([[-248.0, -248.0, 263.0, 263.0], [-120.0, -120.0, 135.0, 135.0]], dtype=np.float32),
    "stride16": np.array([[-56.0, -56.0, 71.0, 71.0], [-24.0, -24.0, 39.0, 39.0]], dtype=np.float32),
    "stride8": np.array([[-8.0, -8.0, 23.0, 23.0], [0.0, 0.0, 15.0, 15.0]], dtype=np.float32),
}
NUM_ANCHORS = {"stride32": 2, "stride16": 2, "stride8": 2}


def _prepare_runtime():
    import onnxruntime as ort
    try:
        ort.preload_dlls()
    except Exception:
        pass
    return ort


def _make_session(ort, path, providers, errors=None):
    options = ort.SessionOptions()
    options.log_severity_level = 3
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    try:
        return ort.InferenceSession(str(path), sess_options=options, providers=providers)
    except Exception as exc:
        if errors is not None:
            errors.append(f"{Path(path).name}: {type(exc).__name__}: {exc}")
        return ort.InferenceSession(str(path), sess_options=options, providers=["CPUExecutionProvider"])


def _directml_dll_path():
    """Return (path, exists) for the DirectML runtime bundled with onnxruntime."""
    try:
        import onnxruntime
        capi = Path(onnxruntime.__file__).resolve().parent / "capi"
    except Exception:
        return "", False
    candidate = capi / "DirectML.dll"
    return str(candidate), candidate.is_file()


def runtime_diagnostics():
    """Provider diagnostics that do not require the model files to load."""
    try:
        import onnxruntime as ort
        dll, present = _directml_dll_path()
        return {
            "version": str(ort.__version__),
            "availableProviders": list(ort.get_available_providers()),
            "directmlDll": dll,
            "directmlDllPresent": present,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "version": "",
            "availableProviders": [],
            "directmlDll": "",
            "directmlDllPresent": False,
            "providerError": f"{type(exc).__name__}: {exc}",
        }


def _providers_for(ort, mode, memory_limit_mb=0):
    available = set(ort.get_available_providers())
    if mode != "off" and "DmlExecutionProvider" in available:
        return ["DmlExecutionProvider", "CPUExecutionProvider"], "DirectML"
    if mode != "off" and "CUDAExecutionProvider" in available:
        cuda_options = {
            "cudnn_conv_algo_search": "HEURISTIC",
            "arena_extend_strategy": "kSameAsRequested",
        }
        if memory_limit_mb > 0:
            cuda_options["gpu_mem_limit"] = str(int(memory_limit_mb) * 1024 * 1024)
        return [("CUDAExecutionProvider", cuda_options), "CPUExecutionProvider"], "CUDA"
    return ["CPUExecutionProvider"], "CPU"


class OnnxFaceBackend:
    def __init__(self, model_dir, mode="auto", memory_limit_mb=0):
        self.model_dir = Path(model_dir)
        self.mode = mode
        self.memory_limit_mb = max(0, int(memory_limit_mb or 0))
        if 0 < self.memory_limit_mb < MIN_GPU_MEMORY_MB:
            self.memory_limit_mb = MIN_GPU_MEMORY_MB
        self.retina = None
        self.arcface = None
        self.retina_input = ""
        self.arcface_input = ""
        self.device = "CPU"
        self.active = False
        self.message = "Not initialised"
        self.version = ""
        self.ready = False
        self.available_providers = []
        self.requested_provider = ""
        self.directml_dll = ""
        self.directml_dll_present = False
        self.provider_error = ""

    def initialize(self):
        if self.ready:
            return self
        retina_path = self.model_dir / "retinaface.onnx"
        arcface_path = self.model_dir / "arcface.onnx"
        if not retina_path.exists() or not arcface_path.exists():
            raise FileNotFoundError("ONNX face models are missing.")
        ort = _prepare_runtime()
        self.version = str(ort.__version__)
        self.available_providers = list(ort.get_available_providers())
        self.directml_dll, self.directml_dll_present = _directml_dll_path()
        providers, requested = _providers_for(ort, self.mode, self.memory_limit_mb)
        self.requested_provider = requested
        errors = []
        started = time.time()
        self.retina = _make_session(ort, retina_path, providers, errors)
        self.arcface = _make_session(ort, arcface_path, providers, errors)
        self.retina_input = self.retina.get_inputs()[0].name
        self.arcface_input = self.arcface.get_inputs()[0].name
        active_providers = set(self.retina.get_providers()) | set(self.arcface.get_providers())
        if "DmlExecutionProvider" in active_providers:
            self.device = "DirectML"
        elif "CUDAExecutionProvider" in active_providers:
            self.device = "CUDA"
        else:
            self.device = "CPU"
        self.active = self.device != "CPU"
        if self.mode != "off" and self.device == "CPU":
            if "DmlExecutionProvider" not in self.available_providers:
                self.provider_error = (
                    "DmlExecutionProvider not available"
                    + (f" (available: {', '.join(self.available_providers)})"
                       if self.available_providers else "")
                )
            elif requested == "DirectML":
                self.provider_error = "; ".join(errors) or "DirectML session fell back to CPU"
            elif "CUDAExecutionProvider" not in self.available_providers:
                self.provider_error = "No GPU execution provider in this ONNX Runtime build"
            else:
                self.provider_error = "; ".join(errors) or f"{requested} session fell back to CPU"
        if self.mode == "off":
            self.message = f"ONNX Runtime {self.version} · CPU"
        elif self.active:
            self.message = f"ONNX Runtime {self.version} · {self.device}"
        else:
            detail = "DirectML unavailable" if requested == "DirectML" else f"{requested} unavailable"
            self.message = f"ONNX Runtime {self.version} · CPU · {detail}"
        self._warmup()
        self.ready = True
        self.elapsed = time.time() - started
        return self

    def _warmup(self):
        try:
            self.retina.run(None, {self.retina_input: np.zeros((1, 320, 320, 3), dtype=np.float32)})
            self.arcface.run(None, {self.arcface_input: np.zeros((1, 112, 112, 3), dtype=np.float32)})
        except Exception:
            pass

    def _detect(self, img):
        from retinaface.commons import postprocess, preprocess

        proposals_list, scores_list, landmarks_list = [], [], []
        im_tensor, im_info, im_scale = preprocess.preprocess_image(img, True)
        net_out = self.retina.run(None, {self.retina_input: np.ascontiguousarray(im_tensor, dtype=np.float32)})
        sym_idx = 0
        for stride in FEATURE_STRIDES:
            key = f"stride{stride}"
            scores = net_out[sym_idx][:, :, :, NUM_ANCHORS[key]:]
            bbox_deltas = net_out[sym_idx + 1]
            height, width = bbox_deltas.shape[1], bbox_deltas.shape[2]
            anchors = postprocess.anchors_plane(height, width, stride, ANCHORS_FPN[key])
            anchors = anchors.reshape((-1, 4))
            scores = scores.reshape((-1, 1))
            bbox_pred_len = bbox_deltas.shape[3] // NUM_ANCHORS[key]
            bbox_deltas = bbox_deltas.reshape((-1, bbox_pred_len))
            proposals = postprocess.bbox_pred(anchors, bbox_deltas)
            proposals = postprocess.clip_boxes(proposals, im_info[:2])
            if stride == 4 and DECAY4 < 1.0:
                scores *= DECAY4
            scores_ravel = scores.ravel()
            order = np.where(scores_ravel >= DETECT_THRESHOLD)[0]
            proposals = proposals[order, :]
            scores = scores[order]
            proposals[:, 0:4] /= im_scale
            proposals_list.append(proposals)
            scores_list.append(scores)
            landmark_deltas = net_out[sym_idx + 2]
            landmark_pred_len = landmark_deltas.shape[3] // NUM_ANCHORS[key]
            landmark_deltas = landmark_deltas.reshape((-1, 5, landmark_pred_len // 5))
            landmarks = postprocess.landmark_pred(anchors, landmark_deltas)
            landmarks = landmarks[order, :]
            landmarks[:, :, 0:2] /= im_scale
            landmarks_list.append(landmarks)
            sym_idx += 3

        if not proposals_list:
            return {}
        proposals = np.vstack(proposals_list)
        if proposals.shape[0] == 0:
            return {}
        scores = np.vstack(scores_list)
        order = scores.ravel().argsort()[::-1]
        proposals = proposals[order, :]
        scores = scores[order]
        landmarks = np.vstack(landmarks_list)
        landmarks = landmarks[order].astype(np.float32, copy=False)
        pre_det = np.hstack((proposals[:, 0:4], scores)).astype(np.float32, copy=False)
        keep = postprocess.cpu_nms(pre_det, NMS_THRESHOLD)
        det = np.hstack((pre_det, proposals[:, 4:]))
        det = det[keep, :]
        landmarks = landmarks[keep]
        result = {}
        for idx, face in enumerate(det):
            label = f"face_{idx + 1}"
            result[label] = {
                "score": face[4],
                "facial_area": list(face[0:4].astype(int)),
                "landmarks": {
                    "right_eye": list(landmarks[idx][0]),
                    "left_eye": list(landmarks[idx][1]),
                    "nose": list(landmarks[idx][2]),
                    "mouth_right": list(landmarks[idx][3]),
                    "mouth_left": list(landmarks[idx][4]),
                },
            }
        return result

    def recognise(self, frame):
        if not self.ready:
            return []
        from deepface.modules import detection, preprocessing
        from deepface.models.Detector import FacialAreaRegion

        height, width = frame.shape[:2]
        height_border, width_border = int(0.5 * height), int(0.5 * width)
        padded = cv2.copyMakeBorder(
            frame, height_border, height_border, width_border, width_border,
            cv2.BORDER_CONSTANT, value=[0, 0, 0],
        )
        detected = self._detect(padded)
        faces = []
        for identity in detected.values():
            area = identity["facial_area"]
            landmarks = identity["landmarks"]
            region = FacialAreaRegion(
                x=area[0], y=area[1], w=area[2] - area[0], h=area[3] - area[1],
                left_eye=tuple(int(v) for v in landmarks["left_eye"]),
                right_eye=tuple(int(v) for v in landmarks["right_eye"]),
                confidence=identity["score"],
                nose=tuple(int(v) for v in landmarks["nose"]),
                mouth_left=tuple(int(v) for v in landmarks["mouth_left"]),
                mouth_right=tuple(int(v) for v in landmarks["mouth_right"]),
            )
            face = detection.extract_face(
                facial_area=region, img=padded, align=True, expand_percentage=0,
                width_border=width_border, height_border=height_border,
                detector_backend="retinaface",
            )
            x = max(0, int(face.facial_area.x))
            y = max(0, int(face.facial_area.y))
            w = min(width - x - 1, int(face.facial_area.w))
            h = min(height - y - 1, int(face.facial_area.h))
            if min(w, h) < 60 or face.img.shape[0] == 0 or face.img.shape[1] == 0:
                continue
            gray = cv2.cvtColor(frame[y:y + h, x:x + w], cv2.COLOR_BGR2GRAY)
            if float(cv2.Laplacian(gray, cv2.CV_64F).var()) < 15:
                continue
            crop = face.img.astype(np.float32) / 255.0
            prepared = preprocessing.resize_image(crop, (112, 112))
            faces.append((prepared, [x, y, w, h]))

        if not faces:
            return []
        batch = np.concatenate([item[0] for item in faces], axis=0).astype(np.float32, copy=False)
        embeddings = self.arcface.run(None, {self.arcface_input: batch})[0]
        result = []
        for idx, (_, box) in enumerate(faces):
            embedding = np.asarray(embeddings[idx], dtype=np.float32)
            if embedding.size != 512 or float(np.linalg.norm(embedding)) <= 0:
                continue
            result.append((embedding, box))
        return result

    def status(self):
        return {
            "active": bool(self.active),
            "mode": self.mode,
            "devices": [self.device] if self.active else [],
            "message": self.message,
            "backend": "ONNX Runtime",
            "provider": self.device,
            "requestedProvider": self.requested_provider,
            "availableProviders": self.available_providers,
            "directmlDll": self.directml_dll,
            "directmlDllPresent": self.directml_dll_present,
            "providerError": self.provider_error,
            "version": self.version,
            "memoryLimitMb": self.memory_limit_mb,
        }
