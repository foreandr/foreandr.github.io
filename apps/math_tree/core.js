(function () {
  "use strict";

  const DOMAIN_META = {
    Algebra: { color: "#f59e0b" },
    Analysis: { color: "#22c55e" },
    Topology: { color: "#06b6d4" },
    Geometry: { color: "#a855f7" },
    "Category Theory": { color: "#6366f1" },
    "Number Theory": { color: "#f97316" },
    Combinatorics: { color: "#14b8a6" },
    Logic: { color: "#ef4444" },
    Physics: { color: "#ec4899" },
    Other: { color: "#64748b" }
  };

  const REPLACEMENTS = [
    [/Ã—/g, "×"],
    [/â†’/g, "→"],
    [/âˆª/g, "∪"],
    [/Ïƒ/g, "σ"],
    [/â„/g, "ℝ"],
    [/â„¤â‚š/g, "ℤₚ"],
    [/Î£/g, "Σ"],
    [/áµ€/g, "ᵀ"],
    [/â‚‚/g, "₂"],
    [/ÄŒ/g, "Č"],
    [/Ã©/g, "é"],
    [/Ã¤/g, "ä"],
    [/âˆž/g, "∞"],
    [/â‰¥/g, "≥"],
    [/â‰¤/g, "≤"]
  ];

  function cleanText(value) {
    let text = String(value || "");
    for (const [pattern, replacement] of REPLACEMENTS) {
      text = text.replace(pattern, replacement);
    }
    return text;
  }

  function inferDomain(node) {
    const s = `${node.id} ${node.name}`.toLowerCase();
    if (/logic|proof|model|type|forcing|zfc|nbg|peano|godel|lambda|turing|comput/.test(s)) return "Logic";
    if (/number|prime|riemann-zeta|l-function|galois|modular|fermat|goldbach|iwasawa|langlands|p-adic-l/.test(s)) return "Number Theory";
    if (/categ|functor|adjoint|topos|monad|operad|yoneda|kan|stack|sheaf|quillen/.test(s)) return "Category Theory";
    if (/topolog|homotopy|homolog|cohomolog|bundle|manifold|cw-complex|simplicial|knot|cobord/.test(s)) return "Topology";
    if (/riemannian|kahler|symplectic|calabi|curve|variety|scheme|moduli|hyperbolic/.test(s)) return "Geometry";
    if (/banach|hilbert|fourier|laplace|measure|integral|differenti|analytic|sobolev|operator/.test(s)) return "Analysis";
    if (/group|ring|field|module|algebra|lattice|monoid|semigroup|vector-space|ideal|tensor/.test(s)) return "Algebra";
    if (/graph|matroid|partition|combinat|ramsey|design|code|chromatic|incidence/.test(s)) return "Combinatorics";
    if (/quantum|yang|gauge|qft|hamilton|lagrangian|cstar|spectral/.test(s)) return "Physics";
    return "Other";
  }

  function buildModel(rawNodes) {
    const nodes = rawNodes.map((node) => ({
      ...node,
      name: cleanText(node.name),
      axiom: cleanText(node.axiom),
      parents: Array.isArray(node.parents) ? node.parents.slice() : [],
      level: Number.isFinite(node.level) ? node.level : 0
    }));

    const byId = new Map();
    nodes.forEach((node) => {
      node.domain = inferDomain(node);
      node.children = [];
      byId.set(node.id, node);
    });

    nodes.forEach((node) => {
      node.parents.forEach((parentId) => {
        const parent = byId.get(parentId);
        if (parent) parent.children.push(node.id);
      });
    });

    const levels = [...new Set(nodes.map((node) => node.level))].sort((a, b) => a - b);
    const domains = [...new Set(nodes.map((node) => node.domain))].sort();

    return {
      nodes,
      byId,
      levels,
      domains,
      domainMeta: DOMAIN_META
    };
  }

  window.MathTreeCore = {
    DOMAIN_META,
    cleanText,
    inferDomain,
    buildModel
  };
})();
