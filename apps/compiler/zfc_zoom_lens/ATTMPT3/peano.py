from apps.zfc_zoom_lens.ATTMPT3.logic import LogicEngine, generate, Colors
from predicate import FOL_Syntax

"""
PEANO ARITHMETIC MODULE
========================
PHILOSOPHY:
  - No Python integers are used to *represent* numbers. Numbers are STRINGS.
  - "0", "S(0)", "S(S(0))" etc. are the only numerals.
  - numeral(n) builds the string form of any natural number.
  - Arithmetic operations (add, mul) are string rewrite rules, not computation.

PIPELINE (mirrors set.py):
  Peano String  →  Predicate String (FOL)  →  Propositional Grounding  →  Truth Table

PEANO AXIOMS IMPLEMENTED:
  P1  : 0 ∈ ℕ                                    (zero exists)
  P2  : ∀x: S(x) ∈ ℕ                             (successors exist)
  P3  : ∀x: S(x) ≠ 0                             (zero is not a successor)
  P4  : ∀x∀y: S(x) = S(y) ⇒ x = y               (successor is injective)
  P5  : (P(0) ∧ ∀x(P(x) ⇒ P(S(x)))) ⇒ ∀xP(x)   (induction)

ARITHMETIC DEFINITIONS (as string rewrite rules):
  add(m, 0)    = m
  add(m, S(n)) = S(add(m, n))
  mul(m, 0)    = 0
  mul(m, S(n)) = add(mul(m, n), m)
"""


# ─────────────────────────────────────────────
#  LAYER 1: Peano String Constructors
# ─────────────────────────────────────────────

class PeanoString:
    """
    Builds and manipulates Peano expressions as pure strings.
    Zero is "0". Successor of x is "S(x)". That's the whole alphabet.
    """

    # ── Numerals ──────────────────────────────

    @staticmethod
    def zero() -> str:
        return "0"

    @staticmethod
    def succ(n: str) -> str:
        return f"S({n})"

    @staticmethod
    def numeral(n: int) -> str:
        """Build the Peano string for a non-negative integer."""
        s = "0"
        for _ in range(n):
            s = PeanoString.succ(s)
        return s

    # ── Arithmetic (string rewrite rules) ─────

    @staticmethod
    def add(m: str, n: str, symbolic: bool = False) -> str:
        """
        Two modes:
          symbolic=False  (default) — actually rewrites numerals.
                          add("S(S(0))", "S(0)") → "S(S(S(0)))"
                          Used in numeral_arithmetic() for computation.

          symbolic=True   — returns the opaque term string without reducing.
                          add("m", "S(n)", symbolic=True) → "add(m, S(n))"
                          Used in proofs so the unreduced LHS stays visible.
        """
        if symbolic:
            return f"add({m}, {n})"
        if n == "0":
            return m
        if n.startswith("S(") and n.endswith(")"):
            inner = n[2:-1]
            return PeanoString.succ(PeanoString.add(m, inner))
        return f"add({m}, {n})"   # symbolic fallback for variables

    @staticmethod
    def mul(m: str, n: str, symbolic: bool = False) -> str:
        """
        symbolic=True  — returns "mul(m, n)" without reducing.
        symbolic=False — rewrites numerals via repeated addition.
        """
        if symbolic:
            return f"mul({m}, {n})"
        if n == "0":
            return "0"
        if n.startswith("S(") and n.endswith(")"):
            inner = n[2:-1]
            return PeanoString.add(PeanoString.mul(m, inner), m)
        return f"mul({m}, {n})"   # symbolic fallback

    # ── Relation strings ──────────────────────

    @staticmethod
    def eq(m: str, n: str) -> str:
        return f"{m} = {n}"

    @staticmethod
    def neq(m: str, n: str) -> str:
        return f"{m} ≠ {n}"

    @staticmethod
    def lt(m: str, n: str) -> str:
        return f"{m} < {n}"

    # ── Axiom string registry ─────────────────

    AXIOMS = {
        "P1_zero_exists": (
            "0 ∈ ℕ",
            "∃x(x = 0)",
            "Zero is a natural number"
        ),
        "P2_succ_exists": (
            "∀x: S(x) ∈ ℕ",
            "∀x(∃y(y = S(x)))",
            "Every natural number has a successor"
        ),
        "P3_zero_not_succ": (
            "∀x: S(x) ≠ 0",
            "∀x(¬(S(x) = 0))",
            "Zero is not the successor of any number"
        ),
        "P4_succ_injective": (
            "∀x∀y: S(x) = S(y) ⇒ x = y",
            "∀x∀y(S(x) = S(y) ⇒ x = y)",
            "Successor is injective: equal successors imply equal origins"
        ),
        "P5_induction": (
            "(P(0) ∧ ∀x(P(x) ⇒ P(S(x)))) ⇒ ∀xP(x)",
            "(P(0) ∧ ∀x(P(x) ⇒ P(S(x)))) ⇒ ∀xP(x)",
            "If a property holds for 0 and is hereditary, it holds for all ℕ"
        ),
        "add_base": (
            "add(m, 0) = m",
            "∀m(add(m, 0) = m)",
            "Adding zero changes nothing"
        ),
        "add_step": (
            "add(m, S(n)) = S(add(m, n))",
            "∀m∀n(add(m, S(n)) = S(add(m, n)))",
            "Addition steps through successors"
        ),
        "mul_base": (
            "mul(m, 0) = 0",
            "∀m(mul(m, 0) = 0)",
            "Multiplying by zero gives zero"
        ),
        "mul_step": (
            "mul(m, S(n)) = add(mul(m, n), m)",
            "∀m∀n(mul(m, S(n)) = add(mul(m, n), m))",
            "Multiplication steps through repeated addition"
        ),
    }


