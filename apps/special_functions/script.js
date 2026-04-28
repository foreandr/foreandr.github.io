// ─── Parser ───────────────────────────────────────────────────────────────────
// Handles first-order: B*x^p*y' + C*x^q*y = 0
// Apostrophe notation only. No y'' allowed.

function parseTermCore(core) {
    // Supported cores: "", "2", "x", "x^2", "x^n", "2x", "2x^2", "2*x^2"
    if (!core) return { coeff: 1, pow: 0 };

    const cleaned = core.replace(/\*/g, '');
    const m = cleaned.match(/^(\d+\.?\d*|\.\d+)?(x(?:\^([A-Za-z]+|-?\d+))?)?$/);
    if (!m) throw new Error(`Could not parse coefficient "${core}". Use forms like 2, x, x^2, 3x^n.`);

    const coeff = m[1] !== undefined ? parseFloat(m[1]) : 1;
    if (!m[2]) return { coeff, pow: 0 };
    if (!m[3]) return { coeff, pow: 1 };

    if (/^-?\d+$/.test(m[3])) return { coeff, pow: parseInt(m[3], 10) };
    return { coeff, pow: m[3] };
}

function samePow(a, b) {
    return String(a) === String(b);
}

function latexPow(pow) {
    if (pow === 0) return '';
    if (pow === 1) return 'x';
    return `x^{${pow}}`;
}

function diffPow(a, b) {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (String(a) === String(b)) return 0;
    if (b === 0) return a;
    if (a === 0) return `-${b}`;
    return `${a}-${b}`;
}

function shiftedIndex(base, delta) {
    if (delta === 0 || delta === '0') return base;
    if (typeof delta === 'number') return delta > 0 ? `${base}+${delta}` : `${base}${delta}`;
    if (String(delta).startsWith('-')) return `${base}${delta}`;
    return `${base}+${delta}`;
}

function lowerBoundExpr(delta) {
    if (typeof delta === 'number') return String(Math.max(0, delta));
    if (delta === 0 || delta === '0') return '0';
    return `\\max(0,${delta})`;
}

function parseODE(raw) {
    let s = raw.trim().replace(/\s+/g, '');

    const eqIdx = s.indexOf('=');
    if (eqIdx === -1) throw new Error("No '=' found. Write the equation as ... = 0");
    const rhs = s.slice(eqIdx + 1);
    if (rhs !== '0') throw new Error("Right-hand side must be 0  (e.g.  y' + y = 0)");
    s = s.slice(0, eqIdx);

    if (s.includes("y''")) throw new Error("This tool handles first-order ODEs only (no y''). Try  y' + y = 0");

    let B = 0, C = 0;
    let p = 0, q = 0;
    let seenPrime = false, seenY = false;

    if (s[0] !== '-') s = '+' + s;

    const terms = s.match(/[+-][^+-]+/g) || [];
    for (const t of terms) {
        const sign = t[0] === '-' ? -1 : 1;
        const body = t.slice(1);
        const isPrime = body.endsWith("y'");
        const isY = !isPrime && body.endsWith('y');

        if (!isPrime && !isY) {
            throw new Error(`Unrecognized term "${t}". Use only y' and y terms.`);
        }

        const core = body.slice(0, isPrime ? -2 : -1);
        const parsed = parseTermCore(core);
        const val = sign * parsed.coeff;

        if (isPrime) {
            if (!seenPrime) {
                p = parsed.pow;
                seenPrime = true;
            } else if (!samePow(p, parsed.pow)) {
                throw new Error("Use one x-power for y' terms (combine like powers first).");
            }
            B += val;
        } else {
            if (!seenY) {
                q = parsed.pow;
                seenY = true;
            } else if (!samePow(q, parsed.pow)) {
                throw new Error("Use one x-power for y terms (combine like powers first).");
            }
            C += val;
        }
    }

    if (B === 0) throw new Error("Could not find a y' term. Make sure to include y'.");
    return { B, C, p, q };
}

// ─── LaTeX coefficient helper ─────────────────────────────────────────────────
// Returns a LaTeX string for a coefficient in front of a term.
// sign: overall sign already embedded in val.
// isFirst: whether this is the first term in an expression (omit leading +).
function latexCoeff(val, isFirst) {
    if (val === 1)  return isFirst ? ''   : '+';
    if (val === -1) return isFirst ? '-'  : '-';
    if (val > 0)    return isFirst ? String(val)  : '+' + String(val);
    return String(val); // negative already carries minus
}

function latexNumber(val) {
    if (!Number.isFinite(val)) return String(val);
    const cleaned = Math.abs(val) < 1e-12 ? 0 : val;
    if (Number.isInteger(cleaned)) return String(cleaned);
    return String(parseFloat(cleaned.toPrecision(10)));
}

function powBaseLatex(val) {
    const s = latexNumber(val);
    if (s === '1') return '1';
    if (s === '-1') return '(-1)';
    return `\\left(${s}\\right)`;
}

function expArgLatex(val) {
    if (val === 1) return 'x';
    if (val === -1) return '-x';
    return `${latexNumber(val)}x`;
}

function gcdInt(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
        const t = b;
        b = a % b;
        a = t;
    }
    return a || 1;
}

function simplifyFraction(num, den) {
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
        return { num, den, exactInt: false };
    }
    if (Number.isInteger(num) && Number.isInteger(den)) {
        const g = gcdInt(num, den);
        let n = num / g;
        let d = den / g;
        if (d < 0) {
            n = -n;
            d = -d;
        }
        return { num: n, den: d, exactInt: true };
    }
    if (den < 0) {
        num = -num;
        den = -den;
    }
    return { num, den, exactInt: false };
}

function fracPowBaseLatex(num, den, exactInt) {
    if (den === 1) return powBaseLatex(num);
    if (exactInt) return `\\left(\\dfrac{${num}}{${den}}\\right)`;
    return powBaseLatex(num / den);
}

function fracExpArgLatex(num, den, exactInt) {
    if (den === 1) return expArgLatex(num);
    if (exactInt) {
        if (num === 1) return `\\dfrac{x}{${den}}`;
        if (num === -1) return `-\\dfrac{x}{${den}}`;
        return `\\dfrac{${num}x}{${den}}`;
    }
    return expArgLatex(num / den);
}

function latexApprox(val) {
    if (!Number.isFinite(val)) return val > 0 ? '\\infty' : '-\\infty';
    if (val === 0) return '0';
    const abs = Math.abs(val);
    if (abs >= 1e6 || abs < 1e-5) {
        const exp = Math.floor(Math.log10(abs));
        const mant = val / Math.pow(10, exp);
        const m = latexNumber(parseFloat(mant.toPrecision(6)));
        return `${m}\\times 10^{${exp}}`;
    }
    return latexNumber(parseFloat(val.toPrecision(10)));
}

