const algoDefs = [
  { id: "bubble", name: "Bubble Sort", maxSize: 200, fn: bubbleSort },
  { id: "cocktail", name: "Cocktail Shaker Sort", maxSize: 200, fn: cocktailSort },
  { id: "insertion", name: "Insertion Sort", maxSize: 200, fn: insertionSort },
  { id: "binary_insertion", name: "Binary Insertion Sort", maxSize: 200, fn: binaryInsertionSort },
  { id: "selection", name: "Selection Sort", maxSize: 200, fn: selectionSort },
  { id: "double_selection", name: "Double Selection Sort", maxSize: 200, fn: doubleSelectionSort },
  { id: "shell", name: "Shell Sort", maxSize: 200, fn: shellSort },
  { id: "comb", name: "Comb Sort", maxSize: 200, fn: combSort },
  { id: "odd_even", name: "Odd-Even Sort", maxSize: 200, fn: oddEvenSort },
  { id: "gnome", name: "Gnome Sort", maxSize: 160, fn: gnomeSort },
  { id: "heap", name: "Heap Sort", maxSize: 200, fn: heapSort },
  { id: "quick", name: "Quick Sort", maxSize: 200, fn: quickSort },
  { id: "quick3", name: "Quick Sort (3-Way)", maxSize: 200, fn: quickSort3Way },
  { id: "merge", name: "Merge Sort", maxSize: 200, fn: mergeSort },
  { id: "timsort", name: "Tim Sort", maxSize: 200, fn: timSort },
  { id: "radix", name: "Radix Sort", maxSize: 200, fn: radixSort },
  { id: "counting", name: "Counting Sort", maxSize: 200, fn: countingSort },
  { id: "pigeonhole", name: "Pigeonhole Sort", maxSize: 200, fn: pigeonholeSort },
  { id: "bucket", name: "Bucket Sort", maxSize: 200, fn: bucketSort },
  { id: "bead", name: "Gravity (Bead) Sort", maxSize: 120, fn: beadSort },
  { id: "cycle", name: "Cycle Sort", maxSize: 160, fn: cycleSort },
  { id: "pancake", name: "Pancake Sort", maxSize: 160, fn: pancakeSort },
  { id: "strand", name: "Strand Sort", maxSize: 140, fn: strandSort },
  { id: "bitonic", name: "Bitonic Sort", maxSize: 128, fn: bitonicSort },
  { id: "stooge", name: "Stooge Sort", maxSize: 18, fn: stoogeSort },
  { id: "sleep", name: "Sleep Sort", maxSize: 80, fn: sleepSort },
  { id: "bozo", name: "Bozo Sort", maxSize: 12, fn: bozoSort },
  { id: "bogo", name: "Bogo Sort", maxSize: 10, fn: bogoSort },
  { id: "stalin", name: "Stalin Sort", maxSize: 160, fn: stalinSort },
  { id: "thanos", name: "Thanos Sort", maxSize: 64, fn: thanosSort }
];

const defaultSelection = new Set(["bubble", "cocktail", "insertion", "selection", "quick", "heap", "counting", "bogo", "thanos"]);

const state = {
  baseArray: [],
  seed: 42,
  running: false,
  paused: false,
  runners: []
};

