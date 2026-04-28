import json, struct
from datetime import datetime
from func import get_hex_dump

def print_utxo_summary(utxo_set):
    """Prints a high-level summary of the current ledger state."""
    total_supply = sum(utxo_set.values())
    active_accounts = len(utxo_set)
    print(f"\n{'='*40}")
    print(f"       GLOBAL UTXO SET SUMMARY")
    print(f"{'='*40}")
    print(f"  Total Active Accounts: {active_accounts}")
    print(f"  Total Coin Supply:     {total_supply} units")
    print(f"  Memory Footprint:      ~{active_accounts * 64} bytes")
    
    # Sort by balance to show top holders
    top_holders = sorted(utxo_set.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"\n  TOP 5 HOLDERS:")
    for addr, bal in top_holders:
        print(f"    {addr}: {bal}")
    print(f"{'='*40}\n")

def print_protocol_breakdown(header_bytes):
    """Shows the low-level forensic breakdown of the network packet."""
    if not header_bytes: return
    magic, port, size = struct.unpack("!4sIH", header_bytes)
    
    print(f"PROTOCOL FORENSICS:")
    print(f"  [RAW HEADER HEX]: {get_hex_dump(header_bytes)}")
    print(f"  [1-4]  Magic Bytes: {magic.decode()} ({get_hex_dump(magic)}) -> [CONFIRMED: BITCOIN-STYLE PROTOCOL]")
    print(f"  [5-8]  Source Port: {port} (Encoded as Integer)")
    print(f"  [9-10] Payload Size: {size} bytes (Expected stream length)")
    print(f"  [RESULT]: Header parsed successfully. Buffering {size} bytes from stream...")

def print_gossip_report(mode, tx, balance, peer_info=None, header_info=None):
    symbol = "[+++]" if mode == "BROADCAST" else "[---]"
    border = ("=" if mode == "BROADCAST" else "-") * 95
    header_str = "Local Node -> Network" if mode == "BROADCAST" else f"FROM: {peer_info}"
    
    print(f"\n{symbol} TRANSACTION GOSSIP: {mode}")
    print(border)
    if header_info: print_protocol_breakdown(header_info)
    print(f"NETWORK DATA:    {header_str}")
    print(f"TIMESTAMP:       {datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}")
    print(f"{'-' * 95}")
    print(f"TRANSACTION DATA:")
    print(f"  Sender:        {tx['sender']}")
    print(f"  Receiver:      {tx['receiver']}")
    print(f"  Amount:        {tx['amount']} units")
    print(f"\nLEDGER AUDIT:")
    print(f"  Sender Balance: {balance}")
    print(f"  Status:         {'VALID' if balance >= tx['amount'] or tx['sender'] == 'SYSTEM' else 'INVALID'}")
    print(border)

def print_block_report(status, reason, data, expected_prev, ledger, header_info=None, mine_stats=None):
    symbol = "[++]" if "LOCAL" in reason else "[--]"
    if status == "REJECTED": symbol = "[!!]"
    border = ("=" if status == "SUCCESS" else "!") * 95
    
    print(f"\n{symbol} BLOCK {status}: {reason}")
    print(border)
    if header_info: print_protocol_breakdown(header_info)
    print(f"TIMESTAMP:       {datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}")
    print(f"{'-' * 95}")
    print(f"BLOCK METADATA:")
    print(f"  Index:         {data.get('index')}")
    print(f"  Current Hash:  {data.get('hash')}")
    print(f"  Previous Hash: {data.get('prev')}")
    print(f"  Nonce Used:    {data.get('nonce')}")
    
    print(f"\nVERIFICATION:")
    print(f"  1. Chain Link: Expecting {expected_prev[:10]}... | Result: {'PASS' if data.get('prev') == expected_prev else 'FAIL'}")
    print(f"  2. PoW Check:  Prefix '00' | Result: {'PASS' if data.get('hash').startswith('00') else 'FAIL'}")
    print(border)