import { useEffect, useMemo, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import AppleSelect from './AppleSelect';
import DeleteContextMenu from './DeleteContextMenu';
import { ChevronIcon, FolderIcon, LinkIcon, PlusIcon, ResourceIcon } from './Icons';
import Popover from './Popover';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  themeVariables: {
    primaryColor: '#f5f5f7',
    primaryTextColor: '#1d1d1f',
    primaryBorderColor: '#a1a1a6',
    lineColor: '#6e6e73',
    secondaryColor: '#ffffff',
    tertiaryColor: '#e8e8ed',
    background: '#ffffff',
    mainBkg: '#f5f5f7',
    nodeBorder: '#a1a1a6',
    clusterBkg: '#fbfbfd',
    clusterBorder: '#d2d2d7',
    edgeLabelBackground: '#ffffff'
  },
  flowchart: { curve: 'linear', htmlLabels: true, useMaxWidth: true }
});

let mermaidRenderSequence = 0;
const mermaidDefinitionPattern = /^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|quadrantChart|requirementDiagram|gitGraph|mindmap|timeline|zenuml|sankey-beta|xychart-beta|block-beta|architecture-beta|packet-beta|kanban|radar-beta|treemap-beta)\b/i;

const fontSizes = [
  { value: '2', label: 'Pequeño' },
  { value: '3', label: 'Normal' },
  { value: '4', label: 'Grande' },
  { value: '5', label: 'Título' }
];

