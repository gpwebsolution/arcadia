/* =============================================================================
   ARCADIA - PUZZLES (parte 2)
   -----------------------------------------------------------------------------
   Jogos deste arquivo: Sudoku, Doces em Fila (match-3), Tubos de Cor,
   Empurra Caixas e Caca-Palavras. Tambem usam DOM + a funcao fit() para
   manter as grades proporcionais em qualquer tela.

   O visual segue a arena compartilhada (A.arena), com cabecalho, estatisticas,
   tabuleiro e rodape com a marca GPWeb.
   ============================================================================= */
(function () {
const A = Arcadia;
const fit = (n, max, pad) => Math.max(22, Math.min(max, Math.floor((Math.min(innerWidth, 560) - (pad || 60)) / n)));
const setStat = (el, value) => { if (el && el.textContent !== String(value)) el.textContent = value; };

// Sudoku: campanha de 40 grades com mais lacunas a cada fase.
A.register('sudoku', K => {
  K.low = true; K.fmt = n => n + 's';
  const ui = A.arena(K, {
    icon: '🧮', title: 'Sudoku', kind: 'puzzle',
    sub: 'Preencha 1–9 sem repetir em linhas, colunas e quadrados.'
  });
  const timeEl = A.arenaStat(ui.stats, 'Tempo', '⏱');
  const emptyEl = A.arenaStat(ui.stats, 'Vazias', '▢');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const C = A.campaign(K, 40);
  const sz = fit(9, 44, 90);
  const hint = A.el('p', 'arena-hint', 'Selecione uma célula e use o teclado numérico ou os botões.', ui.body);
  const box = A.el('div', 'pz-board pz-sudoku', null, ui.body);
  const pad = A.el('div', 'pz-numpad', '', ui.foot);
  let g, given, sel = null, t = 0, started = false, locked = false, cells = [];
  const sh = (arr, random) => { const copy = arr.slice(); for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };
  const bad = (r, c) => { const v = g[r][c]; if (!v) return false; for (let i = 0; i < 9; i++) { if (i != c && g[r][i] == v) return true; if (i != r && g[i][c] == v) return true; } const br = r - r % 3, bc = c - c % 3; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if ((br + i != r || bc + j != c) && g[br + i][bc + j] == v) return true; return false; };
  const emptyCount = () => g.reduce((total, row) => total + row.filter(v => !v).length, 0);
  const draw = () => {
    cells.forEach((b, i) => {
      const r = Math.floor(i / 9), c = i % 9, v = g[r][c];
      const isSel = sel && sel[0] == r && sel[1] == c;
      const rel = sel && !isSel && (sel[0] == r || sel[1] == c || (Math.floor(sel[0] / 3) == Math.floor(r / 3) && Math.floor(sel[1] / 3) == Math.floor(c / 3)));
      b.textContent = v || '';
      b.className = 'pz-sq' + (given[r][c] ? ' given' : '') + (isSel ? ' sel' : '') + (rel ? ' rel' : '') + (bad(r, c) ? ' bad' : '') + (c % 3 == 2 && c < 8 ? ' br' : '') + (r % 3 == 2 && r < 8 ? ' bb' : '');
    });
    setStat(timeEl, t + 's');
    setStat(emptyEl, emptyCount());
    setStat(phaseEl, C.level + '/40');
    hint.textContent = C.tag + ' · ' + emptyCount() + ' células em branco.';
  };
  const build = () => {
    const random = A.rng((0x9e3779b9 ^ (C.level * 0x85ebca6b)) >>> 0 || 1);
    const grp = () => sh([0, 1, 2], random).flatMap(g => sh([0, 1, 2], random).map(r => g * 3 + r));
    const rs = grp(), cs = grp(), ns = sh([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
    const sol = rs.map(r => cs.map(c => ns[(r * 3 + Math.floor(r / 3) + c) % 9]));
    g = sol.map(r => r.slice()); given = Array.from({ length: 9 }, () => Array(9).fill(true));
    const remove = 36 + Math.floor((C.level - 1) * 14 / 39); let removed = 0;
    while (removed < remove) { const r = Math.floor(random() * 9), c = Math.floor(random() * 9); if (g[r][c]) { g[r][c] = 0; given[r][c] = false; removed++; } }
    sel = null; locked = false; started = false; t = 0;
    box.style.setProperty('--cell', sz + 'px');
    box.style.setProperty('--cols', 9);
    box.innerHTML = ''; cells = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const b = A.el('button', 'pz-sq', '', box);
      b.type = 'button';
      b.onclick = () => { if (locked) return; sel = [r, c]; A.sfx('click'); draw(); };
      cells.push(b);
    }
    draw();
  };
  const put = v => {
    if (locked || !sel || given[sel[0]][sel[1]]) return;
    if (!started) { started = true; K.every(() => { t++; K.setScore(t); draw(); }, 1000); }
    g[sel[0]][sel[1]] = v; A.sfx('click'); draw();
    if (g.every((row, r) => row.every((x, c) => x && !bad(r, c)))) {
      if (C.last) return C.finish('Campanha completa! 🧩', t);
      locked = true;
      C.advance('Mais lacunas', () => K.after(build, 700));
    }
  };
  for (let i = 1; i <= 9; i++) {
    const b = A.el('button', 'pz-num', i, pad);
    b.type = 'button';
    b.onclick = () => put(i);
  }
  const erase = A.el('button', 'pz-num erase', '⌫', pad);
  erase.type = 'button';
  erase.onclick = () => put(0);
  K.on(window, 'keydown', e => { if (/^[1-9]$/.test(e.key)) put(+e.key); else if (e.key == 'Backspace' || e.key == 'Delete' || e.key == '0') put(0); else if (sel && !locked) { const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key]; if (d) { sel = [A.clamp(sel[0] + d[0], 0, 8), A.clamp(sel[1] + d[1], 0, 8)]; draw(); } } });
  build();
});

// Doces em Fila: troque vizinhos para formar tres ou mais; combos caem em cascata.
A.register('match3', K => {
  const ui = A.arena(K, {
    icon: '🍬', title: 'Doces em Fila', kind: 'puzzle',
    sub: 'Troque doces vizinhos e forme filas de três ou mais.'
  });
  const movesEl = A.arenaStat(ui.stats, 'Jogadas', '↔');
  const metaEl = A.arenaStat(ui.stats, 'Meta', '🎯');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const N = 8, G = ['🍎', '🍋', '🍇', '🍬', '🍓', '🥝'], sz = fit(N, 54, 110);
  const LEVELS = Array.from({ length: 40 }, (_, i) => ({
    moves: 20 + Math.floor(i * .35),
    target: Math.round((250 + i * 160 + i * i * 2.2) / 50) * 50,
    seed: (0x9e3779b9 ^ ((i + 1) * 0x85ebca6b)) >>> 0 || 1
  }));
  let b, sel = -1, busy = false, lvl = 0, moves = 20, earned = 0, target = 250, cells = [];
  const hint = A.el('p', 'arena-hint', 'Clique num doce e depois num vizinho para trocar.', ui.body);
  const box = A.el('div', 'pz-board pz-match', null, ui.body);
  const matches = () => { const s = new Set(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, v = b[i]; if (v < 0) continue; if (x < N - 2 && b[i + 1] == v && b[i + 2] == v) [0, 1, 2].forEach(k => s.add(i + k)); if (y < N - 2 && b[i + N] == v && b[i + 2 * N] == v) [0, 1, 2].forEach(k => s.add(i + k * N)); } return s; };
  const draw = () => {
    cells.forEach((c, i) => {
      c.textContent = b[i] < 0 ? '' : G[b[i]];
      c.className = 'pz-candy' + (sel == i ? ' sel' : '') + (b[i] < 0 ? ' gone' : '');
    });
    setStat(movesEl, moves);
    setStat(metaEl, earned + '/' + target);
    setStat(phaseEl, (lvl + 1) + '/40');
    hint.textContent = 'Nível ' + (lvl + 1) + ' de 40 · ' + moves + ' jogadas · meta ' + target + ' pontos.';
  };
  const levelUp = () => { if (lvl == LEVELS.length - 1) return K.over('Todas as fases! 🎉', K.score); lvl++; K.banner('NÍVEL ' + (lvl + 1), 'Nova meta: ' + LEVELS[lvl].target); A.fx.confetti(120, true); K.after(newBoard, 700); };
  const newBoard = () => {
    const L = LEVELS[lvl]; moves = L.moves; target = L.target; earned = 0; sel = -1; busy = false;
    const random = A.rng(L.seed);
    do b = Array.from({ length: N * N }, () => Math.floor(random() * 6)); while (matches().size);
    box.style.setProperty('--cell', sz + 'px');
    box.style.setProperty('--cols', N);
    box.style.setProperty('--gap', '3px');
    box.innerHTML = '';
    cells = b.map((_, i) => {
      const c = A.el('button', 'pz-candy', '', box);
      c.type = 'button';
      c.onclick = () => click(i);
      return c;
    });
    draw();
  };
  const settle = (combo) => {
    const m = matches(); if (!m.size) { busy = false; if (earned >= target) return levelUp(); if (moves <= 0) K.after(() => K.over('Sem jogadas!'), 400); return; }
    m.forEach(i => b[i] = -1); const pts = m.size * 10 * combo; earned += pts; K.addScore(pts); A.sfx('pop'); draw();
    K.after(() => { for (let x = 0; x < N; x++) { let col = []; for (let y = N - 1; y >= 0; y--) if (b[y * N + x] >= 0) col.push(b[y * N + x]); while (col.length < N) col.push(A.rand(0, 5)); for (let y = N - 1, k = 0; y >= 0; y--, k++) b[y * N + x] = col[k]; } draw(); K.after(() => settle(combo + 1), 300); }, 280);
  };
  const click = i => {
    if (busy) return; if (sel < 0) { sel = i; A.sfx('click'); draw(); return; }
    const d = Math.abs(i - sel), ok = (d == 1 && Math.floor(i / N) == Math.floor(sel / N)) || d == N; if (!ok) { sel = i; draw(); return; }
    [b[i], b[sel]] = [b[sel], b[i]]; const a = sel; sel = -1; busy = true;
    if (matches().size) { moves--; draw(); K.after(() => settle(1), 150); } else { draw(); K.after(() => { [b[i], b[a]] = [b[a], b[i]]; busy = false; draw(); A.sfx('hit'); }, 250); }
  };
  newBoard();
});

// Tubos de Cor: mova as cores entre tubos ate cada tubo ficar com uma cor so.
A.register('colorsort', K => {
  K.low = true; K.fmt = n => n + ' mov.';
  const ui = A.arena(K, {
    icon: '🧪', title: 'Tubos de Cor', kind: 'puzzle',
    sub: 'Separe as cores, uma cor por tubo.'
  });
  const movesEl = A.arenaStat(ui.stats, 'Movimentos', '↔');
  const colorsEl = A.arenaStat(ui.stats, 'Cores', '🎨');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const PAL = ['#ff4d6d', '#ffd23f', '#3ddc84', '#4c7dff', '#b05cff', '#ff9f43', '#00e0f0', '#e5e7eb', '#ff6ec7', '#8a7dff'];
  const LEVELS = Array.from({ length: 40 }, (_, i) => ({
    colors: 4 + Math.floor(i * 6 / 39),
    seed: (0x9e3779b9 ^ ((i + 1) * 0x85ebca6b)) >>> 0 || 1
  }));
  const hint = A.el('p', 'arena-hint', 'Clique num tubo e depois no destino. Só despeje sobre a mesma cor ou num tubo vazio.', ui.body);
  const row = A.el('div', 'pz-tubes', '', ui.body);
  let lvl = 0, NC = 4, tubes = [], sel = -1, moves = 0, total = 0, els = [];
  const upd = () => {
    setStat(movesEl, moves);
    setStat(colorsEl, NC);
    setStat(phaseEl, (lvl + 1) + '/40');
    hint.textContent = 'Nível ' + (lvl + 1) + ' de 40 · ' + moves + ' movimentos.';
  };
  const draw = () => els.forEach((e, i) => {
    e.classList.toggle('sel', sel == i);
    e.innerHTML = tubes[i].map(c => '<span class="pz-fluid" style="--c:' + PAL[c] + '"></span>').join('');
  });
  const build = () => {
    const L = LEVELS[lvl]; NC = L.colors; moves = 0; sel = -1; row.innerHTML = '';
    const units = A.seededShuffle(Array.from({ length: NC * 4 }, (_, i) => i % NC), L.seed);
    tubes = Array.from({ length: NC + 2 }, (_, i) => i < NC ? units.slice(i * 4, i * 4 + 4) : []);
    els = tubes.map((_, i) => {
      const e = A.el('button', 'pz-tube', '', row);
      e.type = 'button';
      e.onclick = () => click(i);
      return e;
    });
    draw(); upd();
  };
  const click = i => {
    if (sel < 0) { if (tubes[i].length) sel = i; A.sfx('click'); draw(); return; }
    if (sel != i) { const f = tubes[sel], t = tubes[i], c = f[f.length - 1]; if (t.length < 4 && (!t.length || t[t.length - 1] == c)) { while (f.length && f[f.length - 1] == c && t.length < 4) t.push(f.pop()); moves++; total++; K.setScore(total); A.sfx('pop'); } }
    sel = -1; draw(); upd();
    if (tubes.every(t => !t.length || (t.length == 4 && t.every(c => c == t[0])))) {
      if (lvl == LEVELS.length - 1) return K.over('Todas as fases! 🧪', total);
      K.banner('NÍVEL ' + (lvl + 2), LEVELS[lvl + 1].colors + ' cores'); A.fx.confetti(110, true); lvl++; K.after(build, 800);
    }
  };
  build();
});

const sokobanLevel = (seed, boxCount, W, H, wallCount) => {
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = (x, y) => x + ',' + y;
  for (let attempt = 0; attempt < 60; attempt++) {
    const rand = A.rng((seed + attempt * 0x9e3779b1) >>> 0 || 1);
    const grid = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? '#' : ' '));
    const interior = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) interior.push([x, y]);
    const order = interior.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const walls = new Set();
    for (let i = 0; i < wallCount && i < order.length; i++) {
      const [x, y] = order[i];
      if (x > 1 && y > 1 && x < W - 2 && y < H - 2) { walls.add(key(x, y)); grid[y][x] = '#'; }
    }
    const free = interior.filter(([x, y]) => !walls.has(key(x, y)));
    if (free.length < boxCount + 5) continue;
    const goals = free.slice(0, boxCount);
    const boxes = new Set(goals.map(([x, y]) => key(x, y)));
    const starts = [];
    for (const [bx, by] of goals) for (const [dx, dy] of DIRS) {
      const px = bx - dx, py = by - dy, qx = bx - 2 * dx, qy = by - 2 * dy;
      if (px > 0 && py > 0 && px < W - 1 && py < H - 1 && qx > 0 && qy > 0 && qx < W - 1 && qy < H - 1 &&
          !walls.has(key(px, py)) && !walls.has(key(qx, qy)) && !boxes.has(key(px, py)) && !boxes.has(key(qx, qy))) {
        starts.push([px, py]);
      }
    }
    if (!starts.length) continue;
    let player = starts[Math.floor(rand() * starts.length)];
    const pulls = 12 + boxCount * 8 + Math.floor(rand() * 6);
    let steps = 0, done = 0;
    while (done < pulls && steps < pulls * 24) {
      steps++;
      const options = [];
      for (const bkey of boxes) {
        const [bx, by] = bkey.split(',').map(Number);
        for (const [dx, dy] of DIRS) {
          if (bx !== player[0] + dx || by !== player[1] + dy) continue;
          const nx = player[0] - dx, ny = player[1] - dy;
          if (nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && !walls.has(key(nx, ny)) && !boxes.has(key(nx, ny))) {
            options.push({ b: bkey, nx, ny });
          }
        }
      }
      if (options.length) {
        const o = options[Math.floor(rand() * options.length)];
        boxes.delete(o.b);
        boxes.add(key(player[0], player[1]));
        player = [o.nx, o.ny];
        done++;
      } else {
        const moves = DIRS.map(([dx, dy]) => [player[0] + dx, player[1] + dy]).filter(([x, y]) =>
          x > 0 && y > 0 && x < W - 1 && y < H - 1 && !walls.has(key(x, y)) && !boxes.has(key(x, y)));
        if (!moves.length) break;
        player = moves[Math.floor(rand() * moves.length)];
      }
    }
    if (done < pulls * .6) continue;
    const goalSet = new Set(goals.map(([x, y]) => key(x, y)));
    if ([...boxes].every(k => goalSet.has(k))) continue;
    return Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
      const k = key(x, y);
      if (walls.has(k)) return '#';
      const isBox = boxes.has(k), isGoal = goalSet.has(k), isPlayer = player[0] === x && player[1] === y;
      if (isPlayer) return isGoal ? '+' : '@';
      if (isBox) return isGoal ? '*' : '$';
      return isGoal ? '.' : ' ';
    }).join(''));
  }
  return null;
};

