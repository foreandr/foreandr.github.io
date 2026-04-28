from flask import Flask, send_from_directory

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

@app.route('/secret')
@app.route('/secret/')
def serve_secret():
    return send_from_directory('secret', 'index.html')

@app.route('/SECRET')
@app.route('/SECRET/')
def serve_secret_upper():
    # Same folder as /secret (GitHub Pages path is lowercase; Linux is case-sensitive).
    return send_from_directory('secret', 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001, debug=True)