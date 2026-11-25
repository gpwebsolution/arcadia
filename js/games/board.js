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

// Jogo da Velha: 1P contra IA ou 2P local em melhor de 3.
A.register('tictactoe', K => {
  const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const W = b => { for (const [a, c, d] of L) if (b[a] && b[a] == b[c] && b[a] == b[d]) return b[a]; return b.every(Boolean) ? 'd' : 0; };
  const mm = (b, p) => { const w = W(b); if (w) return w == 'd' ? 0 : w == 'O' ? 1 : -1; let best = p == 'O' ? -2 : 2; b.forEach((v, i) => { if (!v) { b[i] = p; const s = mm(b, p == 'O' ? 'X' : 'O'); b[i] = 0; best = p == 'O' ? Math.max(best, s) : Math.min(best, s); } }); return best; };
  const two = K.players === 2;
  const randomChance = { easy: .5, normal: .22, hard: .04 }[K.difficulty] ?? .22;
  let b = Array(9).fill(0), busy = false, turn = 'X', sx = 0, so = 0;
  const sz = fit(3, 110, 80);
  const msg = A.el('div', 'msg', two ? 'Jogador 1 é X · Jogador 2 é O' : 'Você é X. Vença para marcar pontos!', K.root);
  const box = A.el('div', 'board', null, K.root); box.style.cssText = `grid-template-columns:repeat(3,${sz}px);gap:8px`;
  const cells = b.map((_, i) => { const c = A.el('button', 'cellb', '', box); c.onclick = () => play(i); return c; });
  const draw = () => cells.forEach((c, i) => { c.textContent = b[i] || ''; c.style.cssText = `width:${sz}px;height:${sz}px;font-size:${sz * .55}px;color:${b[i] == 'X' ? '#7c5cff' : '#00e0b8'}`; });
  const hud = () => { if (two) K.setScore(sx + ' × ' + so); };
  const reset = () => {
    b = Array(9).fill(0); busy = false; turn = 'X'; draw();
    msg.textContent = two ? 'Vez de X (Jogador 1)' : 'Você é X. Vença para marcar pontos!';
    hud();
  };
  const roundWin = who => {
    if (who == 'd') { msg.textContent = 'Empate! Ninguém pontua.'; K.after(reset, 900); return true; }
    if (two) {
      if (who == 'X') { sx++; msg.textContent = 'Jogador 1 fez o ponto!'; A.sfx('win'); }
      else { so++; msg.textContent = 'Jogador 2 fez o ponto!'; A.sfx('win'); }
      hud();
      if (sx >= 2 || so >= 2) {
        K.after(() => K.over(sx >= 2 ? 'Jogador 1 venceu a série! 🎉' : 'Jogador 2 venceu a série! 🎉', undefined, true), 450);
      } else K.after(reset, 900);
      return true;
    }
    if (who == 'X') { K.addScore(1); msg.textContent = 'Você venceu! 🎉'; A.sfx('win'); K.after(reset, 1000); }
    else if (who == 'O') K.over('A IA venceu 🤖');
    else { msg.textContent = 'Empate!'; K.after(reset, 1000); }
    return true;
  };
  const end = () => {
    const w = W(b); if (!w) return false; busy = true;
    if (two) return roundWin(w == 'd' ? 'd' : w);
    if (w == 'X') { K.addScore(1); msg.textContent = 'Você venceu! 🎉'; A.sfx('win'); K.after(reset, 1000); }
    else if (w == 'O') K.over('A IA venceu 🤖');
    else { msg.textContent = 'Empate!'; K.after(reset, 1000); } return true;
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
  const R = 6, C = 7, lines = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const l = []; for (let k = 0; k < 4; k++) l.push([r + dr * k, c + dc * k]); if (l.every(([y, x]) => y >= 0 && y < R && x >= 0 && x < C)) lines.push(l); }
  const win = (b, p) => lines.some(l => l.every(([r, c]) => b[r][c] == p));
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
  let b = Array.from({ length: R }, () => Array(C).fill(0)), busy = false, turn = 1, sx = 0, sy = 0;
  const sz = fit(C, 62, 50);
  const msg = A.el('div', 'msg', two ? 'Jogador 1 é 🔴 · Jogador 2 é 🟡' : 'Você é 🔴. Ligue 4 para marcar pontos!', K.root);
  const box = A.el('div', 'board', null, K.root);
  box.style.cssText = `grid-template-columns:repeat(${C},${sz}px);gap:6px;background:#2542c9;padding:8px;border-radius:14px`;
  const cells = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const e = A.el('button', '', '', box); e.onclick = () => play(c); cells.push(e); }
  const draw = () => cells.forEach((e, i) => { const v = b[Math.floor(i / C)][i % C]; e.style.cssText = `width:${sz}px;height:${sz}px;border-radius:50%;background:${v == 1 ? '#ff4d6d' : v == 2 ? '#ffd23f' : '#0b1020'}`; });
  const hud = () => { if (two) K.setScore(sx + ' × ' + sy); };
  const reset = () => {
    b = Array.from({ length: R }, () => Array(C).fill(0)); busy = false; turn = 1; draw();
    msg.textContent = two ? 'Vez do Jogador 1 (🔴)' : 'Você é 🔴. Ligue 4 para marcar pontos!';
    hud();
  };
  const roundWin = who => {
    if (two) {
      if (who == 1) { sx++; msg.textContent = 'Jogador 1 fez o ponto!'; }
      else { sy++; msg.textContent = 'Jogador 2 fez o ponto!'; }
      A.sfx('win'); hud();
      if (sx >= 2 || sy >= 2) K.after(() => K.over(sx >= 2 ? 'Jogador 1 venceu a série! 🎉' : 'Jogador 2 venceu a série! 🎉', undefined, true), 500);
      else K.after(reset, 1000);
      return true;
    }
    if (who == 1) { K.addScore(1); msg.textContent = 'Você venceu! 🎉'; A.sfx('win'); K.after(reset, 1100); }
    else K.over('A IA ligou 4 🤖');
    return true;
  };
  const check = () => {
    if (win(b, 1)) { busy = true; return roundWin(1); }
    if (win(b, 2)) { busy = true; return roundWin(2); }
    if (b[0].every(Boolean)) {
      busy = true;
      if (two) { msg.textContent = 'Empate! Ninguém pontua.'; K.after(reset, 900); }
      else { msg.textContent = 'Empate!'; K.after(reset, 1000); }
      return true;
    }
    return false;
  };
  const play = c => {
    if (busy || b[0][c]) return;
    drop(b, c, two ? turn : 1); A.sfx('click'); draw(); if (check()) return;
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
      drop(b, mv, 2); A.sfx('step'); draw(); busy = false; check();
    }, K.difficulty == 'hard' ? 220 : 300);
  };
  reset(); draw();
});