// Empurra Caixas: 40 niveis; empurre cada caixa para uma meta, com desfazer.
A.register('sokoban', K => {
  const ui = A.arena(K, {
    icon: '📦', title: 'Empurra Caixas', kind: 'puzzle',
    sub: 'Empurre cada caixa até um ponto marcado.'
  });
  const movesEl = A.arenaStat(ui.stats, 'Movimentos', '↔');
  const boxesEl = A.arenaStat(ui.stats, 'Caixas', '📦');
  const phaseEl = A.arenaStat(ui.stats, 'Nível', '📖');

  const LV = [
    ['#######', '#.    #', '# $   #', '#  @  #', '#######'],
    ['########', '#      #', '# $ $  #', '# .@.  #', '########'],
    ['#######', '#  .  #', '# $$  #', '#  .@ #', '#######'],
    ['########', '#   #  #', '# $ .$ #', '#   #. #', '#  @   #', '########'],
    ['########', '#  .   #', '# $ $  #', '#  @ . #', '#  $ . #', '########'],
    ['########', '#  . . #', '#  $ $ #', '#  @   #', '########'],
    ['##########', '#   .    #', '#        #', '#   $    #', '#   @    #', '##########'],
    ['#########', '#   .   #', '#   $   #', '# . $ @ #', '#       #', '#########'],
    ['#########', '# . . . #', '# $ $ $ #', '#   @   #', '#########'],
    ['########', '#.     #', '#  $   #', '#   @  #', '#      #', '########'],
    ['########', '#  .   #', '#  $ # #', '#  . $ #', '#   @  #', '########'],
    ['##########', '# . . .  #', '# $ $ $  #', '#   @    #', '#        #', '##########']
  ];
  for (let i = 0, attempt = 0; LV.length < 40 && attempt < 160; attempt++) {
    i = LV.length - 12;
    const boxes = 2 + Math.floor(i / 7);
    const W = 7 + Math.floor(i / 10), H = 5 + Math.floor(i / 7);
    const level = sokobanLevel((0x9e3779b9 ^ ((i + 13) * 0x85ebca6b) ^ (attempt * 0x27d4eb2f)) >>> 0 || 1, boxes, W, H, Math.floor(i / 12));
    if (level) LV.push(level);
  }
  let li = 0, W, goals, boxes, p, hist = [], moves = 0, sz = fit(8, 54, 60);
  const hint = A.el('p', 'arena-hint', 'Use as setas, WASD ou deslize. Z desfaz.', ui.body);
  const box = A.el('div', 'pz-board pz-soko', '', ui.body);
  const undoBtn = A.el('button', 'arena-btn ghost', '↶ Desfazer', ui.foot);
  undoBtn.type = 'button';
  undoBtn.onclick = () => undo();
  const restartBtn = A.el('button', 'arena-btn ghost', '↻ Reiniciar', ui.foot);
  restartBtn.type = 'button';
  restartBtn.onclick = () => load();

  const load = () => {
    const L = LV[li]; W = new Set(); goals = new Set(); boxes = new Set(); hist = []; moves = 0;
    sz = fit(L[0].length, 54, 60);
    L.forEach((r, y) => [...r].forEach((c, x) => { const k = x + ',' + y; if (c == '#') W.add(k); if (c == '.' || c == '+' || c == '*') goals.add(k); if (c == '$' || c == '*') boxes.add(k); if (c == '@' || c == '+') p = [x, y]; }));
    draw();
  };
  const draw = () => {
    const L = LV[li], w = L[0].length;
    box.style.setProperty('--cell', sz + 'px');
    box.style.setProperty('--cols', w);
    box.innerHTML = '';
    L.forEach((r, y) => [...r].forEach((_, x) => {
      const k = x + ',' + y, e = A.el('div', 'pz-soko-cell', '', box);
      if (W.has(k)) e.classList.add('wall');
      else if (goals.has(k)) e.classList.add('goal');
      if (boxes.has(k)) e.classList.add('box', goals.has(k) ? 'on' : 'off');
      if (p[0] == x && p[1] == y) e.classList.add('player');
      e.textContent = W.has(k) ? '' : (p[0] == x && p[1] == y) ? '🧑' : boxes.has(k) ? (goals.has(k) ? '✅' : '📦') : goals.has(k) ? '🎯' : '';
    }));
    setStat(movesEl, moves);
    setStat(boxesEl, [...goals].filter(g => boxes.has(g)).length + '/' + goals.size);
    setStat(phaseEl, (li + 1) + '/' + LV.length);
    hint.textContent = 'Nível ' + (li + 1) + ' de ' + LV.length + ' · ' + moves + ' movimentos.';
  };
  const undo = () => { const h = hist.pop(); if (!h) return; p = h.p; boxes = h.b; moves--; A.sfx('click'); draw(); };
  const move = (dx, dy) => {
    const nx = p[0] + dx, ny = p[1] + dy, k = nx + ',' + ny; if (W.has(k)) return; const nb = new Set(boxes);
    if (nb.has(k)) { const bk = (nx + dx) + ',' + (ny + dy); if (W.has(bk) || nb.has(bk)) return; nb.delete(k); nb.add(bk); }
    hist.push({ p: p.slice(), b: boxes }); boxes = nb; p = [nx, ny]; moves++; A.sfx('step'); draw();
    if ([...goals].every(g => boxes.has(g))) {
      K.addScore(100); A.sfx('win'); A.fx.confetti(120, true); li++;
      if (li >= LV.length) return K.over('Todos os níveis! 🏆');
      K.banner('NÍVEL ' + (li + 1) + '/' + LV.length, 'Bem jogado!'); K.after(load, 600);
    }
  };
  K.onKey(c => { const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[c]; if (m) move(...m); });
  K.on(window, 'keydown', e => { if (e.key == 'z' || e.key == 'u') undo(); });
  K.pad('arrows'); K.swipe(); load();
});

