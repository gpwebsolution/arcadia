/* =============================================================================
   ARCADIA — LÓGICA DA HOME (index.html)
   -----------------------------------------------------------------------------
   Responsabilidades deste arquivo:
     • escolher o "jogo do dia" e montar o banner de destaque;
     • montar os filtros (Todos, Recentes, Favoritos e categorias);
     • renderizar a grade de cards, com busca instantânea;
     • favoritar/desfavoritar jogos;
     • sincronizar a categoria ativa com o hash da URL (ex.: index.html#puzzle),
       o que permite o menu lateral e o dock inferior navegarem direto.
   ============================================================================= */
(function () {
  'use strict';

  const A = Arcadia;
  const $ = id => document.getElementById(id);
  const C = A.catalog;

  /* Estado atual da listagem. 'cat' é o filtro e 'q' é o texto da busca. */
  let cat = 'all';
  let q = '';

  /* Categorias válidas no hash: atalhos especiais + categorias do catálogo. */
  const VALID_CATS = new Set(['all', 'recent', 'fav', ...Object.keys(A.cats)]);

  /* ---------------------------------------------------------------------------
     Lê a categoria a partir do hash da URL. Ex.: "#puzzle" -> "puzzle".
     Um hash inválido cai em "all", sem quebrar a página.
     --------------------------------------------------------------------------- */
  function catFromHash() {
    const value = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    return VALID_CATS.has(value) ? value : 'all';
  }

  /* ---------------------------------------------------------------------------
     Escreve a categoria no hash sem recarregar a página.
     Usamos replaceState para não encher o histórico a cada clique.
     --------------------------------------------------------------------------- */
  function syncHash() {
    const target = cat === 'all' ? '' : '#' + cat;
    try {
      history.replaceState(null, '', location.pathname + location.search + target);
    } catch (error) {
      /* Alguns navegadores bloqueiam replaceState em file://; o site continua
         funcionando normalmente com o hash antigo. */
    }
  }

  /* ---------------------------------------------------------------------------
     JOGO DO DIA
     A escolha é determinística: a mesma data sempre mostra o mesmo jogo.
     Isso dá a sensação de "destaque diário" sem precisar de backend.
     --------------------------------------------------------------------------- */
  const today = new Date();
  const dayIndex = (today.getFullYear() * 400 + today.getMonth() * 31 + today.getDate()) % C.length;
  const pick = C[dayIndex];

  function renderHero() {
    const surprisePool = C.filter(g => g.id !== pick.id);
    const surprise = A.pick(surprisePool.length ? surprisePool : C);
    $('hero').style.setProperty('--h', A.hue(pick.id));
    $('hero').innerHTML = `
      <div>
        <small>🔥 Jogo do dia</small>
        <h1>${pick.name}</h1>
        <p>${pick.desc}</p>
        <div class="hero-tags">
          <span>${A.cats[pick.cat].icon} ${A.cats[pick.cat].name}</span>
          <span>✅ Grátis</span>
          <span>🚫 Sem login</span>
        </div>
        <a class="btn" href="game.html?g=${pick.id}">▶ Jogar agora</a>
        <a class="btn ghost" href="game.html?g=${surprise.id}">🎲 Surpreenda-me</a>
      </div>
      <div class="big">${pick.icon}</div>`;
  }

  /* ---------------------------------------------------------------------------
     CONTINUE SUA HISTÓRIA
     Mostra as campanhas que já têm progresso salvo, com barra de fase e atalho
     direto para o jogo. É o principal gancho de retorno para quem joga no dia
     seguinte. A seção some sozinha quando não há nenhuma campanha iniciada.
     --------------------------------------------------------------------------- */
  function renderResume() {
    const host = $('resume');
    if (!host) return;

    const items = [];
    A.storyGames.forEach(id => {
      const saved = A.store.get('story:' + id, null);
      if (!saved) return;
      const level = Math.max(1, Math.min(40, Number(saved.level) || 1));
      const completed = !!saved.completed;
      if (!completed && level <= 1) return;
      const game = C.find(g => g.id === id);
      if (game) items.push({ game, level, completed, at: Number(saved.at) || 0 });
    });

    items.sort((a, b) => b.at - a.at);
    const top = items.slice(0, 8);

    if (!top.length) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }

    host.hidden = false;
    host.innerHTML = `
      <div class="resume-head">
        <h2>Continue sua história</h2>
        <span>${items.length} campanha${items.length === 1 ? '' : 's'} em andamento</span>
      </div>
      <div class="resume-row">
        ${top.map((item, i) => {
          const pct = item.completed ? 100 : Math.round((item.level - 1) / 40 * 100);
          return `
            <a class="resume-card" style="--h:${A.hue(item.game.id)};--i:${i}" href="game.html?g=${item.game.id}">
              <span class="ico">${item.game.icon}</span>
              <span class="resume-copy">
                <b>${item.game.name}</b>
                <small>${item.completed ? '🏆 Campanha concluída' : 'Fase ' + item.level + ' de 40'}</small>
              </span>
              <span class="resume-progress"><i style="width:${pct}%"></i></span>
              <em>›</em>
            </a>`;
        }).join('')}
      </div>`;
  }

  /* ---------------------------------------------------------------------------
     DEFINIÇÃO DOS FILTROS
     Cada item tem uma chave (usada no hash) e um rótulo com ícone.
     --------------------------------------------------------------------------- */
  const chipDefs = [
    ['all', '🎮 Todos'],
    ['recent', '🕘 Recentes'],
    ['fav', '♥ Favoritos']
  ].concat(Object.entries(A.cats).map(([key, value]) => [key, value.icon + ' ' + value.name]));

  /* Nome bonito para o título da seção, sem depender do ícone do rótulo. */
  function titleFor(key) {
    if (key === 'all') return 'Todos os jogos';
    if (key === 'recent') return 'Jogados recentemente';
    if (key === 'fav') return 'Seus favoritos';
    return (A.cats[key] || {}).name || 'Jogos';
  }

  /* ---------------------------------------------------------------------------
     CONTAGEM de cada filtro, exibida ao lado do nome no chip.
     --------------------------------------------------------------------------- */
  function counts(key) {
    if (key === 'all') return C.length;
    if (key === 'recent') return (A.store.get('recent', []) || []).length;
    if (key === 'fav') return A.favs().length;
    return C.filter(g => g.cat === key).length;
  }

  /* ---------------------------------------------------------------------------
     Monta a barra de chips. O chip ativo recebe a classe .on.
     --------------------------------------------------------------------------- */
  function renderChips() {
    $('chips').innerHTML = chipDefs.map(([key, label]) =>
      `<button class="chip ${key === cat ? 'on' : ''}" data-k="${key}" type="button">
        ${label}<b>${counts(key)}</b>
      </button>`
    ).join('');
  }

  /* ---------------------------------------------------------------------------
     Retorna a lista de jogos que deve aparecer agora, já aplicando:
     categoria + busca por nome/descrição/id.
     --------------------------------------------------------------------------- */
  function currentList() {
    let list = C;

    if (cat === 'recent') {
      list = (A.store.get('recent', []) || [])
        .map(id => C.find(g => g.id === id))
        .filter(Boolean);
    } else if (cat === 'fav') {
      const favs = A.favs();
      list = C.filter(g => favs.includes(g.id));
    } else if (cat !== 'all') {
      list = C.filter(g => g.cat === cat);
    }

    if (q) {
      list = list.filter(g =>
        (g.name + ' ' + g.desc + ' ' + g.id).toLowerCase().includes(q)
      );
    }
    return list;
  }

  /* ---------------------------------------------------------------------------
     Mensagem amigável quando o filtro não tem resultados.
     --------------------------------------------------------------------------- */
  function emptyMessage() {
    if (q) return `Nenhum jogo encontrado para “${q}” 🙈`;
    if (cat === 'fav') return 'Você ainda não favoritou nenhum jogo. Toque no ♥ de um card!';
    if (cat === 'recent') return 'Nada por aqui ainda. Jogue algo e ele aparece nesta lista.';
    return 'Nada por aqui ainda 🙈';
  }

  /* ---------------------------------------------------------------------------
     RENDER PRINCIPAL
     - atualiza título e contador;
     - gera os cards (com --i para animação em cascata);
     - atualiza chips, menu lateral e dock.
     --------------------------------------------------------------------------- */
  function render() {
    const list = currentList();
    const favs = A.favs();

    $('title').textContent = titleFor(cat);
    $('count').textContent = list.length + ' jogo' + (list.length === 1 ? '' : 's');

    $('grid').innerHTML = list.length
      ? list.map((g, i) => `
        <a class="card" style="--h:${A.hue(g.id)};--i:${Math.min(i, 18)}" href="game.html?g=${g.id}">
          <div class="thumb">
            <span class="ico">${g.icon}</span>
            <button class="fav ${favs.includes(g.id) ? 'on' : ''}" data-id="${g.id}"
                    type="button" aria-label="Favoritar ${g.name}" aria-pressed="${favs.includes(g.id)}">♥</button>
          </div>
          <div class="meta"><b>${g.name}</b><small>${A.cats[g.cat].name}</small></div>
        </a>`).join('')
      : `<p class="empty">${emptyMessage()}</p>`;

    renderChips();

    /* Mantém menu lateral e dock em sincronia com o filtro atual. */
    A.ui?.setActive(cat);
    A.ui?.refresh?.();
  }

  /* ---------------------------------------------------------------------------
     EVENTOS
     --------------------------------------------------------------------------- */

  /* Clique nos chips de categoria. */
  $('chips').addEventListener('click', event => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    cat = chip.dataset.k;
    syncHash();
    render();
    A.sfx('click');
  });

  /* Clique no coração de um card: não abre o jogo, apenas favorita. */
  $('grid').addEventListener('click', event => {
    const button = event.target.closest('.fav');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const nowFav = A.toggleFav(button.dataset.id);
    A.fx?.pop(button);
    if (nowFav) A.sfx('coin'); else A.sfx('click');
    render();
  });

  /* Busca instantânea, com um pequeno atraso para não redesenhar a cada tecla. */
  let searchTimer = 0;
  $('q').addEventListener('input', event => {
    clearTimeout(searchTimer);
    const value = event.target.value.trim().toLowerCase();
    searchTimer = setTimeout(() => {
      q = value;
      render();
    }, 70);
  });

  /* Atalhos de teclado:
     - "/" foca a busca;
     - Escape limpa a busca e sai do campo. */
  addEventListener('keydown', event => {
    const input = $('q');
    if (event.key === '/' && document.activeElement !== input) {
      event.preventDefault();
      input.focus();
    }
    if (event.key === 'Escape' && document.activeElement === input) {
      input.value = '';
      q = '';
      input.blur();
      render();
    }
  });

  /* Navegação por hash (menu lateral, dock, botão voltar do navegador). */
  addEventListener('hashchange', () => {
    const next = catFromHash();
    if (next === cat) return;
    cat = next;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* O ui.js avisa quando alguém clica em uma categoria já ativa. */
  document.addEventListener('arcadia:cat', event => {
    const next = VALID_CATS.has(event.detail) ? event.detail : 'all';
    if (next === cat) return;
    cat = next;
    syncHash();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Ao voltar de um jogo pelo histórico (bfcache), o progresso salvo pode ter
     mudado. Recalcula a faixa "Continue sua história" e os cartões recentes. */
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    renderResume();
    render();
  });
  addEventListener('storage', event => {
    if (!event.key || event.key.indexOf('arc:') !== 0) return;
    renderResume();
    render();
  });

  /* ---------------------------------------------------------------------------
     INICIALIZAÇÃO
     --------------------------------------------------------------------------- */
  cat = catFromHash();
  renderHero();
  renderResume();
  render();
})();
