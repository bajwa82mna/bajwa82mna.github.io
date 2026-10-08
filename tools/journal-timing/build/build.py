#!/usr/bin/env python3
"""Build the browser-only Journal Timing snapshot from DOAJ and Crossref."""
from __future__ import annotations
import argparse, csv, datetime as dt, json, pathlib, re, statistics, time, urllib.error, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT.parents[1]
CACHE = ROOT / "build" / "cache"
UA = "smbajwa.com-journal-timing (https://smbajwa.com)"

def normalize_issn(value):
    compact = re.sub(r"[^0-9Xx]", "", str(value or "")).upper()
    return f"{compact[:4]}-{compact[4:]}" if re.fullmatch(r"\d{7}[\dX]", compact) else None

def load_const(path, name):
    text = path.read_text(encoding="utf-8")
    match = re.search(rf"(?:const|window\.[A-Z_]+=){name if name != 'RAW' else ''}(\{{.*\}});\s*$", text, re.S)
    if name == "RAW": match = re.fullmatch(r"\s*const RAW=(.*);\s*", text, re.S)
    if name == "EXTRA": match = re.search(r"const EXTRA=(.*);\s*$", text, re.S)
    if not match: raise ValueError(f"Cannot parse {path}")
    return json.loads(match.group(1))

def parse_date(value):
    if isinstance(value, dict):
        parts = value.get("date-parts", [[]])[0]
        try: return dt.date(*map(int, parts[:3])) if len(parts) >= 3 else None
        except (ValueError, TypeError): return None
    text = str(value or "").strip()
    for fmt in ("%d %B %Y", "%d %b %Y", "%Y-%m-%d", "%d-%m-%Y"):
        try: return dt.datetime.strptime(text, fmt).date()
        except ValueError: pass
    return None

def assertion_date(work, label):
    wanted = label.casefold()
    for item in work.get("assertion") or []:
        key = str(item.get("label") or item.get("name") or "").strip().casefold()
        if key == wanted:
            parsed = parse_date(item.get("value"))
            if parsed: return parsed
    return None

def published_date(work):
    for key in ("published-online", "published"):
        parsed = parse_date(work.get(key))
        if parsed: return parsed
    return None

def intervals(work):
    received, accepted, online = assertion_date(work, "received"), assertion_date(work, "accepted"), published_date(work)
    present = [x for x in (received, accepted, online) if x]
    if len(present) >= 2 and present != sorted(present): return None, True
    if present and (max(present) - min(present)).days > 3650: return None, True
    return {
        "sa": (accepted-received).days if received and accepted else None,
        "ao": (online-accepted).days if accepted and online else None,
        "so": (online-received).days if received and online else None,
        "year": online.year if online else None,
    }, False

def percentile(values, fraction):
    values = sorted(values)
    if not values: return None
    position = (len(values)-1) * fraction; lo = int(position); hi = min(lo+1, len(values)-1)
    return values[lo] + (values[hi]-values[lo]) * (position-lo)

def summarize(works, minimum=10):
    valid, rejected = [], 0
    for work in works:
        row, bad = intervals(work); rejected += int(bad)
        if row and any(row[k] is not None for k in ("sa","ao","so")): valid.append(row)
    def metric(key):
        vals = [x[key] for x in valid if x[key] is not None]
        return {"n":len(vals), "median":round(statistics.median(vals)) if len(vals)>=minimum else None,
                "iqr":[round(percentile(vals,.25)),round(percentile(vals,.75))] if len(vals)>=minimum else None}
    years=[x["year"] for x in valid if x["year"]]
    return {"submit_accept":metric("sa"),"accept_online":metric("ao"),"submit_online":metric("so"),
            "n":len(valid),"years":[min(years),max(years)] if years else [],"rejected":rejected}

def load_journals():
    raw=load_const(SITE/"tools/emerging-journals-2026/data.js","RAW")
    extra=load_const(SITE/"tools/emerging-journals-2026/data-extra.js","EXTRA")
    rows=[]
    for index,row in enumerate(raw["rows"]):
        issns=list(dict.fromkeys(x for x in (normalize_issn(v) for v in row[4:6]) if x))
        if not issns: continue
        ext=extra["rows"][index] if index < len(extra["rows"]) else None
        rows.append({"title":row[1],"subject":raw["cats"][row[2]],"issns":issns,
                     "publisher":ext[7] if ext else "","oa":bool(ext and ext[4])})
    priority={"Agriculture & Forestry":0,"Biology":1}
    return sorted(rows,key=lambda x:(priority.get(x["subject"],2),x["title"].casefold()))

