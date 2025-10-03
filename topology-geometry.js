// topology-geometry.js

const topogeo_nodes = [
    // LEVEL 1: Axioms (Topo/Geo Subset)
    {id: 16, label: 'Metric Non-negativity', level: 1, color: {background: '#97C2FC'}},
    {id: 17, label: 'Metric Identity (Zero Distance Only for Self)', level: 1, color: {background: '#97C2FC'}},
    {id: 18, label: 'Metric Symmetry', level: 1, color: {background: '#97C2FC'}},
    {id: 19, label: 'Metric Triangle Inequality', level: 1, color: {background: '#97C2FC'}},
    {id: 60, label: 'Topological Open Set Axioms', level: 1, color: {background: '#97C2FC'}},
    {id: 61, label: 'Hausdorff Property (T2)', level: 1, color: {background: '#97C2FC'}},
    {id: 62, label: 'Second Countable Basis', level: 1, color: {background: '#97C2FC'}},
    {id: 63, label: 'Smoothness (Infinite Differentiability)', level: 1, color: {background: '#97C2FC'}},
    {id: 102, label: 'Metric Completeness', level: 1, color: {background: '#97C2FC'}}, 
    {id: 103, label: 'Non-Singular Bilinear Form', level: 1, color: {background: '#97C2FC'}}, 

    // LEVEL 2: Metric Space
    {id: 34, label: 'Metric Space', level: 2, color: {background: '#97C2FC'}}, 
    
    // LEVEL 3: Topological Space
    {id: 64, label: 'Topological Space', level: 3, color: {background: '#97C2FC'}}, 

    // LEVEL 4: Manifold, T1 Space, Compact Space, Complete Metric Space
    {id: 66, label: 'Topological Manifold', level: 4, color: {background: '#97C2FC'}},
    {id: 85, label: 'T1 Topological Space (Separation)', level: 4, color: {background: '#97C2FC'}},
    {id: 88, label: 'Compact Space', level: 4, color: {background: '#97C2FC'}},
    {id: 104, label: 'Complete Metric Space', level: 4, color: {background: '#97C2FC'}}, 

    // LEVEL 5: Charts, Regular Space, Locally Compact, Metrizable Space
    {id: 67, label: 'Differentiable Charts', level: 5, color: {background: '#97C2FC'}},
    {id: 86, label: 'Regular Topological Space (T3)', level: 5, color: {background: '#97C2FC'}},
    {id: 89, label: 'Locally Compact Space', level: 5, color: {background: '#97C2FC'}},
    {id: 105, label: 'Metrizable Space', level: 5, color: {background: '#97C2FC'}}, 

    // LEVEL 6: Atlas, Normal Space
    {id: 68, label: 'Differentiable Atlas', level: 6, color: {background: '#97C2FC'}},
    {id: 87, label: 'Normal Topological Space (T4)', level: 6, color: {background: '#97C2FC'}},

    // LEVEL 7: Differentiable Manifold
    {id: 69, label: 'Differentiable Manifold', level: 7, color: {background: '#97C2FC'}},

    // LEVEL 8: Lie Group, Tangent Space, Symplectic Manifold
    {id: 71, label: 'Lie Group', level: 8, color: {background: '#97C2FC'}},
    {id: 70, label: 'Tangent Space', level: 8, color: {background: '#97C2FC'}},
    {id: 108, label: 'Symplectic Manifold', level: 8, color: {background: '#97C2FC'}}, 

    // LEVEL 9: Vector Bundle, Cotangent Space
    {id: 72, label: 'Vector Bundle', level: 9, color: {background: '#97C2FC'}},
    {id: 90, label: 'Cotangent Space', level: 9, color: {background: '#97C2FC'}},

    // LEVEL 10: Principal/Tensor Bundle, Differential Form
    {id: 73, label: 'Principal Bundle', level: 10, color: {background: '#97C2FC'}},
    {id: 74, label: 'Tensor Bundle', level: 10, color: {background: '#97C2FC'}},
    {id: 92, label: 'Differential Form', level: 10, color: {background: '#97C2FC'}},

    // LEVEL 11: Tensor Field, Hodge Star Operator
    {id: 91, label: 'Tensor Field', level: 11, color: {background: '#97C2FC'}},
    {id: 113, label: 'Hodge Star Operator', level: 11, color: {background: '#97C2FC'}}, 

    // LEVEL 12: Connection, Riemannian Metric, Holomorphic Function
    {id: 93, label: 'Covariant Derivative (Connection)', level: 12, color: {background: '#97C2FC'}},
    {id: 119, label: 'Riemannian Metric', level: 12, color: {background: '#97C2FC'}}, 
    {id: 118, label: 'Holomorphic Function', level: 12, color: {background: '#97C2FC'}}, 

    // LEVEL 13: Complex Manifold, Hodge Decomposition
    {id: 120, label: 'Complex Manifold', level: 13, color: {background: '#97C2FC'}}, 
    {id: 121, label: 'Hodge Decomposition Theorem', level: 13, color: {background: '#97C2FC'}}, 

    // LEVEL 14: Kaehler Manifold, Maximum Modulus Principle
    {id: 127, label: 'Kaehler Manifold', level: 14, color: {background: '#97C2FC'}}, 
    {id: 130, label: 'Maximum Modulus Principle', level: 14, color: {background: '#97C2FC'}},
];

