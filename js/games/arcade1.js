/* =============================================================================
   ARCADIA - JOGOS DE ARCADE (parte 1)
   -----------------------------------------------------------------------------
   Todos usam o kit K (js/player.js): K.canvas cria o palco, K.loop roda o
   game loop em tempo real, K.keys/K.dir leem o teclado, K.pad monta controles
   de toque, K.addScore mexe no placar e K.over encerra a partida.

   Jogos deste arquivo: Cobrinha, Pong, Quebra-Tijolos, Passaro Saltitante,
   Invasores do Espaco, Asteroides e Dino Corredor.
   ============================================================================= */
(function () {
const A = Arcadia;

// Cobrinha: 40 fases com metas de frutas, mais velocidade e corpo inicial maior.
A.register('snake', K => {
  K.canvas(480, 480); const { g, R, T } = K, N = 20, S = 24, C = A.campaign(K, 40);
  let s, d, nd, f, t = 0, sp, need, got;
  const place = () => { do f = { x: A.rand(0, N - 1), y: A.rand(0, N - 1) }; while (s.some(p => p.x == f.x && p.y == f.y)); };
  const build = () => {
    const n = 3 + Math.min(4, Math.floor((C.level - 1) / 8));
    s = Array.from({ length: n }, (_, i) => ({ x: 10 - i, y: 10 }));
    d = { x: 1, y: 0 }; nd = d; t = 0; got = 0;
    sp = Math.max(.055, .15 - C.level * .0023);
    need = 3 + Math.floor((C.level - 1) / 3);
    place();
  };
  build(); K.pad('arrows'); K.swipe();
  K.onKey(c => { const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[c]; if (m && !(m[0] == -d.x && m[1] == -d.y)) nd = { x: m[0], y: m[1] }; });
  K.loop(dt => {
    t += dt;
    if (t > sp) {
      t = 0; d = nd; const h = { x: s[0].x + d.x, y: s[0].y + d.y };
      if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || s.some(p => p.x == h.x && p.y == h.y)) return K.over('Fase ' + C.level + '/40');
      s.unshift(h);
      if (h.x == f.x && h.y == f.y) {
        K.addScore(10); K.burst(f.x * S + 12, f.y * S + 12, '#ff4d6d', 14, 3); A.sfx('coin');
        if (++got >= need) {
          if (C.last) return C.finish('Campanha completa! 🏆');
          C.advance('Meta maior e mais velocidade', build); return;
        }
        place();
      } else s.pop();
    }
    R(0, 0, 480, 480, '#0b1020');
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if ((i + j) % 2) R(i * S, j * S, S, S, '#0e1428');
    K.C(f.x * S + 12, f.y * S + 12, 9, '#ff4d6d');
    s.forEach((p, i) => { g.fillStyle = i ? `hsl(${150 - i * 2},80%,${55 - Math.min(i, 20)}%)` : '#b8ffcf'; g.beginPath(); g.roundRect(p.x * S + 1, p.y * S + 1, S - 2, S - 2, 7); g.fill(); });
    T('FASE ' + C.level + '/40', 74, 18, 13, '#9aa0c8');
    T('🍎 ' + got + '/' + need, 406, 18, 13, '#ff9f9f');
  });
});

// Pong: 1 jogador contra a IA ou 2 jogadores locais. Quem chegar à meta vence.
A.register('pong', K => {
  K.canvas(640, 400); const { R, T, g } = K;
  const cfg = K.config, two = K.players === 2, target = Math.max(1, Number(cfg.target) || 7);
  const factor = A.difficultyFactor(cfg.difficulty);
  let py = 170, ay = 170, b, aiS = 3.2 * factor, s1 = 0, s2 = 0, trail = [];
  const serve = dir => { b = { x: 320, y: 200, vx: 5 * dir, vy: A.rf(-3, 3) }; trail = []; };
  const hud = () => {
    if (two) K.setScore(s1 + ' × ' + s2);
    else K.setScore(s1);
  };
  const win = () => {
    if (s1 >= target) K.over(two ? 'Jogador 1 venceu! 🎉' : 'Você venceu! 🎉', two ? undefined : s1, two);
    else if (s2 >= target) K.over(two ? 'Jogador 2 venceu! 🎉' : 'A IA venceu 🤖', two ? undefined : s1, two);
    else return false;
    return true;
  };
  serve(1); hud();
  K.on(K.cv, 'pointermove', e => { if (!two) py = A.clamp(K.pos(e).y - 30, 0, 340); });
  K.pad('ud');
  K.loop(() => {
    /* Jogador 1: WASD no modo 2P e setas/WASD no modo 1P. */
    const dy1 = two
      ? (K.raw.KeyS ? 1 : 0) - (K.raw.KeyW ? 1 : 0)
      : K.dir().y;
    py = A.clamp(py + dy1 * 7.5, 0, 340);

    /* Jogador 2 usa ↑/↓; no modo 1P a raquete direita é a IA. */
    if (two) ay = A.clamp(ay + ((K.keys.ArrowDown ? 1 : 0) - (K.keys.ArrowUp ? 1 : 0)) * 7.5, 0, 340);
    else {
      const aim = b.vx > 0 ? b.y - 30 : 200 - 30;
      ay += A.clamp(aim - ay, -aiS, aiS);
      ay = A.clamp(ay, 0, 340);
    }

    b.x += b.vx; b.y += b.vy; trail.push({ x: b.x, y: b.y }); if (trail.length > 10) trail.shift();
    if (b.y < 6 || b.y > 394) { b.vy *= -1; A.sfx('step'); }
    if (b.vx < 0 && b.x < 32 && b.x > 14 && b.y > py - 6 && b.y < py + 66) {
      b.vx = Math.min(11, -b.vx * 1.06); b.vy = (b.y - py - 30) / 6;
      A.sfx('hit'); K.burst(28, b.y, '#7c5cff', 10, 3);
    }
    if (b.vx > 0 && b.x > 608 && b.x < 626 && b.y > ay - 6 && b.y < ay + 66) {
      b.vx = -b.vx * 1.02; b.vy = (b.y - ay - 30) / 6;
      A.sfx('hit'); K.burst(612, b.y, '#00e0b8', 10, 3);
    }

    if (b.x < 0) {
      s2++; hud(); A.sfx('lose'); K.shake(180);
      if (win()) return;
      serve(1);
    }
    if (b.x > 640) {
      s1++; hud(); A.sfx('coin'); aiS = Math.min(6.2, aiS + .1 * factor);
      if (!two) K.addScore(0);
      if (win()) return;
      serve(-1);
    }

    R(0, 0, 640, 400, '#0b1020'); for (let i = 0; i < 400; i += 24) R(318, i, 4, 12, '#22305a');
    trail.forEach((p, i) => { g.globalAlpha = i / trail.length * .35; K.C(p.x, p.y, 7, '#fff'); }); g.globalAlpha = 1;
    R(16, py, 10, 60, '#7c5cff'); R(614, ay, 10, 60, '#00e0b8'); K.C(b.x, b.y, 7, '#fff');
    T(two ? 'P1 ' + s1 : 'VOCÊ ' + s1, 80, 24, 16, '#7c5cff');
    T(two ? 'P2 ' + s2 : 'IA ' + s2, 560, 24, 16, '#00e0b8');
    T('Primeiro a ' + target, 320, 24, 14, '#9aa0c8');
    T(two ? 'W/S' : '↑/↓ ou mouse', 80, 48, 12, '#66709d');
    T(two ? '↑/↓' : 'IA', 560, 48, 12, '#66709d');
  });
});

// Quebra-tijolos: campanha de 40 fases com padrões, fileiras e tijolos resistentes.
A.register('breakout', K => {
  K.canvas(480, 560); const { R, T } = K, C = A.campaign(K, 40);
  let px = 200, lives = 3, bricks, b, stuck = true;
  const mk = () => {
    bricks = [];
    const rows = 4 + Math.floor((C.level - 1) / 8), hp = C.level >= 25 ? 2 : 1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < 8; c++) {
      if (C.level > 8 && (r * 2 + c * 3 + C.level) % 13 == 0) continue;
      bricks.push({ x: 10 + c * 58, y: 50 + r * 24, alive: 1, hp, h: r * 40 });
    }
  };
  const resetBall = () => { b = { x: 240, y: 500, vx: 0, vy: 0 }; stuck = true; };
  const launch = () => { if (stuck) { stuck = false; b.vx = A.rf(-2.4, 2.4); b.vy = -(5.2 + C.level * .12); } };
  mk(); resetBall();
  K.on(K.cv, 'pointermove', e => { px = A.clamp(K.pos(e).x - 40, 0, 400); });
  K.on(K.cv, 'pointerdown', launch); K.onKey(c => { if (c == 'Space') launch(); }); K.pad('lr a');
  K.loop(() => {
    px = A.clamp(px + K.dir().x * 8, 0, 400);
    if (stuck) { b.x = px + 40; b.y = 530; } else {
      b.x += b.vx; b.y += b.vy;
      if (b.x < 6 || b.x > 474) { b.vx *= -1; b.x = A.clamp(b.x, 6, 474); }
      if (b.y < 6) b.vy = Math.abs(b.vy);
      if (b.vy > 0 && b.y > 524 && b.y < 542 && b.x > px - 4 && b.x < px + 84) { b.vy = -Math.abs(b.vy); b.vx = (b.x - px - 40) / 7; A.sfx('step'); }
      for (const k of bricks) if (k.alive && b.x > k.x && b.x < k.x + 54 && b.y > k.y && b.y < k.y + 20) {
        k.hp--; b.vy *= -1;
        if (k.hp <= 0) { k.alive = 0; K.addScore(10 + Math.floor(C.level / 4)); K.burst(k.x + 27, k.y + 10, `hsl(${k.h + 200},85%,62%)`, 10, 3); A.sfx('pop'); }
        else { K.addScore(4); K.burst(k.x + 27, k.y + 10, '#fff', 6, 2); A.sfx('step'); }
        break;
      }
      if (b.y > 570) { lives--; A.sfx('lose'); K.shake(240); if (!lives) return K.over('Fase ' + C.level + '/40'); resetBall(); }
    }
    if (!bricks.some(k => k.alive)) {
      K.addScore(50 + C.level * 5);
      if (C.last) return C.finish('Campanha completa! 🏆');
      C.advance('Mais tijolos e resistência', () => { lives = 3; mk(); resetBall(); }); return;
    }
    R(0, 0, 480, 560, '#0b1020');
    bricks.forEach(k => k.alive && (R(k.x, k.y, 54, 20, `hsl(${k.h + 200},80%,${k.hp > 1 ? 45 : 60}%)`), R(k.x + 4, k.y + 3, 46, 4, 'rgba(255,255,255,.25)')));
    R(px, 530, 80, 12, '#00e0b8'); K.C(b.x, b.y, 6, '#fff');
    T('♥'.repeat(lives), 50, 20, 16, '#ff4d6d'); T('Fase ' + C.level + '/40', 430, 20, 14, '#9aa0c8');
    if (stuck) T('Clique / Espaço para lançar', 240, 330, 18, '#9aa0c8');
  });
});

