# Multi-Word Search Enhancement Plan

## Current Implementation Analysis

### Search Index Structure
The search index (`data/search_index.json`) contains verse-level entries:
```json
{
  "n": "Genesis 1",    // Chapter name
  "v": "1",            // Verse number
  "t": "In the beginning God created...",  // Cleaned verse text
  "p": "bibles/BSB/BER-Genesis/Genesis 1.md"  // File path
}
```

### Current Search Logic
Location: [`js/app.js`](js/app.js:418) - `performSearch()` function

```javascript
const cleanQ = query.toLowerCase().replace(/[\\]/g, "").replace(/\[/g, "").replace(/\]/g, "");
let results = Selector.searchIndex.filter(item => item.t.toLowerCase().includes(cleanQ));
```

**Problem**: Uses simple `includes()` which only matches exact substrings. Searching "God created" would only find verses containing that exact phrase, not verses containing both "God" AND "created" anywhere in the verse.

---

## Proposed Solution

### Phase 1: Same-Verse Multi-Word Search (Required)

Split the query into individual words and check if ALL words are present in the verse text.

#### Algorithm
```
1. Split query into words: "God created" → ["god", "created"]
2. For each verse in search index:
   - Check if ALL words are present in verse text
   - If yes, include in results
3. Sort and display results
```

#### Code Changes Required
Modify the [`performSearch()`](js/app.js:418) function:

```javascript
performSearch: async (query) => {
    // ... existing index loading code ...
    
    const cleanQ = query.toLowerCase().replace(/[\\]/g, "").replace(/\[/g, "").replace(/\]/g, "");
    
    // Split into individual words and filter empty strings
    const searchWords = cleanQ.split(/\s+/).filter(w => w.length > 0);
    
    let results;
    if (searchWords.length === 1) {
        // Single word: use existing simple search
        results = Selector.searchIndex.filter(item => item.t.toLowerCase().includes(cleanQ));
    } else {
        // Multiple words: ALL words must be present (AND logic)
        results = Selector.searchIndex.filter(item => {
            const text = item.t.toLowerCase();
            return searchWords.every(word => text.includes(word));
        });
    }
    
    // ... existing sorting and rendering code ...
}
```

---

### Phase 2: Cross-Verse Multi-Word Search (Optional Enhancement)

Find verses where words appear in adjacent verses (e.g., "God" in verse 1 and "created" in verse 2).

#### Algorithm
```
1. Split query into words: "God created" → ["god", "created"]
2. For each verse in search index:
   a. Check if ANY word is present in current verse
   b. If yes, check adjacent verses for remaining words
   c. If all words found within proximity (e.g., 2 verses), include in results
3. Group results by chapter and display with context
```

#### Final Implementation (User Approved)

```javascript
performSearch: async (query) => {
    // ... existing index loading code ...
    
    const cleanQ = query.toLowerCase().replace(/[\\]/g, "").replace(/\[/g, "").replace(/\]/g, "");
    const searchWords = cleanQ.split(/\s+/).filter(w => w.length > 0);
    
    let results = [];
    const index = Selector.searchIndex;
    
    if (searchWords.length === 1) {
        // Single word: use simple search
        results = index.filter(item => item.t.toLowerCase().includes(cleanQ));
    } else {
        // Multi-word: proximity search (current verse + next verse only)
        for (let i = 0; i < index.length; i++) {
            const verse = index[i];
            const text = verse.t.toLowerCase();
            
            // Find which words are in current verse
            const foundInCurrent = searchWords.filter(w => text.includes(w));
            
            // All words found in current verse
            if (foundInCurrent.length === searchWords.length) {
                results.push({...verse, matchType: 'same-verse'});
                continue;
            }
            
            // Check if remaining words are in next verse (same chapter only)
            const remainingWords = searchWords.filter(w => !foundInCurrent.includes(w));
            if (remainingWords.length > 0 && i + 1 < index.length) {
                const nextVerse = index[i + 1];
                
                // Must be same chapter
                if (nextVerse.n === verse.n) {
                    const nextText = nextVerse.t.toLowerCase();
                    const foundInNext = remainingWords.filter(w => nextText.includes(w));
                    
                    // All remaining words found in next verse
                    if (foundInNext.length === remainingWords.length) {
                        results.push({...verse, matchType: 'proximity'});
                    }
                }
            }
        }
    }
    
    // ... existing sorting and rendering code ...
}
```

---

## UI Considerations

### Result Display
For cross-verse matches, the UI should indicate:
1. Match type badge: "Same Verse" vs "Nearby Verses"
2. For proximity matches, show context (e.g., "God in v1, created in v2-3")

### Search Mode Toggle
Consider adding a toggle or dropdown for search mode:
- **All words in same verse** (default)
- **Words in nearby verses** (proximity search)

---

## Implementation Steps

1. **Modify [`performSearch()`](js/app.js:418)** - Add word splitting and AND logic
2. **Add [`searchMultiWord()`](js/app.js:332)** - New method for multi-word search modes
3. **Update [`renderResults()`](js/app.js:458)** - Display match type badges
4. **Add UI controls** (optional) - Search mode selector

---

## Testing Scenarios

| Query | Expected Behavior |
|-------|-------------------|
| "God" | Find all verses containing "God" |
| "God created" | Find verses with both "God" AND "created" |
| "In the beginning" | Find verses with all three words |
| "God love" | Find verses containing both words (may be rare) |

---

## Design Decisions (User Confirmed)

1. **Default Mode**: Proximity search (checks current verse AND next verse)
2. **Proximity Range**: 1 verse apart only (current verse + next verse)
3. **UI Toggle**: No toggle needed - always use proximity search

---

## Final Implementation Specification

### Search Behavior
- Split query into words
- For each verse, check if all words are found in either:
  - The current verse itself, OR
  - The current verse + the immediately next verse (same chapter only)
- Return matching verses with match type indicator

### Match Types
- **same-verse**: All words found in a single verse
- **proximity**: Words split across current verse and next verse
