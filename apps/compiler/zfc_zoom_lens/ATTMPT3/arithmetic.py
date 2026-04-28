from apps.zfc_zoom_lens.ATTMPT3.peano import PeanoString
from predicate import FOL_Syntax
from apps.zfc_zoom_lens.ATTMPT3.logic import generate, Colors

"""
ARITHMETIC TOWER — NO CHEATS
==============================
Integers exist ONLY in Layer 1 (the parser).
Every layer below works on strings exclusively.

The key discipline:
  - Equality check:   lhs_reduced == c_p   (string equality, not int ==)
  - Von Neumann sets: built by structurally peeling S(...) off a Peano string
  - Layer 3 display:  derived from the Peano string, not from an integer
  - No count_succs(), no result_int, no int() calls below Layer 1

CASCADE:
  "15 + 4 = 19"                                  ← LAYER 1: human string
       ↓  parse (integers die here)
  add(S^15(0), S^4(0))  =?=  S^19(0)             ← LAYER 2: Peano strings
       ↓  string rewriting
  S^19(0)  ==  S^19(0)  [string equality]         ← LAYER 3: reduction + string eq
       ↓  von Neumann encoding (structural, no ints)
  {0,S(0),...,S^18(0)} ⇔ {0,S(0),...,S^18(0)}    ← LAYER 4: set strings
       ↓  FOL
  ∀x(x∈19_vn ⇔ x∈19_vn)                          ← LAYER 5: FOL predicate
       ↓  ground membership as boolean P
  P ⇔ P   or   P ⇔ Q                              ← LAYER 6: propositional
       ↓  truth table
  TAUTOLOGY  or  CONTINGENT                        ← LAYER 7
"""

_P  = PeanoString
fol = FOL_Syntax()


# ─────────────────────────────────────────────
#  LAYER 1: Parser  (ONLY place integers exist)
# ─────────────────────────────────────────────

def parse(expr: str):
    """
    "a + b = c"  or  "a * b = c"
    Returns (a_peano, op, b_peano, c_peano) — all Peano strings.
    Integers are used here to call numeral() and then discarded.
    """
    expr = expr.replace("×", "*").replace("·", "*")
    lhs_str, rhs_str = [s.strip() for s in expr.split("=", 1)]
    c_peano = _P.numeral(int(rhs_str))

    if "+" in lhs_str:
        a_str, b_str = lhs_str.split("+", 1)
        op = "+"
    elif "*" in lhs_str:
        a_str, b_str = lhs_str.split("*", 1)
        op = "*"
    else:
        raise ValueError(f"Unsupported operator in: {lhs_str}")

    a_peano = _P.numeral(int(a_str.strip()))
    b_peano = _P.numeral(int(b_str.strip()))

    # human-readable labels (strings, not ints)
    a_label = a_str.strip()
    b_label = b_str.strip()
    c_label = rhs_str.strip()
    op_sym  = "+" if op == "+" else "×"

    return a_peano, op, b_peano, c_peano, a_label, b_label, c_label, op_sym


# ─────────────────────────────────────────────
#  LAYER 2: Peano string operations
# ─────────────────────────────────────────────

def peano_unreduced(a: str, op: str, b: str) -> str:
    """Return the opaque unevaluated expression string."""
    if op == "+": return f"add({a}, {b})"
    if op == "*": return f"mul({a}, {b})"

def peano_reduce(a: str, op: str, b: str) -> str:
    """Reduce by string rewriting. symbolic=False."""
    if op == "+": return _P.add(a, b)
    if op == "*": return _P.mul(a, b)


# ─────────────────────────────────────────────
#  LAYER 3: String equality check
#  No integers. Two Peano strings are equal iff they are the same string.
# ─────────────────────────────────────────────

def peano_equal(s1: str, s2: str) -> bool:
    """
    Structural string equality.
    S(S(S(0))) == S(S(S(0)))  →  True
    S(S(0))    == S(S(S(0)))  →  False
    This is NOT integer comparison. It is character-by-character string identity.
    """
    return s1 == s2


# ─────────────────────────────────────────────
#  LAYER 4: Von Neumann set encoding
#  Takes a PEANO STRING, builds the set string structurally.
#  No integers anywhere.
#
#  Algorithm: peel S(...) layers off the numeral to generate members.
#    "0"        → ∅
#    "S(0)"     → {0}              members: ["0"]
#    "S(S(0))"  → {0, S(0)}        members: ["0", "S(0)"]
#    "S^n(0)"   → {0, S(0), ..., S^(n-1)(0)}
#
#  We generate members by building the sequence:
#    start at "0", repeatedly apply succ, stop before reaching n itself.
# ─────────────────────────────────────────────

