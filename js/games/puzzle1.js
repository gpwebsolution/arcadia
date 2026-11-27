/* =============================================================================
   ARCADIA - PUZZLES (parte 1)
   -----------------------------------------------------------------------------
   A funcao fit() calcula o tamanho das celulas conforme a largura da tela,
   mantendo os tabuleiros responsivos. Os jogos montam elementos DOM (botoes e
   divs) em vez de canvas, e usam K.after/K.every para animar sequencias.

   Todos usam a arena compartilhada (A.arena) para manter o mesmo padrao visual
   dos lotes 3A/3B: cabecalho com icone, estatisticas, corpo e rodape com a
   marca GPWeb.

   Jogos: 2048, Campo Minado, Jogo da Memoria, Quebra-Cabeca 15, Apague as
   Luzes, Inundacao, Torre de Hanoi e Resta Um.
   ============================================================================= */
(function () {
const A = Arcadia;
const fit = (n, max, pad) => Math.max(24, Math.min(max, Math.floor((Math.min(innerWidth, 560) - (pad || 60)) / n)));

/* Atualiza o texto de uma estatistica sem recriar o DOM. */
const setStat = (el, value) => { if (el && el.textContent !== String(value)) el.textContent = value; };

// 2048: 40 fases com meta de pontos e limite de jogadas.
A.register('2048', K => {
  const ui = A.arena(K, {
    icon: '🔢', title: '2048', kind: 'puzzle',
    sub: 'Some números iguais e alcance a meta da fase.'
  });
  const metaEl = A.arenaStat(ui.stats, 'Meta', '🎯');
  const movesEl = A.arenaStat(ui.stats, 'Movimentos', '↔');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const sz = fit(4, 88, 130);
  const COL = {
    0: 'rgba(255,255,255,.05)', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
    32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850',
    1024: '#edc53f', 2048: '#edc22e'
  };
  const C = A.campaign(K, 40);
  let b = Array(16).fill(0), won = false, moves = 0, earned = 0, goal = 0, limit = 0, locked = false;
  const hint = A.el('p', 'arena-hint', 'Use as setas, WASD ou deslize para somar os números.', ui.body);
  const box = A.el('div', 'pz-board pz-2048', null, ui.body);
  box.style.setProperty('--cell', sz + 'px');
  box.style.setProperty('--cols', 4);
  const cells = Array.from({ length: 16 }, () => A.el('div', 'pz-tile pz-t2048', '', box));

  const upd = () => {
    setStat(metaEl, earned + '/' + goal);
    setStat(movesEl, moves + '/' + limit);
    setStat(phaseEl, C.level + '/40');
    hint.textContent = C.tag + ' · alcance ' + goal + ' pontos em até ' + limit + ' movimentos.';
  };
  const add = () => { const e = b.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (e.length) b[A.pick(e)] = Math.random() < .9 ? 2 : 4; };
  const idx = (d, k, j) => d == 'ArrowLeft' ? k * 4 + j : d == 'ArrowRight' ? k * 4 + 3 - j : d == 'ArrowUp' ? j * 4 + k : (3 - j) * 4 + k;
  const slide = (arr, d) => {
    let moved = false, gain = 0; const out = arr.slice();
    for (let k = 0; k < 4; k++) {
      let r = [0, 1, 2, 3].map(j => out[idx(d, k, j)]).filter(Boolean), orig = [0, 1, 2, 3].map(j => out[idx(d, k, j)]);
      for (let i = 0; i < r.length - 1; i++) if (r[i] == r[i + 1]) { r[i] *= 2; gain += r[i]; r.splice(i + 1, 1); }
      while (r.length < 4) r.push(0);
      r.forEach((v, j) => { if (v != orig[j]) moved = true; out[idx(d, k, j)] = v; });
    }
    return { out, moved, gain };
  };
  const draw = () => {
    cells.forEach((c, i) => {
      const v = b[i];
      if (c.dataset.v != null && Number(c.dataset.v) !== v) A.fx.pop(c);
      c.dataset.v = v;
      c.textContent = v || '';
      c.style.setProperty('--tile', COL[v] || '#3c3a32');
      c.style.setProperty('--ink', v > 4 ? '#fff' : '#776e65');
      c.style.setProperty('--tile-size', (v > 999 ? .3 : v > 99 ? .38 : .46));
      c.classList.toggle('zero', !v);
    });
    if (!won && b.includes(2048)) { won = true; K.banner('2048!', 'Continue somando'); A.fx.confetti(150, true); }
    upd();
  };
  const build = () => {
    goal = 250 + C.level * 150;
    limit = 70 + C.level * 3;
    b = Array(16).fill(0); moves = 0; earned = 0; locked = false;
    add(); add(); draw();
  };
  K.onKey(d => {
    if (locked || !d.startsWith('Arrow')) return;
    const r = slide(b, d); if (!r.moved) return;
    b = r.out; K.addScore(r.gain); earned += r.gain; moves++;
    if (r.gain) A.sfx('pop'); else A.sfx('step');
    add(); draw();
    if (earned >= goal) {
      if (C.last) return C.finish('Campanha completa! 🏆');
      const nextGoal = 250 + (C.level + 1) * 150;
      locked = true;
      C.advance('Nova meta: ' + nextGoal, () => K.after(build, 650)); return;
    }
    if (moves >= limit) return K.over('Limite de jogadas na fase ' + C.level, K.score, true);
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].some(x => slide(b, x).moved)) K.over('Sem movimentos na fase ' + C.level, K.score, true);
  });
  K.swipe(); K.pad('arrows'); build();
});

