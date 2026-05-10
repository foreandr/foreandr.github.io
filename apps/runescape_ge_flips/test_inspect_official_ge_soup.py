import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from inspect_official_ge_soup import extract_last_trade180_volume


class ExtractLastTrade180VolumeTest(unittest.TestCase):
    def test_extracts_last_trade180_value(self) -> None:
        html = """
            average180.push([new Date('2026/05/08'), 617, 628]);
            trade180.push([new Date('2026/05/08'), 133]);
            average180.push([new Date('2026/05/09'), 617, 627]);
            trade180.push([new Date('2026/05/09'), 1891]);
        """

        self.assertEqual(extract_last_trade180_volume(html), 1891)


if __name__ == "__main__":
    unittest.main()
