import os
import json
import re

INPUT_DIR = 'bibles/BSB'  
OUTPUT_FILE = 'data/search_index.json'

def clean_text_for_index(text):
    text = re.sub(r'\[\[.*?\|.*?\]\]', '', text)
    text = re.sub(r'######\s*\d+', '', text)
    text = re.sub(r'#+ .*', '', text)
    text = re.sub(r'-{3,}', '', text)
    text = ' '.join(text.split())
    return text.strip()

def generate_index():
    index = []
    if not os.path.exists(INPUT_DIR):
        print(f"Error: Directory '{INPUT_DIR}' not found.")
        return

    print(f"Scanning '{INPUT_DIR}'...")

    for root, dirs, files in os.walk(INPUT_DIR):
        for file in files:
            if file.endswith(".md"):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, start='.')
                web_path = rel_path.replace(os.sep, '/')
                filename = os.path.splitext(file)[0]
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        chunks = re.split(r'(###### \d+)', content)
                        for i in range(1, len(chunks), 2):
                            header = chunks[i]
                            verse_text = chunks[i+1] if i+1 < len(chunks) else ""
                            v_match = re.search(r'(\d+)', header)
                            if not v_match: continue
                            verse_num = v_match.group(1)
                            cleaned_text = clean_text_for_index(verse_text)
                            if cleaned_text:
                                index.append({
                                    "n": filename,
                                    "v": verse_num,
                                    "t": cleaned_text,
                                    "p": web_path
                                })
                except Exception as e:
                    print(f"Skipping {file}: {e}")

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(index, f, separators=(',', ':'))
        
    print(f"Success! Indexed {len(index)} verses.")

if __name__ == "__main__":
    generate_index()