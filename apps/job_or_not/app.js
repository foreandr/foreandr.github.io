const JOBS = window.JOB_OR_NOT_JOBS || [];
const STORAGE_KEY = "jobOrNot.state.v1";
const INITIAL_ELO = 1000;
const K_FACTOR = 32;
const HISTORY_LIMIT = 2000;
const LEADERBOARD_LIMIT = 250;

let state = {
  ratings: {},
  totalVotes: 0,
  history: [],
  matchMode: "balanced",
};

let currentPair = [];

const els = {
  leftCard: document.getElementById("leftCard"),
  rightCard: document.getElementById("rightCard"),
  leftTitle: document.getElementById("leftTitle"),
  rightTitle: document.getElementById("rightTitle"),
  leftMeta: document.getElementById("leftMeta"),
  rightMeta: document.getElementById("rightMeta"),
  totalVotes: document.getElementById("totalVotes"),
  jobsRated: document.getElementById("jobsRated"),
  jobCount: document.getElementById("jobCount"),
  coverageLabel: document.getElementById("coverageLabel"),
  coverageBar: document.getElementById("coverageBar"),
  topElo: document.getElementById("topElo"),
  averageSeen: document.getElementById("averageSeen"),
  storageStatus: document.getElementById("storageStatus"),
  leaderboardBody: document.getElementById("leaderboardBody"),
  visibleRows: document.getElementById("visibleRows"),
  matchMode: document.getElementById("matchMode"),
  leaderboardMode: document.getElementById("leaderboardMode"),
  searchInput: document.getElementById("searchInput"),
  undoBtn: document.getElementById("undoBtn"),
  exportBtn: document.getElementById("exportBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

function defaultRating(job) {
  return {
    id: job.id,
    elo: INITIAL_ELO,
    seen: 0,
    wins: 0,
    losses: 0,
  };
}

function boot() {
  if (!JOBS.length) {
    document.body.innerHTML = "<main class=\"app-shell\"><h1>Job or Not</h1><p>Could not load jobs.js.</p></main>";
    return;
  }

  loadState();
  bindEvents();
  chooseNextPair();
  render();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.ratings) {
      state = { ...state, ...saved };
    }
    els.storageStatus.textContent = "Ready";
  } catch {
    els.storageStatus.textContent = "Recovered";
  }

  for (const job of JOBS) {
    if (!state.ratings[job.id]) {
      state.ratings[job.id] = defaultRating(job);
    }
  }

  els.matchMode.value = state.matchMode || "balanced";
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    els.storageStatus.textContent = "Saved";
  } catch {
    els.storageStatus.textContent = "Storage full";
  }
}

function bindEvents() {
  els.leftCard.addEventListener("click", () => vote("left"));
  els.rightCard.addEventListener("click", () => vote("right"));
  els.undoBtn.addEventListener("click", undo);
  els.exportBtn.addEventListener("click", exportRankings);
  els.resetBtn.addEventListener("click", resetAll);
  els.searchInput.addEventListener("input", renderLeaderboard);
  els.leaderboardMode.addEventListener("change", renderLeaderboard);
  els.matchMode.addEventListener("change", () => {
    state.matchMode = els.matchMode.value;
    saveState();
    chooseNextPair();
    render();
  });

  window.addEventListener("keydown", (event) => {
    if (event.target.matches("input, select, textarea")) return;
    if (event.key === "ArrowLeft") vote("left");
    if (event.key === "ArrowRight") vote("right");
  });
}

function rating(id) {
  return state.ratings[id];
}

function sampleRandom(excludeId = null) {
  let job = JOBS[Math.floor(Math.random() * JOBS.length)];
  while (job.id === excludeId) {
    job = JOBS[Math.floor(Math.random() * JOBS.length)];
  }
  return job;
}

function sampleUnderVoted(excludeId = null) {
  const poolBase = JOBS.filter((job) => job.id !== excludeId);
  const minSeen = Math.min(...poolBase.map((job) => rating(job.id).seen));
  const pool = poolBase.filter((job) => rating(job.id).seen <= minSeen + 2);
  return pool[Math.floor(Math.random() * pool.length)];
}