// Campo Minado: campanha de 40 tabuleiros; o primeiro clique nunca e mina.
A.register('minesweeper', K => {
  K.low = true; K.fmt = n => n + 's';
  const ui = A.arena(K, {
    icon: '💥', title: 'Campo Minado', kind: 'puzzle',
    sub: 'Abra todas as casas sem tocar nas minas.'
  });
  const minesEl = A.arenaStat(ui.stats, 'Minas', '💣');
  const timeEl = A.arenaStat(ui.stats, 'Tempo', '⏱');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const C = A.campaign(K, 40);
  const COL = ['', '#4c7dff', '#3ddc84', '#ff4d6d', '#b05cff', '#ff9f43', '#00e0f0', '#fff', '#999'];
  let R = 9, CC = 9, M = 10, sz = 30, flag = false, t = 0, opened = 0, flags = 0, done = false, cells = [], timerOn = false, armed = false;
  const hint = A.el('p', 'arena-hint', 'Clique para abrir. Use 🚩 ou o botão direito para marcar minas.', ui.body);
  const board = A.el('div', 'pz-board pz-mine', null, ui.body);
  const fb = A.el('button', 'arena-btn ghost', '🚩 Bandeira: off', ui.foot);
  fb.type = 'button';

  const nb = c => { const r = [], y = Math.floor(c.i / CC), x = c.i % CC; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if ((dx || dy) && yy >= 0 && yy < R && xx >= 0 && xx < CC) r.push(cells[yy * CC + xx]); } return r; };
  const paint = c => {
    const e = c.el;
    e.className = 'pz-mine-cell' + (c.o ? ' open' : '') + (c.f && !c.o ? ' flag' : '') + (c.m && c.o ? ' mine' : '');
    e.dataset.n = c.o && !c.m ? (c.n || 0) : '';
    e.textContent = c.o ? (c.m ? '💣' : (c.n || '')) : (c.f ? '🚩' : '');
    if (c.o && !c.m) e.style.color = COL[c.n] || '';
    else e.style.color = '';
  };
  const upd = () => {
    setStat(minesEl, M - flags);
    setStat(timeEl, t + 's');
    setStat(phaseEl, C.level + '/40');
    hint.textContent = C.tag + ' · ' + (R * CC - M) + ' casas seguras · ' + flags + ' marcadas.';
  };
  const place = first => { const ban = new Set([first.i, ...nb(first).map(c => c.i)]); let n = 0; while (n < M) { const c = A.pick(cells); if (!c.m && !ban.has(c.i)) { c.m = 1; n++; } } cells.forEach(c => c.n = nb(c).filter(x => x.m).length); };
  const reveal = c0 => { const st = [c0]; while (st.length) { const c = st.pop(); if (c.o || c.f) continue; c.o = 1; opened++; paint(c); if (!c.n) nb(c).forEach(x => !x.o && st.push(x)); } };
  const act = (c, fl) => {
    if (done) return;
    if (fl) { if (!c.o) { c.f = !c.f; flags += c.f ? 1 : -1; A.sfx('click'); paint(c); upd(); } return; }
    if (c.f || c.o) return;
    if (!armed) { armed = true; place(c); }
    if (!timerOn) { timerOn = true; K.every(() => { K.setScore(++t); upd(); }, 1000); }
    if (c.m) { done = true; cells.forEach(x => x.m && (x.o = 1, paint(x))); return K.over('💥 Boom na fase ' + C.level, t, true); }
    reveal(c); A.sfx('pop');
    if (opened == R * CC - M) {
      done = true;
      if (C.last) return C.finish('Campanha completa! 🏆', t);
      done = true;
      C.advance('Mais minas e tabuleiro maior', () => K.after(build, 700));
    }
  };
  const build = () => {
    const n = Math.min(16, 6 + Math.floor((C.level - 1) / 3));
    R = CC = n;
    M = Math.max(5, Math.floor(n * n * (.13 + C.level * .001)));
    sz = Math.max(12, Math.min(38, Math.floor((Math.min(innerWidth, 560) - 50) / n)));
    armed = false; opened = 0; flags = 0; done = false; flag = false; timerOn = false; t = 0;
    fb.textContent = '🚩 Bandeira: off'; fb.classList.remove('pri');
    board.style.setProperty('--cell', sz + 'px');
    board.style.setProperty('--cols', CC);
    board.style.setProperty('--gap', '3px');
    board.innerHTML = '';
    cells = Array.from({ length: R * CC }, (_, i) => ({ i, m: 0, o: 0, f: 0, n: 0, el: A.el('button', 'pz-mine-cell', null, board) }));
    cells.forEach(c => { paint(c); c.el.onclick = () => act(c, flag); c.el.oncontextmenu = e => { e.preventDefault(); act(c, true); }; });
    K.setScore(0); upd();
  };
  fb.onclick = () => { flag = !flag; fb.textContent = '🚩 Bandeira: ' + (flag ? 'on' : 'off'); fb.classList.toggle('pri', flag); A.sfx('click'); };
  build();
});

