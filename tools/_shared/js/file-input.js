export const MAX_FILE_BYTES = 2 * 1024 * 1024;

export function normalizeFileText(value = '') {
  return String(value).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

export function parseCsv(value = '') {
  const text = normalizeFileText(value);
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let index = 0; index <= text.length; index += 1) {
    if (index === text.length && quoted) throw new SyntaxError('Malformed CSV: unterminated quoted field.');
    const character = text[index] ?? '\n';
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"' && field === '') quoted = true;
    else if (character === ',') { row.push(field); field = ''; }
    else if (character === '\n') {
      row.push(field);
      if (row.some(cell => cell.trim() !== '')) rows.push(row);
      row = []; field = '';
    } else field += character;
  }
  return rows;
}

export function enforceRowLimit(value, maxRows = 5000, parsedRows = null) {
  const count = parsedRows ? parsedRows.length : normalizeFileText(value).split('\n').filter(row => row.trim()).length;
  if (count > maxRows) throw new RangeError(`Use a file with at most ${maxRows.toLocaleString()} non-empty rows.`);
  return count;
}

export function validateLocalFile(file, extensions, maxBytes = MAX_FILE_BYTES) {
  const allowed = extensions.map(value => value.replace(/^\./, '').toLowerCase());
  const extension = String(file?.name || '').split('.').pop().toLowerCase();
  if (!allowed.includes(extension)) throw new TypeError(`Choose a ${allowed.map(value => `.${value}`).join(', ')} file.`);
  if (Number(file?.size) > maxBytes) throw new RangeError('Choose a file no larger than 2 MB.');
  return extension;
}

export async function readLocalFile(file, options = {}) {
  const {extensions = ['txt', 'csv'], maxBytes = MAX_FILE_BYTES, maxRows = 5000} = options;
  const extension = validateLocalFile(file, extensions, maxBytes);
  const raw = typeof FileReader === 'undefined' ? await file.text() : await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(new Error('The file could not be read. Check its encoding and try again.')));
    reader.readAsText(file, 'UTF-8');
  });
  const text = normalizeFileText(raw);
  const csv = extension === 'csv' ? parseCsv(text) : null;
  const rowCount = enforceRowLimit(text, maxRows, csv);
  return {name: file.name, extension, text, rowCount, csv};
}

export function setupLocalFileInput({input, dropZone, status, extensions, maxRows, onRead}) {
  const handle = async file => {
    try {
      const result = await readLocalFile(file, {extensions, maxRows});
      await onRead(result);
      if (status) status.textContent = `Read ${result.name} locally (${result.rowCount.toLocaleString()} non-empty rows).`;
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  };
  input?.addEventListener('change', () => input.files?.[0] && handle(input.files[0]));
  if (dropZone) {
    for (const type of ['dragenter', 'dragover']) dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.add('is-dragging'); });
    for (const type of ['dragleave', 'drop']) dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.remove('is-dragging'); });
    dropZone.addEventListener('drop', event => event.dataTransfer?.files?.[0] && handle(event.dataTransfer.files[0]));
  }
  return handle;
}
