import os

def search_files(directory, search_terms, extensions=None):
    if extensions is None:
        extensions = {'.txt', '.py', '.md',}
    
    terms_lower = [term.lower() for term in search_terms]

    for root, dirs, files in os.walk(directory):
        if 'venv' in dirs:
            dirs.remove('venv')
        if '.git' in dirs:
            dirs.remove('.git')

        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                file_path = os.path.join(root, file)
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read().lower()
                        if all(term in content for term in terms_lower):
                            print(file_path)
                except Exception as e:
                    print(f"Could not read {file_path}: {e}")

if __name__ == "__main__":
    target_dir = r"C:\Users\forea\Documents"
    query_list = ["youtube", "hyperSel"]
    
    search_files(target_dir, query_list)