// Jogo da Memoria: 40 fases com mais pares a cada nivel.
A.register('memory', K => {
  K.low = true; K.fmt = n => n + ' jog.';
  const ui = A.arena(K, {
    icon: '🃏', title: 'Jogo da Memória', kind: 'puzzle',
    sub: 'Encontre todos os pares de bichinhos.'
  });
  const pairsEl = A.arenaStat(ui.stats, 'Pares', '🧩');
  const movesEl = A.arenaStat(ui.stats, 'Jogadas', '↔');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const POOL = ['🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐵', '🐙', '🦄', '🐢', '🐧', '🦋', '🐨', '🦉', '🐝', '🐳', '🦖', '🐊', '🦒', '🦓', '🦔', '🦥', '🦩', '🐲'];
  const LEVELS = Array.from({ length: 40 }, (_, i) => {
    const pairs = 4 + Math.floor(i * 16 / 39);
    const cols = pairs <= 6 ? 4 : pairs <= 10 ? 5 : pairs <= 14 ? 6 : pairs <= 17 ? 7 : 8;
    return { pairs, cols, seed: (0x9e3779b9 ^ ((i + 1) * 0x85ebca6b)) >>> 0 || 1 };
  });
  const hint = A.el('p', 'arena-hint', 'Vire duas cartas por vez. Menos jogadas, melhor resultado.', ui.body);
  const board = A.el('div', 'pz-board pz-mem', null, ui.body);
  let lvl = 0, pairs = 4, sz = 80, first = null, lock = false, moves = 0, found = 0, total = 0, cells = [];

  const show = (b, up) => {
    b.classList.toggle('up', up);
    b.classList.toggle('matched', !!b.dataset.matched);
    b.setAttribute('aria-label', up ? 'Carta ' + b.dataset.e : 'Carta virada');
  };
  const upd = () => {
    setStat(pairsEl, found + '/' + pairs);
    setStat(movesEl, moves);
    setStat(phaseEl, (lvl + 1) + '/40');
    hint.textContent = 'Nível ' + (lvl + 1) + ' de 40 · encontre os ' + pairs + ' pares.';
  };
  const build = () => {
    const L = LEVELS[lvl]; pairs = L.pairs; moves = 0; found = 0; first = null; lock = false;
    sz = fit(L.cols, 90, 90) - 8;
    board.style.setProperty('--cell', sz + 'px');
    board.style.setProperty('--cols', L.cols);
    board.style.setProperty('--gap', '10px');
    board.innerHTML = '';
    const E = A.seededShuffle(POOL, L.seed).slice(0, pairs), deck = A.seededShuffle(E.concat(E), L.seed ^ 0x9e3779b9);
    cells = deck.map(e => {
      const b = A.el('button', 'pz-mem-card', '', board);
      b.type = 'button';
      b.dataset.e = e;
      b.innerHTML = '<span class="pz-mem-inner"><span class="pz-mem-face pz-mem-back">?</span><span class="pz-mem-face pz-mem-front">' + e + '</span></span>';
      show(b, false);
      b.onclick = () => {
        if (lock || b.dataset.up || b.dataset.matched) return;
        b.dataset.up = 1; show(b, true); A.sfx('click');
        if (!first) { first = b; return; }
        moves++; total++; K.setScore(total); upd();
        if (first.dataset.e == b.dataset.e) {
          found++; first.dataset.matched = b.dataset.matched = '1';
          first.classList.add('matched'); b.classList.add('matched');
          first = null; A.sfx('coin');
          if (found == pairs) {
            if (lvl == LEVELS.length - 1) return K.over('Todos os níveis! 🏆', total);
            K.banner('NÍVEL ' + (lvl + 2), 'Mais pares!'); A.fx.confetti(110, true); lvl++; lock = true; K.after(build, 900);
          }
        } else {
          lock = true; const f = first; first = null;
          K.after(() => { delete f.dataset.up; delete b.dataset.up; show(f, false); show(b, false); lock = false; }, 800);
        }
      };
      return b;
    });
    upd();
  };
  build();
});

