"""Local scaffold with optional quota-protected public terminology proxy. No AI route."""
import argparse
import json
from urllib.parse import urlparse, parse_qs
from optional.api.public_lookup import PublicLookup, LimitReached
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from optional.settings import load, require, readiness


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8080)
    args = parser.parse_args()
    config = load(args.config)
    require(config, 'api')

    proxy = PublicLookup()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            # No raw IP addresses, query strings or request bodies in access logs.
            pass

        def reply(self, status, payload):
            data = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            origin = config.get('public_lookup', {}).get('allowed_origin')
            if origin and self.headers.get('Origin') == origin:
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Vary', 'Origin')
            if status == 429:
                self.send_header('Retry-After', '60')
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            parsed = urlparse(self.path)
            if parsed.path in ('/health', '/capabilities'):
                self.reply(200, {'status': 'ok'} if parsed.path == '/health' else readiness(config))
                return
            if parsed.path != '/lookup':
                self.reply(404, {'error': 'Not found'})
                return
            if config.get('public_lookup', {}).get('enabled') is not True:
                self.reply(403, {'error': 'Public lookup disabled'})
                return
            allowed_origin = config['public_lookup'].get('allowed_origin')
            if self.headers.get('Origin') and self.headers.get('Origin') != allowed_origin:
                self.reply(403, {'error': 'Origin not permitted'})
                return
            query = parse_qs(parsed.query)
            try:
                result = proxy.search(self.client_address[0], query.get('source', [''])[0], query.get('term', [''])[0])
                self.reply(200, result)
            except LimitReached as error:
                self.reply(429, {'error': str(error)})
            except ValueError:
                self.reply(400, {'error': 'Invalid source, term or source response'})
            except Exception:
                self.reply(502, {'error': 'Public source unavailable'})

    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()


if __name__ == '__main__':
    main()
