import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from csv_to_json import convert_value


class CsvToJsonTest(unittest.TestCase):
    def test_trade_volume_converts_to_int(self) -> None:
        self.assertEqual(convert_value("trade_volume", "1891"), 1891)


if __name__ == "__main__":
    unittest.main()
