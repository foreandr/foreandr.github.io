// ═══════════════════════════════════════════════════════
// PEANO COMPILER
//
//  Input   — Real-valued expressions (decimals / fractions)
//
//  Tier II  — Reals      Cauchy sequences over ℚ
//  Tier III — Rationals  equivalence classes of ℤ pairs
//  Tier IV  — Integers   equivalence classes of ℕ pairs
//  Tier V   — Peano      successor functions + axiom proof
// ═══════════════════════════════════════════════════════

// ── Parser ────────────────────────────────────────────────────────────────────
// Supports: integers, fractions (1/2), decimals (0.5), neg (−3), +, −, ×, =
function parseRationalExpr(input) {
  let tokens, pos;

  function tokenize(inp) {
    const toks = [];
    let i = 0;
    while (i < inp.length) {
      const ch = inp[i];
      if (/\s/.test(ch)) { i++; continue; }

      // Number (integer or decimal)
      if (/\d/.test(ch) || (ch === '.' && /\d/.test(inp[i+1] || ''))) {
        let num = '';
        while (i < inp.length && /[\d.]/.test(inp[i])) num += inp[i++];
        if (num.includes('.')) {
          const parts = num.split('.');
          const decimals = (parts[1] || '').length;
          const denom = Math.pow(10, decimals);
          const numer = parseInt(parts[0]) * denom + parseInt(parts[1] || 0);
          const g = gcd(numer, denom);
          toks.push({ type: 'NUM', p: numer / g, q: denom / g });
        } else {
          toks.push({ type: 'NUM', p: parseInt(num), q: 1 });
        }
        continue;
      }

      if (ch === '/')                    { toks.push({ type: 'DIV' }); i++; continue; }
      if (ch === '+')                    { toks.push({ type: 'ADD' }); i++; continue; }
      if (ch === '-' || ch === '\u2212') { toks.push({ type: 'SUB' }); i++; continue; }
      if (ch === '*' || ch === '\u00D7') { toks.push({ type: 'MUL' }); i++; continue; }
      if (ch === '=')                    { toks.push({ type: 'EQ'  }); i++; continue; }
      if (ch === '(')                    { toks.push({ type: 'LP'  }); i++; continue; }
      if (ch === ')')                    { toks.push({ type: 'RP'  }); i++; continue; }
      i++;
    }
    return toks;
  }

  function peek()    { return tokens[pos]; }
  function consume() { return tokens[pos++]; }
  function expect(type) {
    const tok = consume();
    if (!tok || tok.type !== type) throw new Error(`Expected ${type}, got ${tok ? tok.type : 'EOF'}`);
    return tok;
  }

  function parseExpr() {
    const left = parseSum();
    if (peek()?.type === 'EQ') { consume(); return { type: 'eq', left, right: parseSum() }; }
    return left;
  }
  function parseSum() {
    let left = parseProd();
    while (peek()?.type === 'ADD' || peek()?.type === 'SUB') {
      const op = consume().type;
      left = op === 'ADD'
        ? { type: 'add', left, right: parseProd() }
        : { type: 'sub', left, right: parseProd() };
    }
    return left;
  }
  function parseProd() {
    let left = parseUnary();
    while (peek()?.type === 'MUL') { consume(); left = { type: 'mul', left, right: parseUnary() }; }
    return left;
  }
  function parseUnary() {
    if (peek()?.type === 'SUB') { consume(); return { type: 'neg', inner: parseUnary() }; }
    return parseAtom();
  }
  function parseAtom() {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end of input');
    if (tok.type === 'NUM') {
      consume();
      // Check for / to form fraction
      if (peek()?.type === 'DIV') {
        consume();
        const q = consume();
        if (!q || q.type !== 'NUM') throw new Error('Expected denominator after /');
        if (q.p === 0) throw new Error('Denominator cannot be zero');
        // tok = p/1, q = d/1, so fraction is tok.p / q.p
        return { type: 'rat', p: tok.p, q: q.p };
      }
      return { type: 'rat', p: tok.p, q: tok.q };
    }
    if (tok.type === 'LP') { consume(); const e = parseExpr(); expect('RP'); return e; }
    throw new Error('Unexpected token: ' + tok.type);
  }

  try {
    tokens = tokenize(input.trim());
    pos = 0;
    const ast = parseExpr();
    if (pos < tokens.length) throw new Error('Unexpected token at position ' + pos);
    return { ok: true, ast };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Evaluator → exact rational { p: ℤ, q: ℤ⁺ } ─────────────────────────────
function evalRat(node) {
  switch (node.type) {
    case 'rat': { const g = gcd(Math.abs(node.p), node.q); return { p: node.p/g, q: node.q/g }; }
    case 'neg': { const r = evalRat(node.inner); return reduce({ p: -r.p, q: r.q }); }
    case 'add': {
      const l = evalRat(node.left), r = evalRat(node.right);
      return reduce({ p: l.p*r.q + r.p*l.q, q: l.q*r.q });
    }
    case 'sub': {
      const l = evalRat(node.left), r = evalRat(node.right);
      return reduce({ p: l.p*r.q - r.p*l.q, q: l.q*r.q });
    }
    case 'mul': {
      const l = evalRat(node.left), r = evalRat(node.right);
      return reduce({ p: l.p*r.p, q: l.q*r.q });
    }
    default: throw new Error('Unknown node: ' + node.type);
  }
}

function reduce(rat) {
  const g = gcd(Math.abs(rat.p), Math.abs(rat.q));
  let p = rat.p / g, q = rat.q / g;
  if (q < 0) { p = -p; q = -q; }  // keep denominator positive
  return { p, q };
}

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  if (b === 0) return a || 1;
  return gcd(b, a % b);
}

// ── Top-level compile ─────────────────────────────────────────────────────────
function compileExpr(input) {
  const r = parseRationalExpr(input);
  if (!r.ok) return { error: r.error };
  try {
    if (r.ast.type === 'eq') {
      const lhs = evalRat(r.ast.left);
      const rhs = evalRat(r.ast.right);
      const holds = lhs.p * rhs.q === lhs.q * rhs.p;
      return { isEq: true, lhs, rhs, holds };
    }
    return { isEq: false, val: evalRat(r.ast) };
  } catch (e) {
    return { error: e.message };
  }
}

// ── Natural number helpers ────────────────────────────────────────────────────
// Fully expanded — no S^n shorthand
function numToSucc(n) {
  let s = '0';
  for (let i = 0; i < n; i++) s = `S(${s})`;
  return s;
}

// Integer n → natural pair (a, b) where a − b = n
function intToNatPair(n) {
  return n >= 0 ? { a: n, b: 0 } : { a: 0, b: -n };
}

// ── KaTeX / HTML helpers ──────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function rk(latex, display = false) {
  if (typeof katex === 'undefined') return `<code>${escHtml(latex)}</code>`;
  try { return katex.renderToString(latex, { displayMode: display, throwOnError: false }); }
  catch (e) { return `<code>${escHtml(latex)}</code>`; }
}
function exprToLatex(s) {
  return String(s).replace(/×/g, ' \\times ').replace(/\s{2,}/g, ' ').trim();
}