def von_neumann_from_peano(n_str: str) -> str:
    """
    Build the von Neumann ordinal set string from a Peano numeral string.
    Members are themselves Peano numeral strings.
    Pure string manipulation — no integer arithmetic.
    """
    if n_str == "0":
        return "∅"

    # Generate members: 0, S(0), S(S(0)), ..., up to but not including n_str
    members = []
    current = "0"
    while current != n_str:
        members.append(current)
        current = _P.succ(current)

    return "{" + ", ".join(members) + "}"

def von_neumann_abbreviated(n_str: str) -> str:
    """
    Human-readable abbreviated form for Layer 3 display.
    Members shown as 0, 1, 2, ... using position in the sequence.
    Still derived purely from the Peano string — no integers passed in.
    """
    if n_str == "0":
        return "∅"

    members = []
    current = "0"
    idx     = 0          # only used for display label, not for logic
    while current != n_str:
        members.append(str(idx))
        current = _P.succ(current)
        idx += 1

    return "{" + ", ".join(members) + "}"


# ─────────────────────────────────────────────
#  LAYER 5: FOL predicate
# ─────────────────────────────────────────────

def to_fol(lhs_set: str, rhs_set: str) -> str:
    """∀x(x∈A ⇔ x∈B) — extensionality."""
    inner = fol.apply_op("⇔", f"x∈{lhs_set}", f"x∈{rhs_set}")
    return fol.forall("x", inner)


# ─────────────────────────────────────────────
#  LAYER 6 + 7: Propositional grounding + truth table
# ─────────────────────────────────────────────

def to_truth_table(same: bool, lhs_set: str, rhs_set: str):
    """
    same=True  → both sets identical → P ⇔ P → TAUTOLOGY
    same=False → sets differ         → P ⇔ Q → CONTINGENT
    """
    if same:
        label    = f"P ⇔ P  [x∈{lhs_set[:30]}... ⇔ x∈same]"
        vars_    = ["P"]
        expr_fn  = lambda v, e: e.evaluate("⇔", v["P"], v["P"])
    else:
        label    = f"P ⇔ Q  [x∈result ⇔ x∈claimed  — sets differ]"
        vars_    = ["P", "Q"]
        expr_fn  = lambda v, e: e.evaluate("⇔", v["P"], v["Q"])

    generate(vars_, expr_fn, label)


# ─────────────────────────────────────────────
#  TOWER ORCHESTRATOR
# ─────────────────────────────────────────────

