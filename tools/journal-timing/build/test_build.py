import importlib.util,json,pathlib,unittest
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
if __name__=="__main__":unittest.main()