const dom = {
  sizeRange: document.getElementById("sizeRange"),
  sizeValue: document.getElementById("sizeValue"),
  speedRange: document.getElementById("speedRange"),
  speedValue: document.getElementById("speedValue"),
  soundToggle: document.getElementById("soundToggle"),
  volumeRange: document.getElementById("volumeRange"),
  volumeValue: document.getElementById("volumeValue"),
  algoList: document.getElementById("algoList"),
  selectAllBtn: document.getElementById("selectAllBtn"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  runBtn: document.getElementById("runBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  grid: document.getElementById("grid"),
  seedLabel: document.getElementById("seedLabel"),
  statusLabel: document.getElementById("statusLabel"),
  runningLabel: document.getElementById("runningLabel")
};

let audioCtx = null;
let globalLastTone = 0;

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(value, maxValue, volume) {
  if (!audioCtx || !dom.soundToggle.checked) return;
  const now = audioCtx.currentTime;
  if (now - globalLastTone < 0.01) return;
  globalLastTone = now;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const freq = 220 + (value / maxValue) * 880;
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = Math.max(0.0001, volume / 100);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(now + 0.05);
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildArray(size, seed) {
  const rng = mulberry32(seed);
  const arr = Array.from({ length: size }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateBaseArray() {
  state.baseArray = buildArray(Number(dom.sizeRange.value), state.seed);
}

function updateLabels() {
  dom.sizeValue.textContent = dom.sizeRange.value;
  dom.speedValue.textContent = dom.speedRange.value;
  dom.volumeValue.textContent = dom.volumeRange.value;
  dom.seedLabel.textContent = `Seed: ${state.seed}`;
}

function isSorted(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1] > arr[i]) return false;
  }
  return true;
}

class AlgoRunner {
  constructor(def, baseArray, opts) {
    this.def = def;
    this.array = baseArray.slice();
    this.canvas = opts.canvas;
    this.ctx = this.canvas.getContext("2d");
    this.statusEl = opts.statusEl;
    this.timeEl = opts.timeEl;
    this.stepsEl = opts.stepsEl;
    this.sizeEl = opts.sizeEl;
    this.tagEl = opts.tagEl;
    this.maxValue = Math.max(...this.array, 1);
    this.gen = def.fn(this.array, opts.rng);
    this.steps = 0;
    this.compares = 0;
    this.swaps = 0;
    this.writes = 0;
    this.removed = 0;
    this.done = false;
    this.error = null;
    this.paused = false;
    this.startTime = null;
    this.elapsed = 0;
    this.highlight = null;
    this.sleepUntil = 0;
    this.sizeEl.textContent = `n=${this.array.length}`;
  }

  start() {
    this.startTime = performance.now();
    this.setTag("running");
  }

  setTag(state) {
    this.tagEl.classList.remove("running", "done", "error");
    if (state === "running") {
      this.tagEl.textContent = "Running";
      this.tagEl.classList.add("running");
    } else if (state === "done") {
      this.tagEl.textContent = "Done";
      this.tagEl.classList.add("done");
    } else if (state === "error") {
      this.tagEl.textContent = "Stopped";
      this.tagEl.classList.add("error");
    } else {
      this.tagEl.textContent = "Idle";
    }
  }

  step(maxOps, now) {
    if (this.done || this.paused) return;
    if (this.sleepUntil > now) return;

    if (!this.startTime) this.start();

    let ops = 0;
    while (ops < maxOps) {
      const result = this.gen.next();
      if (result.done) {
        this.done = true;
        this.elapsed = performance.now() - this.startTime;
        this.setTag("done");
        break;
      }
      const op = result.value;
      if (!op) continue;
      if (op.type === "compare") {
        this.compares++;
        this.highlight = { i: op.i, j: op.j };
      } else if (op.type === "swap") {
        const { i, j } = op;
        this.swaps++;
        this.highlight = { i, j };
        playTone(Math.max(this.array[i], this.array[j]), this.maxValue, Number(dom.volumeRange.value));
      } else if (op.type === "set") {
        this.writes++;
        this.highlight = { i: op.index };
        playTone(op.value, this.maxValue, Number(dom.volumeRange.value));
      } else if (op.type === "remove") {
        this.removed += op.indices.length;
        this.highlight = null;
        this.maxValue = Math.max(...this.array, 1);
        this.sizeEl.textContent = `n=${this.array.length}`;
      } else if (op.type === "shuffle") {
        this.highlight = null;
      } else if (op.type === "sleep") {
        this.sleepUntil = now + op.ms;
        break;
      }
      this.steps++;
      ops++;
    }
  }

  draw() {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * ratio;
    this.canvas.height = rect.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const len = this.array.length;
    if (!len) return;
    const barWidth = rect.width / len;
    for (let i = 0; i < len; i++) {
      const value = this.array[i] ?? 0;
      const height = (value / this.maxValue) * (rect.height - 10);
      const hue = 210 - (value / this.maxValue) * 180;
      const isHighlight = this.highlight && (this.highlight.i === i || this.highlight.j === i);
      ctx.fillStyle = isHighlight ? "#ffd76a" : `hsl(${hue}, 80%, 60%)`;
      ctx.fillRect(i * barWidth + 1, rect.height - height, barWidth - 2, height);
    }

    if (this.startTime) {
      const now = this.done ? this.startTime + this.elapsed : performance.now();
      const elapsed = (now - this.startTime) / 1000;
      this.timeEl.textContent = `${elapsed.toFixed(2)}s`;
    } else {
      this.timeEl.textContent = "0.00s";
    }

    this.stepsEl.textContent = `${this.steps} ops`;
  }
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildAlgoList() {
  dom.algoList.innerHTML = "";
  algoDefs.forEach((algo) => {
    const label = document.createElement("label");
    label.dataset.id = algo.id;
    const nameSpan = document.createElement("span");
    nameSpan.textContent = algo.name;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = defaultSelection.has(algo.id);
    checkbox.addEventListener("change", () => {
      label.classList.toggle("active", checkbox.checked);
    });
    label.classList.toggle("active", checkbox.checked);
    label.appendChild(nameSpan);
    label.appendChild(checkbox);
    dom.algoList.appendChild(label);
  });
}

function getSelectedAlgos() {
  return Array.from(dom.algoList.querySelectorAll("label"))
    .filter((label) => label.querySelector("input").checked)
    .map((label) => label.dataset.id);
}

function createCard(def, size, seed) {
  const card = document.createElement("div");
  card.className = "algo-card";
  const header = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = def.name;
  const sizeEl = document.createElement("small");
  header.appendChild(title);
  header.appendChild(sizeEl);

  const canvas = document.createElement("canvas");
  const statusRow = document.createElement("div");
  statusRow.className = "status-row";
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = "Idle";
  const timeEl = document.createElement("span");
  timeEl.textContent = "0.00s";
  statusRow.appendChild(tag);
  statusRow.appendChild(timeEl);

  const footer = document.createElement("div");
  footer.className = "status-row";
  const stepsEl = document.createElement("span");
  stepsEl.textContent = "0 ops";
  const noteEl = document.createElement("span");
  noteEl.textContent = def.maxSize < size ? `size capped @ ${def.maxSize}` : "ready";
  footer.appendChild(stepsEl);
  footer.appendChild(noteEl);

  card.appendChild(header);
  card.appendChild(canvas);
  card.appendChild(statusRow);
  card.appendChild(footer);

  return { card, canvas, statusEl: noteEl, timeEl, stepsEl, sizeEl, tagEl: tag };
}

function buildRunners() {
  dom.grid.innerHTML = "";
  state.runners = [];
  const selected = getSelectedAlgos();
  const size = Number(dom.sizeRange.value);
  selected.forEach((id, idx) => {
    const def = algoDefs.find((algo) => algo.id === id);
    if (!def) return;
    const cardBits = createCard(def, size, state.seed + idx);
    dom.grid.appendChild(cardBits.card);

    const capSize = Math.min(size, def.maxSize);
    const base = state.baseArray.slice(0, capSize);
    const runner = new AlgoRunner(def, base, {
      canvas: cardBits.canvas,
      statusEl: cardBits.statusEl,
      timeEl: cardBits.timeEl,
      stepsEl: cardBits.stepsEl,
      sizeEl: cardBits.sizeEl,
      tagEl: cardBits.tagEl,
      rng: mulberry32(state.seed + idx)
    });
    state.runners.push(runner);
  });
  dom.runningLabel.textContent = `${state.runners.length} running`;
}

function shuffleAll() {
  state.seed = Math.floor(Math.random() * 100000);
  updateBaseArray();
  updateLabels();
  buildRunners();
  drawAll();
}

function resetAll() {
  state.running = false;
  state.paused = false;
  dom.pauseBtn.textContent = "Pause";
  dom.statusLabel.textContent = "Idle";
  buildRunners();
  drawAll();
}

function runAll() {
  buildRunners();
  if (!state.runners.length) return;
  ensureAudioContext();
  state.running = true;
  state.paused = false;
  dom.pauseBtn.textContent = "Pause";
  dom.statusLabel.textContent = "Running";
  animate();
}

function pauseAll() {
  state.paused = !state.paused;
  state.runners.forEach((runner) => (runner.paused = state.paused));
  dom.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
  dom.statusLabel.textContent = state.paused ? "Paused" : "Running";
}

function animate() {
  if (!state.running) return;
  const opsPerFrame = Number(dom.speedRange.value);
  const now = performance.now();
  let runningCount = 0;
  state.runners.forEach((runner) => {
    if (!runner.done) {
      runner.step(opsPerFrame, now);
      runningCount++;
    }
    runner.draw();
  });
  dom.runningLabel.textContent = `${runningCount} running`;
  if (runningCount === 0) {
    state.running = false;
    dom.statusLabel.textContent = "All done";
    return;
  }
  requestAnimationFrame(animate);
}

function drawAll() {
  state.runners.forEach((runner) => runner.draw());
}

function attachEvents() {
  dom.sizeRange.addEventListener("input", () => {
    updateLabels();
  });
  dom.sizeRange.addEventListener("change", () => {
    updateBaseArray();
    buildRunners();
    drawAll();
  });
  dom.speedRange.addEventListener("input", () => updateLabels());
  dom.volumeRange.addEventListener("input", () => updateLabels());

  dom.selectAllBtn.addEventListener("click", () => {
    dom.algoList.querySelectorAll("label").forEach((label) => {
      const input = label.querySelector("input");
      input.checked = true;
      label.classList.add("active");
    });
  });

  dom.clearAllBtn.addEventListener("click", () => {
    dom.algoList.querySelectorAll("label").forEach((label) => {
      const input = label.querySelector("input");
      input.checked = false;
      label.classList.remove("active");
    });
  });

  dom.shuffleBtn.addEventListener("click", () => shuffleAll());
  dom.resetBtn.addEventListener("click", () => resetAll());
  dom.runBtn.addEventListener("click", () => runAll());
  dom.pauseBtn.addEventListener("click", () => pauseAll());

  dom.soundToggle.addEventListener("change", () => {
    if (dom.soundToggle.checked) ensureAudioContext();
  });
}

function init() {
  updateLabels();
  updateBaseArray();
  buildAlgoList();
  buildRunners();
  drawAll();
  attachEvents();
}

// ------------------ Sorting Algorithms ------------------

function* bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      yield { type: "compare", i: j, j: j + 1 };
      if (arr[j] > arr[j + 1]) {
        yield { type: "swap", i: j, j: j + 1 };
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
}

function* cocktailSort(arr) {
  let start = 0;
  let end = arr.length - 1;
  let swapped = true;
  while (swapped) {
    swapped = false;
    for (let i = start; i < end; i++) {
      yield { type: "compare", i: i, j: i + 1 };
      if (arr[i] > arr[i + 1]) {
        yield { type: "swap", i: i, j: i + 1 };
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        swapped = true;
      }
    }
    if (!swapped) break;
    swapped = false;
    end--;
    for (let i = end; i > start; i--) {
      yield { type: "compare", i: i - 1, j: i };
      if (arr[i - 1] > arr[i]) {
        yield { type: "swap", i: i - 1, j: i };
        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
        swapped = true;
      }
    }
    start++;
  }
}

function* insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    let key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      yield { type: "compare", i: j, j: i };
      arr[j + 1] = arr[j];
      yield { type: "set", index: j + 1, value: arr[j + 1] };
      j--;
    }
    arr[j + 1] = key;
    yield { type: "set", index: j + 1, value: key };
  }
}

function* selectionSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    let minIdx = i;
    for (let j = i + 1; j < arr.length; j++) {
      yield { type: "compare", i: minIdx, j };
      if (arr[j] < arr[minIdx]) {
        minIdx = j;
      }
    }
    if (minIdx !== i) {
      yield { type: "swap", i, j: minIdx };
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
    }
  }
}

function* shellSort(arr) {
  let n = arr.length;
  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < n; i++) {
      let temp = arr[i];
      let j = i;
      while (j >= gap && arr[j - gap] > temp) {
        yield { type: "compare", i: j - gap, j };
        arr[j] = arr[j - gap];
        yield { type: "set", index: j, value: arr[j] };
        j -= gap;
      }
      arr[j] = temp;
      yield { type: "set", index: j, value: temp };
    }
  }
}

function* heapSort(arr) {
  let n = arr.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(arr, n, i);
  }
  for (let i = n - 1; i > 0; i--) {
    yield { type: "swap", i: 0, j: i };
    [arr[0], arr[i]] = [arr[i], arr[0]];
    yield* heapify(arr, i, 0);
  }
}

function* heapify(arr, n, i) {
  let largest = i;
  const left = 2 * i + 1;
  const right = 2 * i + 2;

  if (left < n) {
    yield { type: "compare", i: left, j: largest };
    if (arr[left] > arr[largest]) largest = left;
  }
  if (right < n) {
    yield { type: "compare", i: right, j: largest };
    if (arr[right] > arr[largest]) largest = right;
  }
  if (largest !== i) {
    yield { type: "swap", i, j: largest };
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    yield* heapify(arr, n, largest);
  }
}

