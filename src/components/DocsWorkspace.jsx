import { useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import AppleSelect from './AppleSelect';
import DeleteContextMenu from './DeleteContextMenu';
import { ChevronIcon, LinkIcon, PlusIcon, ResourceIcon } from './Icons';
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
  return value
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
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

function markdownToHtml(markdown = '') {
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const lines = escaped.split(/\r?\n/);
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1] ?? '';
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
      output.push(`<h${level}>${formatMarkdownInline(heading[2])}</h${level}>`);
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
  clone.querySelectorAll('pre.markdownMermaid').forEach((block) => {
    const source = block.dataset.mermaidSource ||
      block.querySelector('code[data-language="mermaid"]')?.textContent || '';
    const fencedBlock = window.document.createElement('div');
    fencedBlock.textContent = `\`\`\`mermaid\n${source}\n\`\`\``;
    block.replaceWith(fencedBlock);
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

function sanitizeHtml(html = '') {
  const template = window.document.createElement('template');
  template.innerHTML = html;
  const allowed = new Set([
    'A',
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
    'PRE',
    'SPAN',
    'STRONG',
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
        (node.tagName === 'IMG' && ['src', 'alt'].includes(attribute.name)) ||
        (node.tagName === 'FONT' && attribute.name === 'size') ||
        (node.tagName === 'PRE' && attribute.name === 'class' &&
          attribute.value === 'markdownMermaid') ||
        (node.tagName === 'CODE' && attribute.name === 'data-language' &&
          attribute.value === 'mermaid') ||
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
      if (!href.startsWith('https://')) node.removeAttribute('href');
    }
  });
  return template.innerHTML;
}

function restoreMermaidSources(root) {
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
      void renderMermaidBlocks(editorRef.current);
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
        <button
          type="button"
          className="docsSaveButton"
          disabled={saved}
          onClick={() => {
            const content = markdownMode
              ? sanitizeHtml(markdownToHtml(markdownDraft))
              : sanitizeHtml(restoreMermaidSources(editorRef.current) || richHtml);
            onSave(content);
            setRichHtml(content);
            if (!markdownMode && editorRef.current) {
              editorRef.current.innerHTML = content;
              window.requestAnimationFrame(() => void renderMermaidBlocks(editorRef.current));
            }
            setSaved(true);
          }}
        >
          Guardar
        </button>
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
  trash = [],
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  onRestoreDocument
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [subnoteParent, setSubnoteParent] = useState(null);
  const [subnoteName, setSubnoteName] = useState('');
  const [fileParent, setFileParent] = useState(null);
  const [fileError, setFileError] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);
  const [renderTime] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(() => new Set());
  const pressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const active = documents.find((document) => document.id === selectedId);
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
  const trashRoots = trash.filter(
    (document) => document.id === document.trashGroupId
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
              const closingPreview = selectedId === docItem.id;
              setSelectedId(closingPreview ? null : docItem.id);
              if (!closingPreview && children.length) {
                expandDocumentBranch(docItem.id);
              }
            }}
          >
            <i><ResourceIcon label={docItem.type === 'file' ? docItem.fileName : 'Docs'} url={docItem.type === 'file' ? docItem.fileName : 'https://docs.google.com/document'} /></i>
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
              <span>{trashOpen ? 'Eliminados' : 'Biblioteca'}</span>
              <strong>
                {trashOpen
                  ? `${trashRoots.length} elementos · 5 días`
                  : `${documents.length} documentos`}
              </strong>
            </div>
            <button
              type="button"
              className={`docsTrashButton ${trashOpen ? 'active' : ''}`}
              aria-label={trashOpen ? 'Volver a Biblioteca' : 'Ver eliminados'}
              title={trashOpen ? 'Volver a Biblioteca' : 'Eliminados'}
              onClick={() => {
                setTrashOpen((current) => !current);
                setSelectedId(null);
              }}
            >
              {trashOpen ? (
                <svg viewBox="0 0 24 24">
                  <path d="m9 6-6 6 6 6M3 12h13a5 5 0 0 1 5 5v1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
                </svg>
              )}
              {!trashOpen && trashRoots.length > 0 && (
                <i>{trashRoots.length}</i>
              )}
            </button>
          </div>
          <div className="toolsList docsTree">
            {trashOpen ? (
              <>
                {trashRoots.map((document) => {
                  const children =
                    trash.filter(
                      (item) => item.trashGroupId === document.trashGroupId
                    ).length - 1;
                  const remaining = Math.max(
                    1,
                    5 - Math.floor((renderTime - document.deletedAt) / 86400000)
                  );
                  return (
                    <div className="trashDocCard" key={document.id}>
                      <i>
                        <ResourceIcon
                          label="Docs"
                          url="https://docs.google.com/document"
                        />
                      </i>
                      <span>
                        <strong>{document.name}</strong>
                        <small>
                          {children > 0 ? `${children} subnotas · ` : ''}
                          {remaining} días restantes
                        </small>
                      </span>
                      <button
                        type="button"
                        aria-label={`Restaurar ${document.name}`}
                        title="Restaurar"
                        onClick={() => onRestoreDocument(document.trashGroupId)}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                {!trashRoots.length && (
                  <div className="toolsEmpty">
                    <i>
                      <LinkIcon />
                    </i>
                    <strong>No hay eliminados</strong>
                    <p>
                      Los documentos eliminados permanecerán aquí durante cinco
                      días.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
          {!trashOpen && (
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
          )}
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
