#!/usr/bin/env python3
"""
Sacred Texts Analysis Script
Analyzes all available text files for rich comparative insights.
Outputs all data to data.js for use in the dashboard.
"""

import re
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

# ── Load texts ────────────────────────────────────────────────────────────────
BASE = Path(__file__).parent
FILES = {
    "Gospels":                  BASE / "gospels.txt",
    "Quran":                    BASE / "koran.txt",
    "Tanakh":                   BASE / "tanakh.txt",
    "Talmud":                   BASE / "Talmud.txt",
    "Bhagavad Gita":            BASE / "Bhagavad_Gita.txt",
    "Rig Veda":                 BASE / "Rig_Veda.txt",
    "Upanishads":               BASE / "Upanishads.txt",
    "Vedanta Sutras":           BASE / "Vedanta_Sutras_part1.txt",
    "Mahabharata":              BASE / "Mahabharata.txt",
    "Ramayana":                 BASE / "Ramayana.txt",
    "Analects":                 BASE / "Analects_confucious.txt",
    "Chin Kang Ching":          BASE / "Chin_Kang_Ching.txt",
    "Tao Teh King":             BASE / "Tao_Teh_King.txt",
    "Iliad":                    BASE / "Iliad.txt",
    "Odyssey":                  BASE / "Odyssey.txt",
    "Hesiod":                   BASE / "Hesiod.txt",
    "Republic":                 BASE / "republic.txt",
    "Babylonian Legends":       BASE / "Babylonian_Legends_of_the_Creation.txt",
    "Hammurabi":                BASE / "Hammurabi.txt",
    "Egyptian Book of the Dead":BASE / "egyptian_book_of_the_dead.txt",
    "Elements":                 BASE / "Elements.txt",
}

# Filter to only existing files
FILES = {name: path for name, path in FILES.items() if path.exists()}

raw = {}
for name, path in FILES.items():
    raw[name] = path.read_text(encoding="utf-8", errors="ignore")

def clean(text):
    return re.sub(r"[^a-zA-Z\s]", " ", text).lower()

def tokenize(text):
    return [w for w in clean(text).split() if w]

texts  = {k: clean(v)    for k, v in raw.items()}
tokens = {k: tokenize(v) for k, v in raw.items()}
books  = list(raw.keys())

# ── Helper: top N ─────────────────────────────────────────────────────────────
def top(counter, n=30):
    return [{"word": w, "count": c} for w, c in counter.most_common(n)]

# ── 1. Basic stats ─────────────────────────────────────────────────────────────
STOPWORDS = set("""the a an and or but in on at to of for is was are were be been
    being have has had do does did will would could should may might shall
    not no nor so yet both either neither this that these those i me my we our
    you your he his she her it its they them their what which who whom whose
    when where why how all any each every few more most other some such than
    then there through up out if by with from about into after before between
    among while also just than then only even still very too as said unto thee
    thy thou hast shalt art thy him lord god shall""".split())

def word_freq(tok_list):
    return Counter(tok_list)

def word_freq_no_stop(tok_list):
    return Counter(w for w in tok_list if w not in STOPWORDS and len(w) > 1)

basic_stats = {}
for b in books:
    tok = tokens[b]
    freq = word_freq(tok)
    sentences = re.split(r'[.!?;]', raw[b])
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    basic_stats[b] = {
        "total_chars":          len(raw[b]),
        "total_words":          len(tok),
        "unique_words":         len(set(tok)),
        "total_sentences":      len(sentences),
        "avg_word_length":      round(sum(len(w) for w in tok) / max(len(tok),1), 2),
        "avg_sentence_length":  round(len(tok) / max(len(sentences),1), 2),
        "lexical_richness":     round(len(set(tok)) / max(len(tok),1) * 100, 2),
    }

# ── 2. N-gram frequency (1, 2, 3 letters) ─────────────────────────────────────
def char_ngrams(text, n):
    t = re.sub(r'[^a-z]', '', clean(text))
    return Counter(t[i:i+n] for i in range(len(t)-n+1))

letter_ngrams = {}
for b in books:
    letter_ngrams[b] = {
        "1gram": top(char_ngrams(texts[b], 1), 26),
        "2gram": top(char_ngrams(texts[b], 2), 20),
        "3gram": top(char_ngrams(texts[b], 3), 20),
    }