function* quickSort(arr) {
  const stack = [{ low: 0, high: arr.length - 1 }];
  while (stack.length) {
    const { low, high } = stack.pop();
    if (low >= high) continue;
    const pivotIndex = yield* partition(arr, low, high);
    stack.push({ low, high: pivotIndex - 1 });
    stack.push({ low: pivotIndex + 1, high });
  }
}

function* partition(arr, low, high) {
  const pivot = arr[high];
  let i = low;
  for (let j = low; j < high; j++) {
    yield { type: "compare", i: j, j: high };
    if (arr[j] < pivot) {
      if (i !== j) {
        yield { type: "swap", i, j };
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      i++;
    }
  }
  yield { type: "swap", i, j: high };
  [arr[i], arr[high]] = [arr[high], arr[i]];
  return i;
}

function* mergeSort(arr) {
  const aux = arr.slice();
  yield* mergeSortRange(arr, aux, 0, arr.length - 1);
}

function* mergeSortRange(arr, aux, low, high) {
  if (low >= high) return;
  const mid = Math.floor((low + high) / 2);
  yield* mergeSortRange(arr, aux, low, mid);
  yield* mergeSortRange(arr, aux, mid + 1, high);
  let i = low;
  let j = mid + 1;
  let k = low;
  while (i <= mid && j <= high) {
    yield { type: "compare", i, j };
    if (arr[i] <= arr[j]) {
      aux[k++] = arr[i++];
    } else {
      aux[k++] = arr[j++];
    }
  }
  while (i <= mid) aux[k++] = arr[i++];
  while (j <= high) aux[k++] = arr[j++];
  for (let idx = low; idx <= high; idx++) {
    arr[idx] = aux[idx];
    yield { type: "set", index: idx, value: arr[idx] };
  }
}

function* gnomeSort(arr) {
  let i = 0;
  while (i < arr.length) {
    if (i === 0) {
      i++;
    } else {
      yield { type: "compare", i: i - 1, j: i };
      if (arr[i] >= arr[i - 1]) {
        i++;
      } else {
        yield { type: "swap", i, j: i - 1 };
        [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
        i--;
      }
    }
  }
}

function* countingSort(arr) {
  const max = Math.max(...arr, 0);
  const count = Array(max + 1).fill(0);
  for (let i = 0; i < arr.length; i++) {
    count[arr[i]]++;
  }
  let idx = 0;
  for (let value = 1; value <= max; value++) {
    while (count[value] > 0) {
      arr[idx] = value;
      yield { type: "set", index: idx, value };
      idx++;
      count[value]--;
    }
  }
}

function* bucketSort(arr) {
  const max = Math.max(...arr, 0);
  const bucketCount = Math.max(1, Math.floor(Math.sqrt(arr.length)));
  const buckets = Array.from({ length: bucketCount }, () => []);
  for (let value of arr) {
    const idx = Math.min(bucketCount - 1, Math.floor((value / max) * bucketCount));
    buckets[idx].push(value);
  }
  let out = 0;
  for (let bucket of buckets) {
    bucket.sort((a, b) => a - b);
    for (let value of bucket) {
      arr[out] = value;
      yield { type: "set", index: out, value };
      out++;
    }
  }
}

function* sleepSort(arr, rng) {
  const ordered = [...arr].sort((a, b) => a - b);
  const baseDelay = 8;
  for (let i = 0; i < ordered.length; i++) {
    const value = ordered[i];
    const jitter = rng ? rng() * 6 : Math.random() * 6;
    yield { type: "sleep", ms: baseDelay * value + jitter };
    arr[i] = value;
    yield { type: "set", index: i, value };
  }
}

function* bogoSort(arr, rng) {
  const maxAttempts = 5000;
  let attempts = 0;
  while (!isSorted(arr) && attempts < maxAttempts) {
    shuffleInPlace(arr, rng || Math.random);
    yield { type: "shuffle" };
    attempts++;
  }
}

function* stalinSort(arr) {
  if (arr.length === 0) return;
  let last = arr[0];
  let i = 1;
  while (i < arr.length) {
    yield { type: "compare", i: i - 1, j: i };
    if (arr[i] < last) {
      arr.splice(i, 1);
      yield { type: "remove", indices: [i] };
    } else {
      last = arr[i];
      i++;
    }
  }
}

function* thanosSort(arr, rng) {
  let guard = 0;
  while (!isSorted(arr) && arr.length > 1 && guard < 12) {
    const removeCount = Math.floor(arr.length / 2);
    const indices = new Set();
    while (indices.size < removeCount) {
      indices.add(Math.floor((rng ? rng() : Math.random()) * arr.length));
    }
    const toRemove = Array.from(indices);
    const kept = arr.filter((_, idx) => !indices.has(idx));
    arr.length = 0;
    arr.push(...kept);
    yield { type: "remove", indices: toRemove };
    yield { type: "sleep", ms: 220 };
    guard++;
  }
}


function* binaryInsertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i];
    let left = 0;
    let right = i - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      yield { type: "compare", i: mid, j: i };
      if (arr[mid] > key) right = mid - 1;
      else left = mid + 1;
    }
    for (let j = i - 1; j >= left; j--) {
      arr[j + 1] = arr[j];
      yield { type: "set", index: j + 1, value: arr[j + 1] };
    }
    arr[left] = key;
    yield { type: "set", index: left, value: key };
  }
}