# ─────────────────────────────────────────────
#  LAYER 2: Predicate Transformer
# ─────────────────────────────────────────────

class PeanoTransformer:
    """
    Transforms Peano expression strings into FOL predicate strings.
    Variables in Peano are still strings: "x", "y", "S(x)" etc.
    """

    def __init__(self):
        self.fol = FOL_Syntax()

    def transform(self, expr: str, axiom_name: str = None) -> str:
        """
        Peano string  →  FOL predicate string.
        """
        if axiom_name and axiom_name in PeanoString.AXIOMS:
            return PeanoString.AXIOMS[axiom_name][1]

        s = expr.strip()

        # S(x) ≠ 0  →  ¬(S(x) = 0)
        if "≠" in s:
            lhs, rhs = [p.strip() for p in s.split("≠", 1)]
            return f"¬({lhs} = {rhs})"

        # m = n  →  already a predicate
        if "=" in s and "⇒" not in s and "⇔" not in s:
            return s

        # add(m, 0) = m  →  ∀m(add(m, 0) = m)
        if s.startswith("add(") or s.startswith("mul("):
            return self.fol.forall("m", self.fol.forall("n", s))

        # S(x) ∈ ℕ  →  ∀x(∃y(y = S(x)))
        if "∈ ℕ" in s:
            term = s.replace("∈ ℕ", "").strip()
            if term.startswith("S("):
                var = term[2:-1]
                return self.fol.forall(var, self.fol.exists("y", f"y = {term}"))
            return self.fol.exists("x", f"x = {term}")

        # Induction schema string passed through as-is (it's already FOL)
        if "P(0)" in s:
            return s

        return f"[untransformed: {s}]"


# ─────────────────────────────────────────────
#  LAYER 3: Propositional Grounder
# ─────────────────────────────────────────────

