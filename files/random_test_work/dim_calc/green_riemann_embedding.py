import math

def greene_embedding_dimensions(d, compact=True, metric_type="riemannian"):
    """
    Greene (1970): Isometric embedding dimension calculator for manifolds
    with general metrics (quadratic forms on the tangent bundle).
    
    d: Dimension of the manifold M.
    compact: Boolean, whether the manifold is compact[cite: 119, 121].
    metric_type: "riemannian" or "general"[cite: 114, 115].
    """
    results = {"dimension": d, "compact": compact, "metric_type": metric_type}

    if compact:
        if metric_type == "riemannian":
            # Nash's result for compact Riemannian manifolds 
            # k = d/2 * (3d + 11)
            k = math.ceil((d / 2) * (3 * d + 11))
            results.update({
                "ambient_space": f"R^{k}",
                "total_dimension": k,
                "theory": "Nash/Greene Compact Riemannian"
            })
        else:
            # Compact manifold with arbitrary (general) metric 
            # k = d/2 * (d + 5) in space R^k_k
            k = math.ceil((d / 2) * (d + 5))
            results.update({
                "ambient_space": f"R_{k}^{k}",
                "total_dimension": 2 * k,
                "theory": "Greene Compact General Metric"
            })
    else:
        # Non-compact manifolds (or general d-dimensional manifolds) [cite: 121, 122]
        if metric_type == "riemannian":
            # k = (2d + 1)(6d + 14) 
            k = (2 * d + 1) * (6 * d + 14)
            results.update({
                "ambient_space": f"R^{k}",
                "total_dimension": k,
                "theory": "Greene Non-Compact Riemannian"
            })
        else:
            # k = (2d + 1)(2d + 6) 
            k = (2 * d + 1) * (2 * d + 6)
            results.update({
                "ambient_space": f"R_{k}^{k}", # Signature (k, k) assumed for arbitrary metric 
                "total_dimension": 2 * k,
                "theory": "Greene Non-Compact General Metric"
            })

    return results

# ============================================================
# CALLING THE CODE (Examples from Greene 1970)
# ============================================================

if __name__ == "__main__":
    print("--- Greene 1970 Isometric Embedding Results ---\n")

    # Example 1: Compact Riemannian Manifold (d=4)
    # Expected: 4/2 * (12 + 11) = 2 * 23 = 46
    print("1) Compact Riemannian (d=4):")
    print(greene_embedding_dimensions(d=4, compact=True, metric_type="riemannian"))
    print()

    # Example 2: Compact General Metric (d=4)
    # Expected: k = 4/2 * (4 + 5) = 2 * 9 = 18. Space R^18_18
    print("2) Compact General Metric (d=4):")
    print(greene_embedding_dimensions(d=4, compact=True, metric_type="general"))
    print()

    # Example 3: Non-Compact Riemannian (d=4)
    # Expected: (8 + 1) * (24 + 14) = 9 * 38 = 342
    print("3) Non-Compact Riemannian (d=4):")
    print(greene_embedding_dimensions(d=4, compact=False, metric_type="riemannian"))
    print()

    # Example 4: Non-Compact General Metric (d=4)
    # Expected: k = (8 + 1) * (8 + 6) = 9 * 14 = 126. Space R^126_126
    print("4) Non-Compact General Metric (d=4):")
    print(greene_embedding_dimensions(d=4, compact=False, metric_type="general"))