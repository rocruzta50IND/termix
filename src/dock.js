'use strict';
const ICON = {
  term: '<path d="M7.5 4.5h10a3.5 3.5 0 0 1 3.5 3.5v8"/><rect x="3" y="8" width="15" height="12" rx="3"/><path d="M7 12.4l2.4 1.9L7 16.2M11.6 16.4h3"/>',
  clear: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.5H15"/>',
  web: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5z"/>',
};
const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;
let last = '';
window.dock.onRender((st) => {
  document.body.classList.toggle('fade', !!st.fade);
  const html = `<button class="${st.mode === 'term' ? 'on' : ''}" data-m="term">${svg('term')}Terminais${st.terms ? `<span class="n ${st.attention ? 'att' : ''}">${st.terms}</span>` : ''}</button>`
    + `<button class="${st.mode === 'web' ? 'on' : ''}" data-m="web">${svg('web')}Web${st.webs ? `<span class="n">${st.webs}</span>` : ''}${st.fresh ? '<i class="nd"></i>' : ''}</button>`;
  const c = st.clear;
  const html2 = html + (c ? '<i class="sep"></i>' + '<button class="clr ' + (c.pulse ? 'pulse ' : '') + (c.busy ? 'busy' : '') + '" data-m="clear" ' + (c.off ? 'disabled' : '') + '>' + svg('clear') + 'Clear</button>'
    + '<button class="rst ' + (c.rst.spin ? 'spin' : '') + '" data-m="restart" ' + (c.rst.off ? 'disabled' : '') + ' title="' + c.rst.tip + '" aria-label="' + c.rst.tip + '">' + svg('refresh') + 'Reiniciar</button>' : '');
  if (html2 !== last) { last = html2; document.getElementById('pill').innerHTML = html2; }
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-m]');
  if (b) window.dock.click(b.dataset.m);
});
