/**
 * Web Worker for markdown processing
 * Processes markdown rendering off the main thread to prevent UI blocking
 */

import MarkdownIt from 'markdown-it';

// Initialize MarkdownIt instance (runs once in worker context)
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

// Custom code block renderer with copy functionality
md.renderer.rules.fence = function (tokens, idx) {
  const token = tokens[idx];
  const code = token.content;
  const lang = token.info ? token.info.trim() : '';
  const id = `code-block-${Math.random().toString(36).substr(2, 9)}`;

  return `<div class="code-block-container relative rounded-lg overflow-hidden border border-gray-300">
    <div class="code-block-header flex items-center justify-between bg-gray-50 px-3 py-1 border-b border-gray-200">
      <span class="code-language text-xs font-medium text-gray-600">${lang || 'text'}</span>
      <button class="copy-button flex items-center justify-center w-6 h-6 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-200" data-code-id="${id}" title="Copy">
        <svg class="copy-icon text-gray-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <svg class="check-icon hidden text-gray-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      </button>
    </div>
    <pre class="code-block-content m-0 bg-gray-100"><code id="${id}" class="block p-4 bg-transparent text-sm font-mono leading-relaxed language-${lang}">${md.utils.escapeHtml(code)}</code></pre>
  </div>`;
};

md.renderer.rules.code_block = md.renderer.rules.fence;

// Custom table renderers
md.renderer.rules.table_open = function () {
  return '<table class="w-full border-collapse border border-gray-300 mb-3">';
};

md.renderer.rules.th_open = function () {
  return '<th class="border border-gray-300 px-3 py-2 text-left bg-gray-50 font-semibold">';
};

md.renderer.rules.td_open = function () {
  return '<td class="border border-gray-300 px-3 py-2 text-left">';
};

interface MessageData {
  id: string;
  content: string;
  searchKeyword: string | null;
}

interface ResultData {
  id: string;
  html: string;
}

/**
 * Highlight search keyword in HTML content using regex-based approach
 * This avoids using DOMParser which is not available in all Worker environments
 */
function highlightKeyword(html: string, keyword: string): string {
  if (!keyword || !keyword.trim()) return html;

  // Escape special regex characters in keyword
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Split HTML into parts (tags and text content)
  const parts: string[] = [];
  const tagRegex = /<[^>]+>/g;
  let match;

  // Find all HTML tags
  const tags: { start: number; end: number; content: string }[] = [];
  while ((match = tagRegex.exec(html)) !== null) {
    tags.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0]
    });
  }

  // Process text between tags
  let currentPos = 0;
  for (const tag of tags) {
    // Text before the tag
    if (currentPos < tag.start) {
      const text = html.substring(currentPos, tag.start);
      // Only highlight text that's not inside <code> or <pre> tags
      const isInsideCodeBlock = html.substring(0, currentPos).includes('<code') &&
                                !html.substring(0, currentPos).includes('</code>') ||
                                html.substring(0, currentPos).includes('<pre') &&
                                !html.substring(0, currentPos).includes('</pre>');

      if (!isInsideCodeBlock) {
        // Apply highlighting to this text segment
        const highlightRegex = new RegExp(`(${escapedKeyword})`, 'gi');
        parts.push(text.replace(highlightRegex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'));
      } else {
        parts.push(text);
      }
    }
    // Add the tag itself
    parts.push(tag.content);
    currentPos = tag.end;
  }

  // Process any remaining text after the last tag
  if (currentPos < html.length) {
    const text = html.substring(currentPos);
    const isInsideCodeBlock = html.substring(0, currentPos).includes('<code') &&
                              !html.substring(0, currentPos).includes('</code>') ||
                              html.substring(0, currentPos).includes('<pre') &&
                              !html.substring(0, currentPos).includes('</pre>');

    if (!isInsideCodeBlock) {
      const highlightRegex = new RegExp(`(${escapedKeyword})`, 'gi');
      parts.push(text.replace(highlightRegex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'));
    } else {
      parts.push(text);
    }
  }

  return parts.join('');
}

/**
 * Process markdown content
 */
function processMarkdown(content: string, searchKeyword: string | null): string {
  let html = md.render(content);

  if (searchKeyword && searchKeyword.trim()) {
    html = highlightKeyword(html, searchKeyword);
  }

  return html;
}

// Message handler
self.onmessage = (e: MessageEvent<MessageData>) => {
  const { id, content, searchKeyword } = e.data;

  try {
    const html = processMarkdown(content, searchKeyword);

    const result: ResultData = { id, html };
    self.postMessage(result);
  } catch (error) {
    console.error('Worker error:', error);
    // Send error response
    self.postMessage({
      id,
      html: `<p class="text-red-500">Error processing markdown: ${error}</p>`
    });
  }
};
