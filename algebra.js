// algebra.js

const algebra_nodes = [
    // ----------------------------------------------------------------------------------
    // LEVEL 1: Axioms (Set Theory)
    // ----------------------------------------------------------------------------------
    {id: 1, label: 'Associativity', level: 1, color: {background: '#FDD835'}},
    {id: 2, label: 'Identity Element', level: 1, color: {background: '#FDD835'}},
    {id: 3, label: 'Inverse Element', level: 1, color: {background: '#FDD835'}},
    {id: 4, label: 'Commutativity', level: 1, color: {background: '#FDD835'}},
    {id: 5, label: 'Distributivity (Multiplication over Addition)', level: 1, color: {background: '#FDD835'}},
    {id: 6, label: 'Additive Closure', level: 1, color: {background: '#FDD835'}},
    {id: 7, label: 'Multiplicative Closure', level: 1, color: {background: '#FDD835'}},
    {id: 8, label: 'Non-zero Multiplicative Identity', level: 1, color: {background: '#FDD835'}},
    {id: 15, label: 'Zero Divisor Absence (Integrity)', level: 1, color: {background: '#FDD835'}},
    {id: 1000, label: 'Set Closure (General)', level: 1, color: {background: '#FDD835'}}, // NEW
    {id: 1001, label: 'Homomorphism Property', level: 1, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 2: Magma, Semigroup, Monoid, Group
    // ----------------------------------------------------------------------------------
    {id: 1002, label: 'Magma', level: 2, color: {background: '#FDD835'}}, // NEW (Closure)
    {id: 1003, label: 'Semigroup', level: 2, color: {background: '#FDD835'}}, // NEW
    {id: 1004, label: 'Monoid', level: 2, color: {background: '#FDD835'}}, // NEW
    {id: 30, label: 'Group (Basic)', level: 2, color: {background: '#FDD835'}},

    // ----------------------------------------------------------------------------------
    // LEVEL 3: Commutative Group, Ring
    // ----------------------------------------------------------------------------------
    {id: 31, label: 'Abelian Group (Commutative Group)', level: 3, color: {background: '#FDD835'}},
    {id: 32, label: 'Ring', level: 3, color: {background: '#FDD835'}},
    {id: 1005, label: 'Group Action', level: 3, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 4: Subgroup, Ring with Unity, Commutative Ring, Field
    // ----------------------------------------------------------------------------------
    {id: 1006, label: 'Subgroup / Normal Subgroup', level: 4, color: {background: '#FDD835'}}, // NEW
    {id: 1007, label: 'Quotient Group', level: 4, color: {background: '#FDD835'}}, // NEW
    {id: 33, label: 'Vector Space (Module over a Field)', level: 4, color: {background: '#FDD835'}},
    {id: 1008, label: 'Ring with Unity (Unital Ring)', level: 4, color: {background: '#FDD835'}}, // NEW
    {id: 1009, label: 'Commutative Ring', level: 4, color: {background: '#FDD835'}}, // NEW
    {id: 45, label: 'Field', level: 4, color: {background: '#FDD835'}},

    // ----------------------------------------------------------------------------------
    // LEVEL 5: Integral Domain, Module, Lie Algebra
    // ----------------------------------------------------------------------------------
    {id: 46, label: 'Integral Domain', level: 5, color: {background: '#FDD835'}},
    {id: 47, label: 'Module (over a Ring)', level: 5, color: {background: '#FDD835'}},
    {id: 1010, label: 'Ring Homomorphism / Isomorphism', level: 5, color: {background: '#FDD835'}}, // NEW
    {id: 1011, label: 'Tensor Product (Modules)', level: 5, color: {background: '#FDD835'}}, // NEW
    {id: 1012, label: 'Lie Algebra', level: 5, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 6: PID, UFD, Simple Group, Projective/Injective Module
    // ----------------------------------------------------------------------------------
    {id: 48, label: 'Principal Ideal Domain (PID)', level: 6, color: {background: '#FDD835'}},
    {id: 49, label: 'Unique Factorization Domain (UFD)', level: 6, color: {background: '#FDD835'}},
    {id: 1013, label: 'Simple Group', level: 6, color: {background: '#FDD835'}}, // NEW
    {id: 1014, label: 'Projective Module', level: 6, color: {background: '#FDD835'}}, // NEW
    {id: 1015, label: 'Injective Module', level: 6, color: {background: '#FDD835'}}, // NEW
    {id: 1016, label: 'Exterior Algebra (Wedge Product)', level: 6, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 7: Dedekind Domain, Noetherian/Artinian Ring, Semisimple Ring, Group Representation
    // ----------------------------------------------------------------------------------
    {id: 54, label: 'Dedekind Domain', level: 7, color: {background: '#FDD835'}},
    {id: 55, label: 'Noetherian Ring', level: 7, color: {background: '#FDD835'}},
    {id: 56, label: 'Artinian Ring', level: 7, color: {background: '#FDD835'}},
    {id: 1017, label: 'Semisimple Ring', level: 7, color: {background: '#FDD835'}}, // NEW
    {id: 1018, label: 'Finite Group Representation', level: 7, color: {background: '#FDD835'}}, // NEW
    {id: 1019, label: 'Universal Enveloping Algebra', level: 7, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 8: Free Module, Exact Sequence, Chain Complex, Separable Field
    // ----------------------------------------------------------------------------------
    {id: 1020, label: 'Free Module', level: 8, color: {background: '#FDD835'}}, // NEW
    {id: 1021, label: 'Exact Sequence', level: 8, color: {background: '#FDD835'}}, // NEW
    {id: 1022, label: 'Chain Complex', level: 8, color: {background: '#FDD835'}}, // NEW
    {id: 1023, label: 'Separable Field Extension', level: 8, color: {background: '#FDD835'}}, // NEW
    {id: 1024, label: 'Galois Group', level: 8, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 9: Category Theory Basics, Homology/Cohomology, Frobenius Algebra
    // ----------------------------------------------------------------------------------
    {id: 57, label: 'Category', level: 9, color: {background: '#FDD835'}},
    {id: 1025, label: 'Functor', level: 9, color: {background: '#FDD835'}}, // NEW
    {id: 1026, label: 'Homology / Cohomology', level: 9, color: {background: '#FDD835'}}, // NEW
    {id: 1027, label: 'Frobenius Algebra', level: 9, color: {background: '#FDD835'}}, // NEW
    {id: 1028, label: 'Fundamental Theorem of Galois Theory', level: 9, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 10: Adjunction, Abelian Category, Ext/Tor Functors
    // ----------------------------------------------------------------------------------
    {id: 1029, label: 'Adjunction (Functor Pair)', level: 10, color: {background: '#FDD835'}}, // NEW
    {id: 58, label: 'Abelian Category', level: 10, color: {background: '#FDD835'}},
    {id: 1030, label: 'Ext and Tor Functors', level: 10, color: {background: '#FDD835'}}, // NEW
    {id: 1031, label: 'Group Character Theory', level: 10, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 11: Derived Category, Hopf Algebra, Class Field Theory
    // ----------------------------------------------------------------------------------
    {id: 1032, label: 'Derived Category', level: 11, color: {background: '#FDD835'}}, // NEW
    {id: 1033, label: 'Hopf Algebra', level: 11, color: {background: '#FDD835'}}, // NEW
    {id: 1034, label: 'Class Field Theory', level: 11, color: {background: '#FDD835'}}, // NEW
    {id: 1035, label: 'Non-commutative Geometry (Base)', level: 11, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 12: Algebraic K-Theory, Motives
    // ----------------------------------------------------------------------------------
    {id: 1036, label: 'Algebraic K-Theory', level: 12, color: {background: '#FDD835'}}, // NEW
    {id: 1037, label: 'Motives (Base Concept)', level: 12, color: {background: '#FDD835'}}, // NEW
    {id: 1038, label: 'Langlands Program (Base)', level: 12, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 13: A-Infinity Algebra, Tannakian Duality
    // ----------------------------------------------------------------------------------
    {id: 1039, label: 'A-Infinity Algebra', level: 13, color: {background: '#FDD835'}}, // NEW
    {id: 1040, label: 'Tannakian Duality', level: 13, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 14: Cohomological Field Theory
    // ----------------------------------------------------------------------------------
    {id: 1041, label: 'Cohomological Field Theory', level: 14, color: {background: '#FDD835'}}, // NEW

    // ----------------------------------------------------------------------------------
    // LEVEL 15: Grothendieck's Motives
    // ----------------------------------------------------------------------------------
    {id: 1042, label: 'Grothendieck\'s Standard Conjectures on Motives', level: 15, color: {background: '#FDD835'}}, // NEW
];

const algebra_edges = [
    // ----------------------------------------------------------------------------------
    // Axioms to Base Set V (ID 0)
    // ----------------------------------------------------------------------------------
    {from: 0, to: 1, arrows: 'to', dashes: true}, {from: 0, to: 2, arrows: 'to', dashes: true}, 
    {from: 0, to: 3, arrows: 'to', dashes: true}, {from: 0, to: 4, arrows: 'to', dashes: true}, 
    {from: 0, to: 5, arrows: 'to', dashes: true}, {from: 0, to: 6, arrows: 'to', dashes: true}, 
    {from: 0, to: 7, arrows: 'to', dashes: true}, {from: 0, to: 8, arrows: 'to', dashes: true}, 
    {from: 0, to: 15, arrows: 'to', dashes: true}, {from: 0, to: 1000, arrows: 'to', dashes: true}, 

    // ----------------------------------------------------------------------------------
    // LEVEL 1 -> 2: Magma, Semigroup, Monoid, Group
    // ----------------------------------------------------------------------------------
    {from: 1000, to: 1002, arrows: 'to', width: 2}, // Closure -> Magma
    {from: 1002, to: 1003, arrows: 'to'}, {from: 1, to: 1003, arrows: 'to'}, // Magma + Assoc -> Semigroup
    {from: 1003, to: 1004, arrows: 'to'}, {from: 2, to: 1004, arrows: 'to'}, // Semigroup + Identity -> Monoid
    {from: 1004, to: 30, arrows: 'to', width: 3}, {from: 3, to: 30, arrows: 'to'}, // Monoid + Inverse -> Group
    
    // ----------------------------------------------------------------------------------
    // LEVEL 2 -> 3: Abelian Group, Ring, Group Action
    // ----------------------------------------------------------------------------------
    {from: 30, to: 31, arrows: 'to'}, {from: 4, to: 31, arrows: 'to'}, // Group + Commutativity -> Abelian Group
    {from: 31, to: 32, arrows: 'to', width: 3}, // Abelian Group (for addition) -> Ring (Base)
    {from: 1, to: 32, arrows: 'to', dashes: true}, {from: 5, to: 32, arrows: 'to'}, {from: 7, to: 32, arrows: 'to'},
    {from: 30, to: 1005, arrows: 'to', width: 2}, // Group -> Group Action (on a Set)

    // ----------------------------------------------------------------------------------
    // LEVEL 3 -> 4: Subgroup, Quotient, Vector Space, Specialized Rings, Field
    // ----------------------------------------------------------------------------------
    {from: 30, to: 1006, arrows: 'to', width: 2}, // Group -> Subgroup
    {from: 1006, to: 1007, arrows: 'to', width: 2}, // Normal Subgroup -> Quotient Group
    {from: 32, to: 1008, arrows: 'to'}, {from: 8, to: 1008, arrows: 'to'}, // Ring + Multiplicative Identity -> Ring with Unity
    {from: 1008, to: 1009, arrows: 'to'}, {from: 4, to: 1009, arrows: 'to'}, // Ring with Unity + Commutativity -> Commutative Ring
    {from: 1008, to: 45, arrows: 'to', width: 3, dashes: true}, // Ring with Unity -> Field (requires more)
    {from: 1009, to: 45, arrows: 'to', dashes: true}, // Commutative Ring -> Field (requires more)
    {from: 3, to: 45, arrows: 'to'}, // Additive and Multiplicative Inverses -> Field
    {from: 45, to: 33, arrows: 'to', width: 3}, // Field -> Vector Space (Module over a Field)

    // ----------------------------------------------------------------------------------
    // LEVEL 4 -> 5: Domain, Module, Homomorphism, Tensor Product, Lie Algebra
    // ----------------------------------------------------------------------------------
    {from: 1009, to: 46, arrows: 'to'}, {from: 15, to: 46, arrows: 'to'}, // Commutative Ring + Integrity -> Integral Domain
    {from: 1008, to: 47, arrows: 'to', width: 3}, // Ring with Unity -> Module
    {from: 1009, to: 1010, arrows: 'to', width: 2}, {from: 1001, to: 1010, arrows: 'to'}, // Commutative Ring + Homomorphism Prop -> Ring Homomorphism
    {from: 47, to: 1011, arrows: 'to', width: 2}, // Module -> Tensor Product (Modules)
    {from: 33, to: 1012, arrows: 'to', width: 2}, // Vector Space -> Lie Algebra (requires Lie bracket structure)

    // ----------------------------------------------------------------------------------
    // LEVEL 5 -> 6: Factorization, Simple Group, Specialized Modules, Exterior Algebra
    // ----------------------------------------------------------------------------------
    {from: 46, to: 49, arrows: 'to'}, // Integral Domain -> UFD
    {from: 49, to: 48, arrows: 'to'}, // UFD -> PID (reverse containment is often studied, but the PID implies UFD is stronger)
    {from: 30, to: 1013, arrows: 'to', width: 3}, // Group -> Simple Group (requires no non-trivial normal subgroups)
    {from: 47, to: 1014, arrows: 'to', width: 2}, {from: 47, to: 1015, arrows: 'to', width: 2}, // Module -> Projective/Injective
    {from: 33, to: 1016, arrows: 'to', width: 3}, // Vector Space -> Exterior Algebra

    // ----------------------------------------------------------------------------------
    // LEVEL 6 -> 7: Field/Ring Classification, Representation Theory
    // ----------------------------------------------------------------------------------
    {from: 48, to: 54, arrows: 'to'}, // PID -> Dedekind Domain
    {from: 1009, to: 55, arrows: 'to'}, {from: 1009, to: 56, arrows: 'to'}, // Commutative Ring -> Noetherian/Artinian
    {from: 56, to: 55, arrows: 'to'}, // Artinian implies Noetherian (for Commutative Rings)
    {from: 1008, to: 1017, arrows: 'to', width: 2}, // Ring with Unity -> Semisimple Ring (requires Jacobson radical = 0)
    {from: 30, to: 1018, arrows: 'to', width: 3}, // Group -> Representation (requires vector space/module structure)
    {from: 1012, to: 1019, arrows: 'to', width: 2}, // Lie Algebra -> Universal Enveloping Algebra

    // ----------------------------------------------------------------------------------
    // LEVEL 7 -> 8: Free Module, Homological Basics, Field Extensions
    // ----------------------------------------------------------------------------------
    {from: 47, to: 1020, arrows: 'to', width: 2}, {from: 33, to: 1020, arrows: 'to', dashes: true}, // Module/Vector Space -> Free Module
    {from: 47, to: 1021, arrows: 'to', width: 2}, // Module -> Exact Sequence
    {from: 1021, to: 1022, arrows: 'to', width: 2}, // Exact Sequence -> Chain Complex
    {from: 45, to: 1023, arrows: 'to', width: 2}, // Field -> Separable Extension
    {from: 1023, to: 1024, arrows: 'to', width: 3}, // Separable Field Extension -> Galois Group

    // ----------------------------------------------------------------------------------
    // LEVEL 8 -> 9: Category Theory Basics, Homology, Galois Theory Theorem
    // ----------------------------------------------------------------------------------
    {from: 0, to: 57, arrows: 'to', width: 3, dashes: true}, // Base Set -> Category
    {from: 57, to: 1025, arrows: 'to', width: 2}, // Category -> Functor
    {from: 1022, to: 1026, arrows: 'to', width: 3}, // Chain Complex -> Homology/Cohomology
    {from: 1017, to: 1027, arrows: 'to', width: 2}, // Semisimple Ring -> Frobenius Algebra
    {from: 1024, to: 1028, arrows: 'to', width: 3}, // Galois Group -> Fundamental Theorem of Galois Theory

    // ----------------------------------------------------------------------------------
    // LEVEL 9 -> 10: Adjunction, Abelian Category, Advanced Homology, Character Theory
    // ----------------------------------------------------------------------------------
    {from: 1025, to: 1029, arrows: 'to', width: 2}, // Functor -> Adjunction
    {from: 57, to: 58, arrows: 'to'}, {from: 31, to: 58, arrows: 'to', dashes: true}, // Category + Abelian Group Properties -> Abelian Category
    {from: 1026, to: 1030, arrows: 'to', width: 2}, // Homology/Cohomology -> Ext/Tor
    {from: 1018, to: 1031, arrows: 'to', width: 3}, // Representation -> Character Theory

    // ----------------------------------------------------------------------------------
    // LEVEL 10 -> 11: Derived Category, Hopf Algebra, Class Field Theory
    // ----------------------------------------------------------------------------------
    {from: 58, to: 1032, arrows: 'to', width: 3}, // Abelian Category -> Derived Category
    {from: 1008, to: 1033, arrows: 'to', width: 3}, // Ring with Unity -> Hopf Algebra (Requires Co-structure)
    {from: 45, to: 1034, arrows: 'to', width: 3}, // Field -> Class Field Theory (Deep Algebraic Number Theory)
    {from: 1009, to: 1035, arrows: 'to', width: 2}, // Commutative Ring -> Non-commutative Geometry (via the dual structure)

    // ----------------------------------------------------------------------------------
    // LEVEL 11 -> 12: K-Theory, Motives, Langlands
    // ----------------------------------------------------------------------------------
    {from: 1032, to: 1036, arrows: 'to', width: 3}, // Derived Category -> K-Theory
    {from: 1034, to: 1038, arrows: 'to', width: 3}, // Class Field Theory -> Langlands Program
    {from: 1032, to: 1037, arrows: 'to', width: 2}, // Derived Category -> Motives

    // ----------------------------------------------------------------------------------
    // LEVEL 12 -> 13: A-Infinity, Tannakian Duality
    // ----------------------------------------------------------------------------------
    {from: 1032, to: 1039, arrows: 'to', width: 2}, // Derived Category -> A-Infinity Algebra
    {from: 1029, to: 1040, arrows: 'to', width: 2}, // Adjunction -> Tannakian Duality

    // ----------------------------------------------------------------------------------
    // LEVEL 13 -> 14: Cohomological Field Theory
    // ----------------------------------------------------------------------------------
    {from: 1026, to: 1041, arrows: 'to', width: 3}, // Cohomology -> Cohomological Field Theory

    // ----------------------------------------------------------------------------------
    // LEVEL 14 -> 15: Grothendieck's Motives
    // ----------------------------------------------------------------------------------
    {from: 1037, to: 1042, arrows: 'to', width: 3}, // Motives -> Standard Conjectures
];