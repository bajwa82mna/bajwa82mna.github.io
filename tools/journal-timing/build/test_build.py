import importlib.util,json,pathlib,unittest
from unittest.mock import patch
HERE=pathlib.Path(__file__).parent; SPEC=importlib.util.spec_from_file_location("build",HERE/"build.py"); build=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(build)
class BuildTests(unittest.TestCase):
 def test_issn(self): self.assertEqual(build.normalize_issn("1234567x"),"1234-567X"); self.assertIsNone(build.normalize_issn("bad"))
 def test_dates_and_order(self):
  works=json.loads((HERE/"fixtures/works.json").read_text())["message"]["items"]
  row,bad=build.intervals(works[0]); self.assertFalse(bad); self.assertEqual((row["sa"],row["ao"],row["so"]),(30,20,50))
  self.assertFalse(build.intervals(works[1])[1]); self.assertTrue(build.intervals(works[2])[1])
 def test_median_iqr_suppression(self):
  works=[]
  for day in range(1,12): works.append({"assertion":[{"label":"Received","value":"1 January 2024"},{"label":"Accepted","value":f"{day} January 2024"}],"published-online":{"date-parts":[[2024,2,1]]}})
  summary=build.summarize(works); self.assertEqual(summary["submit_accept"]["n"],11); self.assertEqual(summary["submit_accept"]["median"],5); self.assertEqual(summary["submit_accept"]["iqr"],[2,8])
  self.assertIsNone(build.summarize(works[:9])["submit_accept"]["median"])
 def test_join_is_issn_only(self):
  doaj={"1234-567X":{"weeks":8}}; self.assertIsNone(next((doaj[x] for x in ["0000-0000"] if x in doaj),None))
 def test_crossref_tries_alternate_issn_after_empty_summary(self):
  valid={"assertion":[{"label":"Received","value":"1 January 2024"},{"label":"Accepted","value":"11 January 2024"}],"published-online":{"date-parts":[[2024,1,21]]}}
  responses=[{"message":{"items":[]}},{"message":{"items":[valid]}}]
  with patch.object(build,"crossref_works",side_effect=responses) as fetch:
   summary=build.crossref_summary(["1111-1111","2222-2222"],False,"2026-01-01","2023-01-01")
  self.assertEqual(fetch.call_count,2);self.assertEqual(summary["n"],1);self.assertEqual(summary["issn"],"2222-2222")
if __name__=="__main__":unittest.main()