// Quebra-Cabeca 15: embaralha com movimentos validos em grades 3x3 ate 6x6.
A.register('slide15', K => {
  K.low = true; K.fmt = n => n + ' mov.';
  const ui = A.arena(K, {
    icon: '🔲', title: 'Quebra-Cabeça 15', kind: 'puzzle',
    sub: 'Ordene os números deslizando as peças.'
  });
  const movesEl = A.arenaStat(ui.stats, 'Movimentos', '↔');
  const gridEl = A.arenaStat(ui.stats, 'Grade', '🔳');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const LEVELS = Array.from({ length: 40 }, (_, i) => ({
    n: 3 + Math.floor(i * 5 / 40),
    steps: 60 + i * 12,
    seed: (0x9e3779b9 ^ ((i + 1) * 0x85ebca6b)) >>> 0 || 1
  }));
  let lvl = 0, N = 3, sz = 80, b = [], z = 8, moves = 0, total = 0, cells = [], prev = -1;
  const hint = A.el('p', 'arena-hint', 'Clique numa peça vizinha do espaço vazio ou use as setas.', ui.body);
  const box = A.el('div', 'pz-board pz-slide', null, ui.body);

  const nbs = i => [i - N, i + N, i % N ? i - 1 : -1, i % N < N - 1 ? i + 1 : -1].filter(x => x >= 0 && x < N * N);
  const draw = () => {
    cells.forEach((c, i) => {
      const v = b[i];
      c.textContent = v || '';
      c.className = 'pz-tile pz-slide-tile' + (v ? '' : ' blank');
      c.style.setProperty('--h', v * 22);
      c.style.setProperty('--tile-size', sz * .42 + 'px');
    });
    setStat(movesEl, moves);
    setStat(gridEl, N + '×' + N);
    setStat(phaseEl, (lvl + 1) + '/40');
    hint.textContent = 'Fase ' + (lvl + 1) + ' de 40 · ' + moves + ' movimentos nesta fase.';
  };
  const go = i => {
    if (!nbs(z).includes(i)) return;
    [b[i], b[z]] = [b[z], b[i]]; z = i; moves++; total++; K.setScore(total); A.sfx('step'); draw();
    if (b.every((v, k) => v == (k + 1) % (N * N))) {
      if (lvl == LEVELS.length - 1) return K.over('Todas as fases! 🎉', total);
      K.banner('NÍVEL ' + (lvl + 2), LEVELS[lvl + 1].n + 'x' + LEVELS[lvl + 1].n); A.fx.confetti(110, true); lvl++; K.after(build, 800);
    }
  };
  const build = () => {
    const L = LEVELS[lvl]; N = L.n; sz = fit(N, 84, 70); moves = 0; prev = -1;
    b = Array.from({ length: N * N }, (_, i) => (i + 1) % (N * N)); z = N * N - 1;
    const random = A.rng(L.seed);
    for (let i = 0; i < L.steps; i++) {
      const o = nbs(z).filter(x => x != prev);
      const n = o[Math.floor(random() * o.length)];
      [b[z], b[n]] = [b[n], b[z]]; prev = z; z = n;
    }
    if (b.every((v, k) => v == (k + 1) % (N * N))) {
      [b[z], b[nbs(z)[0]]] = [b[nbs(z)[0]], b[z]]; z = nbs(z)[0];
    }
    box.style.setProperty('--cell', sz + 'px');
    box.style.setProperty('--cols', N);
    box.style.setProperty('--gap', '6px');
    box.innerHTML = '';
    cells = Array.from({ length: N * N }, (_, i) => {
      const c = A.el('button', 'pz-tile pz-slide-tile', '', box);
      c.type = 'button';
      c.onclick = () => go(i);
      return c;
    });
    draw();
  };
  K.onKey(c => { const d = { ArrowUp: N, ArrowDown: -N, ArrowLeft: 1, ArrowRight: -1 }[c]; if (!d) return; if ((d == 1 && z % N == N - 1) || (d == -1 && z % N == 0)) return; const i = z + d; if (i >= 0 && i < N * N) go(i); });
  K.pad('arrows'); build();
});

