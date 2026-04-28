import os
from huggingface_hub import hf_hub_download

def download_model():
    # Correct model identifiers for bartowski's Gemma 2 2b repo
    repo_id = "bartowski/gemma-2-2b-it-GGUF"
    filename = "gemma-2-2b-it-Q3_K_L.gguf"
    
    # Define the exact folder and file path
    target_dir = os.path.expanduser("~/.cache/local_llm_models/models/bartowski__gemma-2-2b-it-GGUF")
    full_path = os.path.join(target_dir, filename)

    # Ensure the directory exists before downloading
    os.makedirs(target_dir, exist_ok=True)

    # Check if the file already exists
    if os.path.exists(full_path):
        print(f"Model already exists at: {full_path}")
        return full_path

    print(f"Model not found. Downloading {filename}...")
    
    # Downloads the specific GGUF file to your target directory
    return hf_hub_download(
        repo_id=repo_id,
        filename=filename,
        local_dir=target_dir,
        local_dir_use_symlinks=False
    )

if __name__ == "__main__":
    try:
        path = download_model()
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")