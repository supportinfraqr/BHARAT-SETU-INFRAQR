"""DRF exception handler returning a consistent JSON error envelope matching legacy { Result, Message } shape."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    detail = response.data
    if isinstance(detail, dict) and "detail" in detail:
        detail = detail["detail"]

    return Response(
        {"Result": "Error", "Message": str(detail)},
        status=response.status_code,
    )
