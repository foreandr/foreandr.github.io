# config.py
NUM_HONEST = 6
START_PORT = 5000
HACKER_PORT = START_PORT + NUM_HONEST
DIFFICULTY = 2

def get_all_ports():
    return list(range(START_PORT, HACKER_PORT + 1))