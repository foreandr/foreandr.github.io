import subprocess
import os
import re

def tell_codex_to_create_file():
    current_dir = os.path.abspath(os.getcwd())
    file_path = os.path.join(current_dir, "hello_world.py")
    
    # We ask Codex to just give us the code block
    instruction = "Give me the python code for a hello world script. Wrap it in triple backticks."
    
    print("Asking Codex for code...")

    result = subprocess.run(
        ["codex", "exec", instruction],
        capture_output=True,
        text=True,
        shell=True 
    )

    # Extract the code between ```python and ```
    match = re.search(r"```python\n(.*?)\n```", result.stdout, re.DOTALL)
    
    if match:
        code_content = match.group(1)
        # Python writes the file because the Codex Sandbox is locked
        with open(file_path, "w") as f:
            f.write(code_content)
        print(f"✅ SUCCESS: Python wrote the file at {file_path}")
    else:
        print("❌ Could not find a code block in Codex response.")
        print("Codex said:", result.stdout)

if __name__ == "__main__":
    tell_codex_to_create_file()