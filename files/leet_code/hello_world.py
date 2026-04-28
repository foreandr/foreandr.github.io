# Pascal's Triangle exercise (recursive)
# Replace placeholder with working solution

def rows(row_count):
    if row_count < 0:
        raise ValueError("number of rows is negative")
    if row_count == 0:
        return []

    def build_row(n):
        if n == 1:
            return [1]
        prev = build_row(n - 1)
        middle = [prev[i - 1] + prev[i] for i in range(1, len(prev))]
        return [1] + middle + [1]

    return [build_row(i) for i in range(1, row_count + 1)]
