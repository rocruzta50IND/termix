'use strict';
/* Módulo Vibe Coding e Mutirão (DEV2-001) — lado da interface.
   Carregado depois do app.js e independente dele: usa só o que o app.js já expõe no escopo global
   (S, save, modal, esc) e se pendura no cabeçalho e na página Configurações por observação do DOM.
   Desligado (padrão), não mostra nada. Desenho: docs/VIBE_MUTIRAO.md. */
(() => {
  const on = () => { try { return !!(S && S.settings && S.settings.vibe && S.settings.vibe.on); } catch { return false; } };

  const SCREENS = {
    vibe: { title: 'Vibe Coding', line: 'Entregue o fluxo desenhado e o .md da estrutura do projeto; o Termix cria um orquestrador e um dev que trabalham sozinhos até o fim, avisando você só quando precisar.' },
    mutirao: { title: 'Mutirão', line: 'O dono do projeto define com o orquestrador a divisão do trabalho; cada sócio recebe uma parte numa branch própria e o contador mostra as entregas até liberar a implementação automática.' },
  };

  function openScreen(k) {
    try {
      const s = SCREENS[k];
      modal({ title: esc(s.title), body: `<p>${esc(s.line)}</p><span class="vibe-wip">Em construção</span>`, buttons: [['Fechar', null, 'pri']] });
    } catch (e) { console.error('vibe: tela', e); }
  }

  /* botões no cabeçalho: o app.js redesenha o #topbar inteiro; reponho os botões a cada redesenho */
  function mountTop() {
    const top = document.getElementById('topbar');
    if (!top) return;
    const cur = top.querySelector('.vibebtns');
    if (!on()) { if (cur) cur.remove(); return; }
    if (cur) return;
    const anchor = top.querySelector('[data-togact]');
    if (!anchor) return;
    const box = document.createElement('div');
    box.className = 'vibebtns';
    box.innerHTML = '<button class="vibebtn" data-vibe-open="vibe" title="Vibe Coding (experimental)"><i></i>Vibe Coding</button><button class="vibebtn mut" data-vibe-open="mutirao" title="Mutirão (experimental)"><i></i>Mutirão</button>';
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-vibe-open]'); if (b) { e.stopPropagation(); openScreen(b.dataset.vibeOpen); } });
    const before = top.querySelector('#updchip') || anchor;
    top.insertBefore(box, before);
  }

  /* chave em Configurações: anexada ao fim da página quando ela é desenhada */
  function mountConf() {
    const page = document.getElementById('page');
    if (!page || !page.querySelector('#rngOp') || page.querySelector('#vibeConf')) return;
    const host = page.querySelector('.page');
    if (!host) return;
    const box = document.createElement('div');
    box.id = 'vibeConf';
    const draw = () => {
      const v = on();
      box.innerHTML = `<h5 style="margin:22px 0 8px">Experimental</h5><div class="card" style="padding:6px 18px"><div class="row"><div class="grow">Vibe Coding e Mutirão (experimental)<small>Mostra no cabeçalho os botões Vibe Coding e Mutirão. Ainda em construção: as telas só explicam a função.</small></div><div class="seg"><button class="${v ? 'sel' : ''}" data-vibe-set="1">Sim</button><button class="${v ? '' : 'sel'}" data-vibe-set="0">Não</button></div></div></div>`;
    };
    draw();
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-vibe-set]');
      if (!b) return;
      e.stopPropagation();
      S.settings.vibe = { on: b.dataset.vibeSet === '1' };
      save(); draw(); mountTop();
    });
    host.appendChild(box);
  }

  function start() {
    try {
      const top = document.getElementById('topbar'), page = document.getElementById('page');
      if (top) new MutationObserver(mountTop).observe(top, { childList: true });
      if (page) new MutationObserver(mountConf).observe(page, { childList: true });
      mountTop(); mountConf();
    } catch (e) { console.error('vibe: início', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
