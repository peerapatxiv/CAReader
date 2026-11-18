import { ParseError, type Service } from './types';
import { decodeEntities } from './xml';
import { extractPolicyInfo } from './policy';
import { isTestApi } from './insights';

const tagText = (src: string, tag: string): string | undefined => {
  const m = src.match(new RegExp(`<l7:${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</l7:${tag}>`));
  return m ? decodeEntities(m[1].trim()) : undefined;
};

const attr = (openTag: string, name: string): string | undefined => {
  const m = openTag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? decodeEntities(m[1]) : undefined;
};

function parseItem(item: string): Service {
  const detailOpen = item.match(/<l7:ServiceDetail\b[^>]*>/)?.[0] ?? '';
  const detailEnd = item.indexOf('</l7:ServiceDetail>');
  const detail = detailEnd > 0 ? item.slice(0, detailEnd) : item;

  const properties: Record<string, string> = {};
  for (const m of detail.matchAll(/<l7:Property key="([^"]*)">\s*<l7:\w+>([\s\S]*?)<\/l7:\w+>\s*<\/l7:Property>/g)) {
    properties[decodeEntities(m[1])] = decodeEntities(m[2].trim());
  }
  const verbs = [...detail.matchAll(/<l7:Verb>([^<]*)<\/l7:Verb>/g)].map((m) => m[1].trim());

  const policyMatch = item.match(/<l7:Resource type="policy"[^>]*>([\s\S]*?)<\/l7:Resource>/);
  const policyXml = policyMatch ? decodeEntities(policyMatch[1]) : '';

  const name = tagText(detail.slice(detail.indexOf('<l7:ServiceDetail')), 'Name') ?? tagText(item, 'Name') ?? '';
  const id = attr(detailOpen, 'id') ?? tagText(item, 'Id') ?? '';

  const urlPattern = tagText(detail, 'UrlPattern') ?? '';
  return {
    id,
    name,
    folderId: attr(detailOpen, 'folderId') ?? '',
    version: Number(attr(detailOpen, 'version') ?? 0),
    enabled: tagText(detail, 'Enabled') === 'true',
    urlPattern,
    test: isTestApi(name, urlPattern),
    verbs,
    soap: properties.soap === 'true',
    internal: properties.internal === 'true',
    tracing: properties.tracingEnabled === 'true',
    policyRevision: Number(properties.policyRevision ?? 0) || 0,
    properties,
    ...extractPolicyInfo(policyXml),
    policyXml,
  };
}

/** Parse a Layer7 RESTMAN service list (already unwrapped from RTF). */
export function parseServices(xml: string, onProgress?: (done: number, total: number) => void): Service[] {
  if (!/<l7:List\b/.test(xml)) throw new ParseError('Not a Layer7 service export');
  const chunks: string[] = [];
  let pos = 0;
  for (;;) {
    const s = xml.indexOf('<l7:Item>', pos);
    if (s < 0) break;
    const e = xml.indexOf('</l7:Item>', s);
    if (e < 0) break;
    chunks.push(xml.slice(s + 9, e));
    pos = e + 10;
  }
  if (chunks.length === 0) throw new ParseError('Not a Layer7 service export');
  const out: Service[] = [];
  chunks.forEach((c, i) => {
    out.push(parseItem(c));
    if (onProgress && ((i + 1) % 50 === 0 || i + 1 === chunks.length)) onProgress(i + 1, chunks.length);
  });
  return out;
}