// Apague as Luzes: cada clique inverte a celula e as vizinhas; 40 fases.
A.register('lights', K => {
  K.low = true; K.fmt = n => n + ' mov.';
  const ui = A.arena(K, {
    icon: '💡', title: 'Apague as Luzes', kind: 'puzzle',
    sub: 'Cada clique inverte a luz e as vizinhas.'
  });
  const movesEl = A.arenaStat(ui.stats, 'Movimentos', '↔');
  const sizeEl = A.arenaStat(ui.stats, 'Tabuleiro', '🔳');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const LEVELS = Array.from({ length: 40 }, (_, i) => ({
    n: 3 + Math.floor(i * 5 / 39),
    clicks: 5 + Math.floor(i * 1.6),
    seed: (0x9e3779b9 ^ ((i + 1) * 0x85ebca6b)) >>> 0 || 1
  }));
  const hint = A.el('p', 'arena-hint', 'Apague todas as luzes usando o menor número de movimentos.', ui.body);
  const box = A.el('div', 'pz-board pz-lights', null, ui.body);
  let lvl = 0, N = 3, sz = 60, b = [], moves = 0, total = 0, cells = [];
  const draw = () => {
    cells.forEach((c, i) => {
      c.classList.toggle('on', !!b[i]);
      c.setAttribute('aria-label', 'Luz ' + (i + 1) + (b[i] ? ' acesa' : ' apagada'));
    });
    setStat(movesEl, moves);
    setStat(sizeEl, N + '×' + N);
    setStat(phaseEl, (lvl + 1) + '/40');
    hint.textContent = 'Fase ' + (lvl + 1) + ' de 40 · ' + moves + ' movimentos.';
  };
  const build = () => {
    const L = LEVELS[lvl]; N = L.n; moves = 0; sz = fit(N, 70, 70) - (N >= 7 ? 2 : 0);
    box.style.setProperty('--cell', sz + 'px');
    box.style.setProperty('--cols', N);
    box.style.setProperty('--gap', '8px');
    box.innerHTML = ''; b = Array(N * N).fill(0);
    const tog = i => { const x = i % N, y = Math.floor(i / N); [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const xx = x + dx, yy = y + dy; if (xx >= 0 && xx < N && yy >= 0 && yy < N) b[yy * N + xx] ^= 1; }); };
    const random = A.rng(L.seed);
    do { for (let i = 0; i < L.clicks; i++) tog(Math.floor(random() * N * N)); } while (!b.some(Boolean));
    cells = Array.from({ length: N * N }, (_, i) => {
      const c = A.el('button', 'pz-light', '', box);
      c.type = 'button';
      c.onclick = () => {
        tog(i); moves++; total++; K.setScore(total); A.sfx('click'); draw();
        if (!b.some(Boolean)) {
          if (lvl == LEVELS.length - 1) return K.over('Todas as fases! 💡', total);
          K.banner('NÍVEL ' + (lvl + 2), LEVELS[lvl + 1].n + 'x' + LEVELS[lvl + 1].n); A.fx.confetti(100, true); lvl++; K.after(build, 800);
        }
      };
      return c;
    });
    draw();
  };
  build();
});

