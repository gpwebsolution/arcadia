/* =============================================================================
   ARCADIA - JOGOS DE ARCADE (parte 3)
   -----------------------------------------------------------------------------
   Jogos deste arquivo: Labirinto, Defesa de Cidades, Canhao, Gravidade Zero,
   Moto de Luz, Come-Come, Pouso Lunar e Nave Galactica. Varios usam geracao
   procedural (labirinto, terreno, ondas) para nunca repetir a mesma partida.
   ============================================================================= */
(function () {
const A = Arcadia;

// Labirinto: 40 fases com labirintos maiores e menos tempo a cada avanço.
A.register('maze', K => {
  K.canvas(480, 480); const { g, R, T } = K, C = A.campaign(K, 40);
  let t = 0, cells, N, S, px, py, cd = 0;
  const timeFor = () => Math.max(28, Math.round(78 - C.level * 1.1));
  const build = () => {
    N = Math.min(25, 7 + C.level * 2); S = Math.floor(480 / N); cells = Array.from({ length: N * N }, () => [1, 1, 1, 1]); const seen = new Set([0]), st = [0];
    while (st.length) {
      const c = st[st.length - 1], x = c % N, y = Math.floor(c / N), nb = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]].filter(([dx, dy]) => x + dx >= 0 && x + dx < N && y + dy >= 0 && y + dy < N && !seen.has((y + dy) * N + x + dx));
      if (!nb.length) { st.pop(); continue; } const [dx, dy, a, b] = A.pick(nb), n = (y + dy) * N + x + dx; cells[c][a] = 0; cells[n][b] = 0; seen.add(n); st.push(n);
    }
    px = 0; py = 0; t = timeFor();
  };
  build(); K.pad('arrows'); K.swipe();
  const move = (dx, dy) => {
    const i = py * N + px, w = dx > 0 ? 1 : dx < 0 ? 3 : dy > 0 ? 2 : 0; if (cells[i][w]) return;
    px += dx; py += dy; A.sfx('step');
    if (px == N - 1 && py == N - 1) {
      K.addScore(100 + Math.ceil(t));
      if (C.last) return C.finish('Campanha completa! 🏆');
      K.burst((N - 1) * S + S / 2, (N - 1) * S + S / 2, '#3ddc84', 20, 4);
      C.advance('Labirinto maior e menos tempo', build);
    }
  };
  K.onKey(c => { const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[c]; if (m) { move(...m); cd = .25; } });
  K.every(() => { t--; if (t <= 0) K.over('Tempo esgotado na fase ' + C.level); }, 1000);
  K.loop(dt => {
    cd -= dt; if (cd <= 0) { const d = K.dir(); if (d.x || d.y) { move(d.x && !d.y ? d.x : 0, d.y && !d.x ? d.y : 0); cd = .1; } }
    R(0, 0, 480, 480, '#0b1020'); g.strokeStyle = '#7c5cff'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
    cells.forEach((w, i) => { const x = (i % N) * S, y = Math.floor(i / N) * S; if (w[0]) { g.moveTo(x, y); g.lineTo(x + S, y); } if (w[1]) { g.moveTo(x + S, y); g.lineTo(x + S, y + S); } if (w[2]) { g.moveTo(x, y + S); g.lineTo(x + S, y + S); } if (w[3]) { g.moveTo(x, y); g.lineTo(x, y + S); } }); g.stroke();
    R((N - 1) * S + 4, (N - 1) * S + 4, S - 8, S - 8, '#3ddc84'); K.C(px * S + S / 2, py * S + S / 2, S * .3, '#ffd23f');
    T('⏱ ' + t + '  ·  Fase ' + C.level + '/40', 240, 466, 14, '#9aa0c8');
  });
});