// Reversi: 1P contra IA ou 2P local. Vence quem tiver mais peças no fim.
A.register('reversi', K => {
  const D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const top = [[100, -20, 10, 5], [-20, -50, -2, -2], [10, -2, 1, 1], [5, -2, 1, 0]], wt = (x, y) => top[y < 4 ? y : 7 - y][x < 4 ? x : 7 - x];
  const flips = (b, x, y, p) => { if (b[y * 8 + x]) return []; let out = []; for (const [dx, dy] of D) { let cx = x + dx, cy = y + dy; const t = []; while (cx >= 0 && cx < 8 && cy >= 0 && cy < 8 && b[cy * 8 + cx] == -p) { t.push(cy * 8 + cx); cx += dx; cy += dy; } if (t.length && cx >= 0 && cx < 8 && cy >= 0 && cy < 8 && b[cy * 8 + cx] == p) out = out.concat(t); } return out; };
  const moves = (b, p) => { const m = []; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const f = flips(b, x, y, p); if (f.length) m.push([x, y, f]); } return m; };
  const two = K.players === 2;
  let b = Array(64).fill(0); b[27] = b[36] = -1; b[28] = b[35] = 1;
  let busy = false, turn = 1;
  const sz = fit(8, 54, 50);
  const info = A.el('div', 'msg', '', K.root), box = A.el('div', 'board', null, K.root);
  box.style.cssText = `grid-template-columns:repeat(8,${sz}px);gap:2px;background:#0d5c3a;padding:4px;border-radius:10px`;
  const cells = b.map((_, i) => { const c = A.el('button', '', '', box); c.onclick = () => click(i); return c; });
  const cnt = p => b.filter(v => v == p).length;
  const draw = () => {
    const human = two ? turn : 1;
    const hints = busy ? [] : moves(b, human).map(m => m[1] * 8 + m[0]);
    cells.forEach((c, i) => { c.style.cssText = `width:${sz}px;height:${sz}px;background:#127a4b;border-radius:4px;display:grid;place-items:center`; c.innerHTML = b[i] ? `<span style="width:78%;height:78%;border-radius:50%;background:${b[i] == 1 ? '#111' : '#f5f5f5'}"></span>` : hints.includes(i) ? '<span style="width:22%;height:22%;border-radius:50%;background:rgba(255,255,255,.35)"></span>' : ''; });
    info.textContent = two
      ? `⚫ J1 ${cnt(1)}  ×  ${cnt(-1)} J2 ⚪` + (turn == 1 ? ' · vez do ⚫' : ' · vez do ⚪')
      : `⚫ Você ${cnt(1)}  ×  ${cnt(-1)} IA ⚪`;
  };
  const apply = (m, p) => { b[m[1] * 8 + m[0]] = p; m[2].forEach(i => b[i] = p); };
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
    if (!f.length) return;
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
  K.low = true; K.fmt = n => n + ' tent.';
  const PAL = ['#ff4d6d', '#ffd23f', '#3ddc84', '#4c7dff', '#b05cff', '#ff9f43'], code = Array.from({ length: 4 }, () => A.rand(0, 5)); let cur = [], rows = 0;
  const board = A.el('div', '', '', K.root); board.style.cssText = 'display:flex;flex-direction:column;gap:6px;background:rgba(255,255,255,.05);padding:10px;border-radius:14px';
  const dot = (c, s) => `<i style="width:${s}px;height:${s}px;border-radius:50%;background:${c};display:inline-block"></i>`;
  const R = Array.from({ length: 10 }, () => A.el('div', '', '', board)); R.forEach(r => r.style.cssText = 'display:flex;gap:6px;align-items:center;justify-content:space-between');
  const draw = (i, peg, fb) => { R[i].innerHTML = `<span style="display:flex;gap:6px">${peg.map(c => dot(PAL[c], 30)).join('') + [...Array(4 - peg.length)].map(() => dot('rgba(255,255,255,.1)', 30)).join('')}</span><span style="display:grid;grid-template-columns:repeat(2,10px);gap:3px;width:26px">${(fb || []).map(c => dot(c, 10)).join('')}</span>`; };
  R.forEach((_, i) => draw(i, [])); const pal = A.el('div', 'btns', null, K.root);
  PAL.forEach((c, i) => { const b = A.el('button', 'gb', '', pal); b.style.cssText = `background:${c};width:44px;height:44px;border-radius:50%`; b.onclick = () => add(i); });
  const del = A.el('button', 'gb', '⌫', pal); del.onclick = () => { cur.pop(); draw(rows, cur); };
  const add = c => {
    if (cur.length >= 4) return; cur.push(c); draw(rows, cur); A.sfx('click'); if (cur.length < 4) return;
    let bl = 0; const cc = {}, gc = {}; cur.forEach((v, i) => { if (v == code[i]) bl++; else { cc[v] = (cc[v] || 0) + 1; gc[code[i]] = (gc[code[i]] || 0) + 1; } });
    let wh = 0; for (const k in cc) wh += Math.min(cc[k], gc[k] || 0);
    draw(rows, cur, Array(bl).fill('#fff').concat(Array(wh).fill('#777'))); rows++; K.setScore(rows);
    if (bl == 4) return K.over('Código quebrado! 🔓', rows); if (rows == 10) return K.over('O código era ' + code.map(c => ['🔴', '🟡', '🟢', '🔵', '🟣', '🟠'][c]).join(''), rows, true); cur = [];
  };
  A.el('p', 'msg', '⚪ cor e posição certas · ⚫ cor certa, posição errada', K.root).style.cssText = 'font-size:13px;color:#9aa0c8';
});

