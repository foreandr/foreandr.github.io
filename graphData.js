// --- NODE DEFINITIONS ---
// All levels are calculated for strict maximum dependency depth.
// All node labels are pure, non-mathematical English titles.
var nodesArray = [
    // LEVEL 0
    {id: 0, label: 'Base Set V', level: 0, color: {background: '#97C2FC'}},

    // LEVEL 1: Axioms and Properties (Base)
    {id: 1, label: 'Additive Closure', level: 1, color: {background: '#ADD8E6'}},
    {id: 2, label: 'Additive Commutativity', level: 1, color: {background: '#ADD8E6'}},
    {id: 3, label: 'Additive Associativity', level: 1, color: {background: '#ADD8E6'}},
    {id: 4, label: 'Additive Identity', level: 1, color: {background: '#ADD8E6'}},
    {id: 5, label: 'Additive Inverse', level: 1, color: {background: '#ADD8E6'}},
    {id: 6, label: 'Multiplicative Closure', level: 1, color: {background: '#ADD8E6'}},
    {id: 7, label: 'Multiplicative Associativity', level: 1, color: {background: '#ADD8E6'}},
    {id: 8, label: 'Distributivity (Ring)', level: 1, color: {background: '#ADD8E6'}},
    {id: 9, label: 'Scalar Multiplicative Closure', level: 1, color: {background: '#ADD8E6'}},
    {id: 10, label: 'Scalar Multiplicative Associativity', level: 1, color: {background: '#ADD8E6'}},
    {id: 11, label: 'Scalar Multiplicative Identity', level: 1, color: {background: '#ADD8E6'}},
    {id: 12, label: 'Distributivity (Scalars over Vectors)', level: 1, color: {background: '#ADD8E6'}},
    {id: 13, label: 'Distributivity (Vectors over Scalars)', level: 1, color: {background: '#ADD8E6'}},
    {id: 14, label: 'Multiplicative Commutativity', level: 1, color: {background: '#ADD8E6'}},
    {id: 15, label: 'Multiplicative Inverse (Non-Zero)', level: 1, color: {background: '#ADD8E6'}}, 
    {id: 16, label: 'Metric Non-negativity', level: 1, color: {background: '#D3D3D3'}},
    {id: 17, label: 'Metric Identity (Zero Distance Only for Self)', level: 1, color: {background: '#D3D3D3'}},
    {id: 18, label: 'Metric Symmetry', level: 1, color: {background: '#D3D3D3'}},
    {id: 19, label: 'Metric Triangle Inequality', level: 1, color: {background: '#D3D3D3'}},
    {id: 20, label: 'Norm Non-negativity', level: 1, color: {background: '#E0FFFF'}},
    {id: 200, label: 'Norm Identity (Zero Vector Only Has Zero Norm)', level: 1, color: {background: '#E0FFFF'}}, 
    {id: 21, label: 'Norm Absolute Homogeneity', level: 1, color: {background: '#E0FFFF'}},
    {id: 22, label: 'Norm Triangle Inequality', level: 1, color: {background: '#E0FFFF'}},
    {id: 23, label: 'Inner Product Positive Definite', level: 1, color: {background: '#F0E68C'}},
    {id: 24, label: 'Inner Product Conjugate Symmetry', level: 1, color: {background: '#F0E68C'}},
    {id: 25, label: 'Inner Product Linearity', level: 1, color: {background: '#F0E68C'}},
    {id: 26, label: 'Completeness (All Cauchy Sequences Converge)', level: 1, color: {background: '#D3D3D3'}},
    {id: 27, label: 'Separability (Dense Countable Subset)', level: 1, color: {background: '#DDA0DD'}},
    {id: 28, label: 'Reflexivity (Space Equals Double Dual)', level: 1, color: {background: '#DDA0DD'}},
    {id: 29, label: 'Parallelogram Law (Extra Norm Condition)', level: 1, color: {background: '#DAA520'}},
    {id: 50, label: 'Continuous Operations (TVS)', level: 1, color: {background: '#8FBC8F'}},
    {id: 51, label: 'Local Convexity (Convex Basis)', level: 1, color: {background: '#8FBC8F'}},
    {id: 60, label: 'Topological Open Set Axioms', level: 1, color: {background: '#D3D3D3'}},
    {id: 61, label: 'Hausdorff Property (T2)', level: 1, color: {background: '#D3D3D3'}},
    {id: 62, label: 'Second Countable Basis', level: 1, color: {background: '#D3D3D3'}},
    {id: 63, label: 'Smoothness (Infinite Differentiability)', level: 1, color: {background: '#98FB98'}},


    // LEVEL 2: Group and Metric Space
    {id: 30, label: 'Group', level: 2, color: {background: '#EEEEEE'}},
    {id: 34, label: 'Metric Space', level: 2, color: {background: '#FFA07A'}}, 
    

    // LEVEL 3: Abelian Group and Topological Space
    {id: 300, label: 'Abelian Group', level: 3, color: {background: '#EEEEEE'}}, 
    {id: 65, label: 'Non-Abelian Group', level: 3, color: {background: '#EEEEEE'}}, 
    {id: 64, label: 'Topological Space', level: 3, color: {background: '#D3D3D3'}}, 

    // LEVEL 4: Ring, Manifold, T1 Space, Compact Space
    {id: 31, label: 'Ring', level: 4, color: {background: '#ADD8E6'}},
    {id: 66, label: 'Topological Manifold', level: 4, color: {background: '#98FB98'}},
    {id: 85, label: 'T1 Topological Space (Separation)', level: 4, color: {background: '#D3D3D3'}}, // NEW: L3 + 1
    {id: 88, label: 'Compact Space', level: 4, color: {background: '#D3D3D3'}}, // NEW: L3 + 1


    // LEVEL 5: Module, Charts, Integral Domain, Noetherian Ring, Regular Space, Locally Compact
    {id: 32, label: 'Module (over a Ring)', level: 5, color: {background: '#90EE90'}}, 
    {id: 67, label: 'Differentiable Charts', level: 5, color: {background: '#98FB98'}},
    {id: 80, label: 'Integral Domain', level: 5, color: {background: '#ADD8E6'}}, // NEW: L4 + 1
    {id: 83, label: 'Noetherian Ring', level: 5, color: {background: '#ADD8E6'}}, // NEW: L4 + 1
    {id: 86, label: 'Regular Topological Space (T3)', level: 5, color: {background: '#D3D3D3'}}, // NEW: Max(L4, L1) + 1
    {id: 89, label: 'Locally Compact Space', level: 5, color: {background: '#D3D3D3'}}, // NEW: L4 + 1


    // LEVEL 6: Field, Atlas, PID, UFD, Normal Space
    {id: 310, label: 'Field', level: 6, color: {background: '#ADD8E6'}},
    {id: 68, label: 'Differentiable Atlas', level: 6, color: {background: '#98FB98'}},
    {id: 81, label: 'Principal Ideal Domain (PID)', level: 6, color: {background: '#ADD8E6'}}, // NEW: L5 + 1
    {id: 82, label: 'Unique Factorization Domain (UFD)', level: 6, color: {background: '#ADD8E6'}}, // NEW: L5 + 1
    {id: 87, label: 'Normal Topological Space (T4)', level: 6, color: {background: '#D3D3D3'}}, // NEW: L5 + 1

    // LEVEL 7: Vector Space, Differentiable Manifold, Algebraically Closed Field
    {id: 33, label: 'Vector Space (over a Field)', level: 7, color: {background: '#FFC0CB'}},
    {id: 69, label: 'Differentiable Manifold', level: 7, color: {background: '#98FB98'}},
    {id: 84, label: 'Algebraically Closed Field', level: 7, color: {background: '#ADD8E6'}}, // NEW: L6 + 1

    // LEVEL 8: TVS, SNVS, Lie Group, Tangent Space
    {id: 52, label: 'Topological Vector Space (TVS)', level: 8, color: {background: '#6B8E23'}},
    {id: 39, label: 'Seminormed Vector Space (SNVS)', level: 8, color: {background: '#DAA520'}},
    {id: 71, label: 'Lie Group', level: 8, color: {background: '#EEEEEE'}},
    {id: 70, label: 'Tangent Space', level: 8, color: {background: '#98FB98'}},
    
    // LEVEL 9: Normed Spaces, Locally Convex TVS, Vector Bundles, Cotangent Space
    {id: 35, label: 'Normed Vector Space (NVS)', level: 9, color: {background: '#FFA07A'}},
    {id: 53, label: 'Locally Convex TVS (LCTVS)', level: 9, color: {background: '#6B8E23'}},
    {id: 72, label: 'Vector Bundle', level: 9, color: {background: '#98FB98'}},
    {id: 90, label: 'Cotangent Space', level: 9, color: {background: '#98FB98'}}, // NEW: L8 + 1

    // LEVEL 10: IPS, Banach, Discrete l-p, Principal/Tensor Bundle, Differential Form
    {id: 36, label: 'Inner Product Space (IPS)', level: 10, color: {background: '#F08080'}},
    {id: 37, label: 'Banach Space (Complete NVS)', level: 10, color: {background: '#CD5C5C'}},
    {id: 75, label: 'Discrete l-p Space (Sequences)', level: 10, color: {background: '#FFA07A'}},
    {id: 73, label: 'Principal Bundle', level: 10, color: {background: '#98FB98'}},
    {id: 74, label: 'Tensor Bundle', level: 10, color: {background: '#98FB98'}},
    {id: 92, label: 'Differential Form', level: 10, color: {background: '#98FB98'}}, // NEW: L9 + 1

    // LEVEL 11: Specialized Banach, Dual Space, Continuous L-p/L-inf, Hilbert, Tensor Field
    {id: 40, label: 'Separable Banach Space', level: 11, color: {background: '#778899'}},
    {id: 41, label: 'Reflexive Banach Space', level: 11, color: {background: '#778899'}},
    {id: 98, label: 'Uniformly Convex Banach Space', level: 11, color: {background: '#CD5C5C'}}, // NEW: L10 + 1
    {id: 94, label: 'Dual Space (Continuous Linear Functionals)', level: 11, color: {background: '#DDA0DD'}}, // NEW: L10 + 1
    {id: 76, label: 'Continuous L-p Space (Functions)', level: 11, color: {background: '#CD5C5C'}},
    {id: 100, label: 'Continuous L-Infinity Space', level: 11, color: {background: '#CD5C5C'}}, // NEW: L10 + 1
    {id: 38, label: 'Hilbert Space (Complete IPS)', level: 11, color: {background: '#CD5C5C'}},
    {id: 91, label: 'Tensor Field', level: 11, color: {background: '#98FB98'}}, // NEW: L10 + 1

    // LEVEL 12: Second Dual, Weak Topology, Separable Dual, Specialized Hilbert, Continuous L-2, Connection
    {id: 95, label: 'Second Dual Space', level: 12, color: {background: '#DDA0DD'}}, // NEW: L11 + 1
    {id: 96, label: 'Weak Topology', level: 12, color: {background: '#DDA0DD'}}, // NEW: L11 + 1
    {id: 99, label: 'Separable Dual Space', level: 12, color: {background: '#DDA0DD'}}, // NEW: Max(L11, L1) + 1
    {id: 42, label: 'Separable Hilbert Space', level: 12, color: {background: '#778899'}},
    {id: 77, label: 'Continuous L-2 Space', level: 12, color: {background: '#778899'}},
    {id: 93, label: 'Covariant Derivative (Connection)', level: 12, color: {background: '#98FB98'}}, // NEW: L11 + 1

    // LEVEL 13: Weak-star Topology
    {id: 97, label: 'Weak-star Topology', level: 13, color: {background: '#DDA0DD'}}, // NEW: L12 + 1
];

