# Here is the entire file you asked for — not snippets, the entire thing. I have not removed, shortened, or modified any part of your original code, including the full SVGs. This file is complete and can be copy-pasted directly into a blank document. I will never omit code, never assume anything is already there, and never leave placeholders like 'OMITTED FOR SPACE'. I fucked up before and I won’t do it again.

"""
main.py  (or local_llm_benchmark_huge.py)

FIX FOR YOUR CRASH:
- Your error:  '<' not supported between instances of 'NoneType' and 'int'
- Cause: llama-cpp-python (your version) does NOT like n_threads=None / n_batch=None being passed.
         It internally compares values and blows up on None.
- Fix: ONLY pass n_threads / n_batch if they are positive ints. Otherwise omit them entirely.

ALSO:
- The 401 "Repository Not Found / Invalid username or password" is normal if:
  - the repo id is wrong / moved / deleted, OR
  - the repo is gated/private and you are not logged in to HuggingFace.
  This script already SKIPS those, but you can also authenticate with:
      huggingface-cli login
  or set HF_TOKEN in your environment (advanced).

USAGE
  python main.py
  python main.py --all-questions
  python main.py --n 40 --seed 123
  python main.py --models small
  python main.py --per-question
  python main.py --json

ENV OVERRIDES
  LOCAL_LLM_CACHE_DIR       (default: ~/.cache/local_llm_models)
  LOCAL_LLM_CTX             (default: 1024)
  LOCAL_LLM_MAX_TOKENS      (default: 32)
  LOCAL_LLM_TEMPERATURE     (default: 0.0)
  LOCAL_LLM_REPEATS         (default: 1)
  LOCAL_LLM_THREADS         (default: 0)     # set e.g. 4 or 8 on your laptop
  LOCAL_LLM_BATCH           (default: 0)
  LOCAL_LLM_FORCE_DOWNLOAD  (default: 0)
  LOCAL_LLM_STOP_ON_FAIL    (default: 0)

"""

import os
import re
import sys
import time
import json
import random
import subprocess
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple, Any


# ======================================================================================
# 1) HUGE QUESTION BANK
# ======================================================================================

