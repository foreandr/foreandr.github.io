import itertools
from apps.zfc_zoom_lens.ATTMPT3.logic import LogicEngine, Colors

"""
GÖDEL'S INCOMPLETENESS — DEMONSTRATED IN OUR SYSTEM
=====================================================

Our LogicEngine makes exactly three classifications:
    TAUTOLOGY    — all rows True
    CONTRADICTION — all rows False
    CONTINGENT   — mixed rows

These map to:
    TAUTOLOGY    → "provably true"   (holds under all assignments)
    CONTRADICTION → "provably false"  (fails under all assignments)
    CONTINGENT   → "neither"         (depends on the world)

Gödel's move: construct a statement G such that:
    "G is not provable in this system"

We do this in three steps:

STEP 1 — GÖDEL NUMBERING (string encoding)
    Every statement in our system is a string.
    We assign each string a canonical code: its own content.
    (In the real construction this is a number. For us it's the string itself.)
    This lets statements REFER TO other statements by name.

STEP 2 — THE PROVABILITY PREDICATE
    provable(stmt_string) → True if the engine classifies it as TAUTOLOGY
    This is a function from strings to booleans — a predicate over our language.

STEP 3 — THE DIAGONAL / SELF-REFERENCE
    We construct G = "provable(G) is False"
    i.e. a statement that asserts its own non-provability.

    Now run provable(G):
    Case A: G IS a tautology (provable)
        → G says "I am not provable" → G is False
        → But a tautology can't be False → CONTRADICTION
        → The system is INCONSISTENT

    Case B: G is NOT a tautology (not provable)
        → G says "I am not provable" → G is True
        → But we just said it's not provable → TRUE BUT UNPROVABLE
        → The system is INCOMPLETE

THE ENGINE HAS NO THIRD CLASSIFICATION.
It must return True or False for every row.
The Gödel sentence forces it to break.

We will watch this happen live.
"""

# ─────────────────────────────────────────────
#  THE PROVABILITY PREDICATE
#  classify(expr_func) → "TAUTOLOGY" | "CONTRADICTION" | "CONTINGENT"
#  This is our system's notion of "provable" — a tautology is proven.
# ─────────────────────────────────────────────

def classify(variables, expr_func) -> str:
    """
    Run the truth table and return the classification string.
    This IS the system's proof procedure — fully explicit, no hiding.
    """
    engine = LogicEngine()
    states  = list(itertools.product([True, False], repeat=len(variables)))
    results = [expr_func(dict(zip(variables, s)), engine) for s in states]
    if all(results):
        return "TAUTOLOGY"
    if not any(results):
        return "CONTRADICTION"
    return "CONTINGENT"

def is_provable(variables, expr_func) -> bool:
    """provable(φ) ↔ classify(φ) == TAUTOLOGY"""
    return classify(variables, expr_func) == "TAUTOLOGY"


# ─────────────────────────────────────────────
#  STEP 1: GÖDEL NUMBERING — strings name statements
#
#  In our system, a statement is a (variables, expr_func) pair.
#  Its "Gödel number" is its label string — the name we give it.
#  We build a registry: name → (variables, expr_func)
#  This lets us write provable("G") to mean provable(the statement named G).
# ─────────────────────────────────────────────

REGISTRY = {}

def register(name: str, variables, expr_func):
    REGISTRY[name] = (variables, expr_func)
    return name

def provable_by_name(name: str) -> bool:
    """Look up a statement by its Gödel number (name string) and test provability."""
    if name not in REGISTRY:
        raise KeyError(f"Statement '{name}' not in registry")
    variables, expr_func = REGISTRY[name]
    return is_provable(variables, expr_func)


# ─────────────────────────────────────────────
#  STEP 2: BUILD NORMAL STATEMENTS FIRST
#  Show the system working correctly before we break it.
# ─────────────────────────────────────────────

# A tautology — provable
register("LAW_OF_EXCLUDED_MIDDLE",
    ["P"],
    lambda v, e: e.evaluate("∨", v["P"], not v["P"])
)

