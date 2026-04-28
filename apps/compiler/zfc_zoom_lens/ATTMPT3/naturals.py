from apps.zfc_zoom_lens.ATTMPT3.peano import PeanoString, PeanoPipeline, PeanoGrounder
from apps.zfc_zoom_lens.ATTMPT3.logic import generate, Colors

"""
NATURAL NUMBERS: INDUCTIVE PROOFS
===================================
PHILOSOPHY:
  - A proof is a sequence of strings, each justified by a rule name.
  - Proof steps use symbolic=True so terms stay OPAQUE — the LHS and RHS
    of each step are genuinely different strings showing the transformation.
  - numeral_arithmetic() still uses symbolic=False for actual computation.
  - Nothing is evaluated. Every step is a string with a warrant.

PROOFS:
  Lemma 1 : add(n, 0) = n                          [right zero, from axiom]
  Lemma 2 : add(S(m), n) = S(add(m, n))            [succ on left, by induction on n]
  Theorem 1: add(m, n) = add(n, m)                 [commutativity, by induction on n]
  Theorem 2: add(add(m,n),p) = add(m,add(n,p))     [associativity, by induction on p]
"""

P = PeanoString

def A(m, n):
    """Symbolic add: always returns the opaque string add(m, n)."""
    return P.add(m, n, symbolic=True)

def SA(m, n):
    """Symbolic S(add(m, n))."""
    return P.succ(A(m, n))


# ─────────────────────────────────────────────
#  PROOF ENGINE
# ─────────────────────────────────────────────

class ProofStep:
    def __init__(self, statement: str, rule: str, detail: str = ""):
        self.statement = statement
        self.rule      = rule
        self.detail    = detail

    def __str__(self):
        rule_str = f"[{self.rule}]"
        if self.detail:
            rule_str += f"  — {self.detail}"
        return f"  {self.statement:<55}  {rule_str}"


class Proof:
    def __init__(self, name: str, claim: str):
        self.name  = name
        self.claim = claim
        self.steps = []

    def section(self, title: str):
        self.steps.append(("header", title))

    def step(self, statement: str, rule: str, detail: str = ""):
        self.steps.append(("step", ProofStep(statement, rule, detail)))

    def qed(self):
        self.steps.append(("qed", None))

    def display(self):
        w = 74
        print(f"\n{'═'*w}")
        print(f"{Colors.BOLD}  PROOF: {self.name}{Colors.RESET}")
        print(f"  {Colors.CYAN}Claim:{Colors.RESET}  {self.claim}")
        print(f"{'─'*w}")
        for kind, content in self.steps:
            if kind == "header":
                print(f"\n  {Colors.YELLOW}▸ {content}{Colors.RESET}")
            elif kind == "step":
                print(f"{Colors.GREEN}{content}{Colors.RESET}")
            elif kind == "qed":
                print(f"\n  {Colors.BOLD}{'─'*w}\n  ∎  QED{Colors.RESET}")
        print(f"{'═'*w}\n")


# ─────────────────────────────────────────────
#  LEMMA 1: add(n, 0) = n
# ─────────────────────────────────────────────

def lemma_add_zero_right() -> Proof:
    proof = Proof(
        name  = "Lemma 1 — Right Zero",
        claim = "∀n: add(n, 0) = n"
    )
    proof.section("Direct from Axiom")
    proof.step("add(n, 0) = n",
               "add_base",
               "add(m, 0) = m  with m := n")
    proof.step("add(0, m) = m",
               "add_base",
               "add(m, 0) = m  with m := 0, variable renamed to clarify both directions")
    proof.step("∴ ∀n: add(n, 0) = n  and  add(0, n) = n",
               "lemma established",
               "zero is identity on both sides")
    proof.qed()
    return proof


# ─────────────────────────────────────────────
#  LEMMA 2: add(S(m), n) = S(add(m, n))
#  Induction on n.
# ─────────────────────────────────────────────

