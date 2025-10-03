// analysis.js

const analysis_nodes = [
    // LEVEL 1: Axioms (Analysis Subset)
    {id: 9, label: 'Scalar Multiplicative Closure', level: 1, color: {background: '#97C2FC'}},
    {id: 10, label: 'Scalar Multiplicative Associativity', level: 1, color: {background: '#97C2FC'}},
    {id: 11, label: 'Scalar Multiplicative Identity', level: 1, color: {background: '#97C2FC'}},
    {id: 12, label: 'Distributivity (Scalars over Vectors)', level: 1, color: {background: '#97C2FC'}},
    {id: 13, label: 'Distributivity (Vectors over Scalars)', level: 1, color: {background: '#97C2FC'}},
    {id: 20, label: 'Norm Non-negativity', level: 1, color: {background: '#97C2FC'}},
    {id: 200, label: 'Norm Identity (Zero Vector Only Has Zero Norm)', level: 1, color: {background: '#97C2FC'}}, 
    {id: 21, label: 'Norm Absolute Homogeneity', level: 1, color: {background: '#97C2FC'}},
    {id: 22, label: 'Norm Triangle Inequality', level: 1, color: {background: '#97C2FC'}},
    {id: 23, label: 'Inner Product Positive Definite', level: 1, color: {background: '#97C2FC'}},
    {id: 24, label: 'Inner Product Conjugate Symmetry', level: 1, color: {background: '#97C2FC'}},
    {id: 25, label: 'Inner Product Linearity', level: 1, color: {background: '#97C2FC'}},
    {id: 26, label: 'Completeness (All Cauchy Sequences Converge)', level: 1, color: {background: '#97C2FC'}},
    {id: 27, label: 'Separability (Dense Countable Subset)', level: 1, color: {background: '#97C2FC'}},
    {id: 28, label: 'Reflexivity (Space Equals Double Dual)', level: 1, color: {background: '#97C2FC'}},
    {id: 29, label: 'Parallelogram Law (Extra Norm Condition)', level: 1, color: {background: '#97C2FC'}},
    {id: 50, label: 'Continuous Operations (TVS)', level: 1, color: {background: '#97C2FC'}},
    {id: 51, label: 'Local Convexity (Convex Basis)', level: 1, color: {background: '#97C2FC'}},
    {id: 101, label: 'Bounded Linear Functional Axiom', level: 1, color: {background: '#97C2FC'}}, 
    
    // LEVEL 7: Vector Space
    {id: 33, label: 'Vector Space (over a Field)', level: 7, color: {background: '#97C2FC'}},
    {id: 106, label: 'Real Vector Space', level: 7, color: {background: '#97C2FC'}}, 
    {id: 107, label: 'Complex Vector Space', level: 7, color: {background: '#97C2FC'}}, 

    // LEVEL 8: TVS, SNVS
    {id: 52, label: 'Topological Vector Space (TVS)', level: 8, color: {background: '#97C2FC'}},
    {id: 39, label: 'Seminormed Vector Space (SNVS)', level: 8, color: {background: '#97C2FC'}},

    // LEVEL 9: NVS, LCTVS, Bounded Operator, Complex IPS
    {id: 35, label: 'Normed Vector Space (NVS)', level: 9, color: {background: '#97C2FC'}},
    {id: 53, label: 'Locally Convex TVS (LCTVS)', level: 9, color: {background: '#97C2FC'}},
    {id: 109, label: 'Complex Inner Product Space', level: 9, color: {background: '#97C2FC'}}, 
    {id: 112, label: 'Bounded Operator', level: 9, color: {background: '#97C2FC'}}, 

    // LEVEL 10: IPS, Banach, Specialized Spaces, Theorems
    {id: 36, label: 'Inner Product Space (IPS)', level: 10, color: {background: '#97C2FC'}},
    {id: 37, label: 'Banach Space (Complete NVS)', level: 10, color: {background: '#97C2FC'}},
    {id: 75, label: 'Discrete l-p Space (Sequences)', level: 10, color: {background: '#97C2FC'}},
    {id: 110, label: 'Banach-Steinhaus Uniform Boundedness', level: 10, color: {background: '#97C2FC'}}, 
    {id: 114, label: 'Hermitian Operator', level: 10, color: {background: '#97C2FC'}}, 
    {id: 116, label: 'Quotient Space', level: 10, color: {background: '#97C2FC'}}, 

    // LEVEL 11: Specialized Banach, Hilbert, Dual Space, Theorems
    {id: 40, label: 'Separable Banach Space', level: 11, color: {background: '#97C2FC'}},
    {id: 41, label: 'Reflexive Banach Space', level: 11, color: {background: '#97C2FC'}},
    {id: 98, label: 'Uniformly Convex Banach Space', level: 11, color: {background: '#97C2FC'}},
    {id: 94, label: 'Dual Space (Continuous Linear Functionals)', level: 11, color: {background: '#97C2FC'}},
    {id: 76, label: 'Continuous L-p Space (Functions)', level: 11, color: {background: '#97C2FC'}},
    {id: 100, label: 'Continuous L-Infinity Space', level: 11, color: {background: '#97C2FC'}},
    {id: 38, label: 'Hilbert Space (Complete IPS)', level: 11, color: {background: '#97C2FC'}},
    {id: 111, label: 'Closed Graph Theorem', level: 11, color: {background: '#97C2FC'}}, 

    // LEVEL 12: Second Dual, Weak Topology, Specialized Hilbert, Theorems/Operators
    {id: 95, label: 'Second Dual Space', level: 12, color: {background: '#97C2FC'}},
    {id: 96, label: 'Weak Topology', level: 12, color: {background: '#97C2FC'}},
    {id: 99, label: 'Separable Dual Space', level: 12, color: {background: '#97C2FC'}},
    {id: 42, label: 'Separable Hilbert Space', level: 12, color: {background: '#97C2FC'}},
    {id: 77, label: 'Continuous L-2 Space', level: 12, color: {background: '#97C2FC'}},
    {id: 115, label: 'Compact Operator', level: 12, color: {background: '#97C2FC'}}, 
    {id: 117, label: 'Spectral Theorem', level: 12, color: {background: '#97C2FC'}}, 
    
    // LEVEL 13: Weak-star Topology, Theorems/Algebra
    {id: 97, label: 'Weak-star Topology', level: 13, color: {background: '#97C2FC'}},
    {id: 122, label: 'Gelfand Representation Theorem', level: 13, color: {background: '#97C2FC'}},
    {id: 123, label: 'Open Mapping Theorem', level: 13, color: {background: '#97C2FC'}}, 
    {id: 128, label: 'C-star Algebra', level: 13, color: {background: '#97C2FC'}},

    // LEVEL 14: Spectral Radius, Index, Bounded Inverse Theorem
    {id: 124, label: 'Spectral Radius', level: 14, color: {background: '#97C2FC'}},
    {id: 125, label: 'Index of an Operator', level: 14, color: {background: '#97C2FC'}},
    {id: 126, label: 'Bounded Inverse Theorem', level: 14, color: {background: '#97C2FC'}}, 

    // LEVEL 15: GNS Construction, Fredholm Operator
    {id: 129, label: 'Fredholm Operator', level: 15, color: {background: '#97C2FC'}}, 
    {id: 131, label: 'GNS Construction', level: 15, color: {background: '#97C2FC'}}, 

    // LEVEL 16: Atiyah-Singer Precursor
    {id: 132, label: 'Atiyah-Singer Index Theorem Precursor', level: 16, color: {background: '#97C2FC'}}, 
];

