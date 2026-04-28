#!/usr/bin/env python3
"""
Local TTS server for the browser app.
Run: pip install kokoro-onnx soundfile numpy flask flask-cors
Then: python tts_server.py
"""

import io
import urllib.request
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS

MODELS_DIR = Path(__file__).parent / "benchmark_models"
MODELS_DIR.mkdir(exist_ok=True)

KOKORO_ONNX = MODELS_DIR / "kokoro-v1.0.onnx"
VOICES_BIN  = MODELS_DIR / "voices-v1.0.bin"

ASSETS = [
    ("https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx", KOKORO_ONNX),
    ("https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin",  VOICES_BIN),
]

def download_assets():
    for url, path in ASSETS:
        if not path.exists():
            print(f"Downloading {path.name}...")
            urllib.request.urlretrieve(url, path)

print("Downloading model assets if needed...")
download_assets()
print("Loading Kokoro engine...")
engine = Kokoro(str(KOKORO_ONNX), str(VOICES_BIN))
print("Ready.")

app = Flask(__name__)
CORS(app)

VOICES = ["am_adam", "am_onyx", "af_heart", "af_bella", "bf_emma", "bm_george"]

@app.route("/voices")
def voices():
    return jsonify(VOICES)

@app.route("/tts", methods=["POST"])
def tts():
    data    = request.json or {}
    text    = data.get("text", "").strip()
    voice   = data.get("voice", "am_adam")
    speed   = float(data.get("speed", 1.0))
    lang    = data.get("lang", "en-us")

    if not text:
        return jsonify({"error": "No text"}), 400
    if voice not in VOICES:
        voice = "am_adam"

    samples, sample_rate = engine.create(text, voice=voice, speed=speed, lang=lang)

    buf = io.BytesIO()
    sf.write(buf, samples, sample_rate, format="WAV")
    buf.seek(0)
    return send_file(buf, mimetype="audio/wav")

if __name__ == "__main__":
    print("TTS server running at http://localhost:7731")
    app.run(host="127.0.0.1", port=7731, debug=False)
