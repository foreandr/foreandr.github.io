from peano import Peano, PeanoConfig, Logic, N

class NaturalNumber(Peano):
    AXIOMS = Peano.AXIOMS + [
        "AXIOM OF INDUCTION: (P(∅) ∧ ∀n[P(n) → P(n∪{n})]) → ∀n∈ℕ P(n).",
    ]

    def __init__(self, value=None):
        if isinstance(value, int):
            self.prev = None
            temp = NaturalNumber(None)
            for _ in range(value):
                temp = temp.successor()
            self.prev = temp.prev
        else:
            super().__init__(value)

    # ------------------------------------------------------------------
    # Structural operations (unchanged — these operate on actual objects)
    # ------------------------------------------------------------------

    @staticmethod
    def equals(a, b):
        if a.is_zero() and b.is_zero(): return True
        if a.is_zero() or b.is_zero(): return False
        return NaturalNumber.equals(a.prev, b.prev)

    @staticmethod
    def add_map(a, b):
        if b.is_zero(): return a
        return NaturalNumber.add_map(a, b.prev).successor()

    @staticmethod
    def mul_map(a, b):
        if b.is_zero(): return NaturalNumber(0)
        return NaturalNumber.add_map(a, NaturalNumber.mul_map(a, b.prev))

    @staticmethod
    def greater_than(a, b):
        if a.is_zero(): return False
        if b.is_zero(): return True
        return NaturalNumber.greater_than(a.prev, b.prev)

    # ------------------------------------------------------------------
    # to_psl: level-aware rendering
    # ------------------------------------------------------------------

    def to_psl(self):
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.NATURAL:
            return str(self)
        # PEANO level: von Neumann ordinal as a nested set
        if self.is_zero():
            return "∅"
        # n = {0, 1, …, n-1} — collect elements
        elements = []
        temp = self
        while not temp.is_zero():
            elements.append(temp.prev.to_psl())
            temp = temp.prev
        return "{" + ", ".join(reversed(elements)) + "}"

    def __str__(self):
        count = 0
        curr = self
        while not curr.is_zero():
            count += 1
            curr = curr.prev
        return str(count)