from apps.zfc_zoom_lens.ATTMPT3.logic import LogicEngine, Colors

class FOL_Syntax:
    def __init__(self):
        self.engine = LogicEngine()

    def forall(self, var, formula):
        return f"∀ {var}({formula})"

    def exists(self, var, formula):
        return f"∃ {var}({formula})"

    def apply_op(self, symbol, *args):
        # We leverage the LogicEngine's internal knowledge of symbols
        # Even though we aren't "calculating" True/False yet, 
        # the Engine knows what symbols exist.
        if symbol in self.engine.rules:
            # We return a syntactic string using the engine's symbol
            return f"({f' {symbol} '.join(map(str, args))})"
        return f"Unknown_Op({args})"

if __name__ == "__main__":
    fol = FOL_Syntax()
    
    # 1. Variables and Predicates
    x = "x"
    y = "y"
    Px = "P(x)"
    Rxy = "R(x, y)"

    # 2. Reusing the LogicEngine symbols via apply_op
    # Instead of hardcoding '⇒', we ask the engine to join them.
    inner_rule = fol.apply_op("⇒", Px, fol.exists(y, Rxy))
    
    # 3. Wrapping in the Quantifier
    full_formula = fol.forall(x, inner_rule)

    print(f"\n{Colors.CYAN}SYNTAX REUSING LOGIC ENGINE:{Colors.RESET}")
    print(f"{Colors.BOLD}{full_formula}{Colors.RESET}")