// Pedra, Papel e Tesoura: sequencia de vitorias vale pontos; uma derrota encerra.
A.register('rps', K => {
  const O = [['🪨', 'Pedra'], ['📄', 'Papel'], ['✂️', 'Tesoura']];
  const msg = A.el('div', 'msg', 'Escolha! Sua sequência de vitórias vale pontos.', K.root), arena = A.el('div', '', '👤 ❔ × ❔ 🤖', K.root); arena.style.cssText = 'font-size:46px;min-height:70px';
  const bt = A.el('div', 'btns', null, K.root);
  O.forEach((o, i) => { const b = A.el('button', 'gb', o[0] + '<br>' + o[1], bt); b.style.fontSize = '22px'; b.onclick = () => {
    const c = A.rand(0, 2); arena.textContent = `👤 ${o[0]} × ${O[c][0]} 🤖`;
    if (c == i) { msg.textContent = 'Empate!'; A.sfx('click'); } else if ((i + 1) % 3 == c) { K.over('Você perdeu com ' + K.score + ' vitórias'); } else { K.addScore(1); msg.textContent = 'Você ganhou! 🎉'; A.sfx('coin'); } }; });
});

// Batalha Naval: frota 8x8 escondida; afunde todos os navios no menor numero de tiros.
A.register('battleship', K => {
  K.low = true; K.fmt = n => n + ' tiros';
  const N = 8, sz = fit(N, 46, 60), ships = [4, 3, 3, 2], g = Array(N * N).fill(-1), hit = Array(N * N).fill(0), left = ships.slice(); let shots = 0;
  ships.forEach((len, id) => { for (;;) { const h = Math.random() < .5, x = A.rand(0, h ? N - len : N - 1), y = A.rand(0, h ? N - 1 : N - len), cs = Array.from({ length: len }, (_, k) => (y + (h ? 0 : k)) * N + x + (h ? k : 0)); if (cs.every(c => g[c] < 0)) { cs.forEach(c => g[c] = id); break; } } });
  const info = A.el('div', 'msg', 'Afunde todos os navios (4, 3, 3, 2) com o mínimo de tiros.', K.root), box = A.el('div', 'board', null, K.root); box.style.cssText = `grid-template-columns:repeat(${N},${sz}px);gap:3px;background:#0b3a66;padding:6px;border-radius:10px`;
  const cells = g.map((_, i) => { const c = A.el('button', '', '', box); c.style.cssText = `width:${sz}px;height:${sz}px;background:#1565a8;border-radius:6px;font-size:${sz * .55}px`; c.onclick = () => fire(i); return c; });
  const fire = i => {
    if (hit[i]) return; hit[i] = 1; shots++; K.setScore(shots);
    if (g[i] >= 0) { cells[i].textContent = '💥'; cells[i].style.background = '#c0392b'; A.sfx('hit'); if (!--left[g[i]]) { info.textContent = 'Navio de ' + ships[g[i]] + ' afundado! 🚢'; A.sfx('win'); } if (left.every(x => !x)) K.over('Frota destruída! ⚓', shots); }
    else { cells[i].textContent = '•'; cells[i].style.background = '#0f4c81'; A.sfx('step'); }
  };
});