function formatMarkdownInline(value) {
  const protectedSegments = [];
  const protect = (html) => {
    const token = `%%MDTOKEN${protectedSegments.length}%%`;
    protectedSegments.push(html);
    return token;
  };

  const formatted = value
    .replace(/\\\((.+?)\\\)/g, (_, expression) =>
      protect(`<span class="markdownMathInline"><code data-language="inline-math">${expression}</code></span>`)
    )
    .replace(/`([^`]+)`/g, (_, code) => protect(`<code>${code}</code>`))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) =>
      protect(`<a href="${href}">${formatMarkdownInline(label)}</a>`)
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');

  return formatted.replace(
    /%%MDTOKEN(\d+)%%/g,
    (_, index) => protectedSegments[Number(index)] ?? ''
  );
}

function markdownHeadingSlug(value) {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]/g, '')
    .normalize('NFKC')
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function isSafeMarkdownHref(href) {
  return (
    href.startsWith('#') ||
    href.startsWith('https://') ||
    href.startsWith('http://') ||
    href.startsWith('mailto:') ||
    href.startsWith('/') ||
    href.startsWith('./') ||
    href.startsWith('../')
  );
}

function parseMarkdownTableRow(line) {
  const trimmed = line.trim();
  const withoutEdges = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '');
  return withoutEdges.split('|').map((cell) => cell.trim());
}

function isMarkdownTableDivider(line) {
  if (!line.includes('|')) return false;
  const cells = parseMarkdownTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function restoreMarkdownEntities(value = '') {
  return value
    .replace(/\\?&lt;/g, '<')
    .replace(/\\?&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function markdownToHtml(markdown = '') {
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const lines = escaped.split(/\r?\n/);
  const output = [];
  const headingOccurrences = new Map();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1] ?? '';
    const detailsOpening = line.trim().match(
      /^\\?&lt;details(?:\s+(open))?&gt;$/i
    );
    if (detailsOpening) {
      let summaryIndex = index + 1;
      while (summaryIndex < lines.length && !lines[summaryIndex].trim()) {
        summaryIndex += 1;
      }
      const summaryLine = lines[summaryIndex]?.trim() ?? '';
      const summaryMatch = summaryLine.match(
        /^\\?&lt;summary&gt;\s*(?:\\?&lt;strong&gt;)?([\s\S]*?)(?:\\?&lt;\/strong&gt;)?\s*\\?&lt;\/summary&gt;$/i
      );
      if (summaryMatch) {
        const body = [];
        let closingIndex = summaryIndex + 1;
        while (
          closingIndex < lines.length &&
          !/^\\?&lt;\/details&gt;$/i.test(lines[closingIndex].trim())
        ) {
          body.push(lines[closingIndex]);
          closingIndex += 1;
        }
        if (closingIndex < lines.length) {
          const summary = restoreMarkdownEntities(summaryMatch[1]).trim();
          const bodyMarkdown = restoreMarkdownEntities(body.join('\n')).trim();
          const openAttribute = detailsOpening[1] ? ' open' : '';
          output.push(
            `<details class="markdownDisclosure"${openAttribute}><summary>${formatMarkdownInline(summary)}</summary><div class="markdownDisclosureBody">${markdownToHtml(bodyMarkdown)}</div></details>`
          );
          index = closingIndex;
          continue;
        }
      }
    }
    const alert = line.trim().match(
      /^(?:&gt;\s*)?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i
    );
    if (alert) {
      const type = alert[1].toUpperCase();
      const usesBlockquote = /^&gt;/.test(line.trim());
      const body = [];
      let current = index + 1;
      while (current < lines.length) {
        const candidate = lines[current];
        if (usesBlockquote) {
          if (!/^\s*&gt;(?:\s|$)/.test(candidate)) break;
          body.push(candidate.replace(/^\s*&gt;\s?/, ''));
        } else {
          if (!candidate.trim()) break;
          body.push(candidate);
        }
        current += 1;
      }
      const labels = {
        NOTE: 'Nota',
        TIP: 'Consejo',
        IMPORTANT: 'Importante',
        WARNING: 'Advertencia',
        CAUTION: 'Precaución'
      };
      const bodyMarkdown = body.join('\n')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      output.push(
        `<aside class="markdownAlert markdownAlert${type[0]}${type.slice(1).toLowerCase()}" data-alert-type="${type}"><div class="markdownAlertTitle">${labels[type]}</div><div class="markdownAlertBody">${markdownToHtml(bodyMarkdown)}</div></aside>`
      );
      index = current - 1;
      continue;
    }
    const bracketMathOpening = line.trim().match(/^(\\{1,2})\[$/);
    const mathDelimiter = line.trim() === '$$'
      ? '$$'
      : bracketMathOpening
        ? `${bracketMathOpening[1]}]`
        : null;
    if (mathDelimiter) {
      const expression = [];
      let closingIndex = index + 1;
      while (
        closingIndex < lines.length &&
        lines[closingIndex].trim() !== mathDelimiter
      ) {
        expression.push(lines[closingIndex]);
        closingIndex += 1;
      }
      if (closingIndex < lines.length) {
        output.push(
          `<div class="markdownMath"><code data-language="math">${expression.join('\n')}</code></div>`
        );
        index = closingIndex;
        continue;
      }
    }
    const singleLineMath = line.trim().match(
      /^(?:\$\$([\s\S]+)\$\$|\\{1,2}\[([\s\S]+)\\{1,2}\])$/
    );
    if (singleLineMath) {
      const expression = (singleLineMath[1] ?? singleLineMath[2]).trim();
      output.push(
        `<div class="markdownMath"><code data-language="math">${expression}</code></div>`
      );
      continue;
    }
    const fence = line.trim().match(/^(`{3,}|~{3,})\s*([\w-]*)\s*$/);
    if (fence) {
      const code = [];
      const fenceCharacter = fence[1][0];
      const closingFence = new RegExp(`^${fenceCharacter}{3,}\\s*$`);
      index += 1;
      while (index < lines.length && !closingFence.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      const languageName = fence[2].toLowerCase();
      const language = languageName ? ` data-language="${languageName}"` : '';
      const mermaidClass = languageName === 'mermaid' ? ' class="markdownMermaid"' : '';
      output.push(`<pre${mermaidClass}><code${language}>${code.join('\n')}</code></pre>`);
      continue;
    }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      output.push('<hr>');
      continue;
    }
    if (line.includes('|') && isMarkdownTableDivider(next)) {
      const headers = parseMarkdownTableRow(line);
      const rows = [];
      index += 2;
      while (
        index < lines.length &&
        lines[index].includes('|') &&
        lines[index].trim()
      ) {
        rows.push(parseMarkdownTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      output.push(`<table><thead><tr>${headers.map((cell) => `<th>${formatMarkdownInline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${formatMarkdownInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const baseSlug = markdownHeadingSlug(heading[2]) || 'seccion';
      const occurrence = headingOccurrences.get(baseSlug) ?? 0;
      headingOccurrences.set(baseSlug, occurrence + 1);
      const slug = occurrence ? `${baseSlug}-${occurrence}` : baseSlug;
      output.push(`<h${level} id="${slug}">${formatMarkdownInline(heading[2])}</h${level}>`);
    } else if (/^\s*(?:[-*]\s+)?\[[ xX]\]\s+/.test(line)) {
      const items = [];
      let current = index;
      while (
        current < lines.length &&
        /^\s*(?:[-*]\s+)?\[[ xX]\]\s+/.test(lines[current])
      ) {
        const match = lines[current].match(
          /^\s*(?:[-*]\s+)?\[([ xX])\]\s+(.+)$/
        );
        items.push({ checked: match[1].toLowerCase() === 'x', text: match[2] });
        current += 1;
      }
      output.push(`<ul class="markdownTaskList">${items.map((item) => `<li class="markdownTaskItem"><span class="markdownCheckbox${item.checked ? ' checked' : ''}"></span><span>${formatMarkdownInline(item.text)}</span></li>`).join('')}</ul>`);
      index = current - 1;
    } else if (/^[-*]\s+/.test(line)) {
      const items = [];
      let current = index;
      while (current < lines.length && /^[-*]\s+/.test(lines[current])) {
        items.push(lines[current].replace(/^[-*]\s+/, ''));
        current += 1;
      }
      output.push(`<ul>${items.map((item) => `<li>${formatMarkdownInline(item)}</li>`).join('')}</ul>`);
      index = current - 1;
    } else if (/^\d+\.\s+/.test(line)) {
      const items = [];
      let current = index;
      while (current < lines.length && /^\d+\.\s+/.test(lines[current])) {
        items.push(lines[current].replace(/^\d+\.\s+/, ''));
        current += 1;
      }
      output.push(`<ol>${items.map((item) => `<li>${formatMarkdownInline(item)}</li>`).join('')}</ol>`);
      index = current - 1;
    } else if (line.trim()) {
      output.push(`<p>${formatMarkdownInline(line)}</p>`);
    } else {
      output.push('<p><br></p>');
    }
  }
  return output.join('');
}

function editorToMarkdown(root) {
  const clone = root?.cloneNode(true);
  if (!clone) return '';
  clone.querySelectorAll('details.markdownDisclosure').forEach((block) => {
    const summaryNode = block.querySelector(':scope > summary');
    const bodyNode = block.querySelector(':scope > .markdownDisclosureBody');
    const summary = (summaryNode?.innerText || summaryNode?.textContent || '').trim();
    const body = (bodyNode?.innerText || bodyNode?.textContent || '').trim();
    const source = [
      `<details${block.open ? ' open' : ''}>`,
      `<summary><strong>${summary}</strong></summary>`,
      '',
      body,
      '',
      '</details>'
    ].join('\n');
    const disclosureBlock = window.document.createElement('div');
    disclosureBlock.textContent = source;
    block.replaceWith(disclosureBlock);
  });
  clone.querySelectorAll('pre.markdownMermaid').forEach((block) => {
    const source = block.dataset.mermaidSource ||
      block.querySelector('code[data-language="mermaid"]')?.textContent || '';
    const fencedBlock = window.document.createElement('div');
    fencedBlock.textContent = `\`\`\`mermaid\n${source}\n\`\`\``;
    block.replaceWith(fencedBlock);
  });
  clone.querySelectorAll('.markdownMath').forEach((block) => {
    const source = block.dataset.mathSource ||
      block.querySelector('code[data-language="math"]')?.textContent || '';
    const mathBlock = window.document.createElement('div');
    mathBlock.textContent = `$$\n${source}\n$$`;
    block.replaceWith(mathBlock);
  });
  clone.querySelectorAll('.markdownMathInline').forEach((block) => {
    const source = block.dataset.mathSource ||
      block.querySelector('code[data-language="inline-math"]')?.textContent || '';
    const math = window.document.createTextNode(`\\(${source}\\)`);
    block.replaceWith(math);
  });
  clone.querySelectorAll('.markdownAlert').forEach((block) => {
    const type = block.dataset.alertType || 'NOTE';
    const body = block.querySelector('.markdownAlertBody')?.innerText ?? '';
    const source = [`> [!${type}]`, ...body.split('\n').map((line) => `> ${line}`)]
      .join('\n');
    const alertBlock = window.document.createElement('div');
    alertBlock.textContent = source;
    block.replaceWith(alertBlock);
  });
  clone.style.position = 'fixed';
  clone.style.left = '-100000px';
  clone.style.top = '0';
  clone.style.opacity = '0';
  clone.style.pointerEvents = 'none';
  window.document.body.appendChild(clone);
  const markdown = clone.innerText;
  clone.remove();
  return markdown;
}

function upgradeLegacyMathBlocks(root) {
  const openers = [...root.querySelectorAll('p')].filter(
    (paragraph) => paragraph.textContent?.trim() === '$$'
  );

  openers.forEach((opener) => {
    if (!opener.parentNode) return;
    const expressionNodes = [];
    let cursor = opener.nextSibling;
    let closer = null;

    while (cursor) {
      if (
        cursor.nodeType === window.Node.ELEMENT_NODE &&
        cursor.tagName === 'P' &&
        cursor.textContent?.trim() === '$$'
      ) {
        closer = cursor;
        break;
      }
      expressionNodes.push(cursor);
      cursor = cursor.nextSibling;
    }

    if (!closer) return;
    const source = expressionNodes
      .map((node) => node.textContent ?? '')
      .join('\n')
      .trim();
    const mathBlock = window.document.createElement('div');
    const code = window.document.createElement('code');
    mathBlock.className = 'markdownMath';
    code.setAttribute('data-language', 'math');
    code.textContent = source;
    mathBlock.appendChild(code);
    opener.parentNode?.insertBefore(mathBlock, opener);
    opener.remove();
    expressionNodes.forEach((node) => node.remove());
    closer.remove();
  });
}

function sanitizeHtml(html = '') {
  const template = window.document.createElement('template');
  template.innerHTML = html;
  upgradeLegacyMathBlocks(template.content);
  const allowed = new Set([
    'A',
    'ASIDE',
    'B',
    'BR',
    'DIV',
    'EM',
    'FONT',
    'H1',
    'H2',
    'H3',
    'HR',
    'I',
    'IMG',
    'LI',
    'OL',
    'P',
    'CODE',
    'DETAILS',
    'PRE',
    'SPAN',
    'STRONG',
    'SUMMARY',
    'TABLE',
    'TBODY',
    'TD',
    'TH',
    'THEAD',
    'TR',
    'U',
    'UL'
  ]);
  [...template.content.querySelectorAll('*')].forEach((node) => {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }
    [...node.attributes].forEach((attribute) => {
      const permitted =
        (node.tagName === 'A' && attribute.name === 'href') ||
        (['H1', 'H2', 'H3'].includes(node.tagName) && attribute.name === 'id') ||
        (node.tagName === 'IMG' && ['src', 'alt'].includes(attribute.name)) ||
        (node.tagName === 'FONT' && attribute.name === 'size') ||
        (node.tagName === 'PRE' && attribute.name === 'class' &&
          attribute.value === 'markdownMermaid') ||
        (node.tagName === 'CODE' && attribute.name === 'data-language' &&
          ['mermaid', 'math', 'inline-math'].includes(attribute.value)) ||
        (node.tagName === 'DIV' && attribute.name === 'class' &&
          ['markdownMath', 'markdownAlertTitle', 'markdownAlertBody',
            'markdownDisclosureBody'].includes(attribute.value)) ||
        (node.tagName === 'DETAILS' && attribute.name === 'class' &&
          attribute.value === 'markdownDisclosure') ||
        (node.tagName === 'DETAILS' && attribute.name === 'open') ||
        (node.tagName === 'ASIDE' && attribute.name === 'class' &&
          attribute.value.split(/\s+/).every((name) =>
            ['markdownAlert', 'markdownAlertNote', 'markdownAlertTip',
              'markdownAlertImportant', 'markdownAlertWarning',
              'markdownAlertCaution'].includes(name)
          )) ||
        (node.tagName === 'ASIDE' && attribute.name === 'data-alert-type' &&
          ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'].includes(attribute.value)) ||
        (node.tagName === 'SPAN' && attribute.name === 'class' &&
          attribute.value === 'markdownMathInline') ||
        (attribute.name === 'class' &&
          ['UL', 'LI', 'SPAN'].includes(node.tagName) &&
          attribute.value.split(/\s+/).every((name) =>
            ['markdownTaskList', 'markdownTaskItem', 'markdownCheckbox', 'checked'].includes(name)
          )) ||
        (['TD', 'TH'].includes(node.tagName) &&
          ['colspan', 'rowspan'].includes(attribute.name));
      if (!permitted) node.removeAttribute(attribute.name);
    });
    if (node.tagName === 'IMG') {
      const source = node.getAttribute('src') ?? '';
      if (!source.startsWith('data:image/') && !source.startsWith('https://'))
        node.remove();
    }
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? '';
      if (!isSafeMarkdownHref(href)) node.removeAttribute('href');
    }
  });

  const rawLinkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const textWalker = window.document.createTreeWalker(
    template.content,
    window.NodeFilter.SHOW_TEXT
  );
  const rawLinkNodes = [];
  while (textWalker.nextNode()) {
    const textNode = textWalker.currentNode;
    if (
      !textNode.parentElement?.closest('a, code, pre') &&
      rawLinkPattern.test(textNode.nodeValue ?? '')
    ) {
      rawLinkNodes.push(textNode);
    }
    rawLinkPattern.lastIndex = 0;
  }
  rawLinkNodes.forEach((textNode) => {
    const value = textNode.nodeValue ?? '';
    const fragment = window.document.createDocumentFragment();
    let lastIndex = 0;
    for (const match of value.matchAll(rawLinkPattern)) {
      const [source, label, href] = match;
      if (!isSafeMarkdownHref(href)) continue;
      fragment.append(value.slice(lastIndex, match.index));
      const anchor = window.document.createElement('a');
      anchor.setAttribute('href', href);
      anchor.textContent = label;
      fragment.append(anchor);
      lastIndex = match.index + source.length;
    }
    fragment.append(value.slice(lastIndex));
    textNode.replaceWith(fragment);
  });

  const headingOccurrences = new Map();
  template.content.querySelectorAll('h1, h2, h3').forEach((heading) => {
    const baseSlug = markdownHeadingSlug(heading.textContent ?? '') || 'seccion';
    const occurrence = headingOccurrences.get(baseSlug) ?? 0;
    headingOccurrences.set(baseSlug, occurrence + 1);
    heading.id = occurrence ? `${baseSlug}-${occurrence}` : baseSlug;
  });
  return template.innerHTML;
}

function restoreRenderedSources(root) {
  const clone = root?.cloneNode(true);
  if (!clone) return '';
  clone.querySelectorAll('pre.markdownMermaid').forEach((block) => {
    const source = block.dataset.mermaidSource ||
      block.querySelector('code[data-language="mermaid"]')?.textContent || '';
    const code = window.document.createElement('code');
    code.setAttribute('data-language', 'mermaid');
    code.textContent = source;
    block.replaceChildren(code);
    block.removeAttribute('contenteditable');
    block.removeAttribute('data-mermaid-source');
  });
  clone.querySelectorAll('.markdownMath').forEach((block) => {
    const source = block.dataset.mathSource ||
      block.querySelector('code[data-language="math"]')?.textContent || '';
    const code = window.document.createElement('code');
    code.setAttribute('data-language', 'math');
    code.textContent = source;
    block.className = 'markdownMath';
    block.replaceChildren(code);
    block.removeAttribute('contenteditable');
    block.removeAttribute('data-math-source');
  });
  clone.querySelectorAll('.markdownMathInline').forEach((block) => {
    const source = block.dataset.mathSource ||
      block.querySelector('code[data-language="inline-math"]')?.textContent || '';
    const code = window.document.createElement('code');
    code.setAttribute('data-language', 'inline-math');
    code.textContent = source;
    block.className = 'markdownMathInline';
    block.replaceChildren(code);
    block.removeAttribute('contenteditable');
    block.removeAttribute('data-math-source');
  });
  return clone.innerHTML;
}

async function renderMermaidBlocks(root) {
  const blocks = [...(root?.querySelectorAll('pre') ?? [])];
  for (const block of blocks) {
    const code = block.querySelector('code');
    if (!code) continue;
    const source = code.textContent?.trim();
    const isExplicitMermaid = code.getAttribute('data-language') === 'mermaid' ||
      block.classList.contains('markdownMermaid');
    if (!source || (!isExplicitMermaid && !mermaidDefinitionPattern.test(source))) continue;
    block.className = 'markdownMermaid';
    block.dataset.mermaidSource = source;
    block.setAttribute('contenteditable', 'false');
    try {
      mermaidRenderSequence += 1;
      const id = `docs-mermaid-${Date.now()}-${mermaidRenderSequence}`;
      const { svg, bindFunctions } = await mermaid.render(id, source);
      if (!block.isConnected) continue;
      const diagram = window.document.createElement('div');
      diagram.className = 'markdownMermaidDiagram';
      diagram.innerHTML = svg;
      const renderedSvg = diagram.querySelector('svg');
      const viewBox = renderedSvg?.getAttribute('viewBox')
        ?.split(/\s+/)
        .map(Number);
      if (renderedSvg && viewBox?.length === 4) {
        const availableWidth = Math.max(block.clientWidth, 1);
        const maximumHeight = 640;
        const scale = Math.min(
          availableWidth / viewBox[2],
          maximumHeight / viewBox[3],
          1
        );
        renderedSvg.style.width = `${Math.max(viewBox[2] * scale, 1)}px`;
        renderedSvg.style.maxWidth = '100%';
        renderedSvg.style.maxHeight = `${maximumHeight}px`;
      }
      block.replaceChildren(diagram);
      bindFunctions?.(diagram);
    } catch (error) {
      block.removeAttribute('contenteditable');
      block.classList.add('markdownMermaidError');
      block.title = error instanceof Error
        ? `Mermaid: ${error.message}`
        : 'Mermaid no pudo interpretar este diagrama.';
      console.error('No se pudo renderizar el diagrama Mermaid.', error);
    }
  }
}

function renderMathBlocks(root) {
  const blocks = [...(root?.querySelectorAll('.markdownMath, .markdownMathInline') ?? [])];
  blocks.forEach((block) => {
    const inline = block.classList.contains('markdownMathInline');
    const source = block.dataset.mathSource ||
      block.querySelector(`code[data-language="${inline ? 'inline-math' : 'math'}"]`)?.textContent?.trim();
    if (!source) return;
    block.dataset.mathSource = source;
    block.setAttribute('contenteditable', 'false');
    try {
      katex.render(source, block, {
        displayMode: !inline,
        throwOnError: false,
        strict: false,
        trust: false
      });
      block.classList.remove('markdownMathError');
      block.removeAttribute('title');
    } catch (error) {
      block.classList.add('markdownMathError');
      block.title = error instanceof Error
        ? `Fórmula: ${error.message}`
        : 'No se pudo interpretar la fórmula.';
      console.error('No se pudo renderizar la fórmula.', error);
    }
  });
}

async function renderDocumentBlocks(root) {
  await renderMermaidBlocks(root);
  renderMathBlocks(root);
}

export function MarkdownContent({ markdown = '', className = '' }) {
  const rootRef = useRef(null);
  const html = useMemo(
    () => sanitizeHtml(markdownToHtml(markdown)),
    [markdown]
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (rootRef.current) void renderDocumentBlocks(rootRef.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [html]);

  return (
    <div
      ref={rootRef}
      className={`docsEditor ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MarkdownContentEditor({
  markdown = '',
  onChange,
  className = '',
  ariaLabel = 'Contenido Markdown'
}) {
  const editorRef = useRef(null);
  const initialMarkdownRef = useRef(markdown);

  useEffect(() => {
    if (!editorRef.current) return undefined;
    editorRef.current.innerHTML = sanitizeHtml(
      markdownToHtml(initialMarkdownRef.current)
    );
    const frame = window.requestAnimationFrame(() => {
      if (editorRef.current) void renderDocumentBlocks(editorRef.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={editorRef}
      className={`docsEditor ${className}`.trim()}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline="true"
      onInput={() => onChange(editorToMarkdown(editorRef.current))}
      onPaste={(event) => {
        event.preventDefault();
        window.document.execCommand(
          'insertText',
          false,
          event.clipboardData.getData('text/plain')
        );
      }}
    />
  );
}

function collectDocumentStyles() {
  return [...window.document.styleSheets]
    .map((styleSheet) => {
      try {
        return [...styleSheet.cssRules].map((rule) => rule.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');
}

function safeDownloadName(name) {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '')
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .trim();
  return cleaned || 'informe';
}

function escapeHtmlText(value) {
  const element = window.document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

async function downloadRenderedReport(page, name, markdownContent = null) {
  if (!page) return;
  const renderHost = window.document.createElement('div');
  renderHost.style.position = 'fixed';
  renderHost.style.left = '-100000px';
  renderHost.style.top = '0';
  renderHost.style.width = '720px';
  renderHost.style.pointerEvents = 'none';

  const exportPage = page.cloneNode(true);
  exportPage.querySelectorAll('.editorToolbar, .tableAddControl').forEach(
    (control) => control.remove()
  );
  exportPage.querySelectorAll('[contenteditable]').forEach((element) =>
    element.removeAttribute('contenteditable')
  );

  if (markdownContent !== null) {
    const markdownEditor = exportPage.querySelector('.docsMarkdownEditor');
    const renderedEditor = window.document.createElement('div');
    renderedEditor.className = 'docsEditor';
    renderedEditor.innerHTML = sanitizeHtml(markdownToHtml(markdownContent));
    markdownEditor?.replaceWith(renderedEditor);
  }

  renderHost.appendChild(exportPage);
  window.document.body.appendChild(renderHost);
  await renderDocumentBlocks(exportPage);

  const title = escapeHtmlText(name);
  const styles = collectDocumentStyles();
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${styles}
html,body{margin:0;min-height:100%;background:#ececef}
body{box-sizing:border-box;padding:34px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.docsPage{box-sizing:border-box;margin:0 auto}
.editorToolbar,.tableAddControl{display:none!important}
@media print{html,body{background:#fff}body{padding:0}.docsPage{width:100%;border:0;box-shadow:none}}
</style>
</head>
<body>${exportPage.outerHTML}</body>
</html>`;
  renderHost.remove();

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `${safeDownloadName(name)}.html`;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DocumentEditor({ document: docItem, onSave }) {
  const editorRef = useRef(null);
  const pageRef = useRef(null);
  const imageInputRef = useRef(null);
  const savedRange = useRef(null);
  const [saved, setSaved] = useState(true);
  const [fontSize, setFontSize] = useState('3');
  const initialHtml = useMemo(
    () => sanitizeHtml(docItem.content),
    [docItem.content]
  );
  const [richHtml, setRichHtml] = useState(initialHtml);
  const [markdownMode, setMarkdownMode] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState('');
  const [tableControls, setTableControls] = useState(null);

  useEffect(() => {
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (!selection?.rangeCount || !editorRef.current) return;
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange();
      }
    };
    window.document.addEventListener('selectionchange', rememberSelection);
    return () =>
      window.document.removeEventListener('selectionchange', rememberSelection);
  }, []);

  useEffect(() => {
    if (markdownMode || !editorRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      void renderDocumentBlocks(editorRef.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [richHtml, markdownMode, docItem.id]);

  const restoreSelection = () => {
    editorRef.current?.focus();
    if (!savedRange.current) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange.current);
  };
  const runCommand = (command, value = null) => {
    restoreSelection();
    window.document.execCommand(command, false, value);
    setSaved(false);
  };
  const insertImage = (file) => {
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => runCommand('insertImage', reader.result);
    reader.readAsDataURL(file);
  };
  const locateTable = (table) => {
    if (!table || !pageRef.current) {
      setTableControls(null);
      return;
    }
    const tableRect = table.getBoundingClientRect();
    const pageRect = pageRef.current.getBoundingClientRect();
    setTableControls({
      table,
      left: tableRect.left - pageRect.left,
      top: tableRect.top - pageRect.top,
      width: tableRect.width,
      height: tableRect.height
    });
  };
  const addTableColumn = () => {
    const table = tableControls?.table;
    if (!table) return;
    [...table.rows].forEach((row) => {
      const cell = window.document.createElement(row.querySelector('th') ? 'th' : 'td');
      cell.textContent = row.querySelector('th') ? 'Encabezado' : 'Contenido';
      row.appendChild(cell);
    });
    setSaved(false);
    window.requestAnimationFrame(() => locateTable(table));
  };
  const addTableRow = () => {
    const table = tableControls?.table;
    if (!table) return;
    const columnCount = table.rows[0]?.cells.length || 2;
    const row = table.tBodies[0]?.insertRow() ?? table.insertRow();
    for (let index = 0; index < columnCount; index += 1) {
      row.insertCell().textContent = 'Contenido';
    }
    setSaved(false);
    window.requestAnimationFrame(() => locateTable(table));
  };
  const toggleMarkdown = () => {
    if (markdownMode) {
      const nextHtml = sanitizeHtml(markdownToHtml(markdownDraft));
      setRichHtml(nextHtml);
      setMarkdownMode(false);
      setSaved(false);
    } else {
      setMarkdownDraft(editorToMarkdown(editorRef.current));
      setMarkdownMode(true);
      setTableControls(null);
    }
  };

  return (
    <>
      <div className="docsViewerBar">
        <div className="docsViewerIdentity">
          <i>
            <ResourceIcon label="Docs" url="https://docs.google.com/document" />
          </i>
          <span>
            <strong>{docItem.name}</strong>
            <small>{saved ? 'Guardado' : 'Cambios sin guardar'}</small>
          </span>
        </div>
        <div className="docsViewerActions">
          <button
            type="button"
            className="docsDownloadButton"
            aria-label={`Descargar informe ${docItem.name}`}
            title="Descargar informe"
            onClick={() =>
              void downloadRenderedReport(
                pageRef.current,
                docItem.name,
                markdownMode ? markdownDraft : null
              )
            }
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 19h14" />
            </svg>
          </button>
          <button
            type="button"
            className="docsSaveButton"
            disabled={saved}
            onClick={() => {
              const content = markdownMode
                ? sanitizeHtml(markdownToHtml(markdownDraft))
                : sanitizeHtml(restoreRenderedSources(editorRef.current) || richHtml);
              onSave(content);
              setRichHtml(content);
              if (!markdownMode && editorRef.current) {
                editorRef.current.innerHTML = content;
                window.requestAnimationFrame(() =>
                  void renderDocumentBlocks(editorRef.current)
                );
              }
              setSaved(true);
            }}
          >
            Guardar
          </button>
        </div>
      </div>
      <div className="docsCanvas">
        <article className="docsPage" ref={pageRef}>
          <span>DOCUMENTACIÓN DEL PROCESO</span>
          <div className="docsTitleRow">
            <h1>{docItem.name}</h1>
            <div className={`editorToolbar ${markdownMode ? 'markdownActive' : ''}`} aria-label="Formato del documento">
              {!markdownMode && (
                <>
              <button
                type="button"
                aria-label="Negrita"
                title="Negrita"
                onMouseDown={(event) => {
                  event.preventDefault();
                  runCommand('bold');
                }}
              >
                <b>B</b>
              </button>
              <button
                type="button"
                aria-label="Cursiva"
                title="Cursiva"
                onMouseDown={(event) => {
                  event.preventDefault();
                  runCommand('italic');
                }}
              >
                <i>I</i>
              </button>
              <AppleSelect
                value={fontSize}
                options={fontSizes}
                ariaLabel="Tamaño de letra"
                className="editorSizeSelect"
                onChange={(value) => {
                  setFontSize(value);
                  runCommand('fontSize', value);
                }}
              />
              <button
                type="button"
                aria-label="Agregar tabla"
                title="Agregar tabla"
                onMouseDown={(event) => {
                  event.preventDefault();
                  runCommand(
                    'insertHTML',
                    '<table><tbody><tr><th>Encabezado</th><th>Encabezado</th></tr><tr><td>Contenido</td><td>Contenido</td></tr></tbody></table><p><br></p>'
                  );
                }}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M4 5h16v14H4zm0 5h16M10 5v14" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Agregar imagen"
                title="Agregar imagen"
                onMouseDown={(event) => {
                  event.preventDefault();
                  imageInputRef.current?.click();
                }}
              >
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m3 16 5-5 4 4 2-2 7 7" />
                </svg>
              </button>
              <input
                ref={imageInputRef}
                className="editorImageInput"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  insertImage(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
                </>
              )}
              <button
                type="button"
                className="markdownToggle"
                aria-label={markdownMode ? 'Aplicar Markdown' : 'Activar Markdown'}
                title={markdownMode ? 'Convertir Markdown' : 'Pegar Markdown'}
                onMouseDown={(event) => {
                  event.preventDefault();
                  toggleMarkdown();
                }}
              >
                <svg viewBox="0 0 24 24"><path d="M3 6h18v12H3zM6 9v6m0-6 3 3 3-3v6m3-3 2 2 2-2m-2 2V9" /></svg>
              </button>
            </div>
          </div>
          {markdownMode ? (
            <textarea
              className="docsMarkdownEditor"
              aria-label={`Markdown de ${docItem.name}`}
              value={markdownDraft}
              placeholder="Pega aquí tu Markdown…"
              onChange={(event) => {
                setMarkdownDraft(event.target.value);
                setSaved(false);
              }}
            />
          ) : (
            <div
              ref={editorRef}
              className="docsEditor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Escribe aquí el objetivo, responsables, pasos, recursos y notas del proceso…"
              dangerouslySetInnerHTML={{ __html: richHtml }}
              onClick={(event) => {
                const checkbox = event.target.closest('.markdownCheckbox');
                if (checkbox) {
                  checkbox.classList.toggle('checked');
                  setSaved(false);
                  return;
                }
                const anchor = event.target.closest('a[href^="#"]');
                if (anchor) {
                  event.preventDefault();
                  const targetId = decodeURIComponent(anchor.getAttribute('href').slice(1));
                  editorRef.current
                    ?.querySelector(`[id="${CSS.escape(targetId)}"]`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  return;
                }
                locateTable(event.target.closest('table'));
              }}
              onMouseOver={(event) => {
                const table = event.target.closest('table');
                if (table) locateTable(table);
              }}
              onInput={() => setSaved(false)}
              onPaste={(event) => {
                const images = [...event.clipboardData.items]
                  .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
                  .map((item) => item.getAsFile())
                  .filter(Boolean);
                event.preventDefault();
                if (images.length) images.forEach(insertImage);
                else runCommand('insertText', event.clipboardData.getData('text/plain'));
              }}
            />
          )}
          {tableControls && !markdownMode && (
            <>
              <button
                type="button"
                className="tableAddControl addColumnControl"
                style={{ left: tableControls.left + tableControls.width + 10, top: tableControls.top + tableControls.height / 2 }}
                aria-label="Agregar columna"
                title="Agregar columna"
                onClick={addTableColumn}
              ><PlusIcon /></button>
              <button
                type="button"
                className="tableAddControl addRowControl"
                style={{ left: tableControls.left + tableControls.width / 2, top: tableControls.top + tableControls.height + 10 }}
                aria-label="Agregar fila"
                title="Agregar fila"
                onClick={addTableRow}
              ><PlusIcon /></button>
            </>
          )}
        </article>
      </div>
    </>
  );
}

function RelatedFileViewer({ document: docItem }) {
  const isImage = docItem.fileType?.startsWith('image/');
  const isPdf = docItem.fileType === 'application/pdf';
  return (
    <>
      <div className="docsViewerBar">
        <div className="docsViewerIdentity">
          <i><ResourceIcon label={docItem.fileName} url={docItem.fileName} /></i>
          <span><strong>{docItem.name}</strong><small>Archivo relacionado</small></span>
        </div>
        <a className="fileDownloadButton" href={docItem.fileData} download={docItem.fileName}>Descargar</a>
      </div>
      <div className="relatedFileCanvas">
        {isImage ? (
          <img src={docItem.fileData} alt={docItem.name} />
        ) : isPdf ? (
          <iframe src={docItem.fileData} title={docItem.name} />
        ) : (
          <div><ResourceIcon label={docItem.fileName} url={docItem.fileName} /><h3>{docItem.fileName}</h3><p>Usa Descargar para abrir este archivo.</p></div>
        )}
      </div>
    </>
  );
}

export default function DocsWorkspace({
  documents,
  onAddDocument,
  onUpdateDocument,
  onUpdateDocumentIcon,
  onDeleteDocument
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [subnoteParent, setSubnoteParent] = useState(null);
  const [subnoteName, setSubnoteName] = useState('');
  const [fileParent, setFileParent] = useState(null);
  const [fileError, setFileError] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const pressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const selectedDocument = documents.find(
    (document) => document.id === selectedId
  );
  const active = selectedDocument?.icon === 'folder'
    ? null
    : selectedDocument;
  const activeLineage = useMemo(() => {
    const lineage = new Set();
    let current = documents.find((document) => document.id === selectedId);
    while (current) {
      lineage.add(current.id);
      current = documents.find((document) => document.id === current.parentId);
    }
    return lineage;
  }, [documents, selectedId]);
  const documentIds = useMemo(
    () => new Set(documents.map((document) => document.id)),
    [documents]
  );
  const roots = documents.filter(
    (document) => !document.parentId || !documentIds.has(document.parentId)
  );

  useEffect(() => () => window.clearTimeout(pressTimer.current), []);
  useEffect(() => {
    if (!subnoteParent) return;
    const close = () => {
      setSubnoteParent(null);
      setSubnoteName('');
    };
    window.document.addEventListener('mousedown', close);
    return () => window.document.removeEventListener('mousedown', close);
  }, [subnoteParent]);
  useEffect(() => {
    if (!fileParent) return;
    const close = () => {
      setFileParent(null);
      setFileError('');
    };
    window.document.addEventListener('mousedown', close);
    return () => window.document.removeEventListener('mousedown', close);
  }, [fileParent]);
  const startLongPress = (event, docItem) => {
    if (event.pointerType === 'mouse' && event.button !== 2) return;
    const { clientX: x, clientY: y } = event;
    longPressTriggered.current = false;
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setContextMenu({ resource: docItem, x, y });
    }, 650);
  };
  const stopLongPress = () => window.clearTimeout(pressTimer.current);
  const toggleExpanded = (id) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const expandDocumentBranch = (id) => {
    const branch = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      documents.forEach((document) => {
        if (branch.has(document.parentId) && !branch.has(document.id)) {
          branch.add(document.id);
          changed = true;
        }
      });
    }
    const expandable = [...branch].filter((branchId) =>
      documents.some((document) => document.parentId === branchId)
    );
    setExpanded((current) => new Set([...current, ...expandable]));
  };
  const createDocument = (name, parentId = null, details = {}) => {
    const id = onAddDocument(name, parentId, details);
    if (parentId) setExpanded((current) => new Set([...current, parentId]));
    setSelectedId(id);
  };

  const renderDocument = (docItem, depth = 0) => {
    const children = documents.filter(
      (document) => document.parentId === docItem.id
    );
    const isExpanded = expanded.has(docItem.id);
    return (
      <div
        className={`docTreeNode ${activeLineage.has(docItem.id) ? 'selectedBranch' : ''}`}
        key={docItem.id}
        style={{ '--doc-depth': depth }}
      >
        <div
          className="docTreeRow"
          onContextMenu={(event) => {
            event.preventDefault();
            setContextMenu({
              resource: docItem,
              x: event.clientX,
              y: event.clientY
            });
          }}
          onPointerDown={(event) => startLongPress(event, docItem)}
          onPointerUp={stopLongPress}
          onPointerCancel={stopLongPress}
          onPointerLeave={stopLongPress}
        >
          {children.length ? (
            <button
              type="button"
              className={`docBranchToggle ${isExpanded ? 'open' : ''}`}
              aria-label={`${isExpanded ? 'Ocultar' : 'Mostrar'} subnotas de ${
                docItem.name
              }`}
              onClick={() => toggleExpanded(docItem.id)}
            >
              <ChevronIcon />
            </button>
          ) : <span className="docBranchSpacer" aria-hidden="true" />}
          <button
            type="button"
            className={`toolCard docTreeCard ${
              active?.id === docItem.id ? 'active' : ''
            }`}
            onClick={() => {
              if (longPressTriggered.current) {
                longPressTriggered.current = false;
                return;
              }
              if (docItem.icon === 'folder') {
                setSelectedId(null);
                if (children.length) toggleExpanded(docItem.id);
                return;
              }
              const closingPreview = selectedId === docItem.id;
              setSelectedId(closingPreview ? null : docItem.id);
              if (!closingPreview && children.length) {
                expandDocumentBranch(docItem.id);
              }
            }}
          >
            <i>
              {docItem.type !== 'file' && docItem.icon === 'folder' ? (
                <FolderIcon />
              ) : (
                <ResourceIcon label={docItem.type === 'file' ? docItem.fileName : 'Docs'} url={docItem.type === 'file' ? docItem.fileName : 'https://docs.google.com/document'} />
              )}
            </i>
            <span>
              <strong>{docItem.name}</strong>
            </span>
          </button>
        </div>
        {children.length > 0 && isExpanded && (
          <div className="docTreeChildren">
            {children.map((child) => renderDocument(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      className={`toolsWorkspace docsWorkspace ${active ? 'viewerOpen' : ''}`}
    >
      <div className="toolsIntro">
        <span>CONOCIMIENTO INTERNO</span>
        <h2>Docs</h2>
        <p>Documenta los proyectos y procesos de tu equipo.</p>
      </div>
      <div className="toolsShell">
        <aside
          className="toolsLibrary"
          aria-label="Biblioteca de documentación"
        >
          <div className="toolsLibraryHead docsLibraryHead">
            <div>
              <span>Biblioteca</span>
              <strong>{documents.length} documentos</strong>
            </div>
          </div>
          <div className="toolsList docsTree">
            {roots.map((document) => renderDocument(document))}
            {!documents.length && (
              <div className="toolsEmpty">
                <i>
                  <LinkIcon />
                </i>
                <strong>Aún no hay documentación</strong>
                <p>Crea el primer proyecto para documentar su proceso.</p>
              </div>
            )}
          </div>
          <div className="toolsActions">
            <div className="anchor toolsAddAnchor">
              <button
                type="button"
                className="addRow toolsAddButton"
                aria-expanded={addOpen}
                onClick={() => setAddOpen((current) => !current)}
              >
                <PlusIcon />
                <span>Agregar documento</span>
              </button>
              <Popover
                open={addOpen}
                onClose={() => setAddOpen(false)}
                title="Nuevo documento"
                placement="top"
              >
                <form
                  className="addForm"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = projectName.trim();
                    if (!name) return;
                    createDocument(name);
                    setProjectName('');
                    setAddOpen(false);
                  }}
                >
                  <label>
                    Nombre del proyecto
                    <input
                      autoFocus
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      placeholder="Ej. Apertura de nueva sucursal"
                    />
                  </label>
                  <div className="formActions">
                    <button type="button" onClick={() => setAddOpen(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="confirm">
                      Crear
                    </button>
                  </div>
                </form>
              </Popover>
            </div>
          </div>
        </aside>
        <div className="toolsViewer docsViewer">
          {active ? (
            active.type === 'file' ? (
              <RelatedFileViewer key={active.id} document={active} />
            ) : (
              <DocumentEditor key={active.id} document={active} onSave={(content) => onUpdateDocument(active.id, content)} />
            )
          ) : (
            <div className="toolsViewerEmpty">
              <div className="toolsWindowDots">
                <i />
                <i />
                <i />
              </div>
              <span className="docsEmptyIcon">
                <ResourceIcon
                  label="Docs"
                  url="https://docs.google.com/document"
                />
              </span>
              <h3>Selecciona un proyecto</h3>
              <p>Su documentación completa aparecerá aquí.</p>
            </div>
          )}
        </div>
      </div>
      <DeleteContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onAddSubnote={contextMenu?.resource?.type === 'file' ? undefined : () => {
          if (!contextMenu?.resource) return;
          setSubnoteParent({
            ...contextMenu.resource,
            menuX: contextMenu.x,
            menuY: contextMenu.y
          });
          setContextMenu(null);
        }}
        onAddFile={contextMenu?.resource?.type === 'file' ? undefined : () => {
          if (!contextMenu?.resource) return;
          setFileParent({
            ...contextMenu.resource,
            menuX: contextMenu.x,
            menuY: contextMenu.y
          });
          setContextMenu(null);
        }}
        iconMode={contextMenu?.resource?.icon === 'folder' ? 'folder' : 'docs'}
        onToggleIcon={
          contextMenu?.resource?.type !== 'file' &&
          (contextMenu?.resource?.icon === 'folder' ||
            documents.some((document) =>
              document.parentId === contextMenu?.resource?.id
            ))
            ? () => {
                if (!contextMenu?.resource) return;
                onUpdateDocumentIcon(
                  contextMenu.resource.id,
                  contextMenu.resource.icon === 'folder' ? 'docs' : 'folder'
                );
                if (contextMenu.resource.icon !== 'folder') {
                  setSelectedId(null);
                }
                setContextMenu(null);
              }
            : undefined
        }
        onDelete={() => {
          if (!contextMenu?.resource) return;
          onDeleteDocument(contextMenu.resource.id);
          setSelectedId(null);
          setContextMenu(null);
        }}
      />
      {subnoteParent && (
        <form
          className="subnotePopover addForm"
          style={{
            left: Math.max(
              8,
              Math.min(subnoteParent.menuX + 12, window.innerWidth - 258)
            ),
            top: Math.max(
              8,
              Math.min(subnoteParent.menuY, window.innerHeight - 205)
            )
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault();
            const name = subnoteName.trim();
            if (!name) return;
            createDocument(name, subnoteParent.id);
            setSubnoteName('');
            setSubnoteParent(null);
          }}
        >
          <span>SUBNOTA DE {subnoteParent.name.toUpperCase()}</span>
          <h3>Nueva subnota</h3>
          <label>
            Nombre
            <input
              autoFocus
              value={subnoteName}
              onChange={(event) => setSubnoteName(event.target.value)}
              placeholder="Ej. Validación y pruebas"
            />
          </label>
          <div className="formActions">
            <button
              type="button"
              onClick={() => {
                setSubnoteParent(null);
                setSubnoteName('');
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="confirm">
              Crear
            </button>
          </div>
        </form>
      )}
      {fileParent && (
        <form
          className="subnotePopover filePopover addForm"
          style={{
            left: Math.max(8, Math.min(fileParent.menuX + 12, window.innerWidth - 258)),
            top: Math.max(8, Math.min(fileParent.menuY, window.innerHeight - 220))
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault();
            const file = event.currentTarget.elements.relatedFile.files?.[0];
            if (!file) return;
            if (file.size > 700000) {
              setFileError('El archivo debe pesar menos de 700 KB.');
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              createDocument(file.name, fileParent.id, {
                type: 'file',
                fileName: file.name,
                fileType: file.type,
                fileData: reader.result
              });
              setFileParent(null);
              setFileError('');
            };
            reader.readAsDataURL(file);
          }}
        >
          <span>ARCHIVO DE {fileParent.name.toUpperCase()}</span>
          <h3>Archivo relacionado</h3>
          <label>Seleccionar archivo<input name="relatedFile" type="file" required /></label>
          {fileError && <p className="fileFormError">{fileError}</p>}
          <div className="formActions">
            <button type="button" onClick={() => { setFileParent(null); setFileError(''); }}>Cancelar</button>
            <button type="submit" className="confirm">Agregar</button>
          </div>
        </form>
      )}
    </section>
  );
}
