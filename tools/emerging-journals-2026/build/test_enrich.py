import importlib.util
import json
import pathlib
import unittest


BUILD = pathlib.Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("enrich", BUILD / "enrich.py")


class EnrichTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.enrich = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(cls.enrich)

    def test_normalize_issn_accepts_hyphenated_values(self):
        self.assertEqual(self.enrich.normalize_issn("1234-567X"), "1234-567X")
        self.assertEqual(self.enrich.normalize_issn("1234567x"), "1234-567X")
        self.assertIsNone(self.enrich.normalize_issn("not-an-issn"))

    def test_issn_validation_blanks_records_without_a_title_confirmed_openalex_match(self):
        raw = {"rows": [[1, "Chemical Reviews", 3, 1, "2520-1131"], [2, "Good Journal", 3, 1, "2049-3630"]]}
        extras = [None, ["", None, None, 1, 0, 0, None, "", "S1", "", None]]
        report = self.enrich.blank_unvalidated_issns(raw, extras)
        self.assertEqual(raw["rows"][0][4:], [""])
        self.assertEqual(raw["rows"][1][4:], ["2049-3630"])
        self.assertEqual(report, {"records_corrected": 1, "issns_blanked": 1, "invalid_checksum": 0, "title_mismatch_or_unmatched": 1})

    def test_pick_source_requires_exact_issn_overlap(self):
        sources = [
            {"id": "https://openalex.org/S1", "display_name": "Alpha Journal", "issn": ["1111-1111"]},
            {"id": "https://openalex.org/S2", "display_name": "Beta Journal", "issn": ["2222-2222"]},
        ]
        self.assertEqual(
            self.enrich.pick_source({"2222-2222"}, sources, "Beta Journal")["id"],
            "https://openalex.org/S2",
        )
        self.assertIsNone(self.enrich.pick_source({"3333-3333"}, sources, "Beta Journal"))
        self.assertIsNone(self.enrich.pick_source({"2222-2222"}, sources, "Totally Different Title"))

    def test_name_guard_folds_accents_ampersands_and_stopwords(self):
        self.assertTrue(self.enrich.names_agree("Revista de Biología & Ecología", "Revista Biologia and Ecologia"))
        self.assertFalse(self.enrich.names_agree("Journal of Botany", "International Physics Review"))

    def test_compact_source_uses_documented_field_order(self):
        source = json.loads((BUILD / "fixtures" / "source.json").read_text())
        self.assertEqual(
            self.enrich.compact_source(source),
            ["https://journal.example/", 3.25, 17, 123, 1, 0, 900, "Example Press", "S42", "GB", None],
        )

    def test_compact_trend_keeps_year_citations_and_works(self):
        source = json.loads((BUILD / "fixtures" / "source.json").read_text())
        self.assertEqual(self.enrich.compact_trend(source), [[2024, 12, 8], [2025, 25, 10]])

    def test_trend_chunk_number_maps_first_middle_and_last_rows(self):
        self.assertEqual(self.enrich.trend_chunk_number(0, 22281), 0)
        self.assertEqual(self.enrich.trend_chunk_number(11140, 22281), 11)
        self.assertEqual(self.enrich.trend_chunk_number(22280, 22281), 23)

    def test_warning_parser_is_available_but_ingestion_defaults_disabled(self):
        warnings = self.enrich.parse_warnings(BUILD / "fixtures" / "warnings.csv", 2025)
        self.assertEqual(warnings["example journal"], 2025)
        self.assertFalse(self.enrich.WARNING_LIST_ENABLED)

    def test_report_counts_missing_values(self):
        extras = [["", None, 0, 4, 0, 0, None, "", "S1", "", None], None]
        report = self.enrich.make_report(extras)
        self.assertEqual(report["matched"], 1)
        self.assertEqual(report["missing"]["homepage_url"], 1)
        self.assertEqual(report["missing"]["h_index"], 0)
        self.assertEqual(report["missing"]["openalex_id"], 0)
        self.assertEqual(report["sources"]["openalex"]["matched"], 1)

    def test_empty_report_still_has_per_source_rates(self):
        report = self.enrich.make_report([None, None])
        self.assertEqual(report["sources"]["openalex"]["match_rate"], 0)
        self.assertNotIn("scimago", report["sources"])
        self.assertFalse(report["sources"]["warning_list"]["enabled"])


class StaticUiContractTests(unittest.TestCase):
    def test_ui_has_enrichment_controls_and_disclosure(self):
        html = (BUILD.parent.parent / "journal-hub" / "index.html").read_text()
        app = (BUILD.parent.parent / "journal-hub" / "app.js").read_text()
        self.assertIn('id="oa-only"', html)
        self.assertIn('value="timing"', html)
        self.assertIn("OpenAlex", html + app)
        self.assertIn("No JIF", html)
        self.assertIn('../emerging-journals-2026/data-extra.js', html)
        self.assertIn("openProfile", app)

    def test_ui_has_hot_search_share_drawer_tabs_and_lazy_trends(self):
        html = (BUILD.parent.parent / "journal-hub" / "index.html").read_text()
        scripts = (BUILD.parent.parent / "journal-hub" / "app.js").read_text()
        page = html + scripts
        for required in (
            "Find journals",
            "Match my abstract",
            "Compare",
            "Trends / Explore",
            "Share Journal Hub",
            "OpenAlex",
            "Timing evidence",
            "Trust signals",
            'href="/credits/">Credits and data sources',
            "No JIF",
        ):
            self.assertIn(required, page)
        for removed in ("Data sources and credits", "Built on", "warning-list field remains disabled"):
            self.assertNotIn(removed, page)

    def test_data_js_remains_parseable(self):
        text = (BUILD.parent / "data.js").read_text()
        payload = text.removeprefix("const RAW=").rstrip(";\n")
        raw = json.loads(payload)
        self.assertEqual(len(raw["rows"]), 22281)

    def test_monolithic_trends_are_removed_and_chunks_are_bounded(self):
        self.assertFalse((BUILD.parent / "data-trends.js").exists())
        chunks = sorted((BUILD.parent / "trends").glob("trends-*.js"))
        self.assertEqual(len(chunks), 24)
        self.assertLessEqual(max(path.stat().st_size for path in chunks), 400_000)

    def test_generated_assets_contain_no_bundled_scimago_fields_or_trends(self):
        extra = (BUILD.parent / "data-extra.js").read_text()
        self.assertNotIn('"sjr"', extra.lower())
        self.assertNotIn('sjr_quartile', extra.lower())
        self.assertNotIn('sjr_year', extra.lower())
        for chunk in (BUILD.parent / "trends").glob("trends-*.js"):
            self.assertNotIn('"sjr"', chunk.read_text().lower())


if __name__ == "__main__":
    unittest.main()
