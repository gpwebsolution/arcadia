/* =============================================================================
   ARCADIA — PÁGINA DO JOGO + KIT DOS JOGOS (player.js)
   -----------------------------------------------------------------------------
   Este arquivo tem duas partes:

   1) A.createKit(...) — uma "caixa de ferramentas" passada para cada jogo.
      Ela cuida de placar, recorde, loop, canvas, teclado, toque, sons e efeitos.
      Todos os arquivos em js/games/ usam esse kit (abreviado como K).

   2) A lógica da própria página game.html:
      lê o ?g=id da URL, carrega o script do jogo sob demanda, monta o HUD,
      mostra as telas de início/fim e as sugestões de outros jogos.
   ============================================================================= */
(function () {
  'use strict';

  const A = Arcadia;
  const $ = id => document.getElementById(id);

  /* Teclas WASD são traduzidas para as setas equivalentes. */
  const CANONICAL_KEYS = {
    KeyA: 'ArrowLeft', KeyD: 'ArrowRight', KeyW: 'ArrowUp', KeyS: 'ArrowDown'
  };

  /* Teclas que não devem rolar a página enquanto o jogo está em foco. */
  const BLOCKED_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

  /* ===========================================================================
     CRIAÇÃO DO KIT
     `options` contém:
       id        -> id do jogo (usado no recorde);
       stage     -> elemento onde o jogo é desenhado;
       padHost   -> elemento onde os botões de toque são montados;
       setScore  -> função que atualiza o placar no HUD;
       setBest   -> função que atualiza o recorde no HUD;
       popScore  -> animação do placar;
       showOver  -> função que mostra a tela de fim de jogo;
       config    -> configuração efetiva desta partida (pode ter overrides);
       story     -> true quando o progresso da campanha deve ser salvo;
       mode      -> quick | story | championship | duo;
       phaseGate -> tela mostrada entre fases no modo História.
     =========================================================================== */
  A.createKit = function (options) {
    const config = options.config || A.getGameConfig(options.id);
    const K = {
      root: options.stage,
      keys: {},                       /* teclas canônicas (setas) pressionadas */
      raw: {},                        /* teclas pelo code original (W, A, S, D...) */
      config,                         /* configurações salvas deste jogo */
      difficulty: config.difficulty,
      players: Number(config.players) || 1,
      score: 0,
      best: A.store.get('best:' + options.id, null),
      low: false,                     /* true = menor pontuação é melhor */
      fmt: n => n,                    /* formatação do placar (pode ser trocada) */
      paused: false,
      dead: false,
      _off: [],                       /* funções para remover listeners */
      _t: [],                         /* timers para limpar no destroy */
      _raf: 0,
      _parts: [],                     /* partículas internas do canvas */
      id: options.id,
      mode: options.mode || 'quick',
      story: !!options.story,
      phaseGate: options.phaseGate || null,
      fx: A.fx,
      sfx: A.sfx
    };

    /* -------------------------------------------------------------------------
       Listeners com limpeza automática. Use K.on(alvo, evento, função).
       ------------------------------------------------------------------------- */
    K.on = (target, eventName, handler, opts) => {
      target.addEventListener(eventName, handler, opts);
      K._off.push(() => target.removeEventListener(eventName, handler, opts));
    };

    /* setTimeout que não dispara se o jogo já terminou. */
    K.after = (fn, ms) => {
      const timer = setTimeout(() => { if (!K.dead) fn(); }, ms);
      K._t.push(timer);
      return timer;
    };

    /* setInterval que respeita pausa e fim de jogo. */
    K.every = (fn, ms) => {
      const timer = setInterval(() => {
        if (!K.dead && !K.paused) fn();
      }, ms);
      K._t.push(timer);
      return timer;
    };

    /* -------------------------------------------------------------------------
       PLACAR E RECORDE
       ------------------------------------------------------------------------- */
    K.setScore = value => {
      K.score = value;
      options.setScore(K.fmt(value));
    };

    K.addScore = value => {
      K.setScore(K.score + value);
      if (value) options.popScore && options.popScore(value);
    };

    /* Atalhos de efeitos visuais. */
    K.shake = ms => A.fx.shake(K.root, ms);
    K.confetti = (n, burst) => A.fx.confetti(n, burst);

    /* Pequena explosão de partículas dentro do canvas (efeito de jogo). */
    K.burst = (x, y, color, n, speed) => {
      n = n || 12;
      speed = speed || 3;
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.35 + Math.random());
        K._parts.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity - 1,
          life: 0.35 + Math.random() * 0.5,
          max: 0.85,
          c: color || A.pick(['#ffd23f', '#ff4d6d', '#00e0b8', '#fff'])
        });
      }
    };

    /* Faixa grande de texto que aparece rapidamente (nível, onda, marco...). */
    K.banner = (title, subtitle) => {
      const banner = A.el('div', 'k-banner',
        `<b>${title}</b>${subtitle ? `<small>${subtitle}</small>` : ''}`, K.root);
      setTimeout(() => banner.classList.add('out'), 1200);
      setTimeout(() => banner.remove(), 1750);
    };

    /* -------------------------------------------------------------------------
       SALVAMENTO DO RECORDE
       Jogos com K.low = true guardam a MENOR pontuação (tempo, tentativas...).
       ------------------------------------------------------------------------- */
    K.setBest = () => options.setBest(K.best == null ? '–' : K.fmt(K.best));

    K.submit = score => {
      const better = K.best == null || (K.low ? score < K.best : score > K.best);
      if (better && score !== 0 || (better && K.low)) {
        K.best = score;
        A.store.set('best:' + options.id, score);
        K.setBest();
        return true;
      }
      return false;
    };

    /* Para o loop e todos os timers/listeners. */
    K.stop = () => {
      cancelAnimationFrame(K._raf);
      K._t.forEach(timer => {
        clearTimeout(timer);
        clearInterval(timer);
      });
    };

    /* -------------------------------------------------------------------------
       FIM DE JOGO
       Mostra a tela final (com recorde, confete etc.) e encerra o jogo.
       `nosave` evita salvar recorde em casos especiais.
       ------------------------------------------------------------------------- */
    K.over = (message, score, nosave) => {
      if (K.dead) return;
      if (score != null) K.setScore(score);

      K.dead = true;
      K.stop();

      const newBest = nosave ? false : K.submit(K.score);
      A.gameHistory.push(options.id, {
        score: K.score,
        text: K.fmt(K.score),
        low: !!K.low,
        mode: options.mode || 'quick',
        message: message || 'Fim de jogo',
        name: A.player ? A.player.name() : 'Você',
        at: Date.now()
      });
      A.sfx(newBest ? 'win' : 'lose');

      if (nosave) {
        setTimeout(() => options.showOver(
          message || 'Fim de jogo', K.fmt(K.score), false, K.fmt(K.best)
        ), 450);
        return;
      }

      setTimeout(() => options.showOver(
        message || 'Fim de jogo', K.fmt(K.score), newBest, K.fmt(K.best)
      ), 450);
    };

    /* Remove tudo que foi criado pelo jogo ao reiniciar/trocar de jogo. */
    K.destroy = () => {
      K.dead = true;
      K.stop();
      K._off.forEach(remove => remove());
      K.root.innerHTML = '';
      options.padHost.innerHTML = '';
    };

    /* -------------------------------------------------------------------------
       LOOP PRINCIPAL
       `fn(dt)` recebe o tempo em segundos desde o último quadro.
       O delta é limitado a 0,05 s para evitar saltos quando a aba volta do fundo.
       ------------------------------------------------------------------------- */
    K.loop = fn => {
      let last = performance.now();

      const frame = now => {
        if (K.dead) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        if (!K.paused) {
          fn(dt);
          K._fxDraw && K._fxDraw(dt);
        }
        K._raf = requestAnimationFrame(frame);
      };

      K._raf = requestAnimationFrame(frame);
    };

    /* -------------------------------------------------------------------------
       TECLADO
       K.onKey(fn) chama fn(código, evento) uma vez por tecla pressionada.
       K.keys[código] fica 1 enquanto a tecla está segurada.
       ------------------------------------------------------------------------- */
    K.onKey = fn => K.on(window, 'keydown', event => {
      const code = CANONICAL_KEYS[event.code] || event.code;
      const tag = (event.target || {}).tagName || '';

      /* Evita que setas/espaço rolem a página, exceto quando digitando. */
      if (BLOCKED_KEYS.has(code) && !/INPUT|TEXTAREA/.test(tag)) {
        event.preventDefault();
      }
      if (!event.repeat) fn(code, event);
    });

    K.on(window, 'keydown', event => {
      K.keys[CANONICAL_KEYS[event.code] || event.code] = 1;
    });

    K.on(window, 'keyup', event => {
      delete K.keys[CANONICAL_KEYS[event.code] || event.code];
    });

    /* Mantém também o código original de cada tecla. Isso permite dois
       jogadores no mesmo teclado (WASD x setas) sem que um bloqueie o outro. */
    K.on(window, 'keydown', event => { K.raw[event.code] = 1; });
    K.on(window, 'keyup', event => { delete K.raw[event.code]; });

    /* Se a janela perde o foco, "solta" todas as teclas. */
    K.on(window, 'blur', () => { K.keys = {}; K.raw = {}; });

    /* Direção atual do teclado: {x: -1|0|1, y: -1|0|1}. */
    K.dir = () => ({
      x: (K.keys.ArrowRight ? 1 : 0) - (K.keys.ArrowLeft ? 1 : 0),
      y: (K.keys.ArrowDown ? 1 : 0) - (K.keys.ArrowUp ? 1 : 0)
    });

    /* -------------------------------------------------------------------------
       CANVAS RESPONSIVO
       Cria um canvas com resolução lógica w×h e o escala para caber na tela,
       sem distorcer e sem passar de 1.6×.
       Também expõe os atalhos de desenho: K.R, K.C e K.T.
       ------------------------------------------------------------------------- */
    K.canvas = (w, h) => {
      const canvas = A.el('canvas', 'cv', null, K.root);
      canvas.width = w;
      canvas.height = h;

      const fit = () => {
        const availableWidth = Math.max(240, K.root.clientWidth - 28);
        const top = K.root.getBoundingClientRect().top;
        const availableHeight = Math.max(260, innerHeight - Math.max(0, top) - 150);
        const scale = Math.min(availableWidth / w, availableHeight / h, 1.6);
        canvas.style.width = Math.floor(w * scale) + 'px';
        canvas.style.height = Math.floor(h * scale) + 'px';
      };

      fit();
      K.on(window, 'resize', fit);

      K.cv = canvas;
      const context = K.g = canvas.getContext('2d');
      K.W = w;
      K.H = h;

      /* Desenha as partículas de K.burst a cada quadro. */
      K._fxDraw = dt => {
        if (!K._parts.length) return;

        for (let i = K._parts.length - 1; i >= 0; i--) {
          const particle = K._parts[i];
          particle.life -= dt;
          if (particle.life <= 0) {
            K._parts.splice(i, 1);
            continue;
          }
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.12;
          particle.vx *= 0.98;
          context.globalAlpha = Math.max(0, particle.life / particle.max);
          context.fillStyle = particle.c;
          context.beginPath();
          context.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
      };

      /* Atalhos de desenho:
         R = retângulo, C = círculo, T = texto. */
      K.R = (x, y, rw, rh, color) => {
        context.fillStyle = color;
        context.fillRect(x, y, rw, rh);
      };

      K.C = (x, y, radius, color) => {
        context.fillStyle = color;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      };

      K.T = (text, x, y, size, color, align) => {
        context.fillStyle = color || '#fff';
        context.font = '700 ' + (size || 20) + 'px Outfit,sans-serif';
        context.textAlign = align || 'center';
        context.textBaseline = 'middle';
        context.fillText(text, x, y);
      };

      /* Faixa xadrez usada como linha de chegada em corridas e plataformas. */
      K.checker = (x, y, w, h, cell = 12, colorA = '#fff', colorB = '#111') => {
        cell = Math.max(4, cell);
        for (let row = 0; row * cell < h; row++) {
          for (let col = 0; col * cell < w; col++) {
            context.fillStyle = (row + col) % 2 ? colorB : colorA;
            context.fillRect(
              x + col * cell,
              y + row * cell,
              Math.min(cell, w - col * cell),
              Math.min(cell, h - row * cell)
            );
          }
        }
      };

      /* Converte a posição do mouse/toque para coordenadas do canvas. */
      K.pos = event => {
        const rect = canvas.getBoundingClientRect();
        const point = event.touches
          ? (event.touches[0] || event.changedTouches[0])
          : event;
        return {
          x: (point.clientX - rect.left) * w / rect.width,
          y: (point.clientY - rect.top) * h / rect.height
        };
      };

      return { c: canvas, g: K.g, w, h };
    };

    /* -------------------------------------------------------------------------
       CONTROLES DE TOQUE
       kind: 'arrows' | 'lr' | 'ud' | 'a'
       É possível combinar, por exemplo: 'lr a'.
       Cada botão simula uma tecla real do teclado.
       ------------------------------------------------------------------------- */
    K.pad = kind => {
      const touchMode = K.config.touchControls || 'auto';
      if (touchMode === 'off') return;
      if (touchMode !== 'always' && !A.touch) return; /* desktop: só se o jogador pedir */

      const wrap = A.el('div', 'pad', null, options.padHost);

      const makeKey = (code, label, parent) => {
        const button = A.el('button', 'pb', label, parent);
        const emit = type => window.dispatchEvent(new KeyboardEvent(type, { code }));

        button.addEventListener('pointerdown', event => {
          event.preventDefault();
          emit('keydown');
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(type =>
          button.addEventListener(type, () => emit('keyup'))
        );
      };

      const group = A.el('div', 'pg', null, wrap);
      const parts = kind.split(' ');

      if (parts.includes('arrows')) {
        makeKey('ArrowLeft', '◀', group);
        makeKey('ArrowUp', '▲', group);
        makeKey('ArrowDown', '▼', group);
        makeKey('ArrowRight', '▶', group);
      }
      if (parts.includes('lr')) {
        makeKey('ArrowLeft', '◀', group);
        makeKey('ArrowRight', '▶', group);
      }
      if (parts.includes('ud')) {
        makeKey('ArrowUp', '▲', group);
        makeKey('ArrowDown', '▼', group);
      }
      if (parts.includes('a')) {
        makeKey('Space', '●', A.el('div', 'pg', null, wrap));
      }
      if (parts.includes('wasd')) {
        const wasdGroup = A.el('div', 'pg', null, wrap);
        makeKey('KeyW', 'W', wasdGroup);
        makeKey('KeyA', 'A', wasdGroup);
        makeKey('KeyS', 'S', wasdGroup);
        makeKey('KeyD', 'D', wasdGroup);
      }
      if (parts.includes('arrows') && parts.includes('wasd')) wrap.classList.add('duo');
    };

    /* -------------------------------------------------------------------------
       GESTOS DE DESLIZAR
       Converte um swipe em uma tecla de seta. Cada jogo decide se usa.
       ------------------------------------------------------------------------- */
    K.swipe = () => {
      let start = null;

      K.on(K.root, 'touchstart', event => {
        start = event.touches[0];
      }, { passive: true });

      K.on(K.root, 'touchend', event => {
        if (!start) return;

        const end = event.changedTouches[0];
        const dx = end.clientX - start.clientX;
        const dy = end.clientY - start.clientY;
        start = null;

        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;

        const code = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
          : (dy > 0 ? 'ArrowDown' : 'ArrowUp');

        window.dispatchEvent(new KeyboardEvent('keydown', { code }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code }));
      }, { passive: true });
    };

    return K;
  };

  /* ===========================================================================
     LÓGICA DA PÁGINA
     =========================================================================== */

  /* Lê o id do jogo na URL (?g=id) e encontra os metadados no catálogo. */
  const gameId = new URLSearchParams(location.search).get('g');
  const meta = A.catalog.find(game => game.id === gameId);

  /* Se o id não existir, volta para a home. */
  if (!meta) {
    location.replace('index.html');
    return;
  }

  /* Título da aba, matiz das cores e textos informativos. */
  document.title = meta.name + ' · ' + A.SITE.name;
  document.documentElement.style.setProperty('--h', A.hue(gameId));

  $('gname').innerHTML = `<span>${meta.icon}</span> ${meta.name}`;
  $('ginfo').textContent = meta.desc;
  $('ghow').textContent = meta.how + '\n\n' + (A.rules[gameId] || '');
  $('gcat').textContent = (A.cats[meta.cat] || {}).name || '';

  /* Atualiza a meta description (bom para compartilhamento/SEO). */
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', meta.desc);

  const overlay = $('ov');
  const stage = $('stage');
  const padHost = $('padhost');
  let kit = null;
  let pausedByUser = false;
  let pauseBadge = null;
  let lastStart = { mode: 'quick' };

  /* Regras detalhadas e recursos de configuração disponíveis neste jogo. */
  const rules = A.rules[gameId] || meta.how;
  const features = A.features[gameId] || {};

  /* ===========================================================================
     ABA DE CONFIGURAÇÕES DO JOGO
     ---------------------------------------------------------------------------
     Som e volume são aplicados na hora. Modo de jogo, dificuldade, duração e
     voltas são lidos quando a partida começa; por isso o botão "Aplicar e
     reiniciar" aparece após qualquer mudança desse tipo.
     =========================================================================== */
  const cfgWrap = $('cfg');
  const cfgBody = $('cfgBody');
  const cfgTitle = $('cfgTitle');
  let cfgNeedsRestart = false;

  const NUMERIC_SETTINGS = ['players', 'target', 'minutes', 'laps'];

  function switchRow(key, title, detail) {
    const checked = A.getGameConfig(gameId)[key] ? 'checked' : '';
    return `
      <label class="set-row">
        <span class="set-copy"><b>${title}</b><small>${detail}</small></span>
        <span class="switch"><input type="checkbox" data-bool="${key}" ${checked}><i></i></span>
      </label>`;
  }

  function segmentedRow(key, title, detail, options) {
    const current = String(A.getGameConfig(gameId)[key]);
    return `
      <div class="set-row col">
        <span class="set-copy"><b>${title}</b><small>${detail}</small></span>
        <div class="seg" data-seg="${key}">
          ${options.map(([value, label]) => `
            <button type="button" class="${String(value) === current ? 'on' : ''}" data-value="${value}">${label}</button>
          `).join('')}
        </div>
      </div>`;
  }

  function renderSettings() {
    const config = A.getGameConfig(gameId);
    cfgTitle.textContent = 'Ajustes · ' + meta.name;

    let html = `
      <div class="set-group">
        <h3>Som e toque</h3>
        ${switchRow('sound', 'Som deste jogo', 'Desliga apenas os efeitos deste jogo; o site continua com som.')}
        <div class="set-row col">
          <span class="set-copy"><b>Volume dos efeitos</b><small>${Math.round(config.volume * 100)}%</small></span>
          <input class="range" type="range" min="0" max="1" step="0.05" value="${config.volume}" data-range="volume" aria-label="Volume dos efeitos">
        </div>
        ${switchRow('vibrate', 'Vibrar ao levar dano', 'Usa a vibração do celular quando o aparelho permite.')}
        ${segmentedRow('touchControls', 'Controles na tela', 'Auto mostra só em celulares e tablets.', [['auto', 'Auto'], ['always', 'Sempre'], ['off', 'Desligado']])}
      </div>`;

    if (features.difficulty || features.players || features.target || features.minutes || features.laps || features.tournament || features.weather || features.traffic) {
      html += `<div class="set-group"><h3>Partida</h3>`;
      if (features.players) {
        html += segmentedRow('players', 'Modo de jogo', 'No modo 2 jogadores, a disputa é local no mesmo aparelho.', [['1', '1 jogador'], ['2', '2 jogadores']]);
      }
      if (features.difficulty) {
        html += segmentedRow('difficulty', 'Dificuldade', 'Muda a velocidade e a esperteza do adversário.', [['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil']]);
      }
      if (features.target) {
        html += segmentedRow('target', 'Meta de pontos', 'Quem chegar primeiro vence a partida.', [['3', '3'], ['5', '5'], ['7', '7'], ['11', '11']]);
      }
      if (features.minutes) {
        html += segmentedRow('minutes', 'Duração', 'Tempo de cada partida de futebol.', [['1', '1 min'], ['2', '2 min'], ['3', '3 min']]);
      }
      if (features.laps) {
        html += segmentedRow('laps', 'Voltas', 'Quantas voltas completar em cada circuito.', [['3', '3'], ['5', '5'], ['8', '8']]);
      }
      if (features.weather) {
        html += segmentedRow('weather', 'Clima do estádio', 'Muda a iluminação e o visual da partida.', [['day', 'Dia'], ['night', 'Noite'], ['rain', 'Chuva']]);
      }
      if (features.traffic) {
        html += segmentedRow('traffic', 'Trânsito', 'Densidade de carros e caminhões na rodovia.', [['light', 'Leve'], ['normal', 'Normal'], ['heavy', 'Pesado']]);
      }
      if (features.tournament) {
        html += switchRow('tournament', 'Modo campeonato', 'Três partidas com adversários cada vez mais fortes.');
      }
      html += `</div>`;
    }

    const best = A.store.get('best:' + gameId, null);
    html += `
      <div class="set-group">
        <h3>Progresso</h3>
        <div class="set-row">
          <span class="set-copy"><b>Recorde salvo</b><small>Guardado apenas neste navegador.</small></span>
          <b class="set-best">${best == null ? '–' : best}</b>
        </div>
        <button class="set-danger" type="button" id="cfgClearBest">Apagar recorde</button>
        ${storyGame ? '<button class="set-danger" type="button" id="cfgClearStory">Zerar progresso da história</button>' : ''}
      </div>
      <p class="set-note" id="cfgNote">Som, volume e vibração valem na hora. As outras opções são aplicadas ao reiniciar.</p>`;

    cfgBody.innerHTML = html;
    cfgNeedsRestart = false;

    cfgBody.querySelectorAll('[data-bool]').forEach(input => {
      input.addEventListener('change', () => {
        A.setGameConfig(gameId, { [input.dataset.bool]: input.checked });
        if (kit) kit.config = A.getGameConfig(gameId);
        if (input.dataset.bool === 'sound' || input.dataset.bool === 'vibrate') return;
        markRestart();
      });
    });

    cfgBody.querySelectorAll('[data-seg]').forEach(group => {
      group.addEventListener('click', event => {
        const button = event.target.closest('button[data-value]');
        if (!button) return;
        const key = group.dataset.seg;
        let value = button.dataset.value;
        if (NUMERIC_SETTINGS.includes(key)) value = Number(value);
        A.setGameConfig(gameId, { [key]: value });
        group.querySelectorAll('button').forEach(item => item.classList.toggle('on', item === button));
        if (kit) {
          kit.config = A.getGameConfig(gameId);
          kit.players = Number(kit.config.players) || 1;
          kit.difficulty = kit.config.difficulty;
        }
        A.sfx('click');
        markRestart();
      });
    });

    cfgBody.querySelector('[data-range="volume"]').addEventListener('input', event => {
      const volume = Number(event.target.value);
      A.setGameConfig(gameId, { volume });
      const label = event.target.closest('.set-row').querySelector('small');
      if (label) label.textContent = Math.round(volume * 100) + '%';
      if (kit) kit.config = A.getGameConfig(gameId);
    });

    $('cfgClearBest').onclick = () => {
      A.store.set('best:' + gameId, null);
      if (kit) { kit.best = null; kit.setBest(); }
      renderSettings();
      A.sfx('click');
    };

    const clearStory = $('cfgClearStory');
    if (clearStory) clearStory.onclick = () => {
      A.story.reset(gameId);
      renderSettings();
      A.sfx('click');
    };
  }

  function markRestart() {
    cfgNeedsRestart = true;
    const note = $('cfgNote');
    if (note) note.textContent = 'Há mudanças de partida para aplicar. Toque em "Aplicar e reiniciar".';
  }

  function openSettings() {
    renderSettings();
    cfgWrap.hidden = false;
    document.body.classList.add('cfg-open');
    A.sfx('click');
  }

  function closeSettings() {
    cfgWrap.hidden = true;
    document.body.classList.remove('cfg-open');
  }

  $('cfgClose').onclick = closeSettings;
  cfgWrap.addEventListener('click', event => { if (event.target === cfgWrap) closeSettings(); });
  addEventListener('keydown', event => { if (event.key === 'Escape' && !cfgWrap.hidden) closeSettings(); });
  $('cfgReset').onclick = () => { A.resetGameConfig(gameId); renderSettings(); markRestart(); };
  $('cfgRestart').onclick = () => { closeSettings(); start(); };

  /* ---------------------------------------------------------------------------
     HUD: placar e recorde.
     O placar ganha um "pop" e, para ganhos maiores, um texto flutuante "+N".
     --------------------------------------------------------------------------- */
  const hud = {
    setScore: value => { $('sc').textContent = value; },
    setBest: value => { $('bs').textContent = value; }
  };

  let lastPop = 0;
  hud.popScore = amount => {
    const now = performance.now();
    if (now - lastPop < 160) return;
    lastPop = now;

    const scoreElement = $('sc');
    A.fx.pop(scoreElement);

    if (amount >= 5) {
      const rect = scoreElement.getBoundingClientRect();
      A.fx.floatText('+' + amount, rect.left + rect.width / 2, rect.top - 4, '#3ddc84');
    }
  };

  /* ---------------------------------------------------------------------------
     TELA DE INÍCIO (overlay)
     --------------------------------------------------------------------------- */
  const storyGame = A.storyGames.has(gameId);
  const MODE_NAMES = {
    quick: 'Partida rápida',
    story: 'História',
    championship: 'Campeonato',
    duo: '2 jogadores'
  };

  function modeName(mode) {
    return MODE_NAMES[mode] || 'Partida';
  }

  /* ---------------------------------------------------------------------------
     HOME ESPECIAL DA PACIÊNCIA
     Carteira de moedas + loja de baralhos. Fica na tela inicial do jogo, antes
     dos modos, para o jogador ver o que ganhou e personalizar as cartas.
     --------------------------------------------------------------------------- */
  function solitaireHome() {
    const decks = A.cardDecks || [];
    if (!decks.length) return null;

    const unlocked = new Set(A.store.get('sol:decks', ['classic']));
    unlocked.add('classic');
    let selected = A.store.get('sol:deck', 'classic');
    if (!unlocked.has(selected)) {
      selected = 'classic';
      A.store.set('sol:deck', selected);
    }
    let hostEl = null;
    let asking = null;
    let timer = 0;

    const inner = () => `
      <div class="hub-sol-top">
        <span class="sol-wallet">🪙 <b data-coins>${A.wallet.get()}</b> moedas</span>
        <small>Ganhe moedas ao concluir fases e troque por baralhos.</small>
      </div>
      <div class="hub-label" style="margin:12px 0 6px">Seu baralho</div>
      <div class="hub-decks">
        ${decks.map(deck => {
          const owned = unlocked.has(deck.id);
          return `<button type="button" class="deck-swatch ${owned ? 'owned' : ''} ${selected === deck.id ? 'on' : ''}"
            data-deck="${deck.id}"
            style="--face:${deck.face};--back:${deck.back};--ink:${deck.ink};--red:${deck.red}">
            <span class="deck-mini"><i></i></span>
            <span class="deck-copy"><b>${deck.name}</b><small>${owned ? (selected === deck.id ? 'Em uso' : 'Trocar') : '🪙 ' + deck.cost}</small></span>
          </button>`;
        }).join('')}
      </div>`;

    function paint() {
      if (!hostEl) return;
      hostEl.innerHTML = inner();
      bind();
    }

    function bind() {
      if (!hostEl) return;
      hostEl.querySelectorAll('.deck-swatch').forEach(button => {
        button.onclick = () => choose(button.dataset.deck, button);
      });
    }

    function choose(deckId, button) {
      const deck = decks.find(item => item.id === deckId);
      if (!deck) return;

      if (unlocked.has(deckId)) {
        selected = deckId;
        A.store.set('sol:deck', deckId);
        A.sfx('click');
        paint();
        return;
      }

      if (asking !== deckId) {
        asking = deckId;
        clearTimeout(timer);
        paint();
        const fresh = Array.from(hostEl.querySelectorAll('.deck-swatch'))
          .find(item => item.dataset.deck === deckId);
        if (fresh) {
          fresh.classList.add('ask');
          const label = fresh.querySelector('small');
          if (label) label.textContent = 'Comprar por ' + deck.cost + '?';
        }
        A.sfx('click');
        timer = setTimeout(() => { asking = null; paint(); }, 3600);
        return;
      }

      if (!A.wallet.spend(deck.cost)) {
        asking = null;
        A.sfx('hit');
        A.fx.shake(button);
        const label = button.querySelector('small');
        if (label) label.textContent = 'Faltam moedas';
        setTimeout(paint, 900);
        return;
      }

      unlocked.add(deckId);
      A.store.set('sol:decks', Array.from(unlocked));
      A.store.set('sol:deck', deckId);
      selected = deckId;
      asking = null;
      clearTimeout(timer);
      A.sfx('win');
      A.fx.confetti(90, true);
      paint();
    }

    return {
      html: `<div class="hub-sol" data-sol-home>${inner()}</div>`,
      mount(root) {
        hostEl = root.querySelector('[data-sol-home]');
        bind();
      }
    };
  }

  function showStart() {
    overlay.hidden = false;

    const progress = storyGame ? A.story.get(gameId) : null;
    const storyLevel = progress ? progress.level : 1;
    const storyDone = !!(progress && progress.completed);
    const storyPct = storyDone ? 100 : Math.round((storyLevel - 1) / 40 * 100);
    const storyTitle = storyDone ? 'Rejogar história' : storyLevel > 1 ? 'Continuar história' : 'Começar história';
    const storySub = storyDone ? 'Campanha concluída · todas as 40 fases' : 'Fase ' + storyLevel + ' de 40 · progresso salvo';
    const category = A.cats[meta.cat] || { name: '', icon: '' };
    const homeExtras = gameId === 'solitaire' ? solitaireHome() : null;

    const modes = [];

    if (storyGame) {
      modes.push(`<button class="mode-card pri m-story" data-mode="story" type="button">
        <i>📖</i><span><b>${storyTitle}</b><small>${storySub}</small></span><em>›</em>
      </button>`);
      modes.push(`<button class="mode-card m-quick" data-mode="quick" type="button">
        <i>⚡</i><span><b>Partida rápida</b><small>Começa na fase 1, sem salvar progresso</small></span>
      </button>`);
    } else {
      modes.push(`<button class="mode-card pri m-quick" data-mode="quick" type="button">
        <i>▶</i><span><b>Jogar agora</b><small>Partida rápida</small></span><em>›</em>
      </button>`);
    }

    if (features.tournament) {
      modes.push(`<button class="mode-card m-champ" data-mode="championship" type="button">
        <i>🏆</i><span><b>Campeonato</b><small>Três partidas eliminatórias</small></span>
      </button>`);
    }
    if (features.players) {
      modes.push(`<button class="mode-card m-duo" data-mode="duo" type="button">
        <i>👥</i><span><b>2 jogadores</b><small>Disputa local no mesmo aparelho</small></span>
      </button>`);
    }

    overlay.innerHTML = `
      <div class="box hub">
        <div class="hub-head">
          <div class="bigico">${meta.icon}</div>
          <div class="hub-title">
            <span class="hub-cat">${category.icon} ${category.name}</span>
            <h2>${meta.name}</h2>
          </div>
          <a class="hub-home" href="index.html" aria-label="Voltar para todos os jogos">✕</a>
        </div>
        <p>${meta.desc}</p>
        ${homeExtras ? homeExtras.html : ''}
        ${storyGame ? `
          <div class="hub-story">
            <div class="hub-story-top"><b>📖 Modo História</b><span>${storyDone ? 'Concluído' : 'Fase ' + storyLevel + '/40'}</span></div>
            <div class="hub-progress"><i style="width:${storyPct}%"></i></div>
            <small>Seu progresso fica salvo neste navegador. Ao perder, você recomeça a fase atual — nunca do início.</small>
          </div>` : ''}
        <div class="hub-label">Escolha o modo</div>
        <div class="hub-modes">${modes.join('')}</div>
        <div class="hub-label">Extras</div>
        <div class="hub-tools">
          <button type="button" class="hub-tool" data-hub="ranking"><i>🏅</i><span><b>Ranking</b><small>Melhores resultados</small></span></button>
          <button type="button" class="hub-tool" data-hub="history"><i>🕘</i><span><b>Histórico</b><small>Partidas anteriores</small></span></button>
          <button type="button" class="hub-tool" data-hub="settings" id="ovcfg"><i>⚙</i><span><b>Ajustes</b><small>Som, volume, modos e progresso</small></span></button>
        </div>
        <details class="ov-rules">
          <summary>Como jogar</summary>
          <p>${meta.how}<br><br>${rules}</p>
        </details>
        <div class="hub-foot">
          <a href="index.html">← Todos os jogos</a>
          <span>${category.icon} ${category.name}</span>
        </div>
      </div>`;

    const rulesBox = overlay.querySelector('.ov-rules');
    if (rulesBox && matchMedia('(max-width: 700px)').matches) rulesBox.open = false;

    if (homeExtras) homeExtras.mount(overlay);

    overlay.querySelectorAll('[data-mode]').forEach(button => {
      button.onclick = () => {
        const mode = button.dataset.mode;
        if (mode === 'story-reset') {
          A.story.reset(gameId);
          start({ mode: 'story' });
        } else {
          start({ mode });
        }
      };
    });
    overlay.querySelectorAll('[data-hub]').forEach(button => {
      button.onclick = () => {
        if (button.dataset.hub === 'settings') openSettings();
        else showInfoPanel(button.dataset.hub);
      };
    });
  }

  function showInfoPanel(kind) {
    overlay.hidden = false;
    const entries = A.gameHistory.get(gameId);
    const best = A.store.get('best:' + gameId, null);
    const title = kind === 'ranking' ? '🏅 Ranking' : '🕘 Histórico';
    let body = '';

    if (kind === 'ranking') {
      const rank = A.ranking.list(gameId);
      const hasYou = rank.rows.some(row => row.you);
      const bestText = best == null ? '–' : A.rankText(gameId, best);
      body = `
        <div class="hub-name">
          <label for="rankName"><span>Seu nome no ranking</span>
            <input id="rankName" type="text" maxlength="14" placeholder="Escolha um nome…"
              value="${A.esc(A.player.raw())}" autocomplete="off" spellcheck="false">
          </label>
          <button class="gb pri" id="rankNameSave" type="button">Salvar</button>
        </div>
        <div class="hub-record"><span>Recorde salvo</span><b>${bestText}</b></div>
        <div class="hub-rank-list">
          ${rank.rows.map((row, index) => `
            <div class="hub-row ${row.you ? 'you' : ''} ${row.place <= 3 ? 'top' + row.place : ''}" style="--i:${index}">
              <b class="rank">${row.place}º</b>
              <span class="pname">${A.esc(row.name)}${row.you ? '<em>VOCÊ</em>' : ''}</span>
              <small class="pscore">${row.text}</small>
            </div>`).join('')}
        </div>
        <p class="rank-note">${!rank.hasName
          ? 'Escolha um nome para aparecer no ranking e provar que é o melhor.'
          : hasYou
            ? 'Seu nome aparece no ranking de todos os jogos. Vença seus rivais para subir!'
            : 'Nome salvo! Jogue uma partida para entrar no ranking.'}</p>`;
    } else {
      body = entries.length
        ? entries.map(entry => `
          <div class="hub-row">
            <b>${entry.text}</b>
            <span>${entry.message}</span>
            <small>${modeName(entry.mode)} · ${new Date(entry.at).toLocaleDateString('pt-BR')}</small>
          </div>`).join('')
        : '<p class="hub-empty">Nenhuma partida registrada ainda.</p>';
    }

    overlay.innerHTML = `
      <div class="box hub">
        <div class="hub-head">
          <div class="bigico">${meta.icon}</div>
          <div class="hub-title"><span class="hub-cat">${meta.name}</span><h2>${title}</h2></div>
        </div>
        <div class="hub-list">${body}</div>
        <div class="ov-actions">
          <button class="btn" id="hubBack" type="button">← Voltar ao menu</button>
          ${kind === 'history' && entries.length ? '<button class="btn ghost" id="hubClear" type="button">Apagar histórico</button>' : ''}
        </div>
      </div>`;

    const nameInput = $('rankName');
    if (nameInput) {
      const saveName = () => {
        const name = A.player.set(nameInput.value);
        nameInput.value = name;
        A.sfx('coin');
        A.fx.pop(nameInput);
        setTimeout(() => showInfoPanel('ranking'), 120);
      };
      $('rankNameSave').onclick = saveName;
      nameInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          saveName();
        }
      });
    }

    $('hubBack').onclick = showStart;
    const clear = $('hubClear');
    if (clear) clear.onclick = () => {
      A.gameHistory.clear(gameId);
      showInfoPanel('history');
    };
  }

  /* ---------------------------------------------------------------------------
     TELA DE FIM DE JOGO
     Mostra recorde, botão de jogar de novo e link para a home.
     --------------------------------------------------------------------------- */
  function showOver(message, score, newBest, best) {
    overlay.hidden = false;
    const story = lastStart.mode === 'story';
    overlay.innerHTML = `
      <div class="box">
        ${newBest ? '<span class="badge">NOVO RECORDE!</span>' : ''}
        <h2>${message}</h2>
        <div class="sc">${score}</div>
        <p>Recorde: ${best == null ? '–' : best}</p>
        <div class="ov-actions">
          <button class="btn" id="again" type="button">↻ ${story ? 'Repetir fase' : 'Jogar de novo'}</button>
          <button class="btn ghost" id="overMenu" type="button">☰ Menu do jogo</button>
        </div>
        <a class="btn ghost" href="index.html">Mais jogos</a>
      </div>`;
    $('again').onclick = () => start();
    $('overMenu').onclick = returnToHub;

    if (newBest) setTimeout(() => A.fx.confetti(190, true), 140);
    else A.fx.shake($('frame'));
  }

  /* ---------------------------------------------------------------------------
     CARREGAMENTO SOB DEMANDA
     O script do jogo só é baixado quando o jogador começa a jogar.
     Isso deixa a home mais leve.
     --------------------------------------------------------------------------- */
  function loadGameScript() {
    return new Promise((resolve, reject) => {
      if (A.games[gameId]) return resolve();

      const script = document.createElement('script');
      script.src = 'js/games/' + meta.file + '.js';
      script.onload = () => A.games[gameId]
        ? resolve()
        : reject(new Error('jogo não registrado'));
      script.onerror = () => reject(new Error('arquivo não encontrado'));
      document.head.appendChild(script);
    });
  }

  /* ---------------------------------------------------------------------------
     INÍCIO / REINÍCIO
     Destrói o kit anterior, limpa o palco e cria um novo kit.
     --------------------------------------------------------------------------- */
  function start(options) {
    if (options && options.mode) lastStart = { mode: options.mode };

    const session = Object.assign({ mode: 'quick' }, lastStart);
    if (session.mode === 'story' && !storyGame) session.mode = 'quick';
    if (session.mode === 'story' && options && options.resetStory) A.story.reset(gameId);
    lastStart = { mode: session.mode };

    const config = A.getGameConfig(gameId);
    if (session.mode === 'championship') config.tournament = true;
    if (session.mode === 'duo') config.players = 2;

    loadGameScript().then(() => {
      if (kit) kit.destroy();

      closeSettings();
      overlay.hidden = true;
      stage.innerHTML = '';
      padHost.innerHTML = '';
      pausedByUser = false;
      pauseBadge = null;
      $('pause').textContent = '⏸';

      /* Ativa o contexto de som/configuração deste jogo. */
      A.activeGame = gameId;
      A.applyActiveConfig();
      A.activeConfig = config;

      kit = A.createKit({
        id: gameId,
        stage,
        padHost,
        config,
        story: session.mode === 'story',
        mode: session.mode,
        phaseGate: showPhaseGate,
        setScore: hud.setScore,
        setBest: hud.setBest,
        popScore: hud.popScore,
        showOver
      });

      kit.setBest();
      kit.setScore(0);
      A.pushRecent(gameId);
      A.ui?.refresh?.();
      A.sfx('click');

      try {
        A.games[gameId](kit);
      } catch (error) {
        console.error(error);
        stage.innerHTML = '<p class="msg">Ops! Erro ao iniciar o jogo.</p>';
      }
    }).catch(error => {
      console.error(error);
      stage.innerHTML = '<p class="msg">Erro: ' + error.message + '</p>';
    });
  }

  function showPhaseGate(info) {
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="box hub phase-gate">
        <span class="badge">FASE CONCLUÍDA</span>
        <div class="bigico">${meta.icon}</div>
        <h2>Fase ${info.level} de ${info.total}!</h2>
        <p>${info.subtitle || 'Próxima fase liberada.'}</p>
        <div class="hub-progress"><i style="width:${Math.round(info.level / info.total * 100)}%"></i></div>
        <div class="ov-actions">
          <button class="btn" id="nextPhase" type="button">▶ Próxima fase</button>
          <button class="btn ghost" id="phaseMenu" type="button">☰ Menu do jogo</button>
        </div>
      </div>`;
    $('nextPhase').onclick = () => {
      overlay.hidden = true;
      info.onNext();
    };
    $('phaseMenu').onclick = returnToHub;
  }

  function returnToHub() {
    closeSettings();
    if (kit) kit.destroy();
    kit = null;
    pausedByUser = false;
    pauseBadge = null;
    $('pause').textContent = '⏸';
    stage.innerHTML = '';
    padHost.innerHTML = '';
    showStart();
  }

  /* ---------------------------------------------------------------------------
     SAIR DA PARTIDA COM AVISO ANIMADO
     Em vez de um confirm() seco, mostramos um cartão com entrada suave,
     ícone flutuante e duas opções claras. O jogo fica pausado enquanto o
     aviso está aberto, então nenhuma fase é perdida por acidente.
     --------------------------------------------------------------------------- */
  let leaveLayer = null;

  function gameRunning() {
    return !!(kit && !kit.dead);
  }

  function confirmLeave(options) {
    if (leaveLayer) return;
    A.sfx('click');

    const wasPaused = kit ? kit.paused : false;
    if (kit) kit.paused = true;

    const layer = A.el('div', 'leave-layer');
    layer.innerHTML = `
      <div class="leave-card" role="dialog" aria-modal="true" aria-labelledby="leaveTitle">
        <div class="leave-ico">${options.icon || '🚪'}</div>
        <span class="leave-tag">${options.tag || 'UM INSTANTE'}</span>
        <h2 id="leaveTitle">${options.title || 'Abandonar a fase?'}</h2>
        <p>${options.text || 'A fase atual será abandonada. O progresso das fases concluídas continua salvo.'}</p>
        <div class="leave-actions">
          <button class="btn" id="leaveStay" type="button">${options.stay || 'Continuar jogando'}</button>
          <button class="btn ghost leave-go" id="leaveGo" type="button">${options.go || 'Sair para a home'}</button>
        </div>
      </div>`;
    const host = document.fullscreenElement || document.body;
    host.appendChild(layer);
    leaveLayer = layer;
    requestAnimationFrame(() => layer.classList.add('show'));

    const remove = () => {
      layer.classList.remove('show');
      setTimeout(() => {
        layer.remove();
        if (leaveLayer === layer) leaveLayer = null;
      }, 280);
    };

    function cleanup() { removeEventListener('keydown', onKey, true); }
    function stay() {
      cleanup();
      if (kit && !wasPaused && !kit.dead) kit.paused = false;
      remove();
    }

    layer.querySelector('#leaveStay').onclick = stay;
    layer.querySelector('#leaveGo').onclick = () => {
      cleanup();
      A.sfx('click');
      remove();
      setTimeout(() => { if (options.onGo) options.onGo(); }, 120);
    };
    layer.addEventListener('click', event => {
      if (event.target === layer) stay();
    });

    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        stay();
      }
    }
    addEventListener('keydown', onKey, true);
    setTimeout(() => layer.querySelector('#leaveStay')?.focus({ preventScroll: true }), 80);
  }

  function requestHome(href) {
    const target = href || 'index.html';
    if (!gameRunning()) {
      location.href = target;
      return;
    }
    confirmLeave({
      icon: '🏠',
      tag: 'SAINDO DA MESA',
      title: 'Voltar para a home?',
      text: 'A fase em andamento será abandonada. Seu progresso salvo e suas moedas continuam intactos.',
      stay: 'Continuar jogando',
      go: 'Sair para a home',
      onGo: () => { location.href = target; }
    });
  }

  /* Sempre que alguém tentar sair para a home durante uma partida, pedimos
     confirmação — inclusive pelos atalhos do menu, logo e dock. */
  document.addEventListener('click', event => {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (!/^(\.\/)?index\.html(?:#.*)?$/.test(href)) return;
    if (!gameRunning() || leaveLayer) return;
    event.preventDefault();
    requestHome(href);
  }, true);

  /* ---------------------------------------------------------------------------
     PAUSA
     O loop do kit para enquanto pausado. A aba escondida pausa sozinha; ao
     voltar, retoma apenas se o jogador não tiver pausado manualmente.
     --------------------------------------------------------------------------- */
  const pauseBtn = $('pause');

  function updatePauseUI() {
    const paused = !!(kit && kit.paused && !kit.dead);
    pauseBtn.textContent = paused ? '▶' : '⏸';
    pauseBtn.setAttribute('aria-label', paused ? 'Continuar jogo' : 'Pausar jogo');

    if (paused) {
      if (!pauseBadge) {
        pauseBadge = A.el('div', 'pause-badge',
          '<b>PAUSADO</b><small>Pressione P ou ▶ para continuar</small>' +
          '<div class="pause-actions">' +
          '<button class="btn" id="pauseResume" type="button">▶ Continuar</button>' +
          '<button class="btn ghost" id="pauseSettings" type="button">⚙ Ajustes</button>' +
          '<button class="btn ghost" id="pauseRestart" type="button">↻ Reiniciar</button>' +
          '<button class="btn ghost" id="pauseMenu" type="button">☰ Menu do jogo</button>' +
          '<button class="btn ghost" id="pauseHome" type="button">🏠 Início</button>' +
          '</div>', stage);
        pauseBadge.querySelector('#pauseResume').onclick = event => {
          event.stopPropagation();
          setPaused(false, true);
        };
        pauseBadge.querySelector('#pauseSettings').onclick = event => {
          event.stopPropagation();
          openSettings();
        };
        pauseBadge.querySelector('#pauseRestart').onclick = event => {
          event.stopPropagation();
          start();
        };
        pauseBadge.querySelector('#pauseMenu').onclick = event => {
          event.stopPropagation();
          confirmLeave({
            icon: '☰',
            tag: 'MENU DO JOGO',
            title: 'Voltar ao menu do jogo?',
            text: 'A fase em andamento será abandonada. As fases concluídas continuam salvas.',
            stay: 'Continuar jogando',
            go: 'Voltar ao menu',
            onGo: returnToHub
          });
        };
        pauseBadge.querySelector('#pauseHome').onclick = event => {
          event.stopPropagation();
          requestHome('index.html');
        };
      }
      pauseBadge.classList.add('show');
    } else if (pauseBadge) {
      pauseBadge.classList.remove('show');
    }
  }

  function setPaused(value, byUser) {
    if (!kit || kit.dead) return;
    if (byUser) pausedByUser = value;
    kit.paused = value;
    updatePauseUI();
    if (value) A.sfx('click');
  }

  function togglePause() {
    if (!kit || kit.dead || !overlay.hidden || leaveLayer) return;
    setPaused(!kit.paused, true);
  }

  pauseBtn.onclick = togglePause;

  /* ---------------------------------------------------------------------------
     BOTÕES DO HUD: pausa e tela cheia.
     Ajustes, som, reinício e menu ficam centralizados no menu de pausa, para
     não repetir os mesmos comandos no HUD e nas telas do jogo.
     --------------------------------------------------------------------------- */
  $('full').onclick = () => {
    const frame = $('frame');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (frame.requestFullscreen) frame.requestFullscreen();
  };

  const homeBtn = $('home');
  if (homeBtn) homeBtn.onclick = () => requestHome('index.html');

  /* Pausa o jogo quando a aba fica em segundo plano. */
  document.addEventListener('visibilitychange', () => {
    if (!kit || kit.dead) return;
    if (document.hidden) {
      kit.paused = true;
      updatePauseUI();
    } else if (!pausedByUser) {
      kit.paused = false;
      updatePauseUI();
    }
  });

  /* Enter inicia/reinicia; P pausa/continua. */
  addEventListener('keydown', event => {
    if (event.key === 'Enter' && !overlay.hidden && cfgWrap.hidden) {
      const button = overlay.querySelector('button');
      if (button) button.click();
    }
    if ((event.key === 'p' || event.key === 'P') && cfgWrap.hidden) {
      togglePause();
    }
  });

  /* ---------------------------------------------------------------------------
     SUGESTÕES DA MESMA CATEGORIA
     Até 6 jogos aleatórios, com animação em cascata nos cards.
     --------------------------------------------------------------------------- */
  const related = A.shuffle(
    A.catalog.filter(game => game.cat === meta.cat && game.id !== gameId)
  ).slice(0, 6);

  $('rel').innerHTML = related.map((game, index) => `
    <a class="card" style="--h:${A.hue(game.id)};--i:${index}" href="game.html?g=${game.id}">
      <div class="thumb"><span class="ico">${game.icon}</span></div>
      <div class="meta"><b>${game.name}</b></div>
    </a>`).join('');

  /* ---------------------------------------------------------------------------
     MICROANIMAÇÕES AUTOMÁTICAS
     Jogos feitos com DOM (tabuleiros, cartas, células) não precisam chamar
     nada manualmente: o MutationObserver detecta mudanças e aplica o "pop".
     --------------------------------------------------------------------------- */
  const lastFx = new WeakMap();

  const animateNode = element => {
    if (!element || element.nodeType !== 1) return;
    const now = performance.now();
    if (now - (lastFx.get(element) || 0) < 80) return;
    lastFx.set(element, now);
    A.fx.pop(element);
  };

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        if (parent && parent.matches('.cellb,.pcard,.rl-b,.rl-h')) animateNode(parent);
      } else if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches('.cellb,.pcard')) animateNode(node);
          node.querySelectorAll && node.querySelectorAll('.cellb,.pcard').forEach(animateNode);
        });
      } else if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target.matches('.cellb,.rl-b')) animateNode(target);
      }
    }
  });

  observer.observe(stage, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['style']
  });

  /* Abre a tela inicial. O jogo só começa quando o jogador clica em JOGAR. */
  showStart();
})();
