// algebra.js

const algebra_nodes = [
    // LEVEL 0
    {id: 0, label: 'Base Set V', level: 0, color: {background: '#97C2FC'}},

    // LEVEL 1: Axioms (Algebraic Subset)
    {id: 1, label: 'Additive Closure', level: 1, color: {background: '#97C2FC'}},
    {id: 2, label: 'Additive Commutativity', level: 1, color: {background: '#97C2FC'}},
    {id: 3, label: 'Additive Associativity', level: 1, color: {background: '#97C2FC'}},
    {id: 4, label: 'Additive Identity', level: 1, color: {background: '#97C2FC'}},
    {id: 5, label: 'Additive Inverse', level: 1, color: {background: '#97C2FC'}},
    {id: 6, label: 'Multiplicative Closure', level: 1, color: {background: '#97C2FC'}},
    {id: 7, label: 'Multiplicative Associativity', level: 1, color: {background: '#97C2FC'}},
    {id: 8, label: 'Distributivity (Ring)', level: 1, color: {background: '#97C2FC'}},
    {id: 14, label: 'Multiplicative Commutativity', level: 1, color: {background: '#97C2FC'}},
    {id: 15, label: 'Multiplicative Inverse (Non-Zero)', level: 1, color: {background: '#97C2FC'}}, 
    
    // LEVEL 2: Group
    {id: 30, label: 'Group', level: 2, color: {background: '#97C2FC'}},
    
    // LEVEL 3: Abelian Group and Non-Abelian Group
    {id: 300, label: 'Abelian Group', level: 3, color: {background: '#97C2FC'}}, 
    {id: 65, label: 'Non-Abelian Group', level: 3, color: {background: '#97C2FC'}}, 

    // LEVEL 4: Ring
    {id: 31, label: 'Ring', level: 4, color: {background: '#97C2FC'}},

    // LEVEL 5: Module, Integral Domain, Noetherian Ring
    {id: 32, label: 'Module (over a Ring)', level: 5, color: {background: '#97C2FC'}}, 
    {id: 80, label: 'Integral Domain', level: 5, color: {background: '#97C2FC'}},
    {id: 83, label: 'Noetherian Ring', level: 5, color: {background: '#97C2FC'}},

    // LEVEL 6: Field, PID, UFD
    {id: 310, label: 'Field', level: 6, color: {background: '#97C2FC'}},
    {id: 81, label: 'Principal Ideal Domain (PID)', level: 6, color: {background: '#97C2FC'}},
    {id: 82, label: 'Unique Factorization Domain (UFD)', level: 6, color: {background: '#97CFC'}},

    // LEVEL 7: Algebraically Closed Field
    {id: 84, label: 'Algebraically Closed Field', level: 7, color: {background: '#97C2FC'}},
];

const algebra_edges = [
    // Axioms to Group (Group)
    {from: 0, to: 1, arrows: 'to', dashes: true}, {from: 0, to: 3, arrows: 'to', dashes: true}, 
    {from: 0, to: 4, arrows: 'to', dashes: true}, {from: 0, to: 5, arrows: 'to', dashes: true}, 
    {from: 1, to: 30, arrows: 'to'}, {from: 3, to: 30, arrows: 'to'}, 
    {from: 4, to: 30, arrows: 'to'}, {from: 5, to: 30, arrows: 'to'}, 
    
    // Group to Abelian and Non-Abelian Group
    {from: 30, to: 300, arrows: 'to', width: 2}, {from: 2, to: 300, arrows: 'to'},
    {from: 30, to: 65, arrows: 'to', dashes: true}, {from: 2, to: 65, arrows: 'to', dashes: true},

    // Ring (L4)
    {from: 300, to: 31, arrows: 'to', width: 1.5, dashes: true},
    {from: 6, to: 31, arrows: 'to', dashes: true}, {from: 7, to: 31, arrows: 'to', dashes: true}, 
    {from: 8, to: 31, arrows: 'to', dashes: true}, {from: 0, to: 6, arrows: 'to', dashes: true},
    {from: 0, to: 7, arrows: 'to', dashes: true}, {from: 0, to: 8, arrows: 'to', dashes: true},
    {from: 0, to: 14, arrows: 'to', dashes: true}, {from: 0, to: 15, arrows: 'to', dashes: true},

    // Integral Domain (L5)
    {from: 31, to: 80, arrows: 'to', width: 2},
    
    // Domain -> PID / UFD (L6)
    {from: 80, to: 81, arrows: 'to', width: 2}, {from: 80, to: 82, arrows: 'to', width: 2},
    
    // Noetherian Ring (L5)
    {from: 31, to: 83, arrows: 'to', width: 2},

    // Field (L6)
    {from: 31, to: 310, arrows: 'to', width: 2},
    {from: 14, to: 310, arrows: 'to'}, {from: 15, to: 310, arrows: 'to'},
    
    // Algebraically Closed Field (L7)
    {from: 310, to: 84, arrows: 'to', width: 2},
    
    // Module (L5)
    {from: 300, to: 32, arrows: 'to'},
    {from: 31, to: 32, arrows: 'to', width: 2},
];