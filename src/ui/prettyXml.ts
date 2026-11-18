/** Re-indent XML by 2 spaces per nesting level. Text-only elements stay on one line. */
export function prettyXml(xml: string): string {
  const tokens = xml.replace(/>\s+</g, '><').trim().match(/<[^>]+>|[^<]+/g) ?? [];
  const out: string[] = [];
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const pad = '  '.repeat(depth);
    if (t.startsWith('</')) {
      depth = Math.max(0, depth - 1);
      out.push('  '.repeat(depth) + t);
    } else if (t.startsWith('<?') || t.startsWith('<!') || t.endsWith('/>')) {
      out.push(pad + t);
    } else if (t.startsWith('<')) {
      const text = tokens[i + 1], close = tokens[i + 2];
      if (text !== undefined && !text.startsWith('<') && close?.startsWith('</')) {
        out.push(pad + t + text + close);
        i += 2;
      } else {
        out.push(pad + t);
        depth++;
      }
    } else {
      out.push(pad + t.trim());
    }
  }
  return out.join('\n');
}
