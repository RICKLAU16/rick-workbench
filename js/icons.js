// 统一 SVG 图标库（stroke 风格，24 视窗），全站唯一图标来源
const P = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra}</svg>`;

export const icons = {
  today: P('<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="m9.5 15 1.8 1.8 3.4-3.6"/>'),
  candidates: P('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.8-3.2 2.9-5 5.5-5s4.7 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.6c2.4.2 4 1.9 4.5 4.4"/>'),
  content: P('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5z"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  tools: P('<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.5-.6-.6-2.5z"/>'),
  inbox: P('<path d="M3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/><path d="M12 3v7m0 0 3-3m-3 3L9 7"/>'),
  search: P('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  ai: P('<path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
  settings: P('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  more: P('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
  edit: P('<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m13.5 6.5 3 3"/>'),
  trash: P('<path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M6.5 7l1 13h9l1-13"/>'),
  link: P('<path d="M10 14a4.5 4.5 0 0 0 6.4.4l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4L11.2 6.8"/><path d="M14 10a4.5 4.5 0 0 0-6.4-.4L5 12.2a4.5 4.5 0 0 0 6.4 6.4l1.4-1.4"/>'),
  close: P('<path d="m6 6 12 12M18 6 6 18"/>'),
  back: P('<path d="m14 6-6 6 6 6"/>'),
  menu: P('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  doc: P('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'),
  help: P('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.7-2.5 2-2.5 3.5"/><circle cx="12" cy="17" r=".5" fill="currentColor"/>'),
  export: P('<path d="M12 15V3m0 12-3.5-3.5M12 15l3.5-3.5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'),
  import: P('<path d="M12 3v12m0 0 3.5-3.5M12 15 8.5 11.5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'),
  history: P('<path d="M3.5 12a8.5 8.5 0 1 1 2.5 6"/><path d="M3.5 12H8m-4.5 0V7.5"/><path d="M12 8v4.5l3 1.5"/>'),
  text: P('<path d="M5 6h14M5 12h14M5 18h9"/>'),
  task: P('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12.5 2.3 2.3 4.7-5"/>'),
  warn: P('<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4m0 3v.5"/>'),
  calendar: P('<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
  send: P('<path d="m4 11.5 16-7-5 16-3.5-6.5z"/><path d="m11.5 14 8.5-9.5"/>'),
  key: P('<circle cx="8" cy="14" r="4.5"/><path d="m11.5 10.5 8-8M16 6l2.5 2.5M13.5 8.5 16 11"/>'),
  folder: P('<path d="M3.5 6.5A2.5 2.5 0 0 1 6 4h4l2 2.5h6A2.5 2.5 0 0 1 20.5 9v8a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17z"/>'),
};

export function icon(name) {
  return icons[name] || icons.doc;
}
