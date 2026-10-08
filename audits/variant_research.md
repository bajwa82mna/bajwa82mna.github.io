# Variant Toolkit research audit

Reviewed 2026-10-08. Upstream fastVEP repository commit inspected: `4a4dccd2f6b21aa16bbf2b4b7fd5037ab684aa36`.

## What fastVEP is

fastVEP is an Apache-2.0 Rust variant-effect predictor that aims for Ensembl VEP/Nirvana-compatible output. Its README documents SNP, indel and structural-variant consequences, GFF3 gene models for any organism, FASTA-dependent coding/HGVS output, CLI annotation, a self-hosted JSON API and an interactive hosted service. The API guide explicitly says fastVEP.org is not a programmatic/bulk endpoint: repeated small queries belong on a self-hosted server, while exome/genome files belong in `fastvep annotate`.

Primary sources:

- Repository, README and licence: https://github.com/Huang-lab/fastVEP
- Self-hosted API contract and deployment cautions: https://github.com/Huang-lab/fastVEP/blob/master/docs/API.md
- Hosted interactive interface: https://fastvep.org/

## Can the fastVEP core run as browser WASM?

### Verdict: not as shipped; do not bundle or claim it

Rust alone does not imply browser portability. The inspected workspace has no `wasm32` target, `wasm-bindgen` interface or browser build. The annotation crate depends on cache, I/O, supplementary-annotation and classification crates as well as Rayon. Relevant paths use `std::fs`, memory-mapped FASTA/annotation files (`memmap2`), tabix readers, directory scanning and native parallelism. The web crate is an Axum/Tokio server. Those native assumptions would need separation behind browser-compatible providers, an in-memory input API, worker-safe concurrency choices, bindings, output-size controls and new parity tests.

A small pure consequence subcrate might eventually be portable, but consequence calls depend on correctly parsed transcripts, reference retrieval, allele normalization and HGVS context. Compiling isolated code is not equivalent to providing a correct predictor. A real port should be developed and validated upstream, not improvised in this static site.

Whole plant assemblies and annotations commonly exceed a reasonable static-page memory budget. JavaScript strings, parsed feature objects and WebAssembly linear memory can multiply source sizes. This toolkit therefore caps each local input at 2 MiB. That cap is a product safety/performance boundary, not a biological threshold and not suitable for genome-scale annotation.

## Ensembl Plants VEP and plant use

Ensembl Plants provides the established VEP workflow for supported plant species and assemblies. Its command-line documentation recommends caches for performance and documents `--fasta` plus `--gff`/`--gtf` for a custom species/assembly. VCF is the recommended input format. The current Ensembl Plants tomato page identifies the assembly as SL4.0.

Primary sources:

- Ensembl Plants VEP: https://plants.ensembl.org/info/docs/tools/vep/index.html
- VEP command-line modes and custom GFF/GTF + FASTA: https://plants.ensembl.org/info/docs/tools/vep/script/vep_options.html
- VEP input formats: https://plants.ensembl.org/info/docs/tools/vep/vep_formats.html
- Tomato SL4.0 assembly page: https://plants.ensembl.org/Solanum_lycopersicum_GCA_000188115.5cm/Info/Index

For plant-science students, the recurring need is not human clinical classification. It is checking and prioritizing SNPs/indels against the exact crop assembly and gene model after resequencing, GWAS fine-mapping or genome editing. The most educational failure modes are mismatched assembly releases, contig names, REF alleles and transcript models. Consequence labels help triage candidates; they do not prove causality or editing specificity.

## Ideas and feasibility verdicts

| Idea | Verdict | Evidence and boundary |
|---|---|---|
| Browser-local VCF checker and summary | **Ship** | Pure parsing is small, private and useful before any annotator. Report records/alleles, type counts, chromosome counts, multiallelic sites, Ts/Tv and malformed lines. State that this is not complete VCF-spec validation. |
| Compile the existing fastVEP engine to WASM | **Do not ship** | No browser target/bindings; native filesystem, mmap, tabix/cache and Rayon assumptions; full reference files are too large for this page's intended use. |
| General browser VEP or HGVS generator | **Do not ship** | Transcript selection, normalization, exon-boundary indels, alternative codes and HGVS rules require substantially broader semantics and reference parity work. |
| Small clean-room CDS explorer | **Ship only as Experimental** | Implement from the standard genetic code and Sequence Ontology-style consequence definitions, not copied GPL/VEP or fastVEP code. Limit to simple DNA SNVs/indels, phase-0 CDS rows, matching FASTA, standard nuclear code and a two-base splice-boundary flag. Unit-test known plus/minus-strand cases. Do not state accuracy or parity. |
| Proxy calls to fastVEP.org | **Do not ship** | Conflicts with a strict static/private design and upstream explicitly reserves the hosted instance for interactive use rather than scripts/bulk API traffic. |
| Scale-routing and file-prep guide | **Ship** | The static site adds real value by directing supported assemblies to Ensembl Plants VEP, custom/bulk work to fastVEP CLI, and teaching the assembly/FASTA/GFF3/contig checks that determine whether annotations are meaningful. |

## Clean-room and licence decision

fastVEP is Apache-2.0 and could legally be redistributed with its licence/notice obligations, but no fastVEP source or binary is copied here. The local JavaScript implementation is original and deliberately narrower. fastVEP is credited as an upstream external project in `CREDITS.md` and `NOTICE`. No Ensembl VEP GPL code is copied. The genetic code table and consequence concepts are scientific standards/facts; terminology is linked to the Sequence Ontology project (https://www.sequenceontology.org/).

## Risks and mitigations

- **False confidence:** persistent Experimental label, visible scope, no accuracy figure, and direction to full annotators.
- **Reference mismatch:** exact REF-versus-FASTA check and explicit assembly/contig checklist.
- **Complex indels:** reject symbolic alleles and variants crossing a spliced CDS boundary; disclose lack of normalization.
- **Transcript semantics:** require simple GFF3 transcript/CDS parentage and phase 0; report every overlapping supplied transcript rather than inventing a canonical transcript.
- **Splicing:** report only a proximity flag for the two intronic bases beside a CDS segment; no splice-impact prediction.
- **Privacy/resource exhaustion:** no network permission in CSP and 2 MiB cap per VCF, GFF3 and FASTA input.
- **Clinical misuse:** no human clinical databases, ACMG logic or clinical claims.

## Validation performed

Unit fixtures cover VCF counts/errors, plus-strand synonymous/missense/stop-gained calls, frameshift and in-frame insertion, splice-boundary flagging, reverse-strand stop-gained, REF mismatch, symbolic allele rejection and unsupported CDS phase. These fixtures establish the tested examples only; they are not a benchmark against Ensembl VEP or fastVEP.
