const PRESETS = [
  { id:"exponential", category:"Good (Linear)", name:"Exponential", recurrence:"a_n = (1 / n) a_(n-1)", behavior:"Smooth convergence", complexity:"Constant memory (1-step)", description:"Factorial-style decay.", params:[], seeds:[{key:"a0",label:"a_0",value:1}], compute:({values,n})=> n===0 ? values[0] : values[n-1]/n },
  { id:"fibonacci", category:"Good (Linear)", name:"Fibonacci", recurrence:"a_n = a_(n-1) + a_(n-2)", behavior:"Steady growth (phi^n)", complexity:"Constant memory (2-step)", description:"Classic second-order linear recurrence.", params:[], seeds:[{key:"a0",label:"a_0",value:0},{key:"a1",label:"a_1",value:1}], compute:({values,n})=> n<2 ? values[n] : values[n-1] + values[n-2] },
  { id:"bessel", category:"Good (Linear)", name:"Bessel (J_v)", recurrence:"a_n = -a_(n-2) / (4 n (n + v))", behavior:"Oscillatory decay", complexity:"Constant memory (2-step)", description:"Bessel-type series coefficients.", params:[{key:"v",label:"v",value:0}], seeds:[{key:"a0",label:"a_0",value:1},{key:"a1",label:"a_1",value:0}], compute:({values,n,params})=> n<2 ? values[n] : (-values[n-2]) / safeDenom(4*n*(n+params.v)) },
  { id:"hermite", category:"Good (Linear)", name:"Hermite", recurrence:"a_(n+1) = 2 x a_n - 2 n a_(n-1)", behavior:"Polynomial orthogonality", complexity:"Linear scaling", description:"Hermite-style coefficient evolution.", params:[{key:"x",label:"x",value:1}], seeds:[{key:"a0",label:"a_0",value:1},{key:"a1",label:"a_1",value:2}], compute:({values,n,params})=> n<2 ? values[n] : 2*params.x*values[n-1] - 2*(n-1)*values[n-2] },
  { id:"laguerre", category:"Good (Linear)", name:"Laguerre", recurrence:"(n + 1) a_(n+1) = (2n + 1 - x) a_n - n a_(n-1)", behavior:"Polynomial orthogonality", complexity:"Linear scaling", description:"Laguerre-like recurrence.", params:[{key:"x",label:"x",value:1}], seeds:[{key:"a0",label:"a_0",value:1},{key:"a1",label:"a_1",value:0}], compute:({values,n,params})=> n<2 ? values[n] : (((2*(n-1)+1-params.x)*values[n-1]) - (n-1)*values[n-2]) / n },
  { id:"chebyshev", category:"Good (Linear)", name:"Chebyshev", recurrence:"a_n = 2 x a_(n-1) - a_(n-2)", behavior:"Minimal oscillation", complexity:"Trigonometric scaling", description:"Second-order oscillator.", params:[{key:"x",label:"x",value:0.6}], seeds:[{key:"a0",label:"a_0",value:1},{key:"a1",label:"a_1",value:0.6}], compute:({values,n,params})=> n<2 ? values[n] : 2*params.x*values[n-1] - values[n-2] },
  { id:"legendre", category:"Good (Linear)", name:"Legendre", recurrence:"(n + 1) a_(n+1) = (2n + 1) x a_n - n a_(n-1)", behavior:"Spherical symmetry", complexity:"Linear scaling", description:"Legendre polynomial recurrence.", params:[{key:"x",label:"x",value:0.7}], seeds:[{key:"a0",label:"a_0",value:1},{key:"a1",label:"a_1",value:0.7}], compute:({values,n,params})=> n<2 ? values[n] : ((((2*(n-1)+1)*params.x*values[n-1]) - ((n-1)*values[n-2])) / n) },
  { id:"geometric", category:"Good (Linear)", name:"Geometric", recurrence:"a_n = r a_(n-1)", behavior:"Exponential scaling", complexity:"Single dependency", description:"One-step multiplicative rule.", params:[{key:"r",label:"r",value:1.25}], seeds:[{key:"a0",label:"a_0",value:1}], compute:({values,n,params})=> n===0 ? values[0] : params.r * values[n-1] },
  { id:"arithmetic", category:"Good (Linear)", name:"Arithmetic", recurrence:"a_n = a_(n-1) + d", behavior:"Linear increase", complexity:"Single dependency", description:"One-step additive rule.", params:[{key:"d",label:"d",value:3}], seeds:[{key:"a0",label:"a_0",value:0}], compute:({values,n,params})=> n===0 ? values[0] : values[n-1] + params.d },
  { id:"hypergeometric", category:"Good (Linear)", name:"Hypergeometric", recurrence:"a_n = ((n + A)(n + B) / ((n + C)(n + 1))) a_(n-1)", behavior:"General power series", complexity:"Rational scaling", description:"Hypergeometric-style coefficient rule.", params:[{key:"A",label:"A",value:1},{key:"B",label:"B",value:2},{key:"C",label:"C",value:3}], seeds:[{key:"a0",label:"a_0",value:1}], compute:({values,n,params})=> n===0 ? values[0] : (((n+params.A)*(n+params.B)) / safeDenom((n+params.C)*(n+1))) * values[n-1] },

  { id:"painleve1", category:"Painleve (Magic)", name:"Painleve I (P1)", recurrence:"(n + 1)(n + 2) a_(n+2) = 6 sum_(k=0)^n a_k a_(n-k) + delta_(n,1)", behavior:"Movable poles only", complexity:"Convolutional (controlled)", description:"Direct quadratic convolution recurrence.", params:[], seeds:[{key:"a0",label:"a_0",value:0.2},{key:"a1",label:"a_1",value:0.1}], compute:({values,n})=> n<2 ? values[n] : (()=>{ const m=n-2; let sum=0; for(let k=0;k<=m;k+=1) sum += values[k]*values[m-k]; return (6*sum + (m===1?1:0)) / ((m+1)*(m+2)); })() },
  { id:"painleve2", category:"Painleve (Magic)", name:"Painleve II (P2)", recurrence:"(n + 1)(n + 2) a_(n+2) = 2 sum_(j+k+l=n) a_j a_k a_l + alpha", behavior:"Symmetric nonlinearity", complexity:"Triple convolution", description:"Triple-convolution recurrence.", params:[{key:"alpha",label:"alpha",value:0.2}], seeds:[{key:"a0",label:"a_0",value:0.1},{key:"a1",label:"a_1",value:0.1}], compute:({values,n,params})=> n<2 ? values[n] : (()=>{ const m=n-2; let sum=0; for(let j=0;j<=m;j+=1){ for(let k=0;k<=m-j;k+=1){ const l=m-j-k; sum += values[j]*values[k]*values[l]; }} return (2*sum + params.alpha) / ((m+1)*(m+2)); })() },
  { id:"painleve3", category:"Painleve (Magic)", name:"Painleve III (P3)", recurrence:"n^2 a_n = sum (a_k a_(n-k) ...)", behavior:"Singularity-free", complexity:"Rational nonlinearity", description:"Quadratic-rational stylized model.", note:"Stylized model: the listed relation was abbreviated.", params:[{key:"lambda",label:"lambda",value:0.65},{key:"mu",label:"mu",value:0.15}], seeds:[{key:"a0",label:"a_0",value:0.3},{key:"a1",label:"a_1",value:0.12}], compute:({values,n,params})=> n<2 ? values[n] : (()=>{ let sum=0; for(let k=1;k<n;k+=1) sum += values[k]*values[n-k]; return (params.lambda*sum - params.mu*values[n-1]) / Math.max(1,n*n); })() },
  { id:"painleve4", category:"Painleve (Magic)", name:"Painleve IV (P4)", recurrence:"a_(n+2) ~= sum a_k a_(n-k)", behavior:"Rational transcendence", complexity:"Controlled feedback", description:"Convolution with linear correction.", note:"Stylized model: the source relation was approximate.", params:[{key:"lambda",label:"lambda",value:0.32},{key:"gamma",label:"gamma",value:0.18}], seeds:[{key:"a0",label:"a_0",value:0.4},{key:"a1",label:"a_1",value:0.16}], compute:({values,n,params})=> n<2 ? values[n] : (()=>{ const m=n-2; let sum=0; for(let k=0;k<=m;k+=1) sum += values[k]*values[m-k]; return params.lambda*sum - params.gamma*values[n-1]; })() },
  { id:"painleve5", category:"Painleve (Magic)", name:"Painleve V (P5)", recurrence:"a_n = f(a_(k < n))", behavior:"Logarithmic branch points", complexity:"Symmetric feedback", description:"History-weighted feedback rule.", note:"Stylized model: the original rule was schematic.", params:[{key:"lambda",label:"lambda",value:0.58},{key:"beta",label:"beta",value:0.24}], seeds:[{key:"a0",label:"a_0",value:0.5},{key:"a1",label:"a_1",value:0.32}], compute:({values,n,params})=> n<2 ? values[n] : (()=>{ const avg=values.slice(0,n).reduce((a,b)=>a+b,0)/n; return params.lambda*values[n-1] + params.beta*avg - Math.log1p(Math.abs(values[n-1]))*0.12; })() },
  { id:"painleve6", category:"Painleve (Magic)", name:"Painleve VI (P6)", recurrence:"a_n = f(a_(k < n), parameters)", behavior:"The master Painleve", complexity:"Elliptic symmetry", description:"Parameter-rich nonlinear history rule.", note:"Stylized model: built to expose parameter sensitivity.", params:[{key:"alpha",label:"alpha",value:0.35},{key:"beta",label:"beta",value:0.22},{key:"gamma",label:"gamma",value:0.08}], seeds:[{key:"a0",label:"a_0",value:0.4},{key:"a1",label:"a_1",value:0.28}], compute:({values,n,params})=> n<2 ? values[n] : (()=>{ const tail=values.slice(Math.max(0,n-5),n); const avg=tail.reduce((a,b)=>a+b,0)/tail.length; return params.alpha*values[n-1] + params.beta*avg + params.gamma*values[n-1]*avg; })() },
  { id:"kdv", category:"Painleve (Magic)", name:"KdV (Soliton)", recurrence:"sum a_k a_(n-k) ~= a_(n-3)", behavior:"Infinite conservation laws", complexity:"Integrable nonlinearity", description:"Lag-3 plus quadratic convolution.", note:"Stylized model: uses a lag-3 memory term.", params:[{key:"lambda",label:"lambda",value:0.26}], seeds:[{key:"a0",label:"a_0",value:0.3},{key:"a1",label:"a_1",value:0.25},{key:"a2",label:"a_2",value:0.18}], compute:({values,n,params})=> n<3 ? values[n] : (()=>{ let sum=0; for(let k=0;k<n;k+=1) sum += values[k]*values[n-1-k]; return values[n-3] + params.lambda*sum; })() },
  { id:"mkdv", category:"Painleve (Magic)", name:"mKdV (Modified)", recurrence:"sum a_j a_k a_l ~= a_(n-3)", behavior:"Symmetric soliton", complexity:"Integrable nonlinearity", description:"Lag-3 plus cubic feedback.", note:"Stylized model: cubic local coupling.", params:[{key:"lambda",label:"lambda",value:0.18}], seeds:[{key:"a0",label:"a_0",value:0.2},{key:"a1",label:"a_1",value:0.2},{key:"a2",label:"a_2",value:0.18}], compute:({values,n,params})=> n<3 ? values[n] : values[n-3] + params.lambda*Math.pow(values[n-1],3) },
  { id:"toda", category:"Painleve (Magic)", name:"Toda Lattice", recurrence:"a_(n+1) = exp(a_n - a_(n-1))", behavior:"Discrete integrability", complexity:"Exponential/linear mix", description:"Explicit nonlinear lattice step.", params:[], seeds:[{key:"a0",label:"a_0",value:0.5},{key:"a1",label:"a_1",value:0.7}], compute:({values,n})=> n<2 ? values[n] : Math.exp(clamp(values[n-1]-values[n-2], -40, 40)) },
  { id:"sine_gordon", category:"Painleve (Magic)", name:"Sine-Gordon", recurrence:"sum a_k sin(a_(n-k))", behavior:"Topological charge", complexity:"Periodic nonlinearity", description:"Periodic convolution feedback.", note:"Stylized model: approximates the listed periodic coupling.", params:[{key:"lambda",label:"lambda",value:0.45}], seeds:[{key:"a0",label:"a_0",value:0.4},{key:"a1",label:"a_1",value:0.25}], compute:({values,n,params})=> n<2 ? values[n] : (()=>{ let sum=0; for(let k=0;k<n;k+=1) sum += values[k]*Math.sin(values[n-1-k]); return params.lambda*sum; })() },

  { id:"logistic", category:"Bad (Chaos)", name:"Logistic Map", recurrence:"a_(n+1) = r a_n (1 - a_n)", behavior:"Bifurcation/chaos", complexity:"Quadratic bit-explosion", description:"Canonical one-dimensional chaotic map.", params:[{key:"r",label:"r",value:3.7}], seeds:[{key:"a0",label:"a_0",value:0.2}], compute:({values,n,params})=> n===0 ? values[0] : params.r*values[n-1]*(1-values[n-1]) },
  { id:"burgers", category:"Bad (Chaos)", name:"Burgers (Inviscid)", recurrence:"a_n = -(1 / n) sum a_k a'_(n-1-k)", behavior:"Shock wave/singularity", complexity:"Total history dependency", description:"Discrete-derivative Burgers proxy.", note:"Stylized model: discrete derivative replaces the formal derivative.", params:[], seeds:[{key:"a0",label:"a_0",value:1},{key:"a1",label:"a_1",value:-0.6}], compute:({values,n})=> n<2 ? values[n] : (()=>{ let sum=0; for(let k=0;k<=n-2;k+=1){ const d=values[n-1-k] - (values[n-2-k] ?? 0); sum += values[k]*d; } return -sum / Math.max(1,n); })() },
  { id:"navier_stokes", category:"Bad (Chaos)", name:"Navier-Stokes", recurrence:"a_n ~= sum (a_k . grad a_(n-1-k))", behavior:"Turbulence", complexity:"Multi-dimensional convolution", description:"Scalar turbulence proxy.", note:"Stylized model: scalar surrogate for a vector recurrence.", params:[{key:"nu",label:"nu",value:0.12},{key:"lambda",label:"lambda",value:0.7}], seeds:[{key:"a0",label:"a_0",value:0.8},{key:"a1",label:"a_1",value:0.3}], compute:({values,n,params})=> n<2 ? values[n] : (()=>{ let sum=0; for(let k=0;k<n-1;k+=1){ const grad=values[n-1-k] - (values[n-2-k] ?? 0); sum += values[k]*grad; } return params.lambda*sum - params.nu*values[n-1]; })() },
  { id:"lorenz", category:"Bad (Chaos)", name:"Lorenz System", recurrence:"a_(n+1) = sigma (b_n - a_n)", behavior:"Strange attractor", complexity:"Coupled nonlinearity", description:"Discrete Lorenz-inspired proxy with x plotted.", note:"Stylized model: discrete three-variable coupling.", params:[{key:"sigma",label:"sigma",value:10},{key:"rho",label:"rho",value:28},{key:"beta",label:"beta",value:2.6667},{key:"dt",label:"dt",value:0.01}], seeds:[{key:"x0",label:"x_0",value:0.1},{key:"y0",label:"y_0",value:0},{key:"z0",label:"z_0",value:0}], init:(seed)=>[{x:seed.x0,y:seed.y0,z:seed.z0}], computeState:({states,params})=>{ const s=states[states.length-1]; const dx=params.sigma*(s.y-s.x); const dy=s.x*(params.rho-s.z)-s.y; const dz=s.x*s.y-params.beta*s.z; return { x:s.x+params.dt*dx, y:s.y+params.dt*dy, z:s.z+params.dt*dz }; }, valueFromState:(state)=>state.x },
  { id:"henon", category:"Bad (Chaos)", name:"Henon Map", recurrence:"a_(n+1) = 1 - alpha a_n^2 + b_n", behavior:"Fractal basin", complexity:"Quadratic feedback", description:"Standard two-dimensional Henon map with x plotted.", params:[{key:"alpha",label:"alpha",value:1.4},{key:"beta",label:"beta",value:0.3}], seeds:[{key:"x0",label:"x_0",value:0.1},{key:"y0",label:"y_0",value:0.3}], init:(seed)=>[{x:seed.x0,y:seed.y0}], computeState:({states,params})=>{ const s=states[states.length-1]; return { x:1-params.alpha*s.x*s.x+s.y, y:params.beta*s.x }; }, valueFromState:(state)=>state.x },
  { id:"feigenbaum", category:"Bad (Chaos)", name:"Feigenbaum", recurrence:"a_(n+1) = f(lambda a_n)", behavior:"Universal scaling for chaos", complexity:"Self-referential nesting", description:"Renormalization-flavored iterated map.", note:"Stylized model: chosen to emphasize recursive scaling.", params:[{key:"lambda",label:"lambda",value:1.9},{key:"mu",label:"mu",value:0.6}], seeds:[{key:"a0",label:"a_0",value:0.2}], compute:({values,n,params})=> n===0 ? values[0] : Math.cos(params.lambda*values[n-1]) - params.mu*Math.pow(params.lambda*values[n-1],2) },
  { id:"three_body", category:"Bad (Chaos)", name:"Three-Body", recurrence:"a_(n+2) ~= (a_n a_(n+1)) / |a_(n+1) - a_n|^3", behavior:"Non-integrable gravity", complexity:"Singularity sensitivity", description:"Scalar instability proxy with denominator sensitivity.", note:"Stylized model: scalar analogue of multi-body chaos.", params:[{key:"eps",label:"eps",value:0.08}], seeds:[{key:"a0",label:"a_0",value:0.8},{key:"a1",label:"a_1",value:1.1}], compute:({values,n,params})=> n<2 ? values[n] : (values[n-2]*values[n-1]) / Math.pow(Math.abs(values[n-1]-values[n-2])+params.eps,3) },
  { id:"collatz", category:"Bad (Chaos)", name:"Collatz Conjecture", recurrence:"a_(n+1) = f(a_n parity)", behavior:"Unpredictable path", complexity:"Logical discontinuity", description:"Classic parity-driven recurrence.", params:[], seeds:[{key:"a0",label:"a_0",value:27}], compute:({values,n})=> n===0 ? values[0] : (values[n-1] % 2 === 0 ? values[n-1]/2 : 3*values[n-1]+1) },
  { id:"mandelbrot", category:"Bad (Chaos)", name:"Mandelbrot", recurrence:"z_(n+1) = z_n^2 + c", behavior:"Fractal boundary", complexity:"Complex quadratic map", description:"Complex iteration with the real part plotted.", params:[{key:"cRe",label:"Re(c)",value:-0.8},{key:"cIm",label:"Im(c)",value:0.156}], seeds:[{key:"zRe0",label:"Re(z_0)",value:0},{key:"zIm0",label:"Im(z_0)",value:0}], init:(seed)=>[{re:seed.zRe0,im:seed.zIm0}], computeState:({states,params})=>{ const s=states[states.length-1]; return { re:s.re*s.re - s.im*s.im + params.cRe, im:2*s.re*s.im + params.cIm }; }, valueFromState:(state)=>state.re },
  { id:"reaction_diffusion", category:"Bad (Chaos)", name:"Reaction-Diffusion", recurrence:"a_n = sum a_k a_(n-k) + nabla^2 a_n", behavior:"Pattern formation (Turing)", complexity:"Spatial/temporal coupling", description:"Scalar reaction-diffusion proxy.", note:"Stylized model: one-dimensional surrogate.", params:[{key:"reaction",label:"reaction",value:0.22},{key:"diffusion",label:"diffusion",value:0.4}], seeds:[{key:"a0",label:"a_0",value:0.4},{key:"a1",label:"a_1",value:0.5},{key:"a2",label:"a_2",value:0.36}], compute:({values,n,params})=> n<3 ? values[n] : (()=>{ let sum=0; for(let k=0;k<n;k+=1) sum += values[k]*values[n-1-k]; const lap=values[n-1] - 2*values[n-2] + values[n-3]; return params.reaction*sum + params.diffusion*lap; })() }
];