// Caca-Palavras: campanha de 40 grades com mais palavras e direcoes.
A.register('wordsearch', K => {
  K.low = true; K.fmt = n => n + 's';
  const ui = A.arena(K, {
    icon: '🔎', title: 'Caça-Palavras', kind: 'puzzle',
    sub: 'Encontre todas as palavras escondidas na grade.'
  });
  const timeEl = A.arenaStat(ui.stats, 'Tempo', '⏱');
  const wordsEl = A.arenaStat(ui.stats, 'Palavras', '🔤');
  const phaseEl = A.arenaStat(ui.stats, 'Fase', '📖');

  const C = A.campaign(K, 40);
  const POOL = ['CASA', 'GATO', 'BOLA', 'LIVRO', 'PRAIA', 'MUNDO', 'FESTA', 'JOGAR', 'NUVEM', 'PEIXE', 'TIGRE', 'ZEBRA', 'PIANO', 'ROUPA', 'SONHO', 'VENTO', 'TERRA', 'RADIO', 'AMIGO', 'CIDADE', 'FLOR', 'ESCOLA', 'JANELA', 'MUSICA', 'NOITE', 'CAMPO'];
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1]];
  let N = 10, sz = 32, words = [], g = [], found = new Set(), hl = new Set(), a = -1, t = 0, started = false, locked = false, cells = [];
  const hint = A.el('p', 'arena-hint', 'Toque na primeira e na última letra da palavra.', ui.body);
  const list = A.el('div', 'pz-words', '', ui.body);
  const box = A.el('div', 'pz-board pz-word', null, ui.body);
  const make = (seed, n, count, dirs) => {
    for (let att = 0; att < 80; att++) {
      const random = A.rng((seed + att * 0x9e3779b1) >>> 0 || 1);
      const picked = A.seededShuffle(POOL, (seed + att * 0x27d4eb2f) >>> 0 || 1).slice(0, count);
      const grid = Array(n * n).fill('');
      let ok = true;
      for (const w of picked) {
        let placed = false;
        for (let tries = 0; tries < 400 && !placed; tries++) {
          const [dx, dy] = dirs[Math.floor(random() * dirs.length)];
          const x = Math.floor(random() * n), y = Math.floor(random() * n);
          const ex = x + dx * (w.length - 1), ey = y + dy * (w.length - 1);
          if (ex < 0 || ex >= n || ey < 0 || ey >= n) continue;
          const cs = Array.from({ length: w.length }, (_, i) => (y + dy * i) * n + x + dx * i);
          if (cs.every((c, i) => !grid[c] || grid[c] === w[i])) { cs.forEach((c, i) => grid[c] = w[i]); placed = true; }
        }
        if (!placed) { ok = false; break; }
      }
      if (ok) { for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = String.fromCharCode(65 + Math.floor(random() * 26)); return { grid, picked }; }
    }
    return null;
  };
  const draw = () => {
    cells.forEach((c, i) => {
      c.textContent = g[i];
      c.className = 'pz-letter' + (a == i ? ' sel' : '') + (hl.has(i) ? ' found' : '');
    });
    list.innerHTML = words.map(w => '<span class="pz-word' + (found.has(w) ? ' found' : '') + '">' + w + '</span>').join('');
    setStat(timeEl, t + 's');
    setStat(wordsEl, found.size + '/' + words.length);
    setStat(phaseEl, C.level + '/40');
    hint.textContent = C.tag + ' · encontre ' + words.length + ' palavras.';
  };
  const build = () => {
    const lvl = C.level;
    N = 9 + Math.floor((lvl - 1) * 5 / 39);
    const count = 4 + Math.floor((lvl - 1) * 6 / 39);
    const dirs = lvl <= 10 ? DIRS.slice(0, 2) : lvl <= 22 ? DIRS.slice(0, 4) : DIRS;
    const seed = (0x9e3779b9 ^ (lvl * 0x85ebca6b)) >>> 0 || 1;
    const made = make(seed, N, count, dirs) || make(seed ^ 0x9e3779b9, N, Math.min(count, 6), DIRS.slice(0, 2));
    words = made ? made.picked : []; g = made ? made.grid : Array(N * N).fill('A');
    found = new Set(); hl = new Set(); a = -1; locked = false; started = false; t = 0;
    sz = Math.max(18, Math.min(38, Math.floor((Math.min(innerWidth, 560) - 100) / N)));
    box.style.setProperty('--cell', sz + 'px');
    box.style.setProperty('--cols', N);
    box.style.setProperty('--gap', '2px');
    box.innerHTML = '';
    cells = g.map((_, i) => {
      const c = A.el('button', 'pz-letter', '', box);
      c.type = 'button';
      c.onclick = () => click(i);
      return c;
    });
    draw();
  };
  const click = i => {
    if (locked) return;
    if (!started) { started = true; K.every(() => { t++; K.setScore(t); draw(); }, 1000); }
    if (a < 0) { a = i; A.sfx('click'); draw(); return; }
    const x1 = a % N, y1 = Math.floor(a / N), x2 = i % N, y2 = Math.floor(i / N), dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1), L = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)); a = -1;
    if (L && (x2 - x1 == 0 || y2 - y1 == 0 || Math.abs(x2 - x1) == Math.abs(y2 - y1))) {
      const cs = Array.from({ length: L + 1 }, (_, k) => (y1 + dy * k) * N + x1 + dx * k), s = cs.map(c => g[c]).join(''), w = words.find(w => w == s || w == [...s].reverse().join(''));
      if (w && !found.has(w)) {
        found.add(w); cs.forEach(c => hl.add(c)); A.sfx('coin');
        if (found.size == words.length) {
          draw();
          if (C.last) return C.finish('Campanha completa! 🔎', t);
          locked = true;
          C.advance('Mais palavras e letras', () => K.after(build, 700)); return;
        }
      } else A.sfx('hit');
    }
    draw();
  };
  build();
});
})();