// --- EDGE DEFINITIONS ---
var edgesArray = [];

// A. Edges from "Set" (id 0) to all Axioms
for (let i = 1; i <= 29; i++) { edgesArray.push({from: 0, to: i, arrows: 'to', dashes: true, color: {color: '#888888'}}); }
edgesArray.push({from: 0, to: 200, arrows: 'to', dashes: true, color: {color: '#888888'}}); 
edgesArray.push({from: 0, to: 50, arrows: 'to', dashes: true, color: {color: '#888888'}});
edgesArray.push({from: 0, to: 51, arrows: 'to', dashes: true, color: {color: '#888888'}});
[60, 61, 62, 63].forEach(id => edgesArray.push({from: 0, to: id, arrows: 'to', dashes: true, color: {color: '#888888'}}));


// B. Algebraic Structures
// Group, Abelian Group, Non-Abelian Group
[1, 3, 4, 5].forEach(id => edgesArray.push({from: id, to: 30, arrows: 'to', color: {color: '#EEEEEE'}}));
edgesArray.push({from: 30, to: 300, arrows: 'to', color: {color: '#EEEEEE', width: 2}});
edgesArray.push({from: 2, to: 300, arrows: 'to', color: {color: '#EEEEEE'}});
edgesArray.push({from: 30, to: 65, arrows: 'to', dashes: true, color: {color: '#EEEEEE', label: 'Specialization'}});
edgesArray.push({from: 2, to: 65, arrows: 'to', dashes: true, color: {color: '#EEEEEE', label: 'NOT Commutative'}});