function closestConstants(value, topN = 5) {
    if (!Number.isFinite(value)) return [];
    const constants = [
        { label: '\\pi', value: Math.PI },
        { label: '\\dfrac{1}{\\pi}', value: 1 / Math.PI },
        { label: '\\sqrt{\\pi}', value: Math.sqrt(Math.PI) },
        { label: '\\dfrac{1}{\\sqrt{\\pi}}', value: 1 / Math.sqrt(Math.PI) },
        { label: 'e', value: Math.E },
        { label: '\\sqrt{e}', value: Math.sqrt(Math.E) },
        { label: '\\dfrac{1}{e}', value: 1 / Math.E },
        { label: '\\ln 2', value: Math.log(2) },
        { label: '\\sqrt{2}', value: Math.sqrt(2) },
        { label: '\\sqrt{3}', value: Math.sqrt(3) },
        { label: '\\varphi', value: (1 + Math.sqrt(5)) / 2 },
        { label: 'G', value: 0.915965594177219 },   // Catalan
        { label: '\\zeta(3)', value: 1.202056903159594 } // Apery
    ];

    return constants
        .map(c => {
            const absErr = Math.abs(value - c.value);
            const relErr = absErr / Math.max(1, Math.abs(c.value));
            return { ...c, absErr, relErr };
        })
        .sort((a, b) => a.relErr - b.relErr)
        .slice(0, topN);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const reverseTargetState = {
    active: false,
    latex: null,
    value: null,
    targetKey: null,
    xStar: 1,
    a0: 1,
    alpha: null,
    mode: 'canonical'
};

let targetConstantChoices = [];
let targetConstantUiBound = false;

function parseTargetConstantsTable(raw) {
    if (typeof raw !== 'string') return [];
    const rows = raw.split(/\r?\n/);
    const parsed = [];

    for (const rawRow of rows) {
        const row = rawRow.trim();
        if (!row || row.startsWith('#')) continue;

        const parts = row.split('|');
        if (parts.length < 4) continue;

        const key = parts[0].trim();
        const title = parts[1].trim();
        const latex = parts[2].trim();
        const value = Number(parts.slice(3).join('|').trim());

        if (!key || !title || !latex || !Number.isFinite(value)) continue;
        parsed.push({ key, title, latex, value });
    }

    return parsed;
}

function exactValueOverride(key) {
    const phi = (1 + Math.sqrt(5)) / 2;
    const map = {
        euler_number: Math.E,
        pi: Math.PI,
        pi_plus_e: Math.PI + Math.E,
        sqrt_pi: Math.sqrt(Math.PI),
        sqrt_e: Math.sqrt(Math.E),
        inv_e: 1 / Math.E,
        inv_pi: 1 / Math.PI,
        reciprocal_pi_alt: 1 / Math.PI,
        reciprocal_pi_squared: 1 / (Math.PI * Math.PI),
        ln_2: Math.log(2),
        ln_3: Math.log(3),
        ln_5: Math.log(5),
        ln_10: Math.log(10),
        pi_squared: Math.PI * Math.PI,
        e_squared: Math.E * Math.E,
        pi_times_e: Math.PI * Math.E,
        pi_over_e: Math.PI / Math.E,
        e_over_pi: Math.E / Math.PI,
        log2_e: Math.log2(Math.E),
        log10_e: Math.log10(Math.E),
        golden_ratio: phi,
        golden_ratio_squared: phi * phi,
        inv_golden_ratio: 1 / phi
    };
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
}

function loadTargetConstantChoices() {
    const parsed = parseTargetConstantsTable(window.TARGET_CONSTANTS_TABLE || '');
    if (parsed.length > 0) {
        return parsed.map(item => {
            const override = exactValueOverride(item.key);
            return override === null ? item : { ...item, value: override };
        });
    }

    return [
        { key: 'euler_number', title: "Euler's Number", latex: 'e', value: Math.E },
        { key: 'pi', title: 'Pi', latex: '\\pi', value: Math.PI },
        { key: 'sqrt_pi', title: 'Root of Pi', latex: '\\sqrt{\\pi}', value: Math.sqrt(Math.PI) },
        { key: 'sqrt_e', title: 'Root of e', latex: '\\sqrt{e}', value: Math.sqrt(Math.E) },
        { key: 'inv_pi', title: 'Reciprocal of Pi', latex: '\\dfrac{1}{\\pi}', value: 1 / Math.PI }
    ];
}

function escapeHtml(raw) {
    return String(raw)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function specialTargetMeta(key) {
    if (key === 'ln_n') {
        return { key: 'ln_n', title: 'Natural log of n', latex: '\\ln(n)', value: null };
    }
    if (key === 'custom') {
        return { key: 'custom', title: 'Custom numeric K', latex: 'K', value: null };
    }
    return null;
}

function targetDisplayMeta(key) {
    return targetConstantMeta(key) || specialTargetMeta(key);
}

function closeTargetConstantMenu() {
    const wrap = document.getElementById('target-constant-ui');
    const menu = document.getElementById('target-constant-menu');
    const trigger = document.getElementById('target-constant-trigger');
    if (!wrap || !menu || !trigger) return;

    menu.classList.add('hidden');
    wrap.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
}

function openTargetConstantMenu() {
    const wrap = document.getElementById('target-constant-ui');
    const menu = document.getElementById('target-constant-menu');
    const trigger = document.getElementById('target-constant-trigger');
    if (!wrap || !menu || !trigger) return;

    menu.classList.remove('hidden');
    wrap.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
}

function renderTargetConstantTrigger() {
    const select = document.getElementById('target-constant');
    const trigger = document.getElementById('target-constant-trigger');
    if (!select || !trigger) return;

    const meta = targetDisplayMeta(select.value);
    if (!meta) {
        trigger.textContent = 'Select target constant';
        return;
    }

    const valueText = meta.value === null
        ? ''
        : `<span class="math-select-value">~${escapeHtml(formatInputNumber(meta.value))}</span>`;

    trigger.innerHTML = `<span class="math-select-main">
<span class="math-select-title">${escapeHtml(meta.title)}</span>
<span class="math-select-formula">\\(${meta.latex}\\)</span>
</span>${valueText}<span class="math-select-caret">▾</span>`;

    renderAll();
}

function renderTargetConstantMenu() {
    const select = document.getElementById('target-constant');
    const menu = document.getElementById('target-constant-menu');
    if (!select || !menu) return;

    const options = [
        ...targetConstantChoices,
        specialTargetMeta('ln_n'),
        specialTargetMeta('custom')
    ];

    menu.innerHTML = '';
    for (const item of options) {
        if (!item) continue;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'math-select-option';
        if (item.key === select.value) btn.classList.add('active');

        const valueText = item.value === null
            ? ''
            : `<span class="math-select-option-value">~${escapeHtml(formatInputNumber(item.value))}</span>`;

        btn.innerHTML = `<span class="math-select-option-title">${escapeHtml(item.title)}</span>
<span class="math-select-option-formula">\\(${item.latex}\\)</span>
${valueText}`;

        btn.addEventListener('click', () => {
            if (select.value !== item.key) {
                select.value = item.key;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                renderTargetConstantTrigger();
                renderTargetConstantMenu();
            }
            closeTargetConstantMenu();
        });

        menu.appendChild(btn);
    }

    renderAll();
}

function syncTargetConstantUi() {
    renderTargetConstantMenu();
    renderTargetConstantTrigger();
}

function bindTargetConstantUi() {
    if (targetConstantUiBound) return;

    const wrap = document.getElementById('target-constant-ui');
    const trigger = document.getElementById('target-constant-trigger');
    const menu = document.getElementById('target-constant-menu');
    if (!wrap || !trigger || !menu) return;

    trigger.addEventListener('click', () => {
        if (menu.classList.contains('hidden')) {
            openTargetConstantMenu();
        } else {
            closeTargetConstantMenu();
        }
    });

    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) {
            closeTargetConstantMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeTargetConstantMenu();
    });

    targetConstantUiBound = true;
}

function populateTargetConstantSelect() {
    const select = document.getElementById('target-constant');
    if (!select) return;

    const previous = select.value;
    targetConstantChoices = loadTargetConstantChoices();
    select.innerHTML = '';

    for (const item of targetConstantChoices) {
        const opt = document.createElement('option');
        opt.value = item.key;
        opt.textContent = `${item.title} (~${formatInputNumber(item.value)})`;
        opt.title = item.latex;
        select.appendChild(opt);
    }

    const lnOpt = document.createElement('option');
    lnOpt.value = 'ln_n';
    lnOpt.textContent = 'Natural log of n, ln(n)';
    select.appendChild(lnOpt);

    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = 'Custom numeric K';
    select.appendChild(customOpt);

    if (targetConstantChoices.some(c => c.key === previous) || previous === 'ln_n' || previous === 'custom') {
        select.value = previous;
    } else if (targetConstantChoices.some(c => c.key === 'euler_number')) {
        select.value = 'euler_number';
    } else if (targetConstantChoices.length > 0) {
        select.value = targetConstantChoices[0].key;
    } else {
        select.value = 'custom';
    }

    bindTargetConstantUi();
    syncTargetConstantUi();
}

function targetConstantMeta(key) {
    return targetConstantChoices.find(item => item.key === key) || null;
}

function getDerivationMode() {
    const mode = document.getElementById('derivation-mode');
    return mode ? mode.value : 'scaled_first_order';
}

function resolveTargetSelectionFromUI() {
    const select = document.getElementById('target-constant');
    const custom = document.getElementById('target-custom');
    const lnNInput = document.getElementById('target-ln-n');
    if (!select) {
        return { ok: false, error: 'Target selector not found.' };
    }

    if (select.value === 'custom') {
        const K = Number((custom?.value || '').trim());
        if (!Number.isFinite(K) || K === 0) {
            return { ok: false, error: 'Enter a non-zero real target constant K.' };
        }
        return { ok: true, key: 'custom', value: K, latex: latexApprox(K) };
    }

    if (select.value === 'ln_n') {
        const nVal = Number((lnNInput?.value || '').trim());
        if (!Number.isFinite(nVal) || nVal <= 0) {
            return { ok: false, error: 'For ln(n), enter n > 0.' };
        }
        const K = Math.log(nVal);
        return {
            ok: true,
            key: 'ln_n',
            value: K,
            latex: `\\ln\\!\\left(${latexNumber(nVal)}\\right)`
        };
    }

    const meta = targetConstantMeta(select.value);
    if (!meta) {
        return { ok: false, error: 'Choose a valid target constant from the list.' };
    }
    return { ok: true, key: meta.key, value: meta.value, latex: meta.latex };
}

function resolveReverseScalars() {
    const xInput = document.getElementById('target-x');
    const a0Input = document.getElementById('target-a0');
    const xStar = Number((xInput?.value || '').trim());
    const a0 = Number((a0Input?.value || '').trim());

    if (!Number.isFinite(a0) || a0 === 0) {
        return { ok: false, error: 'Enter a non-zero initial value a_0.' };
    }
    if (!Number.isFinite(xStar) || xStar === 0) {
        return { ok: false, error: 'Choose x* != 0 for reverse solving.' };
    }
    return { ok: true, xStar, a0 };
}

function targetLatexAtom(rawLatex) {
    const text = String(rawLatex || '').trim();
    if (!text) return 'K';
    if (!text.includes('=')) return text;
    return text.split('=')[0].trim() || 'K';
}

function formatInputNumber(val) {
    if (!Number.isFinite(val)) return '0';
    const cleaned = Math.abs(val) < 1e-12 ? 0 : val;
    return String(parseFloat(cleaned.toPrecision(12)));
}

function parseNumberToken(raw) {
    const token = String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[−–]/g, '-')
        .replace(/π/g, 'pi');
    if (!token) return null;

    if (token === 'pi' || token === '\\pi') return Math.PI;
    if (token === 'e') return Math.E;

    const frac = token.match(/^([+-]?\d*\.?\d+)\s*\/\s*([+-]?\d*\.?\d+)$/);
    if (frac) {
        const num = Number(frac[1]);
        const den = Number(frac[2]);
        if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return NaN;
        return num / den;
    }

    const val = Number(token);
    if (!Number.isFinite(val)) return NaN;
    return val;
}

