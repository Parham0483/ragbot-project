# CSP header for all responses — this is a pure REST API so no scripts/styles/frames needed
class ContentSecurityPolicyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Content-Security-Policy'] = (
            "default-src 'none'; frame-ancestors 'none'"
        )
        return response
