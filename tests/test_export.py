"""Check portable exports and preservation of existing destinations."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("export_lab", ROOT / "scripts" / "export_lab.py")
EXPORT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EXPORT)


class ExportTests(unittest.TestCase):
    def test_all_topics_and_languages_export_complete_offline_resources(self):
        with tempfile.TemporaryDirectory() as directory:
            for topic in ("fold", "gradient", "convolution", "cnn", "resnet", "transformer", "mlp"):
                for language in ("zh", "en"):
                    destination = Path(directory) / ("实验-" + topic + "-" + language)
                    entry = EXPORT.export_lab(destination, topic, language)
                    self.assertEqual(entry, destination / "index.html")
                    html = entry.read_text(encoding="utf-8")
                    self.assertIn('data-initial-topic="' + topic + '"', html)
                    self.assertIn('data-initial-language="' + language + '"', html)
                    for name in ("style.css", "design.css", "controls.css", "networks.css", "core.js", "network-model.js", "networks-ui.js", "mlp-model.js", "mlp-ui.js", "app.js", "LICENSE", "python/deep_learning_lab.py"):
                        self.assertTrue((destination / name).is_file(), name)
                    self.assertEqual((destination / "core.js").read_bytes(), (ROOT / "assets" / "lab" / "core.js").read_bytes())

    def test_existing_work_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "existing"
            destination.mkdir()
            marker = destination / "keep.txt"
            marker.write_text("user work", encoding="utf-8")
            with self.assertRaises(FileExistsError):
                EXPORT.export_lab(destination)
            self.assertEqual(marker.read_text(encoding="utf-8"), "user work")
            self.assertEqual(list(destination.iterdir()), [marker])

    def test_invalid_configuration_does_not_create_destination(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "invalid"
            with self.assertRaises(ValueError):
                EXPORT.export_lab(destination, "unimplemented", "en")
            self.assertFalse(destination.exists())


if __name__ == "__main__":
    unittest.main()
