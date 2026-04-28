from apps.zfc_zoom_lens.ATTMPT3.logic import LogicEngine, TableVisualizer, generate, Colors
from predicate import FOL_Syntax

"""
SET THEORY MODULE (ZFC-grounded)
=================================
PHILOSOPHY:
  - No Python sets, lists, tuples, or dicts are used to represent sets.
  - Everything is a STRING. Sets are named strings. Relations are strings.
  - Transformation pipeline:
      ZFC String  →  Predicate String (FOL)  →  Propositional Grounding  →  Truth Table

PIPELINE:
  1. ZFCString:    Human-readable set-theoretic expression ("A ⊆ B")
  2. to_predicate: Returns a First-Order Logic string using ∀/∃/predicates
  3. to_prop:      Grounds the FOL formula into propositional variables
                   (e.g., membership becomes a boolean variable: "x∈A")
  4. to_table:     Evaluates the grounded formula as a truth table via LogicEngine

ZFC AXIOMS IMPLEMENTED (as string transformations):
  - Extensionality   : A = B  ↔  (∀x: x∈A ↔ x∈B)
  - Subset           : A ⊆ B  ↔  (∀x: x∈A ⇒ x∈B)
  - Union            : x∈(A∪B) ↔ x∈A ∨ x∈B
  - Intersection     : x∈(A∩B) ↔ x∈A ∧ x∈B
  - Difference       : x∈(A∖B) ↔ x∈A ∧ ¬x∈B
  - Empty Set        : ∀x: x∉∅  (no element is in the empty set)
  - Pairing          : ∀x: x∈{A,B} ↔ x=A ∨ x=B
  - Power Set        : x∈P(A)  ↔  x⊆A
"""


# ─────────────────────────────────────────────
#  LAYER 1: ZFC String Registry
# ─────────────────────────────────────────────

class ZFCString:
    """
    Holds a raw set-theoretic expression as a string and knows how to
    transform it toward predicate logic and propositional grounding.
    """

    # ZFC Axiom templates: name → (zfc_string, predicate_string, description)
    AXIOMS = {
        "extensionality": (
            "A = B",
            "∀x(x∈A ⇔ x∈B)",
            "Two sets are equal iff they have the same members"
        ),
        "subset": (
            "A ⊆ B",
            "∀x(x∈A ⇒ x∈B)",
            "A is a subset of B iff every member of A is a member of B"
        ),
        "union": (
            "x ∈ (A ∪ B)",
            "x∈A ∨ x∈B",
            "x is in the union of A and B iff x is in A or x is in B"
        ),
        "intersection": (
            "x ∈ (A ∩ B)",
            "x∈A ∧ x∈B",
            "x is in the intersection iff x is in both A and B"
        ),
        "difference": (
            "x ∈ (A ∖ B)",
            "x∈A ∧ ¬(x∈B)",
            "x is in A minus B iff x is in A and not in B"
        ),
        "empty_set": (
            "∀x: x ∉ ∅",
            "¬(x∈∅)",
            "Nothing is a member of the empty set"
        ),
        "power_set": (
            "x ∈ P(A)",
            "∀z(z∈x ⇒ z∈A)",
            "x is in the power set of A iff x is a subset of A"
        ),
    }

    # Set operation string templates
    OPERATIONS = {
        "union":        lambda a, b: f"({a} ∪ {b})",
        "intersection": lambda a, b: f"({a} ∩ {b})",
        "difference":   lambda a, b: f"({a} ∖ {b})",
        "subset":       lambda a, b: f"{a} ⊆ {b}",
        "equality":     lambda a, b: f"{a} = {b}",
        "membership":   lambda x, s: f"{x} ∈ {s}",
        "power_set":    lambda a, _=None: f"P({a})",
        "complement":   lambda a, _=None: f"∁({a})",
    }

    def __init__(self, expression: str):
        self.expression = expression

    def __str__(self):
        return self.expression

    def __repr__(self):
        return f"ZFCString({self.expression!r})"

    @classmethod
    def op(cls, operation: str, *args) -> "ZFCString":
        """Construct a ZFC expression string from an operation name and set-name strings."""
        if operation not in cls.OPERATIONS:
            return cls(f"Unknown_Op({operation}, {args})")
        return cls(cls.OPERATIONS[operation](*args))

    @classmethod
    def axiom(cls, name: str) -> "ZFCString":
        """Return the ZFC string for a named axiom."""
        if name not in cls.AXIOMS:
            return cls(f"Unknown_Axiom({name})")
        return cls(cls.AXIOMS[name][0])