const CATEGORY_ALL = "All";
const categoryFilter = document.getElementById("category-filter");
const presetSelect = document.getElementById("preset-select");
const termCountInput = document.getElementById("term-count");
const plotModeSelect = document.getElementById("plot-mode");
const paramFields = document.getElementById("param-fields");
const seedFields = document.getElementById("seed-fields");
const presetLibrary = document.getElementById("preset-library");
const chart = document.getElementById("chart");
const chartEmpty = document.getElementById("chart-empty");
const dependencyChart = document.getElementById("dependency-chart");
const dependencySummary = document.getElementById("dependency-summary");
const dependencyScale = document.getElementById("dependency-scale");
const sequenceBody = document.getElementById("sequence-body");
const statCount = document.getElementById("stat-count");
const statMin = document.getElementById("stat-min");
const statMax = document.getElementById("stat-max");
const statFinal = document.getElementById("stat-final");
const statSign = document.getElementById("stat-sign");
const statCycle = document.getElementById("stat-cycle");
const presetName = document.getElementById("preset-name");
const presetFormula = document.getElementById("preset-formula");
const presetBehavior = document.getElementById("preset-behavior");
const presetComplexity = document.getElementById("preset-complexity");
const presetDescription = document.getElementById("preset-description");
const presetNote = document.getElementById("preset-note");

