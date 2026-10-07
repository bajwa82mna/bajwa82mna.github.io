# Methods and formula provenance

All calculator code in this directory is an independent implementation. No Primer3 source code, interface, or parameter files are included.

OD→ng/µL conversion is not included in this version; the suite does not infer nucleic-acid concentration from absorbance.

## qPCR relative expression

For equal target/reference amplification factors, `ΔCq = mean(target Cq) − mean(reference Cq)`, `ΔΔCq = ΔCq(sample) − ΔCq(control)`, and relative expression is `E^(−ΔΔCq)` (normally `E = 2`). Differing efficiencies use the ratio `E_target^(Cq control − Cq sample) / E_reference^(Cq control − Cq sample)`. Replicate means and sample standard deviations are shown; an SD above 0.5 Cq is flagged. “Undetermined” is rejected rather than converted to a number.

- Livak KJ, Schmittgen TD (2001), *Methods* 25:402–408. [doi:10.1006/meth.2001.1262](https://doi.org/10.1006/meth.2001.1262)
- Bustin SA et al. (2009), MIQE guidelines, *Clinical Chemistry* 55:611–622. [doi:10.1373/clinchem.2008.112797](https://doi.org/10.1373/clinchem.2008.112797)
- Pfaffl MW (2001), efficiency-corrected relative quantification, *Nucleic Acids Research* 29:e45. [doi:10.1093/nar/29.9.e45](https://doi.org/10.1093/nar/29.9.e45)

## Dilution and molarity

Single dilutions use conservation of solute, `C₁V₁ = C₂V₂`. Serial plans apply the selected dilution factor at every step and preserve enough volume for transfer to the next tube. Molarity is `moles / litres`; moles from mass are `mass × purity / effective formula weight`. The user supplies the molecular weight and hydrate factor.

## Primer melting temperature

Wallace mode uses `2(A+T) + 4(G+C)` °C as a rough short-primer screen. Nearest-neighbor mode transcribes the unified DNA/DNA ΔH/ΔS table from SantaLucia (1998), includes terminal AT initiation corrections and optional symmetry entropy, then evaluates `Tm = ΔH/(ΔS + R ln(Ct/F)) − 273.15 + 16.6 log10([Na+])`, with `F=4` for non-self-complementary and `F=1` for self-complementary sequences. It models monovalent salt only.

- Wallace RB et al. (1979), *Nucleic Acids Research* 6:3543–3557. [doi:10.1093/nar/6.11.3543](https://doi.org/10.1093/nar/6.11.3543)
- SantaLucia J Jr (1998), *PNAS* 95:1460–1465. [doi:10.1073/pnas.95.4.1460](https://doi.org/10.1073/pnas.95.4.1460)

These calculations support research planning, not validated diagnostic use. Primer Tm is not a specificity, structure, dimer, or primer-design assessment. Numerical and domain review by a molecular biologist remains required before removing the Experimental label.
