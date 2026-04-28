# foreandr.github.io

Personal portfolio site — a Flask-served collection of 30+ interactive apps spanning mathematics, data analysis, game AI, world data, and more.

## Running Locally

```bash
pip install -r req.txt
python app.py
# → http://localhost:8001
```

Or with Gunicorn:

```bash
gunicorn app:app -b 0.0.0.0:8001
```

---

## Apps

### Dashboards / Data

| App | Description |
|-----|-------------|
| **ArXiv Zeitgeist** | Research trend explorer — unigram/bigram frequency across arxiv papers by date |
| **Sacred Texts Analysis** | Linguistic deep-dive across 21 religious & philosophical texts (Vocabulary, N-grams, Sentiment, Similarity, and more) |
| **Reddit Financial Sentiment** | VADER sentiment analysis on Reddit posts across crypto, equities, real estate, and materials sectors |
| **Network State Dashboards** | Metrics and signals for network-school related data |
| **Reddit Subreddit Analytics** | Subreddit research dashboard — stats, trends, topic insights |
| **Bar Chart Races** | Animated ranking visualizations from Federal Reserve, IMF, UFC, and World Bank datasets |

### World Data

| App | Description |
|-----|-------------|
| **Economic Data on Spherical Earth** | Three.js 3D globe with IMF, World Bank, and WHO data overlaid geographically |
| **Natural Resources on Flat Earth** | Choropleth map of global reserves over time — oil, gas, coal, uranium, metals, renewables |
| **Global Sanctions Tracker** | Monitor entities and individuals across UN, OFAC, EU, and UK watchlists |
| **Space Orbits Explorer** | Ephemeris-driven 3D orbital visualization via JPL Horizons API |

### Graph Networks

| App | Description |
|-----|-------------|
| **Bitcoin Network Timelapse (2009–2011)** | Animated vis-network timelapse of every early Bitcoin transaction, color-coded by type |
| **Social Graph Explorer** | Interactive network graphs for relationship and community exploration |

### Mathematics

| App | Description |
|-----|-------------|
| **Path Integral Phase-Space** | Sum-over-histories simulator in the Argand plane — visualizes quantum interference and stationary phase |
| **Collatz Conjecture Tool** | Dynamic graph animation of Collatz trajectories cascading to 1 with overlay comparison mode |
| **Collatz Cascade 2 — Generalized** | Extended Collatz to any modulus and operation — linear maps, powers, logs, polynomials, and more |
| **Projective-Cartesian Mapper** | Transform and visualize projective-to-Cartesian coordinate relationships |
| **ODEs and Special Functions** | Power series ODE special function pattern generator |
| **Math Dependency Tree** | Interactive atlas of mathematical structures — trace lineage across algebra, topology, geometry |
| **Graph HTML Scraper Visualizer** | Visualizes how a graph-based DOM scraper finds listing containers without XPath/CSS selectors |
| **Prime Compositions** | Every number as sums of equal parts — prime iff it can't be decomposed this way |
| **Sorting Algorithms Lab** | Multi-algorithm visualizer with sound and side-by-side chaos mode comparisons |
| **S&P 500 Market-Cap Rotation** | 25-year backtest of holding top market-cap stocks — watch the portfolio evolve as rankings change |
| **Comparing Calendars** | Deep-time calendar sync matrix across Gregorian, Hijri, Enochic, Maya, Egyptian, Hebrew, and Chinese calendars |

### Games (Solved Games Hub)

All games include mathematically optimal AI:

| Game | Method |
|------|--------|
| **Tic-Tac-Toe** | Minimax + Alpha-Beta pruning |
| **Connect Four** | Strongly solved — first player wins with perfect play |
| **Othello / Reversi** | Positional weights, mobility scoring, corner bonuses |
| **Checkers** | Alpha-Beta Minimax with mandatory captures, multi-jump chains, king promotion |
| **Mastermind** | Knuth's algorithm — ≤5 guesses for any 4-peg 6-color code |
| **Lights Out** | Gaussian elimination over GF(2) — minimum presses for any board (3×3 to 6×6) |
| **Minesweeper** | Constraint propagation + subset analysis with probabilistic fallback |
| **Nim** | Sprague-Grundy theorem — Nim-sum (XOR) to P-positions |
| **2048** | Expectimax AI with Snake heuristic — reliably reaches 2048+ |
| **Rummikub** | Dynamic programming set-cover solver — 1–4 players |
| **Blokus** | 4-player territory control with all 21 pieces and 8 transforms — greedy corner-expansion AI |
| **Path Connect Lab** | Flow-style puzzle on grid or rotatable cube with bounded graph solver |

### Bob's Tools

| App | Description |
|-----|-------------|
| **Landlord Optimization** | Calculate costs, expenses, and projections for property management |
| **Lot Tracker** | Video archive of lot activity over time |

---

## Tech Stack

- **Backend**: Flask (Python), Gunicorn
- **Frontend**: Vanilla HTML/CSS/JS, Chart.js, Three.js, vis-network
- **Data**: Reddit (PRAW), ArXiv, JPL Horizons, World Bank, IMF, Yahoo Finance, Google APIs
- **ML/Analysis**: PyTorch, YOLO, VADER sentiment, NLTK, astropy

## Structure

```
foreandr.github.io/
├── app.py          # Flask server (port 8001)
├── index.html      # Landing page
├── req.txt         # Python dependencies
└── apps/           # 30+ individual apps
```
