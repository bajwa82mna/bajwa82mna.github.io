#!/usr/bin/env python3
"""Enrich the journal list with compact OpenAlex Sources metadata.

The generated EXTRA rows align by index with RAW.rows. Field order is documented in
data-extra.js. API responses are cached under build/cache/ for reproducible reruns.
"""

from __future__ import annotations

import argparse
import csv
import os
import difflib
import unicodedata
import hashlib
import json
import pathlib
import re
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data.js"
OUTPUT_PATH = ROOT / "data-extra.js"
TREND_DIR = ROOT / "trends"
TREND_CHUNK_COUNT = 24
CACHE_DIR = pathlib.Path(__file__).resolve().parent / "cache"
REPORT_PATH = pathlib.Path(__file__).resolve().parent / "report.json"
API_URL = "https://api.openalex.org/sources"
MAILTO = "contact@smbajwa.com"
WARNING_LIST_ENABLED = False
FIELD_NAMES = (
    "homepage_url",
    "2yr_mean_citedness",
    "h_index",
    "works_count",
    "is_oa",
    "is_in_doaj",
    "apc_usd",
    "host_organization_name",
    "openalex_id",
    "country_code",
    "warning_year",
)


def normalize_issn(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    compact = re.sub(r"[^0-9Xx]", "", value).upper()
    if not re.fullmatch(r"\d{7}[\dX]", compact):
        return None
    return f"{compact[:4]}-{compact[4:]}"


def valid_issn(value: object) -> bool:
    normalized = normalize_issn(value)
    if not normalized:
        return False
    compact = normalized.replace("-", "")
    total = sum((8 - index) * (10 if digit == "X" else int(digit)) for index, digit in enumerate(compact))
    return total % 11 == 0


def blank_unvalidated_issns(raw: dict, extras: list[list | None]) -> dict[str, int]:
    """Blank ISSNs unless checksum-valid and confirmed by the title-guarded OpenAlex join."""
    corrected = blanked = invalid = unmatched = 0
    for index, row in enumerate(raw["rows"]):
        values = [value for value in row[4:6] if value]
        bad_checksum = any(not valid_issn(value) for value in values)
        title_confirmed = index < len(extras) and extras[index] is not None and bool(extras[index][8])
        if values and (bad_checksum or not title_confirmed):
            corrected += 1
            blanked += len(values)
            invalid += int(bad_checksum)
            unmatched += int(not title_confirmed)
            row[4:6] = [""] * len(row[4:6])
    return {"records_corrected": corrected, "issns_blanked": blanked, "invalid_checksum": invalid, "title_mismatch_or_unmatched": unmatched}


def load_raw(path: pathlib.Path = DATA_PATH) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.fullmatch(r"\s*const RAW=(.*);\s*", text, re.DOTALL)
    if not match:
        raise ValueError(f"Could not parse {path}")
    return json.loads(match.group(1))


def chunks(values: list[str], size: int = 50):
    for start in range(0, len(values), size):
        yield values[start : start + size]


def header_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def name_key(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode().lower()
    value = value.replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "", re.sub(r"\b(the|of|and|in|for)\b", " ", value))


def names_agree(a: str, b: str) -> bool:
    """Guard against wrong ISSNs in the source list: require near-identical journal names."""
    x, y = name_key(a), name_key(b)
    if not x or not y:
        return False
    return x == y or x in y or y in x or difflib.SequenceMatcher(None, x, y).ratio() >= 0.85


def parse_warnings(path: pathlib.Path, year: int) -> dict[str, int]:
    with path.open(encoding="utf-8-sig", errors="replace", newline="") as handle:
        reader = csv.DictReader(handle)
        result = {}
        for row in reader:
            normalized = {header_key(key): value for key, value in row.items() if key}
            name = (normalized.get("journal") or "").strip().casefold()
            if name:
                result[name] = year
        return result


def download_to_cache(url: str, path: pathlib.Path, refresh: bool = False) -> pathlib.Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if path.exists() and not refresh:
        return path
    request = urllib.request.Request(url, headers={"User-Agent": f"smbajwa-journal-enricher/1.0 (mailto:{MAILTO})"})
    with urllib.request.urlopen(request, timeout=90) as response:
        path.write_bytes(response.read())
    return path


def cache_path(issns: list[str]) -> pathlib.Path:
    digest = hashlib.sha256(("v2|" + "|".join(issns)).encode()).hexdigest()[:20]
    return CACHE_DIR / f"sources-{digest}.json"


def fetch_batch(issns: list[str], refresh: bool = False) -> list[dict]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cached = cache_path(issns)
    if cached.exists() and not refresh:
        return json.loads(cached.read_text(encoding="utf-8"))["results"]

    params = urllib.parse.urlencode(
        {
            "filter": "issn:" + "|".join(issns),
            "per-page": "200",
            "mailto": MAILTO,
            **({"api_key": os.environ["OPENALEX_API_KEY"]} if os.environ.get("OPENALEX_API_KEY") else {}),
            "select": "id,display_name,issn,homepage_url,summary_stats,works_count,is_oa,is_in_doaj,apc_usd,host_organization_name,country_code,counts_by_year",
        },
        safe="|:-@",
    )
    request = urllib.request.Request(
        f"{API_URL}?{params}",
        headers={"User-Agent": f"smbajwa-journal-enricher/1.0 (mailto:{MAILTO})"},
    )
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = json.load(response)
            cached.write_text(
                json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
            time.sleep(0.12)
            return payload.get("results", [])
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            if isinstance(error, urllib.error.URLError) and isinstance(error.reason, socket.gaierror):
                raise
            retry_after = getattr(error, "headers", {}).get("Retry-After") if hasattr(error, "headers") else None
            if attempt == 5:
                raise
            delay = float(retry_after) if retry_after else min(30, 2**attempt)
            print(f"Retrying batch after {delay:g}s: {error}", file=sys.stderr)
            time.sleep(delay)
    return []


def pick_source(journal_issns: set[str], sources: list[dict], name: str = "") -> dict | None:
    matches = []
    for source in sources:
        if not names_agree(name, source.get("display_name") or ""):
            continue
        source_issns = {value for value in (normalize_issn(x) for x in source.get("issn") or []) if value}
        overlap = journal_issns & source_issns
        if overlap:
            matches.append((len(overlap), source.get("works_count") or 0, source.get("id") or "", source))
    return max(matches, default=(0, 0, "", None), key=lambda item: item[:3])[3]


def compact_source(source: dict) -> list:
    stats = source.get("summary_stats") or {}
    openalex_id = (source.get("id") or "").rsplit("/", 1)[-1]
    return [
        source.get("homepage_url") or "",
        stats.get("2yr_mean_citedness"),
        stats.get("h_index"),
        source.get("works_count"),
        1 if source.get("is_oa") else 0,
        1 if source.get("is_in_doaj") else 0,
        source.get("apc_usd"),
        source.get("host_organization_name") or "",
        openalex_id,
        source.get("country_code") or "",
        None,
    ]


def compact_trend(source: dict) -> list[list[int]]:
    """Return ascending [year, citations, works] points for compact charting."""
    points = []
    for item in source.get("counts_by_year") or []:
        year = item.get("year")
        if isinstance(year, int) and 2016 <= year <= 2025:
            points.append([year, item.get("cited_by_count") or 0, item.get("works_count") or 0])
    return sorted(points)


def trend_chunk_number(index: int, total_rows: int, chunk_count: int = TREND_CHUNK_COUNT) -> int:
    """Map an aligned journal row to one of the balanced lazy trend chunks."""
    if total_rows <= 0 or not 0 <= index < total_rows:
        raise ValueError("trend row index is outside the dataset")
    return min(chunk_count - 1, index * chunk_count // total_rows)


def write_trend_chunks(trends: dict, total_rows: int) -> None:
    TREND_DIR.mkdir(parents=True, exist_ok=True)
    for old_chunk in TREND_DIR.glob("trends-*.js"):
        old_chunk.unlink()
    for chunk in range(TREND_CHUNK_COUNT):
        payload = {"openalex": {key: value for key, value in trends.items() if trend_chunk_number(int(key), total_rows) == chunk}}
        (TREND_DIR / f"trends-{chunk}.js").write_text(
            "window.TREND_CHUNKS=window.TREND_CHUNKS||{};"
            + f"window.TREND_CHUNKS[{chunk}]="
            + json.dumps(payload, separators=(",", ":"))
            + ";\n",
            encoding="utf-8",
        )


def is_missing(value: object) -> bool:
    return value is None or value == ""


def make_report(extras: list[list | None]) -> dict:
    matched_rows = [row for row in extras if row is not None]
    missing = {
        name: sum(is_missing(row[index]) for row in matched_rows)
        for index, name in enumerate(FIELD_NAMES)
    }
    report = {
        "total": len(extras),
        "matched": len(matched_rows),
        "unmatched": len(extras) - len(matched_rows),
        "match_rate": round(100 * len(matched_rows) / len(extras), 2) if extras else 0,
        "missing": missing,
    }
    openalex = [row for row in matched_rows if len(row) >= 11 and row[8]]
    warnings = [row for row in matched_rows if len(row) >= 11 and row[10] is not None]
    rate = lambda count: round(100 * count / len(extras), 2) if extras else 0
    report["sources"] = {
            "openalex": {
                "matched": len(openalex),
                "match_rate": rate(len(openalex)),
                "missing": {name: sum(is_missing(row[i]) for row in openalex) for i, name in enumerate(FIELD_NAMES[:10])},
            },
            "warning_list": {
                "enabled": WARNING_LIST_ENABLED,
                "matched": len(warnings),
                "match_rate": rate(len(warnings)),
                "status": "disabled: source data redistribution licence is not explicit",
            },
    }
    return report


def build(refresh: bool = False) -> dict:
    raw = load_raw()
    journal_issns = []
    unique_issns = set()
    for row in raw["rows"]:
        values = {value for value in (normalize_issn(x) for x in row[4:6]) if value}
        journal_issns.append(values)
        unique_issns.update(values)

    errors = {}
    all_sources = []
    batches = list(chunks(sorted(unique_issns)))
    try:
        for number, batch in enumerate(batches, 1):
            print(f"OpenAlex batch {number}/{len(batches)}", file=sys.stderr)
            all_sources.extend(fetch_batch(batch, refresh=refresh))
    except Exception as error:
        errors["openalex"] = str(error)
        print(f"OpenAlex unavailable; continuing: {error}", file=sys.stderr)

    by_issn: dict[str, list[dict]] = {}
    for source in all_sources:
        for issn in source.get("issn") or []:
            normalized = normalize_issn(issn)
            if normalized:
                by_issn.setdefault(normalized, []).append(source)

    extras = []
    trends = {}
    for index, issns in enumerate(journal_issns):
        candidates = {source.get("id"): source for issn in issns for source in by_issn.get(issn, [])}
        match = pick_source(issns, list(candidates.values()), raw["rows"][index][1])
        extra = compact_source(match) if match else ["", None, None, None, 0, 0, None, "", "", "", None]
        extras.append(extra if match else None)
        openalex_trend = compact_trend(match) if match else []
        if openalex_trend:
            trends[str(index)] = openalex_trend

    corrections = blank_unvalidated_issns(raw, extras)
    DATA_PATH.write_text("const RAW=" + json.dumps(raw, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")

    metadata = {
        "fields": list(FIELD_NAMES),
        "sources": ["OpenAlex Sources (CC0)"],
        "warning_list": "schema present; disabled pending explicit data redistribution terms",
    }
    output = "// EXTRA.rows aligns with RAW.rows; fields: " + ", ".join(FIELD_NAMES) + "\n"
    output += "const EXTRA=" + json.dumps(
        {"meta": metadata, "rows": extras}, ensure_ascii=False, separators=(",", ":")
    ) + ";\n"
    OUTPUT_PATH.write_text(output, encoding="utf-8")
    write_trend_chunks(trends, len(raw["rows"]))

    report = make_report(extras)
    report["trends"] = {"openalex": len(trends)}
    report["errors"] = errors
    report["issn_corrections"] = corrections
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="ignore cached API responses")
    args = parser.parse_args()
    report = build(refresh=args.refresh)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