# ── 3. Word n-grams (bigrams, trigrams) ───────────────────────────────────────
def word_ngrams(tok_list, n):
    return Counter(
        " ".join(tok_list[i:i+n])
        for i in range(len(tok_list)-n+1)
    )

word_bigrams  = {b: top(word_ngrams(tokens[b], 2), 25) for b in books}
word_trigrams = {b: top(word_ngrams(tokens[b], 3), 25) for b in books}

# ── 4. Top words (with & without stopwords) ────────────────────────────────────
top_words_all  = {b: top(word_freq(tokens[b]), 40)         for b in books}
top_words_main = {b: top(word_freq_no_stop(tokens[b]), 40) for b in books}

# ── 5. Word length distribution ───────────────────────────────────────────────
def word_len_dist(tok_list):
    c = Counter(len(w) for w in tok_list)
    return [{"length": k, "count": c.get(k, 0)} for k in range(1, 20)]

word_lengths = {b: word_len_dist(tokens[b]) for b in books}

# ── 6. Jaccard similarity between books ───────────────────────────────────────
def jaccard(a, b):
    sa, sb = set(a), set(b)
    return round(len(sa & sb) / max(len(sa | sb), 1), 4)

def cosine_sim(a, b):
    ca, cb = Counter(a), Counter(b)
    vocab = set(ca) | set(cb)
    dot   = sum(ca[w] * cb[w] for w in vocab)
    mag_a = math.sqrt(sum(v**2 for v in ca.values()))
    mag_b = math.sqrt(sum(v**2 for v in cb.values()))
    return round(dot / max(mag_a * mag_b, 1e-9), 4)

similarity = {}
for i, b1 in enumerate(books):
    for j, b2 in enumerate(books):
        if i < j:
            key = f"{b1} vs {b2}"
            similarity[key] = {
                "jaccard": jaccard(tokens[b1], tokens[b2]),
                "cosine":  cosine_sim(tokens[b1], tokens[b2]),
            }

# ── 7. Shared & exclusive vocabulary ──────────────────────────────────────────
vocabs = {b: set(tokens[b]) for b in books}
all_shared = set.intersection(*[vocabs[b] for b in books])
pairwise_shared = {}
for i, b1 in enumerate(books):
    for j, b2 in enumerate(books):
        if i < j:
            shared = vocabs[b1] & vocabs[b2]
            pairwise_shared[f"{b1} & {b2}"] = {
                "count":  len(shared),
                "sample": sorted(list(shared - STOPWORDS))[:30]
            }
exclusive = {
    b: {
        "count":  len(vocabs[b] - set.union(*[vocabs[x] for x in books if x != b])),
        "sample": sorted(list(vocabs[b] - set.union(*[vocabs[x] for x in books if x != b]) - STOPWORDS))[:30]
    }
    for b in books
}

vocabulary_analysis = {
    "all_shared_count": len(all_shared),
    "pairwise_shared":  pairwise_shared,
    "exclusive":        exclusive,
}

# ── 8. Sentiment-like: positive vs negative word lists ────────────────────────
POSITIVE = set("love peace joy blessed holy righteous good merciful grace faith hope salvation glory wisdom praise righteousness bless kind gracious true light life truth pure free perfect".split())
NEGATIVE = set("sin evil wicked death destroy hate curse fire wrath enemy darkness fear punishment condemned shame suffer pain war kill judgment wrong".split())

def sentiment_score(tok_list):
    pos = sum(1 for w in tok_list if w in POSITIVE)
    neg = sum(1 for w in tok_list if w in NEGATIVE)
    total = len(tok_list)
    return {
        "positive_count": pos,
        "negative_count": neg,
        "positive_pct":   round(pos/max(total,1)*100, 3),
        "negative_pct":   round(neg/max(total,1)*100, 3),
        "ratio":          round(pos / max(neg, 1), 3),
    }

sentiment = {b: sentiment_score(tokens[b]) for b in books}

# ── 9. Divine / spiritual name frequency ──────────────────────────────────────
DIVINE_NAMES = ["god", "lord", "allah", "jesus", "christ", "moses", "david",
                "israel", "spirit", "holy", "heaven", "angel", "prophet",
                "king", "priest", "temple", "covenant", "law", "commandment",
                "prayer", "worship", "faith", "salvation", "sin", "soul",
                "mercy", "grace", "blessed", "righteousness", "truth", "love",
                "light", "life", "death", "resurrection", "eternal", "world"]

