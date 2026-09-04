export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="m7 7 10 10M17 7 7 17" />
    </svg>
  );
}
export function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M6 12h12" />
    </svg>
  );
}
export function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </svg>
  );
}
export function FolderIcon() {
  return (
    <svg
      className="resourceTypeIcon folderIcon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path fill="#5E9FE6" d="M2.8 6.1c0-1 .8-1.8 1.8-1.8h5l2 2.2h7.8c1 0 1.8.8 1.8 1.8v9.8c0 1-.8 1.8-1.8 1.8H4.6c-1 0-1.8-.8-1.8-1.8z" />
      <path fill="#8BC0F4" d="M2.8 8.1h18.4v2H2.8z" />
    </svg>
  );
}
function getResourceKind(label = '', url = '') {
  const name = label.trim().toLowerCase();
  const link = url.trim().toLowerCase();

  if (
    name.endsWith('.sql') ||
    /\.sql(?:$|[?#])/.test(link)
  ) {
    return 'sql';
  }

  if (
    name.startsWith('sheets') ||
    name.startsWith('sheet') ||
    link.includes('docs.google.com/spreadsheets')
  ) {
    return 'sheets';
  }
  if (
    name.startsWith('docs') ||
    name.startsWith('doc') ||
    link.includes('docs.google.com/document')
  ) {
    return 'docs';
  }
  if (
    name.startsWith('drive') ||
    link.includes('drive.google.com') ||
    link.includes('docs.google.com/drive')
  ) {
    return 'drive';
  }
  if (
    name.startsWith('pdf') ||
    name.endsWith('.pdf') ||
    /\.pdf(?:$|[?#])/.test(link)
  ) {
    return 'pdf';
  }
  return 'link';
}

export function ResourceIcon({ label, url }) {
  const kind = getResourceKind(label, url);

  if (kind === 'sql') {
    return (
      <svg className="resourceTypeIcon sqlIcon" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#FF9F0A" d="M5 2.5h9l5 5v14H5z" />
        <path fill="#FFD60A" d="M14 2.5v5h5z" />
        <text x="12" y="16.5" textAnchor="middle" fill="#fff" fontSize="5.2" fontWeight="800" fontFamily="Arial, sans-serif">SQL</text>
      </svg>
    );
  }

  if (kind === 'drive') {
    return (
      <svg
        className="resourceTypeIcon driveIcon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path fill="#0F9D58" d="M8.1 3.5h5.3l5.2 9H13.3z" />
        <path fill="#F4B400" d="M8.1 3.5 2.8 12.6l2.7 4.6 5.2-9z" />
        <path fill="#4285F4" d="M5.5 17.2h10.6l2.5-4.7H8z" />
      </svg>
    );
  }
  if (kind === 'sheets') {
    return (
      <svg
        className="resourceTypeIcon sheetsIcon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path fill="#0F9D58" d="M6 2.5h8l4 4V21.5H6z" />
        <path fill="#87CEAC" d="M14 2.5v4h4z" />
        <path
          fill="none"
          stroke="#fff"
          strokeWidth="1.25"
          d="M8.5 10h7v7h-7zm0 2.4h7m-4.7-2.4v7"
        />
      </svg>
    );
  }
  if (kind === 'docs') {
    return (
      <svg
        className="resourceTypeIcon docsIcon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path fill="#4285F4" d="M6 2.5h8l4 4V21.5H6z" />
        <path fill="#AECBFA" d="M14 2.5v4h4z" />
        <path
          fill="none"
          stroke="#fff"
          strokeWidth="1.25"
          d="M8.8 10.3h6.4m-6.4 2.7h6.4m-6.4 2.7h5"
        />
      </svg>
    );
  }
  if (kind === 'pdf') {
    return (
      <svg
        className="resourceTypeIcon pdfIcon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path fill="#E5484D" d="M6 2.5h8l4 4V21.5H6z" />
        <path fill="#FFB4B7" d="M14 2.5v4h4z" />
        <text x="7.15" y="17.2" fill="#fff" fontSize="5.1" fontWeight="800">
          PDF
        </text>
      </svg>
    );
  }
  return <LinkIcon />;
}
export function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M15 4h5v5M12 12l8-8M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}
export function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}
export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}
