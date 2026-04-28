from rational import Rational
from integer import Integer
from natural_number import NaturalNumber
from peano import PeanoConfig, Logic, Q, R

class Real:
    AXIOMS = Rational.AXIOMS + [
        "AXIOM OF INFINITY:     ∃I[∅∈I ∧ ∀n∈I(n∪{n}∈I)].",
        "AXIOM OF COMPLETENESS: ∀S⊆ℝ[S≠∅ ∧ ∃b∈ℝ(∀x∈S x≤b) → ∃sup(S)∈ℝ(∀x∈S x≤sup(S) ∧ ∀ε>0 ∃x∈S(sup(S)-ε<x))].",
    ]

    def __init__(self, cut_rule, name: str, logic_formatter=None, base_obj=None):
        self.cut_rule = cut_rule
        self.name = name
        self.base_obj = base_obj   # Rational/Integer anchor for this real
        self._formatter = logic_formatter

    # ------------------------------------------------------------------
    # to_psl: level-aware rendering
    # ------------------------------------------------------------------

    def to_psl(self):
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.REAL:
            return self.name

        qs = Q.to_psl()  # ℚ rendered at current level

        # Custom formatter (derivative / integral logic)
        if self._formatter:
            return f"{{ q ∈ {qs} | {self._formatter()} }}"

        # Standard Dedekind cut: { q ∈ ℚ | q < base_obj }
        val_repr = self.base_obj.to_psl() if self.base_obj else self.name
        lt = Logic.less_than("q", val_repr, Q)
        return f"{{ q ∈ {qs} | {lt} }}"

    def __str__(self):
        return self.name