// Defesa de Cidades: 40 fases com mais mísseis, cidades restauradas e ritmo maior.
A.register('missile', K => {
  K.canvas(560, 560); const { g, R, T } = K, C = A.campaign(K, 40);
  let en = [], sh = [], ex = [], cities = [1, 1, 1, 1, 1, 1], left = 0, t = 0;
  const cx = i => 50 + i * 92;
  const nw = () => {
    cities = [1, 1, 1, 1, 1, 1]; en = []; sh = []; ex = [];
    left = 6 + C.level * 2; t = 0;
  };
  nw();
  K.on(K.cv, 'pointerdown', e => { const p = K.pos(e); if (p.y > 470) return; sh.push({ x: 280, y: 520, tx: p.x, ty: p.y }); A.sfx('step'); });
  K.loop(() => {
    if (left > 0 && --t <= 0) {
      const ti = A.pick(cities.map((c, i) => c ? i : -1).filter(i => i >= 0)), sx = A.rand(0, 560);
      en.push({ x: sx, y: 0, sx, tx: cx(ti), ty: 520, ti, p: 0, sp: .0011 + C.level * .00004 });
      left--; t = A.rand(Math.max(14, 40 - C.level * .5), Math.max(28, 70 - C.level * .8));
    }
    en.forEach(m => { m.p += m.sp * 6; m.x = m.sx + (m.tx - m.sx) * m.p; m.y = 520 * m.p; });
    for (const m of en) if (m.p >= 1) { m.dead = 1; cities[m.ti] = 0; ex.push({ x: m.tx, y: 520, r: 4, max: 44, up: 1, bad: 1 }); A.sfx('hit'); K.burst(m.tx, 520, '#ff4d6d', 18, 4); K.shake(280); }
    sh.forEach(s => { const d = Math.hypot(s.tx - s.x, s.ty - s.y); if (d < 8) { s.dead = 1; ex.push({ x: s.tx, y: s.ty, r: 4, max: 50, up: 1 }); A.sfx('pop'); } else { s.x += (s.tx - s.x) / d * 9; s.y += (s.ty - s.y) / d * 9; } });
    ex.forEach(e => { if (e.up) { e.r += 1.4; if (e.r >= e.max) e.up = 0; } else e.r -= 1; });
    for (const m of en) for (const e of ex) if (!m.dead && !e.bad && Math.hypot(m.x - e.x, m.y - e.y) < e.r) { m.dead = 1; K.addScore(25); K.burst(m.x, m.y, '#ffd23f', 12, 3); A.sfx('pop'); }
    en = en.filter(m => !m.dead); sh = sh.filter(s => !s.dead); ex = ex.filter(e => e.r > 0);
    if (!cities.some(Boolean)) return K.over('Cidades destruídas na fase ' + C.level + '! 🌆');
    if (!left && !en.length) {
      K.addScore(50 + C.level * 10);
      if (C.last) return C.finish('Campanha completa! 🏆');
      C.advance('Mais mísseis e cidades restauradas', nw); return;
    }
    R(0, 0, 560, 560, '#05060f'); R(0, 530, 560, 30, '#2d6a4f');
    cities.forEach((c, i) => c ? (R(cx(i) - 16, 510, 32, 20, '#4c7dff'), R(cx(i) - 8, 500, 16, 10, '#7aa2ff')) : R(cx(i) - 16, 524, 32, 6, '#444'));
    g.strokeStyle = '#ff4d6d'; g.lineWidth = 2; en.forEach(m => { g.beginPath(); g.moveTo(m.sx, 0); g.lineTo(m.x, m.y); g.stroke(); K.C(m.x, m.y, 3, '#fff'); });
    g.strokeStyle = '#3ddc84'; sh.forEach(s => { K.C(s.x, s.y, 3, '#3ddc84'); R(s.tx - 4, s.ty - 1, 8, 2, '#3ddc84'); R(s.tx - 1, s.ty - 4, 2, 8, '#3ddc84'); });
    ex.forEach(e => K.C(e.x, e.y, e.r, e.bad ? 'rgba(255,100,60,.7)' : 'rgba(255,230,120,.7)'));
    T('Fase ' + C.level + '/40', 60, 20, 14, '#9aa0c8');
  });
});