function safeDenom(value){ return Math.abs(value) < 1e-12 ? 1e-12 : value; }
function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }
function sanitize(value){ if (Number.isNaN(value)) return 0; if (value === Infinity) return 1e12; if (value === -Infinity) return -1e12; return clamp(value, -1e12, 1e12); }
function expandExponential(text){
  const match = String(text).match(/^([+-]?)(\d+(?:\.\d+)?)e([+-]?\d+)$/i);
  if (!match) return String(text);
  const sign = match[1] === "-" ? "-" : "";
  const mantissa = match[2];
  const exponent = Number(match[3]);
  const parts = mantissa.split(".");
  const whole = parts[0];
  const frac = parts[1] || "";
  const digits = whole + frac;

  if (exponent >= 0) {
    if (frac.length <= exponent) {
      return sign + digits + "0".repeat(exponent - frac.length);
    }
    const splitIndex = whole.length + exponent;
    return sign + digits.slice(0, splitIndex) + "." + digits.slice(splitIndex);
  }

  const zeros = Math.abs(exponent) - whole.length;
  if (zeros >= 0) {
    return sign + "0." + "0".repeat(zeros) + digits;
  }
  const splitIndex = whole.length + exponent;
  return sign + digits.slice(0, splitIndex) + "." + digits.slice(splitIndex);
}

