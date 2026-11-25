/* =============================================================================
   ARCADIA - JOGOS DE ARCADE (parte 2)
   -----------------------------------------------------------------------------
   Jogos deste arquivo: Blocos Caindo (Tetris), Sapo na Estrada, Corrida
   Maluca, Torre de Blocos, Chuva de Frutas, Pula-Pula, Helicoptero e
   Fatia Frutas. Seguem o mesmo padrao: desenhar, atualizar e testar colisoes
   dentro de K.loop.
   ============================================================================= */
(function () {
const A = Arcadia;

// Blocos Caindo: pecas com rotacao, remocao de linhas e aumento de nivel.
A.register('tetris', K => {
  K.canvas(420, 560); const { g, R, T } = K, S = 28;
  const SH = { I: [[1, 1, 1, 1]], O: [[1, 1], [1, 1]], T: [[0, 1, 0], [1, 1, 1]], S: [[0, 1, 1], [1, 1, 0]], Z: [[1, 1, 0], [0, 1, 1]], J: [[1, 0, 0], [1, 1, 1]], L: [[0, 0, 1], [1, 1, 1]] };
  const COL = { I: '#00e0f0', O: '#ffd23f', T: '#b05cff', S: '#3ddc84', Z: '#ff4d6d', J: '#4c7dff', L: '#ff9f43' };
  const rot = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
  let bd = Array.from({ length: 20 }, () => Array(10).fill(0)), bag = [], p, nx, lines = 0, lvl = 1, shownLvl = 1, flash = 0, acc = 0, hold = { ArrowLeft: 0, ArrowRight: 0, ArrowDown: 0 };
  const take = () => { if (!bag.length) bag = A.shuffle(Object.keys(SH)); const k = bag.pop(); return { k, m: SH[k], x: 3, y: 0 }; };
  const fits = (m, x, y) => m.every((r, j) => r.every((v, i) => !v || (x + i >= 0 && x + i < 10 && y + j < 20 && !(bd[y + j] || [])[x + i])));
  const spawn = () => { p = nx || take(); nx = take(); p.x = Math.floor((10 - p.m[0].length) / 2); p.y = 0; if (!fits(p.m, p.x, p.y)) K.over('Topo!'); }; spawn();
  const lock = () => {
    p.m.forEach((r, j) => r.forEach((v, i) => { if (v && bd[p.y + j]) bd[p.y + j][p.x + i] = COL[p.k]; }));
    let n = 0; bd = bd.filter(r => { const f = r.every(Boolean); if (f) n++; return !f; }); while (bd.length < 20) bd.unshift(Array(10).fill(0));
    if (n) { K.addScore([0, 100, 300, 500, 800][n] * lvl); lines += n; lvl = Math.min(40, 1 + Math.floor(lines / 10)); flash = .35; A.sfx('win'); K.burst(140, 300, '#fff', 16 + n * 8, 4); if (lvl > shownLvl) { shownLvl = lvl; K.banner('FASE ' + lvl + '/40', 'As peças caem mais rápido'); } if (lines >= 400) { K.over('Campanha completa! 🏆'); return; } } else A.sfx('step');
    spawn();
  };
  const mv = dx => { if (fits(p.m, p.x + dx, p.y)) p.x += dx; };
  const down = () => { if (fits(p.m, p.x, p.y + 1)) { p.y++; return true; } lock(); return false; };
  K.pad('arrows a');
  K.onKey(c => {
    if (c == 'ArrowUp') { const r = rot(p.m); for (const k of [0, -1, 1, -2, 2]) if (fits(r, p.x + k, p.y)) { p.m = r; p.x += k; break; } }
    if (c == 'Space') { while (down()) K.addScore(1); }
  });
  K.loop(dt => {
    for (const k in hold) { if (K.keys[k]) { hold[k]++; if (hold[k] == 1 || (hold[k] > 10 && hold[k] % 3 == 0)) { k == 'ArrowDown' ? (down() && K.addScore(1)) : mv(k == 'ArrowLeft' ? -1 : 1); } } else hold[k] = 0; }
    acc += dt; flash = Math.max(0, flash - dt); if (acc > Math.max(.12, .82 - lvl * .017)) { acc = 0; down(); }
    R(0, 0, 420, 560, '#0b1020'); R(0, 0, 280, 560, '#0e1428');
    bd.forEach((r, j) => r.forEach((v, i) => { if (v) { R(i * S + 1, j * S + 1, S - 2, S - 2, v); R(i * S + 1, j * S + 1, S - 2, 5, 'rgba(255,255,255,.3)'); } }));
    let gy = p.y; while (fits(p.m, p.x, gy + 1)) gy++;
    p.m.forEach((r, j) => r.forEach((v, i) => { if (v) { R((p.x + i) * S + 1, (gy + j) * S + 1, S - 2, S - 2, 'rgba(255,255,255,.12)'); R((p.x + i) * S + 1, (p.y + j) * S + 1, S - 2, S - 2, COL[p.k]); } }));
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * .55})`; g.fillRect(0, 0, 280, 560); }
    T('PRÓXIMA', 350, 40, 14, '#9aa0c8'); nx.m.forEach((r, j) => r.forEach((v, i) => v && R(318 + i * 20, 70 + j * 20, 18, 18, COL[nx.k])));
    T('FASE', 350, 200, 14, '#9aa0c8'); T(lvl + '/40', 350, 230, 28); T('LINHAS', 350, 290, 14, '#9aa0c8'); T(String(lines), 350, 320, 32);
  });
});

// Sapo na Estrada: 40 fases com trânsito mais denso e três vidas por fase.
A.register('frogger', K => {
  K.canvas(440, 480); const { R, T } = K, S = 40;
  let fx = 5, fy = 11, lvl = 1, lives = 3, lanes = [];
  const build = () => {
    lanes = [];
    for (let r = 1; r <= 10; r++) {
      const dir = r % 2 ? 1 : -1, sp = (0.9 + A.rf(0, 1.2) + lvl * .08) * dir;
      const w = A.pick(lvl > 10 ? [40, 60, 80, 120, 160] : [40, 40, 80, 120]), cars = [];
      let x = A.rand(0, 100);
      while (x < 520) { cars.push(x); x += w + A.rand(Math.max(65, 230 - lvl * 3), Math.max(105, 300 - lvl * 3)); }
      lanes.push({ r, sp, w, cars, c: A.pick(['#ff4d6d', '#ffd23f', '#4c7dff', '#ff9f43', '#b05cff']) });
    }
  };
  const hit = () => {
    lives--; A.sfx('hit'); K.shake(240); fx = 5; fy = 11;
    if (!lives) return K.over('Fase ' + lvl + '/40');
  };
  build(); K.pad('arrows');
  K.onKey(c => {
    const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[c]; if (!m) return;
    fx = A.clamp(fx + m[0], 0, 10); fy = A.clamp(fy + m[1], 0, 11); A.sfx('step');
    if (fy == 0) {
      K.addScore(10 * lvl);
      if (lvl >= 40) return K.over('Campanha completa! 🏆');
      lvl++; lives = 3; K.banner('FASE ' + lvl + '/40', 'Trânsito mais rápido e denso'); K.burst(fx * S + 20, 20, '#3ddc84', 18, 3); fy = 11; fx = 5; build(); A.sfx('win');
    }
  });
  K.swipe();
  K.loop(() => {
    R(0, 0, 440, 480, '#1b2236'); R(0, 0, 440, 40, '#2d6a4f'); R(0, 440, 440, 40, '#2d6a4f');
    K.checker(0, 0, 440, 8, 8);
    for (let r = 1; r <= 10; r++) R(0, r * S + 19, 440, 2, '#33405f');
    for (const l of lanes) for (let i = 0; i < l.cars.length; i++) {
      l.cars[i] += l.sp; if (l.sp > 0 && l.cars[i] > 560) l.cars[i] = -l.w - 20; if (l.sp < 0 && l.cars[i] < -l.w - 40) l.cars[i] = 540;
      const cx = l.cars[i], cy = l.r * S + 6; R(cx, cy, l.w, 28, l.c); R(cx + 4, cy + 4, l.w - 8, 8, 'rgba(255,255,255,.35)');
      if (fx * S + 8 < cx + l.w && fx * S + 32 > cx && fy == l.r) { hit(); return; }
    }
    T('🐸', fx * S + 20, fy * S + 22, 30);
    T('♥'.repeat(lives), 46, 20, 14, '#ff4d6d'); T('Fase ' + lvl + '/40', 385, 20, 13, '#fff');
  });
});

// Corrida Maluca: campanha de 40 fases com metas de distância e trânsito crescente.
A.register('cardodge', K => {
  K.canvas(360, 560); const { R, T } = K, C = A.campaign(K, 40);
  let x = 160, cars = [], t = 0, sp = 5, off = 0, dist = 0, total = 0, goal = 1, lives = 3, inv = 0;
  const build = () => {
    x = 160; cars = []; t = 0; off = 0; dist = 0; sp = 5 + C.level * .08; goal = 2200 + C.level * 90; lives = 3; inv = 0;
  };
  build(); K.on(K.cv, 'pointermove', e => { x = A.clamp(K.pos(e).x - 20, 40, 280); }); K.pad('lr');
  K.loop(() => {
    x = A.clamp(x + K.dir().x * 7, 40, 280); sp += .002; off = (off + sp) % 60; dist += sp; total += sp;
    K.setScore(Math.floor(total / 20)); inv--;
    if (dist >= goal) {
      if (C.last) return C.finish('Campanha completa! 🏆');
      C.advance('Mais carros e velocidade', build); return;
    }
    if (--t <= 0) { cars.push({ x: A.rand(40, 280), y: -80, c: A.pick(['#ff4d6d', '#ffd23f', '#4c7dff', '#00e0b8']) }); t = Math.max(16, 70 - sp * 4 - C.level * .15); }
    cars.forEach(c => c.y += sp * .75); cars = cars.filter(c => c.y < 600);
    if (inv < 0) for (const c of cars) if (x < c.x + 40 && x + 40 > c.x && 470 < c.y + 70 && 540 > c.y) {
      lives--; inv = 80; cars = []; t = 28; A.sfx('hit'); K.shake(260);
      if (!lives) return K.over('Batida na fase ' + C.level + '/40');
      break;
    }
    R(0, 0, 360, 560, '#2d6a4f'); R(30, 0, 300, 560, '#2b2f3a'); for (let i = -1; i < 10; i++) { R(178, i * 60 + off, 4, 30, '#fff'); }
    R(30, 0, 4, 560, '#ffd23f'); R(326, 0, 4, 560, '#ffd23f');
    const remain = goal - dist;
    if (remain > 0 && remain < 520) {
      const fy = A.clamp(470 - remain * 0.75, 0, 545);
      K.checker(30, fy, 300, 18, 9);
      T('CHEGADA', 180, fy - 13, 12, '#fff');
    }
    cars.forEach(c => { R(c.x, c.y, 40, 70, c.c); R(c.x + 5, c.y + 12, 30, 14, '#cde'); R(c.x + 5, c.y + 48, 30, 10, '#cde'); });
    if (inv < 0 || Math.floor(inv / 5) % 2) { R(x, 470, 40, 70, '#00e0f0'); R(x + 5, 484, 30, 14, '#123'); R(x + 5, 518, 30, 10, '#123'); }
    T(Math.floor(sp * 16) + ' km/h', 290, 24, 16, '#fff');
    T('♥'.repeat(lives), 46, 24, 15, '#ff4d6d'); T('Fase ' + C.level + '/40', 286, 48, 13, '#fff');
    R(0, 556, 360 * Math.min(1, dist / goal), 4, '#00e0b8');
  });
});

// Torre de Blocos: 40 fases com metas de altura e blocos mais rápidos.
A.register('stack', K => {
  K.canvas(360, 560); const { R, T } = K, H = 24, C = A.campaign(K, 40);
  let tower, cur, dir = 1, sp = 3, goal = 3, built = 0;
  const next = () => { const t = tower[tower.length - 1]; cur = { x: 0, w: t.w }; };
  const build = () => {
    tower = [{ x: 80, w: 200 }]; dir = 1; built = 0;
    sp = 3 + (C.level - 1) * .1; goal = 3 + Math.floor((C.level - 1) / 3);
    next(); cur.x = 0;
  };
  build();
  const drop = () => {
    const t = tower[tower.length - 1], d = cur.x - t.x, ov = t.w - Math.abs(d);
    if (ov <= 0) return K.over('Caiu na fase ' + C.level + '/40');
    if (Math.abs(d) < 5) { cur.x = t.x; K.addScore(2); A.fx.confetti(26, true); A.sfx('win'); }
    else { cur.x = Math.max(cur.x, t.x); cur.w = ov; K.addScore(1); A.sfx('coin'); }
    tower.push({ x: cur.x, w: cur.w }); sp = Math.min(9, sp + .1); built++;
    const cam = Math.max(0, (tower.length - 10) * H);
    K.burst(cur.x + cur.w / 2, 520 - tower.length * H + cam, `hsl(${((tower.length - 1) * 14) % 360},85%,62%)`, Math.abs(d) < 5 ? 16 : 9, 3);
    if (built >= goal) {
      K.addScore(50 + C.level * 10);
      if (C.last) return C.finish('Campanha completa! 🏆');
      C.advance('Torre mais alta e blocos mais rápidos', build); return;
    }
    next(); cur.x = dir > 0 ? 0 : 360 - cur.w;
  };
  K.on(K.cv, 'pointerdown', drop); K.onKey(c => { if (c == 'Space' || c == 'ArrowUp') drop(); }); K.pad('a');
  K.loop(() => {
    cur.x += sp * dir; if (cur.x + cur.w > 360) { cur.x = 360 - cur.w; dir = -1; } if (cur.x < 0) { cur.x = 0; dir = 1; }
    const cam = Math.max(0, (tower.length - 10) * H);
    R(0, 0, 360, 560, '#0b1020');
    tower.forEach((b, i) => R(b.x, 520 - (i + 1) * H + cam, b.w, H - 2, `hsl(${(i * 14) % 360},75%,58%)`));
    R(cur.x, 520 - (tower.length + 1) * H + cam, cur.w, H - 2, `hsl(${(tower.length * 14) % 360},75%,70%)`);
    T(String(K.score), 180, 60, 48, 'rgba(255,255,255,.85)');
    T('Fase ' + C.level + '/40', 60, 24, 13, '#9aa0c8');
    T('Altura ' + built + '/' + goal, 300, 24, 13, '#9aa0c8');
  });
});

// Chuva de Frutas: 40 fases com metas de frutas e chuva mais intensa.
A.register('catcher', K => {
  K.canvas(480, 560); const { R, T } = K, C = A.campaign(K, 40);
  let x = 200, it = [], t = 0, lives = 3, sp = 2.4, goal = 5, got = 0;
  const F = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🍒'];
  const build = () => {
    x = 200; it = []; t = 0; lives = 3; got = 0;
    sp = 2.4 + C.level * .055; goal = 5 + Math.floor((C.level - 1) / 4);
  };
  build(); K.on(K.cv, 'pointermove', e => { x = A.clamp(K.pos(e).x - 40, 0, 400); }); K.pad('lr');
  K.loop(() => {
    x = A.clamp(x + K.dir().x * 8, 0, 400); sp += .0008;
    if (--t <= 0) {
      it.push({ x: A.rand(20, 460), y: -30, e: Math.random() < Math.min(.3, .14 + C.level * .004) ? '💣' : A.pick(F), r: A.rf(-.05, .05), a: 0 });
      t = Math.max(20, 50 - C.level * .5);
    }
    it.forEach(i => { i.y += sp + (i.e == '💣' ? .6 : 0); i.a += i.r; });
    for (const i of it) {
      if (i.y > 500 && i.y < 540 && i.x > x - 8 && i.x < x + 88) {
        i.dead = 1;
        if (i.e == '💣') { lives--; A.sfx('hit'); K.burst(i.x, i.y, '#ff4d6d', 18, 4); K.shake(260); if (!lives) return K.over('Fase ' + C.level + '/40'); }
        else {
          K.addScore(10); K.burst(i.x, i.y, '#ffd23f', 9, 2); A.sfx('coin');
          if (++got >= goal) {
            if (C.last) return C.finish('Campanha completa! 🏆');
            C.advance('Mais frutas e bombas', build); return;
          }
        }
      } else if (i.y > 580) { i.dead = 1; if (i.e != '💣') { lives--; A.sfx('lose'); if (!lives) return K.over('Fase ' + C.level + '/40'); } }
    }
    it = it.filter(i => !i.dead);
    R(0, 0, 480, 560, '#16213e'); R(0, 540, 480, 20, '#2d6a4f');
    it.forEach(i => { K.g.save(); K.g.translate(i.x, i.y); K.g.rotate(i.a * 8); K.T(i.e, 0, 0, 34); K.g.restore(); });
    R(x, 520, 80, 8, '#ffd23f'); R(x + 6, 528, 68, 14, '#b5651d'); R(x + 14, 542, 52, 6, '#b5651d');
    T('♥'.repeat(lives), 50, 22, 18, '#ff4d6d'); T('Fase ' + C.level + '/40', 410, 22, 13, '#9aa0c8');
    T('Frutas ' + got + '/' + goal, 240, 22, 13, '#ffd23f');
    R(120, 550, 240 * Math.min(1, got / goal), 3, '#ffd23f');
  });
});

// Pula-Pula: 40 fases com metas de altura e plataformas móveis.
A.register('doodle', K => {
  K.canvas(360, 560); const { R, T } = K, C = A.campaign(K, 40);
  let p, pl, hi = 0, total = 0, goal = 1, moveChance = 0;
  const build = () => {
    p = { x: 160, y: 460, vy: -11 }; pl = []; hi = 0;
    goal = 600 + C.level * 100; moveChance = C.level > 5 ? .12 + C.level * .009 : 0;
    for (let y = 540; y > -40; y -= 62) pl.push({ x: A.rand(0, 290), y, mv: Math.random() < moveChance, dx: 1 });
  };
  build(); K.on(K.cv, 'pointermove', e => { p.x = K.pos(e).x - 20; }); K.pad('lr');
  K.loop(() => {
    p.x += K.dir().x * 7; if (p.x < -20) p.x = 360; if (p.x > 360) p.x = -20;
    const py = p.y; p.vy += .42; p.y += p.vy;
    if (p.vy > 0) for (const q of pl) if (p.x + 30 > q.x && p.x + 10 < q.x + 70 && py + 40 <= q.y + 2 && p.y + 40 >= q.y) { p.vy = -12.2; K.burst(p.x + 20, q.y, '#59c13d', 7, 2); A.sfx('step'); }
    if (p.y < 260) {
      const d = 260 - p.y; p.y = 260; pl.forEach(q => q.y += d); hi += d; total += d;
      K.setScore(Math.floor(total / 10));
      if (hi >= goal) {
        if (C.last) return C.finish('Campanha completa! 🏆');
        C.advance('Subida mais longa e plataformas móveis', build); return;
      }
    }
    pl.forEach(q => { if (q.mv) { q.x += q.dx * (1.4 + C.level * .015); if (q.x < 0 || q.x > 290) q.dx *= -1; } });
    pl = pl.filter(q => q.y < 580); let top = Math.min(...pl.map(q => q.y));
    while (top > -20) { top -= A.rand(52, 52 + Math.min(28, C.level * .6)); pl.push({ x: A.rand(0, 290), y: top, mv: Math.random() < moveChance, dx: 1 }); }
    if (p.y > 580) return K.over('Caiu na fase ' + C.level + '/40');
    R(0, 0, 360, 560, '#fdf6d8'); for (let i = 0; i < 560; i += 28) R(0, i, 360, 1, '#e8dfae');
    const remain = goal - hi;
    if (remain > 0 && remain < 300) {
      const fy = 260 - remain;
      K.checker(0, fy, 360, 22, 11);
      T('CHEGADA', 180, fy - 14, 12, '#555');
    }
    pl.forEach(q => R(q.x, q.y, 70, 12, q.mv ? '#4c7dff' : '#59c13d'));
    R(p.x + 6, p.y + 6, 28, 30, '#a7d93d'); R(p.x + 10, p.y + 14, 8, 8, '#fff'); R(p.x + 22, p.y + 14, 8, 8, '#fff'); R(p.x + 13, p.y + 17, 3, 3, '#000'); R(p.x + 25, p.y + 17, 3, 3, '#000'); R(p.x + 8, p.y + 36, 6, 6, '#a7d93d'); R(p.x + 26, p.y + 36, 6, 6, '#a7d93d');
    T(String(K.score), 30, 24, 22, '#555', 'left');
    T('Fase ' + C.level + '/40', 320, 24, 12, '#555', 'right');
    R(20, 44, 320 * Math.min(1, hi / goal), 3, '#59c13d');
  });
});

// Helicoptero: 40 fases com cavernas mais estreitas e obstáculos frequentes.
A.register('copter', K => {
  K.canvas(640, 400); const { R, T } = K, C = A.campaign(K, 40);
  let y = 200, v = 0, cols = [], gap = 260, mid = 200, dr = 0, ob = [], t = 0, dist = 0, total = 0, goal = 1, lives = 3, inv = 0;
  const build = () => {
    y = 200; v = 0; cols = []; gap = 250; mid = 200; dr = 0; ob = []; t = 0; dist = 0; lives = 3; inv = 0;
    goal = 250 + C.level * 25;
    for (let i = 0; i < 82; i++) cols.push([mid - gap / 2, mid + gap / 2]);
  };
  build();
  K.on(K.cv, 'pointerdown', () => K.keys.Space = 1); K.on(window, 'pointerup', () => delete K.keys.Space); K.pad('a');
  K.loop(() => {
    const up = K.keys.Space || K.keys.ArrowUp; v += up ? -.32 : .3; v = A.clamp(v, -6, 6); y += v;
    dist += 1; total += 1; inv--;
    gap = Math.max(120, 250 - C.level * 2 - dist / 30); dr += A.rf(-.3, .3); dr = A.clamp(dr, -2.2, 2.2); mid = A.clamp(mid + dr, gap / 2 + 14, 386 - gap / 2);
    cols.push([mid - gap / 2, mid + gap / 2]); cols.shift();
    if (++t % Math.max(70, 130 - C.level * 2) == 0) ob.push({ x: 650, y: A.rand(120, 280), h: A.rand(50, 90) }); ob.forEach(o => o.x -= 8); ob = ob.filter(o => o.x > -30);
    K.setScore(Math.floor(total / 5));
    const hit = () => {
      lives--; inv = 90; A.sfx('hit'); K.shake(220); y = (cols[10][0] + cols[10][1]) / 2; v = 0;
      if (!lives) return K.over('Fase ' + C.level + '/40');
    };
    if (inv < 0) {
      const c = cols[10]; if (y - 10 < c[0] || y + 10 > c[1]) hit();
      if (!K.dead) for (const o of ob) if (80 + 18 > o.x && 80 - 18 < o.x + 24 && y + 8 > o.y && y - 8 < o.y + o.h) { hit(); break; }
    }
    if (K.dead) return;
    if (dist >= goal) {
      if (C.last) return C.finish('Campanha completa! 🏆');
      C.advance('Caverna mais estreita e mais obstáculos', build); return;
    }
    R(0, 0, 640, 400, '#0b1020'); cols.forEach((c, i) => { R(i * 8, 0, 8, c[0], '#2d6a4f'); R(i * 8, c[1], 8, 400 - c[1], '#2d6a4f'); });
    ob.forEach(o => R(o.x, o.y, 24, o.h, '#ff9f43'));
    if (inv < 0 || Math.floor(inv / 6) % 2) { R(70, y - 8, 28, 16, '#ff4d6d'); R(98, y - 2, 18, 4, '#ff4d6d'); R(66, y - 14, 36, 3, '#fff'); R(66 + (t % 6) * 2, y - 14, 10, 3, '#9aa0c8'); }
    T(K.score + ' m', 590, 24, 20, '#fff');
    T('♥'.repeat(lives), 50, 24, 16, '#ff4d6d'); T('Fase ' + C.level + '/40', 320, 24, 13, '#9aa0c8');
    R(0, 396, 640 * Math.min(1, dist / goal), 4, '#3ddc84');
  });
});

// Fatia Frutas: 40 fases com metas de corte, bombas e frutas mais rápidas.
A.register('ninja', K => {
  K.canvas(560, 560); const { g, R, T } = K, C = A.campaign(K, 40);
  let fr = [], trail = [], down = false, last = null, t = 0, miss = 0, parts = [], sp = 1, goal = 8, cutCount = 0;
  const E = ['🍉', '🍊', '🍎', '🍋', '🍍', '🥝', '🍑'];
  const build = () => {
    fr = []; trail = []; last = null; t = 0; miss = 0; parts = []; sp = 1 + C.level * .03;
    goal = 8 + Math.floor((C.level - 1) / 3); cutCount = 0;
  };
  const cut = (a, b) => {
    for (const f of fr) {
      if (f.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1;
      let u = A.clamp(((f.x - a.x) * dx + (f.y - a.y) * dy) / l, 0, 1);
      if (Math.hypot(a.x + u * dx - f.x, a.y + u * dy - f.y) < 32) {
        f.dead = 1;
        if (f.b) return K.over('BOOM na fase ' + C.level + '/40! 💥');
        K.addScore(10); A.sfx('pop');
        for (let i = 0; i < 8; i++) parts.push({ x: f.x, y: f.y, vx: A.rf(-4, 4), vy: A.rf(-6, 1), l: 30 });
        if (++cutCount >= goal) {
          if (C.last) return C.finish('Campanha completa! 🏆');
          C.advance('Mais frutas, bombas e velocidade', build); return;
        }
      }
    }
  };
  build();
  K.on(K.cv, 'pointerdown', e => { down = true; last = K.pos(e); }); K.on(window, 'pointerup', () => { down = false; });
  K.on(K.cv, 'pointermove', e => { const p = K.pos(e); if (down && last) { trail.push({ ...p, l: 10 }); cut(last, p); } last = p; });
  K.loop(() => {
    if (--t <= 0) {
      const n = A.rand(1, 3);
      for (let i = 0; i < n; i++) fr.push({ x: A.rand(80, 480), y: 600, vx: A.rf(-2, 2), vy: -A.rf(12, 16), e: A.pick(E), b: Math.random() < Math.min(.26, .11 + C.level * .004) });
      t = A.rand(48, 82) / sp;
    }
    fr.forEach(f => { f.x += f.vx; f.y += f.vy; f.vy += .28; });
    fr.forEach(f => { if (f.y > 600 && f.vy > 0 && !f.dead) { f.dead = 1; if (!f.b) { miss++; A.sfx('lose'); } } });
    fr = fr.filter(f => !f.dead); if (miss >= 3) return K.over('Perdeu 3 frutas na fase ' + C.level);
    parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .3; p.l--; }); parts = parts.filter(p => p.l > 0);
    trail.forEach(p => p.l--); trail = trail.filter(p => p.l > 0);
    R(0, 0, 560, 560, '#1a1226');
    fr.forEach(f => T(f.b ? '💣' : f.e, f.x, f.y, 56)); parts.forEach(p => R(p.x, p.y, 5, 5, '#ffd23f'));
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); trail.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke();
    T('✖'.repeat(miss) + '·'.repeat(3 - miss), 60, 24, 20, '#ff4d6d');
    T('Fase ' + C.level + '/40', 280, 24, 13, '#9aa0c8');
    T('Frutas ' + cutCount + '/' + goal, 470, 24, 13, '#ffd23f');
    R(0, 556, 560 * Math.min(1, cutCount / goal), 4, '#3ddc84');
  });
});
})();