def run_tower(expr: str):
    w = 72
    print(f"\n{'═'*w}")
    print(f"{Colors.BOLD}  ARITHMETIC TOWER:  {expr}{Colors.RESET}")
    print(f"{'═'*w}")

    # ── LAYER 1: Parse → Peano strings (integers die here)
    a_p, op, b_p, c_p, a_lbl, b_lbl, c_lbl, op_sym = parse(expr)

    print(f"\n{Colors.BOLD}  LAYER 1 — ARITHMETIC STRING{Colors.RESET}")
    print(f"  {Colors.CYAN}{a_lbl} {op_sym} {b_lbl} = {c_lbl}{Colors.RESET}")
    print(f"  {Colors.YELLOW}Integers exist only here. Everything below is strings.{Colors.RESET}")

    # ── LAYER 2: Peano numerals + reduction
    lhs_unreduced = peano_unreduced(a_p, op, b_p)
    lhs_reduced   = peano_reduce(a_p, op, b_p)

    print(f"\n{Colors.BOLD}  LAYER 2 — PEANO NUMERALS{Colors.RESET}")
    print(f"  {a_lbl}  :=  {Colors.CYAN}{a_p}{Colors.RESET}")
    print(f"  {b_lbl}  :=  {Colors.CYAN}{b_p}{Colors.RESET}")
    print(f"  {c_lbl}  :=  {Colors.CYAN}{c_p}{Colors.RESET}")
    print(f"\n  {Colors.YELLOW}Unreduced:{Colors.RESET}  {lhs_unreduced}")
    print(f"  {Colors.YELLOW}Reduced:  {Colors.RESET}  {lhs_reduced}")

    # ── LAYER 3: String equality — the honest verdict
    same = peano_equal(lhs_reduced, c_p)

    print(f"\n{Colors.BOLD}  LAYER 3 — STRING EQUALITY CHECK{Colors.RESET}")
    print(f"  Does  {Colors.CYAN}{lhs_reduced}{Colors.RESET}")
    print(f"  equal {Colors.CYAN}{c_p}{Colors.RESET}  ?")
    if same:
        print(f"  {Colors.GREEN}YES — identical strings → equation is TRUE{Colors.RESET}")
    else:
        print(f"  {Colors.RED}NO  — strings differ   → equation is FALSE{Colors.RESET}")

    # ── LAYER 4: Von Neumann set encoding (from Peano strings, no ints)
    lhs_set_abbrev = von_neumann_abbreviated(lhs_reduced)
    c_set_abbrev   = von_neumann_abbreviated(c_p)
    lhs_set_peano  = von_neumann_from_peano(lhs_reduced)
    c_set_peano    = von_neumann_from_peano(c_p)

    print(f"\n{Colors.BOLD}  LAYER 4 — VON NEUMANN SET ENCODING{Colors.RESET}")
    print(f"  {Colors.YELLOW}(abbreviated — members shown as 0,1,2,... for readability){Colors.RESET}")
    print(f"  {a_lbl}  :=  {Colors.CYAN}{von_neumann_abbreviated(a_p)}{Colors.RESET}")
    print(f"  {b_lbl}  :=  {Colors.CYAN}{von_neumann_abbreviated(b_p)}{Colors.RESET}")
    print(f"  {c_lbl}  :=  {Colors.CYAN}{c_set_abbrev}{Colors.RESET}")
    print(f"  result :=  {Colors.CYAN}{lhs_set_abbrev}{Colors.RESET}")
    print(f"\n  {Colors.YELLOW}(full Peano — members as successor strings){Colors.RESET}")
    print(f"  result :=  {Colors.CYAN}{lhs_set_peano}{Colors.RESET}")
    print(f"  {c_lbl}    :=  {Colors.CYAN}{c_set_peano}{Colors.RESET}")
    if same:
        print(f"  {Colors.GREEN}Same set on both sides (string equality confirmed above){Colors.RESET}")
    else:
        print(f"  {Colors.RED}Different sets — result ≠ claimed RHS{Colors.RESET}")

    # ── LAYER 5: FOL predicate
    fol_str = to_fol(lhs_set_peano, c_set_peano)

    print(f"\n{Colors.BOLD}  LAYER 5 — FOL PREDICATE (extensionality){Colors.RESET}")
    print(f"  {Colors.YELLOW}{fol_str}{Colors.RESET}")
    if same:
        print(f"  Both sides name the same set → biconditional is trivially satisfied")
    else:
        print(f"  Sides name different sets → biconditional fails for the element in one but not the other")

    # ── LAYER 6: Propositional grounding
    print(f"\n{Colors.BOLD}  LAYER 6 — PROPOSITIONAL GROUNDING{Colors.RESET}")
    if same:
        print(f"  x∈A ⇔ x∈A  grounds to  {Colors.GREEN}P ⇔ P{Colors.RESET}  (one variable — same membership claim both sides)")
        print(f"  Expected: {Colors.GREEN}TAUTOLOGY{Colors.RESET}")
    else:
        print(f"  x∈A ⇔ x∈B  grounds to  {Colors.RED}P ⇔ Q{Colors.RESET}  (two independent variables — different sets)")
        print(f"  Expected: {Colors.YELLOW}CONTINGENT{Colors.RESET}")

    # ── LAYER 7: Truth table
    print(f"\n{Colors.BOLD}  LAYER 7 — TRUTH TABLE{Colors.RESET}")
    to_truth_table(same, lhs_set_peano, c_set_peano)


# ─────────────────────────────────────────────
#  DEMO
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\n{Colors.BOLD}{'═'*72}")
    print("  THE FULL TOWER — NO CHEATS")
    print("  Integers exist only in Layer 1. All lower layers are pure strings.")
    print(f"{'═'*72}{Colors.RESET}")

    # TRUE → TAUTOLOGY
    run_tower("15 + 4 = 19")
    #run_tower("3 * 4 = 12")
    #run_tower("0 + 7 = 7")
    #run_tower("2 * 0 = 0")

    # FALSE → CONTINGENT
    #run_tower("15 + 4 = 20")
    #run_tower("3 * 4 = 11")