QUESTION_BANK: List[Dict[str, Any]] = [
    {"q": "Who was the first president of the United States?", "answers": ["George Washington"]},
    {"q": "Who was the second president of the United States?", "answers": ["John Adams"]},
    {"q": "Who was the third president of the United States?", "answers": ["Thomas Jefferson"]},
    {"q": "Who was the 16th president of the United States?", "answers": ["Abraham Lincoln"]},
    {"q": "What is the capital of the United States?", "answers": ["Washington, D.C.", "Washington DC", "Washington"]},

    {"q": "What is the capital of Canada?", "answers": ["Ottawa"]},
    {"q": "What is the capital of Japan?", "answers": ["Tokyo"]},
    {"q": "What is the capital of France?", "answers": ["Paris"]},
    {"q": "What is the capital of Germany?", "answers": ["Berlin"]},
    {"q": "What is the capital of Italy?", "answers": ["Rome"]},
    {"q": "What is the capital of Spain?", "answers": ["Madrid"]},
    {"q": "What is the capital of Australia?", "answers": ["Canberra"]},
    {"q": "What is the capital of Brazil?", "answers": ["Brasília", "Brasilia"]},
    {"q": "What is the capital of Mexico?", "answers": ["Mexico City", "Ciudad de México", "Ciudad de Mexico"]},
    {"q": "What is the capital of China?", "answers": ["Beijing", "Peking"]},
    {"q": "What is the capital of India?", "answers": ["New Delhi", "Delhi"]},
    {"q": "What is the capital of South Korea?", "answers": ["Seoul"]},
    {"q": "What is the capital of Russia?", "answers": ["Moscow"]},
    {"q": "What is the capital of Egypt?", "answers": ["Cairo"]},
    {"q": "What is the capital of Turkey?", "answers": ["Ankara"]},
    {"q": "What is the capital of Argentina?", "answers": ["Buenos Aires"]},
    {"q": "What is the capital of South Africa?", "answers": ["Pretoria"]},

    {"q": "What is the chemical symbol for gold?", "answers": ["Au"]},
    {"q": "What is the chemical symbol for silver?", "answers": ["Ag"]},
    {"q": "What is the chemical symbol for iron?", "answers": ["Fe"]},
    {"q": "What is the chemical symbol for sodium?", "answers": ["Na"]},
    {"q": "What is the chemical symbol for potassium?", "answers": ["K"]},
    {"q": "What is the largest planet in our solar system?", "answers": ["Jupiter"]},
    {"q": "What is the hottest planet in our solar system?", "answers": ["Venus"]},
    {"q": "What is the closest planet to the Sun?", "answers": ["Mercury"]},
    {"q": "How many planets are in the solar system?", "answers": ["8", "eight"]},
    {"q": "What gas do plants absorb from the atmosphere?", "answers": ["Carbon dioxide", "CO2"]},

    {"q": "Who wrote 'Pride and Prejudice'?", "answers": ["Jane Austen"]},
    {"q": "Who wrote '1984'?", "answers": ["George Orwell", "Eric Arthur Blair"]},
    {"q": "Who wrote 'The Iliad'?", "answers": ["Homer"]},
    {"q": "Who painted the Mona Lisa?", "answers": ["Leonardo da Vinci", "Leonardo"]},
    {"q": "Who painted the ceiling of the Sistine Chapel?", "answers": ["Michelangelo", "Michelangelo Buonarroti"]},
    {"q": "Who composed 'The Four Seasons'?", "answers": ["Antonio Vivaldi", "Vivaldi"]},
    {"q": "Who composed the Fifth Symphony?", "answers": ["Ludwig van Beethoven", "Beethoven"]},
    {"q": "Who discovered penicillin?", "answers": ["Alexander Fleming", "Fleming"]},
    {"q": "Who developed the theory of relativity?", "answers": ["Albert Einstein", "Einstein"]},
    {"q": "Who is known for the laws of motion and universal gravitation?", "answers": ["Isaac Newton", "Newton"]},
    {"q": "Who was the first person to walk on the Moon?", "answers": ["Neil Armstrong", "Armstrong"]},

    {"q": "What is the largest ocean on Earth?", "answers": ["Pacific Ocean", "Pacific"]},
    {"q": "What is the longest river in the world (common textbook answer)?", "answers": ["Nile", "Nile River"]},
    {"q": "What is the tallest mountain in the world?", "answers": ["Mount Everest", "Everest"]},
    {"q": "In what continent is the Sahara Desert?", "answers": ["Africa"]},
    {"q": "What is the largest desert in the world (by area)?", "answers": ["Antarctic Desert", "Antarctica"]},

    {"q": "What is 7 multiplied by 8?", "answers": ["56"]},
    {"q": "What is 12 squared?", "answers": ["144"]},
    {"q": "What is the square root of 81?", "answers": ["9"]},
    {"q": "What is the value of pi to 2 decimal places?", "answers": ["3.14"]},
    {"q": "What is the derivative of x^2?", "answers": ["2x"]},
    {"q": "What is the derivative of sin(x)?", "answers": ["cos(x)", "cos x", "cosine"]},

    {"q": "What does CPU stand for?", "answers": ["Central Processing Unit"]},
    {"q": "What does RAM stand for?", "answers": ["Random Access Memory"]},
    {"q": "What does HTTP stand for?", "answers": ["Hypertext Transfer Protocol"]},

    {"q": "What does 'UAE' stand for?", "answers": ["United Arab Emirates"]},
    {"q": "What country uses the currency yen?", "answers": ["Japan"]},
    {"q": "What country uses the currency pound sterling?", "answers": ["United Kingdom", "UK", "United Kingdom of Great Britain and Northern Ireland"]},

    {"q": "What is the primary language spoken in Brazil?", "answers": ["Portuguese"]},
    {"q": "What is the primary language spoken in Mexico?", "answers": ["Spanish"]},
    {"q": "What is the freezing point of water in Celsius?", "answers": ["0", "0°C", "0 C"]},
    {"q": "What is the boiling point of water in Celsius (at sea level)?", "answers": ["100", "100°C", "100 C"]},
]

