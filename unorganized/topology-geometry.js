// topology-geometry.js

// Color: Green (#81C784)

const topogeo_nodes = [
    // ----------------------------------------------------------------------------------
    // LEVEL 1: Axioms (Topo/Geo Subset)
    // ----------------------------------------------------------------------------------
    {id: 16, label: 'Metric Non-negativity', level: 1, color: {background: '#81C784'}},
    {id: 17, label: 'Metric Identity (Zero Distance Only for Self)', level: 1, color: {background: '#81C784'}},
    {id: 18, label: 'Metric Symmetry', level: 1, color: {background: '#81C784'}},
    {id: 19, label: 'Metric Triangle Inequality', level: 1, color: {background: '#81C784'}},
    {id: 60, label: 'Topological Open Set Axioms', level: 1, color: {background: '#81C784'}},
    {id: 61, label: 'Hausdorff Property (T2)', level: 1, color: {background: '#81C784'}},
    {id: 62, label: 'Second Countable Basis', level: 1, color: {background: '#81C784'}},
    {id: 63, label: 'Smoothness (Infinite Differentiability)', level: 1, color: {background: '#81C784'}},
    {id: 102, label: 'Metric Completeness', level: 1, color: {background: '#81C784'}}, 
    {id: 103, label: 'Non-Singular Bilinear Form', level: 1, color: {background: '#81C784'}}, 
    {id: 133, label: 'Paracompactness Axiom', level: 1, color: {background: '#81C784'}},
    {id: 134, label: 'Path Connectedness Axiom', level: 1, color: {background: '#81C784'}},
    {id: 2000, label: 'Compact-Open Topology', level: 1, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 2: Metric Space, Homeomorphism, Homotopy
    // ----------------------------------------------------------------------------------
    {id: 34, label: 'Metric Space', level: 2, color: {background: '#81C784'}}, 
    {id: 135, label: 'Isometry / Homeomorphism', level: 2, color: {background: '#81C784'}},
    {id: 2001, label: 'Homotopy (Continuous Deformation)', level: 2, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 3: Topological Space, Connected Space, Retract
    // ----------------------------------------------------------------------------------
    {id: 64, label: 'Topological Space', level: 3, color: {background: '#81C784'}}, 
    {id: 136, label: 'Connected Space', level: 3, color: {background: '#81C784'}},
    {id: 2002, label: 'Retract / Deformation Retract', level: 3, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 4: Manifold, T1, Compact, Complete Metric, Simply Connected
    // ----------------------------------------------------------------------------------
    {id: 66, label: 'Topological Manifold', level: 4, color: {background: '#81C784'}},
    {id: 85, label: 'T1 Topological Space (Separation)', level: 4, color: {background: '#81C784'}},
    {id: 88, label: 'Compact Space', level: 4, color: {background: '#81C784'}},
    {id: 104, label: 'Complete Metric Space', level: 4, color: {background: '#81C784'}}, 
    {id: 137, label: 'Path Connected Manifold', level: 4, color: {background: '#81C784'}},
    {id: 2003, label: 'Simply Connected Space', level: 4, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 5: Charts, Regular Space, Locally Compact, Metrizable Space, Fundamental Group
    // ----------------------------------------------------------------------------------
    {id: 67, label: 'Differentiable Charts', level: 5, color: {background: '#81C784'}},
    {id: 86, label: 'Regular Topological Space (T3)', level: 5, color: {background: '#81C784'}},
    {id: 89, label: 'Locally Compact Space', level: 5, color: {background: '#81C784'}},
    {id: 105, label: 'Metrizable Space', level: 5, color: {background: '#81C784'}}, 
    {id: 138, label: 'Space of Continuous Functions (C(X))', level: 5, color: {background: '#81C784'}},
    {id: 2004, label: 'Fundamental Group ($\pi_1$)', level: 5, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 6: Atlas, Normal Space, Paracompact Manifold, Covering Space
    // ----------------------------------------------------------------------------------
    {id: 68, label: 'Differentiable Atlas', level: 6, color: {background: '#81C784'}},
    {id: 87, label: 'Normal Topological Space (T4)', level: 6, color: {background: '#81C784'}},
    {id: 139, label: 'Paracompact Manifold', level: 6, color: {background: '#81C784'}},
    {id: 2005, label: 'Covering Space / Universal Cover', level: 6, color: {background: '#81C784'}}, // NEW
    {id: 2006, label: 'Smooth Manifold', level: 6, color: {background: '#81C784'}}, // NEW (Alternate term for Differentiable Manifold - L7 Precursor)

    // ----------------------------------------------------------------------------------
    // LEVEL 7: Differentiable Manifold, Urysohn's Lemma, Higher Homotopy
    // ----------------------------------------------------------------------------------
    {id: 69, label: 'Differentiable Manifold', level: 7, color: {background: '#81C784'}},
    {id: 140, label: 'Urysohn\'s Lemma / Tietze Extension', level: 7, color: {background: '#81C784'}},
    {id: 2007, label: 'Higher Homotopy Groups ($\pi_n$)', level: 7, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 8: Lie Group, Tangent Space, Symplectic Manifold, Sheaf, Homology
    // ----------------------------------------------------------------------------------
    {id: 71, label: 'Lie Group', level: 8, color: {background: '#81C784'}},
    {id: 70, label: 'Tangent Space', level: 8, color: {background: '#81C784'}},
    {id: 108, label: 'Symplectic Manifold', level: 8, color: {background: '#81C784'}}, 
    {id: 141, label: 'Sheaf (Presheaf satisfying locality/identity)', level: 8, color: {background: '#81C784'}},
    {id: 2008, label: 'Singular Homology', level: 8, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 9: Vector Bundle, Cotangent Space, Curvature, Torsion
    // ----------------------------------------------------------------------------------
    {id: 72, label: 'Vector Bundle', level: 9, color: {background: '#81C784'}},
    {id: 90, label: 'Cotangent Space', level: 9, color: {background: '#81C784'}},
    {id: 142, label: 'Smooth Sections of a Bundle', level: 9, color: {background: '#81C784'}},
    {id: 143, label: 'Riemann Curvature Tensor ($R_{ijkl}$)', level: 9, color: {background: '#81C784'}},
    {id: 2009, label: 'Torsion Tensor ($T$)', level: 9, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 10: Principal/Tensor Bundle, Differential Form, Geodesic, Eilenberg-MacLane Space
    // ----------------------------------------------------------------------------------
    {id: 73, label: 'Principal Bundle', level: 10, color: {background: '#81C784'}},
    {id: 74, label: 'Tensor Bundle', level: 10, color: {background: '#81C784'}},
    {id: 92, label: 'Differential Form', level: 10, color: {background: '#81C784'}},
    {id: 144, label: 'Geodesic', level: 10, color: {background: '#81C784'}},
    {id: 145, label: 'Locally Trivial Fibration', level: 10, color: {background: '#81C784'}},
    {id: 2010, label: 'Eilenberg-MacLane Space $K(G, n)$', level: 10, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 11: Tensor Field, Hodge Star, Ricci/Scalar Curvature, Homotopy Equivalence
    // ----------------------------------------------------------------------------------
    {id: 91, label: 'Tensor Field', level: 11, color: {background: '#81C784'}},
    {id: 113, label: 'Hodge Star Operator', level: 11, color: {background: '#81C784'}}, 
    {id: 146, label: 'Ricci Curvature Tensor (Ric)', level: 11, color: {background: '#81C784'}},
    {id: 147, label: 'Scalar Curvature (S)', level: 11, color: {background: '#81C784'}},
    {id: 148, label: 'Poincaré Duality', level: 11, color: {background: '#81C784'}},
    {id: 2011, label: 'Homotopy Equivalence', level: 11, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 12: Connection, Riemannian Metric, Holomorphic Function, Characteristic Classes, Differential Operator
    // ----------------------------------------------------------------------------------
    {id: 93, label: 'Covariant Derivative (Connection)', level: 12, color: {background: '#81C784'}},
    {id: 119, label: 'Riemannian Metric', level: 12, color: {background: '#81C784'}}, 
    {id: 118, label: 'Holomorphic Function', level: 12, color: {background: '#81C784'}}, 
    {id: 149, label: 'Chern-Weil Theory', level: 12, color: {background: '#81C784'}},
    {id: 150, label: 'Lefschetz Fixed Point Theorem', level: 12, color: {background: '#81C784'}},
    {id: 2012, label: 'Differential Operator (on a Bundle)', level: 12, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 13: Complex Manifold, Hodge Decomposition, Euler Characteristic, De Rham
    // ----------------------------------------------------------------------------------
    {id: 120, label: 'Complex Manifold', level: 13, color: {background: '#81C784'}}, 
    {id: 121, label: 'Hodge Decomposition Theorem', level: 13, color: {background: '#81C784'}}, 
    {id: 151, label: 'Euler Characteristic', level: 13, color: {background: '#81C784'}},
    {id: 152, label: 'De Rham Cohomology', level: 13, color: {background: '#81C784'}},
    {id: 2013, label: 'Laplace-Beltrami Operator ($\Delta$)', level: 13, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 14: Kaehler Manifold, Max Modulus, Gauss-Bonnet, Characteristic Classes
    // ----------------------------------------------------------------------------------
    {id: 127, label: 'Kaehler Manifold', level: 14, color: {background: '#81C784'}}, 
    {id: 130, label: 'Maximum Modulus Principle', level: 14, color: {background: '#81C784'}},
    {id: 153, label: 'Gauss-Bonnet Theorem', level: 14, color: {background: '#81C784'}},
    {id: 154, label: 'Chern Class / Pontryagin Class', level: 14, color: {background: '#81C784'}},
    {id: 2014, label: 'Weyl Tensor', level: 14, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 15: Riemann-Roch, Seiberg-Witten, Dirac Operator
    // ----------------------------------------------------------------------------------
    {id: 155, label: 'Riemann-Roch Theorem', level: 15, color: {background: '#81C784'}},
    {id: 156, label: 'Seiberg-Witten Invariants', level: 15, color: {background: '#81C784'}},
    {id: 2015, label: 'Dirac Operator', level: 15, color: {background: '#81C784'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 16: Atiyah-Singer, Topological K-Theory
    // ----------------------------------------------------------------------------------
    {id: 157, label: 'Atiyah-Singer Index Theorem (Full)', level: 16, color: {background: '#81C784'}},
    {id: 158, label: 'Topological K-Theory', level: 16, color: {background: '#81C784'}},
    {id: 2016, label: 'Elliptic Complex', level: 16, color: {background: '#81C784'}}, // NEW
];

const topogeo_edges = [
    // ----------------------------------------------------------------------------------
    // Axioms to Base Set V (ID 0)
    // ----------------------------------------------------------------------------------
    {from: 0, to: 16, arrows: 'to', dashes: true}, {from: 0, to: 17, arrows: 'to', dashes: true}, 
    {from: 0, to: 18, arrows: 'to', dashes: true}, {from: 0, to: 19, arrows: 'to', dashes: true}, 
    {from: 0, to: 60, arrows: 'to', dashes: true}, {from: 0, to: 61, arrows: 'to', dashes: true}, 
    {from: 0, to: 62, arrows: 'to', dashes: true}, {from: 0, to: 63, arrows: 'to', dashes: true}, 
    {from: 0, to: 102, arrows: 'to', dashes: true}, {from: 0, to: 103, arrows: 'to', dashes: true},
    {from: 0, to: 133, arrows: 'to', dashes: true}, {from: 0, to: 134, arrows: 'to', dashes: true},
    {from: 0, to: 2000, arrows: 'to', dashes: true},

    // ----------------------------------------------------------------------------------
    // LEVEL 1 -> 2: Metric Space / Isometry / Homotopy
    // ----------------------------------------------------------------------------------
    {from: 16, to: 34, arrows: 'to'}, {from: 17, to: 34, arrows: 'to'}, 
    {from: 18, to: 34, arrows: 'to'}, {from: 19, to: 34, arrows: 'to'}, 
    {from: 34, to: 135, arrows: 'to', width: 2}, // Metric -> Isometry/Homeomorphism
    {from: 64, to: 2001, arrows: 'to', width: 2}, // Topo Space -> Homotopy

    // ----------------------------------------------------------------------------------
    // LEVEL 2 -> 3: Topological Space / Connectedness / Retract
    // ----------------------------------------------------------------------------------
    {from: 60, to: 64, arrows: 'to'}, {from: 34, to: 64, arrows: 'to', dashes: true}, // Metric -> Topo
    {from: 64, to: 136, arrows: 'to', width: 2}, // Topo -> Connected
    {from: 134, to: 136, arrows: 'to', dashes: true}, // Path Connected Axiom -> Connected
    {from: 64, to: 2002, arrows: 'to', width: 2}, // Topo Space -> Retract
    {from: 2000, to: 138, arrows: 'to', width: 2}, // Compact-Open -> C(X)

    // ----------------------------------------------------------------------------------
    // LEVEL 3 -> 4: Manifolds / Separation / Completion / Simply Connected
    // ----------------------------------------------------------------------------------
    // Topological Manifold
    {from: 64, to: 66, arrows: 'to', width: 3}, {from: 61, to: 66, arrows: 'to'}, {from: 62, to: 66, arrows: 'to'},
    {from: 66, to: 137, arrows: 'to', width: 2}, {from: 134, to: 137, arrows: 'to'}, // Path Connected Manifold
    
    // Simply Connected
    {from: 137, to: 2003, arrows: 'to', width: 2}, // Path Connected -> Simply Connected

    // Separation Axioms
    {from: 64, to: 85, arrows: 'to', width: 2}, {from: 85, to: 86, arrows: 'to'}, {from: 61, to: 86, arrows: 'to'},
    {from: 86, to: 87, arrows: 'to', width: 2},

    // Metric and Completion
    {from: 34, to: 104, arrows: 'to', width: 3}, {from: 102, to: 104, arrows: 'to'},
    {from: 64, to: 88, arrows: 'to', width: 2}, // Topo -> Compact

    // ----------------------------------------------------------------------------------
    // LEVEL 4 -> 5: Charts / Regularity / Fundamental Group
    // ----------------------------------------------------------------------------------
    {from: 66, to: 67, arrows: 'to'}, // Manifold -> Charts
    {from: 88, to: 89, arrows: 'to', width: 2}, // Compact -> Locally Compact
    {from: 87, to: 105, arrows: 'to', dashes: true},
    {from: 104, to: 105, arrows: 'to', dashes: true},
    {from: 64, to: 138, arrows: 'to', width: 2}, {from: 63, to: 138, arrows: 'to', dashes: true},
    
    // Fundamental Group
    {from: 137, to: 2004, arrows: 'to', width: 3}, {from: 2001, to: 2004, arrows: 'to'}, // Homotopy -> Pi_1

    // ----------------------------------------------------------------------------------
    // LEVEL 5 -> 6: Atlas / Paracompactness / Covering Space
    // ----------------------------------------------------------------------------------
    {from: 67, to: 68, arrows: 'to'}, // Charts -> Atlas
    {from: 66, to: 139, arrows: 'to', width: 2}, {from: 133, to: 139, arrows: 'to'},
    {from: 68, to: 2006, arrows: 'to', width: 3}, {from: 63, to: 2006, arrows: 'to'}, // Atlas + Smoothness -> Smooth Manifold
    
    // Covering Space
    {from: 2004, to: 2005, arrows: 'to', width: 3}, {from: 137, to: 2005, arrows: 'to', dashes: true}, // Pi_1 -> Covering Space

    // ----------------------------------------------------------------------------------
    // LEVEL 6 -> 7: Differentiable Manifold / Urysohn / Higher Homotopy
    // ----------------------------------------------------------------------------------
    {from: 2006, to: 69, arrows: 'to'}, // Smooth Manifold -> Differentiable Manifold
    {from: 87, to: 140, arrows: 'to', width: 2},
    {from: 2004, to: 2007, arrows: 'to', width: 2}, // Pi_1 -> Higher Pi_n

    // ----------------------------------------------------------------------------------
    // LEVEL 7 -> 8: Differential Geometry Start / Sheaves / Homology
    // ----------------------------------------------------------------------------------
    {from: 69, to: 70, arrows: 'to', width: 3}, 
    {from: 33, to: 70, arrows: 'to'}, // Vector Space (Analysis)
    {from: 69, to: 108, arrows: 'to', width: 2}, {from: 103, to: 108, arrows: 'to'},
    {from: 65, to: 71, arrows: 'to', width: 2}, {from: 69, to: 71, arrows: 'to', width: 2}, 
    {from: 64, to: 141, arrows: 'to', width: 2},
    
    // Homology
    {from: 64, to: 2008, arrows: 'to', width: 3}, {from: 1022, to: 2008, arrows: 'to', dashes: true}, // Topo -> Homology (via Chain Complex)

    // ----------------------------------------------------------------------------------
    // LEVEL 8 -> 9: Bundles / Curvature / Torsion
    // ----------------------------------------------------------------------------------
    {from: 69, to: 72, arrows: 'to', width: 3, dashes: true}, 
    {from: 33, to: 72, arrows: 'to', width: 3}, 
    {from: 70, to: 72, arrows: 'to'}, 
    {from: 72, to: 142, arrows: 'to', width: 2},
    
    {from: 70, to: 90, arrows: 'to', width: 3},
    {from: 93, to: 143, arrows: 'to', width: 3}, // Connection -> Riemann Curvature
    {from: 93, to: 2009, arrows: 'to', width: 2}, // Connection -> Torsion

    // ----------------------------------------------------------------------------------
    // LEVEL 9 -> 10: Bundle Specialization / Forms / Geodesics / Eilenberg-MacLane
    // ----------------------------------------------------------------------------------
    {from: 72, to: 73, arrows: 'to', width: 3}, {from: 71, to: 73, arrows: 'to'},
    {from: 72, to: 74, arrows: 'to', width: 3}, {from: 74, to: 92, arrows: 'to', width: 2},
    {from: 90, to: 92, arrows: 'to', width: 2},
    {from: 72, to: 145, arrows: 'to', width: 2},
    {from: 93, to: 144, arrows: 'to', width: 2},
    
    // Eilenberg-MacLane
    {from: 2007, to: 2010, arrows: 'to', width: 2}, // Higher Homotopy -> K(G,n)
    {from: 2008, to: 2010, arrows: 'to', dashes: true}, // Homology -> K(G,n)

    // ----------------------------------------------------------------------------------
    // LEVEL 10 -> 11: Tensor Field / Curvature Contraction / Duality / Equivalence
    // ----------------------------------------------------------------------------------
    {from: 74, to: 91, arrows: 'to', width: 3},
    {from: 92, to: 113, arrows: 'to', width: 2},
    {from: 143, to: 146, arrows: 'to', width: 3}, {from: 146, to: 147, arrows: 'to', width: 3},
    {from: 92, to: 148, arrows: 'to', width: 2},
    {from: 2001, to: 2011, arrows: 'to', width: 2}, {from: 2002, to: 2011, arrows: 'to', dashes: true}, // Retract -> Equivalence

    // ----------------------------------------------------------------------------------
    // LEVEL 11 -> 12: Connection / Metric / Characteristic Classes / Operators
    // ----------------------------------------------------------------------------------
    {from: 91, to: 93, arrows: 'to', width: 3},
    {from: 91, to: 119, arrows: 'to', width: 3},
    {from: 143, to: 149, arrows: 'to', width: 3},
    {from: 140, to: 150, arrows: 'to', width: 2},
    {from: 107, to: 118, arrows: 'to'}, {from: 63, to: 118, arrows: 'to', dashes: true}, 
    {from: 142, to: 2012, arrows: 'to', width: 2}, // Smooth Sections -> Diff Operator

    // ----------------------------------------------------------------------------------
    // LEVEL 12 -> 13: Complex Manifolds / Cohomology / Decomposition / Laplacian
    // ----------------------------------------------------------------------------------
    {from: 69, to: 120, arrows: 'to', width: 2}, {from: 107, to: 120, arrows: 'to'},
    {from: 113, to: 121, arrows: 'to', width: 3},
    {from: 92, to: 152, arrows: 'to', width: 3},
    {from: 152, to: 151, arrows: 'to', width: 2},
    {from: 119, to: 2013, arrows: 'to', width: 3}, {from: 2012, to: 2013, arrows: 'to', dashes: true}, // Metric -> Laplacian

    // ----------------------------------------------------------------------------------
    // LEVEL 13 -> 14: Specialized Complex / Global Theorems / Curvature Detail
    // ----------------------------------------------------------------------------------
    {from: 120, to: 127, arrows: 'to', width: 2}, {from: 119, to: 127, arrows: 'to'},
    {from: 118, to: 130, arrows: 'to', width: 2},
    {from: 147, to: 153, arrows: 'to', width: 3}, {from: 151, to: 153, arrows: 'to', dashes: true},
    {from: 149, to: 154, arrows: 'to', width: 3},
    {from: 143, to: 2014, arrows: 'to', width: 2}, {from: 146, to: 2014, arrows: 'to'}, // Riemann + Ricci -> Weyl Tensor

    // ----------------------------------------------------------------------------------
    // LEVEL 14 -> 15: Deep Theorems / Dirac
    // ----------------------------------------------------------------------------------
    {from: 127, to: 155, arrows: 'to', width: 3},
    {from: 154, to: 156, arrows: 'to', width: 3},
    {from: 119, to: 2015, arrows: 'to', width: 3}, // Riemannian Metric -> Dirac Operator (requires spin structure)

    // ----------------------------------------------------------------------------------
    // LEVEL 15 -> 16: Peak Modern Theory / Atiyah-Singer Input
    // ----------------------------------------------------------------------------------
    {from: 155, to: 157, arrows: 'to', width: 3},
    {from: 154, to: 158, arrows: 'to', width: 2},
    {from: 2012, to: 2016, arrows: 'to', width: 3}, {from: 2015, to: 2016, arrows: 'to', dashes: true}, // Diff Operator -> Elliptic Complex
    {from: 2016, to: 157, arrows: 'to', width: 3}, // Elliptic Complex is the final piece for Atiyah-Singer
];