function parseShiftList(raw) {
    const text = String(raw || '').trim();
    if (!text) return [];
    const parts = text.split(',').map(s => s.trim()).filter(Boolean);
    const out = [];
    for (const p of parts) {
        const val = parseNumberToken(p);
        if (val === null || !Number.isFinite(val)) {
            return { error: `Could not parse shift "${p}". Use numbers like 1/2, -3, 2.25, pi.` };
        }
        out.push(val);
    }
    return out;
}

function nPlusShiftExprLatex(shift) {
    if (Math.abs(shift) < 1e-14) return 'n';
    const absLatex = latexNumberPreferFraction(Math.abs(shift));
    if (shift > 0) return `n+${absLatex}`;
    return `n-${absLatex}`;
}

function linearFactorProductLatex(shifts) {
    if (!shifts || shifts.length === 0) return '1';
    return shifts.map(s => `\\left(${nPlusShiftExprLatex(s)}\\right)`).join('');
}

function pochhammerProductLatex(shifts) {
    if (!shifts || shifts.length === 0) return '1';
    return shifts.map(s => `\\left(${latexNumberPreferFraction(s)}\\right)_n`).join('');
}

function gammaRatioProductLatex(shifts) {
    if (!shifts || shifts.length === 0) return '1';
    return shifts
        .map(s => `\\dfrac{\\Gamma\\!\\left(${nPlusShiftExprLatex(s)}\\right)}{\\Gamma\\!\\left(${latexNumberPreferFraction(s)}\\right)}`)
        .join('');
}

function hyperParamListLatex(shifts) {
    if (!shifts || shifts.length === 0) return '';
    return shifts.map(s => latexNumberPreferFraction(s)).join(',');
}

function latexNumberPreferFraction(val, maxDen = 256, relTol = 1e-12) {
    if (!Number.isFinite(val)) return latexNumber(val);
    if (Math.abs(val) < 1e-14) return '0';
    if (Number.isInteger(val)) return String(val);

    const approx = rationalApprox(val, maxDen);
    const rat = approx.p / approx.q;
    const err = Math.abs(val - rat);
    const tol = relTol * Math.max(1, Math.abs(val));
    if (err <= tol) {
        const simp = simplifyFraction(approx.p, approx.q);
        if (simp.den === 1) return String(simp.num);
        return `\\dfrac{${simp.num}}{${simp.den}}`;
    }

    return latexNumber(val);
}

function approximateLiftedSeries(a0, lambda, x, alphaShifts, betaShifts, terms = 80) {
    let an = a0;
    let sum = a0;
    for (let n = 0; n < terms; n++) {
        let ratio = lambda * x / (n + 1);
        for (const a of alphaShifts) ratio *= (n + a);
        for (const b of betaShifts) ratio /= (n + b);
        an *= ratio;
        if (!Number.isFinite(an) || !Number.isFinite(sum + an)) {
            return { sum: NaN, termsUsed: n + 1 };
        }
        sum += an;
    }
    return { sum, termsUsed: terms + 1 };
}

function rationalApprox(x, maxDen = 200) {
    let bestP = Math.round(x);
    let bestQ = 1;
    let bestErr = Math.abs(x - bestP);
    for (let q = 1; q <= maxDen; q++) {
        const p = Math.round(x * q);
        const err = Math.abs(x - (p / q));
        if (err < bestErr) {
            bestErr = err;
            bestP = p;
            bestQ = q;
        }
    }
    return { p: bestP, q: bestQ, err: bestErr };
}

function formatCoeffPow(absCoeff, pow) {
    const p = Number.isInteger(pow) ? pow : 0;
    const coeff = absCoeff === 1 ? '' : formatInputNumber(absCoeff);
    let xPart = '';
    if (p === 1) xPart = 'x';
    else if (p !== 0) xPart = `x^${p}`;
    return `${coeff}${xPart}`;
}

function formatODEFromParams(B, C, xPow) {
    const bAbs = Math.abs(B);
    const bCoeff = formatCoeffPow(bAbs, xPow);
    const bTerm = `${bCoeff}y'`;
    const first = B < 0 ? `-${bTerm}` : bTerm;

    if (Math.abs(C) < 1e-15) return `${first} = 0`;

    const cSign = C >= 0 ? '+' : '-';
    const cCoeff = formatCoeffPow(Math.abs(C), xPow);
    return `${first} ${cSign} ${cCoeff}y = 0`;
}

// ─── Bessel/modified-Bessel series evaluators ─────────────────────────────────
// J_0(z) = sum_{n=0}^inf (-1)^n (z/2)^{2n} / (n!)^2
// I_0(z) = sum_{n=0}^inf (z/2)^{2n} / (n!)^2
function besselJ0(z, terms = 120) {
    let sum = 0;
    let term = 1;
    const z2over4 = -(z * z) / 4;
    sum = 1;
    for (let n = 1; n < terms; n++) {
        term *= z2over4 / (n * n);
        sum += term;
        if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
    }
    return sum;
}

function besselI0(z, terms = 120) {
    let sum = 0;
    let term = 1;
    const z2over4 = (z * z) / 4;
    sum = 1;
    for (let n = 1; n < terms; n++) {
        term *= z2over4 / (n * n);
        sum += term;
        if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
    }
    return sum;
}

// Solve f(lambda) = target using bisection + Newton on [lo, hi]
function solveMonotone(f, target, lo, hi, iters = 80) {
    let flo = f(lo) - target;
    let fhi = f(hi) - target;
    if (flo * fhi > 0) return null;
    let mid = (lo + hi) / 2;
    for (let i = 0; i < iters; i++) {
        mid = (lo + hi) / 2;
        const fm = f(mid) - target;
        if (Math.abs(fm) < 1e-15 * Math.max(1, Math.abs(target))) break;
        if (flo * fm <= 0) { hi = mid; fhi = fm; }
        else { lo = mid; flo = fm; }
    }
    return mid;
}

class ComplexEngine {
    constructor({ targetKey, targetLatex, targetValue, xStar, a0 }) {
        this.targetKey = targetKey || '';
        this.targetLatex = targetLatex || 'K';
        this.targetValue = targetValue;
        this.xStar = xStar;
        this.a0 = a0;
    }

    // Solve for lambda such that a0 * F0(lambda * xStar) = K
    // where F0 is either I_0 (growth) or J_0 (oscillatory).
    // Returns { lambda, isOscillatory }
    solveForLambda() {
        const ratio = this.targetValue / this.a0; // must be > 0
        const xStar = this.xStar;

        // I_0 is monotone increasing for lambda > 0, I_0(0) = 1.
        // If ratio >= 1, use I_0: I_0(lambda * xStar) = ratio.
        if (ratio >= 1) {
            // I_0(z) grows without bound. Find z such that I_0(z) = ratio.
            // Bracket: I_0(0) = 1, I_0(large) >> ratio.
            const f = (lam) => besselI0(lam * Math.abs(xStar));
            // Find upper bracket
            let hi = 1;
            while (f(hi) < ratio && hi < 1e8) hi *= 2;
            if (f(hi) < ratio) return null;
            const lambda = solveMonotone(f, ratio, 0, hi);
            return lambda !== null ? { lambda, isOscillatory: false } : null;
        }

        // ratio < 1 and > 0. J_0 oscillates; J_0(0)=1, first zero ~2.4048.
        // If ratio is between J_0(first_zero_region) and 1, use J_0 on [0, first_zero].
        // J_0 is monotone decreasing on [0, j_{0,1}] ~ [0, 2.4048]
        const J0_first_zero = 2.4048255577;
        const f = (lam) => besselJ0(lam * Math.abs(xStar));
        const fAtFirstZero = f(J0_first_zero / Math.abs(xStar));
        if (ratio >= fAtFirstZero) {
            // ratio is in (J_0(j01/xStar), 1): monotone branch
            const lambda = solveMonotone(f, ratio, 0, J0_first_zero / Math.abs(xStar));
            return lambda !== null ? { lambda, isOscillatory: true } : null;
        }

        // ratio < J_0(j01/xStar): try searching further oscillatory branches
        // Use the next monotone piece [j01, j02] ~ [2.4048, 5.5201], where J_0 goes -0.4 to ~0.3
        const J0_second_zero = 5.5200781103;
        const f2lo = f(J0_first_zero / Math.abs(xStar));
        const f2hi = f(J0_second_zero / Math.abs(xStar));
        if (ratio >= Math.min(f2lo, f2hi) && ratio <= Math.max(f2lo, f2hi)) {
            const lo2 = J0_first_zero / Math.abs(xStar);
            const hi2 = J0_second_zero / Math.abs(xStar);
            const lambda = solveMonotone(f, ratio, lo2, hi2);
            return lambda !== null ? { lambda, isOscillatory: true } : null;
        }

        // Fallback: just use I_0 anyway with ratio, even if < 1 (still I_0 works for ratio in (0,1) trivially since I_0(0)=1 > ratio).
        // I_0 decreases as... wait, I_0 is always >= 1 for real z. So if ratio < 1, I_0 won't work.
        // Best fallback: report failure.
        return null;
    }