// Inundacao: espalhe a cor do canto e cubra o tabuleiro dentro do limite de jogadas.
A.register('flood', K => {
  K.low = true; K.fmt = n => n + ' jog.';
  const ui = A.arena(K, {
    icon: '🌊', title: 'Inundação', kind: 'puzzle',
    sub: 'Espalhe a cor do canto e cubra o tabuleiro.'
  });
  const movesEl = A.arenaStat(ui.stats, 'Jogadas', '↔');
  const limitEl = A.arenaStat(ui.stats, 'Limite', '🎯');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const PAL = ['#ff4d6d', '#ffd23f', '#3ddc84', '#4c7dff', '#b05cff', '#ff9f43'];
  const LEVELS = Array.from({ length: 40 }, (_, i) => ({
    n: 8 + Math.floor(i * 13 / 39),
    colors: i < 18 ? 5 : 6,
    slack: i < 10 ? 4 : i < 26 ? 2 : 1,
    seed: (0x9e3779b9 ^ ((i + 1) * 0x85ebca6b)) >>> 0 || 1
  }));
  const hint = A.el('p', 'arena-hint', 'Escolha uma cor para inundar a região do canto superior esquerdo.', ui.body);
  const box = A.el('div', 'pz-board pz-flood', null, ui.body);
  const palette = A.el('div', 'pz-palette', '', ui.foot);
  let lvl = 0, N = 10, MAX = 25, sz = 30, b = [], moves = 0, total = 0, cells = [], colors = 5;

  const regionSize = (arr, probe) => {
    const old = arr[0], seen = new Uint8Array(N * N), st = [0]; seen[0] = 1;
    let size = 0;
    while (st.length) {
      const i = st.pop(); size++;
      const x = i % N, y = Math.floor(i / N);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const xx = x + dx, yy = y + dy, j = yy * N + xx;
        if (xx >= 0 && xx < N && yy >= 0 && yy < N && !seen[j] && (arr[j] == old || (probe != null && arr[j] == probe))) {
          seen[j] = 1; st.push(j);
        }
      });
    }
    return size;
  };
  const applyFlood = (arr, color) => {
    const old = arr[0], seen = new Uint8Array(N * N), st = [0]; seen[0] = 1;
    while (st.length) {
      const i = st.pop(); arr[i] = color;
      const x = i % N, y = Math.floor(i / N);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const xx = x + dx, yy = y + dy, j = yy * N + xx;
        if (xx >= 0 && xx < N && yy >= 0 && yy < N && !seen[j] && arr[j] == old) {
          seen[j] = 1; st.push(j);
        }
      });
    }
  };
  const solveLen = () => {
    const a = b.slice(); let m = 0;
    while (!a.every(v => v === a[0])) {
      const current = regionSize(a, null);
      let best = -1, bestGain = 0;
      for (let c = 0; c < colors; c++) {
        if (c === a[0]) continue;
        const gain = regionSize(a, c) - current;
        if (gain > bestGain) { bestGain = gain; best = c; }
      }
      if (best < 0 || !bestGain) return 999;
      applyFlood(a, best); m++;
      if (m > 120) return 999;
    }
    return m;
  };
  const draw = () => {
    cells.forEach((c, i) => c.style.setProperty('--c', PAL[b[i]]));
    setStat(movesEl, moves);
    setStat(limitEl, MAX);
    setStat(phaseEl, (lvl + 1) + '/40');
    hint.textContent = 'Fase ' + (lvl + 1) + ' de 40 · ' + moves + ' de ' + MAX + ' jogadas.';
  };
  const fill = nc => {
    const oc = b[0]; if (oc == nc) return; const st = [0], seen = new Set([0]);
    while (st.length) { const i = st.pop(); b[i] = nc; const x = i % N, y = Math.floor(i / N); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const xx = x + dx, yy = y + dy, j = yy * N + xx; if (xx >= 0 && xx < N && yy >= 0 && yy < N && !seen.has(j) && b[j] == oc) { seen.add(j); st.push(j); } }); }
    moves++; total++; K.setScore(total); A.sfx('pop'); draw();
    if (b.every(v => v == b[0])) {
      if (lvl == LEVELS.length - 1) return K.over('Inundou tudo! 🌊', total);
      K.banner('NÍVEL ' + (lvl + 2), LEVELS[lvl + 1].n + 'x' + LEVELS[lvl + 1].n); A.fx.confetti(110, true); lvl++; K.after(build, 800);
    } else if (moves >= MAX) K.over('Acabaram as jogadas', total, true);
  };
  const build = () => {
    const L = LEVELS[lvl]; N = L.n; colors = L.colors; moves = 0;
    sz = Math.max(10, Math.min(34, Math.floor((Math.min(innerWidth, 560) - 60) / N)));
    const random = A.rng(L.seed); let tries = 0, len = 999;
    do {
      b = Array.from({ length: N * N }, () => Math.floor(random() * colors));
      len = solveLen();
    } while ((len === 999 || b.every(v => v === b[0])) && ++tries < 12);
    MAX = len === 999 ? N * 2 : Math.max(6, len + L.slack);
    box.style.setProperty('--cell', sz + 'px');
    box.style.setProperty('--cols', N);
    box.style.setProperty('--gap', '2px');
    box.innerHTML = '';
    cells = b.map(() => A.el('div', 'pz-flood-cell', '', box)); draw();
  };
  PAL.forEach((c, i) => {
    const bt = A.el('button', 'pz-color', '', palette);
    bt.type = 'button';
    bt.style.setProperty('--c', c);
    bt.setAttribute('aria-label', 'Cor ' + (i + 1));
    bt.onclick = () => fill(i);
  });
  build();
});

