/** Unwrap a Cocoa RTF file whose body is plain text (e.g. an XML export). Plain text passes through. */
export function rtfToText(input: string): string {
  if (!input.startsWith('{\\rtf')) return input;
  let start = input.indexOf('<?xml');
  if (start < 0) start = input.indexOf('<');
  if (start < 0) return '';
  let body = input.slice(start);
  // the RTF group's closing brace is the last non-whitespace char of the file
  body = body.replace(/\}\s*$/, '');
  return body.replace(/\\(?:u(-?\d+) ?|uc\d+ ?|([{}\\])|(\n))/g, (_m, code, lit, nl) => {
    if (code !== undefined) {
      let n = parseInt(code, 10);
      if (n < 0) n += 65536;
      return String.fromCharCode(n);
    }
    if (lit !== undefined) return lit;
    if (nl !== undefined) return '\n';
    return '';
  });
}
