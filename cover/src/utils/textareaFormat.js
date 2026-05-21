/**
 * 在 textarea 选区插入 Markdown 包裹符号（Office 式加粗/斜体等）
 * @param {HTMLTextAreaElement} textarea
 * @param {string} before
 * @param {string} after
 * @param {string} [placeholder]
 */
export function wrapTextareaSelection(textarea, before, after, placeholder = '文字') {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value ?? '';
  const selected = value.slice(start, end);
  const insert = selected || placeholder;
  const text = value.slice(0, start) + before + insert + after + value.slice(end);
  const selStart = start + before.length;
  const selEnd = selStart + insert.length;
  return { text, selectionStart: selStart, selectionEnd: selEnd };
}
