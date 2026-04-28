from real import Real
from rational import Rational
from integer import Integer
from natural_number import NaturalNumber
from peano import PeanoConfig, Logic, Q, R

# ---------------------------------------------------------------------------
# Function: a first-class mathematical object f: ℝ → ℝ
# ---------------------------------------------------------------------------

class Function:
    """
    A mapping f: ℝ → ℝ.

    At ANALYSIS level  → name string (e.g. "x²")
    At REAL level      → set-of-ordered-pairs over ℝ×ℝ
    At lower levels    → the Cartesian product and pair notation cascade down
    """

    def __init__(self, mapping, name: str):
        self.mapping = mapping
        self.name = name

    def __call__(self, x):
        return self.mapping(x)

    def to_psl(self):
        lvl = PeanoConfig.RENDER_LEVEL
        if lvl >= PeanoConfig.ANALYSIS:
            return self.name
        rs = R.to_psl()
        prod = Logic.cartesian(rs, rs)
        # f = { (x,y) ∈ ℝ×ℝ | y = f(x) }
        pair = Logic.ordered_pair("x", "y")
        mem  = Logic.membership(pair, prod)
        if lvl >= PeanoConfig.REAL:
            return f"{{ {pair} ∈ {prod} | y = {self.name}(x) }}"
        # Below REAL: variable x and y are themselves Dedekind cuts
        x_cut = f"{{ qₓ ∈ {Q.to_psl()} | qₓ < x }}"
        y_cut = f"{{ q_y ∈ {Q.to_psl()} | q_y < y }}"
        return (f"{{ {Logic.ordered_pair(x_cut, y_cut)} ∈ {prod} "
                f"| {y_cut} = {self.name}({x_cut}) }}")


# ---------------------------------------------------------------------------
# Calculus
# ---------------------------------------------------------------------------

