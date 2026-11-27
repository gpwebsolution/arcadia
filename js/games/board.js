/* =============================================================================
   ARCADIA - JOGOS DE TABULEIRO (com IA)
   -----------------------------------------------------------------------------
   Aqui ficam os jogos que precisam de inteligencia artificial:
   Jogo da Velha (minimax), Ligue 4 (minimax com poda alfa-beta), Reversi
   (heuristica de cantos), Codigo Secreto, Pedra-Papel-Tesoura, Batalha Naval
   e Mancala. A IA roda no proprio navegador, sem servidor.
   ============================================================================= */
(function () {
const A = Arcadia;
const fit = (n, max, pad) => Math.max(24, Math.min(max, Math.floor((Math.min(innerWidth, 560) - (pad || 60)) / n)));

/* Mesa de tabuleiro compartilhada: madeira escura, trilho e marca GPWeb. */
const table = (K, variant) => {
  const wrap = A.el('div', 'game-table gt-' + (variant || 'board'), null, K.root);
  A.el('div', 'gt-rail', '', wrap);
  return A.el('div', 'gt-body', '', wrap);
};

// Jogo da Velha: 1P contra IA ou 2P local em melhor de 3.
A.register('tictactoe', K => {
  const T = table(K, 'tictactoe');
  const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const W = b => { for (const [a, c, d] of L) if (b[a] && b[a] == b[c] && b[a] == b[d]) return b[a]; return b.every(Boolean) ? 'd' : 0; };
  const mm = (b, p) => { const w = W(b); if (w) return w == 'd' ? 0 : w == 'O' ? 1 : -1; let best = p == 'O' ? -2 : 2; b.forEach((v, i) => { if (!v) { b[i] = p; const s = mm(b, p == 'O' ? 'X' : 'O'); b[i] = 0; best = p == 'O' ? Math.max(best, s) : Math.min(best, s); } }); return best; };
  const two = K.players === 2;
  const randomChance = { easy: .5, normal: .22, hard: .04 }[K.difficulty] ?? .22;
  let b = Array(9).fill(0), busy = false, turn = 'X', sx = 0, so = 0;
  const sz = fit(3, 108, 86);
  const msg = A.el('div', 'msg', two ? 'Jogador 1 é X · Jogador 2 é O' : 'Você é X. Vença para marcar pontos!', T);
  const scoreEl = A.el('div', 'duel-score board-score', '', T);
  const box = A.el('div', 'board ttt-board', null, T); box.style.setProperty('--cell', sz + 'px');
  const cells = b.map((_, i) => {
    const c = A.el('button', 'cellb ttt-cell', '', box);
    c.type = 'button';
    c.setAttribute('aria-label', 'Casa ' + (i + 1));
    c.onclick = () => play(i);
    return c;
  });
  const hud = () => {
    if (two) K.setScore(sx + ' × ' + so);
    scoreEl.innerHTML = two
      ? '<span class="me">J1 <b>' + sx + '</b></span><span class="vs">×</span><span class="cpu"><b>' + so + '</b> J2</span>'
      : '<span class="me">Você <b>' + K.score + '</b></span><span class="vs">·</span><span class="cpu">IA <b>' + so + '</b></span>';
  };
  const draw = () => cells.forEach((c, i) => {
    c.textContent = b[i] || '';
    c.className = 'cellb ttt-cell' + (b[i] ? ' ' + b[i].toLowerCase() : '') + (b[i] ? ' filled' : '');
    c.setAttribute('aria-pressed', b[i] ? 'true' : 'false');
  });
  const markWin = who => {
    const line = L.find(([a, c, d]) => b[a] && b[a] == b[c] && b[a] == b[d] && b[a] == who);
    if (line) line.forEach(i => cells[i].classList.add('win'));
  };
  const reset = () => {
    b = Array(9).fill(0); busy = false; turn = 'X'; draw();
    msg.textContent = two ? 'Vez de X (Jogador 1)' : 'Você é X. Vença para marcar pontos!';
    hud();
  };
  const roundWin = who => {
    if (who == 'd') { msg.textContent = 'Empate! Ninguém pontua.'; K.after(reset, 900); return true; }
    markWin(who);
    if (two) {
      if (who == 'X') { sx++; msg.textContent = 'Jogador 1 fez o ponto!'; A.sfx('win'); }
      else { so++; msg.textContent = 'Jogador 2 fez o ponto!'; A.sfx('win'); }
      hud();
      if (sx >= 2 || so >= 2) {
        K.after(() => K.over(sx >= 2 ? 'Jogador 1 venceu a série! 🎉' : 'Jogador 2 venceu a série! 🎉', undefined, true), 700);
      } else K.after(reset, 1050);
      return true;
    }
    if (who == 'X') { K.addScore(1); so = 0; msg.textContent = 'Você venceu! 🎉'; A.sfx('win'); K.after(reset, 1050); }
    else if (who == 'O') K.over('A IA venceu 🤖');
    else { msg.textContent = 'Empate!'; K.after(reset, 1050); }
    hud();
    return true;
  };
  const end = () => {
    const w = W(b); if (!w) return false; busy = true;
    if (two) return roundWin(w == 'd' ? 'd' : w);
    if (w == 'X') { K.addScore(1); so = 0; msg.textContent = 'Você venceu! 🎉'; A.sfx('win'); K.after(reset, 1050); }
    else if (w == 'O') { so++; K.over('A IA venceu 🤖'); }
    else { msg.textContent = 'Empate!'; K.after(reset, 1050); }
    hud();
    return true;
  };
  const play = i => {
    if (busy || b[i]) return;
    if (two) {
      b[i] = turn; A.sfx('click'); draw();
      if (end()) return;
      turn = turn == 'X' ? 'O' : 'X';
      msg.textContent = 'Vez de ' + (turn == 'X' ? 'X (Jogador 1)' : 'O (Jogador 2)');
      return;
    }
    b[i] = 'X'; A.sfx('click'); draw(); if (end()) return; busy = true;
    K.after(() => {
      const free = b.map((v, k) => v ? -1 : k).filter(k => k >= 0); let mv;
      if (Math.random() < randomChance) mv = A.pick(free); else { let bs = -9; for (const k of A.shuffle(free)) { b[k] = 'O'; const s = mm(b, 'X'); b[k] = 0; if (s > bs) { bs = s; mv = k; } } }
      b[mv] = 'O'; A.sfx('step'); draw(); busy = false; end();
    }, 350);
  };
  reset(); draw();
});

// Ligue 4: 1P contra IA ou 2P local em melhor de 3.
A.register('connect4', K => {
  const T = table(K, 'connect4');
  const R = 6, C = 7, lines = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const l = []; for (let k = 0; k < 4; k++) l.push([r + dr * k, c + dc * k]); if (l.every(([y, x]) => y >= 0 && y < R && x >= 0 && x < C)) lines.push(l); }
  const winLine = (b, p) => lines.find(l => l.every(([r, c]) => b[r][c] == p)) || null;
  const win = (b, p) => !!winLine(b, p);
  const sc = b => lines.reduce((s, l) => { let a = 0, h = 0; l.forEach(([r, c]) => { b[r][c] == 2 ? a++ : b[r][c] == 1 && h++; }); if (a && h) return s; return s + (a == 3 ? 6 : a == 2 ? 2 : 0) - (h == 3 ? 8 : h == 2 ? 2 : 0); }, 0) + b.reduce((s, row) => s + (row[3] == 2 ? 3 : row[3] == 1 ? -3 : 0), 0);
  const drop = (b, c, p) => { for (let r = R - 1; r >= 0; r--) if (!b[r][c]) { b[r][c] = p; return r; } return -1; };
  const undo = (b, c) => { for (let r = 0; r < R; r++) if (b[r][c]) { b[r][c] = 0; return; } };
  const ORD = [3, 2, 4, 1, 5, 0, 6];
  const mm = (b, d, a, be, mx) => {
    if (win(b, 2)) return 1e5 + d; if (win(b, 1)) return -1e5 - d; if (!d || b[0].every(Boolean)) return sc(b);
    let best = mx ? -1e9 : 1e9;
    for (const c of ORD) { if (b[0][c]) continue; drop(b, c, mx ? 2 : 1); const s = mm(b, d - 1, a, be, !mx); undo(b, c); if (mx) { best = Math.max(best, s); a = Math.max(a, s); } else { best = Math.min(best, s); be = Math.min(be, s); } if (a >= be) break; }
    return best;
  };
  const two = K.players === 2;
  const depth = { easy: 2, normal: 4, hard: 5 }[K.difficulty] || 4;
  let b = Array.from({ length: R }, () => Array(C).fill(0)), busy = false, turn = 1, sx = 0, sy = 0, lastDrop = -1;
  const sz = fit(C, 56, 90);
  const msg = A.el('div', 'msg', two ? 'Jogador 1 é 🔴 · Jogador 2 é 🟡' : 'Você é 🔴. Ligue 4 para marcar pontos!', T);
  const scoreEl = A.el('div', 'duel-score board-score', '', T);
  const box = A.el('div', 'board c4-board', null, T); box.style.setProperty('--cell', sz + 'px');
  const cells = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const e = A.el('button', 'cellb c4-cell', '', box); e.type = 'button'; e.setAttribute('aria-label', 'Coluna ' + (c + 1)); e.onclick = () => play(c); cells.push(e); }
  const draw = () => {
    cells.forEach((e, i) => {
      const v = b[Math.floor(i / C)][i % C];
      e.className = 'cellb c4-cell' + (v == 1 ? ' p1' : v == 2 ? ' p2' : '') + (i === lastDrop ? ' drop' : '');
      e.innerHTML = v ? '<i class="c4-disc"></i>' : '';
    });
    lastDrop = -1;
  };
  const hud = () => {
    if (two) K.setScore(sx + ' × ' + sy);
    scoreEl.innerHTML = two
      ? '<span class="me">J1 <b>' + sx + '</b></span><span class="vs">×</span><span class="cpu"><b>' + sy + '</b> J2</span>'
      : '<span class="me">Você <b>' + K.score + '</b></span><span class="vs">·</span><span class="cpu">IA <b>' + sy + '</b></span>';
  };
  const reset = () => {
    b = Array.from({ length: R }, () => Array(C).fill(0)); busy = false; turn = 1; lastDrop = -1; draw();
    msg.textContent = two ? 'Vez do Jogador 1 (🔴)' : 'Você é 🔴. Ligue 4 para marcar pontos!';
    hud();
  };
  const markWin = p => {
    const line = winLine(b, p);
    if (line) line.forEach(([r, c]) => cells[r * C + c].classList.add('win'));
  };
  const roundWin = who => {
    markWin(who);
    if (two) {
      if (who == 1) { sx++; msg.textContent = 'Jogador 1 fez o ponto!'; }
      else { sy++; msg.textContent = 'Jogador 2 fez o ponto!'; }
      A.sfx('win'); hud();
      if (sx >= 2 || sy >= 2) K.after(() => K.over(sx >= 2 ? 'Jogador 1 venceu a série! 🎉' : 'Jogador 2 venceu a série! 🎉', undefined, true), 750);
      else K.after(reset, 1150);
      return true;
    }
    if (who == 1) { K.addScore(1); msg.textContent = 'Você venceu! 🎉'; A.sfx('win'); K.after(reset, 1150); }
    else K.over('A IA ligou 4 🤖');
    hud();
    return true;
  };
  const check = () => {
    if (win(b, 1)) { busy = true; return roundWin(1); }
    if (win(b, 2)) { busy = true; return roundWin(2); }
    if (b[0].every(Boolean)) {
      busy = true;
      if (two) { msg.textContent = 'Empate! Ninguém pontua.'; K.after(reset, 900); }
      else { msg.textContent = 'Empate!'; K.after(reset, 1050); }
      return true;
    }
    return false;
  };
  const play = c => {
    if (busy || b[0][c]) return;
    const row = drop(b, c, two ? turn : 1);
    lastDrop = row * C + c;
    A.sfx('click'); draw(); if (check()) return;
    if (two) {
      turn = turn == 1 ? 2 : 1;
      msg.textContent = 'Vez do Jogador ' + turn + ' (' + (turn == 1 ? '🔴' : '🟡') + ')';
      return;
    }
    busy = true;
    K.after(() => {
      let best = -1e9, mv = 3;
      for (const k of ORD) {
        if (b[0][k]) continue;
        drop(b, k, 2);
        const s = mm(b, depth, -1e9, 1e9, false) + (K.difficulty == 'easy' ? Math.random() * 30 : Math.random());
        undo(b, k);
        if (s > best) { best = s; mv = k; }
      }
      const aiRow = drop(b, mv, 2);
      lastDrop = aiRow * C + mv;
      A.sfx('step'); draw(); busy = false; check();
    }, K.difficulty == 'hard' ? 220 : 300);
  };
  reset(); draw();
});

