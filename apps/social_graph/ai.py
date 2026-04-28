import os
import time
import re
import spacy
import spacy.cli

# Common titles to strip (prefixes and suffixes)
TITLES = r'\b(Dr|Mr|Mrs|Ms|Prof|Sir|Jr|Sr|PhD|MD|Hon|The|Coach|Father|Rev)\b\.?'

def load_nlp_model(model_name="en_core_web_trf"):
    try:
        print(f"Loading {model_name}...")
        return spacy.load(model_name)
    except OSError:
        print(f"Model '{model_name}' not found. Downloading now...")
        spacy.cli.download(model_name)
        return spacy.load(model_name)

# Initialize
nlp = load_nlp_model()

def clean_person_name(name):
    """Deep cleans a name: removes titles, punctuation, and standardizes case."""
    # 1. Remove commas and periods immediately
    name = name.replace(",", "").replace(".", "")
    
    # 2. Use regex to strip common titles (case insensitive)
    name = re.sub(TITLES, '', name, flags=re.IGNORECASE)
    
    # 3. Strip possessives (e.g., "Putin's" -> "Putin")
    name = re.sub(r"['’]s\b", '', name)
    
    # 4. Remove any weird characters left over
    name = re.sub(r"[^a-zA-Z\s]", '', name)
    
    # 5. Collapse multiple spaces and trim
    name = " ".join(name.split())
    
    # 6. Standardize to Title Case
    return name.title()

def get_names_from_title(video_title):
    if not nlp: return []
    
    doc = nlp(video_title)
    names = []
    
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            cleaned = clean_person_name(ent.text)
            
            # Ensure it's still a full name (at least 2 words) after cleaning
            if len(cleaned.split()) >= 2:
                names.append(cleaned)

    # De-duplicate
    return list(dict.fromkeys(names))

# --- TEST ---
if __name__ == "__main__":
    test_titles = [
        "The Diary Of A CEO: Dr. Gabor Maté and 'The Iceman' Wim Hof",
        "Interview with Mr. Elon Musk, PhD",
        "Lex Fridman Podcast #335: Fiona Hill on Vladimir Putin's Russia",
    ]
    
    for t in test_titles:
        print(f"RAW: {t}")
        print(f"CLEAN: {get_names_from_title(t)}\n")