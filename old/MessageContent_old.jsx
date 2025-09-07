// app/fronend/src/components/MessageContent.jsx

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';

// --- Core Markdown & Highlighting Libraries ---
import MarkdownIt from 'markdown-it';
import { full as emoji } from 'markdown-it-emoji';
import { taskLists } from '@hedgedoc/markdown-it-plugins';
import anchor from 'markdown-it-anchor';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

// --- Syntax Highlighting Theme ---
import 'highlight.js/styles/github-dark.css';
import './MessageContent.css'; // <-- Add this import
import { copyCodeToClipboard, handleCopyToClipboard } from './utils/chatUtils';

/**
 * A memoized, configured instance of MarkdownIt with enhanced features.
 */
const useMarkdownProcessor = () => {
  return useMemo(() => {
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
      highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return (
              '<pre class="hljs"><code>' +
              hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
              '</code></pre>'
            );
          } catch (__) {}
        }
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
      },
    });

    // --- Plugins ---
    md.use(emoji);
    md.use(taskLists, { enabled: true, label: true, labelAfter: true });
    md.use(anchor, {
      permalink: anchor.permalink.ariaHidden({
        placement: 'before',
        symbol: '#',
        class: 'header-anchor',
      }),
      level: [1, 2, 3, 4],
    });

    // --- Enhanced Code Block Renderer ---
    const defaultFenceRenderer = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
      const lang = info.split(/(\s+)/g)[0];
      const rawCode = token.content;
      const lineCount = rawCode.split('\n').length - 1;

      const highlightedCode = defaultFenceRenderer(tokens, idx, options, env, self);

      return `
        <div class="code-block-wrapper" data-lang="${lang || 'text'}" data-lines="${lineCount}">
          <div class="code-header">
            <div class="code-info">
              <span class="language-name">${lang || 'text'}</span>
              <span class="line-count">${lineCount} lines</span>
            </div>
            <div class="code-actions">
              <button class="copy-code-button" data-code-enc="${encodeURIComponent(rawCode)}" title="Copy code">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                <span>Copy</span>
              </button>
            </div>
          </div>
          ${highlightedCode}
        </div>
      `;
    };

    // --- Enhanced Table Renderer ---
    const defaultTableOpenRenderer = md.renderer.rules.table_open;
    md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
      return '<div class="table-wrapper"><table class="enhanced-table">';
    };

    const defaultTableCloseRenderer = md.renderer.rules.table_close;
    md.renderer.rules.table_close = (tokens, idx, options, env, self) => {
      return '</table></div>';
    };

    return md;
  }, []);
};

/**
 * Enhanced MessageContent component with advanced UI features
 */
const MessageContent = ({ 
  content, 
  isDarkMode = true, 
  showLineNumbers = true,
  enableAnimations = true,
  compactMode = false 
}) => {
  const md = useMarkdownProcessor();
  const [copiedKeys, setCopiedKeys] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState({});
  const [wrappedCodeBlocks, setWrappedCodeBlocks] = useState({});
  const contentRef = useRef(null);

  // Memoize the rendered HTML
  const sanitizedHtml = useMemo(() => {
    const rawHtml = md.render(content);
    return DOMPurify.sanitize(rawHtml);
  }, [content, md]);
  
  // Enhanced copy handler
  const handleCopy = useCallback(async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      if (key =='full-content') {
        setCopiedKeys(prev => ({ ...prev, [key]: true }));
      }
      setTimeout(() => {
        setCopiedKeys(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedKeys(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
          setCopiedKeys(prev => ({ ...prev, [key]: false }));
        }, 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  // Copy handler for full message using utils
  const handleCopyFull = useCallback((text) => {
    handleCopyToClipboard(
      text,
      () => {
        setCopiedKeys(prev => ({ ...prev, ['full-content']: true }));
        setTimeout(() => {
          setCopiedKeys(prev => ({ ...prev, ['full-content']: false }));
        }, 2000);
      },
      (err) => {
        console.error('Failed to copy text: ', err);
      }
    );
  }, []);

  // Enhanced event delegation for various actions
  const handleContentClick = useCallback((e) => {
    console.log("Amit-Code-0")
    const target = e.target.closest('button');
    if (!target) return;

    e.stopPropagation();

    // Handle copy button for code blocks using shared util
    if (target.classList.contains('copy-code-button')) {
      console.log("Amit-Code-1")
      const wrapper = target.closest('.code-block-wrapper');
      const codeEl = wrapper ? wrapper.querySelector('pre code') : null;
      let code = codeEl ? codeEl.innerText : '';
      if (!code && target.dataset.codeEnc) {
        try {
          code = decodeURIComponent(target.dataset.codeEnc);
        } catch (_) {
          // ignore decode errors
        }
      }
      if (code) {
        copyCodeToClipboard(
          code,
          () => {
            target.innerHTML = `
              <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-check\"><polyline points=\"20 6 9 17 4 12\"></polyline></svg>
              <span>Copied!</span>
            `;
            setTimeout(() => {
              target.innerHTML = `
                <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-copy\"><rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"></rect><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"></path></svg>
                <span>Copy</span>
              `;
            }, 2000);
          },
          (error) => {
            console.error('Failed to copy code:', error);
          }
        );
      }
    }

    // Handle expand button
    if (target.classList.contains('expand-button')) {
      const codeBlock = target.closest('.code-block-wrapper');
      const blockId = codeBlock.dataset.lang + '-' + Math.random().toString(36).substr(2, 9);
      setExpandedCodeBlocks(prev => ({
        ...prev,
        [blockId]: !prev[blockId]
      }));
      codeBlock.classList.toggle('expanded');
    }

    // Handle wrap toggle button
    if (target.classList.contains('toggle-wrap-button')) {
      const codeBlock = target.closest('.code-block-wrapper');
      const blockId = codeBlock.dataset.lang + '-' + Math.random().toString(36).substr(2, 9);
      setWrappedCodeBlocks(prev => ({
        ...prev,
        [blockId]: !prev[blockId]
      }));
      codeBlock.classList.toggle('wrapped');
    }

    // Handle section collapse
    if (target.classList.contains('section-toggle')) {
      const section = target.dataset.section;
      setCollapsedSections(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    }
  }, []);

  // Add smooth scrolling for anchor links
  useEffect(() => {
    const handleAnchorClick = (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link && contentRef.current) {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = contentRef.current.querySelector(`#${targetId}`);
        if (targetElement) {
          targetElement.scrollIntoView({ 
            behavior: enableAnimations ? 'smooth' : 'instant',
            block: 'start'
          });
        }
      }
    };

    const content = contentRef.current;
    if (content) {
      content.addEventListener('click', handleAnchorClick);
      return () => content.removeEventListener('click', handleAnchorClick);
    }
  }, [enableAnimations]);

  const isCopiedFull = copiedKeys['full-content'];

  return (
    <div className={`message-container ${compactMode ? 'compact' : ''}`}>
      <div className={`message-wrapper relative group`}>
        {/* Enhanced toolbar */}
        <div className="message-toolbar">
          <button
            onClick={() => handleCopyFull(content)}
            className="toolbar-button"
            title="Copy entire message"
          >
            {isCopiedFull ? <Check size={16} /> : <Copy size={16} />}
            <span>{isCopiedFull ? 'Copied!' : 'Copy All'}</span>
          </button>
        </div>

        <div
          ref={contentRef}
          className={`markdown-body ${showLineNumbers ? 'show-line-numbers' : ''} ${enableAnimations ? 'animated' : ''}`}
          onClick={handleContentClick}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    </div>
  );
};

export default MessageContent;
