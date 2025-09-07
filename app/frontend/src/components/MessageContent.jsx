// app/frontend/src/components/MessageContent.jsx

import React, { useMemo, useEffect, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

// Syntax highlighting theme and local styles
import 'highlight.js/styles/github-dark.css';
import './MessageContent.css';

// Create a minimal MarkdownIt instance that injects a copy button per code block
const createMarkdown = () => {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: true,
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
        } catch (_) {}
      }
      return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    },
  });

  const defaultFence = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

  // Wrap each code block with a header and a copy button carrying the raw code
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
    const lang = (info.split(/\s+/g)[0] || 'text').toLowerCase();
    const rawCode = token.content || '';
    const highlighted = defaultFence(tokens, idx, options, env, self);
    const encoded = encodeURIComponent(rawCode);

    return `
      <div class="code-block-wrapper" data-lang="${lang}">
        <div class="code-header">
          <div class="code-info">
            <span class="language-name">${lang}</span>
          </div>
          <button type="button" class="copy-code-button" data-code-enc="${encoded}" title="Copy code" aria-label="Copy code" aria-live="polite"><span class="copy-label">Copy</span></button>
        </div>
        ${highlighted}
      </div>
    `;
  };

  return md;
};

  // Reuse a single configured instance
  const md = createMarkdown();

  const MessageContent = ({ content = '', isDarkMode = true }) => {
    const containerRef = useRef(null);
    const [copiedAll, setCopiedAll] = useState(false);

  const sanitizedHtml = useMemo(() => {
    const raw = md.render(content || '');
    return DOMPurify.sanitize(raw);
  }, [content]);

  // Core copy routine used by all listeners
  const copyFromButton = async (btn) => {
    if (!btn) return;
    const enc = btn.getAttribute('data-code-enc') || '';
    let text = '';
    try {
      text = decodeURIComponent(enc);
    } catch (_) {}
    if (!text) {
      const wrapper = btn.closest('.code-block-wrapper');
      const codeEl = wrapper ? wrapper.querySelector('pre code') : null;
      text = codeEl ? codeEl.innerText : '';
    }
    if (!text) return;

    const showCopiedAndRevert = () => {
      const label = btn.querySelector('.copy-label') || btn;
      label.textContent = 'Copied!';
      setTimeout(() => {
        label.textContent = 'Copy';
      }, 1500);
    };

    try {
      await navigator.clipboard.writeText(text);
      showCopiedAndRevert();
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showCopiedAndRevert();
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  // Delegate copy handling for per-code-block buttons
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const findCopyButton = (event) => {
      if (event.composedPath) {
        const path = event.composedPath();
        for (const node of path) {
          if (node && node.classList && node.classList.contains('copy-code-button')) return node;
        }
      }
      let node = event.target;
      while (node) {
        if (node.classList && node.classList.contains('copy-code-button')) return node;
        node = node.parentElement || node.parentNode;
        if (node && node.nodeType !== 1) node = node.parentElement;
      }
      return null;
    };

    const handleEvent = async (e) => {
      const btn = findCopyButton(e);
      if (!btn || !el.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      await copyFromButton(btn);
    };

    // Capture early for various input sources
    el.addEventListener('pointerdown', handleEvent, true);
    el.addEventListener('mousedown', handleEvent, true);
    el.addEventListener('click', handleEvent, true);
    el.addEventListener('pointerup', handleEvent, true);
    return () => {
      el.removeEventListener('pointerdown', handleEvent, true);
      el.removeEventListener('mousedown', handleEvent, true);
      el.removeEventListener('click', handleEvent, true);
      el.removeEventListener('pointerup', handleEvent, true);
    };
  }, []);

  // Directly bind listeners to buttons after render as a fallback
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const buttons = Array.from(el.querySelectorAll('.copy-code-button'));
    const onClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyFromButton(e.currentTarget);
    };
    buttons.forEach((b) => {
      if (!b.__copyBound) {
        b.addEventListener('click', onClick);
        b.addEventListener('mousedown', onClick);
        b.addEventListener('pointerdown', onClick);
        b.__copyBound = true;
      }
    });
    return () => {
      buttons.forEach((b) => {
        b.removeEventListener('click', onClick);
        b.removeEventListener('mousedown', onClick);
        b.removeEventListener('pointerdown', onClick);
        delete b.__copyBound;
      });
    };
  }, [sanitizedHtml]);

  // Toggle light styles for generated elements when in light mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const toggle = (selector) => {
      const nodes = el.querySelectorAll(selector);
      nodes.forEach((n) => {
        if (isDarkMode) {
          n.classList.remove('light');
        } else {
          n.classList.add('light');
        }
      });
    };

    // Elements that have explicit `.light` variants in CSS
    toggle('.code-block-wrapper');
    toggle('.code-header');
    toggle('.language-name');
    toggle('.line-count');
    toggle('.code-action-button');
    toggle('.copy-code-button');
    toggle('.table-wrapper');
    toggle('.enhanced-table');
    toggle('.loading-shimmer');
  }, [isDarkMode, sanitizedHtml]);

  const handleCopyAll = async () => {
    const text = content || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopiedAll(true);
      } finally {
        document.body.removeChild(ta);
      }
    }
    setTimeout(() => setCopiedAll(false), 1500);
  };

  return (
    <div className={`message-wrapper relative group ${isDarkMode ? '' : 'light'}`}>
      <div className="message-toolbar">
        <button
          className="toolbar-button copy-all-button"
          title="Copy entire message"
          onClick={handleCopyAll}
        >
          {copiedAll ? 'Copied!' : 'Copy All'}
        </button>
      </div>
      <div
        ref={containerRef}
        className={`markdown-body ${isDarkMode ? '' : 'light'}`}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
};

export default MessageContent;
