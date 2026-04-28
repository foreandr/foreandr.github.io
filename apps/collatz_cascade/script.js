(function () {
  const DEFAULT_MAX_STEPS_PER_PATH = 500000;
  const MAX_STEPS_CAP = 10000000;
  const MIN_COMPUTE_BUDGET_MS = 500;
  const MAX_COMPUTE_BUDGET_MS = 15000;
  const COMPUTE_BUDGET_FACTOR = 0.02;
  const BUILD_SLICE_MS = 7.5;
  const LOG10_2 = Math.log10(2);

  const el = {
    controlsPanel: document.getElementById('controls-panel'),
    scenePanel: document.getElementById('scene-panel'),
    nInput: document.getElementById('n-input'),
    autoFocusCheck: document.getElementById('auto-focus-check'),
    profileInput: document.getElementById('profile-input'),
    modulusInput: document.getElementById('modulus-input'),
    divisorInput: document.getElementById('divisor-input'),
    oddMulInput: document.getElementById('odd-mul-input'),
    oddAddInput: document.getElementById('odd-add-input'),
    maxStepsInput: document.getElementById('max-steps-input'),
    maxValueInput: document.getElementById('max-value-input'),
    safetyHint: document.getElementById('safety-hint'),
    formulaHuman: document.getElementById('formula-human'),
    formulaLatex: document.getElementById('formula-latex'),
    formulaLatexActual: document.getElementById('formula-latex-actual'),
    modeHelp: document.getElementById('mode-help'),
    speed: document.getElementById('speed-range'),
    speedValue: document.getElementById('speed-value'),
    randomBtn: document.getElementById('random-btn'),
    buildBtn: document.getElementById('build-btn'),
    playBtn: document.getElementById('play-btn'),
    resetBtn: document.getElementById('reset-btn'),
    globalResetBtn: document.getElementById('global-reset-btn'),
    focusSceneBtn: document.getElementById('focus-scene-btn'),
    queueLine: document.getElementById('queue-line'),
    status: document.getElementById('status-line'),
    runsList: document.getElementById('runs-list'),
    statStarts: document.getElementById('stat-starts'),
    statNodes: document.getElementById('stat-nodes'),
    statEdges: document.getElementById('stat-edges'),
    statLongest: document.getElementById('stat-longest'),
    statPeak: document.getElementById('stat-peak'),
    statStep: document.getElementById('stat-step'),
    statCurrentNode: document.getElementById('stat-current-node'),
    statHoverNode: document.getElementById('stat-hover-node'),
    canvas: document.getElementById('scene'),
    tooltip: document.getElementById('hover-tooltip'),
    historyModal: document.getElementById('history-modal'),
    historyCloseBtn: document.getElementById('history-close-btn'),
    historyDownloadBtn: document.getElementById('history-download-btn'),
    historyTitle: document.getElementById('history-title'),
    historyMeta: document.getElementById('history-meta'),
    historyText: document.getElementById('history-text')
  };

  const ctx = el.canvas.getContext('2d');

  const state = {
    runs: [],
    nextRunId: 1,
    activeRunId: null,
    width: 0,
    height: 0,
    dpr: 1,
    speed: Number(el.speed.value) || 14,
    playing: true,
    lastTs: 0,
    tailFrames: 36,
    pointer: null,
    hovered: null,
    selectedRunForHistory: null,
    pendingBuild: null,
    buildQueue: [],
    globalMaxValue: 1n,
    globalMaxLog10: 0,
    globalMaxSteps: 1,
    distinctNodeCount: 0,
    distinctEdgeCount: 0
  };

  const SAFETY_PROFILES = {
    potato: {
      label: 'Potato Safe',
      maxSteps: 100000,
      maxValue: '1000000000000',
      guidance: 'Best for older laptops and many open tabs.'
    },
    balanced: {
      label: 'Balanced',
      maxSteps: 500000,
      maxValue: '1000000000000000',
      guidance: 'Good default for most modern laptops.'
    },
    high: {
      label: 'High Power',
      maxSteps: 2000000,
      maxValue: '1000000000000000000000',
      guidance: 'For stronger desktops; can still lag with many overlays.'
    },
    extreme: {
      label: 'Extreme',
      maxSteps: 5000000,
      maxValue: '1000000000000000000000000000000',
      guidance: 'Aggressive limits; use carefully.'
    },
    custom: {
      label: 'Custom',
      guidance: 'Manual limits. Lower caps reduce crash risk.'
    }
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function seededNoise(n) {
    const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453123;
    return x - Math.floor(x);
  }

  function normalizeIntegerText(raw) {
    return String(raw || '').trim().replace(/[,_\s]/g, '');
  }

  function absBigInt(value) {
    return value < 0n ? -value : value;
  }

  function formatBigInt(value) {
    const sign = value < 0n ? '-' : '';
    const digits = absBigInt(value).toString();
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${sign}${grouped}`;
  }

  function formatInt(value) {
    if (typeof value === 'bigint') {
      return formatBigInt(value);
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return String(value);
      if (Number.isInteger(value)) return formatBigInt(BigInt(value));
      return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
    }
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') return value;
    return String(value);
  }

  function formatMaybeNode(v) {
    if (v === null || v === undefined) return '-';
    return formatInt(v);
  }

  function setStatus(text) {
    el.status.textContent = text;
  }

  function renderLatexBlock(target, latex, displayMode = true) {
    if (!target) return;
    if (window.katex) {
      window.katex.render(latex, target, {
        displayMode,
        throwOnError: false
      });
      return;
    }
    target.textContent = latex;
  }

  function normalizeExpressionText(raw) {
    return String(raw || '').toLowerCase().replace(/\s+/g, '');
  }

  function tokenizeExpression(expr, label) {
    const tokens = [];
    let i = 0;

    while (i < expr.length) {
      const ch = expr[i];

      if (/\d/u.test(ch)) {
        let j = i + 1;
        while (j < expr.length && /\d/u.test(expr[j])) j += 1;
        tokens.push({ type: 'num', value: expr.slice(i, j) });
        i = j;
        continue;
      }

      if (ch === 'n') {
        tokens.push({ type: 'var', value: 'n' });
        i += 1;
        continue;
      }

      if ('+-*/^'.includes(ch)) {
        tokens.push({ type: 'op', value: ch });
        i += 1;
        continue;
      }

      if (ch === '(' || ch === ')') {
        tokens.push({ type: 'paren', value: ch });
        i += 1;
        continue;
      }

      throw new Error(`${label} expression has an invalid character: "${ch}"`);
    }

    return tokens;
  }

  function insertImplicitMultiplication(tokens) {
    const out = [];

    function endsValue(tok) {
      return tok.type === 'num'
        || tok.type === 'var'
        || (tok.type === 'paren' && tok.value === ')');
    }

    function startsValue(tok) {
      return tok.type === 'num'
        || tok.type === 'var'
        || (tok.type === 'paren' && tok.value === '(');
    }

    for (let i = 0; i < tokens.length; i += 1) {
      const curr = tokens[i];
      const next = tokens[i + 1];
      out.push(curr);
      if (!next) continue;
      if (endsValue(curr) && startsValue(next)) {
        out.push({ type: 'op', value: '*' });
      }
    }
    return out;
  }

  function expressionTokensToJs(tokens) {
    return tokens.map((tok) => {
      if (tok.type === 'num') return `${tok.value}n`;
      if (tok.type === 'var') return 'n';
      if (tok.type === 'op') return tok.value === '^' ? '**' : tok.value;
      return tok.value;
    }).join('');
  }

  function expressionTokensToDisplay(tokens) {
    return tokens.map((tok) => tok.value).join('');
  }

  function expressionTokensToLatex(tokens) {
    return tokens.map((tok) => {
      if (tok.type === 'op' && tok.value === '*') return String.raw`\cdot `;
      return tok.value;
    }).join('');
  }

  function compileIntegerExpression(inputEl, label) {
    const source = String(inputEl.value || '').trim();
    const normalized = normalizeExpressionText(source);
    if (!normalized) {
      throw new Error(`${label} cannot be empty.`);
    }

    const baseTokens = tokenizeExpression(normalized, label);
    const tokens = insertImplicitMultiplication(baseTokens);

    const jsExpr = expressionTokensToJs(tokens);
    let compiled;
    try {
      compiled = new Function('n', `"use strict"; return (${jsExpr});`);
    } catch (_err) {
      throw new Error(`${label} expression is invalid.`);
    }

    const fn = (n) => {
      let out;
      try {
        out = compiled(n);
      } catch (err) {
        throw new Error(`${label} expression failed: ${err.message}`);
      }
      if (typeof out !== 'bigint') {
        throw new Error(`${label} expression must evaluate to an integer.`);
      }
      return out;
    };

    // Smoke test once at n=1 to catch syntax/runtime issues quickly.
    fn(1n);

    return {
      source,
      normalized,
      display: expressionTokensToDisplay(tokens),
      latex: expressionTokensToLatex(tokens),
      fn
    };
  }

  function evaluateRuleParams(rule, n) {
    const modulus = rule.modulusExpr.fn(n);
    const divisor = rule.divisorExpr.fn(n);
    const oddMul = rule.oddMulExpr.fn(n);
    const oddAdd = rule.oddAddExpr.fn(n);
    return { modulus, divisor, oddMul, oddAdd };
  }

  function previewN() {
    try {
      return parseBigIntInput(el.nInput, 'Start N');
    } catch (_err) {
      return 1n;
    }
  }

  function shouldAutoFocusScene() {
    return !el.autoFocusCheck || el.autoFocusCheck.value !== 'off';
  }

  function focusScenePanel(smooth = true) {
    if (!el.scenePanel) return;
    el.scenePanel.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'start'
    });
  }

  function collapseAdvancedPanels() {
    const safety = document.getElementById('safety-details');
    const help = document.getElementById('help-details');
    if (safety) safety.open = false;
    if (help) help.open = false;
  }

  function updateQueueLine() {
    if (!el.queueLine) return;

    const queued = state.buildQueue.length;
    const activeBuildId = state.pendingBuild ? state.pendingBuild.runId : null;

    if (activeBuildId !== null && queued > 0) {
      el.queueLine.textContent = `Building run #${activeBuildId}. ${formatInt(queued)} run${queued === 1 ? '' : 's'} queued next.`;
      return;
    }
    if (activeBuildId !== null) {
      el.queueLine.textContent = `Building run #${activeBuildId}. You can still click Add Run; it will queue automatically.`;
      return;
    }
    if (queued > 0) {
      el.queueLine.textContent = `${formatInt(queued)} run${queued === 1 ? '' : 's'} waiting in queue.`;
      return;
    }
    el.queueLine.textContent = 'Tip: click Random N+Add repeatedly to stack and compare trajectories.';
  }

  function describeBigInt(value) {
    const text = absBigInt(value).toString();
    let log10Plus1 = 0;
    if (text !== '0') {
      if (text.length <= 15) {
        log10Plus1 = Math.log10(Number(text) + 1);
      } else {
        const leadLen = 15;
        const lead = Number(text.slice(0, leadLen));
        log10Plus1 = Math.log10(lead) + (text.length - leadLen);
      }
    }

    const head = Number(text.slice(0, Math.min(6, text.length))) || 0;
    const tail = Number(text.slice(Math.max(0, text.length - 6))) || 0;
    const jitterSeed = (head * 1e-6) + (tail * 1e-9) + (text.length * 0.173);
    return { log10Plus1, jitterSeed };
  }

  function ruleElseText(rule) {
    return `(${rule.oddMulExpr.display})*n + (${rule.oddAddExpr.display})`;
  }

  function renderRuleFormula(rule) {
    if (!el.formulaHuman || !el.formulaLatex || !el.formulaLatexActual) return;

    if (!rule) {
      el.formulaHuman.textContent = 'Rule preview will appear here.';
      el.formulaLatex.textContent = '';
      el.formulaLatexActual.textContent = '';
      return;
    }

    const human = `T(n): if n mod (${rule.modulusExpr.display}) = 0, then n/(${rule.divisorExpr.display}); otherwise ${ruleElseText(rule)}.`;
    el.formulaHuman.textContent = human;

    const latex = String.raw`T(n)=\begin{cases}\dfrac{n}{D(n)}, & n\bmod M(n)=0\\A(n)\cdot n + B(n), & \text{otherwise}\end{cases}
    \\ M(n)=${rule.modulusExpr.latex},\; D(n)=${rule.divisorExpr.latex},\; A(n)=${rule.oddMulExpr.latex},\; B(n)=${rule.oddAddExpr.latex}`;
    renderLatexBlock(el.formulaLatex, latex);

    const concreteLatexBase = String.raw`T(n)=\begin{cases}\dfrac{n}{${rule.divisorExpr.latex}}, & n\bmod\left(${rule.modulusExpr.latex}\right)=0\\
    \left(${rule.oddMulExpr.latex}\right)\cdot n + \left(${rule.oddAddExpr.latex}\right), & \text{otherwise}\end{cases}`;

    const n0 = previewN();
    try {
      const sample = evaluateRuleParams(rule, n0);
      const concreteLatex = String.raw`${concreteLatexBase}\\
      n_0=${n0.toString()},\; M(n_0)=${sample.modulus.toString()},\; D(n_0)=${sample.divisor.toString()},\; A(n_0)=${sample.oddMul.toString()},\; B(n_0)=${sample.oddAdd.toString()}`;
      renderLatexBlock(el.formulaLatexActual, concreteLatex);
    } catch (err) {
      const concreteLatex = String.raw`${concreteLatexBase}\\
      \text{At }n_0=${n0.toString()}\text{: parameter evaluation error.}`;
      renderLatexBlock(el.formulaLatexActual, concreteLatex);
    }
  }

  function getProfileConfig() {
    const key = (el.profileInput && el.profileInput.value) ? el.profileInput.value : 'balanced';
    return { key, config: SAFETY_PROFILES[key] || SAFETY_PROFILES.balanced };
  }

  function applySafetyProfile(profileKey) {
    const profile = SAFETY_PROFILES[profileKey] || SAFETY_PROFILES.balanced;
    if (profileKey !== 'custom') {
      el.maxStepsInput.value = String(profile.maxSteps);
      el.maxValueInput.value = profile.maxValue;
    }
    updateSafetyHint();
  }

  function switchToCustomProfile() {
    if (el.profileInput && el.profileInput.value !== 'custom') {
      el.profileInput.value = 'custom';
    }
  }

  function updateSafetyHint() {
    if (!el.safetyHint) return;

    const { config } = getProfileConfig();
    const maxStepsRaw = Number(el.maxStepsInput.value);
    const maxSteps = Number.isFinite(maxStepsRaw) && Number.isInteger(maxStepsRaw) ? maxStepsRaw : DEFAULT_MAX_STEPS_PER_PATH;
    const computeBudgetMs = deriveComputeBudgetMs(maxSteps);
    const valueCap = normalizeIntegerText(el.maxValueInput.value || '0');
    const prettyCap = (/^[+-]?\d+$/.test(valueCap)) ? formatInt(BigInt(valueCap)) : el.maxValueInput.value;
    const profileLabel = config.label || 'Balanced';
    const guidance = config.guidance || '';
    el.safetyHint.textContent = `${profileLabel}: step cap ${formatInt(maxSteps)}, value cap ${prettyCap}, compute budget about ${formatInt(computeBudgetMs)} ms per run. ${guidance}`;
  }

  function setRuleHelp(rule) {
    if (!rule) {
      el.modeHelp.textContent = 'Each Add Run is overlaid on earlier runs so you can compare how paths bend, peak, and return.';
      renderRuleFormula(null);
      return;
    }

    const branch = `if (n mod (${rule.modulusExpr.display}) = 0) => n/(${rule.divisorExpr.display}), else => ${ruleElseText(rule)}`;
    const maxSteps = Number(el.maxStepsInput.value) || DEFAULT_MAX_STEPS_PER_PATH;
    const maxValueRaw = normalizeIntegerText(el.maxValueInput.value || '0');
    const maxValueText = (/^[+-]?\d+$/.test(maxValueRaw)) ? formatInt(BigInt(maxValueRaw)) : el.maxValueInput.value;
    const computeBudgetMs = deriveComputeBudgetMs(maxSteps);
    const n0 = previewN();
    let sampleText = '';
    try {
      const sample = evaluateRuleParams(rule, n0);
      sampleText = ` At n=${formatInt(n0)}: m=${formatInt(sample.modulus)}, d=${formatInt(sample.divisor)}, a=${formatInt(sample.oddMul)}, b=${formatInt(sample.oddAdd)}.`;
    } catch (err) {
      sampleText = ` At n=${formatInt(n0)}: expression error (${err.message}).`;
    }
    el.modeHelp.textContent = `Rule in plain words: ${branch}.${sampleText} Safety limits: up to ${formatInt(maxSteps)} steps, value cap ${maxValueText}, and compute-time guard of about ${formatInt(computeBudgetMs)} ms per run.`;
    updateSafetyHint();
    renderRuleFormula(rule);
  }

  function refreshRuleHelpSafe() {
    try {
      const rule = readRuleFromInputs();
      setRuleHelp(rule);
    } catch (_err) {
      // Keep existing text while user is editing invalid inputs.
    }
  }

  function setPlayButton() {
    const hasRuns = state.runs.length > 0;
    const isRunning = hasRuns && state.playing;
    el.playBtn.textContent = isRunning ? 'Pause (Space)' : 'Play (Space)';
    el.playBtn.classList.toggle('running', isRunning);
  }

  function parseIntegerInput(inputEl, label, options = {}) {
    const raw = Number(inputEl.value);
    if (!Number.isFinite(raw) || !Number.isInteger(raw)) {
      throw new Error(`${label} must be an integer.`);
    }
    if (options.min !== undefined && raw < options.min) {
      throw new Error(`${label} must be >= ${options.min}.`);
    }
    if (options.max !== undefined && raw > options.max) {
      throw new Error(`${label} must be <= ${options.max}.`);
    }
    return raw;
  }

  function deriveComputeBudgetMs(maxSteps) {
    const scaled = Math.round(maxSteps * COMPUTE_BUDGET_FACTOR);
    return clamp(scaled, MIN_COMPUTE_BUDGET_MS, MAX_COMPUTE_BUDGET_MS);
  }

  function parseBigIntInput(inputEl, label, options = {}) {
    const cleaned = normalizeIntegerText(inputEl.value);
    if (!/^[+-]?\d+$/.test(cleaned)) {
      throw new Error(`${label} must be an integer.`);
    }

    const value = BigInt(cleaned);
    if (options.min !== undefined && value < options.min) {
      throw new Error(`${label} must be >= ${formatInt(options.min)}.`);
    }
    if (options.max !== undefined && value > options.max) {
      throw new Error(`${label} must be <= ${formatInt(options.max)}.`);
    }
    return value;
  }

  function readRuleFromInputs() {
    const modulusExpr = compileIntegerExpression(el.modulusInput, 'Modulus m');
    const divisorExpr = compileIntegerExpression(el.divisorInput, 'Divisor d');
    const oddMulExpr = compileIntegerExpression(el.oddMulInput, 'Multiplier a');
    const oddAddExpr = compileIntegerExpression(el.oddAddInput, 'Offset b');

    const rule = { modulusExpr, divisorExpr, oddMulExpr, oddAddExpr };
    const n0 = previewN();
    const sample = evaluateRuleParams(rule, n0);
    const modulusAbs = absBigInt(sample.modulus);
    if (modulusAbs < 1n) {
      throw new Error('Modulus m expression cannot evaluate to 0.');
    }
    if (sample.divisor === 0n) {
      throw new Error('Divisor d expression cannot evaluate to 0.');
    }
    if (sample.oddMul === 0n && sample.oddAdd === 0n) {
      throw new Error('Rule a(n)=0 and b(n)=0 forces n -> 0 on the otherwise branch. Pick different expressions.');
    }

    return rule;
  }

  function readRunLimitsFromInputs() {
    const maxSteps = parseIntegerInput(el.maxStepsInput, 'Max Steps Per Run', { min: 1000, max: MAX_STEPS_CAP });
    const maxValue = parseBigIntInput(el.maxValueInput, 'Max Value Cap', { min: 2n });
    const maxComputeMs = deriveComputeBudgetMs(maxSteps);
    return { maxSteps, maxComputeMs, maxValue };
  }

  function nextValue(n, rule) {
    let params;
    try {
      params = evaluateRuleParams(rule, n);
    } catch (err) {
      return { ok: false, reason: `${err.message} at n=${formatInt(n)}` };
    }

    const modulusAbs = absBigInt(params.modulus);
    if (modulusAbs < 1n) {
      return { ok: false, reason: `modulus expression evaluated to 0 at n=${formatInt(n)}` };
    }
    if (params.divisor === 0n) {
      return { ok: false, reason: `divisor expression evaluated to 0 at n=${formatInt(n)}` };
    }

    if (n % modulusAbs === 0n) {
      return { ok: true, value: n / params.divisor, params };
    }

    const candidate = params.oddMul * n + params.oddAdd;
    return { ok: true, value: candidate, params };
  }

  function createRunColor() {
    const hue = Math.floor(Math.random() * 360);
    return {
      hue,
      node(alpha) {
        return `hsla(${hue}, 88%, 66%, ${alpha})`;
      },
      edge(alpha) {
        return `hsla(${hue}, 92%, 62%, ${alpha})`;
      },
      ring(alpha) {
        return `hsla(${hue}, 95%, 78%, ${alpha})`;
      },
      solid: `hsl(${hue}, 88%, 64%)`
    };
  }

  function createRunDraft(startN, rule, runId, limits) {
    const startDescriptor = describeBigInt(startN);
    return {
      id: runId,
      startN,
      rule,
      sequence: [startN],
      nodes: [{
        value: startN,
        step: 0,
        x: 0,
        y: 0,
        radius: 2,
        log10Plus1: startDescriptor.log10Plus1,
        jitterSeed: startDescriptor.jitterSeed
      }],
      edges: [],
      steps: 0,
      maxValue: absBigInt(startN),
      maxLog10: startDescriptor.log10Plus1,
      progress: 0,
      endFrame: state.tailFrames,
      currentNodeValue: startN,
      color: createRunColor(),
      completed: false,
      convergedValue: null,
      terminated: '',
      maxStepsUsed: limits.maxSteps,
      maxComputeMsUsed: 0,
      maxComputeMsBudget: limits.maxComputeMs,
      maxValueCap: limits.maxValue,
      cycleDetectedAt: null,
      cycleFirstStep: null,
      isBuilding: true
    };
  }

  function startNextQueuedRun() {
    if (state.pendingBuild || state.buildQueue.length === 0) {
      updateQueueLine();
      return;
    }

    const next = state.buildQueue.shift();

    for (const run of state.runs) {
      if (!run.isBuilding) {
        run.progress = run.endFrame;
        run.currentNodeValue = run.sequence[run.sequence.length - 1];
      }
    }

    const run = createRunDraft(next.startN, next.rule, state.nextRunId++, next.limits);
    state.runs.push(run);
    state.activeRunId = run.id;
    beginRunBuild(run, next.limits);
    state.playing = true;
    state.lastTs = 0;
    setPlayButton();
    setRuleHelp(next.rule);

    recomputeGlobalLayout();
    renderRunsList();
    updateQueueLine();
    setStatus(`Generating run #${run.id} from n=${formatInt(run.startN)} | step-cap=${formatInt(run.maxStepsUsed)} | value-cap=${formatInt(run.maxValueCap)} | compute-budget=${formatInt(run.maxComputeMsBudget)}ms`);
    drawScene();
  }

  function beginRunBuild(run, limits) {
    state.pendingBuild = {
      runId: run.id,
      n: run.startN,
      visited: new Set([run.startN]),
      step: 0,
      startedAt: performance.now(),
      lastRelayoutStep: 0,
      maxSteps: limits.maxSteps,
      maxComputeMs: limits.maxComputeMs,
      maxValue: limits.maxValue
    };
  }

  function finishRunBuild(run, job) {
    run.maxComputeMsUsed = Math.round(performance.now() - job.startedAt);
    run.steps = Math.max(0, run.sequence.length - 1);
    const finalValue = run.sequence[run.sequence.length - 1];
    run.currentNodeValue = run.sequence[0];
    if (run.convergedValue === null && finalValue === 1n) {
      run.convergedValue = 1n;
    }
    run.completed = run.convergedValue !== null;

    if (!run.completed && !run.terminated && run.steps >= job.maxSteps) {
      run.terminated = run.cycleDetectedAt
        ? `step cap reached (${job.maxSteps}) after cycle at n=${formatInt(run.cycleDetectedAt)}`
        : `step cap reached (${job.maxSteps})`;
    }

    run.progress = 0;
    run.endFrame = run.steps + state.tailFrames;
    run.isBuilding = false;
    state.pendingBuild = null;

    recomputeGlobalLayout();
    renderRunsList();
    updateQueueLine();

    const endText = run.completed
      ? `converged to ${formatInt(run.convergedValue)}`
      : `did not converge (${run.terminated})`;
    setStatus(`Run #${run.id} is ready and now animating from the start. steps=${formatInt(run.steps)} | peak=${formatInt(run.maxValue)} | ${endText}`);

    if (state.buildQueue.length > 0) {
      startNextQueuedRun();
    }
  }

  function processPendingBuild() {
    const job = state.pendingBuild;
    if (!job) return;

    const run = state.runs.find((item) => item.id === job.runId);
    if (!run) {
      state.pendingBuild = null;
      return;
    }

    const sliceStart = performance.now();
    let appended = 0;
    let finalized = false;

    while ((performance.now() - sliceStart) < BUILD_SLICE_MS) {
      if (job.n === 1n) {
        run.convergedValue = 1n;
        finalized = true;
        break;
      }

      if (job.step >= job.maxSteps) {
        finalized = true;
        break;
      }

      const elapsedMs = performance.now() - job.startedAt;
      if (elapsedMs > job.maxComputeMs) {
        run.terminated = `compute-time cap reached (${formatInt(Math.round(elapsedMs))} ms > ${formatInt(job.maxComputeMs)} ms)`;
        finalized = true;
        break;
      }

      const transition = nextValue(job.n, run.rule);
      if (!transition.ok) {
        run.terminated = transition.reason;
        finalized = true;
        break;
      }

      const next = transition.value;
      if (absBigInt(next) > job.maxValue) {
        run.terminated = `value cap reached at |n|=${formatInt(absBigInt(next))} (cap ${formatInt(job.maxValue)})`;
        finalized = true;
        break;
      }

      const isFixedPoint = next === job.n;
      const described = describeBigInt(next);
      run.sequence.push(next);
      run.nodes.push({
        value: next,
        step: run.sequence.length - 1,
        x: 0,
        y: 0,
        radius: 2,
        log10Plus1: described.log10Plus1,
        jitterSeed: described.jitterSeed
      });
      run.edges.push({
        from: job.n,
        to: next,
        step: run.sequence.length - 2
      });

      job.step = run.sequence.length - 1;
      job.n = next;
      run.steps = job.step;
      run.currentNodeValue = next;
      run.progress = run.steps;
      run.endFrame = run.steps + state.tailFrames;
      const magnitude = absBigInt(next);
      if (magnitude > run.maxValue) run.maxValue = magnitude;
      if (described.log10Plus1 > run.maxLog10) run.maxLog10 = described.log10Plus1;

      if (isFixedPoint) {
        run.convergedValue = next;
        run.terminated = `fixed point reached at n=${formatInt(next)}`;
        finalized = true;
      } else if (next !== 1n && job.visited.has(next)) {
        if (!run.cycleDetectedAt) {
          run.cycleDetectedAt = next;
          run.cycleFirstStep = run.steps;
        }
        run.terminated = `cycle detected at n=${formatInt(next)}`;
        finalized = true;
      }
      job.visited.add(next);
      appended += 1;

      if (finalized) break;
    }

    run.maxComputeMsUsed = Math.round(performance.now() - job.startedAt);

    if (finalized) {
      finishRunBuild(run, job);
      return;
    }

    const shouldRecomputeAll = (run.maxValue > state.globalMaxValue)
      || (run.steps > state.globalMaxSteps)
      || (run.steps - job.lastRelayoutStep >= 256);

    if (shouldRecomputeAll) {
      recomputeGlobalLayout();
      job.lastRelayoutStep = run.steps;
    } else if (appended > 0) {
      layoutRun(run);
    }

    if (appended > 0) {
      if ((run.steps & 511) === 0) {
        setStatus(`Generating run #${run.id}... step ${formatInt(run.steps)}, current n=${formatInt(run.currentNodeValue)}, peak=${formatInt(run.maxValue)}`);
      }
      renderRunsList();
    }
  }

  function layoutRun(run) {
    const width = state.width;
    const height = state.height;
    const maxValueLog = state.globalMaxLog10;
    const maxSteps = Math.max(1, state.globalMaxSteps);

    const padX = Math.min(70, width * 0.07);
    const padTop = Math.min(42, height * 0.08);
    const padBottom = Math.min(76, height * 0.12);

    for (const node of run.nodes) {
      const xBase = maxValueLog === 0 ? 0.5 : node.log10Plus1 / maxValueLog;
      const runSpread = (seededNoise(run.id * 0.71 + node.step * 0.013) - 0.5) * 0.028;
      const localSpread = (seededNoise(run.id * 19.13 + node.jitterSeed + node.step) - 0.5) * 0.024;
      const xNorm = clamp(xBase + runSpread + localSpread, 0.01, 0.99);
      const yNorm = node.step / maxSteps;

      node.x = padX + xNorm * (width - padX * 2);
      node.y = padTop + yNorm * (height - padTop - padBottom);
      const log2Plus1 = node.log10Plus1 / LOG10_2;
      node.radius = node.value === 1n ? 6 : clamp(1.8 + log2Plus1 * 0.24, 1.8, 5.2);
    }
  }

  function recomputeGlobalLayout() {
    if (state.runs.length === 0) {
      state.globalMaxValue = 1n;
      state.globalMaxLog10 = 0;
      state.globalMaxSteps = 1;
      state.distinctNodeCount = 0;
      state.distinctEdgeCount = 0;
      return;
    }

    let maxValue = 1n;
    let maxValueLog10 = 0;
    let maxSteps = 1;
    const nodeSet = new Set();
    const edgeSet = new Set();

    for (const run of state.runs) {
      if (run.maxValue > maxValue) maxValue = run.maxValue;
      if (run.maxLog10 > maxValueLog10) maxValueLog10 = run.maxLog10;
      if (run.steps > maxSteps) maxSteps = run.steps;
      for (const value of run.sequence) {
        nodeSet.add(value.toString());
      }
      for (let i = 0; i < run.sequence.length - 1; i += 1) {
        edgeSet.add(`${run.sequence[i]}->${run.sequence[i + 1]}`);
      }
    }

    state.globalMaxValue = maxValue;
    state.globalMaxLog10 = maxValueLog10;
    state.globalMaxSteps = maxSteps;
    state.distinctNodeCount = nodeSet.size;
    state.distinctEdgeCount = edgeSet.size;

    for (const run of state.runs) {
      run.endFrame = run.steps + state.tailFrames;
      layoutRun(run);
    }
  }

  function getActiveRun() {
    if (state.runs.length === 0) return null;

    let active = state.runs.find((run) => run.id === state.activeRunId) || null;
    if (active && active.progress < active.endFrame) {
      return active;
    }

    for (let i = state.runs.length - 1; i >= 0; i -= 1) {
      if (state.runs[i].progress < state.runs[i].endFrame) {
        state.activeRunId = state.runs[i].id;
        return state.runs[i];
      }
    }

    state.activeRunId = state.runs[state.runs.length - 1].id;
    return state.runs[state.runs.length - 1];
  }

  function findHoveredNode() {
    if (!state.pointer || state.runs.length === 0) return null;

    let best = null;
    let bestDistSq = Infinity;

    for (let ri = state.runs.length - 1; ri >= 0; ri -= 1) {
      const run = state.runs[ri];
      for (let ni = run.nodes.length - 1; ni >= 0; ni -= 1) {
        const node = run.nodes[ni];
        const local = run.progress - node.step;
        if (local < -2.8) continue;

        const dx = state.pointer.x - node.x;
        const dy = state.pointer.y - node.y;
        const distSq = dx * dx + dy * dy;
        const hitRadius = node.radius + 6;
        if (distSq <= hitRadius * hitRadius && distSq < bestDistSq) {
          bestDistSq = distSq;
          best = { run, node };
        }
      }
    }

    return best;
  }

  function updateTooltip() {
    if (!state.hovered || !state.pointer) {
      el.tooltip.classList.add('hidden');
      return;
    }

    const run = state.hovered.run;
    const node = state.hovered.node;
    el.tooltip.innerHTML = `<strong>run #${run.id}</strong> &nbsp; n=${formatInt(node.value)}<br>start=${formatInt(run.startN)} &nbsp; step=${formatInt(node.step)}/${formatInt(run.steps)}`;
    el.tooltip.classList.remove('hidden');

    const margin = 14;
    const tw = el.tooltip.offsetWidth || 170;
    const th = el.tooltip.offsetHeight || 42;
    const tx = clamp(state.pointer.x, margin + tw / 2, state.width - margin - tw / 2);
    const ty = clamp(state.pointer.y, margin + th + 10, state.height - margin);

    el.tooltip.style.left = `${tx}px`;
    el.tooltip.style.top = `${ty}px`;
  }

  function updateStats() {
    if (state.runs.length === 0) {
      el.statStarts.textContent = '0';
      el.statNodes.textContent = '0';
      el.statEdges.textContent = '0';
      el.statLongest.textContent = '0';
      el.statPeak.textContent = '0';
      el.statStep.textContent = '0';
      el.statCurrentNode.textContent = '-';
      el.statHoverNode.textContent = '-';
      return;
    }

    const active = getActiveRun();
    const activeStep = active ? clamp(Math.floor(active.progress), 0, active.steps) : 0;
    const activeNode = active ? active.sequence[activeStep] : null;

    el.statStarts.textContent = formatInt(state.runs.length);
    el.statNodes.textContent = formatInt(state.distinctNodeCount);
    el.statEdges.textContent = formatInt(state.distinctEdgeCount);
    el.statLongest.textContent = formatInt(state.globalMaxSteps);
    el.statPeak.textContent = formatInt(state.globalMaxValue);
    el.statStep.textContent = active ? `run #${active.id}: ${formatInt(activeStep)} / ${formatInt(active.steps)}` : '0';
    el.statCurrentNode.textContent = formatMaybeNode(activeNode);
    el.statHoverNode.textContent = formatMaybeNode(state.hovered?.node?.value);
  }

  function renderRunsList() {
    updateQueueLine();

    if (state.runs.length === 0) {
      el.runsList.innerHTML = '<div class="run-item"><div class="run-main">No runs yet. Click Add Run.</div><div class="run-state">idle</div></div>';
      return;
    }

    const active = getActiveRun();
    const rows = [...state.runs].reverse().map((run) => {
      const isActive = active && run.id === active.id;
      const isRunning = state.playing && run.progress < run.endFrame;
      const stateText = run.isBuilding
        ? (state.playing ? 'building' : 'build paused')
        : (run.progress >= run.endFrame ? 'complete' : (isRunning ? 'running' : 'paused'));
      const ruleText = `m=${run.rule.modulusExpr.display}, d=${run.rule.divisorExpr.display}, a=${run.rule.oddMulExpr.display}, b=${run.rule.oddAddExpr.display}`;
      const badge = run.isBuilding
        ? 'building'
        : run.completed
        ? `to ${formatInt(run.convergedValue)}`
        : (run.terminated && run.terminated.includes('cycle detected')
          ? 'cycle'
          : 'truncated');
      return `<div class="run-item${isActive ? ' active' : ''}" data-run-id="${run.id}" title="Click to open full run history">
        <span class="run-swatch" style="background:${run.color.solid};"></span>
        <div class="run-main">#${run.id} &nbsp; n0=${formatInt(run.startN)} &nbsp; ${ruleText} &nbsp; (${badge})</div>
        <div class="run-state">${stateText}</div>
      </div>`;
    });

    el.runsList.innerHTML = rows.join('');
    updateQueueLine();
  }

  function buildHistoryText(run) {
    const lines = [];
    lines.push(`Run #${run.id}`);
    lines.push(`start_n=${formatInt(run.startN)}`);
    lines.push(`rule: m(n)=${run.rule.modulusExpr.display}, d(n)=${run.rule.divisorExpr.display}, a(n)=${run.rule.oddMulExpr.display}, b(n)=${run.rule.oddAddExpr.display}`);
    lines.push(`steps=${run.steps}`);
    lines.push(`peak=${formatInt(run.maxValue)}`);
    lines.push(`completed=${run.completed ? 'yes' : 'no'}`);
    if (run.convergedValue !== null && run.convergedValue !== undefined) {
      lines.push(`converged_to=${formatInt(run.convergedValue)}`);
    }
    lines.push(`terminated=${run.terminated || 'n/a'}`);
    if (run.cycleDetectedAt !== null && run.cycleDetectedAt !== undefined) {
      lines.push(`cycle_detected_at_n=${formatInt(run.cycleDetectedAt)}`);
      if (Number.isFinite(run.cycleFirstStep)) {
        lines.push(`cycle_first_step=${run.cycleFirstStep}`);
      }
    }
    lines.push(`max_steps_cap=${run.maxStepsUsed}`);
    lines.push(`max_value_cap=${formatInt(run.maxValueCap)}`);
    lines.push(`compute_time_ms=${run.maxComputeMsUsed}`);
    lines.push(`compute_budget_ms=${run.maxComputeMsBudget}`);
    lines.push('');
    lines.push('index\tvalue');
    for (let i = 0; i < run.sequence.length; i += 1) {
      lines.push(`${i}\t${formatInt(run.sequence[i])}`);
    }
    return lines.join('\n');
  }

  function openRunHistoryModal(runId) {
    const run = state.runs.find((r) => r.id === runId);
    if (!run) return;

    state.selectedRunForHistory = run.id;
    el.historyTitle.textContent = `Run #${run.id} History`;
    const historyOutcome = run.completed
      ? `converged to ${formatInt(run.convergedValue)}`
      : (run.terminated || 'not completed');
    el.historyMeta.textContent = `n0=${formatInt(run.startN)} | steps=${formatInt(run.steps)} | peak=${formatInt(run.maxValue)} | ${historyOutcome}`;
    el.historyText.value = 'Loading full history...';
    el.historyModal.classList.remove('hidden');

    setTimeout(() => {
      el.historyText.value = buildHistoryText(run);
      el.historyText.scrollTop = 0;
    }, 0);
  }

  function closeRunHistoryModal() {
    state.selectedRunForHistory = null;
    el.historyModal.classList.add('hidden');
    el.historyText.value = '';
  }

  function downloadRunHistory() {
    if (!state.selectedRunForHistory) return;
    const run = state.runs.find((r) => r.id === state.selectedRunForHistory);
    if (!run) return;

    const content = el.historyText.value || buildHistoryText(run);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collatz_run_${run.id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function drawBackground() {
    const w = state.width;
    const h = state.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a223a');
    grad.addColorStop(1, '#07182c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(190, 220, 245, 0.09)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i += 1) {
      const y = (h / 8) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 1; i < 12; i += 1) {
      const x = (w / 12) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  function drawPlaceholder() {
    const w = state.width;
    const h = state.height;
    ctx.fillStyle = 'rgba(223, 240, 255, 0.88)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Add runs to overlay Collatz trajectories', w / 2, h / 2 - 14);
    ctx.font = '600 15px "Source Sans 3", sans-serif';
    ctx.fillStyle = 'rgba(195, 223, 246, 0.75)';
    ctx.fillText('Change n0 and the rule settings, then click Add Run to watch the cascade.', w / 2, h / 2 + 20);
  }

  function drawRun(run, isActive) {
    for (const edge of run.edges) {
      const fromNode = run.nodes[edge.step];
      const toNode = run.nodes[edge.step + 1];
      if (!fromNode || !toNode) continue;

      const local = run.progress - edge.step;
      if (local < -2.8) continue;

      const fade = clamp((local + 2.8) / 7.8, 0, 1);
      const wave = Math.exp(-Math.pow((local - 1.0) / 1.4, 2));
      const alpha = clamp(0.03 + 0.40 * fade + 0.28 * wave, 0, 1);
      const width = 0.7 + 1.45 * wave + (isActive ? 0.3 : 0);

      ctx.strokeStyle = run.color.edge(alpha.toFixed(3));
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.stroke();
    }

    for (const node of run.nodes) {
      const local = run.progress - node.step;
      if (local < -2.8) continue;

      const fade = clamp((local + 2.8) / 7.8, 0, 1);
      const wave = Math.exp(-Math.pow((local - 0.6) / 1.22, 2));
      const alpha = clamp(0.10 + 0.72 * fade + 0.20 * wave, 0, 1);
      const radius = node.radius * (1 + 0.34 * wave);

      if (node.value === 1n) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
      } else {
        ctx.fillStyle = run.color.node(alpha.toFixed(3));
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHud() {
    const active = getActiveRun();
    if (!active) return;

    const step = clamp(Math.floor(active.progress), 0, active.steps);
    const current = active.sequence[step];
    const rule = active.rule;

    ctx.fillStyle = 'rgba(230, 242, 255, 0.97)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 14px "Source Sans 3", sans-serif';
    ctx.fillText(`run #${active.id}  frame ${step}/${active.steps}`, 14, 12);
    ctx.fillText(`current node n=${formatInt(current)}`, 14, 34);
    ctx.fillText(`rule: if n mod (${rule.modulusExpr.display}) = 0 => n/(${rule.divisorExpr.display}), else ${ruleElseText(rule)}`, 14, 56);
    try {
      const params = evaluateRuleParams(rule, current);
      ctx.fillText(`at current n: m=${formatInt(params.modulus)}, d=${formatInt(params.divisor)}, a=${formatInt(params.oddMul)}, b=${formatInt(params.oddAdd)}`, 14, 78);
    } catch (_err) {
      ctx.fillText('at current n: parameter evaluation error', 14, 78);
    }
    if (active.isBuilding) {
      ctx.fillText(`building... step-cap ${formatInt(active.maxStepsUsed)}, value-cap ${formatInt(active.maxValueCap)}`, 14, 100);
    }
    if (state.hovered) {
      ctx.fillText(`hover run #${state.hovered.run.id}, n=${formatInt(state.hovered.node.value)}`, 14, active.isBuilding ? 122 : 100);
    }
  }

  function drawScene() {
    drawBackground();

    if (state.runs.length === 0) {
      state.hovered = null;
      drawPlaceholder();
      el.tooltip.classList.add('hidden');
      updateStats();
      return;
    }

    const active = getActiveRun();
    for (const run of state.runs) {
      drawRun(run, Boolean(active && run.id === active.id));
    }

    if (active) {
      const activeStep = clamp(Math.floor(active.progress), 0, active.steps);
      const node = active.nodes[activeStep];
      if (node) {
        const wave = 0.55 + 0.45 * Math.sin(performance.now() * 0.0054);
        const ringRadius = node.radius + 5 + 5 * wave;
        ctx.strokeStyle = active.color.ring((0.38 + 0.46 * wave).toFixed(3));
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    state.hovered = findHoveredNode();
    drawHud();
    updateTooltip();
    updateStats();
  }

  function resizeCanvas() {
    const rect = el.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    state.width = rect.width;
    state.height = rect.height;
    state.dpr = dpr;

    el.canvas.width = Math.floor(rect.width * dpr);
    el.canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    recomputeGlobalLayout();
    drawScene();
  }

  function addRun(startN) {
    let rule;
    let limits;
    try {
      rule = readRuleFromInputs();
      limits = readRunLimitsFromInputs();
    } catch (err) {
      setStatus(err.message);
      return;
    }

    state.buildQueue.push({
      startN,
      rule,
      limits
    });

    state.playing = true;
    state.lastTs = 0;
    setPlayButton();
    setRuleHelp(rule);
    updateQueueLine();
    if (shouldAutoFocusScene()) {
      collapseAdvancedPanels();
      focusScenePanel(true);
    }

    if (!state.pendingBuild) {
      startNextQueuedRun();
    } else {
      renderRunsList();
      const queued = state.buildQueue.length;
      setStatus(`Queued new run from n=${formatInt(startN)}. Waiting behind current build (${formatInt(queued)} queued).`);
      drawScene();
    }
  }

  function randomStart() {
    return BigInt(Math.floor(Math.random() * 5000) + 1);
  }

  function resetAnimation() {
    if (state.runs.length === 0) return;
    for (const run of state.runs) {
      run.progress = 0;
      run.currentNodeValue = run.sequence[0];
    }
    state.activeRunId = state.runs[state.runs.length - 1].id;
    state.playing = true;
    state.lastTs = 0;
    setPlayButton();
    renderRunsList();
    setStatus(state.pendingBuild
      ? 'Restarted playback while current run keeps generating in the background.'
      : 'Restarted animation for all overlaid runs.');
    drawScene();
  }

  function globalReset() {
    state.runs = [];
    state.activeRunId = null;
    state.pendingBuild = null;
    state.buildQueue = [];
    state.playing = false;
    state.lastTs = 0;
    state.hovered = null;
    closeRunHistoryModal();
    setPlayButton();
    setRuleHelp(null);
    recomputeGlobalLayout();
    renderRunsList();
    updateQueueLine();
    setStatus('Global reset: cleared all runs from the chart.');
    drawScene();
  }

  function tick(ts) {
    if (state.playing && !state.pendingBuild && state.buildQueue.length > 0) {
      startNextQueuedRun();
    }

    if (state.playing && state.pendingBuild) {
      processPendingBuild();
    }

    if (state.playing && state.runs.length > 0) {
      if (state.lastTs === 0) {
        state.lastTs = ts;
      }
      const dt = (ts - state.lastTs) / 1000;
      state.lastTs = ts;

      let anyAnimating = false;
      for (const run of state.runs) {
        if (run.isBuilding) {
          anyAnimating = true;
          continue;
        }
        if (run.progress < run.endFrame) {
          run.progress = Math.min(run.endFrame, run.progress + dt * state.speed);
          const idx = clamp(Math.floor(run.progress), 0, run.steps);
          run.currentNodeValue = run.sequence[idx];
          if (run.progress < run.endFrame) {
            anyAnimating = true;
          }
        }
      }

      if (!anyAnimating) {
        state.playing = false;
        setPlayButton();
      }
    } else {
      state.lastTs = ts;
    }

    drawScene();
    requestAnimationFrame(tick);
  }

  el.speed.addEventListener('input', () => {
    state.speed = Number(el.speed.value) || 1;
    el.speedValue.textContent = `${state.speed}x`;
  });

  el.buildBtn.addEventListener('click', () => {
    try {
      const n = parseBigIntInput(el.nInput, 'Start N');
      addRun(n);
    } catch (err) {
      setStatus(err.message);
    }
  });

  el.randomBtn.addEventListener('click', () => {
    const n = randomStart();
    el.nInput.value = n.toString();
    addRun(n);
  });

  el.playBtn.addEventListener('click', () => {
    if (state.runs.length === 0) return;
    state.playing = !state.playing;
    setPlayButton();
    renderRunsList();
    setStatus(state.playing ? 'Animation resumed.' : 'Animation paused.');
  });

  el.resetBtn.addEventListener('click', () => {
    resetAnimation();
  });

  el.globalResetBtn.addEventListener('click', () => {
    globalReset();
  });

  if (el.focusSceneBtn) {
    el.focusSceneBtn.addEventListener('click', () => {
      focusScenePanel(true);
    });
  }

  el.runsList.addEventListener('click', (event) => {
    const row = event.target.closest('.run-item[data-run-id]');
    if (!row) return;
    const id = Number(row.getAttribute('data-run-id'));
    if (!Number.isFinite(id)) return;
    openRunHistoryModal(id);
  });

  el.historyCloseBtn.addEventListener('click', () => {
    closeRunHistoryModal();
  });

  el.historyDownloadBtn.addEventListener('click', () => {
    downloadRunHistory();
  });

  el.historyModal.addEventListener('click', (event) => {
    if (event.target === el.historyModal) {
      closeRunHistoryModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !el.historyModal.classList.contains('hidden')) {
      closeRunHistoryModal();
      return;
    }

    if (!el.historyModal.classList.contains('hidden')) {
      return;
    }

    if (event.code !== 'Space') return;
    const tag = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (state.runs.length === 0) return;
    event.preventDefault();
    state.playing = !state.playing;
    setPlayButton();
    renderRunsList();
    setStatus(state.playing ? 'Animation resumed.' : 'Animation paused.');
  });

  el.nInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    try {
      const n = parseBigIntInput(el.nInput, 'Start N');
      addRun(n);
    } catch (err) {
      setStatus(err.message);
    }
  });

  el.nInput.addEventListener('input', () => {
    refreshRuleHelpSafe();
  });

  if (el.profileInput) {
    el.profileInput.addEventListener('change', () => {
      applySafetyProfile(el.profileInput.value);
      refreshRuleHelpSafe();
    });
  }

  el.maxStepsInput.addEventListener('input', () => {
    switchToCustomProfile();
    updateSafetyHint();
  });

  el.maxStepsInput.addEventListener('change', () => {
    switchToCustomProfile();
    refreshRuleHelpSafe();
  });

  el.maxValueInput.addEventListener('input', () => {
    switchToCustomProfile();
    updateSafetyHint();
  });

  el.maxValueInput.addEventListener('change', () => {
    switchToCustomProfile();
    refreshRuleHelpSafe();
  });

  [el.modulusInput, el.divisorInput, el.oddMulInput, el.oddAddInput].forEach((inputEl) => {
    inputEl.addEventListener('input', () => {
      refreshRuleHelpSafe();
    });
  });

  el.canvas.addEventListener('mousemove', (event) => {
    const rect = el.canvas.getBoundingClientRect();
    state.pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    state.hovered = findHoveredNode();
    drawScene();
  });

  el.canvas.addEventListener('mouseleave', () => {
    state.pointer = null;
    state.hovered = null;
    el.tooltip.classList.add('hidden');
    drawScene();
  });

  window.addEventListener('resize', resizeCanvas);

  applySafetyProfile((el.profileInput && el.profileInput.value) ? el.profileInput.value : 'balanced');
  refreshRuleHelpSafe();
  setStatus('Ready. Set n and parameters, then click Add Run.');
  el.speedValue.textContent = `${state.speed}x`;
  setPlayButton();
  renderRunsList();
  resizeCanvas();
  requestAnimationFrame(tick);
})();