def divine_freq(tok_list):
    c = Counter(tok_list)
    total = len(tok_list)
    return {name: {"count": c.get(name, 0), "per_1000": round(c.get(name,0)/max(total,1)*1000, 3)}
            for name in DIVINE_NAMES}

divine_names = {b: divine_freq(tokens[b]) for b in books}

# ── 10. Verse/line structure ───────────────────────────────────────────────────
def line_analysis(text):
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    lengths = [len(l.split()) for l in lines]
    return {
        "total_lines":       len(lines),
        "avg_words_per_line": round(sum(lengths)/max(len(lengths),1), 2),
        "max_words_line":    max(lengths, default=0),
        "min_words_line":    min(lengths, default=0),
        "short_lines_pct":   round(sum(1 for l in lengths if l <= 5) / max(len(lengths),1) * 100, 2),
    }

line_stats = {b: line_analysis(raw[b]) for b in books}

# ── 11. Punctuation & rhetorical devices ──────────────────────────────────────
def punct_analysis(text):
    return {
        "questions":    text.count("?"),
        "exclamations": text.count("!"),
        "colons":       text.count(":"),
        "semicolons":   text.count(";"),
        "commas":       text.count(","),
        "periods":      text.count("."),
    }

punctuation = {b: punct_analysis(raw[b]) for b in books}

# ── 12. Numerical word mentions ────────────────────────────────────────────────
NUMBERS = ["one","two","three","four","five","six","seven","eight","nine","ten",
           "twelve","forty","hundred","thousand","million","first","second","third",
           "seventh","thirtieth","fortieth"]

def number_mentions(tok_list):
    c = Counter(tok_list)
    return {n: c.get(n, 0) for n in NUMBERS}

numbers = {b: number_mentions(tokens[b]) for b in books}

# ── 13. Reading complexity (Flesch-Kincaid simplified) ────────────────────────
def syllable_count(word):
    word = word.lower()
    count = 0
    vowels = "aeiouy"
    prev_vowel = False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    if word.endswith("e"):
        count = max(1, count - 1)
    return max(1, count)

def flesch_reading_ease(tok_list, num_sentences):
    if not tok_list or not num_sentences:
        return 0
    total_syl = sum(syllable_count(w) for w in tok_list)
    asl = len(tok_list) / num_sentences
    asw = total_syl / len(tok_list)
    return round(206.835 - 1.015 * asl - 84.6 * asw, 2)

reading_ease = {}
for b in books:
    sents = len(re.split(r'[.!?]', raw[b]))
    reading_ease[b] = flesch_reading_ease(tokens[b], sents)

# ── 14. Rare words (hapax legomena) ───────────────────────────────────────────
hapax = {b: {"count": sum(1 for w, c in Counter(tokens[b]).items() if c == 1),
              "sample": [w for w, c in Counter(tokens[b]).items() if c == 1 and len(w) > 5][:20]}
         for b in books}

# ── 15. Word frequency rank distribution (Zipf) ───────────────────────────────
def zipf_data(tok_list, n=50):
    freq = Counter(tok_list).most_common(n)
    return [{"rank": i+1, "word": w, "count": c} for i, (w, c) in enumerate(freq)]

zipf = {b: zipf_data(tokens[b], 60) for b in books}

# ── 16. Cross-book phrase search (notable phrases) ────────────────────────────
NOTABLE_PHRASES = [
    "love thy neighbor", "blessed are", "in the beginning",
    "thus saith the lord", "kingdom of heaven", "fear not",
    "the word of god", "holy spirit", "son of god",
    "day of judgment", "eternal life", "the law",
    "thou shalt not", "glory of god", "peace be", "repent",
    "forgive", "covenant", "sacrifice", "resurrection"
]

phrase_search = {}
for phrase in NOTABLE_PHRASES:
    phrase_search[phrase] = {}
    for b in books:
        phrase_search[phrase][b] = raw[b].lower().count(phrase)