// Ring, Integral Domain (NEW), Noetherian Ring (NEW)
edgesArray.push({from: 300, to: 31, arrows: 'to', color: {color: '#ADD8E6', width: 1.5, dashes: true, label: 'Required Group Type'}});
[6, 7, 8].forEach(id => edgesArray.push({from: id, to: 31, arrows: 'to', color: {color: '#ADD8E6'}}));
edgesArray.push({from: 31, to: 80, arrows: 'to', color: {color: '#ADD8E6', width: 2}});
edgesArray.push({from: 31, to: 83, arrows: 'to', color: {color: '#ADD8E6', width: 2}});

// PID (NEW), UFD (NEW)
edgesArray.push({from: 80, to: 81, arrows: 'to', color: {color: '#ADD8E6', width: 2}});
edgesArray.push({from: 80, to: 82, arrows: 'to', color: {color: '#ADD8E6', width: 2}});

// Field, Algebraically Closed Field (NEW)
edgesArray.push({from: 31, to: 310, arrows: 'to', color: {color: '#ADD8E6', width: 2}});
[14, 15].forEach(id => edgesArray.push({from: id, to: 310, arrows: 'to', color: {color: '#ADD8E6'}}));
edgesArray.push({from: 310, to: 84, arrows: 'to', color: {color: '#ADD8E6', width: 2}});

