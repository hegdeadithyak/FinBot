/**
 * @Author: 
 * @Date:   2025-07-09
 * @Last Modified by:   
 * @Last Modified time: 2025-07-09
 */
/* Google Cloud “Basic” Translation – REST v2 */
const API_KEY   = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY!;
const ENDPOINT  = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
const SOURCE    = "en";                   // we author everything in EN
const MAX_Q_CHARS = 5000;                 // ≤ 5 k chars per call :contentReference[oaicite:1]{index=1}

/** Collect all real text nodes on the page, excluding script/style etc. */
function collectTextNodes(): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: n =>
        n.parentElement?.closest("script,style,noscript") || !n.nodeValue?.trim()
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    },
  );
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

/** Translate whole page to `target` (e.g. `"hi"`). */
export async function translatePage(target: string) {
  if (target === SOURCE) return restorePage();   // back to EN

  const nodes = collectTextNodes();
  // snapshot originals once (so we can restore later)
  if (!window.__origTexts) window.__origTexts = nodes.map(n => n.nodeValue);

  // chunk requests to stay under quota
  const batches: string[][] = [[]];
  nodes.forEach(txt => {
    const currentBatch = batches[batches.length - 1];
    const prospective = currentBatch.concat(txt.nodeValue!);
    const bytes = new Blob([prospective.join("\n")]).size;
    if (bytes > MAX_Q_CHARS) batches.push([txt.nodeValue!]);
    else currentBatch.push(txt.nodeValue!);
  });

  let cursor = 0;
  for (const q of batches) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ q, source: SOURCE, target, format: "text" }),
    });
    const { data } = await res.json();          // shape: { translations: [...] } :contentReference[oaicite:2]{index=2}
    data.translations.forEach((t: any) => {
      nodes[cursor++].nodeValue = t.translatedText;   // mutate DOM in-place
    });
  }
}

/** Restore original English text (when user switches back to EN). */
export function restorePage() {
  if (!window.__origTexts) return;
  collectTextNodes().forEach((n, i) => (n.nodeValue = window.__origTexts[i]));
}