class Calculus:
    AXIOMS = Real.AXIOMS + [
        "DEFINITION OF LIMIT:      lim_{x→c} f(x) = L  ↔  "
            "∀ε∈ℝ[ε>0 → ∃δ∈ℝ(δ>0 ∧ ∀x∈ℝ(0<|x-c|<δ → |f(x)-L|<ε))].",
        "DEFINITION OF DERIVATIVE: D(f)|ₓ = lim_{h→0} [f(x+h)-f(x)]/h.",
        "DEFINITION OF INTEGRAL:   ∫_a^b f = sup{ ∑ f(xᵢ)Δxᵢ | (xᵢ) partition of [a,b] }.",
        "FUNDAMENTAL THEOREM:      D(∫_a^x f dt)|ₓ = f(x).",
    ]

    # ------------------------------------------------------------------
    # Derivative
    # ------------------------------------------------------------------

    @staticmethod
    def diff_map(f_obj: Function, x_real: Real) -> Real:
        """
        Returns the Dedekind cut  D(f)|ₓ  as a Real.

        D(f)|ₓ  =  lim_{h→0} [f(x+h) - f(x)] / h
               =  { q ∈ ℚ | ∃δ>0 : ∀h∈ℝ(0<|h|<δ → q < [f(x+h)-f(x)]/h) }
        """

        def diff_logic_formatter():
            lvl = PeanoConfig.RENDER_LEVEL
            f_z  = f_obj.to_psl()
            x_z  = x_real.to_psl()
            qs   = Q.to_psl()
            rs   = R.to_psl()

            if lvl >= PeanoConfig.REAL:
                # Readable: ∃δ>0 : ∀h∈ℝ(0<|h|<δ → q < [f(x+h)-f(x)]/h)
                h_type    = Logic.real_var("h")
                delta_pos = Logic.nonzero_real("δ")
                abs_h     = Logic.abs_val("h", R)
                abs_lt_d  = Logic.less_than(abs_h, "δ", R)
                h_nonzero = Logic.less_than("0", abs_h, R)
                numerator = f"[{f_z}(x+h) - {f_z}(x)]"
                quotient  = Logic.divide(numerator, "h", R)
                q_lt_quot = Logic.less_than("q", quotient, Q)
                inner     = Logic.implication(
                                f"({h_nonzero} ∧ {abs_lt_d})",
                                q_lt_quot)
                forall_h  = Logic.forall("h", rs, inner)
                return Logic.exists("δ", rs, f"{delta_pos} ∧ {forall_h}")

            if lvl >= PeanoConfig.RATIONAL:
                # Expand h, δ as Dedekind cuts; f as set of pairs
                h_cut   = f"{{ qₕ ∈ {qs} | qₕ < h }}"
                d_cut   = f"{{ q_δ ∈ {qs} | q_δ > 0 }}"
                abs_h   = Logic.abs_val("h", R)
                f_at_xh = f"{f_z}({x_z} + {h_cut})"
                f_at_x  = f"{f_z}({x_z})"
                num     = f"[{f_at_xh} - {f_at_x}]"
                quot    = Logic.divide(num, h_cut, R)
                q_lt    = Logic.less_than("q", quot, Q)
                abs_lt  = Logic.less_than(Logic.abs_val(h_cut, R), d_cut, R)
                nonzero = Logic.less_than("0", Logic.abs_val(h_cut, R), R)
                inner   = Logic.implication(f"({nonzero} ∧ {abs_lt})", q_lt)
                forall_h = Logic.forall("h", rs, inner)
                return Logic.exists("δ", rs, f"{Logic.nonzero_real('δ')} ∧ {forall_h}")

            # INTEGER / NATURAL / PEANO: fully structural
            h_cut   = f"{{ qₕ ∈ {qs} | {Logic.less_than('qₕ','h',Q)} }}"
            d_cut   = f"{{ q_δ ∈ {qs} | {Logic.less_than('0','q_δ',Q)} }}"
            f_at_xh = f"{f_z}({{ qₓ ∈ {qs} | {Logic.less_than('qₓ', f'{x_z}+{h_cut}', Q)} }})"
            f_at_x  = f"{f_z}({{ qₓ ∈ {qs} | {Logic.less_than('qₓ', x_z, Q)} }})"
            numerator = f"[{f_at_xh} - {f_at_x}]"
            quotient  = Logic.divide(numerator, h_cut, R)
            q_lt      = Logic.less_than("q", quotient, Q)
            abs_h     = Logic.abs_val(h_cut, R)
            abs_lt_d  = Logic.less_than(abs_h, d_cut, R)
            nonzero_h = Logic.less_than("0", abs_h, R)
            inner     = Logic.implication(f"({nonzero_h} ∧ {abs_lt_d})", q_lt)
            forall_h  = Logic.forall("h", rs, inner)
            delta_pos = Logic.nonzero_real("δ")
            return Logic.exists("δ", rs, f"{delta_pos} ∧ {forall_h}")

        name = f"D({f_obj.name})|{x_real.name}"
        return Real(lambda q: True, name, logic_formatter=diff_logic_formatter)

    # ------------------------------------------------------------------
    # Integral
    # ------------------------------------------------------------------

    @staticmethod
    def int_map(f_obj: Function, a_real: Real, b_real: Real) -> Real:
        """
        Returns the Dedekind cut  ∫_a^b f  as a Real.

        ∫_a^b f  =  sup{ ∑ f(xᵢ)Δxᵢ | (xᵢ) a partition of [a,b] }
                 =  { q ∈ ℚ | q < sup{ lower Riemann sums } }
        """

        def int_logic_formatter():
            lvl = PeanoConfig.RENDER_LEVEL
            f_z  = f_obj.to_psl()
            a_z  = a_real.to_psl()
            b_z  = b_real.to_psl()
            qs   = Q.to_psl()
            rs   = R.to_psl()

            if lvl >= PeanoConfig.REAL:
                # Readable Riemann-sum supremum
                partition = f"partition P of [{a_z},{b_z}]"
                riemann   = f"∑_{{xᵢ∈P}} {f_z}(xᵢ)·Δxᵢ"
                sums_set  = f"{{ {riemann} | {partition} }}"
                sup_val   = Logic.supremum(sums_set, R)
                return Logic.less_than("q", sup_val, Q)

            if lvl >= PeanoConfig.RATIONAL:
                # Expand a, b as cuts; partition points are real cuts
                a_cut     = a_z
                b_cut     = b_z
                xi_cut    = f"{{ qᵢ ∈ {qs} | qᵢ < xᵢ }}"
                delta_xi  = f"{{ q_Δ ∈ {qs} | q_Δ = xᵢ - xᵢ₋₁ }}"
                riemann   = f"∑ {f_z}({xi_cut})·{delta_xi}"
                sums_set  = f"{{ {riemann} | partition of [{a_cut},{b_cut}] }}"
                sup_val   = Logic.supremum(sums_set, R)
                return Logic.less_than("q", sup_val, Q)

            # INTEGER / NATURAL / PEANO: fully structural
            a_cut    = f"{{ qₐ ∈ {qs} | {Logic.less_than('qₐ', a_z, Q)} }}"
            b_cut    = f"{{ q_b ∈ {qs} | {Logic.less_than('q_b', b_z, Q)} }}"
            xi_type  = f"{{ qᵢ ∈ {qs} | {Logic.less_than('qᵢ','xᵢ',Q)} }}"
            d_xi     = f"{{ q_Δ ∈ {qs} | q_Δ = xᵢ - xᵢ₋₁ }}"
            riemann  = f"∑ {f_z}({xi_type})·{d_xi}"
            sums_set = f"{{ {riemann} | partition of [{a_cut},{b_cut}] }}"
            sup_val  = Logic.supremum(sums_set, R)
            return Logic.less_than("q", sup_val, Q)

        name = f"∫_{{{a_real.name}}}^{{{b_real.name}}} {f_obj.name} dx"
        return Real(lambda q: True, name, logic_formatter=int_logic_formatter)