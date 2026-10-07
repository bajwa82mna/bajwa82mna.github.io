const values = text => text.split(',').map(value => value.trim()).filter(Boolean);

export function parsePlantCalculatorExample(text = '') {
  const result = {qpcr: {}, dilution: {}, molarity: {}, primer: {}};
  for (const line of String(text).split(/\r?\n/)) {
    let match;
    if ((match = line.match(/^qPCR (treated|control) (target|reference):\s*(.+)$/i))) {
      const key = `${match[1].toLowerCase() === 'treated' ? 'sample' : 'control'}${match[2][0].toUpperCase()}${match[2].slice(1).toLowerCase()}`;
      result.qpcr[key] = values(match[3]);
    } else if ((match = line.match(/^Dilution:\s*([\d.]+)\s+to\s+([\d.]+),\s*final volume\s+([\d.]+),\s*([\d.]+)%\s+overage$/i))) {
      [result.dilution.stock, result.dilution.target, result.dilution.finalVolume, result.dilution.overagePercent] = match.slice(1);
    } else if ((match = line.match(/^Molarity:\s*([\d.]+)\s+mg\s+.+?\(([\d.]+)\s+g\/mol\)\s+in\s+([\d.]+)\s+mL$/i))) {
      [result.molarity.mass, result.molarity.molecularWeight, result.molarity.volume] = match.slice(1);
    } else if ((match = line.match(/^Primer:\s*([^;]+);\s*([\d.]+)\s+mM\s+Na\+;\s*([\d.]+)\s+nM$/i))) {
      [result.primer.sequence, result.primer.sodiumMm, result.primer.primerNm] = match.slice(1).map(value => value.trim());
    }
  }
  return result;
}

export function applyPlantCalculatorExample(example, root = document) {
  const groups = {qpcr: example.qpcr, dilution: example.dilution, molarity: example.molarity, tm: example.primer};
  for (const [section, fields] of Object.entries(groups)) {
    for (const [name, value] of Object.entries(fields)) {
      const input = root.querySelector(`#${section} [name=${name}]`);
      if (input) input.value = Array.isArray(value) ? value.join(', ') : value;
    }
  }
}