// Canhao: 40 fases com alvos menores e metas de acertos por fase.
A.register('cannon', K => {
  K.canvas(640, 400); const { R, T } = K, C = A.campaign(K, 40);
  let ang = -.7, pw = 0, charging = false, b = null, tg, shots = 8, hits = 0, goal = 2;
  const mk = () => { const r = Math.max(14, 26 - C.level * .25); tg = { x: A.rand(300, 600), y: A.rand(120, 340), r }; };
  const build = () => { hits = 0; shots = 8; goal = 2 + Math.floor((C.level - 1) / 5); b = null; charging = false; pw = 0; mk(); };
  build();
  K.on(K.cv, 'pointermove', e => { const p = K.pos(e); ang = A.clamp(Math.atan2(p.y - 350, p.x - 40), -1.45, -.05); });
  K.on(K.cv, 'pointerdown', e => { if (b) return; const p = K.pos(e); ang = A.clamp(Math.atan2(p.y - 350, p.x - 40), -1.45, -.05); charging = true; pw = 0; });
  K.on(window, 'pointerup', () => { if (!charging) return; charging = false; if (b) return; const v = 6 + pw * 13; b = { x: 40, y: 350, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v }; shots--; A.sfx('hit'); });
  K.loop(dt => {
    if (charging) pw = Math.min(1, pw + dt * .9);
    if (b) {
      b.x += b.vx; b.y += b.vy; b.vy += .2;
      if (Math.hypot(b.x - tg.x, b.y - tg.y) < tg.r + 8) {
        K.addScore(10 + C.level); shots++; hits++; K.burst(tg.x, tg.y, '#ff4d6d', 18, 4); A.fx.confetti(40, true); A.sfx('win'); b = null;
        if (hits >= goal) {
          if (C.last) return C.finish('Campanha completa! 🏆');
          C.advance('Alvos menores e mais acertos', build); return;
        } else mk();
      } else if (b.y > 380 || b.x > 660 || b.x < -20) { b = null; A.sfx('step'); if (shots <= 0) return K.over('Sem balas na fase ' + C.level); }
    }
    R(0, 0, 640, 400, '#12203f'); R(0, 380, 640, 20, '#2d6a4f');
    K.C(tg.x, tg.y, tg.r, '#ff4d6d'); K.C(tg.x, tg.y, tg.r * .65, '#fff'); K.C(tg.x, tg.y, tg.r * .3, '#ff4d6d');
    const g = K.g; g.save(); g.translate(40, 350); g.rotate(ang); g.fillStyle = '#9aa0c8'; g.fillRect(0, -9, 50, 18); g.restore(); K.C(40, 355, 20, '#555');
    if (b) K.C(b.x, b.y, 7, '#ffd23f'); R(20, 385, 120, 8, '#222'); R(20, 385, 120 * pw, 8, pw > .8 ? '#ff4d6d' : '#3ddc84');
    T('Balas: ' + shots, 580, 24, 18);
    T('Fase ' + C.level + '/40', 70, 24, 13, '#9aa0c8'); T('Alvos ' + hits + '/' + goal, 320, 24, 13, '#9aa0c8');
    if (!charging && !b && K.score == 0) T('Segure para dar força, solte para atirar', 320, 40, 16, '#9aa0c8');
  });
});

// Gravidade Zero: 40 fases com metas de distância e obstáculos mais rápidos.
A.register('gravity', K => {
  K.canvas(640, 300); const { R, T } = K, C = A.campaign(K, 40);
  let y = 250, vy = 0, gd = 1, ob = [], t = 0, sp = 5, dist = 0, total = 0, goal = 1, lives = 3;
  const build = () => { y = 250; vy = 0; gd = 1; ob = []; t = 0; sp = 5 + C.level * .12; dist = 0; goal = 900 + C.level * 80; lives = 3; };
  const flip = () => { gd = -gd; K.burst(100, y, '#00e0b8', 7, 2); A.sfx('step'); };
  build(); K.on(K.cv, 'pointerdown', flip); K.onKey(c => { if (c == 'Space' || c == 'ArrowUp' || c == 'ArrowDown') flip(); }); K.pad('a');
  K.loop(() => {
    vy += gd * .9; y += vy; if (y > 258) { y = 258; vy = 0; } if (y < 42) { y = 42; vy = 0; }
    sp += .002; dist += sp; total += sp; K.setScore(Math.floor(total / 10));
    if (dist >= goal) {
      if (C.last) return C.finish('Campanha completa! 🏆');
      C.advance('Mais velocidade e obstáculos', build); return;
    }
    if (--t <= 0) {
      const top = Math.random() < .5, h = A.rand(30, 90);
      ob.push({ x: 660, w: A.rand(24, 50), h, top });
      if (C.level > 20 && Math.random() < .25) ob.push({ x: 660 + A.rand(80, 180), w: A.rand(24, 50), h: A.rand(30, 70), top: !top });
      t = A.rand(35, 80) * 5 / sp;
    }
    ob.forEach(o => o.x -= sp); ob = ob.filter(o => o.x > -60);
    for (const o of ob) {
      const oy = o.top ? 20 : 280 - o.h;
      if (100 < o.x + o.w && 70 + 30 > o.x && y - 16 < oy + o.h && y + 16 > oy && (o.top ? y - 16 < 20 + o.h : y + 16 > 280 - o.h)) {
        lives--; A.sfx('hit'); K.shake(240); K.burst(100, y, '#ff4d6d', 18, 4); y = 250; vy = 0; ob = []; t = 30;
        if (!lives) return K.over('Fase ' + C.level + '/40');
        break;
      }
    }
    R(0, 0, 640, 300, '#150b2e'); R(0, 0, 640, 20, '#7c5cff'); R(0, 280, 640, 20, '#7c5cff');
    ob.forEach(o => R(o.x, o.top ? 20 : 280 - o.h, o.w, o.h, '#ff4d6d')); R(84, y - 16, 32, 32, '#00e0b8'); R(104, y - 6 * gd, 6, 6, '#001');
    T(String(K.score), 590, 40, 22);
    T('♥'.repeat(lives), 50, 24, 15, '#ff4d6d'); T('Fase ' + C.level + '/40', 320, 24, 13, '#9aa0c8');
    R(0, 296, 640 * Math.min(1, dist / goal), 4, '#00e0b8');
  });
});