class PeanoGrounder:
    """
    Grounds Peano/FOL strings into propositional variables for truth tables.

    The grounding key insight:
      Equality claims become boolean variables.
        "S(x) = S(y)"  →  P
        "x = y"        →  Q
      Then P4 injectivity becomes P ⇒ Q — contingent.
      The *axiom* that this always holds is verified as a tautology.

    Induction grounds to modus ponens:
      P(0) = P,  (P(x)⇒P(S(x))) = P⇒Q,  conclusion P(all) = Q
      Schema: (P ∧ (P⇒Q)) ⇒ Q  — tautology (modus ponens).
    """

    GROUNDINGS = {

        # P3: S(x) ≠ 0 — zero is not a successor
        # Ground as: ¬P  where P = "S(x) = 0"
        # As a statement about a specific x: contingent (we don't know P)
        # As the axiom (always ¬P for any x): vacuously modeled as ¬P
        "P3_zero_not_succ": (
            ["P"],
            "¬P  [S(x) ≠ 0, where P = 'S(x) = 0']",
            lambda v, eng: eng.evaluate("¬", v["P"])
        ),

        # P4: S(x)=S(y) ⇒ x=y — injectivity
        # P = "S(x)=S(y)",  Q = "x=y"
        # Contingent as a claim; the axiom says it always holds
        "P4_succ_injective": (
            ["P", "Q"],
            "P ⇒ Q  [S(x)=S(y) ⇒ x=y]",
            lambda v, eng: eng.evaluate("⇒", v["P"], v["Q"])
        ),

        # P4 as axiom: the injective law itself is a tautology
        # Modeled as: (P⇒Q) ⇔ (P⇒Q) — trivial, so instead we show
        # the *contrapositive equivalence*: (P⇒Q) ⇔ (¬Q⇒¬P)
        "P4_contrapositive": (
            ["P", "Q"],
            "(P⇒Q) ⇔ (¬Q⇒¬P)  [injectivity ↔ contrapositive]",
            lambda v, eng: eng.evaluate(
                "⇔",
                eng.evaluate("⇒", v["P"], v["Q"]),
                eng.evaluate("⇒", not v["Q"], not v["P"])
            )
        ),

        # P5: Induction = Modus Ponens lifted to ℕ
        # P = P(0) holds,  Q = P(x)⇒P(S(x)) holds,  R = P(all x) holds
        # (P ∧ (P⇒R)) ⇒ R  — but we also need the hereditary step Q
        # Full schema: (P ∧ Q) ∧ (Q⇒R) ⇒ R
        # Simpler honest grounding: (P ∧ (P⇒Q)) ⇒ Q  (modus ponens)
        "P5_induction": (
            ["P", "Q"],
            "(P ∧ (P⇒Q)) ⇒ Q  [P(0) ∧ hereditary ⇒ universal]",
            lambda v, eng: eng.evaluate(
                "⇒",
                eng.evaluate("∧", v["P"], eng.evaluate("⇒", v["P"], v["Q"])),
                v["Q"]
            )
        ),

        # add(m,0)=m — base case of addition
        # P = "add(m,0)=m"  — should always be True (tautology by definition)
        # Grounded as: P ⇔ P (trivial), or better: P ⇒ P
        "add_base": (
            ["P"],
            "P ⇒ P  [add(m,0)=m, identity holds by definition]",
            lambda v, eng: eng.evaluate("⇒", v["P"], v["P"])
        ),

        # add step: add(m,S(n)) = S(add(m,n))
        # P = "add(m,S(n))=S(add(m,n))",  Q = "add(m,n) defined"
        # Structural recursion: if the recursive call is defined, so is the step
        "add_step": (
            ["P", "Q"],
            "Q ⇒ P  [if add(m,n) defined then add(m,S(n)) defined]",
            lambda v, eng: eng.evaluate("⇒", v["Q"], v["P"])
        ),

        # Commutativity of addition: add(m,n) = add(n,m)
        # P = "add(m,n)=k",  Q = "add(n,m)=k"
        # P ⇔ Q — contingent as a claim, tautology as the law
        "add_commutative": (
            ["P", "Q"],
            "P ⇔ Q  [add(m,n)=k ⇔ add(n,m)=k]",
            lambda v, eng: eng.evaluate("⇔", v["P"], v["Q"])
        ),

        # Associativity: add(add(m,n),p) = add(m,add(n,p))
        # P = "add(m,n)=k",  Q = "add(k,p)=r",  R = "add(n,p)=s, add(m,s)=r"
        # Grounded as: (P ∧ Q) ⇔ R
        "add_associative": (
            ["P", "Q", "R"],
            "(P ∧ Q) ⇔ R  [add(add(m,n),p) = add(m,add(n,p))]",
            lambda v, eng: eng.evaluate(
                "⇔",
                eng.evaluate("∧", v["P"], v["Q"]),
                v["R"]
            )
        ),

        # mul base: mul(m,0)=0
        "mul_base": (
            ["P"],
            "P ⇒ P  [mul(m,0)=0, identity holds by definition]",
            lambda v, eng: eng.evaluate("⇒", v["P"], v["P"])
        ),

        # Distributivity: mul(m, add(n,p)) = add(mul(m,n), mul(m,p))
        # P = left side equals k,  Q = right side equals k
        "mul_distributive": (
            ["P", "Q"],
            "P ⇔ Q  [mul(m,add(n,p)) = add(mul(m,n),mul(m,p))]",
            lambda v, eng: eng.evaluate("⇔", v["P"], v["Q"])
        ),
    }

    def ground(self, key: str):
        if key not in self.GROUNDINGS:
            raise KeyError(f"No grounding for '{key}'")
        return self.GROUNDINGS[key]


# ─────────────────────────────────────────────
#  LAYER 4: Pipeline Orchestrator
# ─────────────────────────────────────────────

