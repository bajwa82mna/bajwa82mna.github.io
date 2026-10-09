# Audit findings

Scope: commits `8fed696` through `d3dbf73` (`git diff c5aa899..HEAD`). Findings are ranked by severity. No high-severity defects were found.

## Medium

### 1. Mixed volume units produce a dimensionally invalid diluent volume

- **Location:** `tools/dilution-calculator/src/core.js:14`
- **Failure scenario:** For C1 = 100 mM, C2 = 10 mM, V2 = 1 mL, and unknown V1 requested in µL, the solver correctly obtains V1 = 100 µL but calculates diluent as `1 - 100 = -99` and labels it mL. The subtraction combines the raw V2 number with V1 converted to a different display unit.
- **Fix:** Compute diluent from normalized base-volume values, then convert the difference to one explicitly selected output unit (normally V2's unit). Add a mixed-unit reference test.

### 2. The dilution-only constraint is not applied when a concentration is the unknown

- **Location:** `tools/dilution-calculator/src/core.js:10-13`
- **Failure scenario:** C2 = 10 mM, V1 = 2 mL, V2 = 1 mL, with C1 blank returns C1 = 5 mM. This describes concentrating 5 mM stock to 10 mM, despite the page stating that the tool does not permit C2 > C1. The guard is skipped whenever C1 or C2 is the missing field and the solved result is never checked.
- **Fix:** After solving, validate the normalized solved C1 and C2 for every unknown-field case and reject C2 > C1 (and, for a dilution workflow, V1 > V2).

### 3. Pfaffl mode accepts nonphysical amplification factors and emits plausible-looking invalid results

- **Location:** `tools/qpcr-ddct-calculator/src/core.js:17`; `tools/qpcr-ddct-calculator/index.html:1`
- **Failure scenario:** The amplification-factor inputs have no lower/upper validation. A target factor of 0 makes a treated sample's fold change 0; −1 can yield −1 or `NaN` depending on the exponent; an empty field becomes 0. These values are displayed/exported rather than rejected, although an amplification factor must be finite and positive (and practical qPCR efficiencies require a scientifically documented range).
- **Fix:** Validate both factors before analysis and reject non-finite or nonpositive values; set corresponding HTML `min`/`max` constraints and state the accepted definition/range in the methods text.

### 4. Figure export can bypass the 80-megapixel cap when aspect locking changes height

- **Location:** `tools/journal-figure-resizer/app.js:4-5`
- **Failure scenario:** The 80-MP check runs before locked-aspect height is recomputed. With an extremely tall source image, a modest requested width and small entered height pass the check, after which aspect locking can expand the canvas to hundreds of millions or billions of pixels and cause allocation failure or a frozen tab. In addition, `resize()` catches its own error, so the download handler continues to export the previous canvas after a rejected resize.
- **Fix:** Apply aspect locking first, then check the final width × height before assigning canvas dimensions. Let `resize()` return success/failure (or rethrow), and abort export on failure.

### 5. Crossref collection stops after the first ISSN even when it yields no timing observations

- **Location:** `tools/journal-timing/build/build.py:130-135`
- **Failure scenario:** A journal with print and electronic ISSNs is queried using the first ISSN and the loop breaks after any successful HTTP response, even if `summary["n"] == 0`. If Crossref timing assertions are deposited under the second ISSN, the built snapshot incorrectly reports no Crossref timing evidence.
- **Fix:** Continue through alternate ISSNs until a summary with usable observations is found; retain an empty summary only after every ISSN has been tried. Add a test in which the first ISSN returns zero observations and the second returns valid dates.

## Low

### 6. The reported 95% t intervals use coarse critical-value buckets rather than the sample's degrees of freedom

- **Location:** `tools/descriptive-statistics/src/core.js:3-4`
- **Failure scenario:** For `[1,2,3,4,5,6]`, the tool uses 2.776 (the df = 4 critical value) and reports 1.3798–5.6202. With n = 6, df = 5 and t = 2.5706, the hand-computed interval is 1.5367–5.4633. Similar discontinuous over-wide intervals occur throughout each bucket even though the output is presented as a 95% Student-t CI.
- **Fix:** Calculate or tabulate the two-sided 0.975 critical value by `df = n - 1` (with a documented large-df approximation) and add reference cases at bucket interiors, not only boundaries.

### 7. Four tool stylesheets defeat cache-version consistency through unversioned imports

- **Location:** `tools/qpcr-ddct-calculator/styles.css:1`; `tools/reverse-complement/styles.css:1`; `tools/descriptive-statistics/styles.css:1`; `tools/journal-figure-resizer/styles.css:1`
- **Failure scenario:** Each versioned `styles.css?v=21` imports `../dilution-calculator/styles.css` without a `?v=` value. After deployment, a browser or intermediary can reuse a stale imported base stylesheet while serving the new versioned wrapper, yielding mixed releases.
- **Fix:** Add the same explicit cache version to each `@import`, or move the shared rules into a dedicated versioned shared stylesheet linked directly from HTML.

### 8. Journal Timing sort state is not exposed to assistive technology

- **Location:** `tools/journal-timing/index.html:13`; `tools/journal-timing/app.js:11`
- **Failure scenario:** Activating a sortable column changes row order, but no header receives `aria-sort` and no live message identifies the active key/direction. Screen-reader users cannot determine the current ordering.
- **Fix:** Put `aria-sort="none"` on sortable `<th>` elements, update the active header to `ascending`/`descending` after each sort, and include the new ordering in the status announcement.

## Fixes

All eight findings were fixed with regression coverage. Dilution calculations now normalize volumes and validate solved workflows; Pfaffl factors are constrained and documented; figure sizing validates locked dimensions before export; Crossref tries alternate ISSNs; exact degree-of-freedom Student-t intervals use incomplete-beta inversion; imported styles are versioned; and Journal Timing exposes its active sort. The Crossref network build was not run.