// Passaro Saltitante: campanha de 40 fases com meta de canos e vãos menores.
A.register('flappy', K => {
  K.canvas(360, 560); const { R, T, g } = K, C = A.campaign(K, 40);
  let y = 250, v = 0, pipes = [], t = 0, started = false, rot = 0, got = 0, need = 0, gh = 70, sp = 2.6;
  const build = () => {
    y = 250; v = 0; pipes = []; t = 0; started = false; rot = 0; got = 0;
    need = 2 + Math.floor((C.level - 1) / 4);
    gh = 72 - Math.min(20, C.level * .5);
    sp = 2.5 + C.level * .035;
  };
  const flap = () => { v = -7.2; started = true; A.sfx('step'); };
  build(); K.on(K.cv, 'pointerdown', flap); K.onKey(c => { if (c == 'Space' || c == 'ArrowUp') flap(); }); K.pad('a');
  K.loop(() => {
    if (started) {
      v += .42; y += v; rot = A.clamp(v * .06, -.55, 1.1); t++;
      if (t % Math.max(58, 92 - C.level) == 1) pipes.push({ x: 370, gap: A.rand(100 + gh, 460 - gh), ok: 0 });
    } else { y = 250 + Math.sin(Date.now() / 200) * 8; rot = 0; }
    pipes.forEach(p => p.x -= sp); pipes = pipes.filter(p => p.x > -70);
    for (const p of pipes) {
      if (!p.ok && p.x + 56 < 80) {
        p.ok = 1; K.addScore(1); K.burst(80, y, '#ffd23f', 9, 2); A.sfx('coin');
        if (++got >= need) {
          if (C.last) return C.finish('Campanha completa! 🏆');
          C.advance('Vãos menores e mais velocidade', build); return;
        }
      }
      if (100 > p.x && 68 < p.x + 56 && (y - 12 < p.gap - gh || y + 12 > p.gap + gh)) return K.over('Fase ' + C.level + '/40');
    }
    if (y > 548 || y < -20) return K.over('Fase ' + C.level + '/40');
    R(0, 0, 360, 560, '#4ec0ca'); R(0, 520, 360, 40, '#ded895'); R(0, 520, 360, 6, '#73bf2e');
    pipes.forEach(p => { R(p.x, 0, 56, p.gap - gh, '#73bf2e'); R(p.x - 4, p.gap - gh - 20, 64, 20, '#558c22'); R(p.x, p.gap + gh, 56, 450, '#73bf2e'); R(p.x - 4, p.gap + gh, 64, 20, '#558c22'); });
    g.save(); g.translate(80, y); g.rotate(rot); K.C(0, 0, 14, '#ffd23f'); K.C(6, -4, 4, '#fff'); R(8, 2, 12, 5, '#ff7b3a'); g.restore();
    T(String(K.score), 180, 70, 54, '#fff');
    T('Fase ' + C.level + '/40', 60, 24, 13, '#fff');
    T('Meta ' + got + '/' + need, 292, 24, 13, '#fff');
    if (!started) T('Toque para voar', 180, 330, 22, '#fff');
  });
});