    buildSteps() {
        const result = this.solveForLambda();
        const xStarLatex = latexNumberPreferFraction(this.xStar);
        const a0Latex = latexNumberPreferFraction(this.a0);
        const targetExprLatex = targetLatexAtom(this.targetLatex);
        const ratio = this.targetValue / this.a0;
        const ratioLatex = `\\dfrac{${targetExprLatex}}{${a0Latex}}`;

        if (!result) {
            // Fallback: show symbolic structure without numeric lambda
            return this._buildSymbolicFallback(xStarLatex, a0Latex, targetExprLatex, ratioLatex, ratio);
        }

        const { lambda, isOscillatory } = result;
        const lambdaLatex = latexNumberPreferFraction(lambda);
        const lambdaSqLatex = latexNumberPreferFraction(lambda * lambda);
        const lambdaSqOver4Latex = latexNumberPreferFraction(lambda * lambda / 4);
        const lx = lambda * this.xStar;
        const lxLatex = latexNumberPreferFraction(lx);
        const lxSqLatex = latexNumberPreferFraction(lx * lx);
        const lxSqOver4Latex = latexNumberPreferFraction(lx * lx / 4);

        // ODE: x^2 y'' + x y' [+-] lambda^2 x^2 y = 0
        // with actual numeric lambda^2 substituted
        const odeSign = isOscillatory ? '+' : '-';
        const odeInput = isOscillatory
            ? `x^2y'' + xy' + ${latexNumber(lambda*lambda)}x^2y = 0`
            : `x^2y'' + xy' - ${latexNumber(lambda*lambda)}x^2y = 0`;

        // ODE displayed — all raw algebra, no words
        const odeDisplayLatex = isOscillatory
            ? `x^2y''+xy'+${lambdaSqLatex}x^2y=0`
            : `x^2y''+xy'-${lambdaSqLatex}x^2y=0`;

        // Coefficients series: u_n = a_0 * (+-1)^n * (lambda/2)^{2n} / (n!)^2
        // For I_0: u_n = a_0 * (lambda^2/4)^n / (n!)^2
        // For J_0: u_n = a_0 * (-1)^n * (lambda^2/4)^n / (n!)^2
        const signStr = isOscillatory ? '(-1)^n' : '';
        const lSqO4n = isOscillatory
            ? `(-1)^n\\left(${lambdaSqOver4Latex}\\right)^n`
            : `\\left(${lambdaSqOver4Latex}\\right)^n`;

        // Explicit partial series at x*
        const partialTerms = this._partialSeriesLatex(lambda, this.xStar, isOscillatory, 4);
        const partialFull = this._partialSeriesLatex(lambda, this.xStar, isOscillatory, 6);

        // The four-term series kernel for y(x)
        const seriesKernelX = this._seriesKernelLatex(lambda, isOscillatory, 'x', 4);

        return {
            step1: `\\[
  y(x)=\\sum_{n=0}^{\\infty}u_n\\,x^{2n},\\qquad u_0=${a0Latex}
\\]`,
            step2: `\\[
  y'(x)=\\sum_{n=1}^{\\infty}2n\\,u_n\\,x^{2n-1},
  \\qquad
  y''(x)=\\sum_{n=1}^{\\infty}2n(2n-1)\\,u_n\\,x^{2n-2}
\\]`,
            step3Prose: `Substitute into \\(${odeDisplayLatex}\\):`,
            step3: `\\[
  x^2\\sum_{n=1}^{\\infty}2n(2n-1)u_n x^{2n-2}
  +x\\sum_{n=1}^{\\infty}2nu_n x^{2n-1}
  ${odeSign}${lambdaSqLatex}\\,x^2\\sum_{n=0}^{\\infty}u_n x^{2n}=0
\\]
\\[
  \\sum_{n=1}^{\\infty}2n(2n-1)u_n x^{2n}
  +\\sum_{n=1}^{\\infty}2nu_n x^{2n}
  ${odeSign}${lambdaSqLatex}\\sum_{n=0}^{\\infty}u_n x^{2n+2}=0
\\]
\\[
  \\sum_{n=1}^{\\infty}\\bigl[2n(2n-1)+2n\\bigr]u_n x^{2n}
  ${odeSign}${lambdaSqLatex}\\sum_{n=0}^{\\infty}u_n x^{2n+2}=0
\\]
\\[
  \\sum_{n=1}^{\\infty}4n^2\\,u_n\\,x^{2n}
  ${odeSign}${lambdaSqLatex}\\sum_{n=0}^{\\infty}u_n\\,x^{2n+2}=0
\\]`,
            step4Prose: `Shift the second sum \\(n\\to n-1\\) so both run in \\(x^{2n}\\):`,
            step4: `\\[
  \\sum_{n=1}^{\\infty}4n^2\\,u_n\\,x^{2n}
  ${odeSign}${lambdaSqLatex}\\sum_{n=1}^{\\infty}u_{n-1}\\,x^{2n}=0
\\]
\\[
  \\sum_{n=1}^{\\infty}\\Bigl[4n^2\\,u_n${odeSign}${lambdaSqLatex}\\,u_{n-1}\\Bigr]x^{2n}=0
\\]`,
            step5: `\\[
  4n^2\\,u_n${odeSign}${lambdaSqLatex}\\,u_{n-1}=0,\\qquad n\\ge 1
\\]
\\[
  4n^2\\,u_n=${isOscillatory ? `-${lambdaSqLatex}` : `${lambdaSqLatex}`}\\,u_{n-1}
\\]`,
            step6Prose: `Solve for \\(u_n/u_{n-1}\\):`,
            step6: `\\[
  \\dfrac{u_n}{u_{n-1}}=${isOscillatory ? `-\\dfrac{${lambdaSqLatex}}{4n^2}` : `\\dfrac{${lambdaSqLatex}}{4n^2}`},\\qquad n\\ge 1
\\]
\\[
  \\dfrac{u_n}{u_{n-1}}=${isOscillatory ? `-\\dfrac{${lambdaSqOver4Latex}}{n^2}` : `\\dfrac{${lambdaSqOver4Latex}}{n^2}`},\\qquad n\\ge 1
\\]`,
            step7Prose: `Unroll the recurrence from \\(u_0=${a0Latex}\\):`,
            step7: `\\[
  u_n=${a0Latex}\\,\\prod_{k=1}^{n}${isOscillatory ? `\\left(-\\dfrac{${lambdaSqOver4Latex}}{k^2}\\right)` : `\\dfrac{${lambdaSqOver4Latex}}{k^2}`}
\\]
\\[
  u_n=${a0Latex}\\cdot\\dfrac{${isOscillatory ? `(-1)^n` : ``}\\left(${lambdaSqOver4Latex}\\right)^n}{(n!)^2}
\\]
\\[
  u_n=${a0Latex}\\cdot\\dfrac{${lSqO4n}}{(n!)^2}
\\]
\\[
  u_n=${a0Latex}\\cdot\\dfrac{${isOscillatory ? `(-1)^n` : ``}\\left(${lambdaSqOver4Latex}\\right)^n\\,\\Gamma(1)^2}{\\Gamma(n+1)^2}
\\]
\\[
  u_n=${a0Latex}\\cdot\\dfrac{${lSqO4n}}{\\left[(1)_n\\right]^2}
\\]`,
            step8Prose: `Substitute back into the series \\(y(x)=\\sum_{n=0}^{\\infty}u_n x^{2n}\\):`,
            step8: `\\[
  y(x)=${a0Latex}\\sum_{n=0}^{\\infty}\\dfrac{${lSqO4n}}{(n!)^2}\\,x^{2n}
\\]
\\[
  y(x)=${a0Latex}\\sum_{n=0}^{\\infty}\\dfrac{${isOscillatory ? `(-1)^n` : ``}\\left(${lambdaLatex}\\,x\\right)^{2n}}{4^n(n!)^2}
\\]
\\[
  y(x)=${a0Latex}+${seriesKernelX}+\\cdots
\\]
\\[
  y(${xStarLatex})=${a0Latex}\\sum_{n=0}^{\\infty}\\dfrac{${isOscillatory ? `(-1)^n` : ``}\\left(${lambdaLatex}\\cdot${xStarLatex}\\right)^{2n}}{4^n(n!)^2}
\\]`,
            step9Prose: `Evaluate at \\(x_*=${xStarLatex}\\) and verify the series sums to \\(${targetExprLatex}\\):`,
            step9: `\\[
  K=${targetExprLatex}\\approx${latexApprox(this.targetValue)},\\quad
  \\lambda=${lambdaLatex},\\quad
  \\lambda x_*=${lxLatex}
\\]
\\[
  y(${xStarLatex})=${a0Latex}\\sum_{n=0}^{\\infty}\\dfrac{${isOscillatory ? `(-1)^n` : ``}\\left(${lxLatex}\\right)^{2n}}{4^n(n!)^2}
\\]
${this._expandedSeriesLatex(lambda, this.xStar, isOscillatory, a0Latex, lxLatex, 4)}
\\[
  y(${xStarLatex})=${targetExprLatex}
\\]`,
            odeInput,
            odeDisplayLatex
        };
    }

