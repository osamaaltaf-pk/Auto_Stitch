import unittest
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app import convert_to_16khz_mono_pcm

class TestFFmpegGuard(unittest.TestCase):
    def test_invalid_audio_input(self):
        input_audio = BASE_DIR / "non_existent_file.mp3"
        output_wav = BASE_DIR / "output_test.wav"
        
        with self.assertRaises(RuntimeError):
            convert_to_16khz_mono_pcm(input_audio, output_wav)

if __name__ == "__main__":
    unittest.main()
