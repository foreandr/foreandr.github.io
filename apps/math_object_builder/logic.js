(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.MathObjectBuilderLogic = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const NUMBER_SYSTEMS = [
    {
      id: "naturals",
      label: "Natural Numbers",
      short: "N",
      search: ["natural", "naturals", "counting", "n"],
      facts: ["No additive inverses for positive elements.", "Supports addition and multiplication."],
      tags: ["Semiring", "Ordered"],
      capabilities: {
        additiveInverses: false,
        multiplicativeInverses: false,
        commutativeRing: false,
        field: false,
        scalarField: false,
        moduleBase: false,
        hilbertScalar: false,
      },
    },
    {
      id: "integers",
      label: "Integers",
      short: "Z",
      search: ["integers", "integer", "whole", "z"],
      facts: ["Every element has an additive inverse.", "Not every nonzero element has a multiplicative inverse."],
      tags: ["Ring", "PID"],
      capabilities: {
        additiveInverses: true,
        multiplicativeInverses: false,
        commutativeRing: true,
        field: false,
        scalarField: false,
        moduleBase: true,
        hilbertScalar: false,
      },
    },
    {
      id: "rationals",
      label: "Rational Numbers",
      short: "Q",
      search: ["rational", "rationals", "fractions", "q"],
      facts: ["A field with exact division by nonzero elements.", "Standard scalar field for vector spaces."],
      tags: ["Field", "Characteristic 0"],
      capabilities: {
        additiveInverses: true,
        multiplicativeInverses: true,
        commutativeRing: true,
        field: true,
        scalarField: true,
        moduleBase: true,
        hilbertScalar: false,
      },
    },
    {
      id: "reals",
      label: "Real Numbers",
      short: "R",
      search: ["real", "reals", "continuum", "r"],
      facts: ["A complete ordered field.", "Standard scalar field for Banach and Hilbert spaces."],
      tags: ["Field", "Complete", "Ordered"],
      capabilities: {
        additiveInverses: true,
        multiplicativeInverses: true,
        commutativeRing: true,
        field: true,
        scalarField: true,
        moduleBase: true,
        hilbertScalar: true,
      },
    },
    {
      id: "complex",
      label: "Complex Numbers",
      short: "C",
      search: ["complex", "complex numbers", "c"],
      facts: ["An algebraically closed field.", "Standard scalar field for complex Hilbert spaces."],
      tags: ["Field", "Complete", "Algebraically Closed"],
      capabilities: {
        additiveInverses: true,
        multiplicativeInverses: true,
        commutativeRing: true,
        field: true,
        scalarField: true,
        moduleBase: true,
        hilbertScalar: true,
      },
    },
    {
      id: "quaternions",
      label: "Quaternions",
      short: "H",
      search: ["quaternion", "quaternions", "hamilton", "h"],
      facts: ["A division algebra but not a commutative field.", "Useful as a module base, not as a scalar field in the usual vector-space sense."],
      tags: ["Division Algebra", "Noncommutative"],
      capabilities: {
        additiveInverses: true,
        multiplicativeInverses: true,
        commutativeRing: false,
        field: false,
        scalarField: false,
        moduleBase: true,
        hilbertScalar: false,
      },
    },
  ];

  const OBJECT_FAMILIES = [
    { id: "set", label: "Set", search: ["set", "collection"], rule: "always" },
    { id: "monoid", label: "Monoid", search: ["monoid"], rule: "always" },
    { id: "group", label: "Group", search: ["group"], rule: "needs_additive_inverses" },
    { id: "ring", label: "Ring", search: ["ring"], rule: "needs_commutative_ring" },
    { id: "field", label: "Field", search: ["field"], rule: "needs_field" },
    { id: "module", label: "Module", search: ["module"], rule: "needs_module_base" },
    { id: "vector_space", label: "Vector Space", search: ["vector", "vector space", "space"], rule: "needs_scalar_field" },
    { id: "manifold", label: "Manifold", search: ["manifold", "smooth", "space"], rule: "needs_scalar_field" },
    { id: "banach_space", label: "Banach Space", search: ["banach", "space"], rule: "needs_hilbert_scalar" },
    { id: "hilbert_space", label: "Hilbert Space", search: ["hilbert", "space"], rule: "needs_hilbert_scalar" },
    { id: "algebra", label: "Algebra", search: ["algebra"], rule: "needs_scalar_field" },
  ];

  function getNumberSystem(baseId) {
    return NUMBER_SYSTEMS.find((item) => item.id === baseId) || NUMBER_SYSTEMS[3];
  }

  function getObjectFamily(familyId) {
    return OBJECT_FAMILIES.find((item) => item.id === familyId) || OBJECT_FAMILIES[6];
  }

  function getObjectFamilyState(baseId, familyId) {
    const base = getNumberSystem(baseId);
    const family = getObjectFamily(familyId);
    const caps = base.capabilities;

    switch (family.rule) {
      case "always":
        return { available: true, reason: `${base.label} can certainly be treated as the underlying set for this object.` };
      case "needs_additive_inverses":
        return caps.additiveInverses
          ? { available: true, reason: `${base.label} supports additive inverses, so a group structure is available.` }
          : { available: false, reason: `${base.label} does not give additive inverses for every element, so you do not get a group.` };
      case "needs_commutative_ring":
        return caps.commutativeRing
          ? { available: true, reason: `${base.label} already carries a commutative ring structure.` }
          : { available: false, reason: `${base.label} is not a commutative ring, so ring structure is unavailable here.` };
      case "needs_field":
        return caps.field
          ? { available: true, reason: `${base.label} is a field, so field structure is available.` }
          : { available: false, reason: `${base.label} is not a field${baseId === "quaternions" ? " because multiplication is not commutative" : ""}.` };
      case "needs_module_base":
        return caps.moduleBase
          ? { available: true, reason: `${base.label} can act as the base ring for modules.` }
          : { available: false, reason: `${base.label} is not being treated here as a valid module base.` };
      case "needs_scalar_field":
        return caps.scalarField
          ? { available: true, reason: `${base.label} can serve as a scalar field for vector spaces.` }
          : { available: false, reason: `${base.label} cannot serve as the scalar field for a vector space in this builder.` };
      case "needs_hilbert_scalar":
        return caps.hilbertScalar
          ? { available: true, reason: `${base.label} supports the usual Banach/Hilbert space story.` }
          : { available: false, reason: `${base.label} is not one of the standard real or complex scalar systems for Banach or Hilbert spaces.` };
      default:
        return { available: false, reason: "This object rule has not been implemented yet." };
    }
  }

  function buildVectorSpaceProfile(base, dimension) {
    const power = Number.isFinite(dimension) && dimension > 0 ? dimension : 1;
    return {
      title: `${base.label.replace(" Numbers", "")} Vector Space`,
      notation: `${base.short}^${power}`,
      summary: `A ${power}-dimensional vector space over ${base.short}.`,
      actions: [
        { label: "Vector addition", expression: "(u, v) -> u + v", detail: "Add any two vectors and stay inside the space." },
        { label: "Scalar multiplication", expression: `(a, v) -> av with a in ${base.short}`, detail: "Scale vectors by elements of the chosen scalar field." },
        { label: "Zero vector", expression: "0", detail: "There is a distinguished vector acting as the additive identity." },
        { label: "Additive inverse", expression: "v -> -v", detail: "Every vector can be cancelled by another vector in the same space." },
        { label: "Linear combinations", expression: "a1v1 + ... + akvk", detail: "This is the core construction that span, basis, and dimension depend on." },
      ],
      facts: [
        `dim_${base.short}(${base.short}^${power}) = ${power}`,
        `A basis has ${power} vector${power === 1 ? "" : "s"}.`,
        "Every finite-dimensional vector space over a field is isomorphic to F^n once a basis is chosen.",
      ],
      next: "Maps come next: linear maps, injective/surjective choices, and dimension changes.",
    };
  }

  function buildFallbackProfile(base, family) {
    const availability = getObjectFamilyState(base.id, family.id);
    return {
      title: family.label,
      notation: `${family.label} over ${base.short}`,
      summary: availability.reason,
      actions: [],
      facts: base.facts.slice(),
      next: family.id === "vector_space"
        ? "Choose a valid scalar field to unlock vector-space actions."
        : "This first pass is centered on vector spaces; other families are visible so the search flow already makes sense.",
    };
  }

  function buildObjectProfile({ baseId, familyId, dimension }) {
    const base = getNumberSystem(baseId);
    const family = getObjectFamily(familyId);
    if (family.id === "vector_space" && getObjectFamilyState(baseId, familyId).available) {
      return buildVectorSpaceProfile(base, dimension);
    }
    return buildFallbackProfile(base, family);
  }

  function createInitialChain(baseId) {
    const base = getNumberSystem(baseId);
    return [{
      kind: "base",
      id: `base:${base.id}`,
      baseId: base.id,
      label: base.short,
      title: base.label,
    }];
  }

  function getCurrentBaseId(chain) {
    return chain[0]?.baseId || "reals";
  }

  function getLastNode(chain) {
    return chain[chain.length - 1];
  }

  function listAvailableMoves(chain) {
    const baseId = getCurrentBaseId(chain);
    const base = getNumberSystem(baseId);
    const last = getLastNode(chain);

    if (!last || last.kind === "base") {
      return [
        getObjectFamilyState(baseId, "field").available ? { id: "field", label: `${base.short} as a field`, kind: "object" } : null,
        getObjectFamilyState(baseId, "module").available ? { id: "module", label: `Module over ${base.short}`, kind: "object" } : null,
        getObjectFamilyState(baseId, "vector_space").available ? { id: "vector_space", label: `Vector space over ${base.short}`, kind: "object" } : null,
        getObjectFamilyState(baseId, "manifold").available ? { id: "manifold", label: `${base.short}-manifold`, kind: "object" } : null,
      ].filter(Boolean);
    }

    if (last.kind === "object" && last.family === "vector_space") {
      return [
        { id: "linear_map", label: "Linear map", kind: "map" },
        { id: "algebra", label: "Algebra", kind: "object" },
        { id: "clifford_algebra", label: "Clifford algebra", kind: "object" },
      ];
    }

    if (last.kind === "object" && last.family === "manifold") {
      return [
        { id: "smooth_map", label: "Smooth map", kind: "map" },
        { id: "complex_manifold", label: "Complex manifold", kind: "object" },
      ];
    }

    if (last.kind === "object" && last.family === "algebra") {
      return [{ id: "linear_map", label: "Linear map", kind: "map" }];
    }

    if (last.kind === "map" && last.family === "linear_map") {
      return [{ id: "vector_space_target", label: "Target vector space", kind: "object" }];
    }

    if (last.kind === "map" && last.family === "smooth_map") {
      return [{ id: "manifold_target", label: "Target manifold", kind: "object" }];
    }

    return [];
  }

  function applyMove(chain, moveId, options = {}) {
    const next = chain.slice();
    const baseId = getCurrentBaseId(chain);
    const base = getNumberSystem(baseId);
    const last = getLastNode(chain);

    if (moveId === "vector_space") {
      next.push({
        kind: "object",
        family: "vector_space",
        id: `object:${next.length}`,
        baseId,
        label: `${base.short}^${options.dimension || 1}`,
        title: "Vector Space",
        dimension: options.dimension || 1,
      });
      return next;
    }

    if (moveId === "module") {
      next.push({
        kind: "object",
        family: "module",
        id: `object:${next.length}`,
        baseId,
        label: `${base.short}-Mod`,
        title: "Module",
      });
      return next;
    }

    if (moveId === "field") {
      next.push({
        kind: "object",
        family: "field",
        id: `object:${next.length}`,
        baseId,
        label: base.short,
        title: "Field",
      });
      return next;
    }

    if (moveId === "manifold") {
      next.push({
        kind: "object",
        family: "manifold",
        id: `object:${next.length}`,
        baseId,
        label: `${base.short}M`,
        title: "Manifold",
        dimension: options.dimension || 2,
      });
      return next;
    }

    if (moveId === "banach_space" || moveId === "hilbert_space") {
      next.push({
        kind: "object",
        family: moveId,
        id: `object:${next.length}`,
        baseId,
        label: `${base.short}^${options.dimension || 2}`,
        title: moveId === "hilbert_space" ? "Hilbert Space" : "Banach Space",
        dimension: options.dimension || 2,
      });
      return next;
    }

    if (moveId === "algebra" || moveId === "clifford_algebra") {
      next.push({
        kind: "object",
        family: "algebra",
        id: `object:${next.length}`,
        baseId,
        label: moveId === "clifford_algebra" ? `Cl(${last.label})` : `Alg(${last.label || base.short})`,
        title: moveId === "clifford_algebra" ? "Clifford Algebra" : "Algebra",
        sourceObjectId: last?.id || null,
      });
      return next;
    }

    if (moveId === "linear_map") {
      const targetDimension = options.targetDimension || last.dimension || 1;
      next.push({
        kind: "map",
        family: "linear_map",
        id: `map:${next.length}`,
        baseId,
        label: `T: ${last.label} -> ${base.short}^${targetDimension}`,
        title: "Linear Map",
        property: options.property || "free",
        targetDimension,
      });
      next.push({
        kind: "object",
        family: "vector_space",
        id: `object:${next.length + 1}`,
        baseId,
        label: `${base.short}^${targetDimension}`,
        title: "Vector Space",
        dimension: targetDimension,
      });
      return next;
    }

    if (moveId === "smooth_map") {
      const targetDimension = options.targetDimension || last.dimension || 2;
      next.push({
        kind: "map",
        family: "smooth_map",
        id: `map:${next.length}`,
        baseId,
        label: `f: ${last.label} -> ${base.short}M_${targetDimension}`,
        title: "Smooth Map",
        targetDimension,
      });
      next.push({
        kind: "object",
        family: "manifold",
        id: `object:${next.length + 1}`,
        baseId,
        label: `${base.short}M_${targetDimension}`,
        title: "Manifold",
        dimension: targetDimension,
      });
      return next;
    }

    return next;
  }

  return {
    NUMBER_SYSTEMS,
    OBJECT_FAMILIES,
    getNumberSystem,
    getObjectFamily,
    getObjectFamilyState,
    buildObjectProfile,
    createInitialChain,
    listAvailableMoves,
    applyMove,
  };
});