class PeanoPipeline:

    def __init__(self):
        self.transformer = PeanoTransformer()
        self.grounder = PeanoGrounder()

    def run(self, peano_expr: str, grounding_key: str, axiom_name: str = None):
        peano_str = peano_expr
        print(f"\n{'═'*60}")
        print(f"{Colors.BOLD}{'PEANO EXPRESSION':>20}:{Colors.RESET}  {Colors.CYAN}{peano_str}{Colors.RESET}")

        pred_str = self.transformer.transform(peano_str, axiom_name)
        print(f"{Colors.BOLD}{'FOL PREDICATE':>20}:{Colors.RESET}  {Colors.YELLOW}{pred_str}{Colors.RESET}")

        variables, label, expr_func = self.grounder.ground(grounding_key)
        print(f"{Colors.BOLD}{'PROP. GROUNDING':>20}:{Colors.RESET}  {Colors.GREEN}{label}{Colors.RESET}")

        print(f"\n{Colors.BOLD}TRUTH TABLE:{Colors.RESET}")
        generate(variables, expr_func, label)

    def show_axiom(self, name: str):
        if name not in PeanoString.AXIOMS:
            print(f"Unknown axiom: {name}")
            return
        peano_str, pred_str, desc = PeanoString.AXIOMS[name]
        print(f"\n{Colors.BOLD}AXIOM [{name}]{Colors.RESET}")
        print(f"  {Colors.CYAN}Peano  :{Colors.RESET} {peano_str}")
        print(f"  {Colors.YELLOW}FOL    :{Colors.RESET} {pred_str}")
        print(f"  {Colors.GREEN}Meaning:{Colors.RESET} {desc}")

    def numeral_arithmetic(self):
        """Demonstrate string-based arithmetic with numerals."""
        P = PeanoString
        print(f"\n{Colors.BOLD}[ NUMERAL STRING ARITHMETIC ]{Colors.RESET}")
        print(f"  {Colors.CYAN}Numbers as strings:{Colors.RESET}")
        for i in range(5):
            print(f"    {i}  →  {P.numeral(i)}")

        print(f"\n  {Colors.CYAN}Addition (string rewriting):{Colors.RESET}")
        for m, n in [("0","0"), ("1","2"), ("2","3"), ("3","2")]:
            ms, ns = P.numeral(int(m)), P.numeral(int(n))
            result = P.add(ms, ns)
            # count S's to verify
            count = result.count("S(")
            print(f"    {m} + {n}  =  {result}  [{count}]")

        print(f"\n  {Colors.CYAN}Multiplication (string rewriting):{Colors.RESET}")
        for m, n in [("2","0"), ("2","3"), ("3","2")]:
            ms, ns = P.numeral(int(m)), P.numeral(int(n))
            result = P.mul(ms, ns)
            count = result.count("S(")
            print(f"    {m} × {n}  =  {result}  [{count}]")

        print(f"\n  {Colors.CYAN}Equality strings:{Colors.RESET}")
        two = P.numeral(2)
        three = P.numeral(3)
        print(f"    eq(2,2)  →  {P.eq(two, two)}")
        print(f"    neq(2,3) →  {P.neq(two, three)}")
        print(f"    S(2) = ? →  {P.succ(two)}  =  {P.numeral(3)}  →  same: {P.succ(two) == P.numeral(3)}")


# ─────────────────────────────────────────────
#  DEMO
# ─────────────────────────────────────────────

if __name__ == "__main__":
    pipe = PeanoPipeline()

    print(f"\n{Colors.BOLD}{'═'*60}")
    print("  PEANO ARITHMETIC: STRING → PREDICATE → TRUTH TABLE")
    print(f"{'═'*60}{Colors.RESET}")

    # ── Axiom registry
    print(f"\n{Colors.BOLD}[ PEANO AXIOMS — STRING REGISTRY ]{Colors.RESET}")
    for name in PeanoString.AXIOMS:
        pipe.show_axiom(name)

    # ── Numeral arithmetic as string rewriting
    pipe.numeral_arithmetic()

    # ── Full pipeline runs
    print(f"\n{Colors.BOLD}[ FULL PIPELINE RUNS ]{Colors.RESET}")

    pipe.run("∀x: S(x) ≠ 0",              "P3_zero_not_succ",  "P3_zero_not_succ")
    pipe.run("S(x) = S(y) ⇒ x = y",      "P4_succ_injective", "P4_succ_injective")

    print(f"\n{Colors.BOLD}[ THEOREMS — SHOULD BE TAUTOLOGIES ]{Colors.RESET}")

    pipe.run("(P⇒Q) ⇔ (¬Q⇒¬P)",          "P4_contrapositive")
    pipe.run("(P(0) ∧ hereditary) ⇒ ∀xP", "P5_induction",      "P5_induction")
    pipe.run("add(m,0) = m",               "add_base",          "add_base")
    pipe.run("add(m,S(n)) = S(add(m,n))",  "add_step",          "add_step")
    pipe.run("add(m,n) = add(n,m)",        "add_commutative")
    pipe.run("add(add(m,n),p)=add(m,add(n,p))", "add_associative")
    pipe.run("mul(m,0) = 0",               "mul_base",          "mul_base")
    pipe.run("mul(m,add(n,p))=add(mul(m,n),mul(m,p))", "mul_distributive")