function fmt(value){
  if (!Number.isFinite(value)) return String(value);
  const exactish = expandExponential(value.toString());
  if (exactish.includes(".")) {
    return exactish.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  }
  return exactish;
}
function tone(category){ if (category.includes("Chaos")) return "chaos"; if (category.includes("Painleve")) return "magic"; return ""; }
function getPreset(id){ return PRESETS.find((preset)=>preset.id===id) || PRESETS[0]; }

function dependencyInfoForPreset(preset){
  if (preset.category === "Good (Linear)") {
    const memoryMatch = preset.complexity.match(/(\d+)-step|Single dependency/i);
    const steps = memoryMatch ? (memoryMatch[1] ? Number(memoryMatch[1]) : 1) : 2;
    return {
      mode: "local",
      label: `This rule only needs the most recent ${steps} term${steps === 1 ? "" : "s"} to keep going.`,
      footprint: (n)=>Math.min(Math.max(1, steps), Math.max(1, n))
    };
  }

  if (preset.category === "Painleve (Magic)") {
    return {
      mode: "hybrid",
      label: "This rule mixes many earlier terms together, but in a structured and integrable way rather than fully chaotic history explosion.",
      footprint: (n)=>Math.max(1, n)
    };
  }

  return {
    mode: "global",
    label: "This rule is history-heavy: later terms can depend on a large fraction of everything that came before.",
    footprint: (n)=>Math.max(1, n)
  };
}

