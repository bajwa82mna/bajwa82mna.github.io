export const GROUPS = {
  "Abiotic stress": ["drought","water deficit","salinity","salt stress","heat stress","cold stress","oxidative stress","heavy metal","cadmium","arsenic","osmotic","abscisic acid","aba","reactive oxygen","ros"],
  "Plant genetics": ["genome","genomic","gene expression","transcriptome","transcriptomic","qtl","gwas","crispr","allele","epigenetic","rna sequencing","rna-seq"],
  "Crop improvement": ["breeding","cultivar","variety","germplasm","yield","phenotype","phenotyping","marker assisted","genomic selection","heterosis"],
  "Plant pathology": ["pathogen","disease resistance","fungal","fungus","bacterial","virus","nematode","phytopathology","effector","host resistance","immunity"],
  "Plant physiology": ["photosynthesis","chlorophyll","stomata","root architecture","nutrient use","hormone","auxin","gibberellin","flowering","seed germination","senescence"],
  "Soil–plant systems": ["soil","rhizosphere","microbiome","mycorrhiza","nitrogen fixation","fertilizer","nutrient cycling","agroecosystem","biochar"],
  "Methods & data": ["remote sensing","machine learning","image analysis","metabolomics","proteomics","microscopy","field trial","greenhouse","bioinformatics"],
  "Crops": ["rice","oryza","wheat","triticum","maize","corn","zea mays","barley","soybean","arabidopsis","cotton","tomato","potato","sorghum","canola","rapeseed"]
};

export const GENERIC = new Set(["the","and","for","with","from","into","our","this","that","were","was","are","study","result","results","effect","effects","analysis","method","methods","using","plant","plants","journal","research","significant","significantly","new","data","paper"]);

export function detectGroups(tokens) {
  const text = tokens.join(" ");
  return Object.entries(GROUPS).map(([name, terms]) => ({name, matches: terms.filter(t => text.includes(t))})).filter(g => g.matches.length);
}

export function expansionTerms(groups) {
  return [...new Set(groups.flatMap(g => GROUPS[g.name].filter(t => t.length > 3).slice(0, 8)))];
}
