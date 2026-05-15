import type { ReactNode } from "react";

/** Match http(s) URLs in plain text (conservative end). */
const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)'"\]]*)/gi;

/**
 * Renders plain text with http(s) links as clickable anchors (opens new tab).
 */
export function renderTextWithUrls(text: string): ReactNode {
  if (!text) return null;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, "gi");
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const url = m[0];
    nodes.push(
      <a
        key={`url-${k++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-primary-600 underline hover:text-primary-800"
      >
        {url}
      </a>
    );
    last = m.index + url.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <span className="whitespace-pre-wrap break-words">{nodes}</span>;
}