# ─────────────────────────────────────────────
#  LAYER 2: Predicate String Transformer
# ─────────────────────────────────────────────

class PredicateTransformer:
    """
    Transforms ZFC strings into First-Order Logic predicate strings,
    using FOL_Syntax from predicate.py.
    """

    def __init__(self):
        self.fol = FOL_Syntax()

    def transform(self, zfc_string: str, axiom_name: str = None) -> str:
        """
        Given a ZFC expression string, return its FOL predicate string.
        If axiom_name is given, uses the stored axiom template directly.
        Otherwise attempts a pattern-based transform.

        TERM vs STATEMENT distinction:
          - A bare set term like "(A ∪ B)" has no truth value on its own.
            We wrap it in a membership context: ∀x(x∈result ↔ definition).
          - A membership statement like "x ∈ A" is already a proposition.
          - A relation like "A ⊆ B" or "A = B" quantifies over members.
          - A power set term P(A) lifts to ∀x(x ∈ P(A) ↔ x ⊆ A).
        """
        if axiom_name and axiom_name in ZFCString.AXIOMS:
            return ZFCString.AXIOMS[axiom_name][1]

        # Normalize spacing around ∈ so "x ∈ A" and "x∈A" both parse
        s = zfc_string.strip().replace(" ∈ ", "∈").replace(" ∉ ", "∉")

        # ── MEMBERSHIP STATEMENTS: something∈something ──────────────────

        # x∈(A ∪ B)  →  x∈A ∨ x∈B
        if "∈" in s and "∪" in s:
            parts = self._extract_binary(s, "∪")
            if parts:
                x, a, b = parts
                return self.fol.apply_op("∨", f"{x}∈{a}", f"{x}∈{b}")

        # x∈(A ∩ B)  →  x∈A ∧ x∈B
        if "∈" in s and "∩" in s:
            parts = self._extract_binary(s, "∩")
            if parts:
                x, a, b = parts
                return self.fol.apply_op("∧", f"{x}∈{a}", f"{x}∈{b}")

        # x∈(A ∖ B)  →  x∈A ∧ ¬(x∈B)
        if "∈" in s and "∖" in s:
            parts = self._extract_binary(s, "∖")
            if parts:
                x, a, b = parts
                return self.fol.apply_op("∧", f"{x}∈{a}", f"¬({x}∈{b})")

        # x∈A  (simple membership, already a proposition — return as-is)
        if "∈" in s and "∪" not in s and "∩" not in s and "∖" not in s:
            lhs, rhs = [p.strip() for p in s.split("∈", 1)]
            # x∈P(A)  →  ∀z(z∈x ⇒ z∈A)  [x is a subset of A]
            if rhs.startswith("P(") and rhs.endswith(")"):
                a = rhs[2:-1]
                inner = self.fol.apply_op("⇒", f"z∈{lhs}", f"z∈{a}")
                return self.fol.forall("z", inner)
            # Plain x∈A  →  just the predicate string, it is already atomic
            return f"{lhs}∈{rhs}"

        # ∉ (non-membership)  →  ¬(x∈A)
        if "∉" in s:
            lhs, rhs = [p.strip() for p in s.split("∉", 1)]
            return f"¬({lhs}∈{rhs})"

        # ── RELATION STATEMENTS ──────────────────────────────────────────

        # A ⊆ B  →  ∀x(x∈A ⇒ x∈B)
        if "⊆" in s:
            a, b = [p.strip() for p in s.split("⊆", 1)]
            inner = self.fol.apply_op("⇒", f"x∈{a}", f"x∈{b}")
            return self.fol.forall("x", inner)

        # A = B  →  ∀x(x∈A ⇔ x∈B)
        if "=" in s and "⇔" not in s and "⇒" not in s:
            a, b = [p.strip() for p in s.split("=", 1)]
            inner = self.fol.apply_op("⇔", f"x∈{a}", f"x∈{b}")
            return self.fol.forall("x", inner)

        # ── BARE SET TERMS (no relation — wrap in membership context) ────

        # (A ∪ B)  →  ∀x(x∈(A∪B) ⇔ x∈A ∨ x∈B)
        if "∪" in s:
            a, b = [p.strip() for p in s.strip("()").split("∪", 1)]
            lhs = self.fol.apply_op("⇔", f"x∈({a}∪{b})",
                                         self.fol.apply_op("∨", f"x∈{a}", f"x∈{b}"))
            return self.fol.forall("x", lhs)

        # (A ∩ B)  →  ∀x(x∈(A∩B) ⇔ x∈A ∧ x∈B)
        if "∩" in s:
            a, b = [p.strip() for p in s.strip("()").split("∩", 1)]
            lhs = self.fol.apply_op("⇔", f"x∈({a}∩{b})",
                                         self.fol.apply_op("∧", f"x∈{a}", f"x∈{b}"))
            return self.fol.forall("x", lhs)

        # (A ∖ B)  →  ∀x(x∈(A∖B) ⇔ x∈A ∧ ¬(x∈B))
        if "∖" in s:
            a, b = [p.strip() for p in s.strip("()").split("∖", 1)]
            lhs = self.fol.apply_op("⇔", f"x∈({a}∖{b})",
                                         self.fol.apply_op("∧", f"x∈{a}", f"¬(x∈{b})"))
            return self.fol.forall("x", lhs)

        # P(A)  →  ∀x(x∈P(A) ⇔ x⊆A)
        if s.startswith("P(") and s.endswith(")"):
            a = s[2:-1]
            inner = self.fol.apply_op("⇔", f"x∈P({a})", f"x⊆{a}")
            return self.fol.forall("x", inner)

        # ∁(A)  →  ∀x(x∈∁(A) ⇔ ¬(x∈A))
        if s.startswith("∁(") and s.endswith(")"):
            a = s[2:-1]
            inner = self.fol.apply_op("⇔", f"x∈∁({a})", f"¬(x∈{a})")
            return self.fol.forall("x", inner)

        return f"[untransformed: {s}]"

    def _extract_binary(self, s: str, op: str):
        """
        Parse:  'x∈(A OP B)'  →  (x, A, B)
        Handles both 'x∈(A OP B)' and 'x ∈ (A OP B)' after normalization.
        """
        if "∈" in s:
            lhs, rhs = s.split("∈", 1)
            x = lhs.strip()
            rhs = rhs.strip().strip("()")
            if op in rhs:
                a, b = [p.strip() for p in rhs.split(op, 1)]
                return x, a, b
        return None