// Invasores do Espaco: 40 fases com formações, aliens resistentes e mais tiros.
A.register('invaders', K => {
  K.canvas(480, 560); const { R, T } = K, C = A.campaign(K, 40);
  let x = 220, shots = [], bombs = [], al = [], dir = 1, speed = 0.5, lives = 3, cd = 0, tick = 0;
  const spawn = () => {
    al = [];
    const rows = 4 + (C.level % 3), cols = C.level > 25 ? 9 : 8, gap = cols == 9 ? 44 : 48, hp = C.level > 20 ? 2 : 1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (C.level > 12 && (r + c + C.level) % 17 == 0) continue;
      al.push({ x: 30 + c * gap, y: 40 + r * 34, r: Math.min(r, 3), hp, maxHp: hp, pts: 10 + (3 - Math.min(r, 3)) * 5 });
    }
    dir = 1; speed = Math.min(2.8, .45 + C.level * .055); tick = 0;
  };
  spawn(); K.pad('lr a');
  K.on(K.cv, 'pointermove', e => { x = A.clamp(K.pos(e).x - 18, 0, 444); });
  K.on(K.cv, 'pointerdown', e => { if (!shots.length || shots[shots.length - 1].y < 400) shots.push({ x: x + 18, y: 510 }); });
  K.loop(() => {
    x = A.clamp(x + K.dir().x * 6, 0, 444); cd--;
    if (K.keys.Space && cd <= 0) { shots.push({ x: x + 18, y: 510 }); cd = 18; A.sfx('step'); }
    shots.forEach(s => s.y -= 9); shots = shots.filter(s => s.y > -10);
    bombs.forEach(b => b.y += 3.4 + C.level * .045); bombs = bombs.filter(b => b.y < 580);
    let edge = false; al.forEach(a => { a.x += dir * speed; if (a.x < 6 || a.x + 34 > 474) edge = true; });
    if (edge) { dir *= -1; al.forEach(a => a.y += 12 + Math.min(8, C.level * .2)); }
    tick++; if (al.length && tick % Math.max(16, 58 - C.level) == 0) { const a = A.pick(al); bombs.push({ x: a.x + 17, y: a.y + 20 }); }
    for (const s of shots) for (const a of al) if (!a.dead && s.x > a.x && s.x < a.x + 34 && s.y > a.y && s.y < a.y + 24) {
      s.y = -50; a.hp--;
      if (a.hp <= 0) {
        a.dead = 1; K.addScore(a.pts); K.burst(a.x + 17, a.y + 12, ['#ff4d8d', '#ff9f43', '#7c5cff', '#00e0b8'][a.r], 12, 3); A.sfx('pop');
      } else { K.addScore(3); K.burst(a.x + 17, a.y + 12, '#fff', 6, 2); A.sfx('step'); }
    }
    al = al.filter(a => !a.dead);
    for (const b of bombs) if (b.y > 505 && b.x > x && b.x < x + 36) { b.y = 999; lives--; A.sfx('hit'); K.shake(220); if (!lives) return K.over('Fase ' + C.level + '/40'); }
    if (al.some(a => a.y > 480)) return K.over('Invadiram na fase ' + C.level);
    if (!al.length) {
      if (C.last) return C.finish('Campanha completa! 🏆');
      C.advance('Mais naves e resistência', () => { lives = Math.min(5, lives + 1); spawn(); }); return;
    }
    R(0, 0, 480, 560, '#05060f');
    al.forEach(a => {
      const c = a.hp > 1 ? '#ffd23f' : ['#ff4d8d', '#ff9f43', '#7c5cff', '#00e0b8'][a.r];
      R(a.x, a.y + 4, 34, 16, c); R(a.x + 4, a.y, 6, 6, c); R(a.x + 24, a.y, 6, 6, c); R(a.x + 8, a.y + 9, 4, 4, '#000'); R(a.x + 22, a.y + 9, 4, 4, '#000');
    });
    R(x, 520, 36, 12, '#00e0b8'); R(x + 15, 510, 6, 10, '#00e0b8');
    shots.forEach(s => R(s.x - 1, s.y, 3, 12, '#fff')); bombs.forEach(b => R(b.x - 2, b.y, 4, 12, '#ff4d6d'));
    T('♥'.repeat(lives), 50, 22, 16, '#ff4d6d'); T('Fase ' + C.level + '/40', 430, 22, 14, '#9aa0c8');
  });
});

