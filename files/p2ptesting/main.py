import threading, sys, time, random, json, struct
from network import P2PNetwork
from blockchain import Block
from printer import print_block_report, print_gossip_report, print_utxo_summary
from config import DIFFICULTY, get_all_ports 
import branching_logger

ALL_PORTS = get_all_ports()
MY_INDEX = int(sys.argv[2]) if len(sys.argv) > 2 else 0
ASSIGNED_PORT = ALL_PORTS[MY_INDEX]

# --- STATE ---
UTXO_SET = {"SYSTEM": 1000000}
BLOCKCHAIN = [] 
SEEN_BLOCKS = set()
MEMPOOL = []  
CURRENT_IDX = 0 
LAST_HASH = "0" * 64
GENESIS_TIMESTAMP = 1706342400.0 
GENESIS_TXS = [{"sender": "SYSTEM", "receiver": "INITIAL_DISTRIBUTION", "amount": 1000}]

def validate_transactions(tx_list, current_ledger):
    temp_ledger = current_ledger.copy()
    for tx in tx_list:
        s, r, a = tx['sender'], tx['receiver'], tx['amount']
        if s == "SYSTEM":
            temp_ledger[r] = temp_ledger.get(r, 0) + a
            continue
        current_bal = temp_ledger.get(s, 0)
        if current_bal < a: return False, current_ledger 
        temp_ledger[s] -= a
        temp_ledger[r] = temp_ledger.get(r, 0) + a
    return True, temp_ledger

def on_message_received(payload, sender_port, addr, header_bytes):
    global LAST_HASH, UTXO_SET, CURRENT_IDX, MEMPOOL, BLOCKCHAIN
    try:
        decoded = payload.decode('utf-8')
        data = json.loads(decoded)
        
        if data.get("type") == "transaction":
            tx = data["data"]
            if tx not in MEMPOOL:
                bal = UTXO_SET.get(tx['sender'], 0)
                if bal >= tx['amount'] or tx['sender'] == "SYSTEM":
                    MEMPOOL.append(tx)
                    print_gossip_report("RECEIVED", tx, bal, peer_info=f"Port {sender_port}", header_info=header_bytes)
                    net.broadcast(decoded)
            return

        block_hash = data.get('hash')
        if not block_hash or block_hash in SEEN_BLOCKS: 
            return

        # 1. PoW Check
        if not Block.validate_block(data, DIFFICULTY):
            branching_logger.log_event("RECEIVE", ASSIGNED_PORT, data['index'], block_hash, data['prev'], "REJECTED_POW")
            return

        # 2. Fork Check
        if data['prev'] != LAST_HASH:
            branching_logger.log_event("RECEIVE", ASSIGNED_PORT, data['index'], block_hash, data['prev'], "REJECTED_FORK")
            return

        # 3. Transaction Check
        success, result_ledger = validate_transactions(data['transactions'], UTXO_SET)
        if not success:
            branching_logger.log_event("RECEIVE", ASSIGNED_PORT, data['index'], block_hash, data['prev'], "REJECTED_TX")
            return

        # ACCEPT
        BLOCKCHAIN.append(data)
        SEEN_BLOCKS.add(block_hash)
        UTXO_SET = result_ledger
        LAST_HASH = block_hash
        CURRENT_IDX = data['index'] + 1
        MEMPOOL = [tx for tx in MEMPOOL if tx not in data['transactions']]
        
        branching_logger.log_event("RECEIVE", ASSIGNED_PORT, data['index'], block_hash, data['prev'], "ACCEPTED")
        print_block_report("SUCCESS", "NETWORK BLOCK ACCEPTED", data, data['prev'], UTXO_SET, header_info=header_bytes)
        print_utxo_summary(UTXO_SET)
        net.broadcast(decoded)

    except Exception:
        pass

net = P2PNetwork(ASSIGNED_PORT, on_message_received)
threading.Thread(target=net.listen, daemon=True).start()
while not net.is_online: time.sleep(0.1)

MY_FINAL_PORT = str(net.my_port)
# Genesis
genesis_block = Block(0, GENESIS_TXS, "0"*64, timestamp=GENESIS_TIMESTAMP)
gen_data = {"index": 0, "hash": genesis_block.hash, "prev": "0"*64, "transactions": GENESIS_TXS, "nonce": 0, "timestamp": GENESIS_TIMESTAMP}
BLOCKCHAIN.append(gen_data)
LAST_HASH = genesis_block.hash
SEEN_BLOCKS.add(LAST_HASH)
CURRENT_IDX = 1
_, UTXO_SET = validate_transactions(GENESIS_TXS, UTXO_SET)

net.register_node()
net.start_discovery()

def tx_generator():
    while True:
        time.sleep(random.randint(8, 15))
        my_bal = UTXO_SET.get(MY_FINAL_PORT, 0)
        if my_bal >= 5:
            target = str(random.choice([p for p in ALL_PORTS if p != int(MY_FINAL_PORT)]))
            tx = {"sender": MY_FINAL_PORT, "receiver": target, "amount": random.randint(1, 5)}
            if tx not in MEMPOOL:
                MEMPOOL.append(tx)
                print_gossip_report("BROADCAST", tx, my_bal)
                net.broadcast(json.dumps({"type": "transaction", "data": tx}))

threading.Thread(target=tx_generator, daemon=True).start()

if "--auto" in sys.argv:
    while True:
        time.sleep(random.randint(10, 20)) 
        reward_tx = {"sender": "SYSTEM", "receiver": MY_FINAL_PORT, "amount": 100}
        current_txs = [reward_tx] + list(MEMPOOL)
        
        success, result_ledger = validate_transactions(current_txs, UTXO_SET)
        if success:
            new_b = Block(CURRENT_IDX, current_txs, LAST_HASH)
            new_b.mine_block(DIFFICULTY)
            
            block_data = {"index": CURRENT_IDX, "hash": new_b.hash, "prev": LAST_HASH, "transactions": current_txs, "nonce": new_b.nonce, "timestamp": new_b.timestamp}
            
            if block_data['prev'] == LAST_HASH:
                BLOCKCHAIN.append(block_data)
                UTXO_SET = result_ledger
                LAST_HASH = new_b.hash
                SEEN_BLOCKS.add(new_b.hash)
                MEMPOOL = [] 
                CURRENT_IDX += 1
                branching_logger.log_event("MINE", ASSIGNED_PORT, block_data['index'], block_data['hash'], block_data['prev'], "SUCCESS")
                print_block_report("SUCCESS", "LOCAL BLOCK MINED", block_data, block_data['prev'], UTXO_SET)
                net.broadcast(json.dumps(block_data))
            else:
                branching_logger.log_event("MINE", ASSIGNED_PORT, block_data['index'], block_data['hash'], block_data['prev'], "STALE")
                print_block_report("REJECTED", "STALE LOCAL", block_data, LAST_HASH, UTXO_SET)