# ─────────────────────────────────────────────
#  LAYER 3: Propositional Grounder
# ─────────────────────────────────────────────

class PropositionalGrounder:
    """
    Takes a predicate string and grounds it into a propositional formula.

    Since we have no actual sets or elements, we treat membership claims
    as propositional variables:
        "x∈A" → boolean variable P
        "x∈B" → boolean variable Q

    This lets us feed the grounded formula into LogicEngine for truth tables.

    The grounding reveals the LOGICAL STRUCTURE of the set operation —
    e.g., subset (A⊆B) grounds to P⇒Q, which is contingent (not a tautology).
    The ZFC *axiom* that defines subset IS a tautology: it says the definition
    always holds by convention.
    """

    # Maps predicate strings to propositional groundings:
    # (variables, label, expression_func)
    GROUNDINGS = {

        # A ⊆ B definition: x∈A ⇒ x∈B
        # (contingent — whether a⊆b depends on what A and B contain)
        "subset_def": (
            ["P", "Q"],
            "P ⇒ Q  [x∈A ⇒ x∈B]",
            lambda v, eng: eng.evaluate("⇒", v["P"], v["Q"])
        ),

        # Extensionality: x∈A ⇔ x∈B (the biconditional of membership)
        "extensionality_def": (
            ["P", "Q"],
            "P ⇔ Q  [x∈A ⇔ x∈B]",
            lambda v, eng: eng.evaluate("⇔", v["P"], v["Q"])
        ),

        # Union: x∈(A∪B) ↔ (x∈A ∨ x∈B)
        # This is a tautology when we treat "x∈(A∪B)" as exactly "x∈A ∨ x∈B"
        # Ground it as: (P ∨ Q) ⇔ (P ∨ Q)  — trivially tautological
        # More interesting: ground the *meaning* as P ∨ Q and show the table
        "union_def": (
            ["P", "Q"],
            "(P ∨ Q)  [x∈A ∨ x∈B]",
            lambda v, eng: eng.evaluate("∨", v["P"], v["Q"])
        ),

        # Intersection: x∈A ∧ x∈B
        "intersection_def": (
            ["P", "Q"],
            "(P ∧ Q)  [x∈A ∧ x∈B]",
            lambda v, eng: eng.evaluate("∧", v["P"], v["Q"])
        ),

        # Difference: x∈A ∧ ¬(x∈B)
        "difference_def": (
            ["P", "Q"],
            "(P ∧ ¬Q)  [x∈A ∧ ¬(x∈B)]",
            lambda v, eng: eng.evaluate("∧", v["P"], not v["Q"])
        ),

        # Subset is transitive: (A⊆B ∧ B⊆C) ⇒ A⊆C
        # Ground: (P⇒Q) ∧ (Q⇒R) ⇒ (P⇒R) — this IS a tautology
        "subset_transitivity": (
            ["P", "Q", "R"],
            "((P⇒Q) ∧ (Q⇒R)) ⇒ (P⇒R)  [A⊆B ∧ B⊆C ⇒ A⊆C]",
            lambda v, eng: eng.evaluate(
                "⇒",
                eng.evaluate("∧", eng.evaluate("⇒", v["P"], v["Q"]),
                                   eng.evaluate("⇒", v["Q"], v["R"])),
                eng.evaluate("⇒", v["P"], v["R"])
            )
        ),

        # Subset antisymmetry: (A⊆B ∧ B⊆A) ⇒ A=B
        # Ground: (P⇒Q) ∧ (Q⇒P) ⇒ (P⇔Q) — tautology
        "subset_antisymmetry": (
            ["P", "Q"],
            "((P⇒Q) ∧ (Q⇒P)) ⇒ (P⇔Q)  [A⊆B ∧ B⊆A ⇒ A=B]",
            lambda v, eng: eng.evaluate(
                "⇒",
                eng.evaluate("∧", eng.evaluate("⇒", v["P"], v["Q"]),
                                   eng.evaluate("⇒", v["Q"], v["P"])),
                eng.evaluate("⇔", v["P"], v["Q"])
            )
        ),

        # DeMorgan for sets: x∈∁(A∪B) ↔ x∉A ∧ x∉B
        # Ground: ¬(P∨Q) ⇔ (¬P ∧ ¬Q) — tautology
        "demorgan_union": (
            ["P", "Q"],
            "¬(P∨Q) ⇔ (¬P ∧ ¬Q)  [∁(A∪B) = ∁A ∩ ∁B]",
            lambda v, eng: eng.evaluate(
                "⇔",
                not eng.evaluate("∨", v["P"], v["Q"]),
                eng.evaluate("∧", not v["P"], not v["Q"])
            )
        ),

        # DeMorgan: ¬(P∧Q) ⇔ (¬P ∨ ¬Q) — tautology
        "demorgan_intersection": (
            ["P", "Q"],
            "¬(P∧Q) ⇔ (¬P ∨ ¬Q)  [∁(A∩B) = ∁A ∪ ∁B]",
            lambda v, eng: eng.evaluate(
                "⇔",
                not eng.evaluate("∧", v["P"], v["Q"]),
                eng.evaluate("∨", not v["P"], not v["Q"])
            )
        ),

        # Distributivity: A ∩ (B ∪ C) = (A∩B) ∪ (A∩C)
        # P ∧ (Q ∨ R) ⇔ (P ∧ Q) ∨ (P ∧ R) — tautology
        "distributivity": (
            ["P", "Q", "R"],
            "P∧(Q∨R) ⇔ (P∧Q)∨(P∧R)  [A∩(B∪C) = (A∩B)∪(A∩C)]",
            lambda v, eng: eng.evaluate(
                "⇔",
                eng.evaluate("∧", v["P"], eng.evaluate("∨", v["Q"], v["R"])),
                eng.evaluate("∨", eng.evaluate("∧", v["P"], v["Q"]),
                                  eng.evaluate("∧", v["P"], v["R"]))
            )
        ),
    }

    def ground(self, grounding_key: str):
        """Return (variables, label, expression_func) for a named grounding."""
        if grounding_key not in self.GROUNDINGS:
            raise KeyError(f"No grounding found for '{grounding_key}'")
        return self.GROUNDINGS[grounding_key]