// Reversi: 1P contra IA ou 2P local. Vence quem tiver mais peças no fim.
A.register('reversi', K => {
  const T = table(K, 'reversi');
  const D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const top = [[100, -20, 10, 5], [-20, -50, -2, -2], [10, -2, 1, 1], [5, -2, 1, 0]], wt = (x, y) => top[y < 4 ? y : 7 - y][x < 4 ? x : 7 - x];
  const flips = (b, x, y, p) => { if (b[y * 8 + x]) return []; let out = []; for (const [dx, dy] of D) { let cx = x + dx, cy = y + dy; const t = []; while (cx >= 0 && cx < 8 && cy >= 0 && cy < 8 && b[cy * 8 + cx] == -p) { t.push(cy * 8 + cx); cx += dx; cy += dy; } if (t.length && cx >= 0 && cx < 8 && cy >= 0 && cy < 8 && b[cy * 8 + cx] == p) out = out.concat(t); } return out; };
  const moves = (b, p) => { const m = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const f = flips(b, x, y, p); if (f.length) m.push([x, y, f]); } return m; };
  const two = K.players === 2;
  let b = Array(64).fill(0); b[27] = b[36] = -1; b[28] = b[35] = 1;
  let busy = false, turn = 1, changed = [];
  const sz = fit(8, 50, 86);
  const info = A.el('div', 'msg', '', T);
  const scoreEl = A.el('div', 'duel-score board-score', '', T);
  const box = A.el('div', 'board rv-board', null, T); box.style.setProperty('--cell', sz + 'px');
  const cells = b.map((_, i) => { const c = A.el('button', 'cellb rv-cell', '', box); c.type = 'button'; c.onclick = () => click(i); return c; });
  const cnt = p => b.filter(v => v == p).length;
  const draw = () => {
    const human = two ? turn : 1;
    const hints = busy ? [] : moves(b, human).map(m => m[1] * 8 + m[0]);
    cells.forEach((c, i) => {
      c.className = 'cellb rv-cell' + (b[i] ? ' filled ' + (b[i] == 1 ? 'dark' : 'light') : '') +
        (hints.includes(i) ? ' hint' : '') +
        (changed.includes(i) ? ' flip' : '');
      c.innerHTML = b[i] ? '<i class="rv-disc"></i>' : hints.includes(i) ? '<i class="rv-dot"></i>' : '';
    });
    changed = [];
    const w = cnt(1), l = cnt(-1);
    scoreEl.innerHTML = two
      ? '<span class="me">⚫ J1 <b>' + w + '</b></span><span class="vs">×</span><span class="cpu"><b>' + l + '</b> J2 ⚪</span>'
      : '<span class="me">⚫ Você <b>' + w + '</b></span><span class="vs">×</span><span class="cpu"><b>' + l + '</b> IA ⚪</span>';
    info.textContent = two
      ? (turn == 1 ? 'Vez do Jogador 1 (⚫)' : 'Vez do Jogador 2 (⚪)')
      : 'Vire o maior número de peças até o tabuleiro encher.';
  };
  const apply = (m, p) => { b[m[1] * 8 + m[0]] = p; m[2].forEach(i => b[i] = p); changed = [m[1] * 8 + m[0]].concat(m[2]); };
  const finish = () => {
    const d = cnt(1) - cnt(-1); draw();
    if (two) K.over(d > 0 ? 'Jogador 1 (⚫) venceu! 🎉' : d < 0 ? 'Jogador 2 (⚪) venceu! 🎉' : 'Empate!', undefined, true);
    else d > 0 ? K.over('Você venceu! 🎉', d) : K.over(d ? 'A IA venceu 🤖' : 'Empate!', d, true);
  };
  const aiTurn = () => {
    if (two) return;
    const m = moves(b, -1);
    if (!m.length) {
      if (moves(b, 1).length) { busy = false; draw(); }
      else finish();
      return;
    }
    let best = null, bs = -1e9;
    m.forEach(x => { const s = wt(x[0], x[1]) * 2 + x[2].length + (K.difficulty == 'easy' ? Math.random() * 80 : Math.random()); if (s > bs) { bs = s; best = x; } });
    apply(best, -1); A.sfx('step');
    if (moves(b, 1).length) { busy = false; draw(); }
    else if (moves(b, -1).length) { draw(); K.after(aiTurn, 600); }
    else finish();
  };
  const click = i => {
    if (busy) return;
    const p = two ? turn : 1;
    const x = i % 8, y = Math.floor(i / 8), f = flips(b, x, y, p);
    if (!f.length) { A.sfx('hit'); return; }
    apply([x, y, f], p); A.sfx('click');
    if (two) {
      busy = true;
      const other = -p;
      if (moves(b, other).length) { turn = other; busy = false; draw(); }
      else if (moves(b, p).length) { busy = false; draw(); }
      else finish();
    } else { busy = true; draw(); K.after(aiTurn, 500); }
  };
  draw();
});