function* doubleSelectionSort(arr) {
  let left = 0;
  let right = arr.length - 1;
  while (left < right) {
    let minIdx = left;
    let maxIdx = left;
    for (let i = left; i <= right; i++) {
      yield { type: "compare", i: minIdx, j: i };
      if (arr[i] < arr[minIdx]) minIdx = i;
      yield { type: "compare", i: maxIdx, j: i };
      if (arr[i] > arr[maxIdx]) maxIdx = i;
    }
    if (minIdx !== left) {
      yield { type: "swap", i: left, j: minIdx };
      [arr[left], arr[minIdx]] = [arr[minIdx], arr[left]];
      if (maxIdx === left) maxIdx = minIdx;
    }
    if (maxIdx !== right) {
      yield { type: "swap", i: right, j: maxIdx };
      [arr[right], arr[maxIdx]] = [arr[maxIdx], arr[right]];
    }
    left++;
    right--;
  }
}

function* combSort(arr) {
  let gap = arr.length;
  const shrink = 1.3;
  let swapped = true;
  while (gap > 1 || swapped) {
    gap = Math.floor(gap / shrink) || 1;
    swapped = false;
    for (let i = 0; i + gap < arr.length; i++) {
      yield { type: "compare", i, j: i + gap };
      if (arr[i] > arr[i + gap]) {
        yield { type: "swap", i, j: i + gap };
        [arr[i], arr[i + gap]] = [arr[i + gap], arr[i]];
        swapped = true;
      }
    }
  }
}

