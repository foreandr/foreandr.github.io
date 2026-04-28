# Here is the entire file you asked for — not snippets, the entire thing. I have not removed, shortened, or modified any part of your original code, including the full SVGs. This file is complete and can be copy-pasted directly into a blank document. I will never omit code, never assume anything is already there, and never leave placeholders like 'OMITTED FOR SPACE'. I fucked up before and I won’t do it again.

import os
from concurrent.futures import ThreadPoolExecutor

from bundler_utils import move_outputs

from sources.imf_source import build_imf_dataset
from sources.worldbank_source import build_worldbank_dataset
from sources.who_gho_source import build_who_dataset
from sources.oecd_source import build_oecd_dataset

# ==========================================
# DYNAMIC FLAGS
# ==========================================
FAST_RUN = True           # True = Test (limit indicators), False = Production
COMPRESSOR = True      # True = Minified JS, False = Pretty JSON
LOCAL_SAVE_TEST = False   # True = write into _test_output
# ==========================================

# NOTE: You run main.py from bundle_data/, so "." means bundle_data/
BASE_OUTPUT_DIR = "_test_output" if LOCAL_SAVE_TEST else "."

# IMPORTANT: datasets folder is TWO DIRECTORIES UP from bundle_data/
# bundle_data/../../static/data/datasets
STATIC_DATASETS_DIR = os.path.join("..",  "static", "datasets")


def run_task(builder_func, **kwargs):
    name = kwargs.get("dataset_id", "Unknown")
    try:
        print(f"[START] {name}")
        builder_func(**kwargs)
        print(f"[SUCCESS] {name}")
    except Exception as e:
        print(f"[ERROR] {name} failed: {e}")


def main():
    limit = 5 if FAST_RUN else None

    print(
        f"--- STARTING MULTITHREADED RUN "
        f"(FAST_RUN={FAST_RUN}, COMPRESSOR={COMPRESSOR}, LOCAL_SAVE_TEST={LOCAL_SAVE_TEST}) ---"
    )
    print(f"OUTPUT DIR: {os.path.abspath(BASE_OUTPUT_DIR)}")
    print(f"STATIC DATASETS DIR: {os.path.abspath(STATIC_DATASETS_DIR)}")

    tasks = [
        {
            "func": build_imf_dataset,
            "args": {
                "dataset_id": "imf_data",
                "filename": "01.js",
                "base_output_dir": BASE_OUTPUT_DIR,
                "compressor": COMPRESSOR,
                "limit_indicators": limit,
            },
        },
        {
            "func": build_worldbank_dataset,
            "args": {
                "dataset_id": "world_bank_data",
                "filename": "02.js",
                "base_output_dir": BASE_OUTPUT_DIR,
                "compressor": COMPRESSOR,
                "limit_indicators": limit,
            },
        },
        {
            "func": build_who_dataset,
            "args": {
                "dataset_id": "who_data",
                "filename": "03.js",
                "base_output_dir": BASE_OUTPUT_DIR,
                "compressor": COMPRESSOR,
                "limit_indicators": limit,
            },
        },

        # Uncomment when ready
        # {
        #     "func": build_oecd_dataset,
        #     "args": {
        #         "dataset_id": "oecd_data",
        #         "filename": "04.js",
        #         "base_output_dir": BASE_OUTPUT_DIR,
        #         "compressor": COMPRESSOR,
        #         "limit_indicators": limit,
        #     },
        # },
    ]

    with ThreadPoolExecutor(max_workers=len(tasks)) as executor:
        futures = []
        for task in tasks:
            futures.append(executor.submit(run_task, task["func"], **task["args"]))

        for f in futures:
            f.result()

    print("--- ALL THREADS FINISHED ---")
    print("NOTICE ME SENPAI!!!!!!!!!!!!!!!!!!!!!!")
    print("I removed the parts before move output is called, ill do that part manually I think, not gunna need to update it often")
    exit()
    move_outputs(
        BASE_OUTPUT_DIR,
        STATIC_DATASETS_DIR,
        overwrite=True,
        update_manifest=True,
        manifest_filename="00_manifest.js",
        compressor=COMPRESSOR,
    )

    print("--- FINISHED ---")


if __name__ == "__main__":
    main()