    // Expanded aligned block: each term shown as structured fraction = decimal, then running sum
    _expandedSeriesLatex(lambda, xVal, isOscillatory, a0Latex, lxLatex, count) {
        const lx = lambda * Math.abs(xVal);
        const lxSqO4 = lx * lx / 4;
        let lines = [];
        let runningSum = 1; // n=0 term is always 1
        let termNum = 1;
        let denom = 1;

        // n=0 line
        lines.push(`  \\dfrac{1}{1} &= 1`);

        for (let n = 1; n <= count; n++) {
            termNum *= lxSqO4;
            denom *= n * n;
            const coeff = termNum / denom; // magnitude
            const signed = isOscillatory ? (n % 2 === 1 ? -coeff : coeff) : coeff;
            runningSum += signed;

            const signStr = isOscillatory ? (n % 2 === 1 ? '-' : '+') : '+';
            const lxSqO4Latex = latexNumberPreferFraction(lxSqO4);
            const denomLatex = `${denom}`;
            const numLatex = latexNumberPreferFraction(Math.pow(lxSqO4, n));
            const valLatex = latexApprox(Math.abs(signed));
            const partialLatex = latexApprox(runningSum);

            lines.push(`  ${signStr}\\dfrac{\\left(${lxSqO4Latex}\\right)^{${n}}}{${denomLatex}} &= ${signStr}${valLatex} \\quad\\Rightarrow\\quad S_{${n}}=${partialLatex}`);
        }

        const body = lines.join('\\\\\n');
        return `\\[\\begin{aligned}\n${body}\n\\end{aligned}\\]`;
    }

    // Build a latex string of the first `count` non-trivial terms in the series evaluated at x=xVal
    _partialSeriesLatex(lambda, xVal, isOscillatory, count) {
        let out = '';
        const lx = lambda * Math.abs(xVal);
        const lxSqO4 = lx * lx / 4;
        let termNum = 1;
        let denom = 1;
        for (let n = 1; n <= count; n++) {
            termNum *= lxSqO4;
            denom *= n * n;
            const coeff = termNum / denom;
            const sign = (isOscillatory && n % 2 === 1) ? '-' : '+';
            const coeffLatex = latexNumberPreferFraction(coeff);
            out += `${sign}${coeffLatex}`;
        }
        return out;
    }

    // Series kernel for symbolic x: first `count` terms after u_0
    _seriesKernelLatex(lambda, isOscillatory, xVar, count) {
        const lSqO4 = lambda * lambda / 4;
        const lSqO4Latex = latexNumberPreferFraction(lSqO4);
        let out = '';
        for (let n = 1; n <= count; n++) {
            const denomN = this._factorialSq(n);
            const sign = (isOscillatory && n % 2 === 1) ? '-' : '+';
            const lPow = latexNumberPreferFraction(Math.pow(lSqO4, n));
            out += `${sign}\\dfrac{${lPow}\\,${xVar}^{${2*n}}}{${denomN}}`;
        }
        return out;
    }

    _factorialSq(n) {
        let f = 1;
        for (let k = 2; k <= n; k++) f *= k;
        return `${f * f}`;
    }

    _buildSymbolicFallback(xStarLatex, a0Latex, targetExprLatex, ratioLatex, ratio) {
        const isOscillatory = ratio < 1;
        const odeSign = isOscillatory ? '+' : '-';
        const lambdaSym = '\\lambda';
        const odeDisplayLatex = isOscillatory
            ? `x^2y''+xy'+${lambdaSym}^2x^2y=0`
            : `x^2y''+xy'-${lambdaSym}^2x^2y=0`;
        const odeInput = isOscillatory
            ? `x^2y'' + xy' + lambda^2 x^2 y = 0`
            : `x^2y'' + xy' - lambda^2 x^2 y = 0`;
        const signStr = isOscillatory ? '(-1)^n' : '';
        const lSqO4n = isOscillatory ? `(-1)^n\\left(\\dfrac{\\lambda^2}{4}\\right)^n` : `\\left(\\dfrac{\\lambda^2}{4}\\right)^n`;
        return {
            step1: `\\[y(x)=\\sum_{n=0}^{\\infty}u_n\\,x^{2n},\\qquad u_0=${a0Latex}\\]`,
            step2: `\\[y'(x)=\\sum_{n=1}^{\\infty}2n\\,u_n\\,x^{2n-1},\\qquad y''(x)=\\sum_{n=1}^{\\infty}2n(2n-1)u_n\\,x^{2n-2}\\]`,
            step3Prose: `Substitute into \\(${odeDisplayLatex}\\):`,
            step3: `\\[\\sum_{n=1}^{\\infty}4n^2u_nx^{2n}${odeSign}\\lambda^2\\sum_{n=0}^{\\infty}u_nx^{2n+2}=0\\]`,
            step4Prose: `Shift \\(n\\to n-1\\) in the second sum:`,
            step4: `\\[\\sum_{n=1}^{\\infty}\\Bigl[4n^2u_n${odeSign}\\lambda^2 u_{n-1}\\Bigr]x^{2n}=0\\]`,
            step5: `\\[4n^2u_n${odeSign}\\lambda^2 u_{n-1}=0,\\qquad n\\ge1\\]`,
            step6Prose: `Solve for \\(u_n/u_{n-1}\\):`,
            step6: `\\[\\dfrac{u_n}{u_{n-1}}=${isOscillatory ? `-\\dfrac{\\lambda^2}{4n^2}` : `\\dfrac{\\lambda^2}{4n^2}`},\\qquad n\\ge1\\]`,
            step7Prose: `Unroll from \\(u_0=${a0Latex}\\):`,
            step7: `\\[u_n=${a0Latex}\\cdot\\dfrac{${lSqO4n}}{(n!)^2}\\]`,
            step8Prose: `Full series:`,
            step8: `\\[y(x)=${a0Latex}\\sum_{n=0}^{\\infty}\\dfrac{${lSqO4n}}{(n!)^2}x^{2n}\\]
\\[y(${xStarLatex})=${a0Latex}\\sum_{n=0}^{\\infty}\\dfrac{${isOscillatory ? `(-1)^n` : ``}\\left(\\lambda\\cdot${xStarLatex}\\right)^{2n}}{4^n(n!)^2}=${targetExprLatex}\\]`,
            step9Prose: `Solve \\(${a0Latex}\\cdot${isOscillatory ? `J_0` : `I_0`}(\\lambda\\cdot${xStarLatex})=${targetExprLatex}\\) for \\(\\lambda\\); numeric solution was not found for these inputs.`,
            step9: `\\[${a0Latex}\\cdot${isOscillatory ? `J_0` : `I_0`}\\!\\left(\\lambda\\cdot${xStarLatex}\\right)=${targetExprLatex}\\]`,
            odeInput,
            odeDisplayLatex
        };
    }
}

function updateTargetInputVisibility() {
    const select = document.getElementById('target-constant');
    const customWrap = document.getElementById('target-custom-wrap');
    const lnWrap = document.getElementById('target-ln-wrap');
    const mode = document.getElementById('ode-mode');
    const denWrap = document.getElementById('mode-den-wrap');
    const scaleWrap = document.getElementById('mode-scale-wrap');
    const odeModeCell = document.getElementById('ode-mode-cell');
    const firstOrderRow = document.getElementById('first-order-row');
    const gammaRowMain = document.getElementById('gamma-row-main');
    const gammaRowScale = document.getElementById('gamma-row-scale');
    if (!select || !customWrap || !lnWrap || !mode || !denWrap || !scaleWrap) return;

    const isComplexMode = getDerivationMode() === 'transcendental_higher_order';

    customWrap.classList.toggle('hidden', select.value !== 'custom');
    lnWrap.classList.toggle('hidden', select.value !== 'ln_n');
    if (odeModeCell) odeModeCell.classList.toggle('hidden', isComplexMode);
    if (firstOrderRow) firstOrderRow.classList.toggle('hidden', isComplexMode);
    if (gammaRowMain) gammaRowMain.classList.toggle('hidden', isComplexMode);
    if (gammaRowScale) gammaRowScale.classList.add('hidden');

    if (isComplexMode) {
        denWrap.classList.add('hidden');
        scaleWrap.classList.add('hidden');
        return;
    }

    denWrap.classList.toggle('hidden', mode.value !== 'rational_int');
    scaleWrap.classList.toggle('hidden', mode.value !== 'scaled_b');
}

