import json
import os
import threading

BRANCH_FILE = "network_topology.json"
LIVE_VIEW_FILE = "live_chain_view.txt"
lock = threading.Lock()

def log_event(event_type, node, block_index, block_hash, prev_hash, status="SUCCESS"):
    """
    Records a block event and automatically updates the live text visualization.
    Uses UTF-8 encoding to prevent crashes on Windows systems.
    """
    with lock:
        data = []
        if os.path.exists(BRANCH_FILE):
            try:
                # Explicitly use utf-8 for reading
                with open(BRANCH_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except:
                data = []

        entry = {
            "node": node,
            "type": event_type,
            "index": block_index,
            "hash": block_hash[:10],
            "prev": prev_hash[:10],
            "status": status,
            "timestamp": os.times()[4]
        }
        
        data.append(entry)
        
        # Explicitly use utf-8 for writing
        with open(BRANCH_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            
        update_live_view(data)

def update_live_view(events):
    """Generates a text-based map of the chain's growth and branches."""
    tree = {}
    for e in events:
        idx = e['index']
        if idx not in tree: tree[idx] = []
        tag = f"{e['node']}({e['hash']})[{e['status']}]"
        tree[idx].append((tag, e['prev']))

    # Explicitly use utf-8 to support the box-drawing characters └──
    with open(LIVE_VIEW_FILE, "w", encoding="utf-8") as f:
        f.write("=== LIVE BLOCKCHAIN BRANCHING MAP ===\n")
        f.write("Format: Node(CurrentHash)<-ParentHash\n\n")
        
        for idx in sorted(tree.keys()):
            f.write(f"BLOCK {idx}:\n")
            branches = tree[idx]
            for tag, prev in branches:
                f.write(f"  └── {tag} <--- Parent: {prev}\n")
            f.write("\n")

def get_tree_view():
    if not os.path.exists(LIVE_VIEW_FILE):
        return "No branches recorded yet."
    with open(LIVE_VIEW_FILE, "r", encoding="utf-8") as f:
        return f.read()