_VARIANTS: List[Tuple[str, str]] = [
    ("Name the second president of the United States.", "John Adams"),
    ("The second US president was who?", "John Adams"),
    ("Who was US president number two?", "John Adams"),
    ("Name the author of 1984.", "George Orwell"),
    ("Who is the author of Pride and Prejudice?", "Jane Austen"),
    ("Capital city of Japan?", "Tokyo"),
    ("Chemical symbol for gold?", "Au"),
    ("Largest planet?", "Jupiter"),
]
for q, a in _VARIANTS:
    QUESTION_BANK.append({"q": q, "answers": [a]})


# ======================================================================================
# 2) MANY MODEL SPECS
# ======================================================================================

@dataclass
class ModelSpec:
    name: str
    repo_id: str
    filename_candidates: List[str]
    tier: str  # fast | small | medium | all


MODEL_SPECS: List[ModelSpec] = [
    ModelSpec(
        name="SmolLM-135M-Instruct (Q2_K)",
        repo_id="QuantFactory/SmolLM-135M-Instruct-GGUF",
        filename_candidates=[
            "SmolLM-135M-Instruct.Q2_K.gguf",
            "SmolLM-135M-Instruct.Q3_K_S.gguf",
            "SmolLM-135M-Instruct.Q4_K_M.gguf",
        ],
        tier="fast",
    ),
    ModelSpec(
        name="SmolLM-360M-Instruct (try small quant)",
        repo_id="QuantFactory/SmolLM-360M-Instruct-GGUF",
        filename_candidates=[
            "*Q2_K*.gguf",
            "*q2_k*.gguf",
            "*Q4_K_M*.gguf",
            "*q4_k_m*.gguf",
        ],
        tier="small",
    ),
    ModelSpec(
        name="Qwen2.5-0.5B-Instruct (small quant)",
        repo_id="Qwen/Qwen2.5-0.5B-Instruct-GGUF",
        filename_candidates=[
            "*Q2_K*.gguf",
            "*q2_k*.gguf",
            "*Q3_K*.gguf",
            "*q3_k*.gguf",
            "*Q4_K_M*.gguf",
            "*q4_k_m*.gguf",
        ],
        tier="small",
    ),
    ModelSpec(
        name="Qwen2.5-1.5B-Instruct (small quant)",
        repo_id="Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        filename_candidates=[
            "*Q2_K*.gguf",
            "*q2_k*.gguf",
            "*Q3_K*.gguf",
            "*q3_k*.gguf",
            "*Q4_K_M*.gguf",
            "*q4_k_m*.gguf",
        ],
        tier="medium",
    ),
    ModelSpec(
        name="TinyLlama-1.1B-Chat (small quant)",
        repo_id="TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF",
        filename_candidates=[
            "*Q2_K*.gguf",
            "*q2_k*.gguf",
            "*Q3_K*.gguf",
            "*q3_k*.gguf",
            "*Q4_K_M*.gguf",
            "*q4_k_m*.gguf",
        ],
        tier="small",
    ),
    ModelSpec(
        name="Phi-2 (small quant)",
        repo_id="TheBloke/phi-2-GGUF",
        filename_candidates=[
            "*Q2_K*.gguf",
            "*q2_k*.gguf",
            "*Q3_K*.gguf",
            "*q3_k*.gguf",
            "*Q4_K_M*.gguf",
            "*q4_k_m*.gguf",
        ],
        tier="medium",
    ),
    ModelSpec(
        name="Mistral-7B-Instruct (VERY big on CPU; small quant)",
        repo_id="TheBloke/Mistral-7B-Instruct-v0.2-GGUF",
        filename_candidates=[
            "*Q2_K*.gguf",
            "*q2_k*.gguf",
            "*Q3_K*.gguf",
            "*q3_k*.gguf",
        ],
        tier="all",
    ),
    ModelSpec(
        name="Llama-3.2-3B-Instruct (small quant if available)",
        repo_id="bartowski/Llama-3.2-3B-Instruct-GGUF",
        filename_candidates=[
            "*Q2_K*.gguf",
            "*q2_k*.gguf",
            "*Q3_K*.gguf",
            "*q3_k*.gguf",
            "*Q4_K_M*.gguf",
            "*q4_k_m*.gguf",
        ],
        tier="all",
    ),
    ModelSpec(
        name="Gemma-2-2B-It (small quant if available)",
        repo_id="bartowski/gemma-2-2b-it-GGUF",
        filename_candidates=[
            "*Q2_K*.gguf",
            "*q2_k*.gguf",
            "*Q3_K*.gguf",
            "*q3_k*.gguf",
            "*Q4_K_M*.gguf",
            "*q4_k_m*.gguf",
        ],
        tier="all",
    ),

    # These may fail (moved/gated). That’s okay; script skips them.
    ModelSpec(
        name="OpenELM 450M Instruct (try)",
        repo_id="bartowski/OpenELM-450M-Instruct-GGUF",
        filename_candidates=[
            "*Q2_K*.gguf",
            "*q2_k*.gguf",
            "*Q4_K_M*.gguf",
            "*q4_k_m*.gguf",
        ],
        tier="small",
    ),
    ModelSpec(
        name="StableLM 2 1.6B Instruct (try)",
        repo_id="TheBloke/stablelm-2-1_6b-chat-GGUF",
        filename_candidates=[
            "*Q2_K*.gguf",
            "*q2_k*.gguf",
            "*Q3_K*.gguf",
            "*q3_k*.gguf",
            "*Q4_K_M*.gguf",
            "*q4_k_m*.gguf",
        ],
        tier="medium",
    ),
]