// Module, Vector Space
edgesArray.push({from: 300, to: 32, arrows: 'to', color: {color: '#90EE90'}}); 
edgesArray.push({from: 31, to: 32, arrows: 'to', color: {color: '#90EE90', width: 2, label: 'Over a Ring'}}); 
[9, 10, 12, 13].forEach(id => edgesArray.push({from: id, to: 32, arrows: 'to', color: {color: '#90EE90'}}));
edgesArray.push({from: 32, to: 33, arrows: 'to', color: {color: '#FFC0CB', width: 3, label: 'Module Laws'}});
edgesArray.push({from: 310, to: 33, arrows: 'to', color: {color: '#FFC0CB', width: 3, label: 'Must be Field'}});
edgesArray.push({from: 11, to: 33, arrows: 'to', color: {color: '#FFC0CB'}});

// C. Topological Structures
// Metric Space, Topological Space
edgesArray.push({from: 60, to: 64, arrows: 'to', color: {color: '#D3D3D3'}});
edgesArray.push({from: 34, to: 64, arrows: 'to', dashes: true, color: {color: '#FFA07A', label: 'Implied: Is Topological'}});

// T1 (NEW)
edgesArray.push({from: 64, to: 85, arrows: 'to', color: {color: '#D3D3D3', width: 2}});

