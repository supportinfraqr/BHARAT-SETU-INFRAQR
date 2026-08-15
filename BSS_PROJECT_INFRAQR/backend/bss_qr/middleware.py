"""Security response headers middleware."""
from django.http import HttpResponse


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if isinstance(response, HttpResponse):
            response.setdefault("X-Content-Type-Options", "nosniff")
            response.setdefault("X-Frame-Options", "DENY")
            response.setdefault("X-XSS-Protection", "1; mode=block")
            response.setdefault(
                "Content-Security-Policy",
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; font-src 'self' data:; object-src 'none'; base-uri 'self'",
            )
            response.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        return response
