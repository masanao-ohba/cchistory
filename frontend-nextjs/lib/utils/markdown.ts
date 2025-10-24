import MarkdownIt from 'markdown-it';

// Initialize Markdown parser
const md: MarkdownIt = new MarkdownIt({
  html: true,
  xhtmlOut: true,
  breaks: true,
  linkify: true,
  typographer: true,
});

// Add highlight function after initialization to avoid circular reference
md.options.highlight = function (str, lang) {
  return `<pre class="language-${lang}"><code>${md.utils.escapeHtml(str)}</code></pre>`;
};

// Custom code block renderer with copy functionality
/* eslint-disable @typescript-eslint/no-unused-vars */
const defaultFenceRenderer =
  md.renderer.rules.fence ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };
/* eslint-enable @typescript-eslint/no-unused-vars */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
md.renderer.rules.fence = function (tokens, idx, _options, _env, _self) {
  const token = tokens[idx];
  const code = token.content;
  const lang = token.info ? token.info.trim() : '';
  const id = `code-block-${Math.random().toString(36).substr(2, 9)}`;

  return `<div class="code-block-container relative mb-4 rounded-lg overflow-hidden border border-gray-300">
    <div class="code-block-header flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
      <span class="code-language text-sm font-medium text-gray-600">${lang || 'text'}</span>
      <button class="copy-button flex items-center justify-center w-8 h-8 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-200" data-code-id="${id}" title="Copy">
        <svg class="copy-icon text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <svg class="check-icon hidden text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      </button>
    </div>
    <pre class="code-block-content m-0 bg-gray-100"><code id="${id}" class="block p-4 bg-transparent text-sm font-mono leading-relaxed language-${lang}">${md.utils.escapeHtml(code)}</code></pre>
  </div>`;
};

md.renderer.rules.code_block = md.renderer.rules.fence;

// Custom table renderers
/* eslint-disable @typescript-eslint/no-unused-vars */
const defaultTableRenderer =
  md.renderer.rules.table_open ||
  function (_tokens, _idx, _options, _env, _self) {
    return '<table>';
  };
/* eslint-enable @typescript-eslint/no-unused-vars */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
md.renderer.rules.table_open = function (_tokens, _idx, _options, _env, _self) {
  return '<table class="w-full border-collapse border border-gray-300 mb-3">';
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
md.renderer.rules.th_open = function (_tokens, _idx, _options, _env, _self) {
  return '<th class="border border-gray-300 px-3 py-2 text-left bg-gray-50 font-semibold">';
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
md.renderer.rules.td_open = function (_tokens, _idx, _options, _env, _self) {
  return '<td class="border border-gray-300 px-3 py-2 text-left">';
};

/**
 * Render markdown content with optional keyword highlighting
 */
export function renderMarkdown(content: string, searchKeyword: string | null = null): string {
  if (!content) return '';

  // First render markdown
  let renderedContent = md.render(content);

  // Apply keyword highlighting if provided
  if (searchKeyword && searchKeyword.trim()) {
    // Parse HTML and apply highlight only to text nodes
    if (typeof window !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${renderedContent}</div>`, 'text/html');
      const container = doc.body.firstChild as HTMLElement;
      const escapedKeyword = searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedKeyword})`, 'gi');

      // Recursively process text nodes
      const highlightTextNodes = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          if (regex.test(text)) {
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            // Reset regex
            regex.lastIndex = 0;

            while ((match = regex.exec(text)) !== null) {
              // Text before match
              if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
              }

              // Highlighted part
              const mark = document.createElement('mark');
              mark.textContent = match[0];
              fragment.appendChild(mark);

              lastIndex = match.index + match[0].length;
            }

            // Remaining text
            if (lastIndex < text.length) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            node.parentNode?.replaceChild(fragment, node);
          }
        } else if (
          node.nodeType === Node.ELEMENT_NODE &&
          (node as HTMLElement).tagName !== 'SCRIPT' &&
          (node as HTMLElement).tagName !== 'STYLE'
        ) {
          // Copy child nodes to avoid live collection issues
          const children = Array.from(node.childNodes);
          children.forEach(highlightTextNodes);
        }
      };

      highlightTextNodes(container);
      renderedContent = container.innerHTML;
    }
  } else {
    // Remove existing <mark> tags if no keyword
    renderedContent = renderedContent.replace(/<mark>(.*?)<\/mark>/gi, '$1');
  }

  return renderedContent;
}

/**
 * Copy code to clipboard
 */
export async function copyToClipboard(codeId: string): Promise<void> {
  try {
    const codeElement = document.getElementById(codeId);
    if (!codeElement) return;

    const code = codeElement.textContent || '';
    await navigator.clipboard.writeText(code);

    // Temporarily change button icon
    const button = document.querySelector(`[data-code-id="${codeId}"]`);
    if (button) {
      const copyIcon = button.querySelector('.copy-icon');
      const checkIcon = button.querySelector('.check-icon');

      copyIcon?.classList.add('hidden');
      checkIcon?.classList.remove('hidden');

      setTimeout(() => {
        copyIcon?.classList.remove('hidden');
        checkIcon?.classList.add('hidden');
      }, 2000);
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
  }
}