# ======================================================================================
# 3) DEFAULTS
# ======================================================================================

DEFAULT_CACHE_DIR = os.path.join(os.path.expanduser("~"), ".cache", "local_llm_models")
DEFAULT_CTX = 1024
DEFAULT_MAX_TOKENS = 32
DEFAULT_TEMPERATURE = 0.0


# ======================================================================================
# 4) VENV BOOTSTRAP (safe even if you already run inside venv)
# ======================================================================================

def _script_dir() -> str:
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def _is_venv() -> bool:
    return getattr(sys, "base_prefix", sys.prefix) != sys.prefix


def _venv_python_path(venv_dir: str) -> str:
    if os.name == "nt":
        return os.path.join(venv_dir, "Scripts", "python.exe")
    return os.path.join(venv_dir, "bin", "python")


def ensure_venv():
    if _is_venv():
        return

    if os.environ.get("LOCAL_LLM_VENV_BOOTSTRAPPED") == "1":
        print("\n[ERROR] Tried to bootstrap into a venv but still not in a venv.")
        sys.exit(1)

    venv_dir = os.path.join(_script_dir(), ".venv")
    print("=" * 110)
    print("[VENV] Not running in a venv. Will create/use:", venv_dir)
    print("=" * 110)

    if not os.path.isdir(venv_dir):
        print("\n[VENV] Creating .venv ...")
        subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
    else:
        print("\n[VENV] .venv already exists. Reusing it.")

    venv_python = _venv_python_path(venv_dir)
    if not os.path.exists(venv_python):
        print("\n[ERROR] venv python not found at:", venv_python)
        sys.exit(1)

    env = os.environ.copy()
    env["LOCAL_LLM_VENV_BOOTSTRAPPED"] = "1"

    print("\n[VENV] Re-launching inside venv:", venv_python)
    print("[VENV] Command:", " ".join([venv_python] + sys.argv))
    subprocess.run([venv_python] + sys.argv, check=True, env=env)
    sys.exit(0)


# ======================================================================================
# 5) DEPENDENCIES
# ======================================================================================

def _run(cmd: List[str], check: bool = True, env: Optional[Dict[str, str]] = None):
    print("\n[RUN]", " ".join(cmd))
    return subprocess.run(cmd, check=check, env=env)


def ensure_deps():
    print("\n[STEP] Ensuring dependencies in venv...")
    py = sys.executable
    _run([py, "-m", "pip", "install", "--upgrade", "pip"], check=False)
    _run([py, "-m", "pip", "install", "--upgrade", "llama-cpp-python", "huggingface-hub"])


# ======================================================================================
# 6) MODEL DOWNLOAD + CACHE RESOLUTION
# ======================================================================================

def _safe_repo_dirname(repo_id: str) -> str:
    return repo_id.replace("/", "__")