function* oddEvenSort(arr) {
  let sorted = false;
  while (!sorted) {
    sorted = true;
    for (let i = 1; i < arr.length - 1; i += 2) {
      yield { type: "compare", i, j: i + 1 };
      if (arr[i] > arr[i + 1]) {
        yield { type: "swap", i, j: i + 1 };
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        sorted = false;
      }
    }
    for (let i = 0; i < arr.length - 1; i += 2) {
      yield { type: "compare", i, j: i + 1 };
      if (arr[i] > arr[i + 1]) {
        yield { type: "swap", i, j: i + 1 };
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        sorted = false;
      }
    }
  }
}

function* quickSort3Way(arr) {
  const stack = [{ low: 0, high: arr.length - 1 }];
  while (stack.length) {
    const { low, high } = stack.pop();
    if (low >= high) continue;
    let lt = low;
    let gt = high;
    const pivot = arr[low];
    let i = low + 1;
    while (i <= gt) {
      yield { type: "compare", i, j: lt };
      if (arr[i] < pivot) {
        yield { type: "swap", i, j: lt };
        [arr[i], arr[lt]] = [arr[lt], arr[i]];
        i++;
        lt++;
      } else if (arr[i] > pivot) {
        yield { type: "swap", i, j: gt };
        [arr[i], arr[gt]] = [arr[gt], arr[i]];
        gt--;
      } else {
        i++;
      }
    }
    stack.push({ low, high: lt - 1 });
    stack.push({ low: gt + 1, high });
  }
}

