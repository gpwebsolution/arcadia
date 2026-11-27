/* =============================================================================
   ARCADIA — ITENS, PODERES E DESAFIOS (powerups.js)
   -----------------------------------------------------------------------------
   Camada de progressão compartilhada por TODOS os jogos:

     • catálogo de itens (Vida Extra, Vida Infinita, Pontos em Dobro, etc.);
     • bolsa/inventário salvo no navegador;
     • efeitos temporários com contagem regressiva em tempo real;
     • loja para gastar as moedas ganhas nas campanhas;
     • desafios com metas e recompensas;
     • queda de itens durante as partidas.

   O player.js chama A.power.tryRevive(K) quando o jogador perderia a partida:
   com uma Vida Extra na bolsa (ou a Vida Infinita ativa) o jogo reinicia na
   fase atual em vez de acabar. O restante do sistema é usado pela interface
   injetada no header, na home e no menu pré-jogo.
   ============================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------------
     ARQUIVO DESATIVADO.
     A economia global, a bolsa, os poderes de vida infinita e os desafios
     compartilhados foram removidos. Cada jogo agora usa apenas a carteira
     individual de js/economy.js. Mantemos o arquivo apenas para histórico;
     ele não é mais carregado por index.html nem por game.html.
     --------------------------------------------------------------------------- */
  return;

  const A = window.Arcadia;
  if (!A) return;

  const store = A.store;

  /* ---------------------------------------------------------------------------
     CATÁLOGO
     kind:
       timed    -> ativa um efeito com duração (pode estender usando de novo);
       charge   -> proteção automática (consumida só quando você perderia);
       instant  -> efeito imediato ao usar.
     --------------------------------------------------------------------------- */
  const ITEMS = [
    {
      id: 'vida', name: 'Vida Extra', icon: '🛡️', kind: 'charge',
      rarity: 'raro', color: '#8b5cf6', price: 140,
      desc: 'Proteção automática: na próxima derrota você renasce e continua na fase atual.'
    },
    {
      id: 'infinito', name: 'Vida Infinita', icon: '💖', kind: 'timed',
      rarity: 'lendário', color: '#ff4d8d', price: 1200, duration: 15 * 60 * 1000,
      desc: 'Por 15 minutos, toda derrota vira um renascimento automático. O poder supremo.'
    },
    {
      id: 'x2', name: 'Pontos em Dobro', icon: '✨', kind: 'timed',
      rarity: 'épico', color: '#ffd23f', price: 360, duration: 10 * 60 * 1000,
      desc: 'Por 10 minutos, cada ponto ganho nos jogos vale o dobro.'
    },
    {
      id: 'turbo', name: 'Turbo de Pontos', icon: '🚀', kind: 'timed',
      rarity: 'raro', color: '#4c7dff', price: 220, duration: 5 * 60 * 1000,
      desc: 'Por 5 minutos, seus ganhos de pontos aumentam em 50%.'
    },
    {
      id: 'ima', name: 'Ímã de Moedas', icon: '🧲', kind: 'timed',
      rarity: 'raro', color: '#22e3c3', price: 260, duration: 10 * 60 * 1000,
      desc: 'Por 10 minutos, todas as moedas recebidas aumentam em 50%.'
    },
    {
      id: 'sorte', name: 'Trevo da Sorte', icon: '🍀', kind: 'timed',
      rarity: 'épico', color: '#3ddc84', price: 340, duration: 10 * 60 * 1000,
      desc: 'Por 10 minutos, a chance de itens caírem nas partidas fica muito maior.'
    },
    {
      id: 'moedas', name: 'Chuva de Moedas', icon: '🪙', kind: 'instant',
      rarity: 'comum', color: '#ffd23f', price: 200,
      desc: 'Receba 250 moedas na hora para gastar na loja.',
      use: () => { A.wallet.add(250); return { ok: true, msg: '+250 moedas na carteira!' }; }
    },
    {
      id: 'pulo', name: 'Pular Fase', icon: '⏭️', kind: 'instant',
      rarity: 'épico', color: '#ff9f43', price: 480,
      desc: 'Avança uma fase na campanha de história do jogo que estiver aberto.',
      use: ctx => {
        const gameId = (ctx && ctx.gameId) || A.activeGame;
        if (!gameId || !A.storyGames || !A.storyGames.has(gameId)) {
          return { ok: false, msg: 'Abra um jogo de campanha para pular a fase.' };
        }
        const saved = A.story.get(gameId);
        if (saved.level >= 40) return { ok: false, msg: 'Você já está na fase final.' };
        A.story.set(gameId, saved.level + 1, saved.completed);
        document.dispatchEvent(new CustomEvent('arcadia:refresh-hub'));
        return { ok: true, msg: 'Fase ' + (saved.level + 1) + ' liberada!' };
      }
    }
  ];

  const byId = {};
  ITEMS.forEach(item => { byId[item.id] = item; });

  /* ---------------------------------------------------------------------------
     INVENTÁRIO
     --------------------------------------------------------------------------- */
  const INV_KEY = 'inv';

  function inventory() {
    const value = store.get(INV_KEY, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function count(id) {
    return Math.max(0, Math.floor(Number(inventory()[id]) || 0));
  }

  function addItem(id, amount) {
    const item = byId[id];
    if (!item) return 0;
    const bag = inventory();
    const gain = Math.max(1, Math.floor(Number(amount) || 1));
    bag[id] = count(id) + gain;
    store.set(INV_KEY, bag);
    emit();
    return bag[id];
  }

  function removeItem(id, amount) {
    const bag = inventory();
    const left = Math.max(0, count(id) - Math.max(1, Math.floor(Number(amount) || 1)));
    if (left) bag[id] = left; else delete bag[id];
    store.set(INV_KEY, bag);
    emit();
    return left;
  }

  /* ---------------------------------------------------------------------------
     EFEITOS TEMPORÁRIOS
     Guardamos apenas o instante de expiração; o restante é calculado na hora.
     --------------------------------------------------------------------------- */
  const EFF_KEY = 'effects';

  function effects() {
    const value = store.get(EFF_KEY, {});
    const now = Date.now();
    let changed = false;
    if (value && typeof value === 'object') {
      for (const key in value) {
        if (!(Number(value[key]) > now)) { delete value[key]; changed = true; }
      }
      if (changed) store.set(EFF_KEY, value);
      return value;
    }
    return {};
  }

  function setEffects(value) {
    store.set(EFF_KEY, value);
    emit();
  }

  function activeLeft(id) {
    const value = effects()[id];
    return Math.max(0, (Number(value) || 0) - Date.now());
  }

  function activeList() {
    const list = effects();
    return Object.keys(list)
      .map(id => ({ item: byId[id], left: Math.max(0, Number(list[id]) - Date.now()) }))
      .filter(entry => entry.item && entry.left > 0)
      .sort((a, b) => b.left - a.left);
  }

  function scoreMultiplier() {
    if (activeLeft('x2')) return 2;
    if (activeLeft('turbo')) return 1.5;
    return 1;
  }

  function coinMultiplier() {
    return activeLeft('ima') ? 1.5 : 1;
  }

  function luckBonus() {
    return activeLeft('sorte') ? 0.24 : 0;
  }

  /* ---------------------------------------------------------------------------
     ESTATÍSTICAS E DESAFIOS
     O cache em memória evita gravar no localStorage a cada ponto ganho.
     --------------------------------------------------------------------------- */
  const STATS_KEY = 'stats';
  const STAT_DEFAULTS = { games: 0, points: 0, phases: 0, drops: 0, coins: 0, revives: 0 };
  let statsCache = null;
  let statsTimer = 0;

  function stats() {
    if (!statsCache) {
      const saved = store.get(STATS_KEY, {});
      statsCache = Object.assign({}, STAT_DEFAULTS, saved && typeof saved === 'object' ? saved : {});
    }
    return statsCache;
  }

  function saveStats() {
    clearTimeout(statsTimer);
    statsTimer = 0;
    store.set(STATS_KEY, stats());
  }

  function scheduleSave() {
    clearTimeout(statsTimer);
    statsTimer = setTimeout(saveStats, 1400);
  }

  function bump(key, amount, silent) {
    const value = stats();
    const delta = amount == null ? 1 : (Number(amount) || 0);
    value[key] = (Number(value[key]) || 0) + delta;
    if (silent) scheduleSave();
    else { saveStats(); emit(); }
    return value;
  }

  const CHALLENGES = [
    { id: 'games', title: 'Aquecimento', desc: 'Jogue 3 partidas', icon: '🎮', metric: 'games', target: 3, reward: { coins: 120, item: 'turbo' } },
    { id: 'points', title: 'Pontuador', desc: 'Marque 1.000 pontos no total', icon: '⭐', metric: 'points', target: 1000, reward: { coins: 180, item: 'x2' } },
    { id: 'phases', title: 'Explorador', desc: 'Conclua 2 fases de campanha', icon: '🗺️', metric: 'phases', target: 2, reward: { coins: 220, item: 'vida' } },
    { id: 'drops', title: 'Colecionador', desc: 'Encontre 3 itens nas partidas', icon: '🎁', metric: 'drops', target: 3, reward: { coins: 150, item: 'sorte' } },
    { id: 'coins', title: 'Minerador', desc: 'Ganhe 500 moedas', icon: '🪙', metric: 'coins', target: 500, reward: { coins: 200, item: 'ima' } },
    { id: 'revives', title: 'Fênix', desc: 'Renasça 1 vez com um item', icon: '🔥', metric: 'revives', target: 1, reward: { coins: 260, item: 'infinito' } }
  ];

  function claims() {
    const value = store.get('claims', []);
    return Array.isArray(value) ? value : [];
  }

  function claim(id) {
    const challenge = CHALLENGES.find(entry => entry.id === id);
    if (!challenge) return { ok: false, msg: 'Desafio não encontrado.' };
    if (claims().includes(id)) return { ok: false, msg: 'Recompensa já resgatada.' };
    if ((Number(stats()[challenge.metric]) || 0) < challenge.target) {
      return { ok: false, msg: 'Ainda falta progresso neste desafio.' };
    }
    store.set('claims', claims().concat(id));
    if (challenge.reward.coins) A.wallet.add(challenge.reward.coins);
    if (challenge.reward.item) addItem(challenge.reward.item, 1);
    A.sfx('win');
    emit();
    return { ok: true, msg: 'Recompensa resgatada!' };
  }

  /* ---------------------------------------------------------------------------
     ATIVAR / COMPRAR
     --------------------------------------------------------------------------- */
  function activate(id, ctx) {
    const item = byId[id];
    if (!item) return { ok: false, msg: 'Item inválido.' };
    if (item.kind === 'charge') {
      return { ok: false, msg: 'Este item protege você automaticamente.' };
    }
    if (count(id) <= 0) return { ok: false, msg: 'Você não tem este item.' };

    if (item.kind === 'instant') {
      const result = item.use ? item.use(ctx || {}) : { ok: true };
      if (!result || result.ok === false) {
        return { ok: false, msg: (result && result.msg) || 'Não foi possível usar agora.' };
      }
      removeItem(id, 1);
      A.sfx('win');
      return { ok: true, msg: result.msg || item.name + ' usado!' };
    }

    removeItem(id, 1);
    const list = effects();
    const now = Date.now();
    list[id] = Math.max(now, Number(list[id]) || 0) + item.duration;
    setEffects(list);
    A.sfx('win');
    return { ok: true, msg: item.name + ' ativado por ' + timeText(item.duration) + '!' };
  }

  function buy(id) {
    const item = byId[id];
    if (!item) return { ok: false, msg: 'Item inválido.' };
    if (A.wallet.get() < item.price) {
      A.sfx('hit');
      return { ok: false, msg: 'Moedas insuficientes.' };
    }
    A.wallet.spend(item.price);
    addItem(id, 1);
    A.sfx('coin');
    return { ok: true, msg: item.name + ' comprado!' };
  }

  /* ---------------------------------------------------------------------------
     QUEDA DE ITENS
     --------------------------------------------------------------------------- */
  const DROP_TABLE = [
    ['moedas', 22], ['turbo', 16], ['ima', 14], ['sorte', 12],
    ['x2', 12], ['vida', 14], ['infinito', 4]
  ];

  function pickDrop() {
    const total = DROP_TABLE.reduce((sum, entry) => sum + entry[1], 0);
    let roll = Math.random() * total;
    for (const [id, weight] of DROP_TABLE) {
      roll -= weight;
      if (roll <= 0) return id;
    }
    return DROP_TABLE[0][0];
  }

  const dropState = new WeakMap();

  function track(K, gained) {
    if (!(gained > 0)) return;
    bump('points', gained, true);
    if (!K) return;
    const state = dropState.get(K) || { next: 300, total: 0 };
    state.total += gained;
    while (state.total >= state.next) {
      state.next += 300;
      rollDrop('score', K);
    }
    dropState.set(K, state);
  }

  function rollDrop(reason, K) {
    const base = reason === 'phase' ? 0.4 : reason === 'over' ? 0.24 : 0.15;
    if (Math.random() > base + luckBonus()) return null;
    const id = pickDrop();
    addItem(id, 1);
    bump('drops');
    A.sfx('coin');
    toastItem(id);
    if (K && A.fx) A.fx.pop(K.root);
    return id;
  }

  /* ---------------------------------------------------------------------------
     RENASCIMENTO (Vida Extra / Vida Infinita)
     --------------------------------------------------------------------------- */
  let lastRevive = 0;

  function tryRevive(K) {
    const now = Date.now();
    if (now - lastRevive < 650) return false;

    const infiniteLeft = activeLeft('infinito');
    if (infiniteLeft <= 0 && count('vida') <= 0) return false;

    if (infiniteLeft <= 0) removeItem('vida', 1);
    lastRevive = now;
    bump('revives');

    if (K) {
      K.dead = true;
      if (K.stop) K.stop();
    }

    A.sfx('win');
    if (A.fx) A.fx.confetti(120, true);
    showReviveBanner(infiniteLeft > 0, infiniteLeft);

    setTimeout(() => {
      if (K && K.onRevive) K.onRevive();
    }, 1350);

    return true;
  }

  function onGameOver(K) {
    rollDrop('over', K);
    saveStats();
  }

  /* ---------------------------------------------------------------------------
     INTERFACE: pequenos toasts e banners
     --------------------------------------------------------------------------- */
  function toastItem(id) {
    const item = byId[id];
    if (!item || !document.body) return;
    const toast = document.createElement('div');
    toast.className = 'item-toast';
    toast.style.setProperty('--c', item.color);
    toast.innerHTML = '<span class="it-ico">' + item.icon + '</span>' +
      '<span class="it-copy"><small>Item encontrado</small><b>' + item.name + '</b></span>';
    (document.fullscreenElement || document.body).appendChild(toast);
    setTimeout(() => toast.remove(), 3300);
  }

  function showReviveBanner(infinite, left) {
    const banner = document.createElement('div');
    banner.className = 'revive-banner';
    banner.innerHTML = '<div class="rv-ico">💫</div><b>RENASCEU!</b><small>' +
      (infinite ? 'Vida Infinita · ' + timeText(left) : 'Vida Extra consumida') + '</small>';
    (document.fullscreenElement || document.body).appendChild(banner);
    setTimeout(() => banner.remove(), 1700);
  }

  function flash(message, ok) {
    if (!document.body) return;
    const toast = document.createElement('div');
    toast.className = 'pw-msg' + (ok ? '' : ' bad');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1900);
  }

  function timeText(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    return minutes + ':' + String(total % 60).padStart(2, '0');
  }

  /* ---------------------------------------------------------------------------
     HEADER: carteira + bolsa
     --------------------------------------------------------------------------- */
  function mountHeader() {
    const wrap = document.querySelector('.top .wrap');
    if (!wrap || wrap.querySelector('.hdr-power')) return;
    const box = document.createElement('div');
    box.className = 'hdr-power';
    box.innerHTML =
      '<button class="coin-pill" id="walletBtn" type="button" title="Sua carteira de moedas">' +
        '<span>🪙</span><b data-wallet>0</b></button>' +
      '<button class="bag-btn" id="bagBtn" type="button" title="Bolsa, loja e desafios" aria-label="Abrir bolsa">' +
        '<span>🎒</span><i class="bag-dot" hidden></i></button>';
    wrap.appendChild(box);
    box.querySelector('#bagBtn').onclick = () => open('bag');
    box.querySelector('#walletBtn').onclick = () => open('shop');
    refreshHeader();
  }

  function refreshHeader() {
    document.querySelectorAll('.hdr-power [data-wallet]').forEach(el => {
      el.textContent = A.wallet.fmt(A.wallet.get());
    });
    const dot = document.querySelector('.bag-btn .bag-dot');
    if (dot) {
      const current = stats();
      const available = CHALLENGES.some(challenge =>
        !claims().includes(challenge.id) && (Number(current[challenge.metric]) || 0) >= challenge.target
      );
      dot.hidden = !available;
    }
  }

  /* ---------------------------------------------------------------------------
     MODAL (Bolsa / Loja / Desafios)
     --------------------------------------------------------------------------- */
  let modal = null;
  let activeTab = 'bag';

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'pw-wrap';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="pw-card" role="dialog" aria-modal="true" aria-labelledby="pwTitle">' +
        '<div class="pw-head">' +
          '<div class="pw-brand"><span class="pw-emblem">🎒</span><div>' +
            '<b id="pwTitle">Bolsa</b><small id="pwSub">Itens, poderes e desafios</small></div></div>' +
          '<div class="pw-wallet">🪙 <b data-wallet>0</b></div>' +
          '<button class="pw-x" type="button" aria-label="Fechar">✕</button>' +
        '</div>' +
        '<div class="pw-tabs" role="tablist">' +
          '<button type="button" data-tab="bag" class="on">🎒 Bolsa</button>' +
          '<button type="button" data-tab="shop">🛒 Loja</button>' +
          '<button type="button" data-tab="quests">🏆 Desafios</button>' +
        '</div>' +
        '<div class="pw-body" id="pwBody"></div>' +
      '</div>';
    document.body.appendChild(modal);

    modal.querySelector('.pw-x').onclick = close;
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.querySelectorAll('[data-tab]').forEach(button => {
      button.onclick = () => {
        activeTab = button.dataset.tab;
        render();
        A.sfx('click');
      };
    });

    modal.querySelector('#pwBody').addEventListener('click', event => {
      const use = event.target.closest('[data-use]');
      const buyBtn = event.target.closest('[data-buy]');
      const claimBtn = event.target.closest('[data-claim]');
      if (use) {
        const result = activate(use.dataset.use, { gameId: A.activeGame });
        flash(result.msg, result.ok);
        render();
      } else if (buyBtn) {
        const result = buy(buyBtn.dataset.buy);
        flash(result.msg, result.ok);
        render();
      } else if (claimBtn) {
        const result = claim(claimBtn.dataset.claim);
        flash(result.msg, result.ok);
        render();
      }
    });

    return modal;
  }

  function open(tab) {
    ensureModal();
    if (tab) activeTab = tab;
    modal.hidden = false;
    document.body.classList.add('pw-open');
    render();
    A.sfx('click');
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('pw-open');
  }

  function render() {
    if (!modal) return;
    if (modal.hidden) { refreshHeader(); return; }

    modal.querySelectorAll('[data-wallet]').forEach(el => {
      el.textContent = A.wallet.fmt(A.wallet.get());
    });
    modal.querySelectorAll('[data-tab]').forEach(button => {
      button.classList.toggle('on', button.dataset.tab === activeTab);
    });

    const title = modal.querySelector('#pwTitle');
    const sub = modal.querySelector('#pwSub');
    if (title) title.textContent = activeTab === 'bag' ? 'Bolsa de Itens' : activeTab === 'shop' ? 'Loja Arcadia' : 'Desafios';
    if (sub) sub.textContent = activeTab === 'bag'
      ? 'Ative poderes e veja o que está em uso'
      : activeTab === 'shop'
        ? 'Troque moedas por itens poderosos'
        : 'Complete metas e resgate recompensas';

    const body = modal.querySelector('#pwBody');
    if (activeTab === 'bag') body.innerHTML = renderBag();
    else if (activeTab === 'shop') body.innerHTML = renderShop();
    else body.innerHTML = renderQuests();

    refreshHeader();
  }

  function renderBag() {
    const owned = ITEMS.filter(item => count(item.id) > 0);
    const active = activeList();

    let html = '<div class="pw-active">';
    if (active.length) {
      html += active.map(entry =>
        '<span class="pa" style="--c:' + entry.item.color + '">' +
          '<i>' + entry.item.icon + '</i>' + entry.item.name +
          ' <b data-left="' + entry.item.id + '">' + timeText(entry.left) + '</b>' +
          '<span class="pbar"><i data-bar="' + entry.item.id + '" style="width:' +
            Math.min(100, entry.left / entry.item.duration * 100) + '%"></i></span>' +
        '</span>'
      ).join('');
    } else {
      html += '<span class="pa"><i>💤</i>Nenhum poder ativo agora</span>';
    }
    html += '</div>';

    if (!owned.length) {
      return html + '<div class="pw-empty"><b>Sua bolsa está vazia</b>' +
        'Jogue partidas para encontrar itens ou visite a loja para comprar com moedas.</div>';
    }

    return html + '<div class="pw-list">' + owned.map(item => {
      const quantity = count(item.id);
      const left = item.kind === 'timed' ? activeLeft(item.id) : 0;
      const auto = item.kind === 'charge';
      return '<div class="pw-item" style="--c:' + item.color + '">' +
        '<span class="pw-item-ico">' + item.icon + '</span>' +
        '<div class="pw-item-copy"><b>' + item.name +
          '<em>' + item.rarity + '</em></b><small>' + item.desc + '</small>' +
          (left ? '<span class="pw-item-active">Ativo · <span data-left="' + item.id + '">' + timeText(left) + '</span></span>' : '') +
        '</div>' +
        '<div class="pw-item-side"><span class="pw-qty">x' + quantity + '</span>' +
          (auto
            ? '<span class="pw-auto">Automático</span>'
            : '<button class="pw-use" type="button" data-use="' + item.id + '">' + (left ? 'Estender' : 'Usar') + '</button>') +
        '</div></div>';
    }).join('') + '</div>';
  }

  function renderShop() {
    return '<div class="pw-list">' + ITEMS.map(item =>
      '<div class="pw-item" style="--c:' + item.color + '">' +
        '<span class="pw-item-ico">' + item.icon + '</span>' +
        '<div class="pw-item-copy"><b>' + item.name +
          '<em>' + item.rarity + '</em></b><small>' + item.desc + '</small></div>' +
        '<div class="pw-item-side"><span class="pw-price">🪙 ' + item.price + '</span>' +
          '<button class="pw-buy" type="button" data-buy="' + item.id + '">Comprar</button>' +
        '</div></div>'
    ).join('') + '</div>';
  }

  function renderQuests() {
    const current = stats();
    const done = claims();
    return '<div class="pw-list">' + CHALLENGES.map(challenge => {
      const progress = Math.min(challenge.target, Number(current[challenge.metric]) || 0);
      const percent = Math.round(progress / challenge.target * 100);
      const isClaimed = done.includes(challenge.id);
      const canClaim = !isClaimed && progress >= challenge.target;
      const rewardItem = challenge.reward.item ? byId[challenge.reward.item] : null;
      return '<div class="pw-quest' + (isClaimed ? ' done' : '') + '">' +
        '<span class="pw-q-ico">' + challenge.icon + '</span>' +
        '<div class="pw-q-copy"><b>' + challenge.title + '</b><small>' + challenge.desc + '</small>' +
          '<span class="pw-q-bar"><i style="width:' + percent + '%"></i></span>' +
          '<em>' + progress + '/' + challenge.target + ' · recompensa 🪙' + challenge.reward.coins +
            (rewardItem ? ' + ' + rewardItem.icon + ' ' + rewardItem.name : '') + '</em>' +
        '</div>' +
        '<button class="pw-claim" type="button" data-claim="' + challenge.id + '"' +
          (canClaim ? '' : ' disabled') + '>' + (isClaimed ? '✓' : canClaim ? 'Resgatar' : 'Em andamento') + '</button>' +
      '</div>';
    }).join('') + '</div>';
  }

  /* ---------------------------------------------------------------------------
     HOME: faixa de itens/desafios
     --------------------------------------------------------------------------- */
  function mountHomeBand() {
    const chips = document.getElementById('chips');
    if (!chips || document.getElementById('pwBand')) return;
    const band = document.createElement('section');
    band.className = 'pw-band';
    band.id = 'pwBand';
    chips.parentNode.insertBefore(band, chips);
    renderHomeBand(band);
  }

  function renderHomeBand(band) {
    const active = activeList();
    const current = stats();
    const next = CHALLENGES.find(challenge => !claims().includes(challenge.id));
    const progress = next ? Math.min(next.target, Number(current[next.metric]) || 0) : 0;
    const percent = next ? Math.round(progress / next.target * 100) : 0;

    band.innerHTML =
      '<div class="pwb-main">' +
        '<span class="pwb-ico">🎁</span>' +
        '<div class="pwb-copy"><b>Itens e poderes</b><small>' +
          (active.length
            ? active.map(entry => entry.item.icon + ' ' + entry.item.name + ' · ' + timeText(entry.left)).join(' · ')
            : 'Colete itens jogando e use poderes como a Vida Infinita de 15 minutos.') +
        '</small></div>' +
      '</div>' +
      (next
        ? '<div class="pwb-quest"><span>' + next.icon + '</span><div><b>' + next.title + '</b>' +
          '<small>' + progress + '/' + next.target + '</small>' +
          '<span class="pwb-bar"><i style="width:' + percent + '%"></i></span></div></div>'
        : '') +
      '<div class="pwb-actions">' +
        '<button type="button" class="pwb-btn" data-pw-open="bag">🎒 Bolsa</button>' +
        '<button type="button" class="pwb-btn ghost" data-pw-open="shop">🛒 Loja</button>' +
        '<button type="button" class="pwb-btn ghost" data-pw-open="quests">🏆 Desafios</button>' +
      '</div>';

    band.querySelectorAll('[data-pw-open]').forEach(button => {
      button.onclick = () => open(button.dataset.pwOpen);
    });
  }

  /* ---------------------------------------------------------------------------
     PÁGINA DO JOGO: trilha de poderes ativos
     --------------------------------------------------------------------------- */
  function mountGameRail() {
    const hud = document.querySelector('.frame .hud');
    if (!hud || document.getElementById('pwRail')) return;
    const rail = document.createElement('div');
    rail.className = 'pw-rail';
    rail.id = 'pwRail';
    hud.parentNode.insertBefore(rail, hud.nextSibling);
    renderRail(rail);
  }

  function renderRail(rail) {
    const active = activeList();
    const lives = count('vida');
    if (!active.length && !lives) {
      rail.hidden = true;
      rail.innerHTML = '';
      return;
    }
    rail.hidden = false;
    rail.innerHTML = active.map(entry =>
      '<span class="pw-chip" style="--c:' + entry.item.color + '">' +
        '<i>' + entry.item.icon + '</i>' + entry.item.name +
        '<b data-left="' + entry.item.id + '">' + timeText(entry.left) + '</b></span>'
    ).join('') + (lives
      ? '<span class="pw-chip vida" style="--c:#8b5cf6"><i>🛡️</i>Vida Extra<b>x' + lives + '</b></span>'
      : '');
  }

  /* ---------------------------------------------------------------------------
     MENU PRÉ-JOGO: faixa compacta com poderes ativos
     --------------------------------------------------------------------------- */
  function mountHub(root) {
    const hub = root && root.querySelector ? root.querySelector('.box.hub') : null;
    if (!hub) return;
    const anchor = hub.querySelector('.hub-modes');
    if (!anchor || hub.querySelector('.hub-powers')) return;

    const strip = document.createElement('div');
    strip.className = 'hub-powers';
    const active = activeList();
    const lives = count('vida');
    const next = CHALLENGES.find(challenge => !claims().includes(challenge.id));
    const progress = next ? Math.min(next.target, Number(stats()[next.metric]) || 0) : 0;

    strip.innerHTML =
      '<div class="hp-list">' +
        (active.length
          ? active.map(entry => '<span class="hp-chip" style="--c:' + entry.item.color + '">' +
              entry.item.icon + ' ' + entry.item.name +
              ' <b data-left="' + entry.item.id + '">' + timeText(entry.left) + '</b></span>').join('')
          : '<span class="hp-chip dim">💤 Nenhum poder ativo</span>') +
        (lives ? '<span class="hp-chip" style="--c:#8b5cf6">🛡️ Vida Extra <b>x' + lives + '</b></span>' : '') +
        (next ? '<span class="hp-chip dim">' + next.icon + ' ' + next.title + ' ' + progress + '/' + next.target + '</span>' : '') +
      '</div>' +
      '<button type="button" class="hp-btn" data-hub-power>🎒 Abrir bolsa</button>';

    hub.insertBefore(strip, anchor);
    strip.querySelector('[data-hub-power]').onclick = () => open('bag');
  }

  /* ---------------------------------------------------------------------------
     RELÓGIO GLOBAL (contagem regressiva dos efeitos)
     --------------------------------------------------------------------------- */
  function tick() {
    const before = effects();
    let changed = false;
    for (const key in before) {
      if (!(Number(before[key]) > Date.now())) { delete before[key]; changed = true; }
    }
    if (changed) store.set(EFF_KEY, before);

    document.querySelectorAll('[data-left]').forEach(el => {
      const left = activeLeft(el.dataset.left);
      el.textContent = timeText(left);
    });
    document.querySelectorAll('[data-bar]').forEach(el => {
      const item = byId[el.dataset.bar];
      const left = activeLeft(el.dataset.bar);
      el.style.width = (item && item.duration ? Math.min(100, left / item.duration * 100) : 0) + '%';
    });

    refreshHeader();
    const rail = document.getElementById('pwRail');
    if (rail) renderRail(rail);
    const band = document.getElementById('pwBand');
    if (band) renderHomeBand(band);
    if (changed) emit();
  }

  /* ---------------------------------------------------------------------------
     EVENTOS E API PÚBLICA
     --------------------------------------------------------------------------- */
  function emit() {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('arcadia:power'));
    }
  }

  /* Multiplicador de moedas: aplicado em TODAS as entradas da carteira. */
  const baseWalletAdd = A.wallet.add;
  A.wallet.add = function (amount, options) {
    const raw = Math.max(0, Math.floor(Number(amount) || 0));
    const multiplier = coinMultiplier();
    const gain = multiplier > 1 ? Math.round(raw * multiplier) : raw;
    const total = baseWalletAdd.call(A.wallet, gain, options);
    if (gain > 0) bump('coins', gain, true);
    return total;
  };

  A.power = {
    items: ITEMS,
    get: id => byId[id],
    count,
    add: addItem,
    remove: removeItem,
    active: activeLeft,
    activeList,
    effects,
    activate,
    buy,
    claim,
    claims,
    challenges: CHALLENGES,
    stats,
    bump,
    scoreMultiplier,
    coinMultiplier,
    rollDrop,
    track,
    tryRevive,
    onGameOver,
    open,
    close,
    render,
    timeText,
    mountHub,
    refresh: () => {
      refreshHeader();
      const rail = document.getElementById('pwRail');
      if (rail) renderRail(rail);
    }
  };

  document.addEventListener('arcadia:power', () => {
    if (modal && !modal.hidden && activeTab === 'bag') render();
    refreshHeader();
  });

  addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      event.preventDefault();
      close();
    }
  });

  addEventListener('pagehide', saveStats);

  /* Inicialização: o DOM já está pronto porque os scripts ficam no fim do body.
     A carteira/bolsa/loja/desafios globais NÃO são montados: a economia é
     exclusiva de cada jogo (js/economy.js). O sistema de poderes segue ativo
     como mecânica interna (renascimento, multiplicador e drops). */
  effects();
  mountGameRail();
  setInterval(tick, 1000);
})();
