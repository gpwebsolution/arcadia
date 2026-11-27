/* =============================================================================
   ARCADIA — NÚCLEO COMPARTILHADO (common.js)
   -----------------------------------------------------------------------------
   Este arquivo é carregado primeiro em TODAS as páginas. Ele cria o objeto
   global `Arcadia` (atalho `A`) e reúne tudo o que é usado em mais de um lugar:

     • armazenamento local (localStorage) com proteção contra erros;
     • registro de jogos;
     • utilidades matemáticas/aleatórias;
     • efeitos sonoros gerados na hora com WebAudio (sem arquivos .mp3);
     • efeitos visuais: confete, tremor de tela, "pop" e texto flutuante;
     • favoritos e histórico de jogos recentes.

   Importante: nada aqui depende de bibliotecas externas. Tudo é JavaScript puro.
   ============================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------------
     ARMAZENAMENTO LOCAL
     Envolve o localStorage em try/catch porque alguns navegadores (modo privado,
     políticas de privacidade etc.) podem bloquear a API. Todas as chaves ganham
     o prefixo "arc:" para não conflitar com outros sites/páginas.
     --------------------------------------------------------------------------- */
  const store = {
    /* Lê e converte o valor em JSON. Se não existir ou der erro, devolve o padrão. */
    get(key, fallback) {
      try {
        const value = localStorage.getItem('arc:' + key);
        return value === null ? fallback : JSON.parse(value);
      } catch (error) {
        return fallback;
      }
    },

    /* Grava qualquer valor serializável em JSON. */
    set(key, value) {
      try {
        localStorage.setItem('arc:' + key, JSON.stringify(value));
      } catch (error) {
        /* Se o armazenamento estiver cheio/bloqueado, simplesmente ignoramos. */
      }
    }
  };

  /* ---------------------------------------------------------------------------
     OBJETO GLOBAL
     `games` guarda as funções dos jogos registrados.
     `catalog` é preenchido em catalog.js.
     `cats` é preenchido em catalog.js.
     `touch` indica se o dispositivo tem ponteiro grosseiro (dedo), usado para
     exibir controles de toque.
     --------------------------------------------------------------------------- */
  const A = window.Arcadia = {
    SITE: { name: 'ARCADIA' },
    store,
    games: {},
    catalog: [],
    cats: {},
    touch: matchMedia('(pointer:coarse)').matches
  };

  /* Registra um jogo pelo id. O player chama A.games[id](kit) para iniciar. */
  A.register = (id, startFunction) => {
    A.games[id] = startFunction;
  };

  /* ===========================================================================
     UTILIDADES GERAIS
     =========================================================================== */

  /* Inteiro aleatório entre `min` e `max`, inclusive nas duas pontas. */
  A.rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  /* Número decimal aleatório entre `min` e `max`. */
  A.rf = (min, max) => Math.random() * (max - min) + min;

  /* Sorteia um item de um array (não modifica o array original). */
  A.pick = array => array[Math.floor(Math.random() * array.length)];

  /* Embaralha uma cópia do array usando o algoritmo Fisher-Yates. */
  A.shuffle = array => {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  A.rng = seed => {
    let x = (seed >>> 0) || 1;
    return () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  };

  A.seededShuffle = (array, seed) => {
    const copy = array.slice(), random = A.rng(seed);
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  /* Campanha padrão de 40 fases. Mantém o nível atual e centraliza os
     avisos de transição e o encerramento da campanha. */
  A.story = {
    get(id) {
      const saved = store.get('story:' + id, null);
      return {
        level: Math.max(1, Math.min(40, Number(saved && saved.level) || 1)),
        completed: !!(saved && saved.completed)
      };
    },
    set(id, level, completed) {
      store.set('story:' + id, {
        level: Math.max(1, Math.min(40, Number(level) || 1)),
        completed: !!completed,
        at: Date.now()
      });
    },
    reset(id) {
      A.story.set(id, 1, false);
    }
  };

  A.campaign = (K, total = 40) => {
    const saved = K.story ? A.story.get(K.id) : null;
    let level = saved ? Math.min(total, saved.level) : 1;
    let completed = saved ? saved.completed : false;
    const save = () => { if (K.story) A.story.set(K.id, level, completed); };
    const go = (cont, sound) => {
      if (sound) A.sfx('win');
      cont();
    };
    return {
      get level() { return level; },
      get total() { return total; },
      get last() { return level >= total; },
      get tag() { return 'Fase ' + level + '/' + total; },
      advance(subtitle, cont, sound = true) {
        if (level >= total) return false;
        level++;
        save();
        /* Recompensa em moedas do PRÓPRIO jogo. Não existe carteira global. */
        if (A.economy && A.activeGame) A.economy.earn(A.activeGame, 12 + level * 2, 'silent');
        /* Ao concluir uma fase, sempre mostramos a tela de transição: o jogador
           escolhe continuar para a próxima ou voltar ao menu do jogo. */
        if (K.phaseGate) {
          K.paused = true;
          if (sound) A.sfx('win');
          K.phaseGate({
            level: level - 1,
            total,
            next: level,
            subtitle: subtitle || '',
            onNext: () => { K.paused = false; cont(); }
          });
        } else {
          K.banner('FASE ' + level + '/' + total, subtitle || '');
          go(cont, sound);
        }
        return true;
      },
      next(subtitle, sound = true) {
        if (level >= total) return false;
        level++;
        save();
        K.banner('FASE ' + level + '/' + total, subtitle || '');
        if (sound) A.sfx('win');
        return true;
      },
      finish(message, score) {
        completed = true;
        save();
        if (A.economy && A.activeGame) A.economy.earn(A.activeGame, 150, 'silent');
        K.over(message || 'Campanha completa! 🏆', score == null ? K.score : score);
      }
    };
  };

  /* Cria um elemento HTML de forma curta:
     el('div', 'minha-classe', 'conteúdo', elementoPai). */
  A.el = (tag, className, html, parent) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (html != null) element.innerHTML = html;
    if (parent) parent.appendChild(element);
    return element;
  };

  /* Escapa texto digitado pelo jogador antes de entrar em innerHTML.
     Usado pelo nome do ranking para evitar HTML acidental/malicioso. */
  A.esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  /* Gera um matiz (0–359) estável a partir de um id.
     É usado para dar a cada jogo/card uma cor consistente no gradiente. */
  A.hue = id => {
    let hue = 0;
    for (const char of id) hue = (hue * 31 + char.charCodeAt(0)) % 360;
    return hue;
  };

  /* Limita um valor entre mínimo e máximo. */
  A.clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  /* Colisão simples entre dois retângulos {x, y, w, h}. */
  A.hit = (a, b) =>
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;

  /* ===========================================================================
     CONFIGURAÇÕES POR JOGO
     ---------------------------------------------------------------------------
     Cada jogo tem sua própria configuração salva em "arc:cfg:<id>".
     Isso permite, por exemplo, desligar o som só do Caça-Níquel sem silenciar
     o site inteiro. As configurações são lidas pelo player.js e pelos jogos.
     =========================================================================== */

  /* Valores padrão de qualquer jogo. */
  A.defaultGameConfig = {
    sound: true,        /* som específico deste jogo */
    volume: 0.7,        /* 0 a 1 */
    vibrate: false,     /* vibração em celulares compatíveis */
    difficulty: 'normal', /* easy | normal | hard */
    players: 1,         /* 1 = contra a máquina, 2 = dois jogadores locais */
    target: 7,          /* pontos necessários para vencer (Pong) */
    minutes: 2,         /* duração da partida em minutos (Futebol) */
    laps: 3,            /* voltas por corrida (Moto) */
    tournament: false,  /* campeonato de 3 partidas (Futebol) */
    weather: 'day',     /* day | night | rain (Futebol) */
    traffic: 'normal',  /* light | normal | heavy (Moto) */
    touchControls: 'auto' /* auto | always | off */
  };

  /* Multiplicadores usados pelos jogos que têm dificuldade configurável. */
  A.difficultyFactor = difficulty => ({
    easy: 0.75,
    normal: 1,
    hard: 1.35
  }[difficulty] || 1);

  /* Lê a configuração de um jogo, completando com os padrões. */
  A.getGameConfig = id => Object.assign({}, A.defaultGameConfig, store.get('cfg:' + id, {}));

  /* Salva apenas as chaves alteradas e devolve a configuração final. */
  A.setGameConfig = (id, patch) => {
    const config = Object.assign(A.getGameConfig(id), patch || {});
    store.set('cfg:' + id, config);
    if (A.activeGame === id) A.applyActiveConfig();
    return config;
  };

  /* Restaura as configurações padrão do jogo (som, dificuldade etc.). */
  A.resetGameConfig = id => {
    store.set('cfg:' + id, {});
    if (A.activeGame === id) A.applyActiveConfig();
    return A.getGameConfig(id);
  };

  /* Jogo atualmente aberto. O player define isso ao iniciar uma partida. */
  A.activeGame = null;
  A.activeConfig = null;

  /* Copia a configuração do jogo ativo para uma variável em memória.
     Assim o A.sfx não precisa ler o localStorage a cada som. */
  A.applyActiveConfig = () => {
    A.activeConfig = A.activeGame ? A.getGameConfig(A.activeGame) : null;
  };

  /* ===========================================================================
     SOM (WebAudio)
     ---------------------------------------------------------------------------
     Cada som é descrito por [frequência inicial, duração, tipo de onda, frequência final].
     Nenhum arquivo de áudio é necessário. Se o navegador bloquear ou não suportar
     WebAudio, o som simplesmente não toca (sem quebrar o jogo).
     =========================================================================== */
  let audioContext = null;

  const SOUNDS = {
    click: [520, 0.05, 'square'],
    hit: [180, 0.09, 'sawtooth'],
    coin: [880, 0.08, 'triangle', 1320],
    win: [660, 0.25, 'triangle', 990],
    lose: [200, 0.35, 'sawtooth', 70],
    pop: [400, 0.06, 'sine', 700],
    step: [300, 0.03, 'square'],
    /* Presets extras usados pelos jogos de esporte/corrida e efeitos gerais. */
    whistle: [1450, 0.16, 'square', 980],
    goal: [440, 0.42, 'sawtooth', 880],
    crowd: [220, 0.55, 'triangle', 330],
    save: [560, 0.12, 'square', 240],
    kick: [240, 0.08, 'square', 120],
    skid: [820, 0.14, 'sawtooth', 190],
    boost: [260, 0.32, 'sawtooth', 1400],
    nitro: [620, 0.18, 'triangle', 1600],
    crash: [130, 0.34, 'square', 46],
    tick: [720, 0.05, 'square', 620],
    go: [960, 0.28, 'triangle', 1320],
    whoosh: [180, 0.22, 'sine', 640],
    perfect: [1040, 0.16, 'triangle', 1700],
    lap: [780, 0.2, 'triangle', 1180]
  };

  A.sfx = type => {
    /* Mudo geral do site. */
    if (store.get('mute', false)) return;

    /* Mudo/volume específicos do jogo aberto. */
    const gameConfig = A.activeConfig;
    if (gameConfig && gameConfig.sound === false) return;
    const volume = gameConfig && typeof gameConfig.volume === 'number'
      ? Math.max(0, Math.min(1, gameConfig.volume))
      : 1;

    /* Vibração opcional (só quando o jogo pede e o aparelho suporta). */
    if (gameConfig && gameConfig.vibrate && type === 'hit' && navigator.vibrate) {
      try { navigator.vibrate(18); } catch (error) {}
    }

    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const preset = SOUNDS[type] || SOUNDS.click;
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = preset[2];
      oscillator.frequency.setValueAtTime(preset[0], now);
      if (preset[3]) oscillator.frequency.exponentialRampToValueAtTime(preset[3], now + preset[1]);

      gain.gain.setValueAtTime(0.07 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + preset[1]);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(now + preset[1]);
    } catch (error) {
      /* Áudio é opcional: falhas são silenciosas. */
    }
  };

  /* ===========================================================================
     EFEITOS VISUAIS COMPARTILHADOS
     ---------------------------------------------------------------------------
     Confete, tremor, "pop" e texto flutuante. Se o usuário prefere menos
     animações (prefers-reduced-motion), os efeitos são desativados.
     =========================================================================== */
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FX_COLORS = ['#7c5cff', '#00e0b8', '#ff4d8d', '#ffd23f', '#4c7dff', '#3ddc84', '#ff9f43'];
  const fx = A.fx = {};

  let fxCanvas = null;
  let fxContext = null;
  let fxParticles = [];
  let fxFrame = 0;
  let fxDpr = 1;

  /* Ajusta o canvas de efeitos ao tamanho da janela (considerando densidade de pixels). */
  const fxResize = () => {
    fxDpr = Math.min(2, devicePixelRatio || 1);
    fxCanvas.width = innerWidth * fxDpr;
    fxCanvas.height = innerHeight * fxDpr;
    fxCanvas.style.width = innerWidth + 'px';
    fxCanvas.style.height = innerHeight + 'px';
    fxContext.setTransform(fxDpr, 0, 0, fxDpr, 0, 0);
  };

  /* Cria o canvas de efeitos só na primeira vez que for necessário. */
  const fxEnsure = () => {
    if (fxCanvas) return;
    fxCanvas = document.createElement('canvas');
    fxCanvas.className = 'fx-canvas';
    document.body.appendChild(fxCanvas);
    fxContext = fxCanvas.getContext('2d');
    fxResize();
    addEventListener('resize', fxResize);
  };

  /* Loop de animação das partículas de confete. */
  const fxLoop = () => {
    fxContext.clearRect(0, 0, innerWidth, innerHeight);

    for (let i = fxParticles.length - 1; i >= 0; i--) {
      const particle = fxParticles[i];
      particle.vy += particle.g;
      particle.vx *= 0.995;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.r += particle.vr;
      particle.life--;

      if (particle.y > innerHeight + 50 || particle.life <= 0) {
        fxParticles.splice(i, 1);
        continue;
      }

      fxContext.save();
      fxContext.translate(particle.x, particle.y);
      fxContext.rotate(particle.r);
      fxContext.globalAlpha = Math.min(1, particle.life / 28);
      fxContext.fillStyle = particle.c;

      if (particle.shape === 'rect') {
        fxContext.fillRect(-particle.w / 2, -particle.h / 2, particle.w, particle.h);
      } else {
        fxContext.beginPath();
        fxContext.arc(0, 0, particle.w / 2, 0, Math.PI * 2);
        fxContext.fill();
      }
      fxContext.restore();
    }

    if (fxParticles.length) {
      fxFrame = requestAnimationFrame(fxLoop);
    } else {
      fxFrame = 0;
      fxContext.clearRect(0, 0, innerWidth, innerHeight);
    }
  };

  /* Dispara confete. `n` é a quantidade; `burst` faz metade sair do centro. */
  fx.confetti = (n = 160, burst = false) => {
    if (reduceMotion) return;
    fxEnsure();

    for (let i = 0; i < n; i++) {
      const fromCenter = burst && i % 2 === 0;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;

      fxParticles.push(fromCenter
        ? {
            x: innerWidth / 2,
            y: innerHeight * 0.44,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            g: 0.17,
            w: 5 + Math.random() * 7,
            h: 8 + Math.random() * 10,
            r: Math.random() * 6.28,
            vr: (Math.random() - 0.5) * 0.4,
            c: FX_COLORS[i % FX_COLORS.length],
            shape: Math.random() < 0.5 ? 'rect' : 'dot',
            life: 110 + Math.random() * 70
          }
        : {
            x: Math.random() * innerWidth,
            y: -20 - Math.random() * innerHeight * 0.3,
            vx: (Math.random() - 0.5) * 2,
            vy: 2 + Math.random() * 4,
            g: 0.05,
            w: 5 + Math.random() * 7,
            h: 8 + Math.random() * 10,
            r: Math.random() * 6.28,
            vr: (Math.random() - 0.5) * 0.3,
            c: FX_COLORS[i % FX_COLORS.length],
            shape: Math.random() < 0.5 ? 'rect' : 'dot',
            life: 160 + Math.random() * 90
          });
    }

    if (!fxFrame) fxLoop();
  };

  /* Tremor de um elemento (usado ao perder, bater etc.). */
  fx.shake = (element, ms = 380) => {
    if (!element || reduceMotion) return;
    element.classList.remove('fx-shake');
    void element.offsetWidth; /* força o navegador a reiniciar a animação */
    element.classList.add('fx-shake');
    clearTimeout(element._fxShake);
    element._fxShake = setTimeout(() => element.classList.remove('fx-shake'), ms);
  };

  /* Efeito de "pulo" em um elemento (pontos, cartas, células...). */
  fx.pop = element => {
    if (!element || reduceMotion) return;
    element.classList.remove('fx-pop');
    void element.offsetWidth;
    element.classList.add('fx-pop');
    clearTimeout(element._fxPop);
    element._fxPop = setTimeout(() => element.classList.remove('fx-pop'), 320);
  };

  /* Texto flutuante que sobe e desaparece (ex.: "+10"). */
  fx.floatText = (text, x, y, color) => {
    if (reduceMotion) return;
    const element = document.createElement('div');
    element.className = 'fx-float';
    element.textContent = text;
    element.style.left = x + 'px';
    element.style.top = y + 'px';
    if (color) element.style.color = color;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 900);
  };

  /* Flash de tela cheia (gols, colisões, transições de fase). */
  fx.flash = (color, ms) => {
    if (reduceMotion) return;
    const element = document.createElement('div');
    element.className = 'fx-flash';
    element.style.background = color || '#fff';
    document.body.appendChild(element);
    requestAnimationFrame(() => element.classList.add('on'));
    setTimeout(() => {
      element.classList.remove('on');
      setTimeout(() => element.remove(), 320);
    }, ms || 120);
  };

  /* ===========================================================================
     FAVORITOS E RECENTES
     =========================================================================== */

  /* Devolve a lista de ids favoritados. */
  A.favs = () => store.get('fav', []);

  /* Adiciona/remove um favorito e devolve se ele ficou favoritado. */
  A.toggleFav = id => {
    let favorites = A.favs();
    favorites = favorites.includes(id)
      ? favorites.filter(item => item !== id)
      : favorites.concat(id);
    store.set('fav', favorites);
    return favorites.includes(id);
  };

  /* Registra um jogo como "jogado recentemente".
     Mantém no máximo 12 itens, sem repetição, com o mais novo primeiro. */
  A.pushRecent = id => {
    const recent = store.get('recent', [])
      .filter(item => item !== id);
    store.set('recent', [id].concat(recent).slice(0, 12));
  };

  /* Histórico de partidas por jogo, usado pelo menu pré-jogo. */
  A.gameHistory = {
    get(id) {
      const list = store.get('hist:' + id, []);
      return Array.isArray(list) ? list : [];
    },
    push(id, entry) {
      const list = A.gameHistory.get(id);
      list.unshift(entry);
      store.set('hist:' + id, list.slice(0, 10));
    },
    clear(id) {
      store.set('hist:' + id, []);
    }
  };

  /* ===========================================================================
     MOEDAS
     ---------------------------------------------------------------------------
     Não existe carteira global. Cada jogo tem a própria carteira em
     js/economy.js (`arc:econ:<id>`) e só ela pode ser usada na loja daquele jogo.
     =========================================================================== */

  /* ===========================================================================
     JOGADOR E RANKING
     ---------------------------------------------------------------------------
     O jogador escolhe um nome (salvo localmente) e ele aparece no ranking de
     cada jogo. Para o ranking nunca parecer vazio, cada jogo recebe um grupo
     próprio de "rivais" com nomes e pontuações plausíveis. Os rivais são
     gerados uma única vez por jogo e ficam salvos, então o jogador pode subir
     posições de verdade ao longo do tempo.
     =========================================================================== */
  A.player = {
    raw() {
      return String(store.get('playerName', '') || '').trim();
    },
    name() {
      return A.player.raw() || 'Você';
    },
    set(value) {
      const name = String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, 14);
      store.set('playerName', name);
      return name;
    }
  };

  const BOT_NAMES = [
    'Luna', 'Pixel', 'Nina', 'Davi', 'Rafa', 'Bia', 'Kai', 'Zeca', 'Mia', 'Theo',
    'Léo', 'Yuri', 'Nanda', 'Duda', 'Vini', 'Cacá', 'Beto', 'Juju', 'Tati', 'Igor',
    'Neco', 'Pipo', 'Zara', 'Kiko', 'Lila', 'Tuco', 'Bibi', 'Gabi', 'Rui', 'Sami',
    'Naty', 'Dudu', 'Jow', 'Vic', 'Alê', 'Cauã', 'Mari', 'Bru', 'Luan', 'Sol',
    'PixelBR', 'Rafa77', 'Luna_X', 'Kai_99', 'MiaFox', 'DaviPro', 'NinaJr', 'ZecaGamer'
  ];

  const seedFromString = text => {
    let seed = 2166136261;
    for (let i = 0; i < text.length; i++) {
      seed ^= text.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }
    return seed >>> 0 || 1;
  };

  /* Faixas de pontuação usadas para gerar rivais quando o jogador ainda não
     tem um recorde. Jogos com "menor é melhor" também estão aqui. */
  const categoryRanges = {
    arcade: [100, 2000], puzzle: [40, 1200], tabuleiro: [1, 12],
    mente: [5, 200], reflexo: [5, 150], cartas: [5, 500], esportes: [1, 100]
  };

  const botRange = id => {
    if (A.rankRanges && A.rankRanges[id]) return A.rankRanges[id];
    const game = (A.catalog || []).find(item => item.id === id);
    return categoryRanges[game && game.cat] || [10, 500];
  };

  A.rankText = (id, value) => {
    const formatter = (A.rankFormat && A.rankFormat[id]) || (n => String(n));
    return formatter(value);
  };

  A.ranking = {
    bots(id, low, anchor) {
      const key = 'rankBots:' + id;
      const cached = store.get(key, null);
      if (Array.isArray(cached) && cached.length) return cached;

      const seed = seedFromString(id);
      const random = A.rng(seed);
      const names = A.seededShuffle(BOT_NAMES, seed).slice(0, 9);
      const range = botRange(id);
      const factorsHigh = [0.52, 0.68, 0.81, 0.94, 1.06, 1.18, 1.33, 0.75, 1.24];
      const factorsLow = [0.57, 0.69, 0.78, 0.9, 1.02, 1.14, 1.27, 0.84, 1.2];

      const bots = names.map((name, index) => {
        let score;
        if (anchor != null && Number(anchor) > 0) {
          const factor = (low ? factorsLow : factorsHigh)[index] * (0.93 + random() * 0.14);
          score = Math.round(Number(anchor) * factor);
        } else {
          const spread = (index + 0.25 + random() * 0.75) / 10;
          score = Math.round(range[0] + (range[1] - range[0]) * (low ? 1 - spread : spread));
        }
        return { name, score: Math.max(1, score) };
      });

      store.set(key, bots);
      return bots;
    },

    list(id) {
      const entries = A.gameHistory.get(id);
      const low = (A.lowGames && A.lowGames.has(id)) || entries.some(entry => entry.low);
      const best = store.get('best:' + id, null);
      const anchor = best != null ? best : (entries.length ? entries[0].score : null);
      const rows = A.ranking.bots(id, low, anchor)
        .map(bot => ({ name: bot.name, score: bot.score, text: A.rankText(id, bot.score), bot: true }));

      let playerEntry = null;
      if (entries.length) {
        playerEntry = entries.slice().sort((a, b) => low ? a.score - b.score : b.score - a.score)[0];
      } else if (best != null) {
        playerEntry = { score: best, text: A.rankText(id, best), mode: 'quick', at: Date.now() };
      }

      if (playerEntry) {
        rows.push({
          name: A.player.raw() || 'Você',
          score: playerEntry.score,
          text: playerEntry.text || A.rankText(id, playerEntry.score),
          you: true,
          mode: playerEntry.mode,
          at: playerEntry.at
        });
      }

      rows.sort((a, b) => low ? a.score - b.score : b.score - a.score);
      return {
        low,
        best,
        hasName: !!A.player.raw(),
        rows: rows.map((row, index) => Object.assign({ place: index + 1 }, row))
      };
    }
  };
})();
