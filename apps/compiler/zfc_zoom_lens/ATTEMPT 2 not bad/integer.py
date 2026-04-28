from natural_number import NaturalNumber
from peano import PeanoConfig, Logic, N, Z

class Integer:
    AXIOMS = NaturalNumber.AXIOMS + [
        "AXIOM OF PAIRING:        ∀a∀b ∃{a,b}.",
        "AXIOM OF EXTENSIONALITY: (a,b) ~_ℤ (c,d) ↔ a+d = b+c  (in ℕ).",
    ]

    def __init__(self, a: NaturalNumber, b: NaturalNumber):
        self.a = a  # represents the 'positive part'
        self.b = b  # represents the 'negative part'

    # ------------------------------------------------------------------
    # Structural operations
    # ------------------------------------------------------------------

    @staticmethod
    def equals(z1, z2):
        return NaturalNumber.equals(
            NaturalNumber.add_map(z1.a, z2.b),
            NaturalNumber.add_map(z1.b, z2.a)
        )

    @staticmethod
    def add_map(z1, z2):
        return Integer(
            NaturalNumber.add_map(z1.a, z2.a),
            NaturalNumber.add_map(z1.b, z2.b)
        )

    @staticmethod
    def neg(z):
        return Integer(z.b, z.a)

    @staticmethod
    def sub_map(z1, z2):
        return Integer.add_map(z1, Integer.neg(z2))

    @staticmethod
    def mul_map(z1, z2):
        pos = NaturalNumber.add_map(
            NaturalNumber.mul_map(z1.a, z2.a),
            NaturalNumber.mul_map(z1.b, z2.b)
        )
        neg = NaturalNumber.add_map(
            NaturalNumber.mul_map(z1.a, z2.b),
            NaturalNumber.mul_map(z1.b, z2.a)
        )
        return Integer(pos, neg)

    @staticmethod
    def greater_than(z1, z2):
        return NaturalNumber.greater_than(
            NaturalNumber.add_map(z1.a, z2.b),
            NaturalNumber.add_map(z1.b, z2.a)
        )

    def is_zero_int(self):
        return NaturalNumber.equals(self.a, self.b)

    # ------------------------------------------------------------------
    # to_psl: level-aware rendering
    # ------------------------------------------------------------------

    def to_psl(self):
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.INTEGER:
            return str(self)
        # INTEGER/NATURAL/PEANO: show as Kuratowski/difference pair
        a_z = self.a.to_psl()
        b_z = self.b.to_psl()
        if lvl >= PeanoConfig.NATURAL:
            # Show as equivalence class representative (a,b)
            return Logic.ordered_pair(a_z, b_z)
        # PEANO: Kuratowski ordered pair inside von Neumann ordinals
        return Logic.ordered_pair(a_z, b_z)

    def __str__(self):
        return str(int(str(self.a)) - int(str(self.b)))