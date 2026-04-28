import itertools

"""
SYSTEM DEFINITION:
- BIVALENCE: Inputs are strictly restricted to {True, False}.
- DETERMINISM: The same inputs always produce the same output (Identity).

CLASSIFICATION CRITERIA:
- TAUTOLOGY: A statement whose truth-column is 100% True (A Logical Law).
- CONTRADICTION: A statement whose truth-column is 100% False (A Logical Violation).
- CONTINGENT: A statement whose truth-column is mixed (A Situational Fact).
"""

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    YELLOW = '\033[93m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

class LogicEngine:
    def __init__(self):
        self.rules = {
            "¬": lambda p: not p,
            "∧": lambda p, q: p and q,
            "∨": lambda p, q: p or q,
            "⊕": lambda p, q: p != q,
            "⇒": lambda p, q: (not p) or q,
            "⇔": lambda p, q: p == q
        }

    def evaluate(self, symbol, *args):
        return self.rules[symbol](*args)

class TableVisualizer:
    @staticmethod
    def print_table(variables, label, states, results):
        v_headers = [v.center(7) for v in variables]
        expr_header = label.center(len(label) + 4)
        header = f" {' | '.join(v_headers)} || {expr_header} | Logic Statusing"
        
        print(f"\n{Colors.BOLD}{header}{Colors.RESET}")
        print("-" * len(header))

        is_taut = all(results)
        is_contra = not any(results)

        for i, row in enumerate(states):
            res = results[i]
            v_cells = [str(val).center(7) for val in row]
            
            res_color = Colors.GREEN if res else Colors.RED
            res_cell = f"{res_color}{str(res).center(len(label) + 4)}{Colors.RESET}"
            
            if is_taut:
                status = f"{Colors.GREEN}VALID (AXIOM CONFIRMED){Colors.RESET}"
            elif is_contra:
                status = f"{Colors.RED}INVALID (PURE VIOLATION){Colors.RESET}"
            else:
                if res:
                    status = f"{Colors.YELLOW}CONTINGENT (SATISFIED){Colors.RESET}"
                else:
                    status = f"{Colors.CYAN}CONTINGENT (FALSIFIED){Colors.RESET}"

            print(f" {' | '.join(v_cells)} || {res_cell} | {status}")

        print("-" * len(header))
        
        if is_taut:
            print(f"{Colors.GREEN}FINAL CLASSIFICATION: TAUTOLOGY (The Law always holds){Colors.RESET}")
        elif is_contra:
            print(f"{Colors.RED}FINAL CLASSIFICATION: CONTRADICTION (The Law is always broken){Colors.RESET}")
        else:
            print(f"{Colors.YELLOW}FINAL CLASSIFICATION: CONTINGENT (The truth depends on the variables){Colors.RESET}")
        print("=" * len(header) + "\n")

def generate(variables, expression_func, label):
    engine = LogicEngine()
    states = list(itertools.product([True, False], repeat=len(variables)))
    results = [expression_func(dict(zip(variables, s)), engine) for s in states]
    TableVisualizer.print_table(variables, label, states, results)

if __name__ == "__main__":
    def syllogism(v, eng):
        p, q, r = v["P"], v["Q"], v["R"]
        step1 = eng.evaluate("⇒", p, q)
        step2 = eng.evaluate("⇒", q, r)
        conclusion = eng.evaluate("⇒", p, r)
        premise = eng.evaluate("∧", step1, step2)
        return eng.evaluate("⇒", premise, conclusion)

    def material_implication(v, eng):
        return eng.evaluate("⇒", v["P"], v["Q"])

    generate(["P", "Q", "R"], syllogism, "((P⇒Q) ∧ (Q⇒R)) ⇒ (P⇒R)")
    generate(["P", "Q"], material_implication, "P ⇒ Q")