# ── 17. Most common sentence starters ─────────────────────────────────────────
def sentence_starters(text, n=15):
    sentences = re.split(r'[.!?]', text.lower())
    starters = []
    for s in sentences:
        words = s.strip().split()
        if words:
            starters.append(words[0])
    return top(Counter(starters), n)

starters = {b: sentence_starters(raw[b]) for b in books}

# ── 18. Style fingerprint ─────────────────────────────────────────────────────
def style_fingerprint(tok_list):
    words = tok_list
    short  = sum(1 for w in words if len(w) <= 3) / max(len(words),1)
    medium = sum(1 for w in words if 4 <= len(w) <= 7) / max(len(words),1)
    long   = sum(1 for w in words if len(w) >= 8) / max(len(words),1)
    return {
        "short_words_pct":    round(short*100, 2),
        "medium_words_pct":   round(medium*100, 2),
        "long_words_pct":     round(long*100, 2),
        "vocabulary_density": round(len(set(words))/max(len(words),1)*100, 2),
    }

style = {b: style_fingerprint(tokens[b]) for b in books}

# ── 19. Top words per book that appear rarely in others ────────────────────────
def distinctive_words(target, others, n=25):
    tc = Counter(tokens[target])
    oc = Counter()
    for o in others:
        oc.update(tokens[o])
    scores = {}
    total_t = len(tokens[target])
    total_o = sum(len(tokens[o]) for o in others)
    for w, c in tc.items():
        if w in STOPWORDS or len(w) < 3:
            continue
        tf = c / total_t
        other_tf = oc.get(w, 0) / max(total_o, 1)
        scores[w] = round(tf / max(other_tf, 1e-8), 2)
    return [{"word": w, "score": s, "count": tc[w]}
            for w, s in sorted(scores.items(), key=lambda x: -x[1])[:n]]

distinctive = {
    b: distinctive_words(b, [x for x in books if x != b])
    for b in books
}

# ── Book categories ────────────────────────────────────────────────────────────
CATEGORIES = {
    "Abrahamic":      ["Gospels", "Quran", "Tanakh", "Talmud"],
    "Hindu":          ["Bhagavad Gita", "Rig Veda", "Upanishads", "Vedanta Sutras", "Mahabharata", "Ramayana"],
    "East Asian":     ["Analects", "Chin Kang Ching", "Tao Teh King"],
    "Ancient Greek":  ["Iliad", "Odyssey", "Hesiod", "Republic"],
    "Ancient Near East": ["Babylonian Legends", "Hammurabi", "Egyptian Book of the Dead"],
    "Philosophy/Science": ["Elements"],
}
# Only keep books that were actually loaded
categories = {cat: [b for b in blist if b in books] for cat, blist in CATEGORIES.items()}
categories = {cat: blist for cat, blist in categories.items() if blist}

# ── Package all data ───────────────────────────────────────────────────────────
DATA = {
    "books":          books,
    "categories":     categories,
    "basic_stats":    basic_stats,
    "letter_ngrams":  letter_ngrams,
    "word_bigrams":   word_bigrams,
    "word_trigrams":  word_trigrams,
    "top_words_all":  top_words_all,
    "top_words_main": top_words_main,
    "word_lengths":   word_lengths,
    "similarity":     similarity,
    "vocabulary":     vocabulary_analysis,
    "sentiment":      sentiment,
    "divine_names":   divine_names,
    "line_stats":     line_stats,
    "punctuation":    punctuation,
    "numbers":        numbers,
    "reading_ease":   reading_ease,
    "hapax":          hapax,
    "zipf":           zipf,
    "phrase_search":  phrase_search,
    "starters":       starters,
    "style":          style,
    "distinctive":    distinctive,
}

# ── Write data.js ──────────────────────────────────────────────────────────────
js_path = BASE / "data.js"
with open(js_path, "w", encoding="utf-8") as f:
    f.write("// Auto-generated by analyze.py\n")
    f.write("const HOLY_DATA = ")
    json.dump(DATA, f, ensure_ascii=False, indent=2)
    f.write(";\n")

print(f"OK data.js written to {js_path}")
print(f"  Books analyzed: {len(books)}")
for b in books:
    print(f"  {b}: {basic_stats[b]['total_words']:,} words, "
          f"{basic_stats[b]['unique_words']:,} unique, "
          f"Flesch: {reading_ease[b]}")