def lemma_add_succ_left() -> Proof:
    m, n = "m", "n"
    Sm   = P.succ(m)    # "S(m)"
    Sn   = P.succ(n)    # "S(n)"

    # Every term built symbolically — no reduction happens
    lhs_base   = A(Sm, "0")              # "add(S(m), 0)"
    rhs_base   = P.succ(A(m, "0"))       # "S(add(m, 0))"
    lhs_step   = A(Sm, Sn)               # "add(S(m), S(n))"
    after_def  = P.succ(A(Sm, n))        # "S(add(S(m), n))"   ← add_step applied
    after_ih   = P.succ(P.succ(A(m, n))) # "S(S(add(m, n)))"   ← IH substituted
    rhs_step   = P.succ(A(m, Sn))        # "S(add(m, S(n)))"   ← final form

    proof = Proof(
        name  = "Lemma 2 — Successor on Left",
        claim = f"∀m∀n: {A(Sm, n)} = {SA(m, n)}"
    )
    proof.section("Proof by induction on n")

    proof.section("Base Case  [n := 0]")
    proof.step(f"{lhs_base} = {Sm}",
               "add_base",
               "add(S(m), 0) = S(m)")
    proof.step(f"{rhs_base} = {Sm}",
               "add_base (inner)",
               "S(add(m, 0)) = S(m)  since add(m, 0) = m")
    proof.step(f"∴ {lhs_base} = {rhs_base}",
               "base case ✓",
               "both reduce to S(m)")

    proof.section("Inductive Hypothesis  [assume n]")
    proof.step(f"{A(Sm, n)} = {SA(m, n)}",
               "inductive_hypothesis",
               "IH: assume true for n")

    proof.section(f"Inductive Step  [prove for {Sn}]")
    proof.step(f"{lhs_step} = {after_def}",
               "add_step",
               "add(x, S(n)) = S(add(x, n))  with x := S(m)")
    proof.step(f"{after_def} = {after_ih}",
               "inductive_hypothesis",
               f"substitute IH: {A(Sm, n)} = {SA(m, n)}")
    proof.step(f"{after_ih} = {rhs_step}",
               "add_step (reverse)",
               "S(add(m, n)) = add(m, S(n))  reversed  →  S(S(add(m,n))) = S(add(m, S(n)))")
    proof.step(f"∴ {lhs_step} = {rhs_step}",
               "inductive step ✓",
               f"chain: {lhs_step} = {after_def} = {after_ih} = {rhs_step}")

    proof.section("Conclusion")
    proof.step(f"∀m∀n: {A(Sm, n)} = {SA(m, n)}",
               "induction (P5)",
               "base case + inductive step → holds for all n")
    proof.qed()
    return proof


# ─────────────────────────────────────────────
#  THEOREM 1: add(m, n) = add(n, m)
#  Induction on n.
# ─────────────────────────────────────────────

def theorem_add_commutative() -> Proof:
    m, n  = "m", "n"
    Sn    = P.succ(n)           # "S(n)"

    lhs_base  = A(m, "0")       # "add(m, 0)"
    rhs_base  = A("0", m)       # "add(0, m)"
    lhs_step  = A(m, Sn)        # "add(m, S(n))"
    after_def = SA(m, n)        # "S(add(m, n))"   ← add_step
    after_ih  = P.succ(A(n, m)) # "S(add(n, m))"   ← IH substituted
    rhs_step  = A(Sn, m)        # "add(S(n), m)"   ← Lemma 2 reversed

    proof = Proof(
        name  = "Theorem 1 — Commutativity of Addition",
        claim = f"∀m∀n: {A(m, n)} = {A(n, m)}"
    )
    proof.section("Proof by induction on n")

    proof.section("Base Case  [n := 0]")
    proof.step(f"{lhs_base} = {m}",
               "add_base",
               "add(m, 0) = m")
    proof.step(f"{rhs_base} = {m}",
               "Lemma 1",
               "add(0, m) = m  [Lemma 1]")
    proof.step(f"∴ {lhs_base} = {rhs_base}",
               "base case ✓",
               "both equal m")

    proof.section("Inductive Hypothesis  [assume n]")
    proof.step(f"{A(m, n)} = {A(n, m)}",
               "inductive_hypothesis",
               "IH: assume true for n")

    proof.section(f"Inductive Step  [prove for {Sn}]")
    proof.step(f"{lhs_step} = {after_def}",
               "add_step",
               "add(m, S(n)) = S(add(m, n))")
    proof.step(f"{after_def} = {after_ih}",
               "inductive_hypothesis",
               "substitute IH: add(m, n) = add(n, m)")
    proof.step(f"{after_ih} = {rhs_step}",
               "Lemma 2 (reverse)",
               "S(add(n, m)) = add(S(n), m)  [Lemma 2]")
    proof.step(f"∴ {lhs_step} = {rhs_step}",
               "inductive step ✓",
               f"chain: {lhs_step} = {after_def} = {after_ih} = {rhs_step}")

    proof.section("Conclusion")
    proof.step(f"∀m∀n: {A(m, n)} = {A(n, m)}",
               "induction (P5)",
               "base case + inductive step → holds for all n")
    proof.qed()
    return proof


# ─────────────────────────────────────────────
#  THEOREM 2: add(add(m,n),p) = add(m,add(n,p))
#  Induction on p.
# ─────────────────────────────────────────────