function buildODEFromTarget() {
    const select = document.getElementById('target-constant');
    const modeInput = document.getElementById('ode-mode');
    const maxDenInput = document.getElementById('mode-max-den');
    const scaleBInput = document.getElementById('mode-scale-b');
    const xPowInput = document.getElementById('common-x-power');
    const reverseProse = document.getElementById('reverse-prose');
    const reverseMath = document.getElementById('reverse-math');
    if (!select || !reverseProse || !reverseMath || !modeInput || !xPowInput) return;

    const targetInfo = resolveTargetSelectionFromUI();
    if (!targetInfo.ok) {
        reverseProse.innerHTML = targetInfo.error;
        reverseMath.innerHTML = '';
        reverseTargetState.active = false;
        return;
    }
    const { key: targetKey, value: K, latex: targetLatex } = targetInfo;

    const scalarInfo = resolveReverseScalars();
    if (!scalarInfo.ok) {
        reverseProse.innerHTML = scalarInfo.error;
        reverseMath.innerHTML = '';
        reverseTargetState.active = false;
        return;
    }
    const { xStar, a0 } = scalarInfo;

    const mode = modeInput.value;
    const xPow = parseInt((xPowInput.value || '0').trim(), 10);
    const derivationMode = getDerivationMode();

    if (!Number.isFinite(K / a0) || (K / a0) <= 0) {
        reverseProse.innerHTML = derivationMode === 'transcendental_higher_order'
            ? 'Need K / a_0 > 0 for the principal real-branch calibration.'
            : 'Need K / a_0 > 0 to keep real-valued log.';
        reverseMath.innerHTML = '';
        reverseTargetState.active = false;
        return;
    }

    if (derivationMode === 'transcendental_higher_order') {
        const complex = new ComplexEngine({
            targetKey,
            targetLatex,
            targetValue: K,
            xStar,
            a0
        });
        const steps = complex.buildSteps();
        document.getElementById('ode-input').value = steps.odeInput;

        reverseTargetState.active = true;
        reverseTargetState.latex = targetLatex || latexApprox(K);
        reverseTargetState.value = K;
        reverseTargetState.xStar = xStar;
        reverseTargetState.a0 = a0;
        reverseTargetState.alpha = null;
        reverseTargetState.mode = mode;
        reverseTargetState.targetKey = targetKey;

        reverseProse.innerHTML = 'ODE generated from K, x\u2217, a\u2080. Scroll down to see the full derivation.';

        const lambdaResult = complex.solveForLambda();
        const xStarLx = latexNumberPreferFraction(xStar);
        const a0Lx = latexNumberPreferFraction(a0);
        const ratioLx = latexNumberPreferFraction(K / a0);

        let solveBlock = '';
        if (lambdaResult) {
            const { lambda, isOscillatory } = lambdaResult;
            const F0 = isOscillatory ? 'J_0' : 'I_0';
            const seriesSign = isOscillatory ? '(-1)^n' : '';
            const lamLx = latexNumberPreferFraction(lambda);
            const lamSqLx = latexNumberPreferFraction(lambda * lambda);
            const lamSqO4Lx = latexNumberPreferFraction(lambda * lambda / 4);
            const lxNumLx = latexNumberPreferFraction(lambda * Math.abs(xStar));
            // First few numeric terms of the series at lambda*xStar
            const lx2o4 = (lambda * Math.abs(xStar)) * (lambda * Math.abs(xStar)) / 4;
            const t1 = lx2o4;
            const t2 = lx2o4 * lx2o4 / 4;
            const t3 = lx2o4 * lx2o4 * lx2o4 / 36;
            const s1 = isOscillatory ? -t1 : t1;
            const s2 = isOscillatory ? t2 : t2;
            const s3 = isOscillatory ? -t3 : t3;
            const sign1 = isOscillatory ? '-' : '+';
            const sign2 = '+';
            const sign3 = isOscillatory ? '-' : '+';
            const t1lx = latexApprox(t1);
            const t2lx = latexApprox(t2);
            const t3lx = latexApprox(t3);
            const sumLx = latexApprox(1 + s1 + s2 + s3);
            // a0 * F0(z) written without \cdot before function name
            const a0F0 = a0 === 1 ? `${F0}` : `${a0Lx}\\,${F0}`;
            const seriesDefSign2 = isOscillatory ? '-' : '+';
            const seriesDefSign3 = '+';
            const seriesDefSign4 = isOscillatory ? '-' : '+';
            solveBlock = `\\[
  ${F0}(z)=\\sum_{n=0}^{\\infty}\\dfrac{${seriesSign ? `(-1)^n` : ''}\\left(\\dfrac{z}{2}\\right)^{2n}}{(n!)^2}
  =1${seriesDefSign2}\\dfrac{z^2}{4}${seriesDefSign3}\\dfrac{z^4}{64}${seriesDefSign4}\\dfrac{z^6}{2304}${isOscillatory ? `+` : `+`}\\cdots
\\]
\\[
  ${a0F0}\\!\\left(\\lambda\\cdot${xStarLx}\\right)=${targetLatex}\\approx${latexApprox(K)}
\\]
\\[
  \\dfrac{${targetLatex}}{${a0Lx}}=${ratioLx}
  \\quad\\Longrightarrow\\quad
  ${F0}\\!\\left(\\lambda\\cdot${xStarLx}\\right)=${ratioLx}
\\]
\\[
  \\sum_{n=0}^{\\infty}\\dfrac{${seriesSign ? `(-1)^n` : ''}\\left(\\dfrac{\\lambda\\cdot${xStarLx}}{2}\\right)^{2n}}{(n!)^2}=${ratioLx}
\\]
\\[
  \\lambda=${lamLx}\\quad\\Longrightarrow\\quad\\lambda^2=${lamSqLx}
\\]
\\[
  ${a0F0}\\!\\left(${lxNumLx}\\right)
  =${a0Lx}\\left(1${sign1}${t1lx}${sign2}${t2lx}${sign3}${t3lx}+\\cdots\\right)
  \\approx${latexApprox(K)}
\\]`;
        }

        set('reverse-math', `\\[
  K=${targetLatex},\\quad x_*=${xStarLx},\\quad a_0=${a0Lx}
\\]
${solveBlock}
\\[
  ${steps.odeDisplayLatex}
\\]`);

        derive();
        return;
    }

    const alphaTarget = Math.log(K / a0) / xStar;
    let B;
    let C;
    let alphaUsed = alphaTarget;
    if (mode === 'rational_int') {
        const maxDen = Math.max(1, Math.min(5000, parseInt((maxDenInput?.value || '200').trim(), 10) || 200));
        const approx = rationalApprox(alphaTarget, maxDen);
        B = approx.q;
        C = -approx.p;
        alphaUsed = -C / B;
    } else if (mode === 'scaled_b') {
        B = Number((scaleBInput?.value || '').trim());
        if (!Number.isFinite(B) || B === 0) {
            reverseProse.innerHTML = 'Scaled mode needs a non-zero B value.';
            reverseMath.innerHTML = '';
            reverseTargetState.active = false;
            return;
        }
        C = -alphaTarget * B;
    } else {
        B = 1;
        C = -alphaTarget;
    }

    const ode = formatODEFromParams(B, C, Number.isInteger(xPow) ? xPow : 0);
    document.getElementById('ode-input').value = ode;

    reverseTargetState.active = true;
    reverseTargetState.latex = targetLatex || latexApprox(K);
    reverseTargetState.value = K;
    reverseTargetState.xStar = xStar;
    reverseTargetState.a0 = a0;
    reverseTargetState.alpha = alphaUsed;
    reverseTargetState.mode = mode;
    reverseTargetState.targetKey = targetKey;

    reverseProse.innerHTML = 'Target selected. ODE auto-generated from the exact symbolic target condition.';

    set('reverse-math', `\\[
  K = ${reverseTargetState.latex},\\quad x_*=${latexNumber(xStar)},\\quad a_0=${latexNumber(a0)}
\\]
\\[
  \\alpha = \\dfrac{\\ln\\!\\left(K/a_0\\right)}{x_*}
\\]
\\[
  \\text{Generated ODE: }\\; ${ode.replace(/\\/g, '\\\\')}
\\]
\\[
  y(x_*) = a_0 e^{\\alpha x_*} = K
\\]`);

    derive();
}