// Moto de Luz: duelo de motos de luz contra a IA ou 2 jogadores locais.
A.register('tron', K => {
  K.canvas(480, 480);
  const { g, R, T } = K, N = 40, S = 12, C = A.campaign(K, 40);
  const two = K.players === 2;

  let grid, p1, p2, d1, d2, n1, n2, t = 0, sp = .08;
  let phase = 'warmup', warmup = 1.2, roundPause = 0, roundWinner = 0, round = 1;
  const wins = [0, 0];

  const speed = () => { sp = two ? .075 : Math.max(.045, .085 - C.level * .001); };

  const reset = () => {
    grid = new Uint8Array(N * N);
    p1 = { x: 8, y: 20 };
    p2 = { x: 31, y: 20 };
    d1 = [1, 0]; d2 = [-1, 0]; n1 = d1; n2 = d2;
    grid[20 * N + 8] = 1;
    grid[20 * N + 31] = 2;
    t = 0; phase = 'warmup'; warmup = 1.2; roundWinner = 0;
  };

  const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !grid[y * N + x];

  const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const WASD = { KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] };

  const turn = (dir, code, arrows, wasd) => {
    const m = arrows[code] || wasd[code];
    if (m && !(m[0] === -dir[0] && m[1] === -dir[1])) return m;
    return null;
  };

  reset(); speed();
  if (two) K.pad('arrows wasd'); else K.pad('arrows');
  K.swipe();

  K.onKey(code => {
    const m1 = turn(d1, code, ARROWS, two ? {} : WASD);
    if (m1) n1 = m1;
    if (two) {
      const m2 = turn(d2, code, {}, WASD);
      if (m2) n2 = m2;
    }
  });

  function aiTurn() {
    const options = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => {
      if (d[0] === -d2[0] && d[1] === -d2[1]) return false;
      return free(p2.x + d[0], p2.y + d[1]) &&
        free(p2.x + d[0] * 2, p2.y + d[1] * 2) &&
        free(p2.x + d[0] * 3, p2.y + d[1] * 3);
    });
    const straight = free(p2.x + d2[0], p2.y + d2[1]) && free(p2.x + d2[0] * 3, p2.y + d2[1] * 3);
    if (straight && Math.random() > .02 + C.level * .0015) return;
    if (options.length) n2 = A.pick(options);
  }

  function crash(which) {
    const cell = which === 1 ? p1 : p2;
    K.burst(cell.x * S + S / 2, cell.y * S + S / 2, which === 1 ? '#00e0f0' : '#ff4d6d', 22, 4);
    K.shake(220);
    A.sfx('crash');
  }

  function endRound(winner) {
    roundWinner = winner;
    phase = 'roundover';
    roundPause = 1.5;
    if (winner) wins[winner - 1]++;
    if (winner) A.sfx('win'); else A.sfx('lose');
  }

  function drawCycle(cell, dir, color) {
    const cx = cell.x * S + S / 2, cy = cell.y * S + S / 2;
    g.save();
    g.translate(cx, cy);
    g.rotate(Math.atan2(dir[1], dir[0]));
    g.shadowColor = color;
    g.shadowBlur = 14;
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(-S * .44, -S * .29, S * .88, S * .58, 3);
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#04060e';
    g.beginPath(); g.arc(-S * .27, 0, S * .17, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(S * .27, 0, S * .17, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(S * .36, 0, S * .075, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function draw() {
    R(0, 0, 480, 480, '#04060e');
    for (let x = 0; x <= 480; x += S * 4) R(x, 0, 1, 480, 'rgba(0,224,184,.055)');
    for (let y = 0; y <= 480; y += S * 4) R(0, y, 480, 1, 'rgba(0,224,184,.055)');

    for (let i = 0; i < N * N; i++) {
      const v = grid[i];
      if (!v) continue;
      R((i % N) * S + 1, Math.floor(i / N) * S + 1, S - 2, S - 2, v === 1 ? '#00e0f0' : '#ff4d6d');
    }

    drawCycle(p1, d1, '#00e0f0');
    drawCycle(p2, d2, '#ff4d6d');

    R(6, 6, 116, 22, 'rgba(4,6,14,.72)');
    T(two ? 'J1 ' + wins[0] : 'VOCÊ', 14, 17, 11, '#00e0f0', 'left');
    R(358, 6, 116, 22, 'rgba(4,6,14,.72)');
    T(two ? 'J2 ' + wins[1] : 'IA', 466, 17, 11, '#ff4d6d', 'right');
    R(184, 6, 112, 22, 'rgba(4,6,14,.72)');
    T(two ? 'RODADA ' + round : 'FASE ' + C.level + '/40', 240, 17, 10, '#9aa0c8');

    if (phase === 'warmup') {
      R(0, 0, 480, 480, 'rgba(4,6,14,.55)');
      T(String(Math.max(1, Math.ceil(warmup / .4))), 240, 220, 88, '#fff');
      T(two ? 'J1: setas · J2: WASD' : 'Prepare a moto de luz', 240, 300, 15, '#9aa0c8');
    }

    if (phase === 'roundover') {
      R(0, 0, 480, 480, 'rgba(4,6,14,.55)');
      const msg = roundWinner === 1 ? 'JOGADOR 1 VENCEU!' : roundWinner === 2 ? 'JOGADOR 2 VENCEU!' : 'EMPATE!';
      T(msg, 240, 230, 30, roundWinner === 1 ? '#00e0f0' : roundWinner === 2 ? '#ff4d6d' : '#ffd23f');
      T(wins[0] + ' x ' + wins[1], 240, 272, 22, '#fff');
    }
  }

  K.setScore(0);

  K.loop(dt => {
    if (phase === 'warmup') {
      warmup -= dt;
      if (warmup <= 0) { phase = 'race'; A.sfx('go'); }
      draw();
      return;
    }

    if (phase === 'roundover') {
      roundPause -= dt;
      if (roundPause <= 0) {
        const champion = wins[0] >= 2 ? 1 : wins[1] >= 2 ? 2 : 0;
        if (two && champion) {
          K.over('JOGADOR ' + champion + ' VENCEU A PARTIDA! (' + wins[0] + ' x ' + wins[1] + ')', wins[champion - 1], true);
          return;
        }
        if (two) round++;
        reset();
        speed();
      }
      draw();
      return;
    }

    t += dt;
    if (t < sp) return;
    t = 0;

    d1 = n1;
    if (two) {
      d2 = n2;
    } else {
      aiTurn();
      d2 = n2;
    }

    const q1 = { x: p1.x + d1[0], y: p1.y + d1[1] };
    const q2 = { x: p2.x + d2[0], y: p2.y + d2[1] };
    const hit1 = !free(q1.x, q1.y);
    const hit2 = !free(q2.x, q2.y) || (q1.x === q2.x && q1.y === q2.y);

    if (hit1 || hit2) {
      if (hit1) crash(1);
      if (hit2) crash(2);
      if (two) {
        if (hit1 && hit2) endRound(0);
        else endRound(hit1 ? 2 : 1);
      } else if (hit1) {
        return K.over('Sua moto bateu na fase ' + C.level + '! 💥');
      } else {
        K.addScore(1);
        if (C.last) return C.finish('Campanha completa! 🏆');
        C.advance('IA mais rápida e agressiva', () => { reset(); speed(); });
      }
      return;
    }

    p1 = q1;
    p2 = q2;
    grid[p1.y * N + p1.x] = 1;
    grid[p2.y * N + p2.x] = 2;
    if (!two && Math.random() < .06) A.sfx('step');
    draw();
  });
});

// Come-Come: labirinto fixo, pontos e fantasmas que perseguem o jogador.
A.register('comecoco', K => {
  K.canvas(480, 448); const { g, R, T } = K, S = 32;
  const MAP = ['###############', '#......#......#', '#.##.#.#.#.##.#', '#o....#.#....o#', '#.##.#...#.##.#', '#.##.#.#.#.##.#', '#.............#', '#.##.#####.##.#', '#.##.......##.#', '#....##.##....#', '#o##.#...#.##o#', '#.............#', '###############'];
  let m, pac, ghosts, dir = [0, 0], want = [0, 0], tp = 0, scared = 0, lives = 3, dots, lvl = 1;
  const reset = () => {
    pac = { x: 7, y: 11 }; dir = [0, 0]; want = [0, 0];
    const gs = [[6, 6, '#ff4d6d'], [7, 6, '#ff9f43'], [8, 6, '#00e0f0']];
    if (lvl > 10) gs.push([5, 6, '#ff5cc8']);
    if (lvl > 25) gs.push([9, 6, '#9dff5c']);
    ghosts = gs.map(([x, y, c]) => ({ x, y, c, d: [0, -1], t: 0, ox: x, oy: y }));
  };
  const init = () => { m = MAP.map(r => [...r]); dots = m.flat().filter(c => c == '.' || c == 'o').length; reset(); }; init();
  const ok = (x, y) => m[y] && m[y][x] != '#' && m[y][x] !== undefined;
  K.pad('arrows'); K.swipe(); K.onKey(c => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[c]; if (d) want = d; });
  const hurt = () => { lives--; A.sfx('hit'); if (!lives) return K.over(); reset(); };
  const hitCheck = () => ghosts.forEach(gh => { if (gh.x == pac.x && gh.y == pac.y) { if (scared > 0) { K.addScore(200); K.burst(gh.x * S + 16, gh.y * S + 16, '#3b4cff', 18, 4); A.sfx('win'); gh.x = 7; gh.y = 6; } else hurt(); } });
  K.loop(dt => {
    tp += dt; scared = Math.max(0, scared - dt);
    if (tp > .15) { tp = 0; if (ok(pac.x + want[0], pac.y + want[1])) dir = want; if (ok(pac.x + dir[0], pac.y + dir[1])) { pac.x += dir[0]; pac.y += dir[1]; } const c = m[pac.y][pac.x]; if (c == '.') { m[pac.y][pac.x] = ' '; K.addScore(10); dots--; A.sfx('step'); } if (c == 'o') { m[pac.y][pac.x] = ' '; K.addScore(50); dots--; scared = 7; K.burst(pac.x * S + 16, pac.y * S + 16, '#fff', 14, 3); A.sfx('coin'); } hitCheck(); if (dots <= 0) {
          if (lvl >= 40) return K.over('Campanha completa! 🏆');
          lvl++; lives = 3; K.banner('FASE ' + lvl + '/40', 'Fantasmas mais rápidos'); K.burst(240, 224, '#ffd23f', 26, 5); A.sfx('win'); init();
        } }
    ghosts.forEach(gh => { gh.t += dt; if (gh.t > (scared > 0 ? .28 : Math.max(.12, .22 - lvl * .01))) { gh.t = 0; const ds = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => ok(gh.x + d[0], gh.y + d[1]) && !(d[0] == -gh.d[0] && d[1] == -gh.d[1])); if (!ds.length) ds.push([-gh.d[0], -gh.d[1]]); let d; if (Math.random() < .65) { d = ds.slice().sort((a, b) => { const da = Math.hypot(gh.x + a[0] - pac.x, gh.y + a[1] - pac.y), db = Math.hypot(gh.x + b[0] - pac.x, gh.y + b[1] - pac.y); return scared > 0 ? db - da : da - db; })[0]; } else d = A.pick(ds); gh.d = d; gh.x += d[0]; gh.y += d[1]; hitCheck(); } });
    R(0, 0, 480, 448, '#000'); m.forEach((r, y) => r.forEach((c, x) => { if (c == '#') { g.fillStyle = '#2a3cc9'; g.beginPath(); g.roundRect(x * S + 2, y * S + 2, S - 4, S - 4, 8); g.fill(); } else if (c == '.') K.C(x * S + 16, y * S + 16, 3, '#ffd9a0'); else if (c == 'o') K.C(x * S + 16, y * S + 16, 8, '#fff'); }));
    const ang = dir[0] < 0 ? Math.PI : dir[1] < 0 ? -Math.PI / 2 : dir[1] > 0 ? Math.PI / 2 : 0, mo = .25 + .2 * Math.abs(Math.sin(Date.now() / 90));
    g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(pac.x * S + 16, pac.y * S + 16); g.arc(pac.x * S + 16, pac.y * S + 16, 13, ang + mo, ang + 2 * Math.PI - mo); g.fill();
    ghosts.forEach(gh => { const c = scared > 0 ? (scared < 2 && Math.floor(Date.now() / 150) % 2 ? '#fff' : '#3b4cff') : gh.c; g.fillStyle = c; g.beginPath(); g.arc(gh.x * S + 16, gh.y * S + 15, 13, Math.PI, 0); g.lineTo(gh.x * S + 29, gh.y * S + 28); g.lineTo(gh.x * S + 3, gh.y * S + 28); g.fill(); K.C(gh.x * S + 11, gh.y * S + 13, 3.5, '#fff'); K.C(gh.x * S + 21, gh.y * S + 13, 3.5, '#fff'); });
    T('♥'.repeat(lives), 60, 430, 16, '#ff4d6d'); T('Fase ' + lvl + '/40', 420, 430, 14, '#9aa0c8');
  });
});