// Codigo Secreto: quatro cores em dez tentativas, com feedback de posicao e cor.
A.register('mastermind', K => {
  const T = table(K, 'mastermind');
  K.low = true; K.fmt = n => n + ' tent.';
  const PAL = ['#ff4d6d', '#ffd23f', '#3ddc84', '#4c7dff', '#b05cff', '#ff9f43'], code = Array.from({ length: 4 }, () => A.rand(0, 5)); let cur = [], rows = 0;
  const msg = A.el('div', 'msg', 'Quebre o código de 4 cores em até 10 tentativas.', T);
  const board = A.el('div', 'mm-board', '', T);
  const R = Array.from({ length: 10 }, (_, i) => {
    const row = A.el('div', 'mm-row', '', board);
    A.el('span', 'mm-num', String(i + 1), row);
    A.el('span', 'mm-pegs', '', row);
    A.el('span', 'mm-clues', '', row);
    return row;
  });
  const dot = c => `<i class="mm-dot" style="background:${c}"></i>`;
  const draw = (i, peg, fb) => {
    R[i].className = 'mm-row' + (i === rows ? ' active' : '') + (i < rows ? ' done' : '');
    R[i].querySelector('.mm-pegs').innerHTML = peg.map(c => dot(PAL[c])).join('') + Array(4 - peg.length).fill('<i class="mm-dot empty"></i>').join('');
    R[i].querySelector('.mm-clues').innerHTML = (fb || []).map(c => '<i class="mm-clue ' + c + '"></i>').join('');
  };
  R.forEach((_, i) => draw(i, []));
  const pal = A.el('div', 'btns mm-palette', null, T);
  PAL.forEach((c, i) => { const b = A.el('button', 'gb mm-swatch', '', pal); b.type = 'button'; b.style.setProperty('--sw', c); b.setAttribute('aria-label', 'Cor ' + (i + 1)); b.onclick = () => add(i); });
  const del = A.el('button', 'gb mm-del', '⌫', pal); del.type = 'button'; del.onclick = () => { if (!cur.length || rows >= 10) return; cur.pop(); draw(rows, cur); A.sfx('click'); };
  const legend = A.el('div', 'mm-legend', '<span><i class="mm-clue exact"></i> cor e posição</span><span><i class="mm-clue near"></i> cor certa, lugar errado</span>', T);
  const add = c => {
    if (cur.length >= 4 || rows >= 10) return; cur.push(c); draw(rows, cur); A.sfx('click'); if (cur.length < 4) return;
    let bl = 0; const cc = {}, gc = {}; cur.forEach((v, i) => { if (v == code[i]) bl++; else { cc[v] = (cc[v] || 0) + 1; gc[code[i]] = (gc[code[i]] || 0) + 1; } });
    let wh = 0; for (const k in cc) wh += Math.min(cc[k], gc[k] || 0);
    draw(rows, cur, Array(bl).fill('exact').concat(Array(wh).fill('near'))); rows++; K.setScore(rows);
    if (bl == 4) { msg.textContent = 'Código quebrado em ' + rows + ' tentativa' + (rows == 1 ? '' : 's') + '! 🔓'; return K.over('Código quebrado! 🔓', rows); }
    if (rows == 10) { msg.textContent = 'O código era ' + code.map(c => ['🔴', '🟡', '🟢', '🔵', '🟣', '🟠'][c]).join(''); return K.over('O código era ' + code.map(c => ['🔴', '🟡', '🟢', '🔵', '🟣', '🟠'][c]).join(''), rows, true); }
    msg.textContent = bl + ' na posição certa · ' + wh + ' na posição errada. Tentativa ' + (rows + 1) + '/10.';
    draw(rows, []); cur = [];
  };
  legend.setAttribute('aria-hidden', 'true');
});

