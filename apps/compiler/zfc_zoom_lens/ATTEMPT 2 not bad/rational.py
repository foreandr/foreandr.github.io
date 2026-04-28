from integer import Integer
from natural_number import NaturalNumber
from peano import PeanoConfig, Logic, Z, Q

class Rational:
    AXIOMS = Integer.AXIOMS + [
        "AXIOM OF PAIRING (ZF):          ∀p∀q ∃{p,q}.",
        "AXIOM OF MULTIPLICATIVE INVERSE: ∀q∈ℤ[¬(q~_ℤ 0) → ∃r∈ℚ(q·r ~_ℤ 1)].",
    ]

    def __init__(self, p: Integer, q: Integer):
        if q.is_zero_int():
            raise ZeroDivisionError("LOGICAL PARADOX: Division by zero.")
        self.p = p  # numerator Integer
        self.q = q  # denominator Integer (≠ 0)

    # ------------------------------------------------------------------
    # Structural operations
    # ------------------------------------------------------------------

    @staticmethod
    def from_int(n: int):
        return Rational(
            Integer(NaturalNumber(n if n >= 0 else 0), NaturalNumber(-n if n < 0 else 0)),
            Integer(NaturalNumber(1), NaturalNumber(0))
        )

    @staticmethod
    def equals(r1, r2):
        return Integer.equals(Integer.mul_map(r1.p, r2.q), Integer.mul_map(r1.q, r2.p))

    @staticmethod
    def add_map(r1, r2):
        num = Integer.add_map(Integer.mul_map(r1.p, r2.q), Integer.mul_map(r1.q, r2.p))
        den = Integer.mul_map(r1.q, r2.q)
        return Rational(num, den)

    @staticmethod
    def neg(r):
        return Rational(Integer.neg(r.p), r.q)

    @staticmethod
    def sub_map(r1, r2):
        return Rational.add_map(r1, Rational.neg(r2))

    @staticmethod
    def mul_map(r1, r2):
        return Rational(Integer.mul_map(r1.p, r2.p), Integer.mul_map(r1.q, r2.q))

    @staticmethod
    def div_map(r1, r2):
        return Rational(Integer.mul_map(r1.p, r2.q), Integer.mul_map(r1.q, r2.p))

    @staticmethod
    def greater_than(r1, r2):
        # p/q > r/s  iff  p·s > r·q  (positive denominators assumed)
        return Integer.greater_than(Integer.mul_map(r1.p, r2.q), Integer.mul_map(r2.p, r1.q))

    # ------------------------------------------------------------------
    # to_psl: level-aware rendering
    # ------------------------------------------------------------------

    def to_psl(self):
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.RATIONAL:
            return str(self)
        # Below RATIONAL: show as equivalence class of integer pairs
        p_z = self.p.to_psl()
        q_z = self.q.to_psl()
        zs = Z.to_psl()
        pair = Logic.ordered_pair(p_z, q_z)
        if lvl >= PeanoConfig.INTEGER:
            return f"[{pair}]_~  ∈ {{ (p,q) ∈ ℤ×ℤ | ¬(q ~_ℤ 0) }} / ~"
        return f"[{pair}]_~  ∈ {{ {Logic.ordered_pair('p','q')} ∈ {Logic.cartesian(zs,zs)} | ¬(q ~_ℤ 0) }} / ~"

    def __str__(self):
        return f"{self.p}/{self.q}"