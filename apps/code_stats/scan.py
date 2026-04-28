"""
Run from the project root:  python apps/code_stats/scan.py
Writes apps/code_stats/stats.json
"""
import os, json, sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT  = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stats.json')

SKIP = {'node_modules','.git','venv','__pycache__','.cache','secret','.claude'}
EXT_MAP = {
    '.html':'HTML','.htm':'HTML',
    '.js':'JavaScript','.mjs':'JavaScript','.cjs':'JavaScript',
    '.ts':'TypeScript','.tsx':'TSX','.jsx':'JSX',
    '.css':'CSS','.scss':'CSS','.sass':'CSS',
    '.py':'Python',
    '.java':'Java','.kt':'Kotlin',
    '.c':'C','.h':'C','.cpp':'C++','.hpp':'C++',
    '.go':'Go','.rs':'Rust',
    '.json':'JSON','.md':'Markdown',
    '.sh':'Shell','.bat':'Batch',
    '.yaml':'YAML','.yml':'YAML','.xml':'XML','.sql':'SQL',
}

def count_lines(path):
    try:
        with open(path,'r',encoding='utf-8',errors='ignore') as f:
            lines = f.readlines()
        total = len(lines)
        code  = sum(1 for l in lines if l.strip() and
                    not l.strip().startswith(('#','//','/*','*','<!--','--','"""',"'''")))
        return total, code
    except:
        return 0, 0

apps_dir = os.path.join(ROOT,'apps')
app_stats = {}
total_by_lang = {}
total_files = total_lines = total_code = 0

def scan_dir(base_path, app_name):
    global total_files, total_lines, total_code
    d = {'name':app_name,'files':0,'total_lines':0,'code_lines':0,'by_lang':{}}
    for dirpath, dirnames, filenames in os.walk(base_path):
        dirnames[:] = [x for x in dirnames if x not in SKIP]
        for fname in filenames:
            ext = os.path.splitext(fname)[1].lower()
            if ext not in EXT_MAP: continue
            lang = EXT_MAP[ext]
            t,c = count_lines(os.path.join(dirpath,fname))
            d['files']+=1; d['total_lines']+=t; d['code_lines']+=c
            d['by_lang'][lang] = d['by_lang'].get(lang,0)+t
            total_by_lang[lang] = total_by_lang.get(lang,0)+t
            total_files+=1; total_lines+=t; total_code+=c
    return d

for app_name in sorted(os.listdir(apps_dir)):
    p = os.path.join(apps_dir,app_name)
    if not os.path.isdir(p): continue
    d = scan_dir(p, app_name)
    if d['files']>0: app_stats[app_name]=d

# Root files
rd = {'name':'(root)','files':0,'total_lines':0,'code_lines':0,'by_lang':{}}
for fname in os.listdir(ROOT):
    fpath = os.path.join(ROOT,fname)
    if not os.path.isfile(fpath): continue
    ext = os.path.splitext(fname)[1].lower()
    if ext not in EXT_MAP: continue
    lang = EXT_MAP[ext]
    t,c = count_lines(fpath)
    rd['files']+=1; rd['total_lines']+=t; rd['code_lines']+=c
    rd['by_lang'][lang]=rd['by_lang'].get(lang,0)+t
    total_by_lang[lang]=total_by_lang.get(lang,0)+t
    total_files+=1; total_lines+=t; total_code+=c
if rd['files']>0: app_stats['(root)']=rd

result = {
    'scanned_at': str(date.today()),
    'project': os.path.basename(ROOT),
    'total_files': total_files,
    'total_lines': total_lines,
    'total_code_lines': total_code,
    'total_apps': len(app_stats),
    'by_language': dict(sorted(total_by_lang.items(),key=lambda x:-x[1])),
    'apps': dict(sorted(app_stats.items(),key=lambda x:-x[1]['total_lines']))
}

with open(OUT,'w') as f:
    json.dump(result,f,indent=2)
print(f"✓ {total_files:,} files  {total_lines:,} lines  {len(app_stats)} apps → {OUT}")
