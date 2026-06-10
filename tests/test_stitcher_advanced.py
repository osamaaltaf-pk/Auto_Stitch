import unittest
from app.core.stitcher import parse_text_overlay_markup, estimate_text_width, resolve_ffmpeg_color

class TestStitcherAdvanced(unittest.TestCase):
    def test_parse_text_overlay_markup(self):
        # Empty text
        self.assertEqual(parse_text_overlay_markup("", "white"), [])
        
        # Plain text
        self.assertEqual(parse_text_overlay_markup("hello world", "white"), [
            {"text": "hello world", "color": "white"}
        ])
        
        # Only bracket tag
        self.assertEqual(parse_text_overlay_markup("[yellow:hello]", "white"), [
            {"text": "hello", "color": "yellow"}
        ])
        
        # Mixed bracket tag and plain text
        self.assertEqual(parse_text_overlay_markup("hello [yellow:world] test", "white"), [
            {"text": "hello ", "color": "white"},
            {"text": "world", "color": "yellow"},
            {"text": " test", "color": "white"}
        ])
        
        # Multiple tags
        self.assertEqual(parse_text_overlay_markup("[red:first] [blue:second]", "white"), [
            {"text": "first", "color": "red"},
            {"text": " ", "color": "white"},
            {"text": "second", "color": "blue"}
        ])

    def test_estimate_text_width(self):
        font_size = 40.0
        w1 = estimate_text_width("hello", font_size)
        w2 = estimate_text_width("HELLO", font_size)
        # Upper case should be wider than lowercase
        self.assertGreater(w2, w1)
        
        # Narrow characters should be smaller
        w3 = estimate_text_width("ill", font_size)
        w4 = estimate_text_width("abc", font_size)
        self.assertLess(w3, w4)

    def test_resolve_ffmpeg_color(self):
        self.assertEqual(resolve_ffmpeg_color("white"), "#ffffff")
        self.assertEqual(resolve_ffmpeg_color("split-white-yellow"), "#ffffff")
        self.assertEqual(resolve_ffmpeg_color("gradient-red-yellow"), "#ef4444")
        self.assertEqual(resolve_ffmpeg_color("#123456"), "#123456")

if __name__ == '__main__':
    unittest.main()