// Pedra, Papel e Tesoura: sequencia de vitorias vale pontos; uma derrota encerra.
A.register('rps', K => {
  const T = table(K, 'rps');
  const O = [['🪨', 'Pedra'], ['📄', 'Papel'], ['✂️', 'Tesoura']];
  const msg = A.el('div', 'msg', 'Escolha! Sua sequência de vitórias vale pontos.', T);
  const scoreEl = A.el('div', 'duel-score board-score', '<span class="me">Sequência <b>0</b></span><span class="vs">·</span><span class="cpu">Recorde <b>0</b></span>', T);
  const scoreVals = scoreEl.querySelectorAll('b');
  const arena = A.el('div', 'rps-arena', '', T);
  const you = A.el('div', 'rps-hand', '<small>VOCÊ</small><b>❔</b>', arena);
  const mid = A.el('div', 'rps-vs', 'VS', arena);
  const cpu = A.el('div', 'rps-hand cpu', '<small>CPU</small><b>❔</b>', arena);
  const bt = A.el('div', 'btns rps-choices', null, T);
  let busy = false, best = 0;
  const sync = () => {
    best = Math.max(best, K.score);
    scoreVals[0].textContent = K.score;
    scoreVals[1].textContent = best;
  };
  O.forEach((o, i) => {
    const b = A.el('button', 'gb rps-choice', '<span>' + o[0] + '</span><small>' + o[1] + '</small>', bt);
    b.type = 'button';
    b.onclick = () => {
      if (busy) return;
      busy = true;
      const res = A.rand(0, 2);
      you.querySelector('b').textContent = o[0];
      cpu.querySelector('b').textContent = '❔';
      arena.classList.remove('win', 'lose', 'draw');
      arena.classList.add('rolling');
      A.sfx('step');
      K.after(() => {
        cpu.querySelector('b').textContent = O[res][0];
        arena.classList.remove('rolling');
        if (res == i) { msg.textContent = 'Empate! Jogue de novo.'; arena.classList.add('draw'); A.sfx('click'); busy = false; }
        else if ((i + 1) % 3 == res) { arena.classList.add('lose'); A.sfx('lose'); sync(); K.over('Você perdeu com ' + K.score + ' vitória' + (K.score == 1 ? '' : 's')); }
        else { K.addScore(1); msg.textContent = 'Você ganhou! 🔥 Sequência de ' + K.score; arena.classList.add('win'); A.sfx('coin'); sync(); busy = false; }
      }, 420);
    };
  });
  sync();
});

// Batalha Naval: frota 8x8 escondida; afunde todos os navios no menor numero de tiros.
A.register('battleship', K => {
  const T = table(K, 'battleship');
  K.low = true; K.fmt = n => n + ' tiros';
  const N = 8, sz = fit(N, 44, 94), ships = [4, 3, 3, 2], g = Array(N * N).fill(-1), hit = Array(N * N).fill(0), left = ships.slice(); let shots = 0, sunk = 0;
  ships.forEach((len, id) => { for (;;) { const h = Math.random() < .5, x = A.rand(0, h ? N - len : N - 1), y = A.rand(0, h ? N - 1 : N - len), cs = Array.from({ length: len }, (_, k) => (y + (h ? 0 : k)) * N + x + (h ? k : 0)); if (cs.every(c => g[c] < 0)) { cs.forEach(c => g[c] = id); break; } } });
  const info = A.el('div', 'msg', 'Afunde todos os navios (4, 3, 3, 2) com o mínimo de tiros.', T);
  const stats = A.el('div', 'casino-bank bs-stats', '<span class="cb-item"><small>Tiros</small><b data-shots>0</b></span><span class="cb-item"><small>Navios restantes</small><b data-left>4</b></span><span class="cb-item"><small>Afundados</small><b data-sunk>0</b></span>', T);
  const shotsEl = stats.querySelector('[data-shots]'), leftEl = stats.querySelector('[data-left]'), sunkEl = stats.querySelector('[data-sunk]');
  const box = A.el('div', 'board bs-board', null, T); box.style.setProperty('--cell', sz + 'px');
  const cells = g.map((_, i) => {
    const c = A.el('button', 'cellb bs-cell', '', box);
    c.type = 'button'; c.setAttribute('aria-label', 'Casa ' + ((i >> 3) + 1) + '-' + ((i & 7) + 1));
    c.onclick = () => fire(i);
    return c;
  });
  const sync = () => {
    shotsEl.textContent = shots;
    leftEl.textContent = ships.length - sunk;
    sunkEl.textContent = sunk;
    K.setScore(shots);
  };
  const fire = i => {
    if (hit[i]) return; hit[i] = 1; shots++;
    if (g[i] >= 0) {
      cells[i].textContent = '💥'; cells[i].className = 'cellb bs-cell hit';
      A.sfx('hit');
      if (!--left[g[i]]) {
        sunk++;
        cells.forEach((c, k) => { if (g[k] === g[i]) c.classList.add('sunk'); });
        info.textContent = 'Navio de ' + ships[g[i]] + ' afundado! 🚢';
        A.sfx('win');
        if (sunk < ships.length) K.after(() => { info.textContent = 'Afunde os navios restantes.'; }, 1100);
      }
      if (left.every(x => !x)) { sync(); return K.over('Frota destruída! ⚓', shots); }
    } else {
      cells[i].textContent = '•'; cells[i].className = 'cellb bs-cell miss';
      A.sfx('step');
    }
    sync();
  };
  sync();
});