function buildCategoryOptions(){
  const categories = [CATEGORY_ALL, ...new Set(PRESETS.map((preset)=>preset.category))];
  categoryFilter.innerHTML = categories.map((category)=>`<option value="${category}">${category}</option>`).join("");
}

function buildPresetOptions(){
  const selected = categoryFilter.value || CATEGORY_ALL;
  const visible = PRESETS.filter((preset)=>selected===CATEGORY_ALL || preset.category===selected);
  presetSelect.innerHTML = visible.map((preset)=>`<option value="${preset.id}">${preset.name}</option>`).join("");
  if (!visible.some((preset)=>preset.id===presetSelect.value)) presetSelect.value = visible[0]?.id || PRESETS[0].id;
}

function fieldMarkup(field, group){
  return `<label class="field"><span>${field.label}</span><input data-group="${group}" data-key="${field.key}" type="number" step="any" value="${field.value}"></label>`;
}

function renderPresetDetails(){
  const preset = getPreset(presetSelect.value);
  presetName.textContent = preset.name;
  renderFormula(preset.recurrence);
  presetBehavior.textContent = preset.behavior;
  presetComplexity.textContent = preset.complexity;
  presetDescription.textContent = preset.description;
  presetNote.textContent = preset.note || "";
  paramFields.innerHTML = preset.params.length ? preset.params.map((field)=>fieldMarkup(field, "params")).join("") : `<div class="helper-copy">No extra parameters for this preset.</div>`;
  seedFields.innerHTML = preset.seeds.map((field)=>fieldMarkup(field, "seeds")).join("");
}

