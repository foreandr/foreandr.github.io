(function () {
  'use strict';

  const BTNS = [
    { id: 'L', label: 'Left' },
    { id: 'M', label: 'Center' },
    { id: 'R', label: 'Right' },
  ];

  /** @type {'two'|'many'|'bell'} */
  let scenario = 'two';

  /** @type {{ L?: string, M?: string, R?: string }} */
  let shared = {};
  /** @type {Set<string>[]} */
  let pressedPerBox = [];
  /** @type {boolean[]} */
  let disturbed = [];

  /** many-copy run */
  let manyLeft = 'R';
  let manyMid = [];
  let manyRight = [];
  let manyBoxCount = 3;

  const el = {
    boxesRow: document.getElementById('boxes-row'),
    stageTitle: document.getElementById('stage-title'),
    stageCaption: document.getElementById('stage-caption'),
    btnNew: document.getElementById('btn-new-run'),
    btnReset: document.getElementById('btn-reset-view'),
    log: document.getElementById('event-log'),
    know: document.getElementById('know-body'),
    pred: document.getElementById('predictions-body'),
    tabs: document.querySelectorAll('.tab'),
  };

  function rg() {
    return Math.random() < 0.5 ? 'R' : 'G';
  }

  function log(msg) {
    const li = document.createElement('li');
    li.innerHTML = msg;
    el.log.insertBefore(li, el.log.firstChild);
    while (el.log.children.length > 40) el.log.removeChild(el.log.lastChild);
  }

  function clearLog() {
    el.log.innerHTML = '';
  }

  function initTwo() {
    shared = {};
    pressedPerBox = [new Set(), new Set()];
    disturbed = [false, false];
    el.stageTitle.textContent = 'Two entangled boxes';
    el.stageCaption.textContent =
      'First time anyone asks a given question (left / center / right), both boxes agree on the answer. After you ask two different questions on the same box, asking the first one again on that box can flip — complementary information. The other box still reflects the earlier correlation until you disturb it too.';
    el.btnReset.hidden = false;
    renderBoxes(2);
    updateKnowTwo();
    updatePredTwo();
    log('<strong>New pair.</strong> Press a button. The light is the phenomenon.');
  }

  function initMany() {
    manyLeft = rg();
    manyMid = Array.from({ length: manyBoxCount }, rg);
    manyRight = Array.from({ length: manyBoxCount }, rg);
    el.stageTitle.textContent = manyBoxCount + ' correlated copies (left-button scheme)';
    el.stageCaption.textContent =
      'This batch was prepared so the <strong>left</strong> button always matches on every copy. Center and right were drawn independently — they will <em>not</em> all agree every time. That is the toy version of “only one complete family of copies at a time.”';
    el.btnReset.hidden = true;
    pressedPerBox = Array.from({ length: manyBoxCount }, () => new Set());
    disturbed = Array(manyBoxCount).fill(false);
    renderBoxes(manyBoxCount);
    updateKnowMany();
    updatePredMany();
    log(
      '<strong>New batch.</strong> Left is shared as <strong>' +
        manyLeft +
        '</strong> on every copy. Try center on each copy.'
    );
  }

  function renderBoxes(n) {
    el.boxesRow.innerHTML = '';
    for (let b = 0; b < n; b++) {
      const card = document.createElement('div');
      card.className = 'box-card';
      card.innerHTML =
        '<span class="box-label">Box ' +
        (b + 1) +
        '</span><div class="light" id="light-' +
        b +
        '" aria-live="polite">?</div><div class="btn-row">' +
        BTNS.map(
          (btn, i) =>
            '<button type="button" class="box-btn" data-box="' +
            b +
            '" data-btn="' +
            btn.id +
            '">' +
            btn.label +
            '</button>'
        ).join('') +
        '</div>';
      el.boxesRow.appendChild(card);
    }
    el.boxesRow.querySelectorAll('.box-btn').forEach((btn) => {
      btn.addEventListener('click', () =>
        onPress(parseInt(btn.getAttribute('data-box'), 10), btn.getAttribute('data-btn'))
      );
    });
  }

  function setLight(box, color, label) {
    const L = document.getElementById('light-' + box);
    L.classList.remove('on-red', 'on-green');
    L.textContent = label;
    if (color === 'R') L.classList.add('on-red');
    else L.classList.add('on-green');
  }

  function onPress(box, btnId) {
    if (scenario === 'two') onPressTwo(box, btnId);
    else if (scenario === 'many') onPressMany(box, btnId);
  }

  function onPressTwo(box, btnId) {
    const wasNewForThisBox = !pressedPerBox[box].has(btnId);
    pressedPerBox[box].add(btnId);
    if (pressedPerBox[box].size >= 2) disturbed[box] = true;

    let color;
    if (!shared[btnId]) shared[btnId] = rg();

    if (disturbed[box] && !wasNewForThisBox) {
      color = rg();
      log(
        'Box ' +
          (box + 1) +
          ' · repeat <strong>' +
          btnId +
          '</strong> after mixing questions → <strong>' +
          color +
        '</strong> (complementarity toy rule).'
      );
    } else {
      color = shared[btnId];
      log(
        'Box ' +
          (box + 1) +
          ' · <strong>' +
          btnId +
          '</strong> → <strong>' +
          color +
          '</strong> (correlated with partner for first reveal).'
      );
    }

    setLight(box, color, color === 'R' ? 'Red' : 'Green');
    updateKnowTwo();
  }

  function onPressMany(box, btnId) {
    pressedPerBox[box].add(btnId);
    let color;
    if (btnId === 'L') color = manyLeft;
    else if (btnId === 'M') color = manyMid[box];
    else color = manyRight[box];

    setLight(box, color, color === 'R' ? 'Red' : 'Green');
    log(
      'Copy ' +
        (box + 1) +
        ' · <strong>' +
        btnId +
        '</strong> → <strong>' +
        color +
        '</strong>.'
    );
    updateKnowMany();
  }

  function updateKnowTwo() {
    const nL = shared.L ? 1 : 0;
    const nM = shared.M ? 1 : 0;
    const nR = shared.R ? 1 : 0;
    const revealed = nL + nM + nR;
    el.know.innerHTML =
      '<p>You have observed <strong>' +
      revealed +
      '</strong> of 3 question-types so far.</p><ul>' +
      '<li>You <em>may</em> say: “If I press the same button on the other box before anyone disturbs it, I predict the same color.”</li>' +
      '<li>You <em>should not</em> insist there “was already” a red/green fact for a button nobody pressed — that is exactly the habit QM breaks.</li>' +
      (disturbed[0] || disturbed[1]
        ? '<li>At least one box had two different questions asked; repeat answers on <em>that</em> box can change in this toy.</li>'
        : '') +
      '</ul>';
  }

  function updatePredTwo() {
    el.pred.innerHTML =
      '<p><strong>Prediction:</strong> first reveal of each question-type matches between the two boxes.</p>' +
      '<p><strong>Test:</strong> press Left on box A, then Left on box B — agreement. Then try Center on A, then Left again on A — you may see a change (toy complementarity).</p>';
  }

  function updateKnowMany() {
    const mids = manyMid.join('');
    const allM = manyMid.every((c) => c === manyMid[0]);
    el.know.innerHTML =
      '<p>Left color for this batch: <strong>' +
      manyLeft +
      '</strong> (every copy).</p><ul>' +
      '<li>Center across copies this time: <code style="font-size:11px">' +
      mids +
      '</code> — ' +
      (allM
        ? 'all match (happens sometimes by chance).'
        : 'not all identical: you cannot rely on “center always copies” like left.') +
      '</li><li>This mirrors the lecture: many copies can share <em>one</em> perfect correlation channel, not three independent ones.</li></ul>';
  }

  function updatePredMany() {
    el.pred.innerHTML =
      '<p><strong>Batch experiment:</strong> simulate many fresh batches and count how often <em>all center buttons match</em> across all copies (independent random centers).</p>' +
      '<div class="run-row"><button type="button" class="btn" id="btn-sim-mid">Simulate 800 batches</button><output id="out-mid"></output></div>' +
      '<p style="margin-top:10px">Expect roughly <strong>25%</strong> when each center is fair and independent (2/8 all R + 2/8 all G for 3 coins).</p>';
    const btn = document.getElementById('btn-sim-mid');
    const out = document.getElementById('out-mid');
    btn.onclick = () => {
      let hit = 0;
      const n = 800;
      const k = manyBoxCount;
      for (let i = 0; i < n; i++) {
        const arr = Array.from({ length: k }, () => rg());
        if (arr.every((c) => c === arr[0])) hit++;
      }
      out.textContent =
        'All ' + k + ' centers agreed in ' + hit + ' / ' + n + ' runs (~' + ((hit / n) * 100).toFixed(1) + '%).';
    };
  }

  function initBell() {
    el.stageTitle.textContent = 'Classical “cards in the box” vs. counting';
    el.stageCaption.textContent =
      'Give each of three boxes a hidden card (R/G for left, center, right). You can always <em>rig</em> the deck so left matches everywhere — but then you chose the cards. If cards are honest independent random draws, “all three centers match” across boxes is rare (~¼ for three fair coins). The quantum surprise is subtler (Bell-CHSH); this panel is only the “don’t smuggle in extra reality” warning.';
    el.btnReset.hidden = true;
    el.boxesRow.innerHTML =
      '<div class="box-card" style="width:100%;max-width:520px">' +
      '<p style="font-size:14px;color:#a8a29e;margin-bottom:12px">Three boxes, three hidden triples. One run = three random triples. We only check whether <strong>center</strong> matches on all three boxes.</p>' +
      '<div class="run-row"><button type="button" class="btn primary" id="btn-rig">Rig: same L, same M, same R everywhere</button></div>' +
      '<div class="run-row"><button type="button" class="btn" id="btn-honest">Honest random cards (1000 runs)</button><output id="out-bell"></output></div>' +
      '<p style="margin-top:14px;font-size:13px;color:#a8a29e">Rigged = you knew the answers in advance (not a hidden variable you “discovered”). Honest = classical independence — matching all centers is ~25%.</p></div>';

    el.know.innerHTML =
      '<p><strong>Einstein–Podolsky–Rosen unease</strong> was: “I can learn B’s momentum without touching B, so both must be real.” The operational reply is: what you learned is what would happen <em>if</em> you measured — not a license to populate the world with extra facts.</p>';

    document.getElementById('btn-rig').onclick = () => {
      const c = rg();
      const m = rg();
      const r = rg();
      document.getElementById('out-bell').textContent =
        'Rigged row: L=' + c + ' M=' + m + ' R=' + c + ' on every box — 100% center match by construction, but you chose the deck.';
    };
    document.getElementById('btn-honest').onclick = () => {
      let hit = 0;
      const n = 1000;
      for (let i = 0; i < n; i++) {
        const m1 = rg();
        const m2 = rg();
        const m3 = rg();
        if (m1 === m2 && m2 === m3) hit++;
      }
      document.getElementById('out-bell').textContent =
        'All three centers matched in ' + hit + ' / ' + n + ' (~' + ((hit / n) * 100).toFixed(1) + '%).';
    };

    el.pred.innerHTML =
      '<p>Feynman’s <strong>three-box</strong> counting story says: if three answers could all be perfectly correlated for <em>every</em> choice of question, you could fill notebooks that contradict probability facts. Nature’s correlations don’t extend that way.</p>';
    clearLog();
    log('<strong>Bell / EPR context</strong> — use the two-box and many-copy tabs to feel the difference before reading theorems.');
  }

  function setScenario(s) {
    scenario = s;
    el.tabs.forEach((t) => {
      const on = t.getAttribute('data-scenario') === s;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    clearLog();
    if (s === 'two') initTwo();
    else if (s === 'many') initMany();
    else initBell();
  }

  el.btnNew.addEventListener('click', () => {
    if (scenario === 'two') initTwo();
    else if (scenario === 'many') initMany();
    else initBell();
  });

  el.btnReset.addEventListener('click', () => {
    if (scenario !== 'two') return;
    el.boxesRow.querySelectorAll('.light').forEach((L) => {
      L.classList.remove('on-red', 'on-green');
      L.textContent = '?';
    });
    log('<strong>Lights cleared</strong> (state kept until “New pair”).');
  });

  el.tabs.forEach((t) => {
    t.addEventListener('click', () => setScenario(t.getAttribute('data-scenario')));
  });

  setScenario('two');
})();