// Mancala (Kalah): semeadura de sementes contra uma IA que simula jogadas.
A.register('mancala', K => {
  const T = table(K, 'mancala');
  let b = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], turn = 0, busy = false;
  const own = t => t ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5], store = t => t ? 13 : 6;
  const sow = (b, i, t) => { let n = b[i]; b[i] = 0; let j = i; while (n) { j = (j + 1) % 14; if (j == store(1 - t)) continue; b[j]++; n--; } const extra = j == store(t); if (!extra && own(t).includes(j) && b[j] == 1 && b[12 - j] > 0) { b[store(t)] += b[12 - j] + 1; b[j] = 0; b[12 - j] = 0; } return extra; };
  const ended = b => own(0).every(i => !b[i]) || own(1).every(i => !b[i]);
  const sz = fit(8, 54, 108);
  const info = A.el('div', 'msg', 'Sua vez! Escolha uma cova da linha de baixo.', T);
  const stats = A.el('div', 'casino-bank mc-stats', '<span class="cb-item"><small>Você</small><b data-you>0</b></span><span class="cb-item"><small>IA</small><b data-ai>0</b></span>', T);
  const youEl = stats.querySelector('[data-you]'), aiEl = stats.querySelector('[data-ai]');
  const box = A.el('div', 'mancala-board', '', T); box.style.setProperty('--cell', sz + 'px');
  const els = {};
  const mk = (i, col, row, span) => {
    const e = A.el('button', 'mancala-' + (span ? 'store' : 'pit') + (i === 6 ? ' mine' : i === 13 ? ' cpu' : ''), '', box);
    e.type = 'button';
    e.style.gridColumn = col;
    e.style.gridRow = row + (span ? ' / span 2' : '');
    e.setAttribute('aria-label', (span ? 'Reserva ' : 'Cova ') + i);
    els[i] = e;
    if (i >= 0 && i < 6) e.onclick = () => play(i);
  };
  mk(13, 1, 1, 1); for (let k = 0; k < 6; k++) { mk(12 - k, 2 + k, 1); mk(k, 2 + k, 2); } mk(6, 8, 1, 1);
  const draw = () => {
    for (const i in els) {
      els[i].textContent = b[i];
      els[i].classList.toggle('empty', !b[i]);
      els[i].classList.toggle('playable', turn === 0 && +i < 6 && b[i] > 0 && !busy);
      els[i].classList.toggle('active', turn === 0 && +i < 6 && b[i] > 0 && !busy);
    }
    youEl.textContent = b[6]; aiEl.textContent = b[13];
    box.classList.toggle('cpu-turn', turn === 1 || busy);
  };
  const end = () => { own(0).forEach(i => { b[6] += b[i]; b[i] = 0; }); own(1).forEach(i => { b[13] += b[i]; b[i] = 0; }); draw(); const d = b[6] - b[13]; K.score = d; d > 0 ? K.over('Você venceu! 🏆', d) : K.over(d ? 'A IA venceu 🤖' : 'Empate!', d, true); };
  const ai = () => {
    let best = -1, bs = -1e9; own(1).forEach(i => { if (!b[i]) return; const c = b.slice(), ex = sow(c, i, 1), s = c[13] - c[6] + (ex ? 4 : 0) + Math.random(); if (s > bs) { bs = s; best = i; } });
    const ex = sow(b, best, 1); A.sfx('step'); draw(); if (ended(b)) return end();
    if (ex) K.after(ai, 700); else { busy = false; turn = 0; info.textContent = 'Sua vez!'; draw(); }
  };
  const play = i => {
    if (busy || !b[i]) return; const ex = sow(b, i, 0); A.sfx('click'); draw(); if (ended(b)) return end();
    if (ex) { info.textContent = 'Jogue de novo! ✨'; return; } busy = true; turn = 1; info.textContent = 'IA pensando…'; draw(); K.after(ai, 700);
  };
  draw();
});
// Xadrez: regras completas (roque, en passant, promoção) com IA por minimax.
A.register('chess', K => {
  const two = K.players === 2;
  const DEPTH = ({ easy: 1, normal: 3, hard: 4 })[K.difficulty] || 3;
  const DIFF_NAME = ({ easy: 'Fácil', normal: 'Normal', hard: 'Difícil' })[K.difficulty] || 'Normal';
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const PIECE_NAME = { k: 'Rei', q: 'Dama', r: 'Torre', b: 'Bispo', n: 'Cavalo', p: 'Peão' };
  const FILES = 'abcdefgh';
  const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KING8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const rc = i => [i >> 3, i & 7];
  const idx = (r, c) => r * 8 + c;
  const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const other = c => (c === 'w' ? 'b' : 'w');

  function initial() {
    const b = new Array(64).fill(null);
    const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let c = 0; c < 8; c++) {
      b[c] = { t: back[c], c: 'b' };
      b[8 + c] = { t: 'p', c: 'b' };
      b[48 + c] = { t: 'p', c: 'w' };
      b[56 + c] = { t: back[c], c: 'w' };
    }
    return { b, turn: 'w', castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: -1 };
  }

  function isAttacked(st, sq, by) {
    const b = st.b, [r, c] = rc(sq);
    const pdir = by === 'w' ? 1 : -1;
    for (const dc of [-1, 1]) {
      const nr = r + pdir, nc = c + dc;
      if (inside(nr, nc)) { const p = b[idx(nr, nc)]; if (p && p.c === by && p.t === 'p') return true; }
    }
    for (const [dr, dc] of KNIGHT) {
      const nr = r + dr, nc = c + dc;
      if (inside(nr, nc)) { const p = b[idx(nr, nc)]; if (p && p.c === by && p.t === 'n') return true; }
    }
    for (const [dr, dc] of KING8) {
      const nr = r + dr, nc = c + dc;
      if (inside(nr, nc)) { const p = b[idx(nr, nc)]; if (p && p.c === by && p.t === 'k') return true; }
    }
    for (const [dr, dc] of DIAG) {
      let nr = r + dr, nc = c + dc;
      while (inside(nr, nc)) {
        const p = b[idx(nr, nc)];
        if (p) { if (p.c === by && (p.t === 'b' || p.t === 'q')) return true; break; }
        nr += dr; nc += dc;
      }
    }
    for (const [dr, dc] of ORTH) {
      let nr = r + dr, nc = c + dc;
      while (inside(nr, nc)) {
        const p = b[idx(nr, nc)];
        if (p) { if (p.c === by && (p.t === 'r' || p.t === 'q')) return true; break; }
        nr += dr; nc += dc;
      }
    }
    return false;
  }

  function kingSq(st, side) {
    for (let i = 0; i < 64; i++) { const p = st.b[i]; if (p && p.t === 'k' && p.c === side) return i; }
    return -1;
  }
  function inCheck(st, side) { const k = kingSq(st, side); return k >= 0 && isAttacked(st, k, other(side)); }

  function pseudo(st, side) {
    const moves = [], b = st.b;
    const push = (from, to, p, extra) => {
      const target = b[to];
      moves.push(Object.assign({ from, to, piece: p.t, capture: !!target }, extra || {}));
    };
    for (let from = 0; from < 64; from++) {
      const p = b[from];
      if (!p || p.c !== side) continue;
      const [r, c] = rc(from);
      if (p.t === 'p') {
        const dir = side === 'w' ? -1 : 1;
        const startRow = side === 'w' ? 6 : 1;
        const promoRow = side === 'w' ? 0 : 7;
        if (inside(r + dir, c) && !b[idx(r + dir, c)]) {
          const one = idx(r + dir, c);
          if (r + dir === promoRow) for (const pr of ['q', 'r', 'b', 'n']) moves.push({ from, to: one, piece: 'p', promo: pr });
          else moves.push({ from, to: one, piece: 'p' });
          const twoSq = idx(r + 2 * dir, c);
          if (r === startRow && !b[twoSq]) moves.push({ from, to: twoSq, piece: 'p', double: true });
        }
        for (const dc of [-1, 1]) {
          const nr = r + dir, nc = c + dc;
          if (!inside(nr, nc)) continue;
          const to = idx(nr, nc), target = b[to];
          if (target && target.c !== side) {
            if (nr === promoRow) for (const pr of ['q', 'r', 'b', 'n']) moves.push({ from, to, piece: 'p', promo: pr, capture: true });
            else moves.push({ from, to, piece: 'p', capture: true });
          } else if (!target && to === st.ep) {
            moves.push({ from, to, piece: 'p', ep: idx(r, nc), capture: true });
          }
        }
      } else if (p.t === 'n') {
        for (const [dr, dc] of KNIGHT) {
          const nr = r + dr, nc = c + dc;
          if (!inside(nr, nc)) continue;
          const to = idx(nr, nc), target = b[to];
          if (!target || target.c !== side) push(from, to, p);
        }
      } else if (p.t === 'k') {
        for (const [dr, dc] of KING8) {
          const nr = r + dr, nc = c + dc;
          if (!inside(nr, nc)) continue;
          const to = idx(nr, nc), target = b[to];
          if (!target || target.c !== side) push(from, to, p);
        }
        const homeRow = side === 'w' ? 7 : 0;
        if (r === homeRow && c === 4 && !inCheck(st, side)) {
          const kingSide = side === 'w' ? st.castle.wK : st.castle.bK;
          const queenSide = side === 'w' ? st.castle.wQ : st.castle.bQ;
          if (kingSide && !b[idx(homeRow, 5)] && !b[idx(homeRow, 6)] &&
              !isAttacked(st, idx(homeRow, 5), other(side)) && !isAttacked(st, idx(homeRow, 6), other(side))) {
            moves.push({ from, to: idx(homeRow, 6), piece: 'k', castle: 'K' });
          }
          if (queenSide && !b[idx(homeRow, 3)] && !b[idx(homeRow, 2)] && !b[idx(homeRow, 1)] &&
              !isAttacked(st, idx(homeRow, 3), other(side)) && !isAttacked(st, idx(homeRow, 2), other(side))) {
            moves.push({ from, to: idx(homeRow, 2), piece: 'k', castle: 'Q' });
          }
        }
      } else {
        const dirs = p.t === 'b' ? DIAG : p.t === 'r' ? ORTH : DIAG.concat(ORTH);
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (inside(nr, nc)) {
            const to = idx(nr, nc), target = b[to];
            if (target && target.c === side) break;
            moves.push({ from, to, piece: p.t, capture: !!target });
            if (target) break;
            nr += dr; nc += dc;
          }
        }
      }
    }
    return moves;
  }

  function apply(st, m) {
    const b = st.b.slice();
    const castle = Object.assign({}, st.castle);
    const p = b[m.from];
    b[m.from] = null;
    if (m.ep != null) b[m.ep] = null;
    b[m.to] = m.promo ? { t: m.promo, c: p.c } : p;
    if (m.castle) {
      const homeRow = p.c === 'w' ? 7 : 0;
      if (m.castle === 'K') { b[idx(homeRow, 5)] = b[idx(homeRow, 7)]; b[idx(homeRow, 7)] = null; }
      else { b[idx(homeRow, 3)] = b[idx(homeRow, 0)]; b[idx(homeRow, 0)] = null; }
    }
    if (p.t === 'k') { if (p.c === 'w') { castle.wK = castle.wQ = false; } else { castle.bK = castle.bQ = false; } }
    if (p.t === 'r') {
      if (p.c === 'w' && m.from === 63) castle.wK = false;
      if (p.c === 'w' && m.from === 56) castle.wQ = false;
      if (p.c === 'b' && m.from === 7) castle.bK = false;
      if (p.c === 'b' && m.from === 0) castle.bQ = false;
    }
    if (m.to === 63) castle.wK = false;
    if (m.to === 56) castle.wQ = false;
    if (m.to === 7) castle.bK = false;
    if (m.to === 0) castle.bQ = false;
    const ep = m.double ? idx((rc(m.from)[0] + rc(m.to)[0]) / 2, rc(m.from)[1]) : -1;
    return { b, turn: other(st.turn), castle, ep };
  }

  function legal(st, side) {
    return pseudo(st, side).filter(m => !inCheck(apply(st, m), side));
  }

  function evaluate(st) {
    let score = 0;
    for (let i = 0; i < 64; i++) {
      const p = st.b[i];
      if (!p) continue;
      const [r, c] = rc(i);
      const center = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5));
      let v = VAL[p.t] + center * (p.t === 'p' ? 2 : 5);
      if (p.t === 'p') v += (p.c === 'w' ? (6 - r) : (r - 1)) * 5;
      if (p.t === 'k') v -= center * 7;
      score += p.c === 'w' ? v : -v;
    }
    return score;
  }

  function search(st, side, depth, alpha, beta) {
    if (depth === 0) return evaluate(st);
    const moves = legal(st, side);
    if (!moves.length) return inCheck(st, side) ? (side === 'w' ? -100000 : 100000) : 0;
    moves.sort((a, b) => (b.capture ? VAL[b.piece] : 0) - (a.capture ? VAL[a.piece] : 0));
    let best = side === 'w' ? -Infinity : Infinity;
    for (const m of moves) {
      const val = search(apply(st, m), other(side), depth - 1, alpha, beta);
      if (side === 'w') { if (val > best) best = val; if (best > alpha) alpha = best; }
      else { if (val < best) best = val; if (best < beta) beta = best; }
      if (beta <= alpha) break;
    }
    return best;
  }

  function bestMove(st, side) {
    const moves = legal(st, side);
    if (!moves.length) return null;
    moves.sort((a, b) => (b.capture ? VAL[b.piece] : 0) - (a.capture ? VAL[a.piece] : 0));
    let best = moves[0], bestVal = side === 'w' ? -Infinity : Infinity;
    const noise = K.difficulty === 'hard' ? 0 : K.difficulty === 'normal' ? 6 : 32;
    for (const m of moves) {
      let val = search(apply(st, m), other(side), Math.max(0, DEPTH - 1), -Infinity, Infinity);
      val += (Math.random() - 0.5) * noise;
      if (side === 'w' ? val > bestVal : val < bestVal) { bestVal = val; best = m; }
    }
    return best;
  }

  let st = initial(), sel = -1, legalNow = [], lastMove = null, over = false, thinking = false, score = 0;
  let moveHistory = [], capturedByW = [], capturedByB = [], undoStack = [], animate = false, captureAt = -1, pendingPromo = null;
  let generation = 0, quietPlies = 0, positionCounts = new Map();
  const sz = fit(8, 58, 46);
  const shell = A.el('div', 'chess-shell', '', K.root);
  const info = A.el('div', 'msg', two ? 'Brancas começam. Jogador 1 (brancas) × Jogador 2 (pretas).' : 'Você joga de brancas. Clique numa peça para ver os movimentos.', shell);
  const boardWrap = A.el('div', 'chess-boardwrap', '', shell);
  const boardEl = A.el('div', 'chess-board', '', boardWrap);
  boardEl.style.cssText = 'display:grid;grid-template-columns:repeat(8,' + sz + 'px);grid-template-rows:repeat(8,' + sz + 'px);border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.55),inset 0 0 0 2px rgba(255,255,255,.12)';
  const promo = A.el('div', 'chess-promo', '', boardWrap);
  promo.hidden = true;
  promo.innerHTML = '<div class="chess-promo-card">' +
    ['q', 'r', 'b', 'n'].map(type => '<button type="button" data-promo="' + type + '" title="' + PIECE_NAME[type] + '">' + GLYPH[type] + '</button>').join('') +
    '</div>';
  promo.querySelectorAll('[data-promo]').forEach(button => { button.onclick = () => choosePromotion(button.dataset.promo); });
  const cells = [];
  for (let i = 0; i < 64; i++) {
    const [r, c] = rc(i);
    const b = A.el('button', 'chess-sq ' + ((r + c) % 2 ? 'dark' : 'light'), '', boardEl);
    b.dataset.i = i;
    b.type = 'button';
    b.style.cssText = 'position:relative;width:' + sz + 'px;height:' + sz + 'px;font-size:' + (sz * .64) + 'px;display:grid;place-items:center;border:0;cursor:pointer;line-height:1;padding:0';
    b.onclick = () => click(i);
    cells.push(b);
  }
  const side = A.el('div', 'chess-side', '', shell);
  const statusEl = A.el('div', 'chess-status', '', side);
  const capWCard = A.el('div', 'chess-card', '<h4>Você capturou</h4>', side);
  const capWEl = A.el('div', 'chess-captured', '', capWCard);
  const capBCard = A.el('div', 'chess-card', '<h4>A IA capturou</h4>', side);
  const capBEl = A.el('div', 'chess-captured', '', capBCard);
  const histCard = A.el('div', 'chess-history', '<h4>Histórico da partida</h4>', side);
  const histEl = A.el('div', 'chess-moves', '', histCard);
  const ctl = A.el('div', 'btns', '', shell);
  const newBtn = A.el('button', 'gb', '↻ Novo jogo', ctl);
  newBtn.onclick = () => reset();
  const undoBtn = A.el('button', 'gb', '↶ Desfazer', ctl);
  undoBtn.disabled = true;
  undoBtn.onclick = () => undo();

  function sqName(i) { return FILES[i & 7] + (8 - (i >> 3)); }

  function snapshot() {
    return {
      st: { b: st.b.map(p => p ? { t: p.t, c: p.c } : null), turn: st.turn, castle: Object.assign({}, st.castle), ep: st.ep },
      lastMove: lastMove ? { from: lastMove.from, to: lastMove.to } : null,
      score,
      quietPlies,
      positionCounts: Array.from(positionCounts.entries()),
      moveHistory: moveHistory.slice(),
      capturedByW: capturedByW.slice(),
      capturedByB: capturedByB.slice()
    };
  }

  function pushUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > 140) undoStack.shift();
    undoBtn.disabled = false;
  }

  function undo() {
    if (thinking || over || !undoStack.length) return;
    const saved = undoStack.pop();
    st = saved.st;
    lastMove = saved.lastMove;
    score = saved.score;
    quietPlies = saved.quietPlies || 0;
    positionCounts = new Map(saved.positionCounts || []);
    moveHistory = saved.moveHistory;
    capturedByW = saved.capturedByW;
    capturedByB = saved.capturedByB;
    sel = -1; legalNow = []; animate = false; captureAt = -1; pendingPromo = null;
    promo.hidden = true;
    undoBtn.disabled = !undoStack.length;
    A.sfx('step');
    render();
  }

  function sanFor(move, mover, captured, givesCheck, mate, before) {
    if (move.castle) return (move.castle === 'K' ? 'O-O' : 'O-O-O') + (mate ? '#' : givesCheck ? '+' : '');
    let text = '';
    if (move.piece === 'p') {
      if (captured) text += FILES[move.from & 7] + 'x';
      text += sqName(move.to);
      if (move.promo) text += '=' + move.promo.toUpperCase();
    } else {
      text += move.piece.toUpperCase();
      const twins = legal(before, mover).filter(option => option.piece === move.piece && option.to === move.to && option.from !== move.from);
      if (twins.length) {
        const sameFile = twins.some(option => (option.from & 7) === (move.from & 7));
        const sameRank = twins.some(option => (option.from >> 3) === (move.from >> 3));
        if (!sameFile) text += FILES[move.from & 7];
        else if (!sameRank) text += 8 - (move.from >> 3);
        else text += sqName(move.from);
      }
      if (captured) text += 'x';
      text += sqName(move.to);
    }
    return text + (mate ? '#' : givesCheck ? '+' : '');
  }

  function materialScore() {
    let total = 0;
    for (const piece of st.b) if (piece) total += (piece.c === 'w' ? 1 : -1) * VAL[piece.t];
    return Math.round(total / 100);
  }

  /* Chave compacta da posição (peças, vez, roque e en passant) usada para
     detectar repetição tripla. */
  function positionKey(state) {
    let key = '';
    for (let i = 0; i < 64; i++) {
      const piece = state.b[i];
      key += piece ? (piece.c === 'w' ? piece.t.toUpperCase() : piece.t) : '.';
    }
    return key + '|' + state.turn + '|' +
      (state.castle.wK ? 'K' : '') + (state.castle.wQ ? 'Q' : '') +
      (state.castle.bK ? 'k' : '') + (state.castle.bQ ? 'q' : '') + '|' + state.ep;
  }

  /* Material insuficiente para mate: rei contra rei, rei + bispo/cavalo e
     bispos todos na mesma cor de casa. */
  function insufficientMaterial(state) {
    const minors = [];
    for (let i = 0; i < 64; i++) {
      const piece = state.b[i];
      if (!piece || piece.t === 'k') continue;
      if (piece.t !== 'b' && piece.t !== 'n') return false;
      minors.push({ t: piece.t, i });
    }
    if (!minors.length || minors.length === 1) return true;
    if (minors.every(piece => piece.t === 'b')) {
      const colors = new Set(minors.map(piece => ((piece.i >> 3) + (piece.i & 7)) & 1));
      return colors.size === 1;
    }
    return false;
  }

  function renderStatus() {
    if (over) return;
    const turn = st.turn;
    const check = inCheck(st, turn);
    const material = materialScore();
    const turnLabel = two
      ? 'Vez das ' + (turn === 'w' ? 'brancas' : 'pretas')
      : turn === 'w' ? 'Você joga' : 'Vez da IA';
    const matLabel = material === 0 ? 'Material equilibrado' : (material > 0 ? '+' + material + ' brancas' : '+' + (-material) + ' pretas');
    statusEl.innerHTML =
      '<span class="chess-turn"><i class="chess-dot ' + (turn === 'w' ? '' : 'b') + '"></i>' + turnLabel + '</span>' +
      '<span>' + (check ? '⚠ Xeque!' : 'Nível ' + DIFF_NAME) + '</span>' +
      '<span class="chess-material">' + matLabel + '</span>';
    info.textContent = thinking
      ? 'IA pensando…'
      : check
        ? (two ? 'Xeque! Vez das ' + (turn === 'w' ? 'brancas' : 'pretas') + '.' : 'Xeque! Proteja seu rei.')
        : two
          ? 'Vez das ' + (turn === 'w' ? 'brancas' : 'pretas') + '.'
          : turn === 'w' ? 'Sua vez. Clique numa peça para ver os movimentos.' : 'Vez da IA.';
  }

  function renderCaptured() {
    const glyphs = (list, color) => list.map(type => '<span class="' + color + '">' + GLYPH[type] + '</span>').join('');
    capWEl.innerHTML = capturedByW.length ? glyphs(capturedByW, 'b') : '<span class="chess-empty">—</span>';
    capBEl.innerHTML = capturedByB.length ? glyphs(capturedByB, 'w') : '<span class="chess-empty">—</span>';
    capWCard.querySelector('h4').textContent = two ? 'Capturadas pelas brancas' : 'Você capturou';
    capBCard.querySelector('h4').textContent = two ? 'Capturadas pelas pretas' : 'A IA capturou';
  }

  function renderHistory() {
    if (!moveHistory.length) {
      histEl.innerHTML = '<span class="chess-empty">Nenhum movimento ainda.</span>';
      return;
    }
    let rows = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      const white = moveHistory[i];
      const black = moveHistory[i + 1];
      rows += '<span class="n">' + (i / 2 + 1) + '.</span>' +
        '<span class="mv' + (i === moveHistory.length - 1 ? ' last' : '') + '">' + white.san + '</span>' +
        '<span class="mv' + (i + 1 === moveHistory.length - 1 ? ' last' : '') + '">' + (black ? black.san : '') + '</span>';
    }
    histEl.innerHTML = rows;
    histCard.scrollTop = histCard.scrollHeight;
  }

  function render() {
    const checkSide = inCheck(st, st.turn) ? st.turn : null;
    for (let i = 0; i < 64; i++) {
      const el = cells[i], p = st.b[i], [r, c] = rc(i);
      el.className = 'chess-sq ' + ((r + c) % 2 ? 'dark' : 'light');
      el.innerHTML = p ? '<span class="cp ' + p.c + '">' + GLYPH[p.t] + '</span>' : '';
      el.style.removeProperty('--dx');
      el.style.removeProperty('--dy');
      if (i === sel) el.classList.add('sel');
      if (legalNow.some(m => m.to === i)) el.classList.add(p ? 'cap' : 'move');
      if (lastMove && (i === lastMove.from || i === lastMove.to)) el.classList.add('last');
      if (p && p.t === 'k' && checkSide === p.c) el.classList.add('check');
      if (animate && lastMove && i === lastMove.to) {
        const [fr, fc] = rc(lastMove.from), [tr, tc] = rc(lastMove.to);
        el.style.setProperty('--dx', ((fc - tc) * sz) + 'px');
        el.style.setProperty('--dy', ((fr - tr) * sz) + 'px');
        el.classList.add('arrive');
      }
      if (captureAt === i) el.classList.add('cap-hit');
    }
    animate = false;
    captureAt = -1;
    K.setScore(score);
    renderStatus();
    renderCaptured();
    renderHistory();
    undoBtn.disabled = !undoStack.length || thinking || over;
  }

  function end(msg) {
    over = true;
    info.textContent = msg;
    statusEl.innerHTML = '<span class="chess-turn">' + msg + '</span>';
    undoBtn.disabled = true;
    const current = generation;
    K.after(() => { if (current === generation) K.over(msg, score); }, 700);
  }

  function finishTurn() {
    const moves = legal(st, st.turn);
    if (!moves.length) {
      if (inCheck(st, st.turn)) {
        const winner = other(st.turn);
        if (!two) {
          if (winner === 'w') { score += 50; A.sfx('win'); end('Xeque-mate! Você venceu! 🏆'); }
          else end('Xeque-mate! A IA venceu.');
        } else {
          end('Xeque-mate! As ' + (winner === 'w' ? 'brancas' : 'pretas') + ' venceram. 🏆');
        }
      } else {
        end('Empate por afogamento.');
      }
      return true;
    }
    if (insufficientMaterial(st)) { end('Empate por material insuficiente.'); return true; }
    if (quietPlies >= 100) { end('Empate pela regra dos 50 lances.'); return true; }
    if ((positionCounts.get(positionKey(st)) || 0) >= 3) { end('Empate por repetição tripla.'); return true; }
    return false;
  }

  function doMove(move) {
    const before = st;
    const mover = before.b[move.from];
    const capturedPiece = move.ep != null ? before.b[move.ep] : before.b[move.to];
    const captured = !!(capturedPiece && capturedPiece.c !== mover.c);
    st = apply(before, move);
    lastMove = { from: move.from, to: move.to };
    animate = true;
    captureAt = captured ? move.to : -1;
    sel = -1;
    legalNow = [];
    quietPlies = (mover.t === 'p' || captured) ? 0 : quietPlies + 1;
    const key = positionKey(st);
    positionCounts.set(key, (positionCounts.get(key) || 0) + 1);
    if (captured) {
      if (mover.c === 'w') { capturedByW.push(capturedPiece.t); score += Math.round(VAL[capturedPiece.t] / 100); }
      else capturedByB.push(capturedPiece.t);
    }
    const opponent = st.turn;
    const opponentMoves = legal(st, opponent);
    const givesCheck = inCheck(st, opponent);
    const mate = opponentMoves.length === 0 && givesCheck;
    moveHistory.push({ san: sanFor(move, mover.c, captured, givesCheck, mate, before), mover: mover.c });
    A.sfx(captured ? 'coin' : 'step');
    render();
    if (finishTurn()) return;
    if (!two && st.turn === 'b') {
      thinking = true;
      renderStatus();
      const current = generation;
      K.after(() => { if (current === generation) aiMove(); }, 280);
    } else {
      thinking = false;
      renderStatus();
    }
  }

  function choosePromotion(type) {
    if (!pendingPromo) return;
    const options = pendingPromo;
    pendingPromo = null;
    promo.hidden = true;
    const move = options.find(option => option.promo === type) || options[0];
    A.sfx('click');
    doMove(move);
  }

  function showPromotion(options) {
    pendingPromo = options;
    promo.hidden = false;
    A.sfx('click');
  }

  function aiMove() {
    if (over) return;
    thinking = false;
    const move = bestMove(st, 'b');
    if (move) doMove(move);
    else finishTurn();
  }

  function click(i) {
    if (over || thinking || pendingPromo) return;
    if (!two && st.turn !== 'w') return;
    if (sel >= 0) {
      const options = legalNow.filter(move => move.to === i);
      if (options.length) {
        pushUndo();
        if (options.length > 1 && options[0].promo) showPromotion(options);
        else doMove(options[0]);
        return;
      }
    }
    const piece = st.b[i];
    if (piece && piece.c === st.turn) {
      sel = i;
      legalNow = legal(st, st.turn).filter(move => move.from === i);
      A.sfx('click');
      render();
    } else if (sel >= 0) {
      sel = -1;
      legalNow = [];
      render();
    }
  }

  function reset() {
    generation += 1;
    st = initial();
    sel = -1;
    legalNow = [];
    lastMove = null;
    over = false;
    thinking = false;
    score = 0;
    quietPlies = 0;
    positionCounts = new Map([[positionKey(st), 1]]);
    moveHistory = [];
    capturedByW = [];
    capturedByB = [];
    undoStack = [];
    animate = false;
    captureAt = -1;
    pendingPromo = null;
    promo.hidden = true;
    undoBtn.disabled = true;
    info.textContent = two ? 'Brancas começam. Jogador 1 (brancas) × Jogador 2 (pretas).' : 'Você joga de brancas. Clique numa peça para ver os movimentos.';
    render();
  }

  K.on(window, 'keydown', event => {
    if (event.key === 'u' || event.key === 'U') undo();
  });

  reset();
});

})();
