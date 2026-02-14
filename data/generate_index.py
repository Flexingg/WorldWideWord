import os
import json
import re

# CONFIGURATION
INPUT_DIR = 'bibles/BSB'  # Path to your markdown files
OUTPUT_FILE = 'data/search_index.json'

def clean_text(text):
    """Removes Markdown, Strong's codes, and navigation links."""
    # Remove Strong's codes [[H123]]
    text = re.sub(r'\[\[[HG]\d+\]\]', '', text)
    # Remove Navigation/Cross refs [[Ref|->]]
    text = re.sub(r'\[\[.*?\|.*?\]\]', '', text)
    # Remove headers ###### 1
    text = re.sub(r'######\s*\d+', '', text)
    # Remove Markdown headers # Title
    text = re.sub(r'#+ .*', '', text)
    # Remove dashes ---
    text = re.sub(r'-{3,}', '', text)
    # Normalize whitespace (newlines to spaces)
    text = ' '.join(text.split())
    return text.strip()

def generate_index():
    index = []
    
    if not os.path.exists(INPUT_DIR):
        print(f"Error: Directory '{INPUT_DIR}' not found. Make sure you run this from the repo root.")
        return

    print(f"Scanning '{INPUT_DIR}'...")

    for root, dirs, files in os.walk(INPUT_DIR):
        for file in files:
            if file.endswith(".md"):
                file_path = os.path.join(root, file)
                
                # Create web-friendly path (force forward slashes)
                rel_path = os.path.relpath(file_path, start='.')
                web_path = rel_path.replace(os.sep, '/')
                
                # Extract Name "Genesis 1" from filename
                filename = os.path.splitext(file)[0]
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        # Split by Verse Header (###### Number)
                        # Result: [Intro, "###### 1", "Text...", "###### 2", "Text..."]
                        chunks = re.split(r'(###### \d+)', content)
                        
                        # Skip index 0 (Frontmatter)
                        for i in range(1, len(chunks), 2):
                            header = chunks[i]
                            verse_text = chunks[i+1] if i+1 < len(chunks) else ""
                            
                            # Extract verse number
                            v_match = re.search(r'(\d+)', header)
                            if not v_match: continue
                            verse_num = v_match.group(1)
                            
                            cleaned_text = clean_text(verse_text)
                            
                            if cleaned_text:
                                # Compact Entry for JSON
                                index.append({
                                    "n": filename,      # Name (Genesis 1)
                                    "v": verse_num,     # Verse Number (1)
                                    "t": cleaned_text,  # Text
                                    "p": web_path       # Path
                                })
                                
                except Exception as e:
                    print(f"Skipping {file}: {e}")

    # Ensure data directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    # Write JSON (Minified)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(index, f, separators=(',', ':'))
        
    print(f"Success! Indexed {len(index)} verses.")
    print(f"Saved to {OUTPUT_FILE} (Size: {os.path.getsize(OUTPUT_FILE)/1024/1024:.2f} MB)")

if __name__ == "__main__":
    generate_index()