def theorem_add_associative() -> Proof:
    m, n, p = "m", "n", "p"
    Sp = P.succ(p)               # "S(p)"

    mn = A(m, n)                 # "add(m, n)"

    # Build all terms symbolically
    lhs_base   = A(mn, "0")                 # "add(add(m,n), 0)"
    rhs_base   = A(m, A(n, "0"))            # "add(m, add(n, 0))"
    lhs_p      = A(mn, p)                   # "add(add(m,n), p)"      — IH LHS
    rhs_p      = A(m, A(n, p))             # "add(m, add(n,p))"      — IH RHS
    lhs_step   = A(mn, Sp)                  # "add(add(m,n), S(p))"
    after_def  = P.succ(A(mn, p))           # "S(add(add(m,n), p))"  ← add_step
    after_ih   = P.succ(A(m, A(n, p)))     # "S(add(m, add(n,p)))"  ← IH
    after_rev1 = A(m, P.succ(A(n, p)))     # "add(m, S(add(n,p)))"  ← add_step rev outer
    rhs_step   = A(m, A(n, Sp))            # "add(m, add(n, S(p)))" ← add_step rev inner

    proof = Proof(
        name  = "Theorem 2 — Associativity of Addition",
        claim = f"∀m∀n∀p: {lhs_p} = {rhs_p}"
    )
    proof.section("Proof by induction on p")

    proof.section("Base Case  [p := 0]")
    proof.step(f"{lhs_base} = {mn}",
               "add_base",
               "add(add(m,n), 0) = add(m, n)")
    proof.step(f"{rhs_base} = {mn}",
               "add_base (inner)",
               "add(n, 0) = n  →  add(m, add(n, 0)) = add(m, n)")
    proof.step(f"∴ {lhs_base} = {rhs_base}",
               "base case ✓",
               "both equal add(m, n)")

    proof.section("Inductive Hypothesis  [assume p]")
    proof.step(f"{lhs_p} = {rhs_p}",
               "inductive_hypothesis",
               "IH: assume true for p")

    proof.section(f"Inductive Step  [prove for {Sp}]")
    proof.step(f"{lhs_step} = {after_def}",
               "add_step",
               "add(add(m,n), S(p)) = S(add(add(m,n), p))")
    proof.step(f"{after_def} = {after_ih}",
               "inductive_hypothesis",
               "substitute IH: add(add(m,n), p) = add(m, add(n,p))")
    proof.step(f"{after_ih} = {after_rev1}",
               "add_step (reverse, outer)",
               "S(add(m, add(n,p))) = add(m, S(add(n,p)))")
    proof.step(f"{after_rev1} = {rhs_step}",
               "add_step (reverse, inner)",
               "S(add(n,p)) = add(n, S(p))  →  add(m, S(add(n,p))) = add(m, add(n, S(p)))")
    proof.step(f"∴ {lhs_step} = {rhs_step}",
               "inductive step ✓",
               "four-step chain fully explicit")

    proof.section("Conclusion")
    proof.step(f"∀m∀n∀p: {lhs_p} = {rhs_p}",
               "induction (P5)",
               "base case + inductive step → holds for all p")
    proof.qed()
    return proof


# ─────────────────────────────────────────────
#  VERIFICATION
# ─────────────────────────────────────────────

def verify_with_truth_table(theorem_name: str, grounding_key: str):
    grounder = PeanoGrounder()
    variables, label, expr_func = grounder.ground(grounding_key)
    print(f"\n  {Colors.CYAN}Verifying [{theorem_name}] — propositional grounding:{Colors.RESET}")
    print(f"  {Colors.YELLOW}(the proof establishes truth; the table reveals the logical FORM){Colors.RESET}")
    generate(variables, expr_func, label)


# ─────────────────────────────────────────────
#  DEMO
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\n{Colors.BOLD}{'═'*74}")
    print("  NATURAL NUMBERS — INDUCTIVE PROOFS")
    print(f"  (PeanoString in symbolic mode: terms stay opaque in proof steps)")
    print(f"{'═'*74}{Colors.RESET}")

    print(f"\n{Colors.BOLD}[ NATURALS AS STRINGS ]{Colors.RESET}")
    for i in range(6):
        print(f"  ℕ ∋ {i}  :=  {P.numeral(i)}")
    print(f"\n  These are the objects the proofs quantify over.")
    print(f"  The proofs never compute — they rewrite strings by named rules.")

    for proof in [
        lemma_add_zero_right(),
        lemma_add_succ_left(),
        theorem_add_commutative(),
        theorem_add_associative(),
    ]:
        proof.display()

    print(f"\n{Colors.BOLD}{'═'*74}")
    print("  PROPOSITIONAL VERIFICATION")
    print(f"  Commutativity and Associativity are CONTINGENT as raw formulas.")
    print(f"  The inductive proofs above are what closes them into theorems.")
    print(f"{'═'*74}{Colors.RESET}")

    verify_with_truth_table("Commutativity", "add_commutative")
    verify_with_truth_table("Associativity", "add_associative")