# ─────────────────────────────────────────────
#  LAYER 4: Pipeline Orchestrator
# ─────────────────────────────────────────────

class SetPipeline:
    """
    Orchestrates the full cascade:
      ZFC String → Predicate String → Propositional Grounding → Truth Table
    """

    def __init__(self):
        self.transformer = PredicateTransformer()
        self.grounder = PropositionalGrounder()

    def run(self, zfc_expr: str, grounding_key: str, axiom_name: str = None):
        """
        Full pipeline run for a given ZFC expression string.
        
        zfc_expr:      The raw set-theoretic string (e.g. "A ⊆ B")
        grounding_key: Which propositional grounding to use (see GROUNDINGS)
        axiom_name:    Optional axiom name for direct predicate lookup
        """
        # ── Step 1: ZFC String
        zfc = ZFCString(zfc_expr)
        print(f"\n{'═'*60}")
        print(f"{Colors.BOLD}{'ZFC EXPRESSION':>20}:{Colors.RESET}  {Colors.CYAN}{zfc}{Colors.RESET}")

        # ── Step 2: Predicate String
        predicate_str = self.transformer.transform(str(zfc), axiom_name)
        print(f"{Colors.BOLD}{'FOL PREDICATE':>20}:{Colors.RESET}  {Colors.YELLOW}{predicate_str}{Colors.RESET}")

        # ── Step 3: Propositional Grounding
        variables, label, expr_func = self.grounder.ground(grounding_key)
        print(f"{Colors.BOLD}{'PROP. GROUNDING':>20}:{Colors.RESET}  {Colors.GREEN}{label}{Colors.RESET}")
        print(f"{Colors.BOLD}{'WHERE':>20}:{Colors.RESET}  P = x∈A,  Q = x∈B  (membership as boolean)")

        # ── Step 4: Truth Table
        print(f"\n{Colors.BOLD}TRUTH TABLE:{Colors.RESET}")
        generate(variables, expr_func, label)

    def show_axiom(self, name: str):
        """Display a ZFC axiom with its predicate form and description."""
        if name not in ZFCString.AXIOMS:
            print(f"Unknown axiom: {name}")
            return
        zfc_str, pred_str, desc = ZFCString.AXIOMS[name]
        print(f"\n{Colors.BOLD}AXIOM [{name}]{Colors.RESET}")
        print(f"  {Colors.CYAN}ZFC    :{Colors.RESET} {zfc_str}")
        print(f"  {Colors.YELLOW}FOL    :{Colors.RESET} {pred_str}")
        print(f"  {Colors.GREEN}Meaning:{Colors.RESET} {desc}")

    def compose(self, operation: str, *args) -> str:
        """Build a ZFC expression string using an operation name."""
        return str(ZFCString.op(operation, *args))


