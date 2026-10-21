"""Local scaffold: health and feature-state endpoints only. No public AI endpoint."""
import argparse
import json
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

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path not in ('/health', '/capabilities'):
                self.send_error(404)
                return
            payload = {'status': 'ok'} if self.path == '/health' else readiness(config)
            data = json.dumps(payload).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()


if __name__ == '__main__':
    main()