// Torre de Hanoi: mova os discos sem colocar um maior sobre um menor.
A.register('hanoi', K => {
  K.low = true; K.fmt = n => n + ' mov.';
  const ui = A.arena(K, {
    icon: '🗼', title: 'Torre de Hanói', kind: 'puzzle',
    sub: 'Mova a torre sem colocar disco maior sobre menor.'
  });
  const movesEl = A.arenaStat(ui.stats, 'Movimentos', '↔');
  const discsEl = A.arenaStat(ui.stats, 'Discos', '⚪');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const LEVELS = Array.from({ length: 40 }, (_, i) => {
    const d = 3 + Math.floor(i / 6);
    const start = i % 3;
    return { d, start, target: (start + (i % 2 ? 1 : 2)) % 3 };
  });
  let lvl = 0, D = 3, startPeg = 0, targetPeg = 2, pegs = [[], [], []], sel = -1, moves = 0, total = 0;
  const hint = A.el('p', 'arena-hint', 'Clique numa torre e depois na outra. Só o disco do topo se move.', ui.body);
  const wrap = A.el('div', 'pz-hanoi', '', ui.body);
  const els = [0, 1, 2].map(p => {
    const e = A.el('button', 'pz-peg', '', wrap);
    e.type = 'button';
    e.onclick = () => click(p);
    return e;
  });
  const upd = () => {
    setStat(movesEl, moves);
    setStat(discsEl, D);
    setStat(phaseEl, (lvl + 1) + '/40');
    hint.textContent = 'Fase ' + (lvl + 1) + ' de 40 · ' + ['A', 'B', 'C'][startPeg] + ' → ' + ['A', 'B', 'C'][targetPeg] + ' · ' + moves + ' movimentos.';
  };
  const draw = () => els.forEach((e, p) => {
    e.classList.toggle('sel', sel == p);
    e.classList.toggle('target', p == targetPeg);
    e.innerHTML = pegs[p].map(d => '<span class="pz-disc" style="--h:' + d * 55 + ';width:' + (28 + d * 15) + '%"></span>').join('');
  });
  const build = () => {
    const L = LEVELS[lvl]; D = L.d; startPeg = L.start; targetPeg = L.target;
    pegs = [[], [], []]; pegs[startPeg] = Array.from({ length: D }, (_, i) => D - i);
    sel = -1; moves = 0; draw(); upd();
  };
  const click = p => {
    if (sel < 0) { if (pegs[p].length) sel = p; } else {
      const t = pegs[sel][pegs[sel].length - 1], top = pegs[p][pegs[p].length - 1];
      if (sel != p && (!top || t < top)) {
        pegs[p].push(pegs[sel].pop()); moves++; total++; K.setScore(total); A.sfx('step');
        if (pegs[targetPeg].length == D) {
          sel = -1; draw();
          if (lvl == LEVELS.length - 1) return K.over('Todas as torres! 🏆', total);
          K.banner('NÍVEL ' + (lvl + 2), LEVELS[lvl + 1].d + ' discos'); A.fx.confetti(110, true); lvl++; K.after(build, 800); return;
        }
      } sel = -1;
    }
    draw(); upd();
  };
  build();
});

