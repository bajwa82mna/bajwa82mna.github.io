# Methods

The Livak mode calculates mean technical-replicate Ct, ΔCt = target − reference, ΔΔCt = sample ΔCt − mean control ΔCt, and fold change = 2^−ΔΔCt. Independent standard errors are propagated by root-sum-of-squares; fold-change SD uses first-order log propagation. Pfaffl mode uses target-efficiency^(control target Ct − sample target Ct) divided by reference-efficiency^(control reference Ct − sample reference Ct).

- Livak KJ, Schmittgen TD (2001). Analysis of relative gene expression data using real-time quantitative PCR and the 2−ΔΔCT Method. *Methods* 25:402–408. https://doi.org/10.1006/meth.2001.1262
- Pfaffl MW (2001). A new mathematical model for relative quantification in real-time RT–PCR. *Nucleic Acids Research* 29:e45. https://doi.org/10.1093/nar/29.9.e45
