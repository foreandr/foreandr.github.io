const graphData = {
  "nodes": [
    {
      "id": "n1",
      "label": "TRUE \u2227 (TRUE \u2192 TRUE)"
    },
    {
      "id": "n2",
      "label": "TRUE"
    },
    {
      "id": "n3",
      "label": "\u00ac\u00acTRUE"
    },
    {
      "id": "n4",
      "label": "add(0,0)"
    },
    {
      "id": "n5",
      "label": "0"
    },
    {
      "id": "n6",
      "label": "add(S(0),0)"
    },
    {
      "id": "n7",
      "label": "S(0)"
    },
    {
      "id": "n8",
      "label": "add(S(0),S(0))"
    },
    {
      "id": "n9",
      "label": "S(add(S(0),0))"
    },
    {
      "id": "n10",
      "label": "S(S(0))"
    },
    {
      "id": "n11",
      "label": "mul(S(0),0)"
    },
    {
      "id": "n12",
      "label": "mul(0,S(0))"
    },
    {
      "id": "n13",
      "label": "add(mul(0,0),0)"
    },
    {
      "id": "n14",
      "label": "Zzero"
    },
    {
      "id": "n15",
      "label": "(0,0)"
    },
    {
      "id": "n16",
      "label": "Zembed(S(0))"
    },
    {
      "id": "n17",
      "label": "(S(0),0)"
    },
    {
      "id": "n18",
      "label": "Zneg((S(0),0))"
    },
    {
      "id": "n19",
      "label": "(0,S(0))"
    },
    {
      "id": "n20",
      "label": "Zadd((S(0),0),(0,0))"
    },
    {
      "id": "n21",
      "label": "Z(S(0),(0,0))"
    },
    {
      "id": "n22",
      "label": "(add(S(0),0),add(0,0))"
    },
    {
      "id": "n23",
      "label": "Zadd((0,0),(S(0),0))"
    },
    {
      "id": "n24",
      "label": "Z(0,(S(0),0))"
    },
    {
      "id": "n25",
      "label": "(add(0,S(0)),add(0,0))"
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": "n1",
      "to": "n2",
      "rule_id": "L1",
      "rule_name": "Modus-Ponens",
      "level": "logic"
    },
    {
      "id": "e2",
      "from": "n3",
      "to": "n2",
      "rule_id": "L3",
      "rule_name": "Double-Negation",
      "level": "logic"
    },
    {
      "id": "e3",
      "from": "n4",
      "to": "n5",
      "rule_id": "N2",
      "rule_name": "Add-Zero",
      "level": "nat"
    },
    {
      "id": "e4",
      "from": "n6",
      "to": "n7",
      "rule_id": "N2",
      "rule_name": "Add-Zero",
      "level": "nat"
    },
    {
      "id": "e5",
      "from": "n8",
      "to": "n9",
      "rule_id": "N3",
      "rule_name": "Add-Succ",
      "level": "nat"
    },
    {
      "id": "e6",
      "from": "n9",
      "to": "n10",
      "rule_id": "N2",
      "rule_name": "Add-Zero",
      "level": "nat"
    },
    {
      "id": "e7",
      "from": "n11",
      "to": "n5",
      "rule_id": "N4",
      "rule_name": "Mul-Zero",
      "level": "nat"
    },
    {
      "id": "e8",
      "from": "n12",
      "to": "n13",
      "rule_id": "N5",
      "rule_name": "Mul-Succ",
      "level": "nat"
    },
    {
      "id": "e9",
      "from": "n14",
      "to": "n15",
      "rule_id": "Z1",
      "rule_name": "Int-Zero",
      "level": "int"
    },
    {
      "id": "e10",
      "from": "n16",
      "to": "n17",
      "rule_id": "Z2",
      "rule_name": "Int-Succ-Embed",
      "level": "int"
    },
    {
      "id": "e11",
      "from": "n18",
      "to": "n19",
      "rule_id": "Z4b",
      "rule_name": "Int-Neg-S",
      "level": "int"
    },
    {
      "id": "e12",
      "from": "n20",
      "to": "n22",
      "rule_id": "Z3b",
      "rule_name": "Int-Add-Def-SL",
      "level": "int"
    },
    {
      "id": "e13",
      "from": "n23",
      "to": "n25",
      "rule_id": "Z3c",
      "rule_name": "Int-Add-Def-SR",
      "level": "int"
    },
    {
      "id": "e14",
      "from": "n20",
      "to": "n23",
      "rule_id": "Z5",
      "rule_name": "Int-Add-Comm",
      "level": "int"
    }
  ],
  "proof_path": [
    "n20",
    "n23",
    "e14"
  ],
  "rules": [
    {
      "id": "L1",
      "name": "Modus-Ponens",
      "level": "logic",
      "pattern": "TRUE\\s*\u2227\\s*\\(TRUE\\s*\u2192\\s*(.+?)\\)",
      "replacement": "\\1",
      "elevated": false
    },
    {
      "id": "L2",
      "name": "And-Intro",
      "level": "logic",
      "pattern": "TRUE\\s*\u2227\\s*TRUE",
      "replacement": "TRUE",
      "elevated": false
    },
    {
      "id": "L3",
      "name": "Double-Negation",
      "level": "logic",
      "pattern": "\u00ac\u00ac(.+)",
      "replacement": "\\1",
      "elevated": false
    },
    {
      "id": "L4",
      "name": "Identity",
      "level": "logic",
      "pattern": "(.+)\\s*=\\s*\\1",
      "replacement": "TRUE",
      "elevated": false
    },
    {
      "id": "S1",
      "name": "Extensionality",
      "level": "set",
      "pattern": "\u2200x\\(x\u2208(.+?)\u2194x\u2208(.+?)\\)",
      "replacement": "\\1=\\2",
      "elevated": false
    },
    {
      "id": "S2",
      "name": "Empty-Set",
      "level": "set",
      "pattern": "x\\s*\u2208\\s*\u2205",
      "replacement": "FALSE",
      "elevated": false
    },
    {
      "id": "S3",
      "name": "Subset-Antisym",
      "level": "set",
      "pattern": "(.+?)\u2286(.+?)\u2227(.+?)\u2286(.+?)",
      "replacement": "\\1=\\3",
      "elevated": false
    },
    {
      "id": "N1",
      "name": "Peano-Zero",
      "level": "nat",
      "pattern": "Nat\\(0\\)",
      "replacement": "TRUE",
      "elevated": false
    },
    {
      "id": "N2",
      "name": "Add-Zero",
      "level": "nat",
      "pattern": "add\\((.+?),0\\)",
      "replacement": "\\1",
      "elevated": false
    },
    {
      "id": "N3",
      "name": "Add-Succ",
      "level": "nat",
      "pattern": "add\\((.+?),S\\((.+?)\\)\\)",
      "replacement": "S(add(\\1,\\2))",
      "elevated": false
    },
    {
      "id": "N4",
      "name": "Mul-Zero",
      "level": "nat",
      "pattern": "mul\\((.+?),0\\)",
      "replacement": "0",
      "elevated": false
    },
    {
      "id": "N5",
      "name": "Mul-Succ",
      "level": "nat",
      "pattern": "mul\\((.+?),S\\((.+?)\\)\\)",
      "replacement": "add(mul(\\1,\\2),\\1)",
      "elevated": false
    },
    {
      "id": "N6",
      "name": "Succ-Injective",
      "level": "nat",
      "pattern": "S\\((.+?)\\)=S\\((.+?)\\)",
      "replacement": "\\1=\\2",
      "elevated": false
    },
    {
      "id": "N7",
      "name": "Add-Zero-Left",
      "level": "nat",
      "pattern": "add\\(0,(.+?)\\)",
      "replacement": "\\1",
      "elevated": false
    },
    {
      "id": "Z1",
      "name": "Int-Zero",
      "level": "int",
      "pattern": "Zzero",
      "replacement": "(0,0)",
      "elevated": false
    },
    {
      "id": "Z2",
      "name": "Int-Succ-Embed",
      "level": "int",
      "pattern": "Zembed\\(S\\(([^)]+)\\)\\)",
      "replacement": "(S(\\1),0)",
      "elevated": false
    },
    {
      "id": "Z3",
      "name": "Int-Add-Def",
      "level": "int",
      "pattern": "Zadd\\(\\(([^(),]+),([^(),]+)\\),\\(([^(),]+),([^(),]+)\\)\\)",
      "replacement": "(add(\\1,\\3),add(\\2,\\4))",
      "elevated": false
    },
    {
      "id": "Z3b",
      "name": "Int-Add-Def-SL",
      "level": "int",
      "pattern": "Zadd\\(\\((S\\([^)]+\\)),([^()]+)\\),\\(([^(),]+),([^(),]+)\\)\\)",
      "replacement": "(add(\\1,\\3),add(\\2,\\4))",
      "elevated": false
    },
    {
      "id": "Z3c",
      "name": "Int-Add-Def-SR",
      "level": "int",
      "pattern": "Zadd\\(\\(([^(),]+),([^(),]+)\\),\\((S\\([^)]+\\)),([^()]+)\\)\\)",
      "replacement": "(add(\\1,\\3),add(\\2,\\4))",
      "elevated": false
    },
    {
      "id": "Z4",
      "name": "Int-Neg",
      "level": "int",
      "pattern": "Zneg\\(\\(([^(),]+),([^(),]+)\\)\\)",
      "replacement": "(\\2,\\1)",
      "elevated": false
    },
    {
      "id": "Z4b",
      "name": "Int-Neg-S",
      "level": "int",
      "pattern": "Zneg\\(\\((S\\([^)]+\\)),([^()]+)\\)\\)",
      "replacement": "(\\2,\\1)",
      "elevated": false
    },
    {
      "id": "Z5",
      "name": "Int-Add-Comm",
      "level": "int",
      "pattern": "Zadd\\((\\((?:[^()]*|\\((?:[^()]*|\\([^()]*\\))*\\))*\\)),(\\((?:[^()]*|\\((?:[^()]*|\\([^()]*\\))*\\))*\\))\\)",
      "replacement": "Zadd(\\2,\\1)",
      "elevated": false
    },
    {
      "id": "Z6",
      "name": "Int-Add-Assoc",
      "level": "int",
      "pattern": "Zadd\\(Zadd\\((.+?),(.+?)\\),(.+?)\\)",
      "replacement": "Zadd(\\1,Zadd(\\2,\\3))",
      "elevated": false
    },
    {
      "id": "T1",
      "name": "Modus-Ponens-Self",
      "level": "logic",
      "pattern": "TRUE\\ \u2227\\ \\(TRUE\\ \u2192\\ TRUE\\)",
      "replacement": "TRUE",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n1",
          "expr": "TRUE \u2227 (TRUE \u2192 TRUE)",
          "rule": null
        },
        {
          "node_id": "n2",
          "expr": "TRUE",
          "rule": "Modus-Ponens"
        }
      ]
    },
    {
      "id": "T2",
      "name": "Double-Negation-Elim",
      "level": "logic",
      "pattern": "\u00ac\u00acTRUE",
      "replacement": "TRUE",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n3",
          "expr": "\u00ac\u00acTRUE",
          "rule": null
        },
        {
          "node_id": "n2",
          "expr": "TRUE",
          "rule": "Double-Negation"
        }
      ]
    },
    {
      "id": "T3",
      "name": "Add-Zero-Zero",
      "level": "nat",
      "pattern": "add\\(0,0\\)",
      "replacement": "0",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n4",
          "expr": "add(0,0)",
          "rule": null
        },
        {
          "node_id": "n5",
          "expr": "0",
          "rule": "Add-Zero"
        }
      ]
    },
    {
      "id": "T4",
      "name": "Add-One-Zero",
      "level": "nat",
      "pattern": "add\\(S\\(0\\),0\\)",
      "replacement": "S(0)",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n6",
          "expr": "add(S(0),0)",
          "rule": null
        },
        {
          "node_id": "n7",
          "expr": "S(0)",
          "rule": "Add-Zero"
        }
      ]
    },
    {
      "id": "T5",
      "name": "Add-One-One",
      "level": "nat",
      "pattern": "add\\(S\\(0\\),S\\(0\\)\\)",
      "replacement": "S(S(0))",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n8",
          "expr": "add(S(0),S(0))",
          "rule": null
        },
        {
          "node_id": "n9",
          "expr": "S(add(S(0),0))",
          "rule": "Add-Succ"
        },
        {
          "node_id": "n10",
          "expr": "S(S(0))",
          "rule": "Add-Zero"
        }
      ]
    },
    {
      "id": "T6",
      "name": "Mul-One-Zero",
      "level": "nat",
      "pattern": "mul\\(S\\(0\\),0\\)",
      "replacement": "0",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n11",
          "expr": "mul(S(0),0)",
          "rule": null
        },
        {
          "node_id": "n5",
          "expr": "0",
          "rule": "Mul-Zero"
        }
      ]
    },
    {
      "id": "T7",
      "name": "Mul-Zero-One-Expand",
      "level": "nat",
      "pattern": "mul\\(0,S\\(0\\)\\)",
      "replacement": "add(mul(0,0),0)",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n12",
          "expr": "mul(0,S(0))",
          "rule": null
        },
        {
          "node_id": "n13",
          "expr": "add(mul(0,0),0)",
          "rule": "Mul-Succ"
        }
      ]
    },
    {
      "id": "T8",
      "name": "Add-Right-Identity[Base]",
      "level": "nat",
      "pattern": "add\\(0,0\\)",
      "replacement": "0",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n4",
          "expr": "add(0,0)",
          "rule": null
        },
        {
          "node_id": "n5",
          "expr": "0",
          "rule": "Add-Zero"
        }
      ]
    },
    {
      "id": "T9",
      "name": "Add-Right-Identity[Step]",
      "level": "nat",
      "pattern": "add\\(S\\(0\\),0\\)",
      "replacement": "S(0)",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n6",
          "expr": "add(S(0),0)",
          "rule": null
        },
        {
          "node_id": "n7",
          "expr": "S(0)",
          "rule": "Add-Zero"
        }
      ]
    },
    {
      "id": "IND10",
      "name": "Add-Right-Identity",
      "level": "nat",
      "pattern": "add\\((.+?),0\\)",
      "replacement": "\\1",
      "elevated": true,
      "inductive": true,
      "source_proof": [
        {
          "type": "base",
          "rule_id": "T8"
        },
        {
          "type": "step",
          "rule_id": "T9"
        }
      ]
    },
    {
      "id": "T11",
      "name": "Int-Zero-Is-00",
      "level": "int",
      "pattern": "Zzero",
      "replacement": "(0,0)",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n14",
          "expr": "Zzero",
          "rule": null
        },
        {
          "node_id": "n15",
          "expr": "(0,0)",
          "rule": "Int-Zero"
        }
      ]
    },
    {
      "id": "T12",
      "name": "Int-One-Embed",
      "level": "int",
      "pattern": "Zembed\\(S\\(0\\)\\)",
      "replacement": "(S(0),0)",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n16",
          "expr": "Zembed(S(0))",
          "rule": null
        },
        {
          "node_id": "n17",
          "expr": "(S(0),0)",
          "rule": "Int-Succ-Embed"
        }
      ]
    },
    {
      "id": "T13",
      "name": "Int-Neg-One",
      "level": "int",
      "pattern": "Zneg\\(\\(S\\(0\\),0\\)\\)",
      "replacement": "(0,S(0))",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n18",
          "expr": "Zneg((S(0),0))",
          "rule": null
        },
        {
          "node_id": "n19",
          "expr": "(0,S(0))",
          "rule": "Int-Neg-S"
        }
      ]
    },
    {
      "id": "T14",
      "name": "Int-1+0-Expand",
      "level": "int",
      "pattern": "Zadd\\(\\(S\\(0\\),0\\),\\(0,0\\)\\)",
      "replacement": "(add(S(0),0),add(0,0))",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n20",
          "expr": "Zadd((S(0),0),(0,0))",
          "rule": null
        },
        {
          "node_id": "n22",
          "expr": "(add(S(0),0),add(0,0))",
          "rule": "Int-Add-Def-SL"
        }
      ]
    },
    {
      "id": "T15",
      "name": "Int-0+1-Expand",
      "level": "int",
      "pattern": "Zadd\\(\\(0,0\\),\\(S\\(0\\),0\\)\\)",
      "replacement": "(add(0,S(0)),add(0,0))",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n23",
          "expr": "Zadd((0,0),(S(0),0))",
          "rule": null
        },
        {
          "node_id": "n25",
          "expr": "(add(0,S(0)),add(0,0))",
          "rule": "Int-Add-Def-SR"
        }
      ]
    },
    {
      "id": "T16",
      "name": "Int-Add-Comm-1+0",
      "level": "int",
      "pattern": "Zadd\\(\\(S\\(0\\),0\\),\\(0,0\\)\\)",
      "replacement": "Zadd((0,0),(S(0),0))",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n20",
          "expr": "Zadd((S(0),0),(0,0))",
          "rule": null
        },
        {
          "node_id": "n23",
          "expr": "Zadd((0,0),(S(0),0))",
          "rule": "Int-Add-Comm"
        }
      ]
    },
    {
      "id": "T17",
      "name": "Int-Add-Commutativity[Base]",
      "level": "int",
      "pattern": "Zadd\\(\\(S\\(0\\),0\\),\\(0,0\\)\\)",
      "replacement": "Zadd((0,0),(S(0),0))",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n20",
          "expr": "Zadd((S(0),0),(0,0))",
          "rule": null
        },
        {
          "node_id": "n23",
          "expr": "Zadd((0,0),(S(0),0))",
          "rule": "Int-Add-Comm"
        }
      ]
    },
    {
      "id": "T18",
      "name": "Int-Add-Commutativity[Step]",
      "level": "int",
      "pattern": "Zadd\\(\\(S\\(0\\),0\\),\\(0,0\\)\\)",
      "replacement": "Zadd((0,0),(S(0),0))",
      "elevated": true,
      "source_proof": [
        {
          "node_id": "n20",
          "expr": "Zadd((S(0),0),(0,0))",
          "rule": null
        },
        {
          "node_id": "n23",
          "expr": "Zadd((0,0),(S(0),0))",
          "rule": "Int-Add-Comm"
        }
      ]
    },
    {
      "id": "IND19",
      "name": "Int-Add-Commutativity",
      "level": "int",
      "pattern": "Zadd\\((\\((?:[^()]*|\\((?:[^()]*|\\([^()]*\\))*\\))*\\)),(\\((?:[^()]*|\\((?:[^()]*|\\([^()]*\\))*\\))*\\))\\)",
      "replacement": "Zadd(\\2,\\1)",
      "elevated": true,
      "inductive": true,
      "source_proof": [
        {
          "type": "base",
          "rule_id": "T17"
        },
        {
          "type": "step",
          "rule_id": "T18"
        }
      ]
    }
  ]
};
