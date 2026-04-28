from real import Real
from apps.zfc_zoom_lens.ATTMPT3.logic import LensConfig, Logic, ZFC

class Topology:
    AXIOMS = Real.AXIOMS 

    @staticmethod
    def neighborhood_map(center_real, radius_real):
        """A ball B(c, r) dissolved into a membership predicate."""
        def neighborhood_logic_formatter():
            c_z = center_real.to_psl()
            r_z = radius_real.to_psl()
            r_set = Real.get_set_definition()
            
            # The neighborhood is the set of points y such that dist(y, c) < r
            # Logic.less_than handles the zoom level automatically
            condition = Logic.less_than(f"dist(y, {c_z})", r_z)
            return f"{{ y | {ZFC.membership('y', r_set)} ∧ {condition} }}"
        return neighborhood_logic_formatter

    @staticmethod
    def is_open_predicate(subset_name, space_name="ℝ"):
        """U is open if ∀x∈U, ∃ε>0 such that B(x, ε) ⊆ U."""
        def open_logic_formatter():
            # Neighborhood containment dissolved into ZFC subset logic
            ball = "B(x, ε)"
            containment = ZFC.subset(ball, subset_name)
            
            inner = Logic.exists("ε", space_name, containment)
            return Logic.forall("x", subset_name, inner)
        return open_logic_formatter