// Pouso Lunar: 40 setores com menos combustível e terreno mais acidentado.
A.register('lander', K => {
  K.canvas(560, 560); const { g, R, T } = K; let ship, ter, pad, fuel, lvl = 0;
  const level = () => {
    lvl++; ship = { x: 60, y: 60, vx: 1.1 + lvl * .01, vy: 0, a: 0 }; fuel = Math.max(45, 100 - (lvl - 1) * 1.3);
    const n = 29, pc = A.rand(4, n - 5); ter = []; let h = 440;
    for (let i = 0; i <= n; i++) { if (i >= pc && i <= pc + 2) ter.push(ter[ter.length - 1] || 460); else { h = A.clamp(h + A.rand(-45 - Math.min(20, lvl), 45 + Math.min(20, lvl)), 300, 520); ter.push(h); } }
    pad = pc; ter[pc + 1] = ter[pc]; ter[pc + 2] = ter[pc];
  };
  level(); K.pad('lr a');
  const hAt = x => { const i = Math.floor(x / 20), f = (x % 20) / 20; return ter[i] + ((ter[i + 1] ?? ter[i]) - ter[i]) * f; };
  K.loop(() => {
    const k = K.keys; if (k.ArrowLeft) ship.a -= .035; if (k.ArrowRight) ship.a += .035; ship.a = A.clamp(ship.a, -1.2, 1.2);
    const th = (k.Space || k.ArrowUp) && fuel > 0; if (th) { ship.vx += Math.sin(ship.a) * .09; ship.vy -= Math.cos(ship.a) * .09; fuel -= .25; }
    ship.vy += .035; ship.x += ship.vx; ship.y += ship.vy; if (ship.x < 0 || ship.x > 560) return K.over('Perdido no espaço na fase ' + lvl + '!');
    const gy = hAt(ship.x);
    if (ship.y + 14 >= gy) {
      const onPad = ship.x > pad * 20 + 4 && ship.x < (pad + 3) * 20 - 4;
      if (onPad && Math.abs(ship.vy) < 1.6 && Math.abs(ship.vx) < 1.2 && Math.abs(ship.a) < .25) {
        K.addScore(100 + Math.round(fuel)); K.burst(ship.x, ship.y, '#3ddc84', 22, 4); A.fx.confetti(90, true);
        if (lvl >= 40) return K.over('Campanha completa! 🏆');
        K.banner('FASE ' + (lvl + 1) + '/40', 'Pouso perfeito!'); A.sfx('win'); level();
      } else return K.over('Caiu na fase ' + lvl + '/40! 💥');
    }
    R(0, 0, 560, 560, '#05060f'); for (let i = 0; i < 40; i++) R((i * 97) % 560, (i * 53) % 300, 2, 2, '#fff');
    g.fillStyle = '#4a4e69'; g.beginPath(); g.moveTo(0, 560); ter.forEach((h, i) => g.lineTo(i * 20, h)); g.lineTo(600, 560); g.fill(); R(pad * 20, ter[pad] - 3, 60, 5, '#3ddc84');
    g.save(); g.translate(ship.x, ship.y); g.rotate(ship.a); R(-10, -12, 20, 20, '#dfe6ff'); R(-14, 8, 28, 4, '#9aa0c8'); if (th) { g.fillStyle = '#ff9f43'; g.beginPath(); g.moveTo(-5, 12); g.lineTo(0, 26); g.lineTo(5, 12); g.fill(); } g.restore();
    T(`⛽ ${Math.max(0, Math.round(fuel))}   ↓${ship.vy.toFixed(1)}  →${ship.vx.toFixed(1)}`, 280, 24, 16, Math.abs(ship.vy) < 1.6 ? '#3ddc84' : '#ff4d6d');
    T('Fase ' + lvl + '/40', 60, 24, 13, '#9aa0c8');
  });
});