// Resta Um: campanha de 40 tabuleiros gerados de tras para frente.
A.register('pegs', K => {
  K.low = true; K.fmt = n => n + ' mov.';
  const ui = A.arena(K, {
    icon: '📍', title: 'Resta Um', kind: 'puzzle',
    sub: 'Salte pinos e termine com apenas um no tabuleiro.'
  });
  const leftEl = A.arenaStat(ui.stats, 'Pinos', '📍');
  const movesEl = A.arenaStat(ui.stats, 'Movimentos', '↔');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const C = A.campaign(K, 40);
  const sz = fit(7, 56, 110);
  const ok = (x, y) => x >= 0 && x < 7 && y >= 0 && y < 7 && !((x < 2 || x > 4) && (y < 2 || y > 4));
  const POS = [];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (ok(x, y)) POS.push([x, y]);
  const key = (x, y) => x + ',' + y;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const gen = (seed, target) => {
    for (let att = 0; att < 3000; att++) {
      const random = A.rng((seed + att * 0x9e3779b1) >>> 0 || 1);
      const final = POS[Math.floor(random() * POS.length)];
      const occ = new Set([key(final[0], final[1])]);
      for (let step = 1; step < target; step++) {
        const moves = [];
        for (const k of occ) {
          const [cx, cy] = k.split(',').map(Number);
          for (const [dx, dy] of DIRS) {
            const bx = cx + dx, by = cy + dy, ax = cx + 2 * dx, ay = cy + 2 * dy;
            if (ok(ax, ay) && ok(bx, by) && !occ.has(key(ax, ay)) && !occ.has(key(bx, by))) moves.push([k, ax, ay, bx, by]);
          }
        }
        if (!moves.length) break;
        const m = moves[Math.floor(random() * moves.length)];
        occ.delete(m[0]); occ.add(key(m[1], m[2])); occ.add(key(m[3], m[4]));
      }
      if (occ.size >= target) return occ;
    }
    return null;
  };
  const classic = () => new Set(POS.filter(([x, y]) => !(x === 3 && y === 3)).map(([x, y]) => key(x, y)));
  const hint = A.el('p', 'arena-hint', 'Clique num pino e depois no buraco destino, saltando sobre outro pino.', ui.body);
  const box = A.el('div', 'pz-board pz-pegs', null, ui.body);
  const cells = []; for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const c = A.el('button', 'pz-hole', '', box); c.type = 'button'; cells.push([x, y, c]); c.onclick = () => click(x, y); }
  let b = {}, sel = null, left = 0, totalMoves = 0, locked = false;
  const jumps = () => { for (const k in b) if (b[k]) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of DIRS) if (ok(x + 2 * dx, y + 2 * dy) && b[(x + dx) + ',' + (y + dy)] && b[(x + 2 * dx) + ',' + (y + 2 * dy)] === 0) return true; } return false; };
  const draw = () => cells.forEach(([x, y, c]) => {
    if (!ok(x, y)) { c.className = 'pz-hole void'; return; }
    const k = x + ',' + y;
    c.className = 'pz-hole' + (b[k] ? ' peg' : '') + (sel == k ? ' sel' : '');
  });
  const upd = () => {
    setStat(leftEl, left);
    setStat(movesEl, totalMoves);
    setStat(phaseEl, C.level + '/40');
    hint.textContent = C.tag + ' · ' + left + ' pinos restantes · ' + totalMoves + ' movimentos.';
  };
  const build = () => {
    const target = C.level === 40 ? 32 : C.level === 39 ? 31 : C.level === 38 ? 30 : 8 + Math.floor((C.level - 1) * 23 / 37);
    const seed = (0x9e3779b9 ^ (C.level * 0x85ebca6b)) >>> 0 || 1;
    const occ = target === 32 ? classic() : (gen(seed, target) || classic());
    b = {}; POS.forEach(([x, y]) => b[key(x, y)] = occ.has(key(x, y)) ? 1 : 0);
    left = occ.size; sel = null; locked = false;
    box.style.setProperty('--cell', sz + 'px');
    box.style.setProperty('--cols', 7);
    box.style.setProperty('--gap', '4px');
    draw(); upd();
  };
  const click = (x, y) => {
    if (locked) return;
    const k = x + ',' + y;
    if (b[k]) sel = sel == k ? null : k;
    else if (sel) {
      const [sx, sy] = sel.split(',').map(Number), dx = x - sx, dy = y - sy, mid = (sx + dx / 2) + ',' + (sy + dy / 2);
      if (((Math.abs(dx) == 2 && !dy) || (Math.abs(dy) == 2 && !dx)) && b[mid]) {
        b[sel] = 0; b[mid] = 0; b[k] = 1; sel = null; left--; totalMoves++; K.setScore(totalMoves); A.sfx('pop'); draw(); upd();
        if (left === 1) {
          if (C.last) return C.finish('Campanha completa! 🏆', totalMoves);
          locked = true;
          C.advance('Novo tabuleiro', () => K.after(build, 700)); return;
        }
        if (!jumps()) return K.over('Sem movimentos na fase ' + C.level, totalMoves, true);
      }
    }
    draw(); upd();
  };
  build();
});
})();
