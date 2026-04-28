class PeanoConfig:
    PEANO   = 0  # {∅, {∅}} — raw von Neumann ordinals
    NATURAL = 1  # 2        — decimal numerals
    INTEGER = 2  # (3, 1)   — difference pairs
    RATIONAL= 3  # 1/2      — fraction notation
    REAL    = 4  # Cut(…)   — named Dedekind cut
    ANALYSIS= 5  # D(f)|x   — calculus shorthand

    RENDER_LEVEL = ANALYSIS


# ---------------------------------------------------------------------------
# Ambient set descriptors — used by Logic to define membership universes
# These produce the *structural* definition of the set at the current level.
# ---------------------------------------------------------------------------

class AmbientSet:
    """Base class for ℕ, ℤ, ℚ, ℝ as first-class objects with to_psl()."""
    SYMBOL = "?"

    def to_psl(self):
        raise NotImplementedError

    def __repr__(self):
        return self.to_psl()


class NSet(AmbientSet):
    SYMBOL = "ℕ"

    def to_psl(self):
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.NATURAL:
            return self.SYMBOL
        
        # Build the definition using Logic primitives
        # ℕ = { n | ∅ ∈ n ∧ ∀k(k ∈ n → S(k) ∈ n) }
        cond1 = Logic.membership("∅", "n")
        inner_cond = Logic.implication(Logic.membership("k", "n"), Logic.membership(Logic.successor("k"), "n"))
        cond2 = Logic.forall("k", "n", inner_cond)
        
        return f"{{ n | {cond1} ∧ {cond2} }}"


class ZSet(AmbientSet):
    SYMBOL = "ℤ"

    def to_psl(self):
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.INTEGER:
            return self.SYMBOL
        
        # Recursively get the domain (either "ℕ" or the full Peano expansion)
        n_dom = NSet().to_psl()
        
        # ℤ = { (a,b) | a ∈ ℕ ∧ b ∈ ℕ } / ~
        pair = Logic.ordered_pair("a", "b")
        membership_a = Logic.membership("a", n_dom)
        membership_b = Logic.membership("b", n_dom)
        
        return f"{{ {pair} | {membership_a} ∧ {membership_b} }} / ~"


class QSet(AmbientSet):
    SYMBOL = "ℚ"

    def to_psl(self):
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.RATIONAL:
            return self.SYMBOL
        
        z_dom = ZSet().to_psl()
        
        # ℚ = { (p,q) | p ∈ ℤ ∧ q ∈ ℤ ∧ q ≠ 0 } / ~
        pair = Logic.ordered_pair("p", "q")
        cond = f"{Logic.membership('p', z_dom)} ∧ {Logic.membership('q', z_dom)} ∧ ¬{Logic.equals('q', '0')}"
        
        return f"{{ {pair} | {cond} }} / ~"


class RSet(AmbientSet):
    SYMBOL = "ℝ"

    def to_psl(self):
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.REAL:
            return self.SYMBOL
        
        q_dom = QSet().to_psl()
        
        # Construct Dedekind Cut definition using Logic helpers
        # (∀p∈C)(∀q∈ℚ)(q<p → q∈C)
        ordered = Logic.implication(Logic.less_than("q", "p", universe=Q), Logic.membership("q", "C"))
        condition = Logic.forall("p", "C", Logic.forall("q", q_dom, ordered))
        
        # (∀p∈C)(∃r∈C)(p<r)
        no_max = Logic.forall("p", "C", Logic.exists("r", "C", Logic.less_than("p", "r", universe=Q)))
        
        return f"{{ C ⊆ {q_dom} | C≠∅ ∧ C≠{q_dom} ∧ {condition} ∧ {no_max} }}"


# Singleton instances used throughout the codebase
N = NSet()
Z = ZSet()
Q = QSet()
R = RSet()


# ---------------------------------------------------------------------------
# Logic: level-aware renderers for primitive logical/set operators
# ---------------------------------------------------------------------------

