import hashlib, json, time

class Block:
    def __init__(self, index, transactions, previous_hash, timestamp=None, nonce=0, hash=None):
        self.index = index
        self.timestamp = timestamp or time.time()
        self.transactions = transactions
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.hash = hash or self.calculate_hash()

    def calculate_hash(self):
        block_string = json.dumps({
            "index": self.index, "timestamp": self.timestamp,
            "transactions": self.transactions, "previous_hash": self.previous_hash,
            "nonce": self.nonce
        }, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

    def mine_block(self, difficulty):
        target = "0" * difficulty
        start_time = time.time()
        attempts = 0
        
        input_preview = json.dumps({"idx": self.index, "prev": self.previous_hash[:10], "txs": len(self.transactions)}, sort_keys=True)
        print(f"\n[CPU] >> FEEDING DATA TO SHA-256: {input_preview}")
        
        while self.hash[:difficulty] != target:
            self.nonce += 1
            self.hash = self.calculate_hash()
            attempts += 1
            if attempts % 1000 == 0:
                print(f"  [WAIT] Attempt {attempts}... Hash: {self.hash[:10]}... (FAIL)")

        duration = time.time() - start_time
        print(f"[CPU] >> SUCCESS! Nonce {self.nonce} produced {self.hash[:10]} in {duration:.4f}s")
        return self.hash, duration, attempts

    @staticmethod
    def validate_block(block_dict, difficulty=2):
        """Re-hashes the block data to ensure the hash is real and meets difficulty."""
        try:
            # Reconstruct the block object from the dictionary received over the wire
            check_block = Block(
                index=block_dict['index'],
                transactions=block_dict['transactions'],
                previous_hash=block_dict['prev'],
                timestamp=block_dict['timestamp'],
                nonce=block_dict['nonce']
            )
            # 1. Does the hash provided match a real hash of this data?
            # 2. Does the hash meet the network difficulty?
            is_hash_valid = (check_block.hash == block_dict['hash'])
            is_pow_valid = (block_dict['hash'].startswith("0" * difficulty))
            
            return is_hash_valid and is_pow_valid
        except Exception:
            return False