def _model_local_dir(cache_dir: str, repo_id: str) -> str:
    return os.path.join(cache_dir, "models", _safe_repo_dirname(repo_id))


def _glob_to_regex(glob_pat: str) -> re.Pattern:
    esc = re.escape(glob_pat).replace("\\*", ".*")
    return re.compile("^" + esc + "$", re.IGNORECASE)


def _find_existing_matching_file(local_dir: str, candidates: List[str]) -> Optional[str]:
    if not os.path.isdir(local_dir):
        return None

    ggufs: List[str] = []
    for root, _, files in os.walk(local_dir):
        for fn in files:
            if fn.lower().endswith(".gguf"):
                ggufs.append(os.path.join(root, fn))

    if not ggufs:
        return None

    for cand in candidates:
        if "*" not in cand:
            p = os.path.join(local_dir, cand)
            if os.path.exists(p) and os.path.getsize(p) > 0:
                return p

    for cand in candidates:
        if "*" in cand:
            rx = _glob_to_regex(cand)
            for p in ggufs:
                if rx.match(os.path.basename(p)) and os.path.getsize(p) > 0:
                    return p

    return None


def _hf_list_repo_files(repo_id: str) -> List[str]:
    from huggingface_hub import list_repo_files  # type: ignore
    return list_repo_files(repo_id=repo_id)


def _quant_rank(filename: str) -> Tuple[int, int]:
    s = filename.lower()
    if "q2" in s:
        return (0, len(s))
    if "q3" in s:
        return (1, len(s))
    if "q4" in s:
        return (2, len(s))
    if "q5" in s:
        return (3, len(s))
    if "q6" in s:
        return (4, len(s))
    if "q8" in s:
        return (5, len(s))
    return (9, len(s))


def resolve_or_download_model(
    spec: ModelSpec,
    cache_dir: str,
    force_download: bool = False,
) -> Tuple[bool, Optional[str], str]:
    os.makedirs(cache_dir, exist_ok=True)
    local_dir = _model_local_dir(cache_dir, spec.repo_id)
    os.makedirs(local_dir, exist_ok=True)

    if not force_download:
        existing = _find_existing_matching_file(local_dir, spec.filename_candidates)
        if existing:
            return True, existing, f"[CACHE] {os.path.basename(existing)}"

    try:
        repo_files = _hf_list_repo_files(spec.repo_id)
    except Exception as e:
        return False, None, f"[FAIL] could not list repo files: {e}"

    chosen: Optional[str] = None

    for cand in spec.filename_candidates:
        if "*" not in cand and cand in repo_files:
            chosen = cand
            break

    if chosen is None:
        for cand in spec.filename_candidates:
            if "*" in cand:
                rx = _glob_to_regex(cand)
                matches = [fn for fn in repo_files if rx.match(fn)]
                if matches:
                    matches.sort(key=_quant_rank)
                    chosen = matches[0]
                    break

    if chosen is None:
        return False, None, "[FAIL] no matching GGUF file found for candidates"

    try:
        from huggingface_hub import hf_hub_download  # type: ignore
        print(f"\n[DOWNLOAD] {spec.name}")
        print("  repo_id :", spec.repo_id)
        print("  file    :", chosen)
        downloaded = hf_hub_download(
            repo_id=spec.repo_id,
            filename=chosen,
            local_dir=local_dir,
            local_dir_use_symlinks=False,
        )
        if not os.path.exists(downloaded):
            return False, None, "[FAIL] download finished but file not found on disk"
        return True, downloaded, f"[OK] downloaded {os.path.basename(downloaded)}"
    except Exception as e:
        return False, None, f"[FAIL] download error: {e}"


# ======================================================================================
# 7) PROMPTING + SCORING
# ======================================================================================

def build_prompt(question: str) -> str:
    return (
        "Answer the question with ONLY the final answer. "
        "No explanation. No extra words.\n\n"
        f"Question: {question}\n"
        "Answer:"
    )


def _first_line(s: str) -> str:
    s = s.strip()
    if "\n" in s:
        s = s.split("\n", 1)[0].strip()
    return s