class Logic:
    """
    Generate level-aware strings for logical and set-theoretic primitives.
    Every method respects PeanoConfig.RENDER_LEVEL.
    """

    @staticmethod
    def membership(elem_psl: str, set_psl: str) -> str:
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.NATURAL:
            return f"{elem_psl} ∈ {set_psl}"
        # LOGIC/PEANO: membership as a set of ordered pairs in the epsilon relation
        return f"⟨{elem_psl},{set_psl}⟩ ∈ ε"

    @staticmethod
    def forall(var: str, domain_psl: str, body: str) -> str:
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.RATIONAL:
            return f"∀{var}∈{domain_psl} [{body}]"
        if lvl >= PeanoConfig.NATURAL:
            return f"∀{var}[{Logic.membership(var, domain_psl)} → {body}]"
        # LOGIC: Universal quantification as intersection of truth-sets or formal predicate
        return f"⋂{{ S | {Logic.membership(var, domain_psl)} → {Logic.membership(var, 'S')} ∧ {body} }}"

    @staticmethod
    def exists(var: str, domain_psl: str, body: str) -> str:
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.RATIONAL:
            return f"∃{var}∈{domain_psl} [{body}]"
        if lvl >= PeanoConfig.NATURAL:
            return f"∃{var}[{Logic.membership(var, domain_psl)} ∧ {body}]"
        # LOGIC: Existence defined via negation of universality (De Morgan)
        return f"¬∀{var}[{Logic.membership(var, domain_psl)} → ¬({body})]"

    @staticmethod
    def less_than(a_psl: str, b_psl: str, universe: AmbientSet = None) -> str:
        """a < b.  At sub-rational levels, expands to the ordering definition."""
        lvl = PeanoConfig.RENDER_LEVEL
        universe = universe or Q  # default ordering is over ℚ
        if lvl >= PeanoConfig.RATIONAL:
            return f"{a_psl} < {b_psl}"
        if lvl >= PeanoConfig.INTEGER:
            # ℚ-order: p/q < r/s  iff  p·s < r·q  (for positive denominators)
            return f"(p·s - r·q) ∈ {{ (a,b) ∈ ℤ×ℤ | a < b }}"
        if lvl >= PeanoConfig.NATURAL:
            # ℤ-order: (a,b) < (c,d)  iff  a+d < b+c  in ℕ
            return f"∃k∈ℕ[k≠∅ ∧ {a_psl}.pos + {b_psl}.neg + k = {b_psl}.pos + {a_psl}.neg]"
        # PEANO: n < m iff n ∈ m (von Neumann ordinals)
        return f"{a_psl} ∈ {b_psl}"

    @staticmethod
    def greater_than(a_psl: str, b_psl: str, universe: AmbientSet = None) -> str:
        return Logic.less_than(b_psl, a_psl, universe)

    @staticmethod
    def abs_val(expr_psl: str, universe: AmbientSet = None) -> str:
        lvl = PeanoConfig.RENDER_LEVEL
        universe = universe or R
        us = universe.to_psl()
        if lvl >= PeanoConfig.REAL:
            return f"|{expr_psl}|"
        # |x| = max(x, -x) defined via cases
        return f"({{ x ∈ {us} | {Logic.less_than('0',expr_psl,universe)} }} ? {expr_psl} : neg({expr_psl}))"

    @staticmethod
    def divide(a_psl: str, b_psl: str, universe: AmbientSet = None) -> str:
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.RATIONAL:
            return f"{a_psl}/{b_psl}"
        if lvl >= PeanoConfig.INTEGER:
            # Division of rationals: (p/q)/(r/s) = (p·s)/(q·r)
            return f"(p·s, q·r) where {a_psl}=(p,q), {b_psl}=(r,s)"
        # At integer/natural level, division expressed as multiplication by inverse
        return f"{a_psl} · inv({b_psl})"

    @staticmethod
    def supremum(set_expr_psl: str, universe: AmbientSet = None) -> str:
        lvl = PeanoConfig.RENDER_LEVEL
        universe = universe or R
        us = universe.to_psl()
        if lvl >= PeanoConfig.REAL:
            return f"sup({set_expr_psl})"
        if lvl >= PeanoConfig.RATIONAL:
            # sup = the Dedekind cut whose left set is the union of all cuts in the family
            return (f"⋃{set_expr_psl}  "
                    f"[= the cut {{ q∈ℚ | ∃C∈{set_expr_psl}[q∈C] }}]")
        # At integer/natural level, supremum in full cut language
        return (f"{{ q ∈ {us} | "
                f"{Logic.exists('C', set_expr_psl, Logic.membership('q','C'))} }}")

    @staticmethod
    def successor(n_psl: str) -> str:
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.NATURAL:
            return f"S({n_psl})"
        return f"{n_psl}∪{{{n_psl}}}"

    @staticmethod
    def ordered_pair(a_psl: str, b_psl: str) -> str:
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.INTEGER:
            return f"({a_psl},{b_psl})"
        # Kuratowski: (a,b) = {{a},{a,b}}
        return f"{{{{{a_psl}}},{{{a_psl},{b_psl}}}}}"

    @staticmethod
    def cartesian(a_psl: str, b_psl: str) -> str:
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.INTEGER:
            return f"{a_psl}×{b_psl}"
        # Cartesian product as a set of Kuratowski pairs
        return f"{{ {Logic.ordered_pair('x','y')} | x∈{a_psl} ∧ y∈{b_psl} }}"

    staticmethod
    def implication(a: str, b: str) -> str:
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.NATURAL:
            return f"{a} ⟹ {b}"
        # LOGIC: Material implication definition
        return f"(¬({a}) ∨ {b})"

    @staticmethod
    def nonzero_real(var: str) -> str:
        """Assertion that a Real var is strictly positive (used for δ, ε)."""
        lvl = PeanoConfig.RENDER_LEVEL
        rv = R.to_psl()
        if lvl >= PeanoConfig.REAL:
            return f"{var} > 0"
        return f"{Logic.membership(var, rv)} ∧ {Logic.less_than('0', var, R)}"

    @staticmethod
    def real_var(var: str) -> str:
        """Declare that var ranges over ℝ."""
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.REAL:
            return f"{var}∈ℝ"
        return Logic.membership(var, R.to_psl())

    @staticmethod
    def equals(a: str, b: str) -> str:
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.NATURAL:
            return f"{a} = {b}"
        # LOGIC: Extensionality — two sets are equal if they have the same members
        return f"∀z[{Logic.membership('z', a)} ↔ {Logic.membership('z', b)}]"


# ---------------------------------------------------------------------------
# Base Peano class
# ---------------------------------------------------------------------------

class Peano:
    AXIOMS = [
        "AXIOM OF EXISTENCE:  ∅ exists, i.e. ∃x(∀y ¬(y∈x)).",
        "AXIOM OF SUCCESSION: ∀n ∃S(n)[S(n) = n∪{n}].",
        "AXIOM OF IDENTITY:   ∀x(x=x).",
    ]

    def __init__(self, prev=None):
        self.prev = prev

    def is_zero(self):
        return self.prev is None

    def successor(self):
        return self.__class__(self)

    def to_psl(self):
        if PeanoConfig.RENDER_LEVEL > PeanoConfig.PEANO:
            return "…"
        if self.is_zero():
            return "∅"
        return f"S({self.prev.to_psl()})"