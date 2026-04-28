import socket
import random

def find_available_port(start_port=5000):
    port = start_port
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('0.0.0.0', port))
                return port 
            except socket.error:
                port += 1 

def get_spoofed_identity(port):
    """Deterministic random IP generation based on port."""
    random.seed(port)
    ip = f"{random.randint(1, 254)}.{random.randint(1, 254)}.{random.randint(1, 254)}.{random.randint(1, 254)}"
    locations = ["Tokyo, JP", "Berlin, DE", "New York, US", "Seoul, KR", "London, UK"]
    loc = locations[port % len(locations)]
    return {"ip": ip, "loc": loc}

def get_hex_dump(data_bytes):
    if isinstance(data_bytes, str):
        data_bytes = data_bytes.encode('utf-8')
    return " ".join(f"{b:02X}" for b in data_bytes) 