function* timSort(arr) {
  const n = arr.length;
  const minRun = 32;
  for (let start = 0; start < n; start += minRun) {
    let end = Math.min(start + minRun - 1, n - 1);
    yield* insertionSortRange(arr, start, end);
  }
  for (let size = minRun; size < n; size *= 2) {
    for (let left = 0; left < n; left += 2 * size) {
      const mid = Math.min(left + size - 1, n - 1);
      const right = Math.min(left + 2 * size - 1, n - 1);
      if (mid < right) {
        yield* mergeRanges(arr, left, mid, right);
      }
    }
  }
}

function* insertionSortRange(arr, left, right) {
  for (let i = left + 1; i <= right; i++) {
    let key = arr[i];
    let j = i - 1;
    while (j >= left && arr[j] > key) {
      yield { type: "compare", i: j, j: i };
      arr[j + 1] = arr[j];
      yield { type: "set", index: j + 1, value: arr[j + 1] };
      j--;
    }
    arr[j + 1] = key;
    yield { type: "set", index: j + 1, value: key };
  }
}

function* mergeRanges(arr, left, mid, right) {
  const leftArr = arr.slice(left, mid + 1);
  const rightArr = arr.slice(mid + 1, right + 1);
  let i = 0;
  let j = 0;
  let k = left;
  while (i < leftArr.length && j < rightArr.length) {
    yield { type: "compare", i: left + i, j: mid + 1 + j };
    if (leftArr[i] <= rightArr[j]) {
      arr[k] = leftArr[i++];
    } else {
      arr[k] = rightArr[j++];
    }
    yield { type: "set", index: k, value: arr[k] };
    k++;
  }
  while (i < leftArr.length) {
    arr[k] = leftArr[i++];
    yield { type: "set", index: k, value: arr[k] };
    k++;
  }
  while (j < rightArr.length) {
    arr[k] = rightArr[j++];
    yield { type: "set", index: k, value: arr[k] };
    k++;
  }
}

function* radixSort(arr) {
  const max = Math.max(...arr, 0);
  let exp = 1;
  const base = 10;
  while (Math.floor(max / exp) > 0) {
    const output = Array(arr.length).fill(0);
    const count = Array(base).fill(0);
    for (let i = 0; i < arr.length; i++) {
      const index = Math.floor(arr[i] / exp) % base;
      count[index]++;
    }
    for (let i = 1; i < base; i++) count[i] += count[i - 1];
    for (let i = arr.length - 1; i >= 0; i--) {
      const index = Math.floor(arr[i] / exp) % base;
      output[count[index] - 1] = arr[i];
      count[index]--;
    }
    for (let i = 0; i < arr.length; i++) {
      arr[i] = output[i];
      yield { type: "set", index: i, value: arr[i] };
    }
    exp *= base;
  }
}

function* pigeonholeSort(arr) {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const size = max - min + 1;
  const holes = Array(size).fill(0);
  for (let i = 0; i < arr.length; i++) {
    holes[arr[i] - min]++;
  }
  let idx = 0;
  for (let i = 0; i < size; i++) {
    while (holes[i]-- > 0) {
      arr[idx] = i + min;
      yield { type: "set", index: idx, value: arr[idx] };
      idx++;
    }
  }
}

function* beadSort(arr) {
  const max = Math.max(...arr, 0);
  const rows = max;
  const cols = arr.length;
  const beads = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < arr[i]; j++) beads[j][i] = 1;
  }
  for (let j = 0; j < rows; j++) {
    let count = 0;
    for (let i = 0; i < cols; i++) {
      count += beads[j][i];
      beads[j][i] = 0;
    }
    for (let i = cols - count; i < cols; i++) beads[j][i] = 1;
  }
  for (let i = 0; i < cols; i++) {
    let sum = 0;
    for (let j = 0; j < rows; j++) sum += beads[j][i];
    arr[i] = sum;
    yield { type: "set", index: i, value: arr[i] };
  }
}

function* cycleSort(arr) {
  const n = arr.length;
  for (let cycleStart = 0; cycleStart <= n - 2; cycleStart++) {
    let item = arr[cycleStart];
    let pos = cycleStart;
    for (let i = cycleStart + 1; i < n; i++) {
      yield { type: "compare", i, j: cycleStart };
      if (arr[i] < item) pos++;
    }
    if (pos === cycleStart) continue;
    while (item === arr[pos]) pos++;
    if (pos !== cycleStart) {
      [arr[pos], item] = [item, arr[pos]];
      yield { type: "set", index: pos, value: arr[pos] };
    }
    while (pos !== cycleStart) {
      pos = cycleStart;
      for (let i = cycleStart + 1; i < n; i++) {
        yield { type: "compare", i, j: cycleStart };
        if (arr[i] < item) pos++;
      }
      while (item === arr[pos]) pos++;
      if (item !== arr[pos]) {
        [arr[pos], item] = [item, arr[pos]];
        yield { type: "set", index: pos, value: arr[pos] };
      }
    }
  }
}