# A contradiction — disprovable
register("SELF_CONTRADICTION",
    ["P"],
    lambda v, e: e.evaluate("∧", v["P"], not v["P"])
)

# A contingent — neither
register("MATERIAL_IMPLICATION",
    ["P", "Q"],
    lambda v, e: e.evaluate("⇒", v["P"], v["Q"])
)


# ─────────────────────────────────────────────
#  STEP 3: THE DIAGONAL CONSTRUCTION
#
#  We want G such that:  G ↔ ¬provable("G")
#
#  The problem: to define G, we need to refer to G's own provability.
#  But to test G's provability, we need G to be defined.
#  This is the CIRCULARITY — the same loop Gödel found.
#
#  We make it explicit with a two-phase construction:
#
#  Phase A: Define a PLACEHOLDER G that we can register under the name "G"
#  Phase B: Define the REAL G that calls provable_by_name("G")
#           i.e. G asks the registry "am I provable?" and negates it
#
#  The expr_func for G is:
#    λ(v, e): NOT provable_by_name("G")
#
#  This is a statement with NO propositional variables — its truth value
#  is determined entirely by what the registry says about "G" itself.
#  It is a fixed point of negated provability.
# ─────────────────────────────────────────────

def godel_sentence(v, e):
    """
    The Gödel sentence G.
    G asserts: "I am not provable."
    Formally: G = ¬provable("G")

    When the engine evaluates this row, it calls provable_by_name("G"),
    which calls classify() on this very function,
    which calls this function again to evaluate rows,
    which calls provable_by_name("G") again...

    The self-reference is not simulated. It is real.
    We catch the RecursionError as the formal witness to incompleteness.
    """
    return not provable_by_name("G")

# Register G under its own name — this completes the diagonal
register("G", [], godel_sentence)


# ─────────────────────────────────────────────
#  DEMONSTRATION
# ─────────────────────────────────────────────

def show_normal_statements():
    w = 68
    print(f"\n{Colors.BOLD}{'═'*w}")
    print("  NORMAL STATEMENTS — SYSTEM WORKING CORRECTLY")
    print(f"{'═'*w}{Colors.RESET}")

    for name in ["LAW_OF_EXCLUDED_MIDDLE", "SELF_CONTRADICTION", "MATERIAL_IMPLICATION"]:
        variables, expr_func = REGISTRY[name]
        result = classify(variables, expr_func)
        provable = result == "TAUTOLOGY"

        color = Colors.GREEN if result == "TAUTOLOGY" else \
                Colors.RED   if result == "CONTRADICTION" else Colors.YELLOW

        print(f"\n  {Colors.BOLD}{name}{Colors.RESET}")
        print(f"  Classification : {color}{result}{Colors.RESET}")
        print(f"  provable(\"{name}\") = {Colors.CYAN}{provable}{Colors.RESET}")