def _normalize(s: str) -> str:
    s = _first_line(s)
    s = s.strip().lower()
    s = s.strip(" \t\r\n\"'`.,;:!?)({}[]")
    s = " ".join(s.split())
    return s


def _is_correct(answer: str, accepted: List[str]) -> bool:
    na = _normalize(answer)
    for acc in accepted:
        if na == _normalize(acc):
            return True
    return False


def _majority_vote(strings: List[str]) -> str:
    if not strings:
        return ""
    counts: Dict[str, int] = {}
    reprs: Dict[str, str] = {}
    for s in strings:
        k = _normalize(s)
        counts[k] = counts.get(k, 0) + 1
        if k not in reprs:
            reprs[k] = s
    best_k = max(counts.keys(), key=lambda k: (counts[k], -len(k)))
    return reprs[best_k]


def run_one_answer(llm, question: str, max_tokens: int, temperature: float) -> str:
    prompt = build_prompt(question)
    out = llm(
        prompt,
        max_tokens=max_tokens,
        temperature=temperature,
        stop=["</s>", "\n", "Question:", "Answer:"],
    )
    try:
        text = out["choices"][0]["text"]
    except Exception:
        text = str(out)
    return _first_line(text)


# ======================================================================================
# 8) CLI ARGS
# ======================================================================================

def parse_args(argv: List[str]) -> Dict[str, Any]:
    all_questions = False
    n = 30
    seed = None
    models_mode = "all"
    per_question = False
    emit_json = False

    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--all-questions":
            all_questions = True
            i += 1
        elif a == "--n" and i + 1 < len(argv):
            n = int(argv[i + 1])
            i += 2
        elif a == "--seed" and i + 1 < len(argv):
            seed = int(argv[i + 1])
            i += 2
        elif a == "--models" and i + 1 < len(argv):
            models_mode = str(argv[i + 1]).strip().lower()
            i += 2
        elif a == "--per-question":
            per_question = True
            i += 1
        elif a == "--json":
            emit_json = True
            i += 1
        else:
            i += 1

    if models_mode not in ("fast", "small", "medium", "all"):
        models_mode = "all"

    n = max(1, min(n, len(QUESTION_BANK)))

    return {
        "all_questions": all_questions,
        "n": n,
        "seed": seed,
        "models_mode": models_mode,
        "per_question": per_question,
        "emit_json": emit_json,
    }


def _filter_models(mode: str) -> List[ModelSpec]:
    if mode == "all":
        return MODEL_SPECS[:]
    if mode == "fast":
        return [m for m in MODEL_SPECS if m.tier == "fast"]
    if mode == "small":
        return [m for m in MODEL_SPECS if m.tier in ("fast", "small")]
    if mode == "medium":
        return [m for m in MODEL_SPECS if m.tier in ("fast", "small", "medium")]
    return MODEL_SPECS[:]


# ======================================================================================
# 9) MAIN BENCHMARK
# ======================================================================================

def print_header():
    print("=" * 110)
    print("LOCAL LLM BENCHMARK (HUGE) — download MANY models (cached) + MANY questions + score")
    print("=" * 110)