function* pancakeSort(arr) {
  for (let curr = arr.length; curr > 1; curr--) {
    let maxIdx = 0;
    for (let i = 1; i < curr; i++) {
      yield { type: "compare", i: maxIdx, j: i };
      if (arr[i] > arr[maxIdx]) maxIdx = i;
    }
    if (maxIdx === curr - 1) continue;
    yield* flip(arr, maxIdx);
    yield* flip(arr, curr - 1);
  }
}

function* flip(arr, end) {
  let start = 0;
  while (start < end) {
    yield { type: "swap", i: start, j: end };
    [arr[start], arr[end]] = [arr[end], arr[start]];
    start++;
    end--;
  }
}

function* strandSort(arr) {
  let input = arr.slice();
  let output = [];
  while (input.length) {
    let strand = [input.shift()];
    for (let i = 0; i < input.length; ) {
      if (input[i] >= strand[strand.length - 1]) {
        strand.push(input.splice(i, 1)[0]);
      } else {
        i++;
      }
    }
    output = mergeArrays(output, strand);
  }
  for (let i = 0; i < output.length; i++) {
    arr[i] = output[i];
    yield { type: "set", index: i, value: arr[i] };
  }
}

function mergeArrays(a, b) {
  const res = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) res.push(a[i++]);
    else res.push(b[j++]);
  }
  while (i < a.length) res.push(a[i++]);
  while (j < b.length) res.push(b[j++]);
  return res;
}

function* bitonicSort(arr) {
  const original = arr.length;
  let n = 1;
  while (n < arr.length) n <<= 1;
  const max = Math.max(...arr, 0) + 1;
  while (arr.length < n) arr.push(max);

  yield* bitonicSortRange(arr, 0, n, true);

  while (arr.length > original) {
    arr.pop();
    yield { type: "remove", indices: [arr.length] };
  }
}

function* bitonicSortRange(arr, low, cnt, dir) {
  if (cnt > 1) {
    const k = Math.floor(cnt / 2);
    yield* bitonicSortRange(arr, low, k, true);
    yield* bitonicSortRange(arr, low + k, k, false);
    yield* bitonicMerge(arr, low, cnt, dir);
  }
}

function* bitonicMerge(arr, low, cnt, dir) {
  if (cnt > 1) {
    const k = Math.floor(cnt / 2);
    for (let i = low; i < low + k; i++) {
      yield { type: "compare", i, j: i + k };
      const shouldSwap = dir ? arr[i] > arr[i + k] : arr[i] < arr[i + k];
      if (shouldSwap) {
        yield { type: "swap", i, j: i + k };
        [arr[i], arr[i + k]] = [arr[i + k], arr[i]];
      }
    }
    yield* bitonicMerge(arr, low, k, dir);
    yield* bitonicMerge(arr, low + k, k, dir);
  }
}

function* stoogeSort(arr, l = 0, h = arr.length - 1) {
  if (l >= h) return;
  yield { type: "compare", i: l, j: h };
  if (arr[l] > arr[h]) {
    yield { type: "swap", i: l, j: h };
    [arr[l], arr[h]] = [arr[h], arr[l]];
  }
  if (h - l + 1 > 2) {
    const t = Math.floor((h - l + 1) / 3);
    yield* stoogeSort(arr, l, h - t);
    yield* stoogeSort(arr, l + t, h);
    yield* stoogeSort(arr, l, h - t);
  }
}

function* bozoSort(arr, rng) {
  const maxAttempts = 6000;
  let attempts = 0;
  while (!isSorted(arr) && attempts < maxAttempts) {
    const i = Math.floor((rng ? rng() : Math.random()) * arr.length);
    const j = Math.floor((rng ? rng() : Math.random()) * arr.length);
    if (i !== j) {
      yield { type: "swap", i, j };
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    attempts++;
  }
}

init();