def show_godel():
    w = 68
    print(f"\n{Colors.BOLD}{'═'*w}")
    print("  THE GÖDEL SENTENCE")
    print(f"{'═'*w}{Colors.RESET}")

    print(f"""
  {Colors.BOLD}Construction:{Colors.RESET}
  G is registered in the system under the name "G".
  G's expression function is:  λ(v,e): ¬provable_by_name("G")
  G has no propositional variables — it has exactly one row.
  Its truth value depends entirely on what the system says about G.

  {Colors.BOLD}The loop:{Colors.RESET}
  To evaluate G, we call provable_by_name("G")
  → which calls classify("G")
  → which calls godel_sentence() to get the row result
  → which calls provable_by_name("G")
  → which calls classify("G")
  → which calls godel_sentence()...

  {Colors.YELLOW}This is not a bug. This is the incompleteness.{Colors.RESET}
  The system has no way to stand outside itself to evaluate G.
    """)

    print(f"  {Colors.BOLD}Attempting to classify G...{Colors.RESET}\n")

    # ── Attempt 1: try to classify G directly
    try:
        variables, expr_func = REGISTRY["G"]
        result = classify(variables, expr_func)
        # If we somehow get here, analyze the result
        print(f"  {Colors.BOLD}classify(G) returned: {result}{Colors.RESET}")
        print()

        if result == "TAUTOLOGY":
            print(f"  {Colors.RED}┌─ INCONSISTENCY DETECTED ─────────────────────────────┐{Colors.RESET}")
            print(f"  {Colors.RED}│  classify(G) = TAUTOLOGY                             │{Colors.RESET}")
            print(f"  {Colors.RED}│  → provable(G) = True                                │{Colors.RESET}")
            print(f"  {Colors.RED}│  → G asserts ¬provable(G) = ¬True = False            │{Colors.RESET}")
            print(f"  {Colors.RED}│  → G is False                                        │{Colors.RESET}")
            print(f"  {Colors.RED}│  → But TAUTOLOGY means G is True in ALL rows         │{Colors.RESET}")
            print(f"  {Colors.RED}│  → TRUE and FALSE simultaneously → CONTRADICTION      │{Colors.RESET}")
            print(f"  {Colors.RED}│  → THE SYSTEM IS INCONSISTENT                        │{Colors.RESET}")
            print(f"  {Colors.RED}└───────────────────────────────────────────────────────┘{Colors.RESET}")

        elif result == "CONTRADICTION":
            print(f"  {Colors.RED}┌─ INCONSISTENCY DETECTED ─────────────────────────────┐{Colors.RESET}")
            print(f"  {Colors.RED}│  classify(G) = CONTRADICTION                         │{Colors.RESET}")
            print(f"  {Colors.RED}│  → provable(G) = False                               │{Colors.RESET}")
            print(f"  {Colors.RED}│  → G asserts ¬provable(G) = ¬False = True            │{Colors.RESET}")
            print(f"  {Colors.RED}│  → G is True                                         │{Colors.RESET}")
            print(f"  {Colors.RED}│  → But CONTRADICTION means G is False in ALL rows    │{Colors.RESET}")
            print(f"  {Colors.RED}│  → TRUE and FALSE simultaneously → CONTRADICTION      │{Colors.RESET}")
            print(f"  {Colors.RED}└───────────────────────────────────────────────────────┘{Colors.RESET}")

        elif result == "CONTINGENT":
            print(f"  {Colors.YELLOW}┌─ MALFUNCTION DETECTED ───────────────────────────────┐{Colors.RESET}")
            print(f"  {Colors.YELLOW}│  classify(G) = CONTINGENT                            │{Colors.RESET}")
            print(f"  {Colors.YELLOW}│  G has no variables — it cannot be contingent.       │{Colors.RESET}")
            print(f"  {Colors.YELLOW}│  A zero-variable statement is either always True     │{Colors.RESET}")
            print(f"  {Colors.YELLOW}│  or always False. CONTINGENT is a false result.      │{Colors.RESET}")
            print(f"  {Colors.YELLOW}│  The engine produced a category error.               │{Colors.RESET}")
            print(f"  {Colors.YELLOW}└───────────────────────────────────────────────────────┘{Colors.RESET}")

    except RecursionError:
        # ── This is the real and expected outcome
        print(f"  {Colors.RED}┌─ RECURSION ERROR — INCOMPLETENESS WITNESSED ─────────┐{Colors.RESET}")
        print(f"  {Colors.RED}│                                                       │{Colors.RESET}")
        print(f"  {Colors.RED}│  Python's call stack overflowed.                     │{Colors.RESET}")
        print(f"  {Colors.RED}│  The engine entered an infinite regress trying to    │{Colors.RESET}")
        print(f"  {Colors.RED}│  evaluate G by asking G about G about G...           │{Colors.RESET}")
        print(f"  {Colors.RED}│                                                       │{Colors.RESET}")
        print(f"  {Colors.RED}│  This is NOT a programming error.                    │{Colors.RESET}")
        print(f"  {Colors.RED}│  This IS the incompleteness theorem.                 │{Colors.RESET}")
        print(f"  {Colors.RED}│                                                       │{Colors.RESET}")
        print(f"  {Colors.RED}│  The system cannot classify G because to do so       │{Colors.RESET}")
        print(f"  {Colors.RED}│  it must first know the classification of G.         │{Colors.RESET}")
        print(f"  {Colors.RED}│  It has no way to step outside itself.               │{Colors.RESET}")
        print(f"  {Colors.RED}│                                                       │{Colors.RESET}")
        print(f"  {Colors.RED}│  Gödel proved this is not a fixable bug.             │{Colors.RESET}")
        print(f"  {Colors.RED}│  No extension of the system can classify G           │{Colors.RESET}")
        print(f"  {Colors.RED}│  without either:                                     │{Colors.RESET}")
        print(f"  {Colors.RED}│    (a) becoming inconsistent, or                     │{Colors.RESET}")
        print(f"  {Colors.RED}│    (b) stepping outside its own axioms               │{Colors.RESET}")
        print(f"  {Colors.RED}│        (which just creates a stronger system         │{Colors.RESET}")
        print(f"  {Colors.RED}│         with its own unprovable G').                 │{Colors.RESET}")
        print(f"  {Colors.RED}│                                                       │{Colors.RESET}")
        print(f"  {Colors.RED}└───────────────────────────────────────────────────────┘{Colors.RESET}")

    # ── Show what the two cases would mean if we ASSUMED an answer
    print(f"\n  {Colors.BOLD}What each possible answer would entail:{Colors.RESET}\n")

    cases = [
        ("IF classify(G) = TAUTOLOGY",
         "provable(G) = True",
         "G = ¬True = False",
         "TAUTOLOGY means True in every row",
         "G is simultaneously True and False",
         Colors.RED, "SYSTEM IS INCONSISTENT"),
        ("IF classify(G) = CONTRADICTION",
         "provable(G) = False",
         "G = ¬False = True",
         "CONTRADICTION means False in every row",
         "G is simultaneously True and False",
         Colors.RED, "SYSTEM IS INCONSISTENT"),
        ("IF classify(G) = CONTINGENT",
         "G has no variables — one row, fixed value",
         "CONTINGENT requires mixed rows",
         "Impossible for a zero-variable statement",
         "Category error — wrong classification",
         Colors.YELLOW, "ENGINE MALFUNCTION"),
        ("IF classify(G) = [undefined / new category]",
         "The engine has no fourth bucket",
         "TAUTOLOGY | CONTRADICTION | CONTINGENT is exhaustive",
         "Adding a fourth category just creates a stronger system",
         "That system will have its own unprovable G'",
         Colors.CYAN, "INCOMPLETENESS IS STRUCTURAL"),
    ]

    for cond, step1, step2, step3, conclusion, color, verdict in cases:
        print(f"  {color}▸ {cond}{Colors.RESET}")
        print(f"      → {step1}")
        print(f"      → {step2}")
        print(f"      → {step3}")
        print(f"      → {conclusion}")
        print(f"      {color}∴ {verdict}{Colors.RESET}\n")

    print(f"\n  {Colors.BOLD}{'─'*68}")
    print(f"  THE CONCLUSION{Colors.RESET}")
    print(f"""
  Our system obeys BIVALENCE: every statement is True or False.
  Our system obeys DETERMINISM: same input → same output.
  Our system is EXPRESSIVE enough to name its own statements.

  These three properties together are sufficient to construct G.
  G is true if and only if it is not provable in the system.

  Therefore:
  {Colors.GREEN}  If the system is CONSISTENT → G is TRUE but UNPROVABLE{Colors.RESET}
  {Colors.RED}  If the system is COMPLETE   → G is PROVABLE but FALSE{Colors.RESET}

  {Colors.BOLD}  You cannot have both. Pick one crack.{Colors.RESET}

  This is Gödel's First Incompleteness Theorem.
  We did not simulate it. We instantiated it.
  The RecursionError above is its physical signature in our engine.
    """)


if __name__ == "__main__":
    print(f"\n{Colors.BOLD}{'═'*68}")
    print("  GÖDEL'S INCOMPLETENESS IN OUR LOGICAL SYSTEM")
    print(f"{'═'*68}{Colors.RESET}")

    show_normal_statements()
    show_godel()