function renderFormula(recurrence){
  const latex = recurrenceToLatex(recurrence);
  presetFormula.classList.add("katex-ready");
  if (window.katex) {
    window.katex.render(latex, presetFormula, {
      throwOnError: false,
      displayMode: true
    });
    return;
  }
  presetFormula.textContent = recurrence;
}

function recurrenceToLatex(text){
  return String(text)
    .replace(/~=|≈/g, "\\approx ")
    .replace(/\bexp\(/g, "\\exp(")
    .replace(/\bsum_\(([^)]+)\)\^([^\s]+)\s/g, "\\sum_{$1}^{$2} ")
    .replace(/\bsum_\(([^)]+)\)/g, "\\sum_{$1}")
    .replace(/\bdelta_\(([^)]+)\)/g, "\\delta_{$1}")
    .replace(/\bnabla\^2/g, "\\nabla^2")
    .replace(/\bphi\b/g, "\\phi")
    .replace(/\balpha\b/g, "\\alpha")
    .replace(/\bsigma\b/g, "\\sigma")
    .replace(/\blambda\b/g, "\\lambda")
    .replace(/\bmu\b/g, "\\mu")
    .replace(/\ba_\(([^)]+)\)/g, "a_{$1}")
    .replace(/\bz_\(([^)]+)\)/g, "z_{$1}")
    .replace(/\bb_\(([^)]+)\)/g, "b_{$1}")
    .replace(/([a-zA-Z])_n\b/g, "$1_n")
    .replace(/\^n\b/g, "^{n}")
    .replace(/\^2\b/g, "^{2}")
    .replace(/\^3\b/g, "^{3}")
    .replace(/<=/g, "\\le ")
    .replace(/<\s*n/g, "< n")
    .replace(/\.\.\./g, "\\dots")
    .replace(/\|([^|]+)\|/g, "\\lvert $1 \\rvert")
    .replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, "\\frac{$1}{$2}")
    .replace(/\\exp\(([^)]+)\)/g, "\\exp\\left($1\\right)")
    .replace(/\s+/g, " ")
    .trim();
}

