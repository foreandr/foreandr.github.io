from flask import Flask, send_from_directory, make_response
import os

app = Flask(__name__, static_folder='.', static_url_path='')

# Disable caching globally
@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Serve index.html at /
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# Serve any file in the project folder
@app.route('/<path:filename>')
def serve_file(filename):
    if os.path.exists(filename):
        return send_from_directory('.', filename)
    return ("File not found", 404)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001, debug=True)
