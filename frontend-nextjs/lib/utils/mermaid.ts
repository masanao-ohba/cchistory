import type { EffectiveTheme } from '@/lib/stores/themeStore';

const MERMAID_BLOCK_REGEX = /<div class="mermaid-block" data-mermaid-source="([^"]*)">[^]*?<\/div>/g;

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Check if HTML contains unrendered mermaid blocks.
 */
export function hasMermaidBlocks(html: string): boolean {
  return html.includes('data-mermaid-source');
}

/**
 * Render mermaid blocks in an HTML string, returning a new HTML string
 * with mermaid source replaced by SVG diagrams.
 * Falls back to a code block display on render error.
 */
export async function renderMermaidBlocks(
  html: string,
  effectiveTheme: EffectiveTheme,
  signal?: { cancelled: boolean }
): Promise<string> {
  const mermaid = (await import('mermaid')).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: effectiveTheme === 'dark' ? 'dark' : 'default',
    suppressErrorRendering: true,
  });

  let result = html;
  const matches = [...html.matchAll(MERMAID_BLOCK_REGEX)];

  for (const match of matches) {
    if (signal?.cancelled) return html;
    const source = unescapeHtml(match[1]);
    try {
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      const { svg } = await mermaid.render(id, source);
      result = result.replace(match[0], `<div class="mermaid-block mermaid-rendered">${svg}</div>`);
    } catch {
      result = result.replace(match[0], `<div class="mermaid-block"><pre><code>${match[1]}</code></pre></div>`);
    }
  }

  return result;
}
