import unittest
from pathlib import Path
import sys
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app import CharacterConfig, draw_mouth_sprite

class TestCompositor(unittest.TestCase):
    def test_sprite_generation_dimensions(self):
        cfg = CharacterConfig(
            x=50.0, y=50.0, width=16.0, height=10.0, style="rounded",
            skin_color="#ffcc99", line_color="#000000", outline_width=2.0
        )
        w, h = 100, 60
        sprite = draw_mouth_sprite("A", cfg, w, h)
        self.assertIsInstance(sprite, Image.Image)
        self.assertEqual(sprite.size, (w, h))

    def test_yaw_blend_zones(self):
        cfg = CharacterConfig(
            x=50.0, y=50.0, width=16.0, height=10.0, style="rounded",
            skin_color="#ffcc99", line_color="#000000", outline_width=2.0,
            face_angle=20.0
        )
        w, h = 100, 60
        sprite = draw_mouth_sprite("B", cfg, w, h)
        self.assertEqual(sprite.size, (w, h))

if __name__ == "__main__":
    unittest.main()