const topogeo_edges = [
    // Axioms to Base Set V (ID 0)
    {from: 0, to: 16, arrows: 'to', dashes: true}, {from: 0, to: 17, arrows: 'to', dashes: true}, 
    {from: 0, to: 18, arrows: 'to', dashes: true}, {from: 0, to: 19, arrows: 'to', dashes: true}, 
    {from: 0, to: 60, arrows: 'to', dashes: true}, {from: 0, to: 61, arrows: 'to', dashes: true}, 
    {from: 0, to: 62, arrows: 'to', dashes: true}, {from: 0, to: 63, arrows: 'to', dashes: true}, 
    {from: 0, to: 102, arrows: 'to', dashes: true}, {from: 0, to: 103, arrows: 'to', dashes: true},

    // Metric Space (L2)
    {from: 16, to: 34, arrows: 'to'}, {from: 17, to: 34, arrows: 'to'}, 
    {from: 18, to: 34, arrows: 'to'}, {from: 19, to: 34, arrows: 'to'}, 
    
    // Topological Space (L3)
    {from: 60, to: 64, arrows: 'to'}, {from: 34, to: 64, arrows: 'to', dashes: true}, 
    
    // Separation Axioms (L4-L6)
    {from: 64, to: 85, arrows: 'to', width: 2}, 
    {from: 85, to: 86, arrows: 'to'}, {from: 61, to: 86, arrows: 'to'}, 
    {from: 86, to: 87, arrows: 'to', width: 2}, 

    // Manifold (L4-L7)
    {from: 64, to: 66, arrows: 'to', width: 3}, {from: 61, to: 66, arrows: 'to'}, {from: 62, to: 66, arrows: 'to'},
    {from: 66, to: 67, arrows: 'to'}, {from: 67, to: 68, arrows: 'to'},
    {from: 68, to: 69, arrows: 'to', width: 3}, {from: 63, to: 69, arrows: 'to'},

    // Differential Geometry (L8-L12)
    {from: 69, to: 70, arrows: 'to', width: 3}, 
    {from: 33, to: 70, arrows: 'to'}, // Vector Space (ID 33 - Analysis)
    {from: 70, to: 90, arrows: 'to', width: 3}, 
    {from: 90, to: 92, arrows: 'to', width: 2}, 
    {from: 72, to: 74, arrows: 'to', width: 3}, 
    {from: 74, to: 91, arrows: 'to', width: 3}, 
    {from: 91, to: 93, arrows: 'to', width: 3}, 

    // Bundles (L9-L10) - CRITICAL CROSS-DEPENDENCY
    {from: 69, to: 72, arrows: 'to', width: 3, dashes: true}, // Differentiable Manifold (ID 69)
    {from: 33, to: 72, arrows: 'to', width: 3},                // Vector Space (ID 33 - Analysis)
    {from: 70, to: 72, arrows: 'to'}, 
    {from: 72, to: 73, arrows: 'to', width: 3}, 
    {from: 71, to: 73, arrows: 'to'}, // Lie Group (ID 71)

    // Specialized Geometry (L8)
    {from: 69, to: 108, arrows: 'to', width: 2}, {from: 103, to: 108, arrows: 'to'}, 
    {from: 65, to: 71, arrows: 'to', width: 2}, {from: 69, to: 71, arrows: 'to', width: 2}, // Non-Abelian Group (ID 65 - Algebra)

    // Compactness / Metrizability (L4-L6)
    {from: 64, to: 88, arrows: 'to', width: 2}, 
    {from: 88, to: 89, arrows: 'to', width: 2}, 
    {from: 87, to: 105, arrows: 'to', dashes: true}, 
    {from: 104, to: 105, arrows: 'to', dashes: true}, 

    // Metric and Completion (L4)
    {from: 34, to: 104, arrows: 'to', width: 3}, {from: 102, to: 104, arrows: 'to'},

    // Complex / Hodge Theory (L11-L14)
    {from: 92, to: 113, arrows: 'to', width: 2}, 
    {from: 113, to: 121, arrows: 'to', width: 3}, 
    {from: 69, to: 120, arrows: 'to', width: 2}, 
    {from: 107, to: 120, arrows: 'to'}, // Complex VS (ID 107 - Analysis)
    {from: 91, to: 119, arrows: 'to', width: 3}, 
    {from: 120, to: 127, arrows: 'to', width: 2}, {from: 119, to: 127, arrows: 'to'}, 
    {from: 107, to: 118, arrows: 'to'}, {from: 118, to: 130, arrows: 'to', width: 2}, 
];