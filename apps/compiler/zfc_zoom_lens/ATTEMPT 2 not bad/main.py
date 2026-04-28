from natural_number import NaturalNumber
from integer import Integer
from rational import Rational
from real import Real
from calculus import Calculus, Function
from peano import PeanoConfig

def inspect(label, obj):
    print(f"\n{'='*100}")
    print(f"### TARGET: {label}")
    print(f"{'='*100}")
    print("PRESUPPOSED AXIOMS:")
    for i, ax in enumerate(obj.AXIOMS, 1):
        print(f"  {i:>2}. {ax}")
    print("-" * 100)

    levels = [
        (PeanoConfig.ANALYSIS, "ANALYSIS  (Calculus shorthand)      "),
        (PeanoConfig.REAL,     "REAL      (Dedekind cut name)        "),
        (PeanoConfig.RATIONAL, "RATIONAL  (Cut over ℚ, named ℝ)     "),
        (PeanoConfig.INTEGER,  "INTEGER   (Cut over ℚ, ℚ=pairs of ℤ)"),
        (PeanoConfig.NATURAL,  "NATURAL   (ℤ=pairs of ℕ, ℕ decimal)  "),
        (PeanoConfig.PEANO,    "PEANO     (Everything as sets)       "),
    ]

    for code, label_lvl in levels:
        PeanoConfig.RENDER_LEVEL = code
        print(f"\n  [{label_lvl}]:\n    {obj.to_psl()}\n")

    # reset to default
    PeanoConfig.RENDER_LEVEL = PeanoConfig.ANALYSIS


if __name__ == "__main__":
    # -----------------------------------------------------------------
    # 1. Build the number 1 from first principles
    # -----------------------------------------------------------------
    n0   = NaturalNumber(0)
    n1   = NaturalNumber(1)
    z1   = Integer(n1, n0)                   # 1 as Integer = (1,0)
    r1   = Rational(z1, Integer(n1, n0))     # 1 as Rational = 1/1
    real_1 = Real(
        lambda q: Rational.greater_than(r1, q),
        "1",
        base_obj=r1
    )

    # -----------------------------------------------------------------
    # 2. Build the number 0 from first principles
    # -----------------------------------------------------------------
    z0   = Integer(n0, n0)
    r0   = Rational.from_int(0)
    real_0 = Real(lambda q: False, "0", base_obj=r0)

    # -----------------------------------------------------------------
    # 3. Define the square function  f(x) = x²
    # -----------------------------------------------------------------
    f_sq = Function(lambda x: x, "x²")

    # -----------------------------------------------------------------
    # 4. Build target objects
    # -----------------------------------------------------------------
    deriv    = Calculus.diff_map(f_sq, real_1)
    integral = Calculus.int_map(f_sq, real_0, real_1)

    # -----------------------------------------------------------------
    # 5. Run the zoom lens
    # -----------------------------------------------------------------
    inspect("The Derivative  D(x²)|₁", deriv)
    inspect("The Integral    ∫₀¹ x² dx", integral)