function sampleBalancedPair() {
  const first = sampleUnderVoted();
  const firstRating = rating(first.id);
  const candidates = JOBS
    .filter((job) => job.id !== first.id)
    .map((job) => {
      const candidateRating = rating(job.id);
      const eloDistance = Math.abs(candidateRating.elo - firstRating.elo);
      const underVotedBonus = Math.max(0, 80 - candidateRating.seen) * 9;
      const randomness = Math.random() * 80;
      return {
        job,
        score: 1200 - eloDistance + underVotedBonus + randomness,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 36);

  const second = candidates[Math.floor(Math.random() * candidates.length)].job;
  return Math.random() < 0.5 ? [first, second] : [second, first];
}

function chooseNextPair() {
  if (els.matchMode.value === "random") {
    const left = sampleRandom();
    currentPair = [left, sampleRandom(left.id)];
    return;
  }

  if (els.matchMode.value === "underVoted") {
    const left = sampleUnderVoted();
    currentPair = [left, sampleUnderVoted(left.id)];
    return;
  }

  currentPair = sampleBalancedPair();
}

function vote(side) {
  if (currentPair.length !== 2) return;

  const [left, right] = currentPair;
  const winner = side === "left" ? left : right;
  const loser = side === "left" ? right : left;
  applyVote(winner.id, loser.id);
  chooseNextPair();
  render();
}

function expected(a, b) {
  return 1 / (1 + Math.pow(10, (b.elo - a.elo) / 400));
}

function applyVote(winnerId, loserId) {
  const winner = rating(winnerId);
  const loser = rating(loserId);
  const snapshot = {
    winnerId,
    loserId,
    winner: { ...winner },
    loser: { ...loser },
  };

  const winnerExpected = expected(winner, loser);
  const loserExpected = expected(loser, winner);

  winner.elo = Math.round(winner.elo + K_FACTOR * (1 - winnerExpected));
  loser.elo = Math.round(loser.elo + K_FACTOR * (0 - loserExpected));
  winner.seen += 1;
  loser.seen += 1;
  winner.wins += 1;
  loser.losses += 1;
  state.totalVotes += 1;
  state.history.push(snapshot);

  if (state.history.length > HISTORY_LIMIT) {
    state.history.shift();
  }

  saveState();
}

function undo() {
  const last = state.history.pop();
  if (!last) return;

  state.ratings[last.winnerId] = last.winner;
  state.ratings[last.loserId] = last.loser;
  state.totalVotes = Math.max(0, state.totalVotes - 1);
  saveState();
  render();
}

function resetAll() {
  if (!confirm("Reset every rating, vote count, and leaderboard result?")) return;
  state = {
    ratings: {},
    totalVotes: 0,
    history: [],
    matchMode: els.matchMode.value,
  };
  for (const job of JOBS) {
    state.ratings[job.id] = defaultRating(job);
  }
  saveState();
  chooseNextPair();
  render();
}

function rankedJobs() {
  return JOBS
    .map((job) => ({ job, ...rating(job.id) }))
    .sort((a, b) => b.elo - a.elo || b.seen - a.seen || a.job.title.localeCompare(b.job.title));
}

function render() {
  renderPair();
  renderStats();
  renderLeaderboard();
}

function renderPair() {
  const [left, right] = currentPair;
  els.leftTitle.textContent = left.title;
  els.rightTitle.textContent = right.title;
  els.leftMeta.textContent = `${left.category} | Elo ${rating(left.id).elo} | Seen ${rating(left.id).seen}`;
  els.rightMeta.textContent = `${right.category} | Elo ${rating(right.id).elo} | Seen ${rating(right.id).seen}`;
}

function renderStats() {
  const ratings = Object.values(state.ratings);
  const ratedCount = ratings.filter((item) => item.seen > 0).length;
  const top = ratings.reduce((best, item) => Math.max(best, item.elo), INITIAL_ELO);
  const seenTotal = ratings.reduce((sum, item) => sum + item.seen, 0);
  const coverage = Math.round((ratedCount / JOBS.length) * 100);

  els.totalVotes.textContent = state.totalVotes.toLocaleString();
  els.jobsRated.textContent = ratedCount.toLocaleString();
  els.jobCount.textContent = JOBS.length.toLocaleString();
  els.coverageLabel.textContent = `${coverage}%`;
  els.coverageBar.style.width = `${coverage}%`;
  els.topElo.textContent = top.toLocaleString();
  els.averageSeen.textContent = (seenTotal / JOBS.length).toFixed(1);
}

function renderLeaderboard() {
  const query = els.searchInput.value.trim().toLowerCase();
  const mode = els.leaderboardMode.value;
  const rows = rankedJobs().filter((item) => {
    if (mode === "rated" && item.seen === 0) return false;
    if (mode === "unrated" && item.seen > 0) return false;
    if (!query) return true;
    const haystack = `${item.job.title} ${item.job.category} ${item.job.subcategory} ${item.job.keywords}`.toLowerCase();
    return haystack.includes(query);
  });

  els.visibleRows.textContent = `${rows.length.toLocaleString()} shown`;
  els.leaderboardBody.innerHTML = "";

  rows.slice(0, LEADERBOARD_LIMIT).forEach((item, index) => {
    const row = document.createElement("tr");
    const winRate = item.seen ? `${Math.round((item.wins / item.seen) * 100)}%` : "-";
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(item.job.title)}</td>
      <td>${escapeHtml(item.job.category)}</td>
      <td>${item.elo}</td>
      <td>${item.seen}</td>
      <td>${item.wins}</td>
      <td>${item.losses}</td>
      <td>${winRate}</td>
    `;
    els.leaderboardBody.appendChild(row);
  });
}

function exportRankings() {
  const header = ["rank", "id", "title", "category", "subcategory", "elo", "seen", "wins", "losses", "win_pct"];
  const lines = [header.join(",")];

  rankedJobs().forEach((item, index) => {
    const winPct = item.seen ? (item.wins / item.seen).toFixed(4) : "";
    lines.push([
      index + 1,
      item.job.id,
      item.job.title,
      item.job.category,
      item.job.subcategory,
      item.elo,
      item.seen,
      item.wins,
      item.losses,
      winPct,
    ].map(csvEscape).join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "job_or_not_rankings.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

boot();
