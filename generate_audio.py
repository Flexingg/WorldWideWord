#!/usr/bin/env python3
"""
Azure TTS Audio Generator for Bible Chapters

This script uses Azure Cognitive Services Text-to-Speech API to generate
MP3 audio files for Bible chapter readings.

Usage:
    python generate_audio.py --list-voices
    python generate_audio.py --voice "en-US-JennyNeural"
    python generate_audio.py --voice "en-US-JennyNeural" --book "Matthew"
    python generate_audio.py --voice "en-US-JennyNeural" --book "Matthew" --chapter 1

Requirements:
    pip install azure-cognitiveservices-speech python-dotenv tqdm
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional, List, Dict, Tuple

try:
    import azure.cognitiveservices.speech as speechsdk
except ImportError:
    print("Error: azure-cognitiveservices-speech not installed.")
    print("Install with: pip install azure-cognitiveservices-speech")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("Warning: python-dotenv not installed. .env files will not be loaded.")
    load_dotenv = None

try:
    from tqdm import tqdm
except ImportError:
    print("Warning: tqdm not installed. Using simple progress display.")
    tqdm = None


# ============================================================================
# Configuration
# ============================================================================

class Config:
    """Configuration management for Azure TTS."""
    
    def __init__(self):
        # Load .env file if available
        if load_dotenv:
            load_dotenv()
        
        # Azure credentials
        self.subscription_key = os.getenv('AZURE_TTS_KEY', '')
        self.region = os.getenv('AZURE_TTS_REGION', 'eastus')
        
        # Paths
        self.base_dir = Path(__file__).parent
        self.audio_dir = self.base_dir / 'audio'
        self.bibles_dir = self.base_dir / 'bibles'
        self.content_manifest_path = self.base_dir / 'data' / 'content_manifest.json'
        
        # Default settings
        self.default_voice = 'en-US-JennyNeural'
        self.speech_rate = 0.9  # Slightly slower for clarity
        
    def validate_credentials(self) -> bool:
        """Check if Azure credentials are configured."""
        if not self.subscription_key:
            print("Error: Azure TTS key not configured.")
            print("\nSet up credentials using one of these methods:")
            print("  1. Environment variable: AZURE_TTS_KEY")
            print("  2. .env file with: AZURE_TTS_KEY=your-key")
            print("  3. Command line: --key your-key")
            return False
        return True


# ============================================================================
# Text Processing
# ============================================================================

class TextProcessor:
    """Process markdown text for TTS synthesis."""
    
    # Pattern to match lexicon references like [[G976]], [[G1078]], etc.
    LEXICON_PATTERN = re.compile(r'\[\[G\d+\]\]')
    
    # Pattern to match incomplete lexicon references
    LEXICON_INCOMPLETE_PATTERN = re.compile(r'\[\[G\d*|\]\]')
    
    # Pattern to match verse markers (###### N)
    VERSE_MARKER_PATTERN = re.compile(r'^######\s+(\d+)\s*$', re.MULTILINE)
    
    # Pattern to match markdown links [[text|link]] or [[link]]
    LINK_PATTERN = re.compile(r'\[\[[^\]]+\]\]')
    
    # Pattern to match navigation arrows and separators
    NAV_PATTERN = re.compile(r'[\←\→\•]|---')
    
    @classmethod
    def extract_text_from_markdown(cls, content: str) -> Tuple[str, List[Tuple[int, str]]]:
        """
        Extract clean text from markdown content.
        
        Returns:
            Tuple of (chapter_title, list of (verse_number, verse_text))
        """
        lines = content.split('\n')
        
        # Extract chapter title (first # heading)
        chapter_title = ''
        for line in lines:
            if line.startswith('# '):
                chapter_title = line[2:].strip()
                break
        
        # Remove YAML front matter
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                content = '---'.join(parts[2:])
        
        # Split into verses
        verses = []
        current_verse_num = 0
        current_verse_text = []
        
        for line in content.split('\n'):
            # Check for verse marker
            verse_match = cls.VERSE_MARKER_PATTERN.match(line.strip())
            if verse_match:
                # Save previous verse if exists
                if current_verse_num > 0 and current_verse_text:
                    verse_text = ' '.join(current_verse_text)
                    cleaned = cls.clean_text(verse_text)
                    if cleaned:
                        verses.append((current_verse_num, cleaned))
                
                current_verse_num = int(verse_match.group(1))
                current_verse_text = []
            elif current_verse_num > 0:
                # Add line to current verse
                cleaned_line = cls.clean_text(line)
                if cleaned_line:
                    current_verse_text.append(cleaned_line)
        
        # Don't forget the last verse
        if current_verse_num > 0 and current_verse_text:
            verse_text = ' '.join(current_verse_text)
            cleaned = cls.clean_text(verse_text)
            if cleaned:
                verses.append((current_verse_num, cleaned))
        
        return chapter_title, verses
    
    @classmethod
    def clean_text(cls, text: str) -> str:
        """
        Clean text for TTS by removing lexicon references and formatting.
        """
        # Remove lexicon references [[G####]] first (double brackets)
        text = cls.LEXICON_PATTERN.sub('', text)
        
        # Remove any remaining incomplete double brackets
        text = cls.LEXICON_INCOMPLETE_PATTERN.sub('', text)
        
        # Remove other wiki-style double bracket links
        text = cls.LINK_PATTERN.sub('', text)
        
        # Remove single square brackets around words (e.g., [are], [the])
        # These are interpreted as SSML paralinguistic notation by Azure TTS
        text = re.sub(r'\[([^\]]+)\]', r'\1', text)
        
        # Remove navigation symbols
        text = cls.NAV_PATTERN.sub('', text)
        
        # Remove markdown formatting
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
        text = re.sub(r'\*([^*]+)\*', r'\1', text)  # Italic
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)  # Links
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text
    
    @classmethod
    def generate_ssml(cls, chapter_title: str, verses: List[Tuple[int, str]], 
                      voice_name: str, rate: float = 0.9) -> str:
        """
        Generate SSML for the chapter.
        """
        # Build the text content
        text_parts = [f"{chapter_title}."]
        
        for verse_num, verse_text in verses:
            text_parts.append(verse_text)
        
        full_text = ' '.join(text_parts)
        
        # Escape XML special characters
        full_text = full_text.replace('&', '&amp;')
        full_text = full_text.replace('<', '&lt;')
        full_text = full_text.replace('>', '&gt;')
        full_text = full_text.replace('"', '&quot;')
        full_text = full_text.replace("'", '&apos;')
        
        # Generate SSML
        ssml = f'''<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="{voice_name}">
        <prosody rate="{rate}">
            {full_text}
        </prosody>
    </voice>
</speak>'''
        
        return ssml


# ============================================================================
# Chapter Discovery
# ============================================================================

class ChapterDiscovery:
    """Discover and filter Bible chapters."""
    
    def __init__(self, config: Config):
        self.config = config
    
    def get_all_chapters(self) -> List[Dict]:
        """
        Get all chapter files from the content manifest.
        
        Returns list of dicts with: path, book, chapter, output_path
        """
        chapters = []
        
        # Load content manifest
        if self.config.content_manifest_path.exists():
            with open(self.config.content_manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
            
            for file_path in manifest.get('files', []):
                if file_path.startswith('bibles/') and file_path.endswith('.md'):
                    chapter_info = self._parse_chapter_path(file_path)
                    if chapter_info:
                        chapters.append(chapter_info)
        else:
            # Fallback: scan bibles directory
            chapters = self._scan_bibles_directory()
        
        return chapters
    
    def _parse_chapter_path(self, file_path: str) -> Optional[Dict]:
        """
        Parse a file path to extract book and chapter info.
        
        Examples:
            bibles/BSB/BER-Genesis/Genesis 1.md -> Genesis, 1
            bibles/BSB/BER-1 Samuel/1 Samuel 3.md -> 1 Samuel, 3
        """
        parts = file_path.split('/')
        if len(parts) < 4:
            return None
        
        filename = parts[-1]  # e.g., "Genesis 1.md"
        book_dir = parts[-2]  # e.g., "BER-Genesis"
        
        # Extract book name from directory (remove BER- prefix)
        if book_dir.startswith('BER-'):
            book_name = book_dir[4:]
        else:
            book_name = book_dir
        
        # Extract chapter number from filename
        name_without_ext = filename[:-3]  # Remove .md
        
        # Check if this is a chapter file (ends with number)
        # Handle cases like "Genesis 1", "1 Samuel 3", "Psalms 119"
        match = re.match(r'^(.+?)\s+(\d+)$', name_without_ext)
        if not match:
            return None  # This is a book index file, not a chapter
        
        book_from_filename = match.group(1)
        chapter_num = int(match.group(2))
        
        # Generate output filename
        output_name = f"{book_from_filename.replace(' ', '_')}_{chapter_num}.mp3"
        output_path = self.config.audio_dir / output_name
        
        return {
            'path': self.config.base_dir / file_path,
            'book': book_from_filename,
            'chapter': chapter_num,
            'output_path': output_path,
            'source_path': file_path
        }
    
    def _scan_bibles_directory(self) -> List[Dict]:
        """Fallback method to scan bibles directory directly."""
        chapters = []
        
        if not self.config.bibles_dir.exists():
            return chapters
        
        for book_dir in self.config.bibles_dir.rglob('BER-*'):
            if not book_dir.is_dir():
                continue
            
            for chapter_file in book_dir.glob('*.md'):
                chapter_info = self._parse_chapter_path(str(chapter_file.relative_to(self.config.base_dir)))
                if chapter_info:
                    chapters.append(chapter_info)
        
        return chapters
    
    def filter_chapters(self, chapters: List[Dict], 
                        book: Optional[str] = None,
                        chapter: Optional[int] = None,
                        skip_existing: bool = True) -> List[Dict]:
        """
        Filter chapters based on criteria.
        """
        filtered = []
        
        for ch in chapters:
            # Filter by book
            if book and ch['book'].lower() != book.lower():
                continue
            
            # Filter by chapter number
            if chapter is not None and ch['chapter'] != chapter:
                continue
            
            # Skip existing files
            if skip_existing and ch['output_path'].exists():
                continue
            
            filtered.append(ch)
        
        return filtered


# ============================================================================
# Azure TTS Client
# ============================================================================

class AzureTTSClient:
    """Wrapper for Azure Cognitive Services TTS."""
    
    def __init__(self, config: Config):
        self.config = config
        self.speech_config = None
        
    def initialize(self) -> bool:
        """Initialize the Azure speech client."""
        if not self.config.validate_credentials():
            return False
        
        self.speech_config = speechsdk.SpeechConfig(
            subscription=self.config.subscription_key,
            region=self.config.region
        )
        return True
    
    def list_voices(self) -> List[Dict]:
        """
        List available voices from Azure TTS.
        
        Returns list of dicts with voice info.
        """
        if not self.speech_config:
            if not self.initialize():
                return []
        
        # Use the REST API to get a comprehensive list
        import urllib.request
        import urllib.error
        
        url = f"https://{self.config.region}.tts.speech.microsoft.com/cognitiveservices/voices/list"
        
        req = urllib.request.Request(url)
        req.add_header('Ocp-Apim-Subscription-Key', self.config.subscription_key)
        
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                # Filter for English voices and sort
                english_voices = [v for v in data if v.get('Locale', '').startswith('en-')]
                english_voices.sort(key=lambda x: (x.get('Locale', ''), x.get('ShortName', '')))
                
                return english_voices
        except urllib.error.URLError as e:
            print(f"Error fetching voices: {e}")
            return []
    
    def synthesize(self, ssml: str, voice_name: str) -> Optional[bytes]:
        """
        Synthesize speech from SSML.
        
        Returns audio data as bytes, or None on failure.
        """
        if not self.speech_config:
            if not self.initialize():
                return None
        
        self.speech_config.speech_synthesis_voice_name = voice_name
        
        # Create synthesizer with no audio output (we want raw data)
        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=self.speech_config,
            audio_config=None
        )
        
        # Synthesize
        result = synthesizer.speak_ssml_async(ssml).get()
        
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            return result.audio_data
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            print(f"Synthesis canceled: {cancellation.reason}")
            if cancellation.reason == speechsdk.CancellationReason.Error:
                print(f"Error details: {cancellation.error_details}")
            return None
        else:
            print(f"Unexpected result: {result.reason}")
            return None


# ============================================================================
# Audio Generator
# ============================================================================

class AudioGenerator:
    """Main class for generating audio files."""
    
    def __init__(self, config: Config):
        self.config = config
        self.tts_client = AzureTTSClient(config)
        self.discovery = ChapterDiscovery(config)
    
    def generate_audio(self, chapter_info: Dict, voice_name: str, 
                       dry_run: bool = False) -> bool:
        """
        Generate audio for a single chapter.
        """
        # Read markdown file
        try:
            with open(chapter_info['path'], 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Error reading {chapter_info['path']}: {e}")
            return False
        
        # Extract text
        chapter_title, verses = TextProcessor.extract_text_from_markdown(content)
        
        if not verses:
            print(f"No verses found in {chapter_info['path']}")
            return False
        
        # Generate SSML
        ssml = TextProcessor.generate_ssml(
            chapter_title, verses, voice_name, self.config.speech_rate
        )
        
        if dry_run:
            print(f"  Would generate: {chapter_info['output_path'].name}")
            print(f"  Title: {chapter_title}, Verses: {len(verses)}")
            return True
        
        # Ensure output directory exists
        self.config.audio_dir.mkdir(parents=True, exist_ok=True)
        
        # Synthesize
        audio_data = self.tts_client.synthesize(ssml, voice_name)
        
        if audio_data is None:
            return False
        
        # Write MP3 file
        try:
            with open(chapter_info['output_path'], 'wb') as f:
                f.write(audio_data)
            return True
        except Exception as e:
            print(f"Error writing {chapter_info['output_path']}: {e}")
            return False
    
    def generate_all(self, voice_name: str,
                     book: Optional[str] = None,
                     chapter: Optional[int] = None,
                     skip_existing: bool = True,
                     dry_run: bool = False,
                     force: bool = False) -> Tuple[int, int]:
        """
        Generate audio for all matching chapters.
        
        Returns (success_count, failure_count)
        """
        # Initialize TTS client
        if not dry_run and not self.tts_client.initialize():
            return 0, 0
        
        # Get chapters
        all_chapters = self.discovery.get_all_chapters()
        
        if not all_chapters:
            print("No chapters found!")
            return 0, 0
        
        # Filter chapters
        chapters = self.discovery.filter_chapters(
            all_chapters, 
            book=book, 
            chapter=chapter,
            skip_existing=skip_existing and not force
        )
        
        if not chapters:
            if book or chapter:
                print("No matching chapters found.")
            else:
                print("All audio files already exist. Use --force to regenerate.")
            return 0, 0
        
        # Show summary
        total = len(chapters)
        skipped = len(all_chapters) - total
        print(f"\nFound {total} chapters to process")
        if skipped > 0:
            print(f"({skipped} chapters skipped - audio already exists)")
        
        if dry_run:
            print("\nDry run - no files will be created:\n")
            for ch in chapters:
                self.generate_audio(ch, voice_name, dry_run=True)
            return total, 0
        
        # Process chapters
        success_count = 0
        failure_count = 0
        
        # Use tqdm for progress if available
        iterator = tqdm(chapters, desc="Generating audio") if tqdm else chapters
        
        for ch in iterator:
            if tqdm is None:
                print(f"\nProcessing: {ch['book']} {ch['chapter']}...", end=' ')
            
            success = self.generate_audio(ch, voice_name)
            
            if success:
                success_count += 1
                if tqdm is None:
                    print("✓")
            else:
                failure_count += 1
                if tqdm is None:
                    print("✗")
        
        return success_count, failure_count


# ============================================================================
# CLI Interface
# ============================================================================

def print_voices_table(voices: List[Dict]):
    """Print a formatted table of available voices."""
    if not voices:
        print("No voices found.")
        return
    
    print("\nAvailable English Voices:")
    print("-" * 80)
    print(f"{'Name':<35} {'Gender':<8} {'Locale':<12} {'Type'}")
    print("-" * 80)
    
    for voice in voices:
        name = voice.get('ShortName', 'Unknown')
        gender = voice.get('Gender', 'Unknown')
        locale = voice.get('Locale', 'Unknown')
        voice_type = voice.get('VoiceType', 'Standard')
        
        print(f"{name:<35} {gender:<8} {locale:<12} {voice_type}")
    
    print("-" * 80)
    print(f"\nTotal: {len(voices)} voices")
    print("\nTip: Use the 'ShortName' with --voice option")


def main():
    parser = argparse.ArgumentParser(
        description='Generate MP3 audio files for Bible chapters using Azure TTS',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
            Examples:
            %(prog)s --list-voices                    List available voices
            %(prog)s --voice "en-US-JennyNeural"      Generate all chapters
            %(prog)s --voice "en-US-JennyNeural" --book "Matthew"  Generate specific book
            %(prog)s --voice "en-US-JennyNeural" --dry-run         Preview without generating

            Environment Variables:
            AZURE_TTS_KEY      Your Azure Speech Services subscription key
            AZURE_TTS_REGION   Azure region (default: eastus)
            '''
    )
    
    # Azure credentials
    parser.add_argument('--key', help='Azure TTS subscription key')
    parser.add_argument('--region', default='eastus', help='Azure region (default: eastus)')
    
    # Voice selection
    parser.add_argument('--list-voices', action='store_true', 
                        help='List available voices and exit')
    parser.add_argument('--voice', metavar='NAME',
                        help='Voice name to use for synthesis')
    
    # Filtering options
    parser.add_argument('--book', metavar='NAME',
                        help='Generate audio for specific book only')
    parser.add_argument('--chapter', type=int, metavar='NUM',
                        help='Generate audio for specific chapter (requires --book)')
    
    # Processing options
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be done without generating files')
    parser.add_argument('--force', action='store_true',
                        help='Regenerate files even if they exist')
    
    args = parser.parse_args()
    
    # Initialize configuration
    config = Config()
    
    # Override with command line args
    if args.key:
        config.subscription_key = args.key
    if args.region:
        config.region = args.region
    
    # Create generator
    generator = AudioGenerator(config)
    
    # Handle --list-voices
    if args.list_voices:
        if not generator.tts_client.initialize():
            sys.exit(1)
        
        voices = generator.tts_client.list_voices()
        print_voices_table(voices)
        sys.exit(0)
    
    # Require --voice for generation
    if not args.voice:
        parser.error("--voice is required for audio generation. Use --list-voices to see available options.")
    
    # Validate --chapter requires --book
    if args.chapter and not args.book:
        parser.error("--chapter requires --book to be specified")
    
    # Run generation
    print(f"Using voice: {args.voice}")
    print(f"Output directory: {config.audio_dir}")
    
    success, failures = generator.generate_all(
        voice_name=args.voice,
        book=args.book,
        chapter=args.chapter,
        skip_existing=True,
        dry_run=args.dry_run,
        force=args.force
    )
    
    # Print summary
    if not args.dry_run and (success > 0 or failures > 0):
        print(f"\n{'='*50}")
        print(f"Generation complete!")
        print(f"  Success: {success}")
        print(f"  Failures: {failures}")
        print(f"{'='*50}")
    
    sys.exit(0 if failures == 0 else 1)


if __name__ == '__main__':
    main()
