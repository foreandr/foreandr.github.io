# app.py
# Simple HTTP server for local testing of your portfolio
# Usage:
#   python app.py
#
# Then open http://localhost:8000/index.html in your browser.
# Stop the server with CTRL+C.

import http.server
import socketserver
import os
import signal
import sys

PORT = 8000

# Serve files from the current directory (Portfolio)
web_dir = os.path.join(os.path.dirname(__file__))
os.chdir(web_dir)

Handler = http.server.SimpleHTTPRequestHandler

# Create the server
httpd = socketserver.TCPServer(("", PORT), Handler)

def shutdown_server(sig, frame):
    print("\nShutting down server gracefully...")
    httpd.server_close()
    sys.exit(0)

# Catch CTRL+C (SIGINT)
signal.signal(signal.SIGINT, shutdown_server)

print(f"Serving at http://localhost:{PORT}")
print("Press CTRL+C to stop the server.")

# Serve forever until CTRL+C
httpd.serve_forever()
