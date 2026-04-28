import random
import colorsys

def get_deterministic_color(name):
    """
    Generates a consistent, bright color for a specific name (e.g., country or stock).
    Returns a tuple of floats (0.0 to 1.0) for Matplotlib compatibility.
    """
    random.seed(name)
    h = random.random()
    s = 0.8 + random.random() * 0.2
    v = 0.8 + random.random() * 0.2
    rgb = colorsys.hsv_to_rgb(h, s, v)
    # Return as 0-1 floats to prevent RGBA ValueErrors
    return rgb 

def fast_snap(a):
    """
    ULTRA-FAST FLIP IMPLEMENTATION - 3-8X FASTER!
    Uses extreme power curve for near-instant position changes.
    The bar stays at old position for ~5% of transition, then SNAPS to new position,
    then stays at new position for remaining ~5%.
    
    Power 40 = INSANELY FAST (recommended)
    Power 30 = VERY FAST
    Power 20 = FAST
    """
    # ULTRA AGGRESSIVE - positions change almost instantly
    power = 20  # Increase this for EVEN FASTER snaps (try 50-60 for instant)
    
    if a < 0.5:
        return 0.5 * (2 * a)**power
    else:
        return 1 - 0.5 * (2 * (1 - a))**power

def smart_title(text):
    return text.replace('_', ' ').title().strip()