// Nave Galactica: 40 fases com metas de abates e inimigos mais resistentes.
A.register('galaxy', K => {
  K.canvas(480, 640); const { g, R, T } = K, C = A.campaign(K, 40);
  let x = 240, sh = [], en = [], eb = [], cd = 0, t = 0, lives = 3, stars = Array.from({ length: 40 }, () => [A.rand(0, 480), A.rand(0, 640), A.rf(1, 3)]), inv = 0, kills = 0, goal = 6;
  const build = () => {
    x = 240; sh = []; en = []; eb = []; cd = 0; t = 0; lives = 3; inv = 0; kills = 0;
    goal = 6 + Math.floor((C.level - 1) / 3);
  };
  build(); K.on(K.cv, 'pointermove', e => { x = A.clamp(K.pos(e).x, 20, 460); }); K.pad('lr');
  K.loop(() => {
    x = A.clamp(x + K.dir().x * 7, 20, 460); if (--cd <= 0) { sh.push({ x: x - 8, y: 590 }, { x: x + 8, y: 590 }); cd = 12; } inv--;
    if (--t <= 0) {
      const w = A.rand(30, 440), hp = C.level > 20 && Math.random() < .3 ? 3 : C.level > 8 && Math.random() < .25 ? 2 : 1;
      en.push({ x: w, y: -30, ox: w, ph: A.rf(0, 6), hp, c: 0 });
      t = Math.max(12, 50 - C.level);
    }
    sh.forEach(s => s.y -= 11); sh = sh.filter(s => s.y > -10);
    en.forEach(e => { e.y += 1.8 + C.level * .05; e.x = e.ox + Math.sin(e.y / 40 + e.ph) * 40; if (Math.random() < .004 + C.level * .0002) eb.push({ x: e.x, y: e.y + 12 }); });
    eb.forEach(b => b.y += 5); eb = eb.filter(b => b.y < 660);
    for (const s of sh) for (const e of en) if (Math.abs(s.x - e.x) < 18 && Math.abs(s.y - e.y) < 18) {
      s.y = -99;
      if (--e.hp <= 0) {
        e.dead = 1; K.addScore(20 + C.level * 2); K.burst(e.x, e.y, '#ff9f43', 14, 3); A.sfx('pop');
        if (++kills >= goal) {
          if (C.last) return C.finish('Campanha completa! 🏆');
          C.advance('Mais inimigos e resistência', build); return;
        }
      }
    }
    en = en.filter(e => !e.dead && e.y < 670);
    if (inv < 0) {
      let damaged = false;
      for (const b of eb) if (Math.abs(b.x - x) < 14 && Math.abs(b.y - 600) < 18) { b.y = 999; damaged = true; break; }
      if (!damaged) for (const e of en) if (Math.abs(e.x - x) < 24 && Math.abs(e.y - 600) < 24) { e.dead = 1; damaged = true; break; }
      if (damaged) hit();
    }
    function hit() { lives--; inv = 90; A.sfx('hit'); K.burst(x, 600, '#7c5cff', 20, 4); K.shake(280); if (!lives) K.over('Fase ' + C.level + '/40'); }
    if (K.dead) return;
    R(0, 0, 480, 640, '#070a1f'); stars.forEach(s => { s[1] = (s[1] + s[2]) % 640; R(s[0], s[1], 2, s[2], '#fff'); });
    en.forEach(e => { R(e.x - 14, e.y - 8, 28, 16, e.hp > 1 ? '#ff9f43' : '#ff4d6d'); R(e.x - 6, e.y + 6, 12, 8, '#b2203a'); });
    sh.forEach(s => R(s.x - 1.5, s.y, 3, 12, '#00e0f0')); eb.forEach(b => K.C(b.x, b.y, 4, '#ffd23f'));
    if (inv < 0 || Math.floor(inv / 6) % 2) { g.fillStyle = '#7c5cff'; g.beginPath(); g.moveTo(x, 575); g.lineTo(x + 18, 615); g.lineTo(x - 18, 615); g.fill(); R(x - 3, 590, 6, 14, '#fff'); }
    T('♥'.repeat(lives), 50, 24, 18, '#ff4d6d'); T('Fase ' + C.level + '/40', 300, 24, 13, '#9aa0c8'); T('Abates ' + kills + '/' + goal, 410, 44, 12, '#ffd23f');
    R(0, 636, 480 * Math.min(1, kills / goal), 4, '#00e0b8');
  });
});
})();
