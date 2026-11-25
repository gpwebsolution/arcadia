/* =============================================================================
   ARCADIA — NAVEGAÇÃO GLOBAL
   -----------------------------------------------------------------------------
   Este arquivo é carregado DEPOIS de common.js e catalog.js em todas as páginas.
   Ele cria, de forma compartilhada:
     1. o botão hambúrguer do header;
     2. o menu lateral animado (off-canvas) com categorias, favoritos e recentes;
     3. o menu fixo do rodapé (dock), pensado principalmente para celulares;
     4. a barra de progresso de leitura no topo;
     5. pequenos comportamentos de navegação (fechar com ESC, clique no fundo etc.).

   Nada aqui depende de framework: é DOM puro + CSS. O visual fica todo em
   css/style.css, na seção "NAVEGAÇÃO AVANÇADA".
   ============================================================================= */
(function () {
  'use strict';

  const A = window.Arcadia;
  if (!A) return;

  /* Descobre em qual página estamos. A página do jogo tem o elemento #frame. */
  const isGamePage = !!document.getElementById('frame');
  const currentGame = new URLSearchParams(location.search).get('g');

  /* ---------------------------------------------------------------------------
     Cria o botão hambúrguer. Ele é inserido como primeiro item do header para
     ficar sempre acessível. As três barrinhas são animadas via CSS.
     --------------------------------------------------------------------------- */
  const burger = document.createElement('button');
  burger.className = 'burger';
  burger.id = 'menuBtn';
  burger.type = 'button';
  burger.setAttribute('aria-label', 'Abrir menu');
  burger.setAttribute('aria-controls', 'side');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = '<span></span><span></span><span></span>';

  const headerWrap = document.querySelector('.top .wrap');
  if (headerWrap) headerWrap.insertBefore(burger, headerWrap.firstChild);

  /* ---------------------------------------------------------------------------
     Camada escura que fica atrás do menu lateral. Clicar nela fecha o menu.
     --------------------------------------------------------------------------- */
  const overlay = document.createElement('div');
  overlay.className = 'side-ov';
  overlay.id = 'sideOv';
  overlay.hidden = true;

  /* ---------------------------------------------------------------------------
     Menu lateral. O conteúdo de categorias é montado dinamicamente porque
     depende do catálogo (A.cats). Os contadores de favoritos/recentes também
     são atualizados sempre que o menu é aberto.
     --------------------------------------------------------------------------- */
  const side = document.createElement('aside');
  side.className = 'side';
  side.id = 'side';
  side.setAttribute('aria-hidden', 'true');
  side.setAttribute('aria-label', 'Menu principal');
  side.innerHTML = `
    <div class="side-head">
      <a class="side-logo" href="index.html" aria-label="ARCADIA — página inicial"><img src="images/arcadia-logo.png" alt="ARCADIA" width="462" height="320" decoding="async"></a>
      <button class="side-x" type="button" aria-label="Fechar menu">✕</button>
    </div>
    <div class="side-scroll">
      <nav class="side-nav" aria-label="Atalhos">
        <a class="side-link" data-cat="all" href="index.html#all"><i>🏠</i><span>Início</span></a>
        <a class="side-link" data-cat="fav" href="index.html#fav"><i>♥</i><span>Favoritos</span><b data-count="fav">0</b></a>
        <a class="side-link" data-cat="recent" href="index.html#recent"><i>🕘</i><span>Recentes</span><b data-count="recent">0</b></a>
        <button class="side-link" type="button" data-random><i>🎲</i><span>Jogo aleatório</span></button>
      </nav>
      <p class="side-label">Categorias</p>
      <nav class="side-cats" aria-label="Categorias"></nav>
      <div class="side-tip">
        <b>Dica</b>
        Use a busca do topo e o botão <span class="kbd">/</span> para encontrar um jogo rapidinho.
      </div>
    </div>
    <div class="side-foot">
      <span class="side-dot"></span>
      Sem login · Seus recordes ficam salvos neste navegador.
    </div>`;

  /* Dock inferior: cinco atalhos fixos, com ícone + rótulo.
     "Jogos" abre o menu lateral; os outros navegam direto. */
  const dock = document.createElement('nav');
  dock.className = 'dock';
  dock.setAttribute('aria-label', 'Navegação rápida');
  dock.innerHTML = `
    <a class="dock-i" data-dock="home" href="index.html"><i>🏠</i><span>Início</span></a>
    <button class="dock-i" data-dock="menu" type="button"><i>🎮</i><span>Jogos</span></button>
    <button class="dock-i" data-dock="random" type="button"><i>🎲</i><span>Aleatório</span></button>
    <a class="dock-i" data-dock="fav" href="index.html#fav"><i>♥</i><span>Favoritos</span></a>
    <a class="dock-i" data-dock="recent" href="index.html#recent"><i>🕘</i><span>Recentes</span></a>`;

  /* ---------------------------------------------------------------------------
     Barra de progresso do topo. Ela acompanha o quanto a página já foi rolada.
     --------------------------------------------------------------------------- */
  const progress = document.createElement('i');
  progress.className = 'top-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.querySelector('.top')?.appendChild(progress);

  document.body.appendChild(overlay);
  document.body.appendChild(side);
  document.body.appendChild(dock);

  /* Elementos que serão consultados várias vezes. */
  const sideScroll = side.querySelector('.side-scroll');
  const catsNav = side.querySelector('.side-cats');
  const randomBtns = document.querySelectorAll('[data-random], [data-dock="random"]');

  /* ---------------------------------------------------------------------------
     Monta a lista de categorias com contagem de jogos.
     É chamada na abertura do menu, então qualquer mudança no catálogo aparece.
     --------------------------------------------------------------------------- */
  function buildCategories() {
    const entries = Object.entries(A.cats || {});
    catsNav.innerHTML = entries.map(([key, cat]) => {
      const count = (A.catalog || []).filter(g => g.cat === key).length;
      return `<a class="side-cat" data-cat="${key}" href="index.html#${key}">
        <i>${cat.icon}</i><span>${cat.name}</span><b>${count}</b>
      </a>`;
    }).join('');

    /* Atrasa a animação de cada item para criar um efeito cascata. */
    side.querySelectorAll('.side-link, .side-cat').forEach((el, i) => {
      el.style.setProperty('--i', i);
    });
  }

  /* ---------------------------------------------------------------------------
     Atualiza os contadores de favoritos e recentes do menu lateral.
     Também pode ser chamada por outras partes do site (ex.: portal.js).
     --------------------------------------------------------------------------- */
  function refreshCounts() {
    const fav = (A.favs && A.favs().length) || 0;
    const recent = ((A.store && A.store.get('recent', [])) || []).length;
    side.querySelectorAll('[data-count="fav"]').forEach(el => el.textContent = fav);
    side.querySelectorAll('[data-count="recent"]').forEach(el => el.textContent = recent);
  }

  /* ---------------------------------------------------------------------------
     Marca visualmente qual seção/categoria está ativa.
     'cat' pode ser: all, fav, recent ou a chave de uma categoria.
     --------------------------------------------------------------------------- */
  function setActive(cat) {
    side.querySelectorAll('[data-cat]').forEach(el => {
      el.classList.toggle('on', el.dataset.cat === cat);
    });
    const active = cat === 'fav' ? 'fav'
      : cat === 'recent' ? 'recent'
      : cat === 'all' ? 'home'
      : 'menu'; /* categorias e página de jogo destacam "Jogos" no dock */
    document.querySelectorAll('.dock-i').forEach(el => {
      el.classList.toggle('on', el.dataset.dock === active);
    });
  }

  /* ---------------------------------------------------------------------------
     Abre o menu lateral com animação. Trava o scroll da página e ajusta
     atributos de acessibilidade.
     --------------------------------------------------------------------------- */
  function openMenu() {
    buildCategories();
    refreshCounts();
    overlay.hidden = false;
    /* Forçar um reflow garante que a transição comece do estado fechado. */
    void side.offsetWidth;
    side.classList.add('open');
    overlay.classList.add('show');
    document.body.classList.add('nav-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Fechar menu');
    side.setAttribute('aria-hidden', 'false');
    /* Foca o primeiro item depois que a animação começa. */
    setTimeout(() => side.querySelector('.side-link')?.focus({ preventScroll: true }), 60);
  }

  /* Fecha o menu lateral e devolve o foco ao botão hambúrguer. */
  function closeMenu() {
    side.classList.remove('open');
    overlay.classList.remove('show');
    document.body.classList.remove('nav-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menu');
    side.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (!side.classList.contains('open')) overlay.hidden = true; }, 320);
  }

  /* Alterna o menu (usado pelo hambúrguer e pelo item "Jogos" do dock). */
  const toggleMenu = () => side.classList.contains('open') ? closeMenu() : openMenu();

  /* ---------------------------------------------------------------------------
     Navega para um jogo aleatório. Na página de um jogo, evita sortear o mesmo.
     --------------------------------------------------------------------------- */
  function goRandom() {
    const pool = (A.catalog || []).filter(g => g.id !== currentGame);
    const game = A.pick(pool.length ? pool : A.catalog);
    if (game) location.href = 'game.html?g=' + game.id;
  }

  /* ---------------------------------------------------------------------------
     Eventos de abrir/fechar o menu.
     --------------------------------------------------------------------------- */
  burger.addEventListener('click', toggleMenu);
  side.querySelector('.side-x').addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && side.classList.contains('open')) {
      closeMenu();
      burger.focus({ preventScroll: true });
    }
  });

  /* Clique em um item de categoria/atalho do menu:
     - na home, apenas troca o hash (o portal escuta e renderiza);
     - na página do jogo, o link já aponta para index.html#categoria;
     - sempre fecha o menu. */
  side.addEventListener('click', e => {
    const item = e.target.closest('[data-cat]');
    if (!item) return;
    if (!isGamePage) {
      e.preventDefault();
      const target = item.dataset.cat === 'all' ? 'all' : item.dataset.cat;
      if (location.hash.slice(1) === target) {
        /* Mesmo hash não dispara hashchange: avisamos o portal manualmente. */
        document.dispatchEvent(new CustomEvent('arcadia:cat', { detail: target }));
      } else {
        location.hash = target;
      }
    }
    closeMenu();
  });

  /* Itens do dock. */
  document.querySelectorAll('[data-dock="menu"]').forEach(el => el.addEventListener('click', toggleMenu));
  randomBtns.forEach(el => el.addEventListener('click', goRandom));

  /* ---------------------------------------------------------------------------
     Atalhos do dock quando já estamos na home.
     - Início: volta para "todos" e rola para o topo sem recarregar;
     - Favoritos/Recentes: trocam o hash. Se for o mesmo hash, avisamos o portal.
     --------------------------------------------------------------------------- */
  document.querySelectorAll('.dock-i[data-dock="home"], .dock-i[data-dock="fav"], .dock-i[data-dock="recent"]').forEach(link => {
    link.addEventListener('click', e => {
      if (isGamePage) return; /* deixa o navegador ir para index.html#... */
      const target = link.dataset.dock === 'home' ? 'all' : link.dataset.dock;
      e.preventDefault();
      if (location.hash.slice(1) === target) {
        document.dispatchEvent(new CustomEvent('arcadia:cat', { detail: target }));
      } else {
        location.hash = target;
      }
      if (target === 'all') window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ---------------------------------------------------------------------------
     Barra de progresso + sombra do header ao rolar.
     --------------------------------------------------------------------------- */
  const topBar = document.querySelector('.top');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? Math.min(100, Math.max(0, scrollY / max * 100)) : 0;
      progress.style.width = pct + '%';
      if (topBar) topBar.classList.toggle('scrolled', scrollY > 8);
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------------------------------------------------------------------------
     O portal avisa quando a categoria ativa mudou, para o menu acompanhar.
     --------------------------------------------------------------------------- */
  document.addEventListener('arcadia:cat', e => setActive(e.detail || 'all'));

  /* Sincroniza favoritos entre abas do mesmo navegador. */
  addEventListener('storage', e => {
    if (e.key === 'arc:fav' || e.key === 'arc:recent') {
      refreshCounts();
      A.ui?.refresh?.();
    }
  });

  /* API pública mínima, usada por portal.js/player.js. */
  A.ui = { open: openMenu, close: closeMenu, refresh: refreshCounts, setActive };

  /* Estado inicial: marca a aba correta de acordo com a URL/hash. */
  buildCategories();
  refreshCounts();
  if (isGamePage) setActive('menu');
  else setActive(location.hash.slice(1) || 'all');
})();