// Asteroides: 40 fases com mais rochas, fragmentos e velocidade crescente.
A.register('asteroids', K => {
  K.canvas(560, 560); const { g, T } = K, C = A.campaign(K, 40);
  let sh = { x: 280, y: 280, a: -Math.PI / 2, vx: 0, vy: 0, inv: 120 }, bl = [], rk = [], cd = 0, lives = 3;
  const mkRock = (x, y, s) => ({ x, y, s, a: 0, vx: A.rf(-1.4, 1.4) * (1 + C.level * .015), vy: A.rf(-1.4, 1.4) * (1 + C.level * .015), p: Array.from({ length: 9 }, (_, i) => [i / 9 * 6.283, A.rf(.75, 1.15)]) });
  const spawn = () => { for (let i = 0; i < 3 + Math.min(10, C.level); i++) { const e = A.rand(0, 1); rk.push(mkRock(e ? A.rand(0, 120) : A.rand(440, 560), A.rand(0, 560), 3)); } };
  spawn(); K.pad('arrows a');
  const wrap = o => { o.x = (o.x + 560) % 560; o.y = (o.y + 560) % 560; };
  K.loop(() => {
    const k = K.keys; if (k.ArrowLeft) sh.a -= .07; if (k.ArrowRight) sh.a += .07;
    if (k.ArrowUp) { sh.vx += Math.cos(sh.a) * .14; sh.vy += Math.sin(sh.a) * .14; }
    sh.vx *= .993; sh.vy *= .993; sh.x += sh.vx; sh.y += sh.vy; wrap(sh); sh.inv--; cd--;
    if (k.Space && cd <= 0) { bl.push({ x: sh.x, y: sh.y, vx: Math.cos(sh.a) * 8 + sh.vx, vy: Math.sin(sh.a) * 8 + sh.vy, l: 60 }); cd = 12; A.sfx('step'); }
    bl.forEach(b => { b.x += b.vx; b.y += b.vy; b.l--; wrap(b); }); bl = bl.filter(b => b.l > 0);
    rk.forEach(r => { r.x += r.vx; r.y += r.vy; r.a += .01; wrap(r); });
    const add = [];
    for (const b of bl) for (const r of rk) if (!r.dead && Math.hypot(b.x - r.x, b.y - r.y) < r.s * 14) {
      r.dead = 1; b.l = 0; K.addScore(r.s == 3 ? 20 : r.s == 2 ? 50 : 100); K.burst(r.x, r.y, r.s == 1 ? '#ffd23f' : '#cfe3ff', r.s * 6, 3); A.sfx('pop');
      if (r.s > 1) for (let i = 0; i < 2; i++) add.push(mkRock(r.x, r.y, r.s - 1));
    }
    rk = rk.filter(r => !r.dead).concat(add);
    if (sh.inv < 0) for (const r of rk) if (Math.hypot(sh.x - r.x, sh.y - r.y) < r.s * 13 + 8) { lives--; A.sfx('hit'); K.shake(260); K.burst(sh.x, sh.y, '#ff4d6d', 24, 5); sh = { x: 280, y: 280, a: -Math.PI / 2, vx: 0, vy: 0, inv: 120 }; if (!lives) return K.over('Fase ' + C.level + '/40'); break; }
    if (!rk.length) {
      if (C.last) return C.finish('Campanha completa! 🏆');
      C.advance('Mais rochas e fragmentos', () => { lives = 3; sh = { x: 280, y: 280, a: -Math.PI / 2, vx: 0, vy: 0, inv: 120 }; bl = []; spawn(); }); return;
    }
    g.fillStyle = '#05060f'; g.fillRect(0, 0, 560, 560); g.strokeStyle = '#cfe3ff'; g.lineWidth = 2;
    rk.forEach(r => { g.beginPath(); r.p.forEach(([a, m], i) => { const X = r.x + Math.cos(a + r.a) * r.s * 14 * m, Y = r.y + Math.sin(a + r.a) * r.s * 14 * m; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.stroke(); });
    if (sh.inv < 0 || Math.floor(sh.inv / 6) % 2) { g.save(); g.translate(sh.x, sh.y); g.rotate(sh.a); g.strokeStyle = '#00e0b8'; g.beginPath(); g.moveTo(14, 0); g.lineTo(-10, 9); g.lineTo(-5, 0); g.lineTo(-10, -9); g.closePath(); g.stroke(); if (k.ArrowUp) { g.strokeStyle = '#ff9f43'; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-16, 0); g.stroke(); } g.restore(); }
    g.fillStyle = '#fff'; bl.forEach(b => g.fillRect(b.x - 1.5, b.y - 1.5, 3, 3));
    T('♥'.repeat(lives), 50, 22, 16, '#ff4d6d'); T('Fase ' + C.level + '/40', 500, 22, 13, '#9aa0c8');
  });
});

// Dino Corredor: 40 fases com metas de distância e velocidade crescente.
A.register('dino', K => {
  K.canvas(720, 260); const { R, T } = K, C = A.campaign(K, 40);
  let y = 0, v = 0, duck = false, obs = [], t = 0, sp = 6, dist = 0, total = 0, next = 60, goal = 1;
  const build = () => {
    y = 0; v = 0; duck = false; obs = []; t = 0; dist = 0; next = 50;
    sp = 6 + (C.level - 1) * .075;
    goal = 2400 + C.level * 120;
  };
  const jump = () => { if (y == 0) { v = 13.5; K.burst(66, 198, '#bbb', 7, 2); A.sfx('step'); } };
  build(); K.on(K.cv, 'pointerdown', jump); K.pad('ud');
  K.onKey(c => { if (c == 'Space' || c == 'ArrowUp') jump(); });
  K.loop(() => {
    duck = !!K.keys.ArrowDown; if (duck && y > 0) v -= 1.2;
    y += v; v -= .75; if (y <= 0) { y = 0; v = 0; }
    sp += .0007; dist += sp; total += sp; K.setScore(Math.floor(total / 10)); t++;
    if (dist >= goal) {
      if (C.last) return C.finish('Campanha completa! 🏆');
      C.advance('Corrida mais rápida e obstáculos novos', build); return;
    }
    if (--next <= 0) {
      const bird = dist > 1000 && Math.random() < .3;
      obs.push(bird ? { x: 740, w: 34, h: 24, y: Math.random() < .5 ? 40 : 8, bird: 1 } : { x: 740, w: A.rand(18, 40), h: A.rand(34, 56), y: 0 });
      next = A.rand(45, 90) * 6 / sp;
    }
    obs.forEach(o => o.x -= sp); obs = obs.filter(o => o.x > -60);
    const dh = duck && y == 0 ? 22 : 44, me = { x: 50, y: y, w: 34, h: dh };
    for (const o of obs) if (me.x < o.x + o.w && me.x + me.w > o.x && me.y < o.y + o.h && me.y + me.h > o.y) return K.over('Bateu na fase ' + C.level + '/40!');
    R(0, 0, 720, 260, '#f7f7f7'); R(0, 200, 720, 2, '#535353'); for (let i = 0; i < 8; i++) R((i * 130 - t * sp * .6) % 760 + (i * 130 - t * sp * .6 < 0 ? 760 : 0), 215 + (i % 3) * 8, 14, 2, '#aaa');
    const remain = goal - dist;
    if (remain > 0 && remain < 520) {
      const fx = 50 + remain;
      K.checker(fx, 96, 14, 104, 10);
      K.checker(fx - 26, 192, 66, 8, 8);
      T('CHEGADA', fx + 7, 84, 11, '#535353');
    }
    obs.forEach(o => { const c = '#535353'; if (o.bird) { R(o.x, 200 - o.y - o.h, o.w, 10, c); R(o.x + 6, 200 - o.y - o.h - (t % 20 < 10 ? 10 : -8), 18, 8, c); } else { R(o.x, 200 - o.h, o.w, o.h, c); R(o.x - 6, 200 - o.h * .6, 8, 10, c); } });
    R(50, 200 - y - dh, 34, dh, '#535353'); R(62, 200 - y - dh - 2, 26, 4, '#535353'); R(76, 200 - y - dh + 6, 4, 4, '#fff');
    if (y == 0) R(54 + (t % 12 < 6 ? 0 : 14), 198, 8, 4, '#535353');
    R(0, 254, 720 * Math.min(1, dist / goal), 3, '#3ddc84');
    T(String(K.score).padStart(5, '0'), 660, 24, 20, '#535353');
    T('Fase ' + C.level + '/40', 60, 24, 13, '#535353');
  });
});
})();
