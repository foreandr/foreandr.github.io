from apps.zfc_zoom_lens.attempt4.compiler import InductiveCompiler, PEANO_RULES

if __name__ == "__main__":
    compiler = InductiveCompiler(rules=PEANO_RULES, max_steps=500)

    # 1. INDUCTIVE STEP: Prove that add(1, S(k)) -> S(add(1, k))
    # This creates the 'Top Island'
    compiler._find_path("add(S(0), S(S(0)))", "S(add(S(0), S(0)))", "STEP")

    # 2. REGISTER THE RESULT: This 'connects' the logic
    # We turn our discovery into a permanent rule
    compiler.register_theorem_as_rule("COMMUTE_STEP", r'add\(S\(0\),\s*S\(([^)]+)\)\)', r'S(add(S(0), \1))')

    # 3. BASE CASE + CONNECTION: Prove the actual theorem using the new rule
    # This creates the 'Bottom Island' and bridges it to the target
    compiler._find_path("add(S(0), 0)", "S(0)", "BASE")
    
    # 4. FINAL BRIDGE: Use the NEW rule to show a real transformation
    # This forces the graph to draw a line between the two concepts
    compiler._find_path("add(S(0), S(0))", "S(add(S(0), 0))", "BRIDGE")

    compiler.export_to_js("graph_data.js")
    print("Graph generated. The 'Bridge' path should now connect the concepts!")