function deriveComplexMode() {
    const errBox = document.getElementById('error-box');
    errBox.innerHTML = '';

    const targetInfo = reverseTargetState.active
        ? {
            ok: true,
            key: reverseTargetState.targetKey || document.getElementById('target-constant')?.value || '',
            value: reverseTargetState.value,
            latex: reverseTargetState.latex
        }
        : resolveTargetSelectionFromUI();

    if (!targetInfo.ok) {
        errBox.innerHTML = `<div class="error-msg">${targetInfo.error}</div>`;
        return;
    }

    const scalarInfo = reverseTargetState.active
        ? { ok: true, xStar: reverseTargetState.xStar, a0: reverseTargetState.a0 }
        : resolveReverseScalars();
    if (!scalarInfo.ok) {
        errBox.innerHTML = `<div class="error-msg">${scalarInfo.error}</div>`;
        return;
    }

    const complex = new ComplexEngine({
        targetKey: targetInfo.key,
        targetLatex: targetInfo.latex,
        targetValue: targetInfo.value,
        xStar: scalarInfo.xStar,
        a0: scalarInfo.a0
    });
    const steps = complex.buildSteps();

    document.getElementById('ode-input').value = steps.odeInput;
    document.getElementById('s3-prose').innerHTML = steps.step3Prose;
    document.getElementById('s4-prose').innerHTML = steps.step4Prose;
    document.getElementById('s6-prose').innerHTML = steps.step6Prose;
    document.getElementById('s7-prose').innerHTML = steps.step7Prose;
    document.getElementById('s8-prose').innerHTML = steps.step8Prose;
    document.getElementById('s9-prose').innerHTML = steps.step9Prose;

    set('s1-series', steps.step1);
    set('s2-deriv', steps.step2);
    set('s3-sub', steps.step3);
    set('s4-reindex', steps.step4);
    set('s5-coeff', steps.step5);
    set('s6-result', steps.step6);
    set('s7-result', steps.step7);
    set('s8-result', steps.step8);
    set('s9-result', steps.step9);

    document.getElementById('output').style.display = 'block';
    renderAll();

    setTimeout(() => {
        document.getElementById('output').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
}

function derive() {
    if (getDerivationMode() === 'transcendental_higher_order') {
        deriveComplexMode();
        return;
    }

    const input  = document.getElementById('ode-input').value;
    const errBox = document.getElementById('error-box');
    errBox.innerHTML = '';

    let coeff;
    try { coeff = parseODE(input); }
    catch(e) {
        errBox.innerHTML = `<div class="error-msg">${e.message}</div>`;
        return;
    }

    const { B, C, p, q } = coeff;
    const pMinusQ = diffPow(p, q);
    const qMinusP = diffPow(q, p);
    const shifted = shiftedIndex('n', pMinusQ);
    const lowerBound = lowerBoundExpr(qMinusP);
    const nPlusP = shiftedIndex('n', p);
    const nShiftQP = shiftedIndex('n', qMinusP);

    set('s1-series', `\\[
  y \\;=\\; \\sum_{n=0}^{\\infty} a_n\\, x^n
    \\;=\\; a_0 + a_1 x + a_2 x^2 + a_3 x^3 + \\cdots
\\]`);

    set('s2-deriv', `\\[
  y' \\;=\\; \\sum_{n=1}^{\\infty} n\\,a_n\\, x^{n-1}
      \\;=\\; a_1 + 2a_2\\,x + 3a_3\\,x^2 + 4a_4\\,x^3 + \\cdots
\\]`);

    const Blatex = latexCoeff(B, true);
    const Clatex = latexCoeff(C, false);
    const pLatex = latexPow(p);
    const qLatex = latexPow(q);
    const odeStr = `${Blatex}${pLatex}y' ${Clatex}${qLatex}y = 0`;

    document.getElementById('s3-prose').innerHTML =
        `Substituting into \\(${odeStr}\\):`;

    const Babs = Math.abs(B) === 1 ? '' : String(Math.abs(B));
    const Cabs = Math.abs(C) === 1 ? '' : String(Math.abs(C));
    const Bpre = B < 0 ? '-' : '';
    const Csign = C >= 0 ? (B !== 0 ? '+' : '') : '-';

    let s3 = `${Bpre}${Babs}${pLatex}\\sum_{n=0}^{\\infty}(n+1)\\,a_{n+1}\\,x^{n}`;
    if (C !== 0) s3 += `\\;${Csign}\\;${Cabs}${qLatex}\\sum_{n=0}^{\\infty} a_n\\,x^{n}`;
    s3 += ' = 0';
    set('s3-sub', `\\[ ${s3} \\]`);

    document.getElementById('s4-prose').innerHTML =
        `Write both sums in powers of \\(x^{${nPlusP}}\\). For the \\(y\\)-sum, shift index by \\(n \\to ${nShiftQP}\\):`;

    let s4 = `${Bpre}${Babs}\\sum_{n=0}^{\\infty}(n+1)\\,a_{n+1}\\,x^{${nPlusP}}`;
    if (C !== 0) s4 += `\\;${Csign}\\;${Cabs}\\sum_{n=${lowerBound}}^{\\infty} a_{${shifted}}\\,x^{${nPlusP}}`;
    s4 += ' = 0';
    set('s4-reindex', `\\[ ${s4} \\]`);

    let coeffLhs = `${Bpre}${Babs}(n+1)\\,a_{n+1}`;
    if (C !== 0) coeffLhs += `\\;${Csign}\\;${Cabs}\\,a_{${shifted}}`;
    const coeffEq = `${coeffLhs} = 0`;

    set('s5-coeff', `\\[
  \\sum_{n=${lowerBound}}^{\\infty}\\Bigl[${coeffLhs}\\Bigr]x^{${nPlusP}} = 0
\\]
\\[\\Longrightarrow\\quad ${coeffEq},\\qquad n \\ge ${lowerBound}\\]`);

    const frac = simplifyFraction(-C, B);
    const rNum = frac.num;
    const rDen = frac.den;
    const oneStep = samePow(p, q);
    const gammaLiftMode = document.getElementById('gamma-lift-mode');
    const gammaAlphaInput = document.getElementById('gamma-alpha-list');
    const gammaBetaInput = document.getElementById('gamma-beta-list');
    const gammaLiftRequested = gammaLiftMode && gammaLiftMode.value === 'on' && !reverseTargetState.active;

    let gammaLiftActive = false;
    let gammaAlpha = [];
    let gammaBeta = [];

    if (gammaLiftRequested && oneStep) {
        const alphaParsed = parseShiftList(gammaAlphaInput?.value || '');
        if (alphaParsed?.error) {
            errBox.innerHTML = `<div class="error-msg">${alphaParsed.error}</div>`;
            return;
        }
        const betaParsed = parseShiftList(gammaBetaInput?.value || '');
        if (betaParsed?.error) {
            errBox.innerHTML = `<div class="error-msg">${betaParsed.error}</div>`;
            return;
        }

        gammaAlpha = alphaParsed;
        gammaBeta = betaParsed;
        gammaLiftActive = true;
    }

    const baseNumStr = latexNumber(rNum);
    const baseDenStr = rDen === 1 ? '(n+1)' : `${latexNumber(rDen)}(n+1)`;
    const baseRhs = rNum === 0 ? '0' : `\\dfrac{${baseNumStr}}{${baseDenStr}}`;

    let rhs = baseRhs;
    if (gammaLiftActive && rNum !== 0) {
        rhs = `${baseRhs}\\cdot\\dfrac{${linearFactorProductLatex(gammaAlpha)}}{${linearFactorProductLatex(gammaBeta)}}`;
    }

    if (gammaLiftActive) {
        document.getElementById('s6-prose').innerHTML =
            `Base ODE ratio is lifted by Gamma/Pochhammer factors while keeping one-step form \\(a_{n+1}/a_n\\).`;
    } else {
        document.getElementById('s6-prose').innerHTML =
            `Dividing both sides by \\(${Bpre}${Babs}(n+1)\\,a_{${shifted}}\\) and writing the ratio \\(\\dfrac{a_{n+1}}{a_{${shifted}}}\\):`;
    }

    const recurrence = `\\dfrac{a_{n+1}}{a_{${shifted}}} = ${rhs},\\quad n \\ge ${lowerBound}`;
    set('s6-result', `\\[ ${recurrence} \\]`);

    if (oneStep) {
        if (gammaLiftActive) {
            const lambda = rNum / rDen;
            const lambdaPow = powBaseLatex(lambda);
            const lambdaXArg = expArgLatex(lambda);
            const pCount = gammaAlpha.length;
            const qCount = gammaBeta.length;
            const alphaParams = hyperParamListLatex(gammaAlpha) || '\\,';
            const betaParams = hyperParamListLatex(gammaBeta) || '\\,';

            const pochNum = pochhammerProductLatex(gammaAlpha);
            const pochDenExtra = pochhammerProductLatex(gammaBeta);
            const gammaNumProd = gammaRatioProductLatex(gammaAlpha);
            const gammaDenProd = gammaRatioProductLatex(gammaBeta);

            const pochNumPart = pochNum === '1' ? '' : `\\,${pochNum}`;
            const pochDenPart = pochDenExtra === '1' ? '' : `\\,${pochDenExtra}`;
            const gammaNumPart = gammaNumProd === '1' ? '1' : gammaNumProd;
            const gammaDenPart = gammaDenProd === '1' ? '\\Gamma(n+1)' : `\\Gamma(n+1)\\,${gammaDenProd}`;

            document.getElementById('s7-prose').innerHTML =
                `One-step Gamma lift is active, so the ratio becomes hypergeometric and yields nontrivial Gamma/Pochhammer structure.`;

            set('s7-result', `\\[
  a_n = a_0\\,\\dfrac{${lambdaPow}^{n}${pochNumPart}}{(1)_n${pochDenPart}}
\\]
\\[
  a_n = a_0\\,${lambdaPow}^{n}\\,\\dfrac{${gammaNumPart}}{${gammaDenPart}}
\\]
\\[
  y(x)=a_0\\,{}_{${pCount}}F_{${qCount}}\\!\\left(${alphaParams};${betaParams};${lambdaXArg}\\right)
\\]
\\[
  \\dfrac{a_{n+1}}{a_n}=\\dfrac{\\lambda}{n+1}\\cdot\\dfrac{\\displaystyle\\prod_i(n+\\alpha_i)}{\\displaystyle\\prod_j(n+\\beta_j)}
\\]`);

            document.getElementById('s8-prose').innerHTML =
                `Substitute the lifted \\(a_n\\) into \\(y(x)=\\sum_{n=0}^{\\infty}a_nx^n\\) to get equivalent sigma, Gamma, and hypergeometric forms.`;
            set('s8-result', `\\[
  y(x)=\\sum_{n=0}^{\\infty}a_nx^n
\\]
\\[
  = a_0\\sum_{n=0}^{\\infty}
  \\dfrac{${lambdaPow}^{n}${pochNumPart}}{(1)_n${pochDenPart}}\\,x^n
\\]
\\[
  = a_0\\sum_{n=0}^{\\infty}
  \\dfrac{${lambdaPow}^{n}\\,${gammaNumPart}}{${gammaDenPart}}\\,x^n
\\]
\\[
  = a_0\\,{}_{${pCount}}F_{${qCount}}\\!\\left(${alphaParams};${betaParams};${lambdaXArg}\\right)
\\]`);

            const xEval = reverseTargetState.active ? reverseTargetState.xStar : 1;
            const a0Eval = reverseTargetState.active ? reverseTargetState.a0 : 1;
            const xEvalLatex = latexNumber(xEval);
            const evalArgLatex = latexNumber(lambda * xEval);

            document.getElementById('s9-prose').innerHTML =
                `Final closure at your chosen evaluation point.`;
            set('s9-result', `\\[
  y(${xEvalLatex})
  = ${latexNumber(a0Eval)}\\,{}_{${pCount}}F_{${qCount}}\\!\\left(${alphaParams};${betaParams};${evalArgLatex}\\right)
\\]
\\[
  = ${latexNumber(a0Eval)}\\sum_{n=0}^{\\infty}
  \\dfrac{${lambdaPow}^{n}${pochNumPart}}{(1)_n${pochDenPart}}\\,${xEvalLatex}^{n}
\\]`);
        } else {
            const alphaPow = fracPowBaseLatex(rNum, rDen, frac.exactInt);
            const alphaExp = fracExpArgLatex(rNum, rDen, frac.exactInt);
            const alphaNumLatex = latexNumber(rNum);
            const alphaDenLatex = latexNumber(rDen);
            const alphaXPow = rDen === 1
                ? `\\left(${alphaNumLatex}x\\right)^n`
                : `\\left(\\dfrac{${alphaNumLatex}x}{${alphaDenLatex}}\\right)^n`;

            document.getElementById('s7-prose').innerHTML =
                `Because both terms have the same power of \\(x\\), the recurrence is one-step and can be written in closed form.`;

            set('s7-result', `\\[
  a_n = a_0\\,\\dfrac{${alphaPow}^{n}}{n!}
\\]
\\[
  a_n = a_0\\,${alphaPow}^{n}\\,\\dfrac{\\Gamma(1)}{\\Gamma(n+1)}
\\]
\\[
  a_n = a_0\\,\\dfrac{${alphaPow}^{n}}{(1)_n}
\\]
\\[
  y(x) = a_0\\,\\exp\\!\\left(${alphaExp}\\right)
\\]`);

            document.getElementById('s8-prose').innerHTML =
                `Substitute the Step 7 formulas for \\(a_n\\) into \\(y(x)=\\sum_{n=0}^{\\infty}a_nx^n\\). These are equivalent representations of the same solution.`;
            set('s8-result', `\\[
  y(x)=\\sum_{n=0}^{\\infty}a_nx^n
\\]
\\[
  = a_0\\sum_{n=0}^{\\infty}\\dfrac{${alphaPow}^{n}}{n!}\\,x^n
  = a_0\\sum_{n=0}^{\\infty}\\dfrac{${alphaPow}^{n}\\Gamma(1)}{\\Gamma(n+1)}\\,x^n
\\]
\\[
  = a_0\\sum_{n=0}^{\\infty}\\dfrac{${alphaPow}^{n}}{(1)_n}\\,x^n
  = a_0\\sum_{n=0}^{\\infty}\\dfrac{${alphaXPow}}{n!}
\\]
\\[
  = a_0\\,{}_0F_0\\!\\left(;\\,;\\,${alphaExp}\\right)
  = a_0\\exp\\!\\left(${alphaExp}\\right)
\\]`);

            const alphaFracLatex = rDen === 1
                ? latexNumber(rNum)
                : `\\dfrac{${latexNumber(rNum)}}{${latexNumber(rDen)}}`;
            const xEval = reverseTargetState.active ? reverseTargetState.xStar : 1;
            const a0Eval = reverseTargetState.active ? reverseTargetState.a0 : null;
            const xEvalLatex = latexNumber(xEval);
            const sigmaAtX = `\\sum_{n=0}^{\\infty}\\dfrac{${alphaPow}^{n}}{n!}\\,${xEvalLatex}^{n}`;
            const targetLatex = reverseTargetState.active ? reverseTargetState.latex : null;

            document.getElementById('s9-prose').innerHTML =
                `Final closure at your chosen evaluation point.`;
            if (targetLatex) {
                const a0Latex = latexNumber(a0Eval);
                set('s9-result', `\\[
  y(${xEvalLatex}) = ${a0Latex}\\sum_{n=0}^{\\infty}\\dfrac{${alphaPow}^{n}}{n!}\\,${xEvalLatex}^{n}
  = ${a0Latex}e^{${alphaFracLatex}\\,${xEvalLatex}}
  = ${targetLatex}
\\]`);
            } else {
                set('s9-result', `\\[
  y(${xEvalLatex}) = a_0${sigmaAtX}
  = a_0 e^{${alphaFracLatex}\\,${xEvalLatex}}
\\]`);
            }
        }
    } else {
        const gammaLiftNote = gammaLiftRequested
            ? ` Gamma lift needs one-step form \\(a_{n+1}/a_n\\), which occurs when both terms share the same power of \\(x\\).`
            : '';
        document.getElementById('s7-prose').innerHTML =
            `This recurrence is not one-step in \\(n\\), so Gamma/Pochhammer/exponential closed forms are not auto-derived in this mode.${gammaLiftNote}`;
        set('s7-result', `\\[
  \\dfrac{a_{n+1}}{a_{${shifted}}} = ${rhs}
\\]`);

        document.getElementById('s8-prose').innerHTML =
            `A final sigma-series statement is always valid. Closed-form substitutions appear when the ratio reduces to the one-step form \\(a_{n+1}/a_n\\).`;
        set('s8-result', `\\[
  y(x)=\\sum_{n=0}^{\\infty}a_nx^n,\\qquad
  \\dfrac{a_{n+1}}{a_{${shifted}}} = ${rhs},\\quad n\\ge ${lowerBound}
\\]`);

        document.getElementById('s9-prose').innerHTML =
            `Constant closure requires a one-step recurrence \\(a_{n+1}/a_n\\). Choose an ODE where both \\(y'\\) and \\(y\\) carry the same power of \\(x\\).`;
        set('s9-result', `\\[
  \\dfrac{a_{n+1}}{a_{${shifted}}} = ${rhs}
\\]`);
    }

    document.getElementById('output').style.display = 'block';
    renderAll();

    setTimeout(() => {
        document.getElementById('output').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function set(id, html) {
    document.getElementById(id).innerHTML = html;
}

function renderAll() {
    if (window.renderMathInElement) {
        renderMathInElement(document.body, {
            delimiters: [
                { left: "\\[", right: "\\]", display: true  },
                { left: "\\(", right: "\\)", display: false }
            ],
            throwOnError: false
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    populateTargetConstantSelect();

    const odeInput = document.getElementById('ode-input');
    odeInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') derive();
    });
    odeInput.addEventListener('input', () => {
        reverseTargetState.active = false;
        reverseTargetState.targetKey = null;
    });

    const targetSelect = document.getElementById('target-constant');
    if (targetSelect) {
        targetSelect.addEventListener('change', () => {
            syncTargetConstantUi();
            updateTargetInputVisibility();
            if (targetSelect.value !== 'custom') buildODEFromTarget();
        });
    }

    const targetCustom = document.getElementById('target-custom');
    if (targetCustom) {
        targetCustom.addEventListener('keydown', e => {
            if (e.key === 'Enter') buildODEFromTarget();
        });
    }

    const targetLnN = document.getElementById('target-ln-n');
    if (targetLnN) {
        targetLnN.addEventListener('keydown', e => {
            if (e.key === 'Enter') buildODEFromTarget();
        });
    }

    const targetX = document.getElementById('target-x');
    if (targetX) {
        targetX.addEventListener('keydown', e => {
            if (e.key === 'Enter') buildODEFromTarget();
        });
    }

    const targetA0 = document.getElementById('target-a0');
    if (targetA0) {
        targetA0.addEventListener('keydown', e => {
            if (e.key === 'Enter') buildODEFromTarget();
        });
    }

    const odeMode = document.getElementById('ode-mode');
    if (odeMode) {
        odeMode.addEventListener('change', () => {
            updateTargetInputVisibility();
            buildODEFromTarget();
        });
    }

    const modeMaxDen = document.getElementById('mode-max-den');
    if (modeMaxDen) {
        modeMaxDen.addEventListener('keydown', e => {
            if (e.key === 'Enter') buildODEFromTarget();
        });
    }

    const modeScaleB = document.getElementById('mode-scale-b');
    if (modeScaleB) {
        modeScaleB.addEventListener('keydown', e => {
            if (e.key === 'Enter') buildODEFromTarget();
        });
    }

    const commonXPow = document.getElementById('common-x-power');
    if (commonXPow) {
        commonXPow.addEventListener('keydown', e => {
            if (e.key === 'Enter') buildODEFromTarget();
        });
    }

    const gammaLiftModeInput = document.getElementById('gamma-lift-mode');
    if (gammaLiftModeInput) {
        gammaLiftModeInput.addEventListener('change', () => {
            derive();
        });
    }

    const gammaAlphaInput = document.getElementById('gamma-alpha-list');
    if (gammaAlphaInput) {
        gammaAlphaInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') derive();
        });
    }

    const gammaBetaInput = document.getElementById('gamma-beta-list');
    if (gammaBetaInput) {
        gammaBetaInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') derive();
        });
    }

    const gammaScaleInput = document.getElementById('gamma-scale');
    if (gammaScaleInput) {
        gammaScaleInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') derive();
        });
    }

    const derivationModeInput = document.getElementById('derivation-mode');
    if (derivationModeInput) {
        derivationModeInput.addEventListener('change', () => {
            updateTargetInputVisibility();
            buildODEFromTarget();
        });
    }

    // Pick a random target constant and a random a_0 on load
    const _pickableKeys = targetConstantChoices
        .filter(c => Number.isFinite(c.value) && c.value > 0 && c.value < 100);
    if (_pickableKeys.length > 0) {
        const _pick = _pickableKeys[Math.floor(Math.random() * _pickableKeys.length)];
        const targetSelect2 = document.getElementById('target-constant');
        if (targetSelect2) {
            targetSelect2.value = _pick.key;
            syncTargetConstantUi();
        }
    }
    const _a0Choices = [1, 2, 3];
    const _a0 = _a0Choices[Math.floor(Math.random() * _a0Choices.length)];
    const targetA0El = document.getElementById('target-a0');
    if (targetA0El) targetA0El.value = String(_a0);

    updateTargetInputVisibility();
    buildODEFromTarget();
});
