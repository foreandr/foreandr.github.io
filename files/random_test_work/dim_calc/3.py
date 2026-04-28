import math

def get_dynamic_rank(field_type, n_param=None, d=4):
    """Calculates fiber rank k from fundamental geometric formulas."""
    field_type = field_type.lower()
    
    if field_type == "sun":       # SU(n) Gauge (Weak/Strong)
        return n_param**2 - 1
    elif field_type == "un":      # U(n) Gauge (Electromagnetism)
        return n_param**2
    elif field_type == "spinor":   # Dirac Spinors
        return 2 * (2**(d // 2))
    elif field_type == "scalar":   # Higgs / Scalar fields
        return n_param  # Real degrees of freedom
    elif field_type == "tangent":  # Gravity (Base manifold)
        return d
    return 0

def calculate_unified_embedding(d, physics_model, compact=False):
    """Plugs dynamic ranks into Greene (1970) formulas."""
    total_k = sum(get_dynamic_rank(f, p, d) for f, p in physics_model)
    
    # Greene's Non-Compact General Metric Embedding (Section VI)
    # n = (2d + 1) * (k + 5)
    if compact:
        n = (d / 2) * (total_k + 5)
    else:
        n = (2 * d + 1) * (total_k + 5)
        
    n = math.ceil(n)
    return {
        "Total Internal Rank (k)": total_k,
        "Ambient Space Signature": f"R_{n}^{n}",
        "Total Dimensions Required": 2 * n
    }

# --- THE FULL STANDARD MODEL CALCULATION ---
standard_model = [
    ("tangent", 0),   # Gravity (k=4)
    ("sun", 3),       # Strong Force/SU(3) (k=8)
    ("sun", 2),       # Weak Force/SU(2) (k=3)
    ("un", 1),        # EM/U(1) (k=1)
    ("spinor", 0),    # Matter/Spinors (k=8)
    ("scalar", 2)     # Higgs Field (k=2)
]

print(calculate_unified_embedding(4, standard_model))