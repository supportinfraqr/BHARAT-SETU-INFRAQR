"""DRF exception handler returning a consistent JSON error envelope matching legacy { Result, Message } shape."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def _v1_error(response, context):
    request = context.get("request")
    if request is None or not request.path.startswith("/api/v1/"):
        return None
    detail = response.data
    if isinstance(detail, dict) and "detail" in detail:
        detail = detail["detail"]
    codes = {
        status.HTTP_400_BAD_REQUEST: "VALIDATION_ERROR",
        status.HTTP_401_UNAUTHORIZED: "AUTH_REQUIRED",
        status.HTTP_403_FORBIDDEN: "FORBIDDEN",
        status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMITED",
    }
    code = codes.get(response.status_code, "REQUEST_ERROR")
    request_id = request.headers.get("X-Request-ID")
    return Response(
        {"error": {"code": code, "message": str(detail), "requestId": request_id}},
        status=response.status_code,
    )


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    v1_response = _v1_error(response, context)
    if v1_response is not None:
        return v1_response

    detail = response.data
    if isinstance(detail, dict) and "detail" in detail:
        detail = detail["detail"]

    return Response(
        {"Result": "Error", "Message": str(detail)},
        status=response.status_code,
    )