function ratLatex(rat) {
  if (rat.q === 1) return String(rat.p);
  if (rat.p < 0)   return `-\\frac{${-rat.p}}{${rat.q}}`;
  return `\\frac{${rat.p}}{${rat.q}}`;
}

function tierDef(latex, from) {
  return `<div class="tier-def">
    <span class="tier-def-built">built from: <strong>${escHtml(from)}</strong></span>
    <div class="tier-def-eq">${rk(latex)}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// TIER II — REALS
// ℝ = Cauchy sequences over ℚ / ~
// (aₙ) ~ (bₙ)  iff  lim|aₙ − bₙ| = 0
// For a rational r, the constant sequence (r, r, r, …) is its canonical embedding.
// ═══════════════════════════════════════════════════════
function renderReals(data) {
  let h = tierDef(
    '\\mathbb{R} = \\{\\text{Cauchy sequences over }\\mathbb{Q}\\}\\big/\\!\\sim \\quad\\text{where}\\quad (a_n)\\sim(b_n) \\iff \\lim_{n\\to\\infty}|a_n - b_n| = 0',
    'ℚ'
  );
  h += '<div class="pairs-display" style="margin-top:14px;">';

  if (data.isEq) {
    const { lhs, rhs, holds } = data;
    h += realRow('LHS', lhs);
    h += realRow('RHS', rhs);

    const diff_p = lhs.p * rhs.q - rhs.p * lhs.q;
    const diff_q = lhs.q * rhs.q;
    const g = gcd(Math.abs(diff_p), diff_q);
    const rdp = diff_p / g, rdq = diff_q / g;
    const isZero = diff_p === 0;

    const diffLatex = rdp === 0
      ? '0'
      : rdq === 1 ? String(Math.abs(rdp)) : `\\frac{${Math.abs(rdp)}}{${rdq}}`;

    h += `<div class="equiv-check">
      <span class="equiv-title">Instantiating equivalence</span>
      <div class="equiv-expr" style="flex-direction:column;align-items:flex-start;gap:8px;">
        <span>${rk(`|a_n - b_n| = \\left|${ratLatex(lhs)} - ${ratLatex(rhs)}\\right| = ${diffLatex}`)}</span>
        <span>${rk(`\\lim_{n\\to\\infty} ${diffLatex} = ${isZero ? '0' : diffLatex}`)}</span>
        <span class="equiv-result ${isZero ? 'holds' : 'fails'}">${isZero ? '✓ limit = 0 — holds' : '✗ limit ≠ 0 — fails'}</span>
      </div>
    </div>`;
  } else {
    h += realRow('', data.val);
  }

  return h + '</div>';
}

function realRow(label, rat) {
  const seq = ratLatex(rat);
  return `<div class="pair-row">
    ${label ? `<span class="pair-label">${label}</span>` : ''}
    <span class="pair-val">${rk(`\\left(${seq},\\;${seq},\\;${seq},\\;\\ldots\\right)`)}</span>
    <span class="pair-arrow">→</span>
    <span class="pair-canon">constant Cauchy sequence</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// TIER III — RATIONALS
// ℚ = (ℤ × ℤ⁺) / ~   where  (p,q) ~ (r,s)  iff  p·s = q·r
// ═══════════════════════════════════════════════════════
function renderRationals(data) {
  let h = tierDef(
    '\\mathbb{Q} = (\\mathbb{Z}\\times\\mathbb{Z}^+)\\big/\\!\\sim \\quad\\text{where}\\quad (p,q)\\sim(r,s) \\iff p{\\cdot}s = q{\\cdot}r',
    'ℤ'
  );
  h += '<div class="pairs-display" style="margin-top:14px;">';

  if (data.isEq) {
    const { lhs, rhs, holds } = data;
    h += ratRow('LHS', lhs);
    h += ratRow('RHS', rhs);
    const equivLhs = lhs.p * rhs.q, equivRhs = lhs.q * rhs.p;
    h += `<div class="equiv-check">
      <span class="equiv-title">Instantiating ${rk('(p,q)\\sim(r,s) \\iff p\\cdot s = q\\cdot r')}</span>
      <div class="equiv-expr">
        ${rk(`${lhs.p}\\cdot${rhs.q} = ${lhs.q}\\cdot${rhs.p}`)}
        <span class="equiv-arrow">→</span>
        ${rk(`${equivLhs} = ${equivRhs}`)}
        <span class="equiv-result ${holds ? 'holds' : 'fails'}">${holds ? '✓ holds' : '✗ fails'}</span>
      </div>
    </div>`;
  } else {
    h += ratRow('', data.val);
  }

  return h + '</div>';
}

function ratRow(label, rat) {
  const g = gcd(Math.abs(rat.p), rat.q);
  const cp = rat.p / g, cq = rat.q / g;
  return `<div class="pair-row">
    ${label ? `<span class="pair-label">${label}</span>` : ''}
    <span class="pair-val">${rk(`(${rat.p},\\,${rat.q})`)}</span>
    <span class="pair-arrow">→</span>
    <span class="pair-canon">canonical: ${rk(`(${cp},\\,${cq})`)}</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// TIER IV — INTEGERS
// ℤ = (ℕ × ℕ) / ~   where  (a,b) ~ (c,d)  iff  a+d = b+c
// Each integer in the rational pair is expressed as a natural pair
// ═══════════════════════════════════════════════════════
function renderIntegers(data) {
  let h = tierDef(
    '\\mathbb{Z} = (\\mathbb{N}\\times\\mathbb{N})\\big/\\!\\sim \\quad\\text{where}\\quad (a,b)\\sim(c,d) \\iff a+d = b+c',
    'ℕ'
  );
  h += '<div class="pairs-display" style="margin-top:14px;">';

  if (data.isEq) {
    const { lhs, rhs, holds } = data;
    h += intRow('LHS', lhs);
    h += intRow('RHS', rhs);

    // Equivalence in this tier: each integer component shown as natural pair,
    // rational equiv lhs.p * rhs.q = lhs.q * rhs.p still holds
    const lp = intToNatPair(lhs.p), lq = intToNatPair(lhs.q);
    const rp = intToNatPair(rhs.p), rq = intToNatPair(rhs.q);
    const equivLhs = lhs.p * rhs.q, equivRhs = lhs.q * rhs.p;
    h += `<div class="equiv-check">
      <span class="equiv-title">Instantiating ${rk('(a,b)\\sim(c,d) \\iff a+d = b+c')} on each component</span>
      <div class="equiv-expr" style="flex-direction:column;align-items:flex-start;gap:6px;">
        <span>${rk(`p = (${lp.a},${lp.b}),\\; q = (${lq.a},${lq.b}),\\; r = (${rp.a},${rp.b}),\\; s = (${rq.a},${rq.b})`)}</span>
        <span>${rk(`p{\\cdot}s = ${equivLhs},\\quad q{\\cdot}r = ${equivRhs}`)}</span>
        <span class="equiv-result ${holds ? 'holds' : 'fails'}">${holds ? '✓ holds' : '✗ fails'}</span>
      </div>
    </div>`;
  } else {
    h += intRow('', data.val);
  }

  return h + '</div>';
}

function intRow(label, rat) {
  const lp = intToNatPair(rat.p), lq = intToNatPair(rat.q);
  return `<div class="pair-row">
    ${label ? `<span class="pair-label">${label}</span>` : ''}
    <span class="pair-val">${rk(`\\bigl((${lp.a},\\,${lp.b}),\\;(${lq.a},\\,${lq.b})\\bigr)`)}</span>
    <span class="pair-arrow">→</span>
    <span class="pair-canon">${rk(`p = ${lp.a}-${lp.b} = ${rat.p},\\; q = ${lq.a}-${lq.b} = ${rat.q}`)}</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// TIER V — PEANO
// ℕ via Peano axioms: 0, S(0), S(S(0)), …
// Shows each natural number as its full successor expansion,
// then proves the equivalence condition via A₀/A₁/M₀/M₁
// ═══════════════════════════════════════════════════════
function renderPeano(data) {
  let h = tierDef(
    '\\mathbb{N}: \\;0\\in\\mathbb{N},\\; \\forall n(S(n)\\in\\mathbb{N}),\\; \\forall n(S(n)\\ne 0)',
    'Peano axioms'
  );
  h += '<div class="pairs-display" style="margin-top:14px;">';

  if (data.isEq) {
    h += peanoRow('LHS', data.lhs);
    h += peanoRow('RHS', data.rhs);
  } else {
    h += peanoRow('', data.val);
  }
  h += '</div>';

  if (data.isEq) {
    h += renderMulProof(data);
  }
  return h;
}

function peanoRow(label, rat) {
  const lp = intToNatPair(rat.p), lq = intToNatPair(rat.q);
  const spA = numToSucc(lp.a), spB = numToSucc(lp.b);
  const sqA = numToSucc(lq.a), sqB = numToSucc(lq.b);
  return `<div class="pair-row" style="flex-direction:column;align-items:flex-start;gap:6px;">
    ${label ? `<span class="pair-label">${label}</span>` : ''}
    <span style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;word-break:break-all;line-height:1.9;color:var(--text);">
      ${rk(`\\Bigl(\\bigl(${spA},\\,${spB}\\bigr),\\;\\bigl(${sqA},\\,${sqB}\\bigr)\\Bigr)`)}
    </span>
  </div>`;
}

function renderMulProof(data) {
  const { lhs, rhs, holds } = data;
  const A = lhs.p, B = rhs.q, C = lhs.q, D = rhs.p;
  const AB = A * B, CD = C * D;
  const canProve = A >= 0 && B >= 0 && C >= 0 && D >= 0 && AB <= 120 && CD <= 120;

  let h = `<div class="sub-proof-header" style="margin-top:20px;">
    Instantiating ${rk(`p\\cdot s = q\\cdot r`)}: proving ${rk(`${A}\\times ${B} = ${C}\\times ${D}`)}
  </div>`;

  if (!canProve) {
    h += `<div class="proof-conclusion">
      <span class="qed-check" style="font-size:1rem;">→</span>
      <span class="qed-text">Values too large or negative for full Peano proof at this tier.</span>
    </div>`;
    return h;
  }

  const lhsSteps = proveMulLogic(A, B);
  const rhsSteps = proveMulLogic(C, D);
  const MAX = 40;

  h += `<div class="sub-proof-header">Proving ${rk(`${numToSucc(A)}\\times ${numToSucc(B)} = ${numToSucc(AB)}`)}</div>`;
  h += '<div class="logic-proof">';
  lhsSteps.slice(0, MAX).forEach((s, i) => { h += renderLogicStep(s, i); });
  if (lhsSteps.length > MAX) h += `<div class="logic-step"><span class="logic-num">⋮</span><span class="logic-formula muted">${lhsSteps.length - MAX} steps omitted</span></div>`;
  h += '</div>';

  if (A !== C || B !== D) {
    h += `<div class="sub-proof-header">Proving ${rk(`${numToSucc(C)}\\times ${numToSucc(D)} = ${numToSucc(CD)}`)}</div>`;
    h += '<div class="logic-proof">';
    rhsSteps.slice(0, MAX).forEach((s, i) => { h += renderLogicStep(s, i); });
    if (rhsSteps.length > MAX) h += `<div class="logic-step"><span class="logic-num">⋮</span><span class="logic-formula muted">${rhsSteps.length - MAX} steps omitted</span></div>`;
    h += '</div>';
  }

  h += '<div class="proof-conclusion">';
  if (holds) {
    h += `<span class="qed-check">✓</span>
      <span class="qed-text">Both sides reduce to ${numToSucc(AB)}.<br>
      <strong>The rationals are equal.</strong></span>
      <span class="qed-mark">Q.E.D.</span>`;
  } else {
    h += `<span class="qed-cross">✗</span>
      <span class="qed-text">${AB} ≠ ${CD} — <strong>the rationals are not equal.</strong></span>`;
  }
  return h + '</div>';
}

// ── Logic Proof Generators ────────────────────────────────────────────────────
function proveAddLogic(a, b) {
  const steps = [];
  let idx = 0, a1Ref = -1;
  const na = numToSucc(a);
  const instRefs = [];

  if (b > 0) {
    steps.push({ type: 'axiom', label: 'A\u2081', latex: '\\forall n,m\\in\\mathbb{N},\\; n+S(m)=S(n+m)' });
    a1Ref = idx++;
    for (let k = b; k >= 1; k--) {
      steps.push({ type: 'inst', axiom: 'A\u2081', fromRef: a1Ref,
        subst: [{ n: 'n', v: na }, { n: 'm', v: numToSucc(k-1) }],
        conclusion: `${na} + ${numToSucc(k)} = S(${na} + ${numToSucc(k-1)})` });
      instRefs.push(idx++);
    }
  }
  steps.push({ type: 'axiom', label: 'A\u2080', latex: '\\forall n\\in\\mathbb{N},\\; n+0=n' });
  const a0Ref = idx++;
  steps.push({ type: 'inst', axiom: 'A\u2080', fromRef: a0Ref,
    subst: [{ n: 'n', v: na }], conclusion: `${na} + 0 = ${na}` });
  let prevRef = idx++;
  for (let i = instRefs.length - 1; i >= 0; i--) {
    const k = b - i;
    steps.push({ type: 'subst', from1: prevRef, from2: instRefs[i],
      conclusion: `${na} + ${numToSucc(k)} = ${numToSucc(a+k)}` });
    prevRef = idx++;
  }
  return steps;
}

function proveMulLogic(m, n) {
  const steps = [];
  let idx = 0;
  const nm = numToSucc(m);
  const instRefs = [];

  if (n > 0) {
    steps.push({ type: 'axiom', label: 'M\u2081', latex: '\\forall n,m\\in\\mathbb{N},\\; n\\times S(m)=(n\\times m)+n' });
    const m1Ref = idx++;
    for (let k = n; k >= 1; k--) {
      steps.push({ type: 'inst', axiom: 'M\u2081', fromRef: m1Ref,
        subst: [{ n: 'n', v: nm }, { n: 'm', v: numToSucc(k-1) }],
        conclusion: `${nm} \\times ${numToSucc(k)} = (${nm} \\times ${numToSucc(k-1)}) + ${nm}` });
      instRefs.push(idx++);
    }
  }
  steps.push({ type: 'axiom', label: 'M\u2080', latex: '\\forall n\\in\\mathbb{N},\\; n\\times 0=0' });
  const m0Ref = idx++;
  steps.push({ type: 'inst', axiom: 'M\u2080', fromRef: m0Ref,
    subst: [{ n: 'n', v: nm }], conclusion: `${nm} \\times 0 = 0` });
  let prevRef = idx++;
  for (let i = instRefs.length - 1; i >= 0; i--) {
    const k = n - i;
    const runPrev = m*(k-1), runCurr = m*k;
    steps.push({ type: 'lemma', conclusion: `${numToSucc(runPrev)} + ${nm} = ${numToSucc(runCurr)}`, detail: 'A\u2080, A\u2081' });
    idx++;
    steps.push({ type: 'subst', from1: prevRef, from2: instRefs[i],
      conclusion: `${nm} \\times ${numToSucc(k)} = ${numToSucc(runCurr)}` });
    prevRef = idx++;
  }
  return steps;
}

function renderLogicStep(step, i) {
  let formula = '', just = '';
  switch (step.type) {
    case 'axiom':
      formula = rk(step.latex);
      just = `<span class="just-axiom">[${escHtml(step.label)}]</span>`;
      break;
    case 'inst': {
      formula = rk(exprToLatex(step.conclusion));
      const sub = step.subst.map(s => `${s.n} := ${exprToLatex(s.v)}`).join(',\\ ');
      just = `<span class="just-rule">\u2200-elim</span><span class="just-ref">(${step.fromRef+1})</span><span class="just-subst">${rk(sub)}</span>`;
      break;
    }
    case 'subst':
      formula = rk(exprToLatex(step.conclusion));
      just = `<span class="just-rule">=subst</span><span class="just-ref">(${step.from1+1})</span><span class="just-sep">into</span><span class="just-ref">(${step.from2+1})</span>`;
      break;
    case 'lemma':
      formula = rk(exprToLatex(step.conclusion));
      just = `<span class="just-rule">Lemma</span><span class="just-axiom">[${escHtml(step.detail)}]</span>`;
      break;
    default:
      formula = rk(exprToLatex(step.conclusion || step.latex || ''));
  }
  return `<div class="logic-step">
    <span class="logic-num">(${i+1})</span>
    <span class="logic-formula">${formula}</span>
    <span class="logic-just">${just}</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════════
const TIER_LABELS = { 1: 'Reals', 2: 'Rationals', 3: 'Integers', 4: 'Peano' };
const TIER_NUMS   = { 1: 'II', 2: 'III', 3: 'IV', 4: 'V' };

function runTier(tier) {
  const input = document.getElementById('expr-input').value;
  clearError();

  const data = compileExpr(input);
  if (data.error) { showError(data.error); return; }

  let html;
  if      (tier === 1) html = renderReals(data);
  else if (tier === 2) html = renderRationals(data);
  else if (tier === 3) html = renderIntegers(data);
  else                 html = renderPeano(data);

  document.getElementById('output-label').textContent =
    'Tier ' + TIER_NUMS[tier] + ' \u2014 ' + TIER_LABELS[tier];

  document.getElementById('output-empty').style.display = 'none';
  const body = document.getElementById('output-body');
  body.innerHTML = html;
  body.classList.remove('hidden');

  document.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-t' + tier).classList.add('active');
}

function showError(msg) {
  const el = document.getElementById('expr-error');
  el.textContent = 'Error: ' + msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}
function clearError() {
  const el = document.getElementById('expr-error');
  if (el) el.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('expr-input');
  input.value = '1/2 + 1/3 = 5/6';

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runTier(1); }
  });

  document.getElementById('btn-t1').addEventListener('click', () => runTier(1));
  document.getElementById('btn-t2').addEventListener('click', () => runTier(2));
  document.getElementById('btn-t3').addEventListener('click', () => runTier(3));
  document.getElementById('btn-t4').addEventListener('click', () => runTier(4));
});