// Mancala (Kalah): semeadura de sementes contra uma IA que simula jogadas.
A.register('mancala', K => {
  let b = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], turn = 0, busy = false;
  const own = t => t ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5], store = t => t ? 13 : 6;
  const sow = (b, i, t) => { let n = b[i]; b[i] = 0; let j = i; while (n) { j = (j + 1) % 14; if (j == store(1 - t)) continue; b[j]++; n--; } const extra = j == store(t); if (!extra && own(t).includes(j) && b[j] == 1 && b[12 - j] > 0) { b[store(t)] += b[12 - j] + 1; b[j] = 0; b[12 - j] = 0; } return extra; };
  const ended = b => own(0).every(i => !b[i]) || own(1).every(i => !b[i]);
  const sz = fit(8, 62, 40), info = A.el('div', 'msg', 'Sua vez! Escolha uma cova da linha de baixo.', K.root), box = A.el('div', '', '', K.root);
  box.style.cssText = `display:grid;grid-template-columns:repeat(8,${sz}px);grid-template-rows:${sz}px ${sz}px;gap:6px;background:#6b3f1d;padding:10px;border-radius:18px`;
  const els = {}; const mk = (i, col, row, span) => { const e = A.el('button', '', '', box); e.style.gridColumn = col; e.style.gridRow = row + (span ? '/span 2' : ''); els[i] = e; if (i < 6 && i >= 0) e.onclick = () => play(i); };
  mk(13, 1, 1, 1); for (let k = 0; k < 6; k++) { mk(12 - k, 2 + k, 1); mk(k, 2 + k, 2); } mk(6, 8, 1, 1);
  const draw = () => { for (const i in els) els[i].style.cssText = `grid-column:${els[i].style.gridColumn};grid-row:${els[i].style.gridRow};border-radius:${i == 6 || i == 13 ? 30 : 50}%;background:#a0662e;font-size:${sz * .42}px;font-weight:800;color:#fff;box-shadow:inset 0 3px 8px rgba(0,0,0,.45)`, els[i].textContent = b[i]; };
  const end = () => { own(0).forEach(i => { b[6] += b[i]; b[i] = 0; }); own(1).forEach(i => { b[13] += b[i]; b[i] = 0; }); draw(); const d = b[6] - b[13]; K.score = d; d > 0 ? K.over('Você venceu! 🏆', d) : K.over(d ? 'A IA venceu 🤖' : 'Empate!', d, true); };
  const ai = () => {
    let best = -1, bs = -1e9; own(1).forEach(i => { if (!b[i]) return; const c = b.slice(), ex = sow(c, i, 1), s = c[13] - c[6] + (ex ? 4 : 0) + Math.random(); if (s > bs) { bs = s; best = i; } });
    const ex = sow(b, best, 1); A.sfx('step'); draw(); if (ended(b)) return end();
    if (ex) K.after(ai, 700); else { busy = false; info.textContent = 'Sua vez!'; }
  };
  const play = i => {
    if (busy || !b[i]) return; const ex = sow(b, i, 0); A.sfx('click'); draw(); if (ended(b)) return end();
    if (ex) { info.textContent = 'Jogue de novo! ✨'; return; } busy = true; info.textContent = 'IA pensando…'; K.after(ai, 700);
  };
  draw();
});
})();
