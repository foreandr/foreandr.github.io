import math

def calculate_clarke_dimensions(m, compact=False, is_hyperbolic=False, rank=None, signature=None):
    """
    Final implementation of Clarke (1970) embedding rules.
    """
    # Rule 1: Calculate the base q value (Theorems 1 & 2)
    if compact:
        q_base = math.ceil(0.5 * m * (3 * m + 11))
    else:
        q_base = math.ceil((1/6) * m * (2 * m**2 + 37) + (2.5 * m**2) + 1)

    # Rule 2: Determine p (Negative Dimensions)
    if is_hyperbolic:
        # Lemma 8: p=1 for globally hyperbolic space-times
        p = 1
    elif rank is not None and signature is not None:
        # Theorem 2: General formula for p
        p = math.ceil(m - 0.5 * (rank + signature) + 1)
    else:
        # Default to Riemannian (p=0) if no indefinite info provided
        p = 0

    # Rule 3: Ambient Space Structure E^{p, q+p}
    # Clarke defines the space-like portion as q + p
    positive_dims = q_base + p
    total_dims = p + positive_dims

    return {
        "m": m,
        "p (negative)": p,
        "q_final (positive)": positive_dims,
        "total_ambient_dimension": total_dims,
        "signature_notation": f"E^{{{p}, {positive_dims}}}"
    }

# --- STRESS TESTS ---
if __name__ == "__main__":
    # Test 1: Standard GR Space-time (Non-compact) -> Should be E^{2, 89} (Total 91)
    print("Test 1 (GR Non-compact):", calculate_clarke_dimensions(m=4, compact=False, rank=4, signature=2))
    
    # Test 2: Standard GR Space-time (Compact) -> Should be E^{2, 48} (Total 50)
    # Note: 46 (q) + 2 (p) = 48 positive dims. Total 50.
    print("Test 2 (GR Compact):    ", calculate_clarke_dimensions(m=4, compact=True, rank=4, signature=2))
    
    # Test 3: Globally Hyperbolic -> Should be E^{1, 88} (Total 89)
    print("Test 3 (Hyperbolic):    ", calculate_clarke_dimensions(m=4, compact=False, is_hyperbolic=True))