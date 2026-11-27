/* =============================================================================
   ARCADIA — ECONOMIA POR JOGO (economy.js)
   -----------------------------------------------------------------------------
   Cada jogo tem a SUA própria carteira de moedas, loja e desafios. Você ganha
   moedas jogando aquele jogo e só pode gastá-las nele. Jogos sem configuração
   aqui continuam usando apenas recordes/ranking.

   Tudo é salvo em localStorage com o prefixo "arc:econ:<id>".
   ============================================================================= */
(function () {
  'use strict';

  const A = window.Arcadia;
  if (!A) return;

  const store = A.store;
  const LOGO = 'images/gpweb.png';
  const PREFIX = 'econ:';

  /* ---------------------------------------------------------------------------
     CATÁLOGO DE TEMAS (cosméticos) — cada compra muda a mesa/cenário do jogo.
     --------------------------------------------------------------------------- */
  const THEMES = [
    { id: 'default', name: 'Clássico', cost: 0, a: '#24356f', b: '#070a1a', accent: '#7c5cff', desc: 'Mesa escura com brilho azul.' },
    { id: 'neon', name: 'Neon', cost: 120, a: '#0e7d74', b: '#04201f', accent: '#22e3c3', desc: 'Verde neon com detalhes ciano.' },
    { id: 'gold', name: 'Ouro', cost: 220, a: '#8a6414', b: '#2a1a05', accent: '#ffd23f', desc: 'Mesa de ouro com brilho quente.' },
    { id: 'ruby', name: 'Rubi', cost: 320, a: '#8c1230', b: '#2a050d', accent: '#ff4d8d', desc: 'Vermelho profundo de cassino.' }
  ];

  /* ---------------------------------------------------------------------------
     JOGOS COM ECONOMIA PRÓPRIA
     A maioria do catálogo tem carteira própria. Cada jogo recebe uma moeda
     temática (nome, ícone e cor) para reforçar a identidade — nada de uma única
     moeda global genérica.
     --------------------------------------------------------------------------- */
  const ENABLED = new Set((A.catalog || []).map(game => game.id));

  const CURRENCY = {
    /* cartas & sorte */
    blackjack: { name: 'Fichas de 21', icon: '🂡', accent: '#ff4d6d' },
    war: { name: 'Medalhas de Guerra', icon: '🎖️', accent: '#ffb020' },
    hilo: { name: 'Fichas Hi-Lo', icon: '🔼', accent: '#4c7dff' },
    slots: { name: 'Fichas do Cassino', icon: '🎰', accent: '#ffd23f' },
    pig: { name: 'Bolotas', icon: '🌰', accent: '#ff9f43' },
    coinflip: { name: 'Moedas da Sorte', icon: '🪙', accent: '#ffd23f' },
    roulette: { name: 'Fichas da Roleta', icon: '🎡', accent: '#ff4d6d' },
    dados: { name: 'Dados de Ouro', icon: '🎲', accent: '#ffd23f' },
    solitaire: { name: 'Moedas de Paciência', icon: '🃏', accent: '#3ddc84' },
    /* tabuleiro */
    chess: { name: 'Coronéis', icon: '♞', accent: '#c9a227' },
    tictactoe: { name: 'Cruzes', icon: '⭕', accent: '#22e3c3' },
    connect4: { name: 'Discos', icon: '🔴', accent: '#ff4d6d' },
    reversi: { name: 'Pedras', icon: '⚫', accent: '#8fa3c8' },
    mastermind: { name: 'Pinos', icon: '🔐', accent: '#b05cff' },
    rps: { name: 'Emblemas', icon: '✂️', accent: '#ff9f43' },
    battleship: { name: 'Âncoras', icon: '⚓', accent: '#4c7dff' },
    mancala: { name: 'Sementes', icon: '🥜', accent: '#d9a520' },
    /* puzzle */
    '2048': { name: 'Cubos', icon: '🔢', accent: '#ffb020' },
    minesweeper: { name: 'Bandeiras', icon: '🚩', accent: '#ff4d6d' },
    memory: { name: 'Pares', icon: '🃏', accent: '#b05cff' },
    slide15: { name: 'Peças', icon: '🔲', accent: '#4c7dff' },
    lights: { name: 'Lâmpadas', icon: '💡', accent: '#ffd23f' },
    flood: { name: 'Gotas', icon: '🌊', accent: '#22b8ff' },
    hanoi: { name: 'Discos de Hanói', icon: '🗼', accent: '#ff9f43' },
    pegs: { name: 'Pinos', icon: '📍', accent: '#ff4d6d' },
    sudoku: { name: 'Números', icon: '🧮', accent: '#3ddc84' },
    match3: { name: 'Doces', icon: '🍬', accent: '#ff4d8d' },
    colorsort: { name: 'Frascos', icon: '🧪', accent: '#22e3c3' },
    sokoban: { name: 'Caixas', icon: '📦', accent: '#d9a520' },
    wordsearch: { name: 'Letras', icon: '🔎', accent: '#4c7dff' }
  };

  const CATEGORY_CURRENCY = {
    cartas: ['Fichas', '🪙'], tabuleiro: ['Moedas de mesa', '🪙'], puzzle: ['Gemas', '💎'],
    arcade: ['Moedas', '🪙'], mente: ['Moedas', '🪙'], reflexo: ['Moedas', '🪙'], esportes: ['Moedas', '🪙']
  };

  const CHALLENGES = [
    { id: 'play3', title: 'Aquecimento', desc: 'Jogue 3 partidas', metric: 'plays', target: 3, reward: 50, icon: '🎮' },
    { id: 'play10', title: 'Dedicado', desc: 'Jogue 10 partidas', metric: 'plays', target: 10, reward: 120, icon: '🔥' },
    { id: 'earn400', title: 'Colecionador', desc: 'Ganhe 400 moedas neste jogo', metric: 'earned', target: 400, reward: 180, icon: '💎' }
  ];

  /* Melhorias compradas só com as moedas do próprio jogo (100% grátis). */
  const UPGRADES = [
    { id: 'gain10', name: 'Renda +10%', icon: '📈', cost: 180, mult: .10, desc: 'Aumenta em 10% as moedas ganhas neste jogo.' },
    { id: 'record12', name: 'Bônus de recorde', icon: '🏅', cost: 260, record: 12, desc: '+12 moedas extras sempre que você bater um recorde.' },
    { id: 'luck6', name: 'Trevo do jogo', icon: '🍀', cost: 340, flat: 6, desc: '+6 moedas em toda partida concluída.' },
    { id: 'gain25', name: 'Renda +25%', icon: '🚀', cost: 520, mult: .25, requires: 'gain10', desc: 'Aumenta em 25% as moedas ganhas neste jogo.' }
  ];

  const lastGains = {};
  const meta = id => (A.catalog || []).find(game => game.id === id) || { id, name: id, icon: '🎮', cat: 'arcade' };

  function currency(id) {
    const custom = CURRENCY[id];
    if (custom) return custom;
    const m = meta(id);
    const [base, icon] = CATEGORY_CURRENCY[m.cat] || ['Moedas', '🪙'];
    return {
      name: base + ' de ' + m.name,
      icon: m.icon || icon,
      accent: 'hsl(' + (A.hue ? A.hue(id) : 260) + ' 85% 62%)'
    };
  }

  function currencyName(id) { return currency(id).name; }
  function currencyIcon(id) { return currency(id).icon; }
  function isEnabled(id) { return ENABLED.has(id); }

  function read(id) {
    const saved = store.get(PREFIX + id, null);
    const base = { coins: 0, earned: 0, plays: 0, best: null, owned: ['default'], theme: 'default', claims: [], upgrades: [] };
    if (!saved || typeof saved !== 'object') return base;
    return Object.assign(base, saved, {
      owned: Array.isArray(saved.owned) && saved.owned.length ? saved.owned : ['default'],
      claims: Array.isArray(saved.claims) ? saved.claims : [],
      upgrades: Array.isArray(saved.upgrades) ? saved.upgrades : []
    });
  }

  function upgradeBonus(id) {
    const owned = new Set(read(id).upgrades);
    return UPGRADES.reduce((total, upgrade) => {
      if (!owned.has(upgrade.id)) return total;
      if (upgrade.mult) total.mult += upgrade.mult;
      if (upgrade.flat) total.flat += upgrade.flat;
      if (upgrade.record) total.record += upgrade.record;
      return total;
    }, { mult: 0, flat: 0, record: 0 });
  }

  function write(id, state) { store.set(PREFIX + id, state); }

  function balance(id) { return isEnabled(id) ? read(id).coins : 0; }

  function themesFor(id) {
    if (id === 'solitaire' && Array.isArray(A.cardDecks) && A.cardDecks.length) {
      return A.cardDecks.map(deck => ({
        id: deck.id, name: deck.name, cost: deck.cost, accent: '#ffd23f',
        desc: 'Baralho temático para a Paciência.', deck
      }));
    }
    return THEMES;
  }

  function ownedThemes(id) {
    if (id === 'solitaire') {
      const list = store.get('sol:decks', ['classic']);
      return Array.isArray(list) ? list : ['classic'];
    }
    return read(id).owned;
  }

  function currentThemeId(id) {
    if (id === 'solitaire') return store.get('sol:deck', 'classic');
    return read(id).theme || 'default';
  }

  function currentTheme(id) {
    const list = themesFor(id);
    return list.find(theme => theme.id === currentThemeId(id)) || list[0];
  }

  /* ---------------------------------------------------------------------------
     MENSAGENS
     --------------------------------------------------------------------------- */
  function flash(message, ok) {
    if (!document.body) return;
    const el = document.createElement('div');
    el.className = 'pw-msg' + (ok ? '' : ' bad');
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  /* ---------------------------------------------------------------------------
     GANHAR / GASTAR
     --------------------------------------------------------------------------- */
  function earn(id, amount, reason) {
    if (!isEnabled(id)) return 0;
    const gain = Math.max(0, Math.round(Number(amount) || 0));
    if (!gain) return 0;
    const state = read(id);
    state.coins += gain;
    state.earned += gain;
    write(id, state);
    lastGains[id] = (lastGains[id] || 0) + gain;
    refresh(id);
    if (reason !== 'silent') flash('+' + gain + ' ' + currencyName(id), true);
    return gain;
  }

  function spend(id, amount) {
    const cost = Math.max(0, Math.round(Number(amount) || 0));
    const state = read(id);
    if (state.coins < cost) return false;
    state.coins -= cost;
    write(id, state);
    refresh(id);
    return true;
  }

  function begin(id) {
    if (!isEnabled(id)) return;
    const state = read(id);
    state.plays += 1;
    write(id, state);
    lastGains[id] = 0;
    refresh(id);
  }

  function award(id, info) {
    if (!isEnabled(id)) return 0;
    const state = read(id);
    const score = Math.max(0, Number(info && info.score) || 0);
    const newBest = !!(info && info.newBest);
    const mode = info && info.mode;
    let coins = 6;
    if (newBest) coins += 14;
    if (mode === 'story') coins += 4;
    else if (mode === 'championship') coins += 8;
    if (!(A.lowGames && A.lowGames.has(id))) coins += Math.min(70, Math.round(Math.sqrt(score) * 1.6));
    else if (newBest) coins += 20;
    const bonus = upgradeBonus(id);
    coins = Math.round(coins * (1 + bonus.mult)) + bonus.flat + (newBest ? bonus.record : 0);
    coins = Math.max(3, Math.min(180, coins));
    state.coins += coins;
    state.earned += coins;
    if (A.lowGames && A.lowGames.has(id)) {
      state.best = state.best == null ? score : Math.min(state.best, score);
    } else {
      state.best = Math.max(state.best || 0, score);
    }
    write(id, state);
    lastGains[id] = coins;
    refresh(id);
    flash('+' + coins + ' ' + currencyName(id) + ' por jogar', true);
    return coins;
  }

  function lastGain(id) { return Number(lastGains[id]) || 0; }

  /* ---------------------------------------------------------------------------
     LOJA / DESAFIOS
     --------------------------------------------------------------------------- */
  function buyTheme(id, themeId) {
    const list = themesFor(id);
    const theme = list.find(entry => entry.id === themeId);
    if (!theme) return { ok: false, msg: 'Tema inválido.' };

    const owned = ownedThemes(id);
    if (owned.includes(themeId)) {
      selectTheme(id, themeId);
      return { ok: true, msg: theme.name + ' selecionado!' };
    }
    if (!spend(id, theme.cost)) return { ok: false, msg: 'Moedas insuficientes.' };

    if (id === 'solitaire') {
      const decks = ownedThemes(id);
      store.set('sol:decks', decks.concat(themeId));
      store.set('sol:deck', themeId);
    } else {
      const state = read(id);
      state.owned = state.owned.concat(themeId);
      state.theme = themeId;
      write(id, state);
    }
    A.sfx && A.sfx('win');
    applyTheme(id);
    refresh(id);
    return { ok: true, msg: theme.name + ' desbloqueado!' };
  }

  function selectTheme(id, themeId) {
    if (id === 'solitaire') store.set('sol:deck', themeId);
    else {
      const state = read(id);
      state.theme = themeId;
      write(id, state);
    }
    applyTheme(id);
    refresh(id);
  }

  function buyUpgrade(id, upgradeId) {
    const upgrade = UPGRADES.find(entry => entry.id === upgradeId);
    if (!upgrade) return { ok: false, msg: 'Melhoria inválida.' };
    const state = read(id);
    if (state.upgrades.includes(upgradeId)) return { ok: false, msg: 'Melhoria já comprada.' };
    if (upgrade.requires && !state.upgrades.includes(upgrade.requires)) {
      return { ok: false, msg: 'Compre a melhoria anterior primeiro.' };
    }
    if (!spend(id, upgrade.cost)) return { ok: false, msg: 'Moedas insuficientes.' };
    const fresh = read(id);
    fresh.upgrades = fresh.upgrades.concat(upgradeId);
    write(id, fresh);
    A.sfx && A.sfx('win');
    refresh(id);
    return { ok: true, msg: upgrade.name + ' desbloqueada!' };
  }

  function claim(id, challengeId) {
    const challenge = CHALLENGES.find(entry => entry.id === challengeId);
    if (!challenge) return { ok: false, msg: 'Desafio inválido.' };
    const state = read(id);
    if (state.claims.includes(challengeId)) return { ok: false, msg: 'Recompensa já resgatada.' };
    const value = Number(state[challenge.metric]) || 0;
    if (value < challenge.target) return { ok: false, msg: 'Ainda falta progresso.' };
    state.claims = state.claims.concat(challengeId);
    state.coins += challenge.reward;
    state.earned += challenge.reward;
    write(id, state);
    A.sfx && A.sfx('win');
    refresh(id);
    return { ok: true, msg: 'Recompensa resgatada!' };
  }

  /* ---------------------------------------------------------------------------
     APARÊNCIA / CENÁRIO
     --------------------------------------------------------------------------- */
  function applyTheme(id) {
    const theme = currentTheme(id);
    const root = document.documentElement;
    if (theme && theme.a) {
      root.style.setProperty('--scene-a', theme.a);
      root.style.setProperty('--scene-b', theme.b);
      root.style.setProperty('--scene-accent', theme.accent);
    }
    if (id === 'solitaire' && theme && theme.deck) store.set('sol:deck', theme.id);
  }

  /* ---------------------------------------------------------------------------
     INTERFACE: pílula no header, modal da loja e desafios
     --------------------------------------------------------------------------- */
  let modal = null;
  let modalGame = null;
  let modalTab = 'shop';

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'pw-wrap';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="pw-card" role="dialog" aria-modal="true" aria-labelledby="econTitle">' +
        '<div class="pw-head">' +
          '<div class="pw-brand"><span class="pw-emblem" data-econ-emblem>🎮</span><div>' +
            '<b id="econTitle" data-econ-title>Loja do jogo</b><small data-econ-sub>Moedas exclusivas deste jogo</small></div></div>' +
          '<div class="pw-wallet"><span data-econ-cur>🪙</span> <b data-econ-wallet>0</b></div>' +
          '<button class="pw-x" type="button" aria-label="Fechar">✕</button>' +
        '</div>' +
        '<div class="pw-tabs" role="tablist">' +
          '<button type="button" data-etab="shop" class="on">🛒 Loja</button>' +
          '<button type="button" data-etab="quests">🏆 Desafios</button>' +
        '</div>' +
        '<div class="pw-body" data-econ-body></div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.querySelector('.pw-x').onclick = close;
    modal.querySelectorAll('[data-etab]').forEach(button => {
      button.onclick = () => { modalTab = button.dataset.etab; render(); };
    });
    return modal;
  }

  function open(id, tab) {
    if (!isEnabled(id)) return;
    modalGame = id;
    modalTab = tab === 'quests' ? 'quests' : 'shop';
    ensureModal();
    modal.hidden = false;
    document.body.classList.add('pw-open');
    applyTheme(id);
    render();
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('pw-open');
  }

  function render() {
    if (!modal || modal.hidden || !modalGame) return;
    const id = modalGame;
    const m = meta(id);
    const state = read(id);
    const themes = themesFor(id);
    const owned = ownedThemes(id);
    const selected = currentThemeId(id);

    const cur = currency(id);
    modal.style.setProperty('--econ-accent', cur.accent);
    modal.querySelector('[data-econ-emblem]').textContent = m.icon;
    modal.querySelector('[data-econ-title]').textContent = m.name;
    modal.querySelector('[data-econ-sub]').textContent = cur.name + ' · exclusivas deste jogo';
    modal.querySelector('[data-econ-cur]').textContent = cur.icon;
    modal.querySelectorAll('[data-econ-wallet]').forEach(el => { el.textContent = state.coins; });
    modal.querySelectorAll('[data-etab]').forEach(button => button.classList.toggle('on', button.dataset.etab === modalTab));

    const body = modal.querySelector('[data-econ-body]');
    if (modalTab === 'shop') {
      const upgradeHTML = UPGRADES.map(upgrade => {
        const isOwned = state.upgrades.includes(upgrade.id);
        const locked = upgrade.requires && !state.upgrades.includes(upgrade.requires);
        const requirement = locked ? ' Requer ' + (UPGRADES.find(entry => entry.id === upgrade.requires) || {}).name + '.' : '';
        const action = isOwned
          ? '<button class="pw-use" type="button" disabled>Ativa</button>'
          : '<button class="pw-buy" type="button" data-upgrade="' + upgrade.id + '"' + (locked ? ' disabled' : '') + '>' + upgrade.cost + ' ' + cur.icon + '</button>';
        return '<div class="pw-item pw-upg' + (isOwned ? ' pw-item-on' : '') + '">' +
          '<span class="pw-item-ico">' + upgrade.icon + '</span>' +
          '<div class="pw-item-copy"><b>' + upgrade.name + (isOwned ? ' <em>ATIVA</em>' : '') + '</b>' +
          '<small>' + upgrade.desc + requirement + '</small></div>' +
          '<div class="pw-item-side">' + action + '</div></div>';
      }).join('');
      const themeHTML = themes.map(theme => {
        const isOwned = owned.includes(theme.id);
        const isOn = selected === theme.id;
        const mini = theme.deck
          ? '<span class="deck-mini" style="--face:' + theme.deck.face + ';--back:' + theme.deck.back + '"><i></i></span>'
          : '<span class="econ-swatch" style="--a:' + theme.a + ';--b:' + theme.b + ';--c:' + theme.accent + '"></span>';
        const action = isOwned
          ? '<button class="pw-use" type="button" data-use="' + theme.id + '"' + (isOn ? ' disabled' : '') + '>' + (isOn ? 'Em uso' : 'Usar') + '</button>'
          : '<button class="pw-buy" type="button" data-buy="' + theme.id + '">' + theme.cost + ' ' + cur.icon + '</button>';
        return '<div class="pw-item' + (isOn ? ' pw-item-on' : '') + '">' +
          '<span class="pw-item-ico">' + mini + '</span>' +
          '<div class="pw-item-copy"><b>' + theme.name + (isOn ? ' <em>ATIVO</em>' : '') + '</b>' +
          '<small>' + (theme.desc || 'Tema visual do jogo.') + '</small></div>' +
          '<div class="pw-item-side">' + action + '</div></div>';
      }).join('');
      body.innerHTML = '<div class="pw-sub">Melhorias permanentes</div>' + upgradeHTML +
        '<div class="pw-sub">Temas e baralhos</div>' + themeHTML;
      body.querySelectorAll('[data-upgrade]').forEach(button => {
        button.onclick = () => {
          const result = buyUpgrade(id, button.dataset.upgrade);
          flash(result.msg, result.ok);
          render();
        };
      });
      body.querySelectorAll('[data-buy]').forEach(button => {
        button.onclick = () => {
          const result = buyTheme(id, button.dataset.buy);
          flash(result.msg, result.ok);
          if (result.ok) applyTheme(id);
          render();
        };
      });
      body.querySelectorAll('[data-use]').forEach(button => {
        button.onclick = () => { selectTheme(id, button.dataset.use); render(); };
      });
    } else {
      body.innerHTML = CHALLENGES.map(challenge => {
        const value = Math.min(challenge.target, Number(state[challenge.metric]) || 0);
        const percent = Math.round(value / challenge.target * 100);
        const claimed = state.claims.includes(challenge.id);
        const done = value >= challenge.target;
        return '<div class="pw-quest' + (claimed ? ' done' : '') + '">' +
          '<span class="pw-q-ico">' + challenge.icon + '</span>' +
          '<div class="pw-q-copy"><b>' + challenge.title + '</b>' +
          '<small>' + challenge.desc + '</small>' +
          '<span class="pw-q-bar"><i style="width:' + percent + '%"></i></span>' +
          '<em>' + value + '/' + challenge.target + ' · recompensa ' + challenge.reward + ' ' + currencyIcon(id) + '</em></div>' +
          (claimed
            ? '<button class="pw-claim" type="button" disabled>✓</button>'
            : '<button class="pw-claim" type="button" data-claim="' + challenge.id + '"' + (done ? '' : ' disabled') + '>Resgatar</button>') +
          '</div>';
      }).join('');
      body.querySelectorAll('[data-claim]').forEach(button => {
        button.onclick = () => {
          const result = claim(id, button.dataset.claim);
          flash(result.msg, result.ok);
          render();
        };
      });
    }
  }

  /* ---------------------------------------------------------------------------
     HEADER
     --------------------------------------------------------------------------- */
  function mount(id) {
    if (!isEnabled(id)) return;
    const host = document.querySelector('.hdr-power') || document.querySelector('.top .wrap');
    if (!host || document.getElementById('econPill')) return;
    const m = meta(id);
    const cur = currency(id);
    const pill = document.createElement('button');
    pill.id = 'econPill';
    pill.className = 'econ-pill';
    pill.type = 'button';
    pill.title = cur.name + ' · loja e desafios de ' + m.name;
    pill.style.setProperty('--econ-accent', cur.accent);
    pill.innerHTML = '<span class="econ-ico">' + cur.icon + '</span><b data-econ-pill>0</b>';
    pill.onclick = () => open(id, 'shop');
    host.insertBefore(pill, host.firstChild);
    refresh(id);
  }

  function refresh(id) {
    if (!isEnabled(id)) return;
    const value = read(id).coins;
    const pill = document.querySelector('#econPill [data-econ-pill]');
    if (pill) pill.textContent = value;
    document.querySelectorAll('.pause-wallet b').forEach(el => { el.textContent = value; });
    if (modal && !modal.hidden && modalGame === id) {
      modal.querySelectorAll('[data-econ-wallet]').forEach(el => { el.textContent = value; });
    }
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      event.preventDefault();
      close();
    }
  });

  A.economy = {
    isEnabled,
    balance,
    earn,
    spend,
    begin,
    award,
    buyTheme,
    buyUpgrade,
    selectTheme,
    claim,
    open,
    close,
    mount,
    applyTheme,
    refresh,
    lastGain,
    themes: themesFor,
    ownedThemes,
    currentTheme,
    currency,
    currencyName,
    currencyIcon,
    challenges: CHALLENGES,
    upgrades: UPGRADES,
    logo: LOGO
  };
})();
