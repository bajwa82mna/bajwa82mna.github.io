export function safeTextElement(documentRef, tag, value, className = '') {
  const element = documentRef.createElement(tag);
  if (className) element.className = className;
  element.textContent = value == null ? '' : String(value);
  return element;
}