# ─────────────────────────────────────────────
#  DEMO
# ─────────────────────────────────────────────

if __name__ == "__main__":
    pipe = SetPipeline()

    print(f"\n{Colors.BOLD}{'═'*60}")
    print("  SET THEORY PIPELINE: ZFC → PREDICATE → TRUTH TABLE")
    print(f"{'═'*60}{Colors.RESET}")

    # ── Show all ZFC axioms (string layer only)
    print(f"\n{Colors.BOLD}[ ZFC AXIOMS — STRING REGISTRY ]{Colors.RESET}")
    for name in ZFCString.AXIOMS:
        pipe.show_axiom(name)

    # ── Demonstrate string composition
    print(f"\n{Colors.BOLD}[ STRING COMPOSITION EXAMPLES ]{Colors.RESET}")
    exprs = [
        pipe.compose("subset",       "A", "B"),
        pipe.compose("union",        "A", "B"),
        pipe.compose("intersection", "A", "B"),
        pipe.compose("difference",   "A", "B"),
        pipe.compose("membership",   "x", "A"),
        pipe.compose("power_set",    "A"),
        pipe.compose("equality",     "A", "B"),
    ]
    for e in exprs:
        pred = pipe.transformer.transform(e)
        print(f"  {Colors.CYAN}{e:20}{Colors.RESET}  →  {Colors.YELLOW}{pred}{Colors.RESET}")

    # ── Full pipeline runs (ZFC → Predicate → Truth Table)
    print(f"\n{Colors.BOLD}[ FULL PIPELINE RUNS ]{Colors.RESET}")

    pipe.run("A ⊆ B",         "subset_def",          "subset")
    pipe.run("A = B",         "extensionality_def",  "extensionality")
    pipe.run("x ∈ (A ∪ B)",  "union_def",            "union")
    pipe.run("x ∈ (A ∩ B)",  "intersection_def",     "intersection")
    pipe.run("x ∈ (A ∖ B)",  "difference_def",       "difference")

    print(f"\n{Colors.BOLD}[ ZFC THEOREMS — SHOULD BE TAUTOLOGIES ]{Colors.RESET}")
    pipe.run("A ⊆ B ∧ B ⊆ C ⇒ A ⊆ C", "subset_transitivity")
    pipe.run("A ⊆ B ∧ B ⊆ A ⇒ A = B", "subset_antisymmetry")
    pipe.run("∁(A ∪ B) = ∁A ∩ ∁B",    "demorgan_union")
    pipe.run("∁(A ∩ B) = ∁A ∪ ∁B",    "demorgan_intersection")
    pipe.run("A ∩ (B ∪ C) = (A∩B) ∪ (A∩C)", "distributivity")