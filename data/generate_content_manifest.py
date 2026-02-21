#!/usr/bin/env python3
"""
Generate a manifest of all Bible content files for offline caching.
Run this script whenever you add new Bible content.
"""

import os
import json

def generate_content_manifest():
    """Generate a JSON manifest of all content files."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    files = []
    
    # Bible chapters
    bibles_dir = os.path.join(base_dir, 'bibles')
    if os.path.exists(bibles_dir):
        for root, dirs, filenames in os.walk(bibles_dir):
            for filename in filenames:
                if filename.endswith('.md'):
                    # Only include chapter files (not book index files)
                    # Chapter files have format like "Genesis 1.md" or "1 John 1.md"
                    name_without_ext = filename[:-3]
                    if name_without_ext[0].isdigit() or ' ' in name_without_ext:
                        full_path = os.path.join(root, filename)
                        relative_path = os.path.relpath(full_path, base_dir).replace('\\', '/')
                        files.append(relative_path)
    
    # Lexicon files
    lexicon_dir = os.path.join(base_dir, 'lexicon')
    if os.path.exists(lexicon_dir):
        for filename in os.listdir(lexicon_dir):
            if filename.endswith('.md'):
                full_path = os.path.join(lexicon_dir, filename)
                relative_path = os.path.relpath(full_path, base_dir).replace('\\', '/')
                files.append(relative_path)
    
    # Reading plans
    plans_dir = os.path.join(base_dir, 'plans')
    if os.path.exists(plans_dir):
        for filename in os.listdir(plans_dir):
            if filename.endswith('.json'):
                full_path = os.path.join(plans_dir, filename)
                relative_path = os.path.relpath(full_path, base_dir).replace('\\', '/')
                files.append(relative_path)
    
    # Search index
    search_index = os.path.join(base_dir, 'data', 'search_index.json')
    if os.path.exists(search_index):
        relative_path = os.path.relpath(search_index, base_dir).replace('\\', '/')
        files.append(relative_path)
    
    # Sort files for consistent ordering
    files.sort()
    
    manifest = {
        "version": 1,
        "generated": __import__('datetime').datetime.now().isoformat(),
        "totalFiles": len(files),
        "files": files
    }
    
    # Write manifest
    output_path = os.path.join(base_dir, 'data', 'content_manifest.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"Generated content manifest with {len(files)} files")
    print(f"Output: {output_path}")
    
    return manifest

if __name__ == '__main__':
    generate_content_manifest()