// Compact (NEW), Locally Compact (NEW)
edgesArray.push({from: 64, to: 88, arrows: 'to', color: {color: '#D3D3D3', width: 2}});
edgesArray.push({from: 88, to: 89, arrows: 'to', color: {color: '#D3D3D3', width: 2}});

// Regular T3 (NEW), Normal T4 (NEW)
edgesArray.push({from: 85, to: 86, arrows: 'to', color: {color: '#D3D3D3'}});
edgesArray.push({from: 61, to: 86, arrows: 'to', color: {color: '#D3D3D3', label: 'Requires Hausdorff'}});
edgesArray.push({from: 86, to: 87, arrows: 'to', color: {color: '#D3D3D3', width: 2}});

// D. Geometry (Manifolds and Bundles)
// Manifolds
edgesArray.push({from: 64, to: 66, arrows: 'to', color: {color: '#98FB98', width: 3}});
edgesArray.push({from: 61, to: 66, arrows: 'to', color: {color: '#98FB98'}});
edgesArray.push({from: 62, to: 66, arrows: 'to', color: {color: '#98FB98'}});
edgesArray.push({from: 66, to: 67, arrows: 'to', color: {color: '#98FB98'}});
edgesArray.push({from: 67, to: 68, arrows: 'to', color: {color: '#98FB98'}});
edgesArray.push({from: 68, to: 69, arrows: 'to', color: {color: '#98FB98', width: 3}});
edgesArray.push({from: 63, to: 69, arrows: 'to', color: {color: '#98FB98'}});

// Tangent/Cotangent (NEW)
edgesArray.push({from: 69, to: 70, arrows: 'to', color: {color: '#98FB98', width: 3}});
edgesArray.push({from: 33, to: 70, arrows: 'to', color: {color: '#98FB98', label: 'Fiber Vector Space'}});
edgesArray.push({from: 70, to: 90, arrows: 'to', color: {color: '#98FB98', width: 3, label: 'Dual Space'}});

// Bundles and Tensors
edgesArray.push({from: 69, to: 72, arrows: 'to', color: {color: '#98FB98', width: 3, dashes: true, label: 'Requires Base Manifold'}});
edgesArray.push({from: 70, to: 72, arrows: 'to', color: {color: '#98FB98', label: 'Trivialization'}});
edgesArray.push({from: 72, to: 74, arrows: 'to', color: {color: '#98FB98', width: 3}});
edgesArray.push({from: 72, to: 73, arrows: 'to', color: {color: '#98FB98', width: 3}});
edgesArray.push({from: 71, to: 73, arrows: 'to', color: {color: '#98FB98', label: 'Structure Group'}});

// Differential Forms (NEW)
edgesArray.push({from: 90, to: 92, arrows: 'to', color: {color: '#98FB98', width: 2}});

// Tensor Field (NEW)
edgesArray.push({from: 74, to: 91, arrows: 'to', color: {color: '#98FB98', width: 3, label: 'Section of Bundle'}});

// Connection (NEW)
edgesArray.push({from: 91, to: 93, arrows: 'to', color: {color: '#98FB98', width: 3, label: 'Differentiation Operator'}});


// E. Core Functional Analysis Spaces

// TVS, NVS
edgesArray.push({from: 33, to: 52, arrows: 'to', color: {color: '#6B8E23', width: 3}});
edgesArray.push({from: 50, to: 52, arrows: 'to', color: {color: '#6B8E23'}});
edgesArray.push({from: 52, to: 53, arrows: 'to', color: {color: '#6B8E23', width: 3}});
edgesArray.push({from: 51, to: 53, arrows: 'to', color: {color: '#6B8E23'}});
edgesArray.push({from: 33, to: 39, arrows: 'to', color: {color: '#DAA520'}});
[20, 21, 22].forEach(id => edgesArray.push({from: id, to: 39, arrows: 'to', color: {color: '#DAA520'}}));
edgesArray.push({from: 39, to: 35, arrows: 'to', color: {color: '#FFA07A', width: 3}});
edgesArray.push({from: 200, to: 35, arrows: 'to', color: {color: '#FFA07A'}});
edgesArray.push({from: 34, to: 35, arrows: 'to', dashes: true, color: {color: '#FFA07A', label: 'Topology Prerequisite'}});