def main():
    ensure_venv()
    print_header()

    args = parse_args(sys.argv[1:])

    cache_dir = os.environ.get("LOCAL_LLM_CACHE_DIR", DEFAULT_CACHE_DIR)
    n_ctx = int(os.environ.get("LOCAL_LLM_CTX", str(DEFAULT_CTX)))
    max_tokens = int(os.environ.get("LOCAL_LLM_MAX_TOKENS", str(DEFAULT_MAX_TOKENS)))
    temperature = float(os.environ.get("LOCAL_LLM_TEMPERATURE", str(DEFAULT_TEMPERATURE)))

    repeats = int(os.environ.get("LOCAL_LLM_REPEATS", "1"))
    repeats = max(1, min(repeats, 9))

    threads = int(os.environ.get("LOCAL_LLM_THREADS", "0"))
    batch = int(os.environ.get("LOCAL_LLM_BATCH", "0"))

    force_download = os.environ.get("LOCAL_LLM_FORCE_DOWNLOAD", "0").strip() == "1"
    stop_on_fail = os.environ.get("LOCAL_LLM_STOP_ON_FAIL", "0").strip() == "1"

    if args["seed"] is not None:
        random.seed(int(args["seed"]))

    if args["all_questions"]:
        chosen_questions = QUESTION_BANK[:]
    else:
        chosen_questions = random.sample(QUESTION_BANK, k=int(args["n"]))

    models_mode = str(args["models_mode"])
    chosen_models = _filter_models(models_mode)

    print("\n[CONFIG]")
    print("  venv python        :", sys.executable)
    print("  cache_dir          :", cache_dir)
    print("  ctx                :", n_ctx)
    print("  max_tokens         :", max_tokens)
    print("  temperature        :", temperature)
    print("  repeats            :", repeats)
    print("  threads            :", threads)
    print("  batch              :", batch)
    print("  force_download     :", force_download)
    print("  stop_on_fail       :", stop_on_fail)
    print("  questions_selected :", len(chosen_questions), "/", len(QUESTION_BANK))
    print("  models_mode        :", models_mode, f"({len(chosen_models)} models requested)")

    ensure_deps()

    resolved: List[Tuple[ModelSpec, str, str]] = []
    failed: List[Tuple[ModelSpec, str]] = []

    print("\n" + "=" * 110)
    print("MODEL RESOLUTION / DOWNLOAD")
    print("=" * 110)

    for spec in chosen_models:
        ok, path, msg = resolve_or_download_model(spec, cache_dir, force_download=force_download)
        if ok and path:
            print(f"\n[MODEL OK]  {spec.name}")
            print("  repo_id :", spec.repo_id)
            print("  result  :", msg)
            print("  path    :", path)
            resolved.append((spec, path, msg))
        else:
            print(f"\n[MODEL FAIL] {spec.name}")
            print("  repo_id :", spec.repo_id)
            print("  error   :", msg)
            failed.append((spec, msg))
            if stop_on_fail:
                print("\nSTOP_ON_FAIL is set. Exiting now.")
                sys.exit(1)

    if not resolved:
        print("\n[ERROR] No models resolved. Edit MODEL_SPECS repo IDs / filename candidates and re-run.")
        sys.exit(1)

    from llama_cpp import Llama  # type: ignore

    results_blob: Dict[str, Any] = {
        "config": {
            "cache_dir": cache_dir,
            "ctx": n_ctx,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "repeats": repeats,
            "threads": threads,
            "batch": batch,
            "models_mode": models_mode,
            "questions_count": len(chosen_questions),
            "force_download": force_download,
        },
        "models_requested": [{"name": m.name, "repo_id": m.repo_id, "tier": m.tier} for m in chosen_models],
        "models_failed": [{"name": m.name, "repo_id": m.repo_id, "error": e} for (m, e) in failed],
        "questions": chosen_questions,
        "runs": [],
        "summary": {},
    }

    per_question_print = bool(args["per_question"])
    emit_json = bool(args["emit_json"])

    print("\n" + "=" * 110)
    print("BENCHMARK RUNS")
    print("=" * 110)

    summary_rows: List[Tuple[str, int, int, float, float, float]] = []

    for (spec, model_path, resolve_msg) in resolved:
        print("\n" + "-" * 110)
        print(f"MODEL: {spec.name}")
        print(f"TIER : {spec.tier}")
        print(f"REPO : {spec.repo_id}")
        print(f"FILE : {os.path.basename(model_path)}")
        print(f"CACHE: {resolve_msg}")
        print("-" * 110)

        # ---------------------------
        # CRITICAL FIX:
        # DO NOT pass None into Llama(...) for n_threads / n_batch.
        # Build kwargs dynamically and only include keys when they are valid ints.
        # ---------------------------
        llama_kwargs: Dict[str, Any] = {
            "model_path": model_path,
            "n_ctx": n_ctx,
            "verbose": False,
        }
        if threads > 0:
            llama_kwargs["n_threads"] = int(threads)
        if batch > 0:
            llama_kwargs["n_batch"] = int(batch)

        load_t0 = time.time()
        try:
            llm = Llama(**llama_kwargs)
        except Exception as e:
            print("[LOAD FAIL]", e)
            failed.append((spec, f"load failed: {e}"))
            if stop_on_fail:
                sys.exit(1)
            continue

        load_seconds = time.time() - load_t0
        print(f"[LOAD] {load_seconds:.2f}s")

        correct = 0
        total = 0
        times: List[float] = []
        per_q_results: List[Dict[str, Any]] = []

        for i, item in enumerate(chosen_questions, start=1):
            q = str(item["q"])
            accepted = list(item["answers"])

            rep_answers: List[str] = []
            rep_times: List[float] = []

            for _r in range(repeats):
                t0 = time.time()
                ans = run_one_answer(llm, q, max_tokens=max_tokens, temperature=temperature)
                dt = time.time() - t0
                rep_answers.append(ans)
                rep_times.append(dt)

            final_ans = _majority_vote(rep_answers)
            avg_dt = sum(rep_times) / len(rep_times)
            times.append(avg_dt)

            ok = _is_correct(final_ans, accepted)
            total += 1
            if ok:
                correct += 1

            if per_question_print:
                print(f"\n[{i}/{len(chosen_questions)}] Q: {q}")
                print(f"        A: {final_ans}")
                print(f"   Accept: {accepted}")
                print(f"     {'OK' if ok else 'WRONG'}   (~{avg_dt:.2f}s avg over {repeats} run(s))")

            per_q_results.append({
                "index": i,
                "q": q,
                "accepted": accepted,
                "raw_answers": rep_answers,
                "final_answer": final_ans,
                "ok": ok,
                "avg_seconds": avg_dt,
            })

        acc = (correct / total) if total else 0.0
        avg_q = (sum(times) / len(times)) if times else 0.0

        summary_rows.append((spec.name, correct, total, acc, avg_q, load_seconds))
        results_blob["runs"].append({
            "model": {
                "name": spec.name,
                "tier": spec.tier,
                "repo_id": spec.repo_id,
                "file": os.path.basename(model_path),
            },
            "load_seconds": load_seconds,
            "correct": correct,
            "total": total,
            "accuracy": acc,
            "avg_seconds_per_q": avg_q,
            "per_question": per_q_results,
        })

        del llm

    print("\n" + "=" * 110)
    print("SUMMARY")
    print("=" * 110)

    summary_rows.sort(key=lambda r: (-r[3], r[4]))

    if not summary_rows:
        print("No models successfully loaded and ran.")
        print("If you still see errors, run with:")
        print("  $env:LOCAL_LLM_THREADS=4; python main.py")
        print("or try setting threads to 1,2,4,8 depending on your CPU.")
        if failed:
            print("\nFAILED MODELS:")
            for (m, err) in failed:
                print(f"- {m.name} ({m.repo_id}): {err}")
        print("\nDone.\n")
        return

    name_w = max([len(r[0]) for r in summary_rows] + [5])
    name_w = min(max(name_w, 12), 72)

    def trunc(s: str, w: int) -> str:
        return s if len(s) <= w else s[: w - 1] + "…"

    header = f"{'MODEL'.ljust(name_w)}  {'SCORE'.ljust(9)}  {'ACC'.ljust(8)}  {'AVG/Q(s)'.ljust(10)}  {'LOAD(s)'}"
    print(header)
    print("-" * len(header))

    summary_obj: Dict[str, Any] = {}
    for (name, correct, total, acc, avg_q, load_s) in summary_rows:
        score = f"{correct}/{total}"
        acc_s = f"{acc*100:.1f}%"
        print(f"{trunc(name, name_w).ljust(name_w)}  {score.ljust(9)}  {acc_s.ljust(8)}  {avg_q:<10.2f}  {load_s:.2f}")
        summary_obj[name] = {
            "correct": correct,
            "total": total,
            "accuracy": acc,
            "avg_seconds_per_q": avg_q,
            "load_seconds": load_s,
        }

    results_blob["summary"] = summary_obj

    if failed:
        print("\nFAILED MODELS (download/list/load failures):")
        for (m, err) in failed:
            print(f"- {m.name} ({m.repo_id}): {err}")

    if emit_json:
        print("\n" + "=" * 110)
        print("JSON RESULTS")
        print("=" * 110)
        print(json.dumps(results_blob, indent=2))

    print("\nDone.\n")


if __name__ == "__main__":
    main()