function renderLibrary(){
  presetLibrary.innerHTML = PRESETS.map((preset)=>`
    <article class="library-card">
      <span class="pill ${tone(preset.category)}">${preset.category}</span>
      <h3>${preset.name}</h3>
      <p>${preset.recurrence}</p>
      <p class="helper-copy">${preset.behavior}</p>
      <button class="btn ghost" data-jump="${preset.id}">Load Preset</button>
    </article>
  `).join("");

  presetLibrary.querySelectorAll("[data-jump]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      const preset = getPreset(button.dataset.jump);
      categoryFilter.value = preset.category;
      buildPresetOptions();
      presetSelect.value = preset.id;
      renderPresetDetails();
      generateSequence();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function readGroup(group){
  const map = {};
  document.querySelectorAll(`[data-group="${group}"]`).forEach((field)=>{
    const numeric = Number(field.value);
    map[field.dataset.key] = Number.isFinite(numeric) ? numeric : 0;
  });
  return map;
}

function randomizeSeeds(){
  document.querySelectorAll('[data-group="seeds"]').forEach((field)=>{
    field.value = Number((Math.random() * 2 - 1).toFixed(4));
  });
}

function generateScalarSequence(preset, count, params, seedMap){
  const values = preset.seeds.map((seed)=>seedMap[seed.key]);
  while (values.length < count) {
    const n = values.length;
    values.push(sanitize(preset.compute({ values, n, params, seedMap })));
  }
  return values.slice(0, count);
}

function generateStateSequence(preset, count, params, seedMap){
  const states = preset.init(seedMap);
  const values = [sanitize(preset.valueFromState(states[0]))];
  while (values.length < count) {
    const nextState = preset.computeState({ states, params, seedMap });
    states.push(nextState);
    values.push(sanitize(preset.valueFromState(nextState)));
  }
  return values;
}

function seriesForMode(values, mode){
  if (mode === "delta") return values.map((value, index)=> index===0 ? 0 : value - values[index-1]);
  if (mode === "magnitude") return values.map((value)=>Math.abs(value));
  return values.slice();
}

function detectCycle(values){
  const tail = values.slice(-12).map((value)=>Number(value.toFixed(5)));
  for (let length = 1; length <= 6; length += 1) {
    const a = tail.slice(-length);
    const b = tail.slice(-2 * length, -length);
    if (a.length === length && b.length === length && a.every((value, index)=>Math.abs(value - b[index]) < 1e-5)) return `length ${length}`;
  }
  return "None";
}

function signChanges(values){
  let count = 0;
  for (let i = 1; i < values.length; i += 1) {
    if ((values[i] > 0 && values[i-1] < 0) || (values[i] < 0 && values[i-1] > 0)) count += 1;
  }
  return count;
}

function updateStats(values){
  statCount.textContent = String(values.length);
  statMin.textContent = fmt(Math.min(...values));
  statMax.textContent = fmt(Math.max(...values));
  statFinal.textContent = fmt(values[values.length-1]);
  statSign.textContent = String(signChanges(values));
  statCycle.textContent = detectCycle(values);
}

function renderTable(values){
  if (!values.length) {
    sequenceBody.innerHTML = `<tr class="empty-row"><td colspan="4">No sequence yet.</td></tr>`;
    return;
  }
  sequenceBody.innerHTML = values.map((value, index)=>{
    const delta = index===0 ? 0 : value - values[index-1];
    return `<tr><td>${index}</td><td>${fmt(value)}</td><td>${fmt(delta)}</td><td>${fmt(Math.abs(value))}</td></tr>`;
  }).join("");
}

function renderChart(values){
  if (!values.length) {
    chart.innerHTML = "";
    chartEmpty.style.display = "grid";
    return;
  }

  chartEmpty.style.display = "none";
  const width = 900;
  const height = 360;
  const pad = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index)=>{
    const x = pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const zeroY = height - pad - ((0 - min) / span) * (height - pad * 2);
  const dots = values.map((value, index)=>{
    const x = pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return `<circle cx="${x}" cy="${y}" r="3.3" fill="#c2410c" />`;
  }).join("");
  const topLabel = truncateLabel(`max ${fmt(max)}`, 34);
  const bottomLabel = truncateLabel(`min ${fmt(min)}`, 34);

  chart.innerHTML = `
    <defs>
      <linearGradient id="bg-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fffaf4" />
        <stop offset="100%" stop-color="#fff1dd" />
      </linearGradient>
      <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0f766e" />
        <stop offset="100%" stop-color="#c2410c" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg-gradient)" rx="18" />
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height-pad}" stroke="rgba(113,92,69,0.2)" />
    <line x1="${pad}" y1="${height-pad}" x2="${width-pad}" y2="${height-pad}" stroke="rgba(113,92,69,0.2)" />
    ${zeroY >= pad && zeroY <= height-pad ? `<line x1="${pad}" y1="${zeroY}" x2="${width-pad}" y2="${zeroY}" stroke="rgba(190,24,93,0.28)" stroke-dasharray="4 5" />` : ""}
    <polyline fill="none" stroke="url(#line-gradient)" stroke-width="3.5" points="${points}" stroke-linecap="round" stroke-linejoin="round" />
    ${dots}
    <text x="${pad}" y="18" fill="#6b7280" font-size="12">${topLabel}</text>
    <text x="${pad}" y="${height-10}" fill="#6b7280" font-size="12">${bottomLabel}</text>
  `;
}

function truncateLabel(text, maxLength){
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function renderDependencyView(preset, values){
  const info = dependencyInfoForPreset(preset);
  const width = 900;
  const height = 210;
  const padTop = 36;
  const padBottom = 32;
  const padLeft = 230;
  const padRight = 24;
  const count = values.length;
  const maxFootprint = Math.max(1, ...values.map((_, index)=>info.footprint(index)));
  dependencySummary.textContent = info.label;
  dependencyScale.textContent = `Higher bars mean each new term is pulling in more of the earlier sequence.`;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const plotLeft = padLeft;
  const plotRight = width - padRight;
  const plotBottom = height - padBottom;

  const bars = values.map((_, index)=>{
    const footprint = info.footprint(index);
    const x = plotLeft + (index / Math.max(1, count - 1)) * plotWidth;
    const barWidth = Math.max(8, plotWidth / Math.max(14, count));
    const barHeight = (footprint / maxFootprint) * plotHeight;
    const y = plotBottom - barHeight;
    const color = dependencyColor(footprint / maxFootprint, info.mode);
    return `<rect x="${x - barWidth / 2}" y="${y}" width="${barWidth}" height="${barHeight}" rx="5" fill="${color}" />`;
  }).join("");

  const levels = dependencyLevels(maxFootprint);
  const marks = levels.map((label)=>{
    const ratio = label / maxFootprint;
    const y = plotBottom - ratio * plotHeight;
    return `
      <line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="rgba(113,92,69,0.1)" />
      <text x="${plotLeft - 18}" y="${y + 4}" text-anchor="end" fill="#6b7280" font-size="11">${label} prior</text>
    `;
  }).join("");

  const leftGutter = `
    <rect x="18" y="${padTop - 16}" width="${padLeft - 44}" height="${plotHeight + 24}" rx="14" fill="rgba(255,255,255,0.42)" />
    <text x="30" y="${padTop - 10}" fill="#6b7280" font-size="11" font-weight="700">memory used</text>
  `;

  dependencyChart.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(255,250,244,0.75)" rx="18" />
    ${leftGutter}
    <line x1="${plotLeft}" y1="${padTop}" x2="${plotLeft}" y2="${plotBottom}" stroke="rgba(113,92,69,0.2)" />
    <line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" stroke="rgba(113,92,69,0.2)" />
    ${marks}
    ${bars}
    <text x="${plotRight}" y="${height - 10}" text-anchor="end" fill="#6b7280" font-size="11">later terms →</text>
  `;
}

function dependencyLevels(maxFootprint){
  if (maxFootprint <= 4) {
    return Array.from({ length: maxFootprint }, (_, index)=>index + 1);
  }

  const rawLevels = [1, Math.ceil(maxFootprint / 3), Math.ceil((2 * maxFootprint) / 3), maxFootprint];
  return [...new Set(rawLevels)].sort((a, b)=>a - b);
}

function dependencyColor(ratio, mode){
  if (mode === "local") {
    return `rgba(15, 118, 110, ${0.35 + ratio * 0.55})`;
  }
  if (mode === "hybrid") {
    return `rgba(180, 83, 9, ${0.35 + ratio * 0.55})`;
  }
  return `rgba(190, 24, 93, ${0.35 + ratio * 0.55})`;
}

function generateSequence(){
  const preset = getPreset(presetSelect.value);
  const count = clamp(Number(termCountInput.value) || 20, 5, 250);
  termCountInput.value = String(count);
  const params = readGroup("params");
  const seedMap = readGroup("seeds");
  const rawValues = preset.computeState ? generateStateSequence(preset, count, params, seedMap) : generateScalarSequence(preset, count, params, seedMap);
  updateStats(rawValues);
  renderTable(rawValues);
  renderChart(seriesForMode(rawValues, plotModeSelect.value));
  renderDependencyView(preset, rawValues);
}

categoryFilter.addEventListener("change", ()=>{ buildPresetOptions(); renderPresetDetails(); generateSequence(); });
presetSelect.addEventListener("change", ()=>{ renderPresetDetails(); generateSequence(); });
plotModeSelect.addEventListener("change", generateSequence);
document.getElementById("generate-btn").addEventListener("click", generateSequence);
document.getElementById("randomize-btn").addEventListener("click", ()=>{ randomizeSeeds(); generateSequence(); });
document.getElementById("reset-btn").addEventListener("click", ()=>{ renderPresetDetails(); generateSequence(); });

buildCategoryOptions();
buildPresetOptions();
presetSelect.value = "fibonacci";
renderPresetDetails();
renderLibrary();
generateSequence();