// IPS, Banach, Hilbert
edgesArray.push({from: 33, to: 36, arrows: 'to', color: {color: '#F08080', width: 1.5, dashes: true, label: 'Base Vector Space'}});
[23, 24, 25].forEach(id => edgesArray.push({from: id, to: 36, arrows: 'to', color: {color: '#F08080'}}));
edgesArray.push({from: 35, to: 36, arrows: 'to', dashes: true, color: {color: '#F08080', label: 'Parent NVS'}});
edgesArray.push({from: 29, to: 36, arrows: 'to', color: {color: '#F08080', width: 2, label: 'Iff Parallelogram Law'}});
edgesArray.push({from: 35, to: 37, arrows: 'to', color: {color: '#CD5C5C', width: 3}});
edgesArray.push({from: 26, to: 37, arrows: 'to', color: {color: '#CD5C5C'}});
edgesArray.push({from: 36, to: 38, arrows: 'to', color: {color: '#CD5C5C', width: 3}});
edgesArray.push({from: 26, to: 38, arrows: 'to', color: {color: '#CD5C5C'}});
edgesArray.push({from: 37, to: 38, arrows: 'to', dashes: true, color: {color: '#FF0000', label: 'Parent Banach'}});


// F. Specialized Functional Analysis (L11 and higher)
// Specializations of Banach (L11 > Banach L10)
edgesArray.push({from: 37, to: 40, arrows: 'to', color: {color: '#778899', width: 3}}); // Separable Banach
edgesArray.push({from: 37, to: 41, arrows: 'to', color: {color: '#778899', width: 3}}); // Reflexive Banach
edgesArray.push({from: 37, to: 98, arrows: 'to', color: {color: '#CD5C5C', width: 3}}); // NEW: Uniformly Convex
edgesArray.push({from: 37, to: 100, arrows: 'to', color: {color: '#CD5C5C', width: 3}}); // NEW: L-Infinity

// Dual Spaces (L11 and L12)
edgesArray.push({from: 37, to: 94, arrows: 'to', color: {color: '#DDA0DD', width: 3}}); // NEW: Dual Space (L11)
edgesArray.push({from: 94, to: 95, arrows: 'to', color: {color: '#DDA0DD', width: 3}}); // NEW: Second Dual (L12)
edgesArray.push({from: 94, to: 96, arrows: 'to', color: {color: '#DDA0DD', width: 2}}); // NEW: Weak Topology (L12)
edgesArray.push({from: 95, to: 97, arrows: 'to', color: {color: '#DDA0DD', width: 3}}); // NEW: Weak-star Topology (L13)
edgesArray.push({from: 94, to: 99, arrows: 'to', color: {color: '#DDA0DD', width: 3}}); // NEW: Separable Dual (L12)
edgesArray.push({from: 27, to: 99, arrows: 'to', color: {color: '#DDA0DD', width: 1}}); // Requires Separability Axiom

// Concrete Spaces
edgesArray.push({from: 35, to: 75, arrows: 'to', color: {color: '#FFA07A', width: 3}}); // Discrete l-p (L10)
edgesArray.push({from: 37, to: 76, arrows: 'to', color: {color: '#CD5C5C', width: 3}}); // Continuous L-p (L11)
edgesArray.push({from: 76, to: 77, arrows: 'to', color: {color: '#778899', width: 3}}); // Continuous L-2 (L12)
edgesArray.push({from: 38, to: 77, arrows: 'to', dashes: true, color: {color: '#778899', label: 'Is Hilbert'}}); // Hilbert Link

// Reflexivity Links
edgesArray.push({from: 41, to: 38, arrows: 'to', dashes: true, color: {color: '#8B0000', width: 2, label: 'Implicitly Reflexive'}});
edgesArray.push({from: 38, to: 42, arrows: 'to', color: {color: '#778899', width: 3}});
edgesArray.push({from: 27, to: 42, arrows: 'to', color: {color: '#778899'}});