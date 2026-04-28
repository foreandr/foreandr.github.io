import os
from llama_cpp import Llama

# Load Model from a stable absolute path
MODEL_PATH = os.path.expanduser("~/.cache/local_llm_models/models/bartowski__gemma-2-2b-it-GGUF/gemma-2-2b-it-Q3_K_L.gguf")
llm = Llama(model_path=MODEL_PATH, n_ctx=1024, verbose=False)

def ask_history(data_point):
    """
    Explains the 'why' behind a data trend.
    The prompt is generic so it works for IMF, World Bank, or Stocks.
    """
    system_msg = "You are a specialized historian. When given a data point, explain the underlying cause in one or two concise sentences."
    
    prompt = (
        f"<|im_start|>system\n{system_msg}<|im_end|>\n"
        f"<|im_start|>user\nData: {data_point}. What was the primary cause of this change?<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )
    
    output = llm(
        prompt, 
        max_tokens=140, 
        temperature=0.7, 
        repeat_penalty=1.2, 
        stop=["<|im_end|>", "\n\n"], 
        echo=False
    )
    
    return output["choices"][0]["text"]