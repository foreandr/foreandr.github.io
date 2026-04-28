import socket, threading, os, struct, time

PEER_FILE = "peers.txt"

class P2PNetwork:
    def __init__(self, my_port, message_callback):
        self.my_port = my_port
        self.message_callback = message_callback
        self.known_peers = set()
        self.is_online = False

    def listen(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(('127.0.0.1', self.my_port))
            s.listen()
            self.is_online = True
            print(f"--- NODE SUCCESSFULLY BOUND TO PORT {self.my_port} ---")
            while True:
                conn, addr = s.accept()
                threading.Thread(target=self.handle_client, args=(conn, addr)).start()
        except Exception as e:
            print(f"BIND ERROR: {e}")

    def handle_client(self, conn, addr):
        try:
            header = conn.recv(10) # 4s (magic) + I (port) + H (size)
            if not header: return
            magic, port, size = struct.unpack("!4sIH", header)
            
            payload = b""
            while len(payload) < size:
                chunk = conn.recv(size - len(payload))
                if not chunk: break
                payload += chunk
            
            # Pass header_bytes so we can show the hex breakdown in logs
            self.message_callback(payload, port, addr, header)
        except Exception as e:
            # Removed the empty pass to help you see protocol errors
            pass
        finally: conn.close()

    def broadcast(self, msg):
        # Use the in-memory set populated by start_discovery
        # This prevents the race condition of reading an empty/locked file
        peers_to_send = list(self.known_peers)
        
        data = msg.encode('utf-8')
        header = struct.pack("!4sIH", b"PC01", self.my_port, len(data))
        
        for p in peers_to_send:
            if p == self.my_port: continue
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(0.5) # Increased timeout for stability
                    s.connect(('127.0.0.1', p))
                    s.sendall(header + data)
            except: 
                pass

    def register_node(self):
        # Append only, ensuring we don't wipe existing peers
        with open(PEER_FILE, "a") as f: 
            f.write(f"{self.my_port}\n")

    def start_discovery(self):
        def loop():
            while True:
                try:
                    if os.path.exists(PEER_FILE):
                        with open(PEER_FILE, "r") as f:
                            # Filter out self and empty lines
                            lines = f.readlines()
                            current_in_file = set(int(l.strip()) for l in lines if l.strip())
                            
                            # Update our internal set with new peers found in the file
                            new_peers = current_in_file - self.known_peers
                            for p in new_peers:
                                if p != self.my_port:
                                    self.known_peers.add(p)
                except Exception as e:
                    pass
                time.sleep(1) # Faster check for initial startup
        threading.Thread(target=loop, daemon=True).start()