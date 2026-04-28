"""
process_mempool.py
------------------
Reads bitcoin_mempool_evolution.csv and produces graph_data.js
which embeds all node/edge data for the vis.js animated visualization.

Only transactions where at least one party has a real address are included
as meaningful graph edges. COINBASE is kept as a special node.
P2PK/Unknown is treated as a single "Early Miner" node.
OP_RETURN/Unknown receivers are skipped (unspendable outputs).
"""

import csv
import json
from collections import defaultdict

CSV_FILE = "bitcoin_mempool_evolution.csv"
OUTPUT_FILE = "graph_data.js"

SKIP_ADDRESSES = {"Unknown", "OP_RETURN/Unknown"}

# Rename map for display
LABEL_MAP = {
    "COINBASE": "COINBASE (Mining)",
    "P2PK/Unknown": "Early Miner (P2PK)",
}


def short_addr(addr):
    """Shorten address for display label."""
    if addr in LABEL_MAP:
        return LABEL_MAP[addr]
    if len(addr) > 12:
        return addr[:6] + "..." + addr[-4:]
    return addr


def main():
    nodes = {}          # addr -> node info
    edge_agg = {}       # (from_id, to_id) -> aggregated edge
    address_stats = defaultdict(lambda: {
        "total_sent": 0.0,
        "total_received": 0.0,
        "tx_count": 0,
        "first_seen_block": None,
        "first_seen_time": None,
        "last_seen_block": None,
        "last_seen_time": None,
        "transactions": [],
    })

    # Global stats
    total_btc = 0.0
    total_txs = 0
    block_min = float("inf")
    block_max = 0
    time_min = None
    time_max = None
    mining_rewards = 0
    p2p_transfers = 0

    node_id_counter = 0

    with open(CSV_FILE, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sender = row["Sender"].strip()
            receiver = row["Receiver"].strip()
            block = int(row["Block"])
            timestamp = row["Timestamp"].strip()
            tx_type = row["Type"].strip()
            amount = float(row["Amount_BTC"])
            tx_hash = row["TX_Hash"].strip()

            # Skip unspendable / unknown receivers
            if receiver in SKIP_ADDRESSES:
                # Still count for global stats
                total_txs += 1
                total_btc += amount
                if tx_type == "Mining Reward":
                    mining_rewards += 1
                block_min = min(block_min, block)
                block_max = max(block_max, block)
                if time_min is None or timestamp < time_min:
                    time_min = timestamp
                if time_max is None or timestamp > time_max:
                    time_max = timestamp
                continue

            # Skip if both are truly unknown
            if sender in SKIP_ADDRESSES and receiver in SKIP_ADDRESSES:
                continue

            total_txs += 1
            total_btc += amount
            block_min = min(block_min, block)
            block_max = max(block_max, block)
            if time_min is None or timestamp < time_min:
                time_min = timestamp
            if time_max is None or timestamp > time_max:
                time_max = timestamp

            if tx_type == "Mining Reward":
                mining_rewards += 1
            else:
                p2p_transfers += 1

            # Register nodes
            for addr in [sender, receiver]:
                if addr not in SKIP_ADDRESSES and addr not in nodes:
                    is_coinbase = addr == "COINBASE"
                    is_p2pk = addr == "P2PK/Unknown"
                    nodes[addr] = {
                        "id": node_id_counter,
                        "label": short_addr(addr),
                        "fullAddress": addr,
                        "group": "coinbase" if is_coinbase else ("p2pk" if is_p2pk else "address"),
                        "first_block": block,
                        "first_time": timestamp,
                    }
                    node_id_counter += 1

            # Update address stats
            if sender not in SKIP_ADDRESSES:
                stats = address_stats[sender]
                stats["total_sent"] += amount
                stats["tx_count"] += 1
                if stats["first_seen_block"] is None or block < stats["first_seen_block"]:
                    stats["first_seen_block"] = block
                    stats["first_seen_time"] = timestamp
                stats["last_seen_block"] = block
                stats["last_seen_time"] = timestamp
                stats["transactions"].append({
                    "block": block, "time": timestamp, "type": tx_type,
                    "amount": amount, "direction": "sent", "counterparty": short_addr(receiver),
                    "tx_hash": tx_hash,
                })

            if receiver not in SKIP_ADDRESSES:
                stats = address_stats[receiver]
                stats["total_received"] += amount
                stats["tx_count"] += 1
                if stats["first_seen_block"] is None or block < stats["first_seen_block"]:
                    stats["first_seen_block"] = block
                    stats["first_seen_time"] = timestamp
                stats["last_seen_block"] = block
                stats["last_seen_time"] = timestamp
                stats["transactions"].append({
                    "block": block, "time": timestamp, "type": tx_type,
                    "amount": amount, "direction": "received",
                    "counterparty": short_addr(sender),
                    "tx_hash": tx_hash,
                })

            # Build edge
            sender_id = nodes.get(sender, {}).get("id")
            receiver_id = nodes.get(receiver, {}).get("id")
            if sender_id is not None and receiver_id is not None:
                edge_key = (sender_id, receiver_id)
                if edge_key not in edge_agg:
                    edge_agg[edge_key] = {
                        "from": sender_id,
                        "to": receiver_id,
                        "firstBlock": block,
                        "lastBlock": block,
                        "firstTime": timestamp,
                        "lastTime": timestamp,
                        "totalAmount": 0.0,
                        "txCount": 0,
                        "senderFull": sender,
                        "receiverFull": receiver,
                        "senderLabel": short_addr(sender),
                        "receiverLabel": short_addr(receiver),
                        "types": set(),
                        "sampleTxs": [],
                    }
                agg = edge_agg[edge_key]
                agg["totalAmount"] += amount
                agg["txCount"] += 1
                agg["lastBlock"] = max(agg["lastBlock"], block)
                agg["lastTime"] = max(agg["lastTime"], timestamp)
                agg["types"].add(tx_type)
                if len(agg["sampleTxs"]) < 10:
                    agg["sampleTxs"].append({
                        "b": block, "t": timestamp, "a": round(amount, 8), "h": tx_hash,
                    })

    # Limit tx history per address for JSON size
    for addr, stats in address_stats.items():
        stats["transactions"] = stats["transactions"][:50]  # keep last 50

    # Build node list with stats
    node_list = []
    for addr, ninfo in nodes.items():
        stats = address_stats.get(addr, {})
        node_list.append({
            **ninfo,
            "totalSent": round(stats.get("total_sent", 0), 8),
            "totalReceived": round(stats.get("total_received", 0), 8),
            "txCount": stats.get("tx_count", 0),
            "firstSeenBlock": stats.get("first_seen_block"),
            "firstSeenTime": stats.get("first_seen_time"),
            "lastSeenBlock": stats.get("last_seen_block"),
            "lastSeenTime": stats.get("last_seen_time"),
            "transactions": stats.get("transactions", []),
        })

    # Build final edge list from aggregated edges
    edges = []
    for key, agg in edge_agg.items():
        agg["totalAmount"] = round(agg["totalAmount"], 8)
        agg["types"] = list(agg["types"])
        edges.append(agg)

    # Sort edges by first block for animation ordering
    edges.sort(key=lambda e: e["firstBlock"])

    output = {
        "nodes": node_list,
        "edges": edges,
        "stats": {
            "totalTransactions": total_txs,
            "totalBTC": round(total_btc, 8),
            "blockRange": [block_min, block_max],
            "timeRange": [time_min, time_max],
            "miningRewards": mining_rewards,
            "p2pTransfers": p2p_transfers,
            "uniqueAddresses": len(nodes),
            "graphEdges": len(edges),
        },
    }

    with open(OUTPUT_FILE, "w") as f:
        f.write("const GRAPH_DATA = ")
        json.dump(output, f)
        f.write(";")

    print(f"✅ Generated {OUTPUT_FILE}")
    print(f"   Nodes: {len(node_list)}")
    print(f"   Edges: {len(edges)}")
    print(f"   Blocks: {block_min} - {block_max}")
    print(f"   Time:   {time_min} - {time_max}")
    print(f"   Total BTC moved: {round(total_btc, 2)}")


if __name__ == "__main__":
    main()