def load_doaj(path):
    by_issn={}
    with pathlib.Path(path).open(encoding="utf-8-sig",newline="") as handle:
        for row in csv.DictReader(handle):
            weeks=str(row.get("Average number of weeks between article submission and publication") or "").strip()
            try: weeks=float(weeks)
            except ValueError: weeks=None
            for field in ("Journal ISSN (print version)","Journal EISSN (online version)"):
                issn=normalize_issn(row.get(field))
                if issn: by_issn[issn]={"weeks":weeks,"url":row.get("URL in DOAJ") or "https://doaj.org/","publisher":row.get("Publisher") or ""}
    return by_issn

def request_json(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/json"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req,timeout=60) as response:return json.load(response)
        except (urllib.error.URLError,urllib.error.HTTPError,TimeoutError):
            if attempt==4: raise
            time.sleep(2**attempt)

def crossref_works(issn,refresh=False):
    CACHE.mkdir(parents=True,exist_ok=True); path=CACHE/f"crossref-{issn}.json"
    if path.exists() and not refresh:return json.loads(path.read_text())
    start=(dt.date.today()-dt.timedelta(days=1096)).isoformat()
    params=urllib.parse.urlencode({"filter":f"from-pub-date:{start},type:journal-article","rows":300,"select":"assertion,published,published-online"})
    url=f"https://api.crossref.org/journals/{urllib.parse.quote(issn)}/works?{params}"
    payload=request_json(url); path.write_text(json.dumps(payload,separators=(",",":")))
    time.sleep(.25); return payload

def crossref_summary(issns,refresh,today,window_start):
    empty=None
    for issn in issns:
        try:
            payload=crossref_works(issn,refresh); summary=summarize(payload.get("message",{}).get("items",[]))
            summary.update({"source":"Crossref","retrieved":today,"window":[window_start,today],"issn":issn})
            if summary["n"]>0:return summary
            empty=summary
        except Exception as exc: print(f"Crossref {issn}: {exc}")
    return empty

def build(args):
    journals=load_journals(); doaj=load_doaj(args.doaj_csv); attempted=with_timing=0; output=[]; today=dt.date.today().isoformat(); window_start=(dt.date.today()-dt.timedelta(days=1096)).isoformat()
    for journal in journals:
        dj=next((doaj[x] for x in journal["issns"] if x in doaj),None)
        record={"j":journal["title"],"p":journal["publisher"] or (dj or {}).get("publisher",""),"s":journal["subject"],"i":journal["issns"],"oa":journal["oa"] or bool(dj),"dw":(dj or {}).get("weeks"),"du":(dj or {}).get("url"),"dr":today if dj else None}
        if attempted < args.max_journals:
            attempted+=1
            summary=crossref_summary(journal["issns"],args.refresh,today,window_start)
            if summary is not None:record["x"]=summary;with_timing+=int(summary["n"]>0)
        if dj or record.get("x",{}).get("n",0): output.append(record)
    coverage={"dataset_journals":22281,"joinable_issn_journals":len(journals),"journals_attempted":attempted,"journals_with_crossref_timing":with_timing,"journals_with_doaj_weeks":sum(1 for x in output if x.get("dw") is not None),"retrieved":today,"window_start":window_start,"window_end":today}
    (ROOT/"data").mkdir(exist_ok=True)
    (ROOT/"data/timing-data.js").write_text("window.JOURNAL_TIMING_DATA="+json.dumps(output,ensure_ascii=False,separators=(",",":"))+";\n")
    (ROOT/"data/coverage.json").write_text(json.dumps(coverage,indent=2)+"\n")
    (ROOT/"data/coverage.js").write_text("window.JOURNAL_TIMING_COVERAGE="+json.dumps(coverage,separators=(",",":"))+";\n")
    print(json.dumps(coverage,indent=2))

if __name__=="__main__":
    parser=argparse.ArgumentParser(); parser.add_argument("--doaj-csv",required=True); parser.add_argument("--max-journals",type=int,default=25); parser.add_argument("--refresh",action="store_true"); build(parser.parse_args())