const analysis_edges = [
    // Axioms to Base Set V (ID 0)
    {from: 0, to: 9, arrows: 'to', dashes: true}, {from: 0, to: 10, arrows: 'to', dashes: true}, 
    {from: 0, to: 11, arrows: 'to', dashes: true}, {from: 0, to: 12, arrows: 'to', dashes: true}, 
    {from: 0, to: 13, arrows: 'to', dashes: true}, {from: 0, to: 20, arrows: 'to', dashes: true}, 
    {from: 0, to: 200, arrows: 'to', dashes: true}, {from: 0, to: 21, arrows: 'to', dashes: true}, 
    {from: 0, to: 22, arrows: 'to', dashes: true}, {from: 0, to: 23, arrows: 'to', dashes: true}, 
    {from: 0, to: 24, arrows: 'to', dashes: true}, {from: 0, to: 25, arrows: 'to', dashes: true}, 
    {from: 0, to: 26, arrows: 'to', dashes: true}, {from: 0, to: 27, arrows: 'to', dashes: true}, 
    {from: 0, to: 28, arrows: 'to', dashes: true}, {from: 0, to: 29, arrows: 'to', dashes: true}, 
    {from: 0, to: 50, arrows: 'to', dashes: true}, {from: 0, to: 51, arrows: 'to', dashes: true}, 
    {from: 0, to: 101, arrows: 'to', dashes: true},

    // Vector Space (ID 33) Cross-Dependencies
    {from: 32, to: 33, arrows: 'to', width: 3},    // Module (ID 32 - Algebra)
    {from: 310, to: 33, arrows: 'to', width: 3},   // Field (ID 310 - Algebra)
    {from: 11, to: 33, arrows: 'to'},

    // Real/Complex Vector Space (L7)
    {from: 33, to: 106, arrows: 'to', width: 1}, {from: 310, to: 106, arrows: 'to'}, 
    {from: 33, to: 107, arrows: 'to', width: 1}, {from: 310, to: 107, arrows: 'to'}, 

    // TVS / LCTVS (L8, L9)
    {from: 33, to: 52, arrows: 'to', width: 3}, {from: 50, to: 52, arrows: 'to'},
    {from: 52, to: 53, arrows: 'to', width: 3}, {from: 51, to: 53, arrows: 'to'},

    // SNVS (L8)
    {from: 33, to: 39, arrows: 'to'},
    {from: 20, to: 39, arrows: 'to'}, {from: 21, to: 39, arrows: 'to'}, {from: 22, to: 39, arrows: 'to'},

    // NVS (L9)
    {from: 39, to: 35, arrows: 'to', width: 3}, {from: 200, to: 35, arrows: 'to'},
    {from: 34, to: 35, arrows: 'to', dashes: true}, // Metric Space (ID 34 - TopoGeo)
    
    // IPS / Complex IPS (L9, L10)
    {from: 35, to: 36, arrows: 'to', dashes: true},
    {from: 35, to: 109, arrows: 'to', width: 1}, 
    
    // Banach Space (L10)
    {from: 35, to: 37, arrows: 'to', width: 3}, {from: 26, to: 37, arrows: 'to'},

    // Hilbert Space (L11)
    {from: 36, to: 38, arrows: 'to', width: 3}, {from: 26, to: 38, arrows: 'to'},
    {from: 37, to: 38, arrows: 'to', dashes: true}, {from: 109, to: 38, arrows: 'to', dashes: true},
    {from: 41, to: 38, arrows: 'to', dashes: true, width: 2}, 
    
    // Specialized Banach (L11)
    {from: 37, to: 40, arrows: 'to', width: 3}, {from: 37, to: 41, arrows: 'to', width: 3},
    {from: 37, to: 98, arrows: 'to', width: 3}, {from: 37, to: 100, arrows: 'to', width: 3},
    
    // Dual Space & Quotient Space (L10/L11)
    {from: 37, to: 94, arrows: 'to', width: 3}, {from: 37, to: 116, arrows: 'to', width: 2},
    
    // Dual Space Hierarchy (L12-L13)
    {from: 94, to: 95, arrows: 'to', width: 3}, {from: 94, to: 96, arrows: 'to', width: 2},
    {from: 95, to: 97, arrows: 'to', width: 3}, {from: 94, to: 99, arrows: 'to', width: 3},
    {from: 27, to: 99, arrows: 'to', width: 1}, 
    
    // Specialized Hilbert (L12)
    {from: 38, to: 42, arrows: 'to', width: 3}, {from: 27, to: 42, arrows: 'to'},
    {from: 38, to: 77, arrows: 'to', dashes: true}, 
    
    // Specialized L-p (L10-L12)
    {from: 35, to: 75, arrows: 'to', width: 3}, 
    {from: 37, to: 76, arrows: 'to', width: 3}, 
    {from: 76, to: 77, arrows: 'to', width: 3}, 

    // Operator Theory / Theorems
    {from: 35, to: 112, arrows: 'to', width: 2}, {from: 101, to: 112, arrows: 'to', width: 1}, 
    {from: 109, to: 114, arrows: 'to', width: 2}, 
    {from: 37, to: 110, arrows: 'to', width: 2}, 
    {from: 37, to: 111, arrows: 'to', width: 2}, 
    {from: 38, to: 117, arrows: 'to', width: 3}, 
    {from: 112, to: 115, arrows: 'to', width: 2}, 
    {from: 37, to: 123, arrows: 'to', width: 2}, 
    {from: 112, to: 124, arrows: 'to', width: 2}, 
    {from: 123, to: 126, arrows: 'to', width: 2}, 
    {from: 115, to: 125, arrows: 'to', width: 2}, {from: 116, to: 125, arrows: 'to', width: 2}, 
    {from: 125, to: 129, arrows: 'to', width: 3}, 
    {from: 124, to: 128, arrows: 'to', width: 3}, 
    {from: 128, to: 122, arrows: 'to', width: 2}, {from: 128, to: 131, arrows: 'to', width: 2}, 
    {from: 129, to: 132, arrows: 'to', width: 3}, 
];