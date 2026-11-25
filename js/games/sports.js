/* =============================================================================
   ARCADIA — ESPORTES & CORRIDA (sports.js)
   -----------------------------------------------------------------------------
   Dois jogos em versão "arcade de estúdio":

     • FUTEBOL DE CAMPO — estádio animado com torcida, gramado listrado,
       goleiros que se esticam, chute carregado, pique com stamina, IA com
       estados de ataque/defesa, clima (dia/noite/chuva), modo 2 jogadores e
       campeonato de três rodadas com prorrogação de gol de ouro.

     • MOTO VELOZ — três circuitos (cidade, deserto e neon), estrada sinuosa
       desenhada com curvas reais, nitro, boost pads, combo de quase-acidente,
       trânsito com carros e caminhões, faíscas, fumaça e HUD completo.

   Tudo desenhado em canvas, com partículas, câmera trepidante e sons gerados
   por WebAudio. Nenhuma biblioteca externa.
   ============================================================================= */
(function () {
'use strict';

const A = Arcadia;

/* =============================================================================
   FUTEBOL DE CAMPO
   ============================================================================= */
A.register('football', K => {
  K.canvas(960, 540);
  const { g, R, T } = K;

  const cfg = K.config;
  const two = K.players === 2;
  const tournament = !!cfg.tournament && !two;
  const minutes = A.clamp(Number(cfg.minutes) || 2, 1, 3);
  const weather = cfg.weather || 'day';
  const baseFactor = A.difficultyFactor(cfg.difficulty);

  const W = 960;
  const H = 540;
  const FX0 = 22;
  const FY0 = 22;
  const FX1 = W - 22;
  const FY1 = H - 22;
  const GOAL_Y = (FY0 + FY1) / 2;
  const GOAL_TOP = GOAL_Y - 78;
  const GOAL_BOTTOM = GOAL_Y + 78;
  const BALL_R = 9;
  const P_R = 15;
  const K_R = 17;

  const TEAM1 = '#4c7dff';
  const TEAM2 = '#ff4d6d';
  const CROWD_COLORS = ['#ffd23f', '#4c7dff', '#ff4d6d', '#00e0b8', '#f4f6ff', '#a855f7'];

  /* ------------------------------------------------------------------ estado */
  let s1 = 0;
  let s2 = 0;
  let round = 0;
  let timeLeft = minutes * 60;
  let phase = 'play';            /* play | celebrate | over */
  let freeze = 1.4;
  let celebrate = 0;
  let overtime = false;
  let elapsed = 0;
  let hudTick = 0;
  let cam = 0;
  let flash = 0;
  let lastScorer = 0;

  const parts = [];

  /* ------------------------------------------------------------------ torcida */
  const crowd = [];
  for (let i = 0; i < 300; i++) {
    const top = i % 2 === 0;
    crowd.push({
      x: A.rf(4, W - 4),
      y: top ? A.rf(3, FY0 - 5) : A.rf(FY1 + 5, H - 3),
      c: A.pick(CROWD_COLORS),
      p: A.rf(0, Math.PI * 2),
      s: A.rf(0.6, 1.8)
    });
  }
  for (let i = 0; i < 90; i++) {
    const left = i % 2 === 0;
    crowd.push({
      x: left ? A.rf(3, FX0 - 5) : A.rf(FX1 + 5, W - 3),
      y: A.rf(FY0 + 6, FY1 - 6),
      c: A.pick(CROWD_COLORS),
      p: A.rf(0, Math.PI * 2),
      s: A.rf(0.6, 1.6)
    });
  }

  /* ------------------------------------------------------------------ entidades */
  const ball = { x: W / 2, y: GOAL_Y, vx: 0, vy: 0, r: BALL_R, rot: 0, spin: 0, trail: [] };

  function newPlayer(team, x) {
    return {
      team, x, y: GOAL_Y, vx: 0, vy: 0, r: P_R,
      dirX: team === 1 ? 1 : -1, dirY: 0,
      anim: 0, stamina: 1, cool: 0,
      charging: false, charge: 0, kick: 0
    };
  }
  const p1 = newPlayer(1, W * 0.33);
  const p2 = newPlayer(2, W * 0.67);

  function newKeeper(team, x) {
    return { team, x, y: GOAL_Y, vy: 0, r: K_R, dive: 0, anim: 0, flash: 0 };
  }
  const k1 = newKeeper(1, FX0 + 17);
  const k2 = newKeeper(2, FX1 - 17);

  /* ------------------------------------------------------------------ utilidades */
  function emit(x, y, color, n, speed, opts) {
    opts = opts || {};
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random());
      parts.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - (opts.up || 0),
        life: opts.life || A.rf(0.35, 0.85),
        max: opts.life || 0.85,
        c: color,
        size: opts.size || A.rf(1.6, 3.4),
        gravity: opts.gravity == null ? 160 : opts.gravity,
        shape: opts.shape || 'dot',
        rot: Math.random() * 6.28,
        vr: A.rf(-8, 8)
      });
    }
  }

  function confetti(n) {
    for (let i = 0; i < n; i++) {
      parts.push({
        x: A.rf(0, W),
        y: A.rf(-60, GOAL_Y * 0.7),
        vx: A.rf(-70, 70),
        vy: A.rf(-40, 140),
        life: A.rf(1.3, 2.6),
        max: 2.6,
        c: A.pick(CROWD_COLORS),
        size: A.rf(3, 7),
        gravity: 210,
        shape: 'rect',
        rot: A.rf(0, 6.28),
        vr: A.rf(-7, 7)
      });
    }
  }

  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.vx *= Math.exp(-1.3 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  }

  function updateHud() {
    K.setScore(two ? s1 + ' × ' + s2 : s1);
  }

  function resetPositions() {
    ball.x = W / 2;
    ball.y = GOAL_Y;
    ball.vx = 0;
    ball.vy = 0;
    ball.spin = 0;
    ball.trail.length = 0;
    p1.x = W * 0.33; p1.y = GOAL_Y; p1.vx = 0; p1.vy = 0;
    p2.x = W * 0.67; p2.y = GOAL_Y; p2.vx = 0; p2.vy = 0;
    p1.dirX = 1; p2.dirX = -1; p1.dirY = p2.dirY = 0;
    p1.charging = p2.charging = false;
    p1.charge = p2.charge = 0;
    p1.cool = p2.cool = 0;
    k1.y = k2.y = GOAL_Y;
    k1.vy = k2.vy = 0;
    k1.dive = k2.dive = 0;
  }

  /* ------------------------------------------------------------------ gols */
  function scoreGoal(team) {
    if (phase !== 'play') return;
    if (team === 1) s1++; else s2++;
    lastScorer = team;
    updateHud();

    phase = 'celebrate';
    celebrate = 1.7;
    cam = 18;
    flash = 0.55;
    confetti(140);
    emit(ball.x, ball.y, team === 1 ? TEAM1 : TEAM2, 30, 260, { life: 1.1, size: 3.2 });
    A.sfx('goal');
    A.sfx('crowd');
    K.banner(
      team === 1 ? 'GOL DO AZUL!' : 'GOL DO VERMELHO!',
      two ? 'Boa jogada!' : team === 1 ? 'Você marcou!' : 'A IA marcou'
    );
    ball.vx = 0;
    ball.vy = 0;
  }

  function afterGoal() {
    if (phase === 'over') return;
    if (overtime) { finishMatch(); return; }
    resetPositions();
    phase = 'play';
    celebrate = 0;
    freeze = 1;
  }

  function finishMatch() {
    if (phase === 'over') return;

    if (tournament) {
      if (s1 === s2 && !overtime) {
        overtime = true;
        timeLeft = 30;
        phase = 'play';
        freeze = 1.2;
        resetPositions();
        updateHud();
        K.banner('PRORROGAÇÃO', 'Gol de ouro decide a vaga');
        A.sfx('whistle');
        return;
      }

      if (s1 > s2) {
        round++;
        if (round >= 3) {
          phase = 'over';
          A.fx.confetti(240, true);
          K.over('CAMPEÃO DO TORNEIO! 🏆', undefined, true);
          return;
        }
        s1 = 0;
        s2 = 0;
        overtime = false;
        timeLeft = minutes * 60;
        resetPositions();
        phase = 'play';
        freeze = 1.6;
        updateHud();
        A.fx.confetti(120, true);
        A.sfx('win');
        K.banner('RODADA ' + (round + 1) + '/3', 'O adversário ficou mais forte');
        return;
      }

      phase = 'over';
      K.over('Eliminado na rodada ' + (round + 1), undefined, true);
      return;
    }

    phase = 'over';
    if (two) {
      K.over(s1 > s2 ? 'Jogador 1 venceu! 🎉' : s1 < s2 ? 'Jogador 2 venceu! 🎉' : 'Empate', undefined, true);
    } else {
      K.over(s1 > s2 ? 'Você venceu! 🎉' : s1 < s2 ? 'Você perdeu' : 'Empate', s1);
    }
  }

  /* ------------------------------------------------------------------ ações */
  function nearBall(p, extra) {
    return Math.hypot(ball.x - p.x, ball.y - p.y) < p.r + ball.r + (extra || 26);
  }

  function dash(p) {
    if (p.cool > 0) return;
    p.cool = 0.45;
    p.vx += p.dirX * 320;
    p.vy += p.dirY * 320;
    emit(p.x, p.y, '#e8ecff', 9, 120, { life: 0.3, size: 2, gravity: 40 });
    A.sfx('whoosh');
  }

  function shoot(p, power) {
    if (phase !== 'play' || freeze > 0 || !nearBall(p, 36)) { p.charging = false; return; }
    const goalX = p.team === 1 ? W - 4 : 4;
    const aimY = A.clamp(
      ball.y + p.dirY * 64 + A.rf(-26, 26),
      GOAL_TOP + 16,
      GOAL_BOTTOM - 16
    );
    const dx = goalX - ball.x;
    const dy = aimY - ball.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 430 + power * 650;

    ball.vx = dx / len * speed + p.vx * 0.25;
    ball.vy = dy / len * speed + p.vy * 0.25;
    ball.spin = A.rf(-1, 1) * power * 1.6;

    p.cool = 0.32;
    p.kick = 0.2;
    p.charge = 0;
    p.charging = false;
    cam = Math.max(cam, 3 + power * 5);
    emit(ball.x, ball.y, '#fff', 8 + Math.round(power * 12), 110 + power * 190, { life: 0.4, size: 2, gravity: 90 });
    A.sfx(power > 0.86 ? 'kick' : 'hit');
    if (power > 0.86) K.shake(120);
  }

  function beginAction(p) {
    if (K.paused || phase !== 'play' || freeze > 0) return;
    if (nearBall(p, 32)) {
      p.charging = true;
      p.charge = 0;
    } else {
      dash(p);
    }
  }

  function releaseAction(p) {
    if (!p.charging) return;
    const power = 0.25 + p.charge * 0.75;
    p.charging = false;
    if (!K.paused && nearBall(p, 38)) shoot(p, power);
    p.charge = 0;
  }

  K.onKey(code => {
    if (phase === 'over') return;
    if (code === 'Space') beginAction(p1);
    if (code === 'Enter' && two) beginAction(p2);
  });

  K.on(window, 'keyup', event => {
    if (event.code === 'Space') releaseAction(p1);
    if (event.code === 'Enter' && two) releaseAction(p2);
  });

  if (!two) K.pad('arrows a');

  /* ------------------------------------------------------------------ movimento */
  function inputFor(p) {
    if (two) {
      if (p === p1) {
        return {
          x: (K.raw.KeyD ? 1 : 0) - (K.raw.KeyA ? 1 : 0),
          y: (K.raw.KeyS ? 1 : 0) - (K.raw.KeyW ? 1 : 0),
          sprint: !!K.raw.ShiftLeft
        };
      }
      return {
        x: (K.raw.ArrowRight ? 1 : 0) - (K.raw.ArrowLeft ? 1 : 0),
        y: (K.raw.ArrowDown ? 1 : 0) - (K.raw.ArrowUp ? 1 : 0),
        sprint: !!K.raw.ShiftRight
      };
    }
    const d = K.dir();
    return { x: d.x, y: d.y, sprint: !!(K.raw.ShiftLeft || K.raw.ShiftRight) };
  }

  function movePlayer(p, ix, iy, sprint, dt, scale) {
    const len = Math.hypot(ix, iy);
    const sprinting = sprint && p.stamina > 0.03 && len > 0;
    if (len > 0) {
      p.dirX = ix / len;
      p.dirY = iy / len;
    }

    const maxSpeed = (sprinting ? 318 : 208) * (scale || 1);
    const targetX = len > 0 ? ix / len * maxSpeed : 0;
    const targetY = len > 0 ? iy / len * maxSpeed : 0;
    const rate = 1 - Math.exp(-(sprinting ? 15 : 11) * dt);

    p.vx += (targetX - p.vx) * rate;
    p.vy += (targetY - p.vy) * rate;
    p.x = A.clamp(p.x + p.vx * dt, FX0 + 10, FX1 - 10);
    p.y = A.clamp(p.y + p.vy * dt, FY0 + 10, FY1 - 10);

    p.anim += Math.hypot(p.vx, p.vy) * dt * 0.09;
    if (sprinting) {
      p.stamina = Math.max(0, p.stamina - dt * 0.3);
      if (Math.random() < dt * 22) {
        emit(p.x, p.y + 8, '#8ee6a8', 1, 60, { life: 0.35, size: 1.6, gravity: 130 });
      }
    } else {
      p.stamina = Math.min(1, p.stamina + dt * 0.22);
    }

    if (p.cool > 0) p.cool -= dt;
    if (p.kick > 0) p.kick -= dt;
    if (p.charging) p.charge = Math.min(1, p.charge + dt * 1.6);
  }

  function touchBall(p) {
    const dx = ball.x - p.x;
    const dy = ball.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const min = p.r + ball.r + 1;
    if (d >= min) return;

    const nx = dx / d;
    const ny = dy / d;
    ball.x = p.x + nx * min;
    ball.y = p.y + ny * min;

    const speed = Math.hypot(p.vx, p.vy);
    const kick = 90 + speed * 1.15;
    ball.vx = nx * kick + p.vx * 0.55 + (p.team === 1 ? 18 : -18);
    ball.vy = ny * kick + p.vy * 0.55;
    if (speed > 210) {
      emit(ball.x, ball.y, '#dfe7ff', 3, 70, { life: 0.25, size: 1.6, gravity: 70 });
    }
  }

  function separatePlayers(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const min = a.r + b.r;
    if (d >= min) return;
    const push = (min - d) / 2;
    const nx = dx / d;
    const ny = dy / d;
    a.x -= nx * push;
    a.y -= ny * push;
    b.x += nx * push;
    b.y += ny * push;
    a.x = A.clamp(a.x, FX0 + 10, FX1 - 10);
    a.y = A.clamp(a.y, FY0 + 10, FY1 - 10);
    b.x = A.clamp(b.x, FX0 + 10, FX1 - 10);
    b.y = A.clamp(b.y, FY0 + 10, FY1 - 10);
  }

  /* ------------------------------------------------------------------ IA */
  function aiUpdate(dt) {
    const p = p2;
    const factor = baseFactor * (1 + round * 0.12) * (overtime ? 1.08 : 1);
    const ballDist = Math.hypot(ball.x - p.x, ball.y - p.y);
    const ownGoalX = FX1 - 20;
    const onAttack = ball.x < W * 0.56;
    let tx;
    let ty;
    let sprint = false;

    if (ballDist < 175 || onAttack) {
      tx = ball.x + ball.vx * 0.12;
      ty = ball.y + ball.vy * 0.12;
      sprint = ballDist > 70;
    } else {
      tx = (ball.x + ownGoalX) / 2;
      ty = (ball.y + GOAL_Y) / 2;
    }

    const noise = Math.max(0, 1.4 - factor) * 38;
    tx += Math.sin(elapsed * 1.7) * noise;
    ty += Math.cos(elapsed * 1.3) * noise;

    const dx = tx - p.x;
    const dy = ty - p.y;
    const len = Math.hypot(dx, dy) || 1;
    movePlayer(p, dx / len, dy / len, sprint, dt, factor);
    touchBall(p);

    if (p.cool <= 0 && nearBall(p, 24) && Math.random() < (0.35 + factor * 0.18) * dt * 4) {
      shoot(p, 0.5 + Math.random() * 0.45);
    }
  }

  /* ------------------------------------------------------------------ goleiros */
  function updateKeeper(k, dt) {
    const incoming = k.team === 1 ? ball.vx < -140 : ball.vx > 140;
    const near = Math.abs(ball.x - k.x) < 195;
    const targetY = A.clamp(
      ball.y + (incoming ? ball.vy * 0.12 : 0),
      GOAL_TOP + 10,
      GOAL_BOTTOM - 10
    );

    const maxV = 300;
    const desired = A.clamp(targetY - k.y, -maxV, maxV);
    k.vy += (desired - k.vy) * Math.min(1, dt * 10);
    k.y = A.clamp(k.y + k.vy * dt, GOAL_TOP, GOAL_BOTTOM);
    k.anim += Math.abs(k.vy) * dt * 0.05;

    if (incoming && near) k.dive = Math.min(1, k.dive + dt * 3.5);
    else k.dive = Math.max(0, k.dive - dt * 2.5);
    if (k.flash > 0) k.flash -= dt * 4;

    const reach = k.r + ball.r + 2 + k.dive * 10;
    const dx = ball.x - k.x;
    const dy = ball.y - k.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < reach) {
      const nx = dx / d;
      const ny = dy / d;
      const dir = k.team === 1 ? 1 : -1;
      ball.x = k.x + nx * reach;
      ball.y = k.y + ny * reach;
      ball.vx = nx * 430 + dir * 160;
      ball.vy = ny * 430 + A.rf(-90, 90);
      k.flash = 1;
      cam = Math.max(cam, 6);
      emit(ball.x, ball.y, '#ffd23f', 10, 180, { life: 0.5, size: 2.2, gravity: 80 });
      A.sfx('save');
      K.shake(90);
    }
  }

  /* ------------------------------------------------------------------ bola */
  function updateBall(dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    const damp = Math.exp(-1.15 * dt);
    ball.vx *= damp;
    ball.vy *= damp;
    ball.rot += (Math.hypot(ball.vx, ball.vy) / Math.max(1, ball.r)) * dt * 0.6;

    if (Math.hypot(ball.vx, ball.vy) > 260) {
      ball.trail.push({ x: ball.x, y: ball.y, life: 0.3 });
      if (ball.trail.length > 12) ball.trail.shift();
    }
    for (let i = ball.trail.length - 1; i >= 0; i--) {
      ball.trail[i].life -= dt;
      if (ball.trail[i].life <= 0) ball.trail.splice(i, 1);
    }

    if (ball.y < FY0 + ball.r) {
      ball.y = FY0 + ball.r;
      ball.vy = Math.abs(ball.vy) * 0.86;
      A.sfx('step');
    }
    if (ball.y > FY1 - ball.r) {
      ball.y = FY1 - ball.r;
      ball.vy = -Math.abs(ball.vy) * 0.86;
      A.sfx('step');
    }

    const inGoal = ball.y > GOAL_TOP && ball.y < GOAL_BOTTOM;

    if (ball.x < FX0 - 4) {
      if (inGoal) { scoreGoal(2); return; }
      ball.x = FX0 + ball.r;
      ball.vx = Math.abs(ball.vx) * 0.85;
    } else if (ball.x > FX1 + 4) {
      if (inGoal) { scoreGoal(1); return; }
      ball.x = FX1 - ball.r;
      ball.vx = -Math.abs(ball.vx) * 0.85;
    }
  }

  /* ------------------------------------------------------------------ update */
  function update(dt) {
    elapsed += dt;
    cam *= Math.exp(-5 * dt);
    if (flash > 0) flash = Math.max(0, flash - dt * 2.2);
    updateParts(dt);

    if (phase === 'over') return;

    if (phase === 'celebrate') {
      celebrate -= dt;
      if (celebrate <= 0) afterGoal();
      return;
    }

    if (freeze > 0) {
      freeze -= dt;
      return;
    }

    if (phase !== 'play') return;

    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      finishMatch();
      return;
    }

    const i1 = inputFor(p1);
    movePlayer(p1, i1.x, i1.y, i1.sprint, dt, 1);
    touchBall(p1);

    if (two) {
      const i2 = inputFor(p2);
      movePlayer(p2, i2.x, i2.y, i2.sprint, dt, 1);
      touchBall(p2);
    } else {
      aiUpdate(dt);
    }

    separatePlayers(p1, p2);
    updateKeeper(k1, dt);
    updateKeeper(k2, dt);
    updateBall(dt);

    hudTick += dt;
    if (hudTick > 0.25) {
      hudTick = 0;
      updateHud();
    }
  }

  /* ------------------------------------------------------------------ desenho */
  function drawStadium() {
    g.fillStyle = weather === 'night' ? '#071022' : weather === 'rain' ? '#0d1a22' : '#0c1b12';
    g.fillRect(0, 0, W, H);

    for (const c of crowd) {
      const alpha = 0.32 + 0.5 * Math.abs(Math.sin(elapsed * c.s + c.p));
      g.globalAlpha = alpha * (phase === 'celebrate' ? 1 : 0.78);
      g.fillStyle = c.c;
      g.fillRect(c.x, c.y, 2.4, 2.4);
    }
    g.globalAlpha = 1;
  }

  function drawField() {
    const base = weather === 'night' ? '#0e3a24' : weather === 'rain' ? '#14512f' : '#1b7a3d';
    const stripe = weather === 'night' ? '#0c321f' : weather === 'rain' ? '#114728' : '#176b36';
    R(FX0, FY0, FX1 - FX0, FY1 - FY0, base);

    let index = 0;
    for (let x = FX0; x < FX1; x += 84) {
      if (index % 2 === 0) R(x, FY0, 42, FY1 - FY0, stripe);
      index++;
    }

    const LINE = 'rgba(255,255,255,.72)';
    g.strokeStyle = LINE;
    g.lineWidth = 3;
    g.strokeRect(FX0, FY0, FX1 - FX0, FY1 - FY0);

    g.beginPath();
    g.moveTo(W / 2, FY0);
    g.lineTo(W / 2, FY1);
    g.stroke();

    g.beginPath();
    g.arc(W / 2, GOAL_Y, 64, 0, Math.PI * 2);
    g.stroke();

    g.fillStyle = LINE;
    g.beginPath();
    g.arc(W / 2, GOAL_Y, 4, 0, Math.PI * 2);
    g.fill();

    const penW = 120;
    const penH = 236;
    g.strokeRect(FX0, GOAL_Y - penH / 2, penW, penH);
    g.strokeRect(FX1 - penW, GOAL_Y - penH / 2, penW, penH);

    const gaW = 52;
    const gaH = 120;
    g.strokeRect(FX0, GOAL_Y - gaH / 2, gaW, gaH);
    g.strokeRect(FX1 - gaW, GOAL_Y - gaH / 2, gaW, gaH);

    g.beginPath();
    g.arc(FX0 + 88, GOAL_Y, 3, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(FX1 - 88, GOAL_Y, 3, 0, Math.PI * 2);
    g.fill();
  }

  function drawGoals() {
    for (const side of [1, 2]) {
      const left = side === 1;
      const nx0 = left ? 0 : FX1;
      const nx1 = left ? FX0 : W;
      const width = nx1 - nx0;

      g.fillStyle = 'rgba(0,0,0,.3)';
      g.fillRect(nx0, GOAL_TOP, width, GOAL_BOTTOM - GOAL_TOP);

      g.strokeStyle = 'rgba(255,255,255,.18)';
      g.lineWidth = 1;
      for (let x = nx0 + 4; x < nx1; x += 10) {
        g.beginPath();
        g.moveTo(x, GOAL_TOP);
        g.lineTo(x, GOAL_BOTTOM);
        g.stroke();
      }
      for (let y = GOAL_TOP; y < GOAL_BOTTOM; y += 10) {
        g.beginPath();
        g.moveTo(nx0, y);
        g.lineTo(nx1, y);
        g.stroke();
      }

      g.strokeStyle = '#fff';
      g.lineWidth = 5;
      const post = left ? FX0 : FX1;
      g.beginPath();
      g.moveTo(post, GOAL_TOP);
      g.lineTo(post, GOAL_BOTTOM);
      g.stroke();
      g.beginPath();
      g.moveTo(nx0, GOAL_TOP);
      g.lineTo(post, GOAL_TOP);
      g.stroke();
      g.beginPath();
      g.moveTo(nx0, GOAL_BOTTOM);
      g.lineTo(post, GOAL_BOTTOM);
      g.stroke();
    }
  }

  function drawParts() {
    for (const p of parts) {
      const alpha = Math.max(0, Math.min(1, p.life / p.max));
      g.globalAlpha = alpha;
      g.fillStyle = p.c;
      if (p.shape === 'rect') {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
        g.restore();
      } else {
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  function drawPlayer(p, color, label, active) {
    const speed = Math.hypot(p.vx, p.vy);

    if (speed > 235) {
      for (let i = 0; i < 3; i++) {
        const t = i / 3;
        g.globalAlpha = 0.18 * (1 - t);
        g.fillStyle = color;
        g.beginPath();
        g.arc(p.x - p.vx * 0.02 * (i + 1), p.y - p.vy * 0.02 * (i + 1), p.r * (1 - t * 0.25), 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }

    g.fillStyle = 'rgba(0,0,0,.28)';
    g.beginPath();
    g.ellipse(p.x + 3, p.y + 5, p.r * 0.95, p.r * 0.7, 0, 0, Math.PI * 2);
    g.fill();

    const angle = Math.atan2(p.dirY, p.dirX);
    const swing = Math.sin(p.anim * 2) * p.r * 0.55;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(angle);
    g.strokeStyle = 'rgba(255,255,255,.78)';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-2, -4);
    g.lineTo(-2 + swing, -p.r - 5);
    g.stroke();
    g.beginPath();
    g.moveTo(-2, 4);
    g.lineTo(-2 - swing, p.r + 5);
    g.stroke();
    g.restore();

    const grad = g.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.4, 2, p.x, p.y, p.r);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.26, color);
    grad.addColorStop(1, color);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = 'rgba(0,0,0,.24)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    g.stroke();

    T(label, p.x, p.y + 1, 12, '#fff');

    if (active) {
      g.strokeStyle = 'rgba(255,255,255,.5)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2);
      g.stroke();
    }

    g.strokeStyle = p.stamina > 0.3 ? '#3ddc84' : '#ff4d6d';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(p.x, p.y, p.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.stamina);
    g.stroke();

    if (p.charging) {
      g.strokeStyle = '#ffd23f';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(p.x, p.y, p.r + 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.charge);
      g.stroke();

      const dir = p.team === 1 ? 1 : -1;
      g.strokeStyle = 'rgba(255,210,63,.55)';
      g.lineWidth = 2;
      g.setLineDash([6, 6]);
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x + dir * 120, p.y + p.dirY * 80);
      g.stroke();
      g.setLineDash([]);
    }

    if (p.kick > 0) {
      g.strokeStyle = 'rgba(255,255,255,' + Math.min(1, p.kick * 4) + ')';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(p.x, p.y, p.r + 8 + p.kick * 20, 0, Math.PI * 2);
      g.stroke();
    }
  }

  function drawKeeper(k) {
    g.fillStyle = 'rgba(0,0,0,.28)';
    g.beginPath();
    g.ellipse(k.x + 2, k.y + 4, k.r * 0.95, k.r * 0.7, 0, 0, Math.PI * 2);
    g.fill();

    g.save();
    g.translate(k.x, k.y);
    g.scale(1 + k.dive * 0.5, 1 - k.dive * 0.24);
    g.fillStyle = k.flash > 0 ? '#fff' : '#ffd23f';
    g.beginPath();
    g.arc(0, 0, k.r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.2)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, k.r, 0, Math.PI * 2);
    g.stroke();
    g.restore();

    T('1', k.x, k.y + 1, 12, '#241a00');
  }

  function drawBall() {
    for (const t of ball.trail) {
      g.globalAlpha = Math.max(0, t.life / 0.3) * 0.35;
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(t.x, t.y, ball.r * 0.8, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    g.fillStyle = 'rgba(0,0,0,.25)';
    g.beginPath();
    g.ellipse(ball.x + 2, ball.y + 3, ball.r * 0.9, ball.r * 0.6, 0, 0, Math.PI * 2);
    g.fill();

    g.save();
    g.translate(ball.x, ball.y);
    g.rotate(ball.rot);
    const grad = g.createRadialGradient(-3, -3, 1, 0, 0, ball.r);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#cfd6ea');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, ball.r, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#1a1d2b';
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      g.beginPath();
      g.arc(Math.cos(a) * ball.r * 0.45, Math.sin(a) * ball.r * 0.45, ball.r * 0.18, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.arc(0, 0, ball.r * 0.22, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawWeather() {
    if (weather === 'night') {
      const glow = g.createRadialGradient(W / 2, FY0, 60, W / 2, GOAL_Y, H * 0.95);
      glow.addColorStop(0, 'rgba(140,180,255,.1)');
      glow.addColorStop(1, 'rgba(2,6,20,.5)');
      g.fillStyle = glow;
      g.fillRect(0, 0, W, H);

      for (const lx of [W * 0.2, W * 0.8]) {
        const light = g.createRadialGradient(lx, 0, 10, lx, 0, 440);
        light.addColorStop(0, 'rgba(200,220,255,.17)');
        light.addColorStop(1, 'rgba(200,220,255,0)');
        g.fillStyle = light;
        g.fillRect(0, 0, W, H);
      }
    } else if (weather === 'rain') {
      g.fillStyle = 'rgba(20,40,70,.16)';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(180,210,255,.35)';
      g.lineWidth = 1.4;
      for (let i = 0; i < 90; i++) {
        const x = ((i * 97 + elapsed * 420) % (W + 80)) - 40;
        const y = ((i * 53 + elapsed * 720) % (H + 80)) - 40;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 5, y + 16);
        g.stroke();
      }
    }
  }

  function drawHud() {
    const total = Math.max(0, Math.ceil(timeLeft));
    const mm = Math.floor(total / 60);
    const ss = total % 60;
    const clock = mm + ':' + String(ss).padStart(2, '0');

    g.fillStyle = 'rgba(5,8,18,.74)';
    g.beginPath();
    g.roundRect(W / 2 - 180, 10, 360, 44, 12);
    g.fill();

    g.fillStyle = TEAM1;
    g.beginPath();
    g.roundRect(W / 2 - 172, 18, 8, 28, 4);
    g.fill();
    g.fillStyle = TEAM2;
    g.beginPath();
    g.roundRect(W / 2 + 164, 18, 8, 28, 4);
    g.fill();

    T('AZUL', W / 2 - 138, 32, 12, '#9fb3ff');
    T('VERMELHO', W / 2 + 138, 32, 12, '#ffb3c1');
    T(String(s1), W / 2 - 70, 33, 24, '#fff');
    T('×', W / 2, 33, 18, '#9aa0c8');
    T(String(s2), W / 2 + 70, 33, 24, '#fff');
    T(clock, W / 2, 66, 15, overtime ? '#ffd23f' : '#c9ceef');

    if (tournament) T('CAMPEONATO · RODADA ' + (round + 1) + '/3', W / 2, 86, 12, '#ffd23f');
    else if (overtime) T('GOL DE OURO', W / 2, 86, 12, '#ffd23f');

    if (elapsed < 5 && phase === 'play' && freeze <= 0) {
      T(
        two
          ? 'J1: WASD + Espaço + Shift esq.  ·  J2: setas + Enter + Shift dir.'
          : 'Setas/WASD movem · segure Espaço para chutar · Shift corre',
        W / 2, H - 16, 12, 'rgba(255,255,255,.72)'
      );
    }
  }

  function drawCelebration() {
    const t = Math.max(0, 1.7 - celebrate);
    const scale = 1 + Math.sin(Math.min(1, t * 2.5) * Math.PI) * 0.18;

    g.fillStyle = 'rgba(0,0,0,.22)';
    g.fillRect(0, 0, W, H);

    g.save();
    g.translate(W / 2, GOAL_Y);
    g.scale(scale, scale);
    g.globalAlpha = Math.min(1, celebrate * 1.5);
    g.font = '900 96px Outfit,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = lastScorer === 1 ? TEAM1 : TEAM2;
    g.shadowBlur = 42;
    g.fillStyle = lastScorer === 1 ? '#8fa9ff' : '#ff9aaf';
    g.fillText('GOL!', 0, 0);
    g.shadowBlur = 0;
    g.restore();
    g.globalAlpha = 1;
  }

  function draw() {
    g.save();
    if (cam > 0.2) g.translate(A.rf(-cam, cam), A.rf(-cam, cam));

    drawStadium();
    drawField();
    drawGoals();

    drawKeeper(k1);
    drawKeeper(k2);
    drawPlayer(p1, TEAM1, '1', true);
    drawPlayer(p2, TEAM2, two ? '2' : 'CPU', two);
    drawBall();
    drawParts();

    g.restore();

    drawWeather();
    if (phase === 'celebrate') drawCelebration();
    drawHud();

    if (flash > 0) {
      g.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, flash) + ')';
      g.fillRect(0, 0, W, H);
    }

    if (freeze > 0 && phase === 'play' && elapsed > 1) {
      g.globalAlpha = Math.min(1, freeze);
      T('PREPARE-SE', W / 2, GOAL_Y + 150, 24, '#fff');
      g.globalAlpha = 1;
    }
  }

  updateHud();
  K.loop(dt => {
    update(dt);
    draw();
  });
});

/* =============================================================================
   MOTO VELOZ
   ============================================================================= */
A.register('moto', K => {
  K.canvas(480, 640);
  const { g, T } = K;

  const cfg = K.config;
  const laps = A.clamp(Number(cfg.laps) || 3, 1, 12);
  const factor = A.difficultyFactor(cfg.difficulty);
  const traffic = cfg.traffic || 'normal';
  const trafficFactor = traffic === 'heavy' ? 1.45 : traffic === 'light' ? 0.7 : 1;

  const W = 480;
  const H = 640;
  const PLAYER_Y = 520;
  const ROAD_HALF = 150;
  const LAP_LENGTH = 2400;
  const LANES = [-100, 0, 100];

  const THEMES = [
    {
      name: 'Cidade ao Amanhecer',
      sky1: '#0c2a3a', sky2: '#123b24',
      road: '#232633', road2: '#1b1e29',
      edge: '#d8dbf2', rumbleA: '#e8ecff', rumbleB: '#e63946',
      leaf: '#1f5a32', leaf2: '#2b7a43', trunk: '#3a2a1c', accent: '#ffd23f'
    },
    {
      name: 'Deserto Escaldante',
      sky1: '#3a1d16', sky2: '#7a3f1f',
      road: '#2a2530', road2: '#221d28',
      edge: '#ffe3a3', rumbleA: '#ffcf70', rumbleB: '#c0392b',
      leaf: '#b8762f', leaf2: '#d99a4e', trunk: '#5a3a1e', accent: '#ff9f43'
    },
    {
      name: 'Neon Noturno',
      sky1: '#070312', sky2: '#150a2b',
      road: '#14111f', road2: '#0d0a17',
      edge: '#00e0b8', rumbleA: '#00e0b8', rumbleB: '#ff4d6d',
      leaf: '#2a1650', leaf2: '#3d1f73', trunk: '#1a1030', accent: '#ff4d8d'
    }
  ];

  /* ------------------------------------------------------------------ estado */
  let stage = 0;
  let phase = 'countdown';       /* countdown | race | transition | over */
  let countdown = 3;
  let transition = 0;
  let lastCount = 4;
  let goPlayed = false;
  let distance = 0;
  let stageDist = 0;
  let lap = 1;
  let health = 100;
  let nitro = 45;
  let combo = 1;
  let comboTimer = 0;
  let score = 0;
  let hurt = 0;
  let flash = 0;
  let cam = 0;
  let elapsed = 0;
  let hudTick = 0;
  let spawnTimer = 1.1;
  let pickupTimer = 2.6;
  let padTimer = 6;
  let smokeTimer = 0;
  let dustTimer = 0;

  const bike = {
    x: W / 2,
    vx: 0,
    speed: 220,
    lean: 0,
    wheel: 0,
    boost: false
  };

  let obstacles = [];
  let pickups = [];
  let pads = [];
  const parts = [];
  const texts = [];

  /* ------------------------------------------------------------------ estrada */
  function centerAt(y) {
    const t = distance * 0.95 + (H - y) * 1.05;
    return W / 2 + Math.sin(t * 0.0017) * 74 + Math.sin(t * 0.0008 + 1.7) * 42;
  }

  /* ------------------------------------------------------------------ efeitos */
  function emit(x, y, color, n, speed, opts) {
    opts = opts || {};
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random());
      parts.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - (opts.up || 0),
        life: opts.life || A.rf(0.3, 0.8),
        max: opts.life || 0.8,
        c: color,
        size: opts.size || A.rf(1.6, 3.4),
        gravity: opts.gravity == null ? 120 : opts.gravity
      });
    }
  }

  function addText(text, x, y, color) {
    texts.push({ text, x, y, color, life: 0.95, max: 0.95 });
  }

  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.vx *= Math.exp(-1.2 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt;
      t.y -= 42 * dt;
      if (t.life <= 0) texts.splice(i, 1);
    }
  }

  /* ------------------------------------------------------------------ spawn */
  function spawnObstacle() {
    const lane = A.pick(LANES);
    if (obstacles.some(o => o.off === lane && o.y < 140)) return;
    const truck = Math.random() < 0.22;
    obstacles.push({
      off: lane,
      y: -120,
      w: truck ? 58 : 46,
      h: truck ? 126 : 84,
      truck,
      color: A.pick(['#e63946', '#f4a261', '#457b9d', '#9b5de5', '#2a9d8f', '#f15bb5', '#e9c46a']),
      counted: false
    });
  }

  function spawnPickup(kind) {
    pickups.push({ off: A.pick(LANES), y: -50, kind, spin: 0 });
  }

  function spawnPad() {
    pads.push({ off: A.pick(LANES), y: -80, w: 64, h: 92, phase: 0 });
  }

  /* ------------------------------------------------------------------ eventos */
  function finish(message) {
    if (phase === 'over') return;
    phase = 'over';
    A.fx.confetti(220, true);
    K.over(message, Math.floor(score));
  }

  function crash(o) {
    if (hurt > 0 || phase !== 'race') return;
    hurt = 0.8;
    health -= o.truck ? 30 : 22;
    bike.speed = Math.max(120, bike.speed * 0.5);
    combo = 1;
    comboTimer = 0;
    flash = 0.35;
    cam = 10;
    A.sfx('crash');
    K.shake(300);
    emit(bike.x, PLAYER_Y - 20, '#ff9f43', 24, 260, { life: 0.7, size: 3, gravity: 200 });
    emit(bike.x, PLAYER_Y - 20, '#fff', 10, 180, { life: 0.4, size: 2, gravity: 150 });
    addText('-' + (o.truck ? 30 : 22) + ' vida', bike.x, PLAYER_Y - 46, '#ff4d6d');
    if (health <= 0) {
      health = 0;
      finish('Moto destruída!');
    }
  }

  function nearMiss() {
    combo = Math.min(9, combo + 1);
    comboTimer = 4;
    score += 60 * combo;
    flash = 0.12;
    A.sfx('perfect');
    addText('QUASE! +' + (60 * combo), bike.x, PLAYER_Y - 40, '#ffd23f');
  }

  function collect(p) {
    if (p.kind === 'nitro') {
      nitro = Math.min(100, nitro + 40);
      score += 80 * combo;
      A.sfx('nitro');
      addText('+NITRO', p.x || bike.x, p.y, '#00e0b8');
    } else {
      health = Math.min(100, health + 28);
      A.sfx('coin');
      addText('+VIDA', p.x || bike.x, p.y, '#3ddc84');
    }
    combo = Math.min(9, combo + 1);
    comboTimer = 4;
  }

  function hitPad(pad) {
    nitro = Math.min(100, nitro + 25);
    bike.speed = Math.min(780, bike.speed + 140);
    score += 50 * combo;
    flash = 0.15;
    A.sfx('boost');
    addText('BOOST!', bike.x, PLAYER_Y - 40, '#ffd23f');
    pad.dead = true;
  }

  /* ------------------------------------------------------------------ update */
  function update(dt) {
    elapsed += dt;
    cam *= Math.exp(-6 * dt);
    if (flash > 0) flash = Math.max(0, flash - dt * 2.4);
    if (hurt > 0) hurt -= dt;
    updateParts(dt);

    if (phase === 'over') return;

    if (phase === 'transition') {
      transition -= dt;
      if (transition <= 0) {
        phase = 'countdown';
        countdown = 3;
        lastCount = 4;
        goPlayed = false;
        K.banner('CIRCUITO ' + (stage + 1), THEMES[stage].name);
      }
      return;
    }

    if (phase === 'countdown') {
      countdown -= dt;
      const n = Math.ceil(countdown);
      if (n !== lastCount && n > 0) {
        lastCount = n;
        A.sfx('tick');
      }
      if (countdown <= 0 && !goPlayed) {
        goPlayed = true;
        A.sfx('go');
      }
      if (countdown <= -0.7) phase = 'race';
      return;
    }

    /* ---------------------------------------------------------- corrida */
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 1;
    }

    const left = K.keys.ArrowLeft || K.raw.KeyA;
    const right = K.keys.ArrowRight || K.raw.KeyD;
    const up = K.keys.ArrowUp || K.raw.KeyW;
    const down = K.keys.ArrowDown || K.raw.KeyS;

    let dx = (right ? 1 : 0) - (left ? 1 : 0);
    bike.vx += dx * 1100 * dt;
    bike.vx *= Math.exp(-7.5 * dt);

    const curve = centerAt(PLAYER_Y - 40) - centerAt(PLAYER_Y + 40);
    bike.vx += curve * 0.9 * dt;

    bike.x += bike.vx * dt;
    const center = centerAt(PLAYER_Y);
    bike.x = A.clamp(bike.x, center - ROAD_HALF + 20, center + ROAD_HALF - 20);

    const targetLean = dx * 0.18 + curve * 0.0035;
    bike.lean += (targetLean - bike.lean) * Math.min(1, dt * 8);

    /* Nitro. */
    const wantsBoost = !!(K.keys.Space || K.raw.Space) && nitro > 0;
    if (wantsBoost && !bike.boost) A.sfx('boost');
    if (wantsBoost) {
      nitro = Math.max(0, nitro - 40 * dt);
      bike.boost = true;
    } else {
      bike.boost = false;
    }

    /* Velocidade. */
    const base = (220 + stage * 40 + Math.min(180, distance * 0.02)) * factor;
    const throttle = up ? 1.18 : down ? 0.55 : 1;
    const target = base * throttle + (bike.boost ? 210 : 0);
    bike.speed += (target - bike.speed) * Math.min(1, dt * (up ? 2.6 : 1.8));
    bike.speed = A.clamp(bike.speed, 110, 780);

    distance += bike.speed * dt;
    stageDist += bike.speed * dt;
    bike.wheel += bike.speed * dt * 0.05;

    /* Pontuação contínua. */
    score += bike.speed * dt * 0.06 * combo;

    /* Fumaça, poeira e rastro. */
    if (health < 45) {
      smokeTimer -= dt;
      if (smokeTimer <= 0) {
        smokeTimer = 0.08;
        emit(bike.x + A.rf(-6, 6), PLAYER_Y + 18, 'rgba(130,130,150,.5)', 1, 40, { life: 0.7, size: A.rf(3, 6), gravity: -40 });
      }
    }
    dustTimer -= dt;
    if (dustTimer <= 0) {
      dustTimer = 0.05;
      emit(bike.x + A.rf(-5, 5), PLAYER_Y + 24, 'rgba(200,200,220,.32)', 1, 30, { life: 0.4, size: 2, gravity: -20 });
    }

    /* Spawns. */
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(0.38, (1.15 - stage * 0.12 - distance * 0.00004) / (factor * trafficFactor));
      spawnObstacle();
      if (stage >= 1 && Math.random() < 0.24 * trafficFactor) spawnObstacle();
    }
    pickupTimer -= dt;
    if (pickupTimer <= 0) {
      pickupTimer = A.rf(4.2, 7.2);
      spawnPickup(Math.random() < 0.22 ? 'health' : 'nitro');
    }
    padTimer -= dt;
    if (padTimer <= 0) {
      padTimer = A.rf(7, 11);
      spawnPad();
    }

    /* Rolagem do mundo. */
    const scroll = bike.speed * dt * 0.95;
    for (const o of obstacles) o.y += scroll * (o.truck ? 0.7 : 1);
    obstacles = obstacles.filter(o => o.y < H + 150);
    for (const p of pickups) { p.y += scroll; p.spin += dt * 5; }
    pickups = pickups.filter(p => p.y < H + 80);
    for (const p of pads) { p.y += scroll; p.phase += dt * 4; }
    pads = pads.filter(p => p.y < H + 80);

    /* Colisões com carros. */
    for (const o of obstacles) {
      const ox = centerAt(o.y) + o.off;
      if (Math.abs(bike.x - ox) < (o.w + 22) / 2 && Math.abs(PLAYER_Y - o.y) < (o.h + 34) / 2) {
        o.dead = true;
        crash(o);
        break;
      }
    }
    obstacles = obstacles.filter(o => !o.dead);
    if (phase !== 'race') return;

    /* Quase-acidentes. */
    for (const o of obstacles) {
      if (o.counted || o.y < PLAYER_Y + 70) continue;
      o.counted = true;
      const ox = centerAt(o.y) + o.off;
      if (Math.abs(bike.x - ox) < 78) nearMiss();
    }

    /* Pickups. */
    for (const p of pickups) {
      const px = centerAt(p.y) + p.off;
      if (Math.hypot(bike.x - px, PLAYER_Y - p.y) < 34) {
        p.dead = true;
        p.x = px;
        collect(p);
      }
    }
    pickups = pickups.filter(p => !p.dead);

    /* Boost pads. */
    for (const p of pads) {
      const px = centerAt(p.y) + p.off;
      if (Math.abs(bike.x - px) < 40 && Math.abs(PLAYER_Y - p.y) < 52) {
        hitPad(p);
      }
    }
    pads = pads.filter(p => !p.dead);

    /* Voltas e circuitos. */
    const currentLap = Math.min(laps, Math.floor(stageDist / LAP_LENGTH) + 1);
    if (currentLap > lap) {
      lap = currentLap;
      score += 220 * combo;
      A.sfx('lap');
      K.banner('VOLTA ' + lap + '/' + laps, THEMES[stage].name);
    }

    if (stageDist >= LAP_LENGTH * laps) {
      if (stage < THEMES.length - 1) {
        stage++;
        stageDist = 0;
        lap = 1;
        health = Math.min(100, health + 35);
        nitro = 100;
        obstacles = [];
        pickups = [];
        pads = [];
        phase = 'transition';
        transition = 2.4;
        A.fx.confetti(150, true);
        A.sfx('win');
        K.banner('CIRCUITO CONCLUÍDO!', 'Próximo: ' + THEMES[stage].name);
      } else {
        finish('CAMPEÃO DO ASFALTO! 🏆');
      }
    }

    hudTick += dt;
    if (hudTick > 0.2) {
      hudTick = 0;
      K.setScore(Math.floor(score));
    }
  }

  /* ------------------------------------------------------------------ desenho */
  function drawTree(x, y, variant, theme) {
    const s = 0.7 + variant * 0.35;
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.beginPath();
    g.ellipse(3, 8, 12, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.trunk;
    g.fillRect(-3, 0, 6, 16);
    g.fillStyle = theme.leaf;
    g.beginPath();
    g.arc(0, -8, 14, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.leaf2;
    g.beginPath();
    g.arc(-5, -14, 9, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawBackground() {
    const theme = THEMES[stage];
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, theme.sky1);
    sky.addColorStop(1, theme.sky2);
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    for (let i = 0; i < 18; i++) {
      const y = ((i * 97 + distance * 0.5) % (H + 180)) - 90;
      const side = i % 2 === 0 ? 1 : -1;
      const x = centerAt(y) + side * (ROAD_HALF + 55 + (i % 3) * 18);
      drawTree(x, y, i % 3, theme);
    }
  }

  function drawRoad() {
    const theme = THEMES[stage];
    const steps = 40;

    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const y = i / steps * H;
      const cx = centerAt(y);
      if (i === 0) g.moveTo(cx - ROAD_HALF, y);
      else g.lineTo(cx - ROAD_HALF, y);
    }
    for (let i = steps; i >= 0; i--) {
      const y = i / steps * H;
      g.lineTo(centerAt(y) + ROAD_HALF, y);
    }
    g.closePath();

    const road = g.createLinearGradient(0, 0, W, 0);
    road.addColorStop(0, theme.road2);
    road.addColorStop(0.5, theme.road);
    road.addColorStop(1, theme.road2);
    g.fillStyle = road;
    g.fill();

    /* Zebras laterais (rumble strips). */
    const edgeW = 8;
    for (const side of [-1, 1]) {
      for (let y = -20; y < H; y += 36) {
        const y2 = Math.min(H, y + 18);
        const cx1 = centerAt(y);
        const cx2 = centerAt(y2);
        const off = side * ROAD_HALF;
        g.fillStyle = Math.floor((y + distance * 0.5) / 36) % 2 === 0 ? theme.rumbleA : theme.rumbleB;
        g.beginPath();
        g.moveTo(cx1 + off, y);
        g.lineTo(cx2 + off, y2);
        g.lineTo(cx2 + off + side * edgeW, y2);
        g.lineTo(cx1 + off + side * edgeW, y);
        g.closePath();
        g.fill();
      }
    }

    /* Bordas contínuas. */
    g.strokeStyle = theme.edge;
    g.lineWidth = 4;
    for (const side of [-1, 1]) {
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const y = i / steps * H;
        const x = centerAt(y) + side * ROAD_HALF;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }

    /* Faixas tracejadas. */
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = 4;
    for (const off of [-50, 50]) {
      for (let y = -80 + ((distance * 0.9) % 90); y < H; y += 90) {
        const y2 = y + 46;
        g.beginPath();
        g.moveTo(centerAt(y) + off, y);
        g.lineTo(centerAt(y2) + off, y2);
        g.stroke();
      }
    }
  }

  /* Faixa xadrez de chegada: aparece no asfalto quando falta pouco para
     completar a volta ou o circuito. */
  function drawFinishLine() {
    const lapRemaining = LAP_LENGTH - (stageDist % LAP_LENGTH);
    const raceRemaining = LAP_LENGTH * laps - stageDist;
    const remaining = Math.min(lapRemaining, raceRemaining);
    if (remaining < 0 || remaining > 560) return;

    const y = A.clamp(PLAYER_Y - remaining * 0.95, 46, H - 26);
    const cx = centerAt(y);
    K.checker(cx - ROAD_HALF, y - 13, ROAD_HALF * 2, 26, 13);

    g.fillStyle = 'rgba(5,8,18,.68)';
    g.beginPath();
    g.roundRect(cx - 44, y - 40, 88, 20, 7);
    g.fill();
    T('CHEGADA', cx, y - 30, 10, '#fff');
  }

  function drawPad(p) {
    const x = centerAt(p.y) + p.off;
    const pulse = 0.6 + 0.4 * Math.sin(p.phase);
    g.save();
    g.translate(x, p.y);
    g.fillStyle = 'rgba(255,210,63,' + (0.16 + 0.12 * pulse) + ')';
    g.beginPath();
    g.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 10);
    g.fill();
    g.fillStyle = 'rgba(255,210,63,' + (0.55 + 0.35 * pulse) + ')';
    for (let i = 0; i < 3; i++) {
      const yy = -18 + i * 18;
      g.beginPath();
      g.moveTo(-16, yy + 10);
      g.lineTo(0, yy);
      g.lineTo(16, yy + 10);
      g.lineTo(16, yy + 18);
      g.lineTo(0, yy + 8);
      g.lineTo(-16, yy + 18);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  function drawCar(o) {
    const x = centerAt(o.y) + o.off;
    const w = o.w;
    const h = o.h;

    g.fillStyle = 'rgba(0,0,0,.3)';
    g.beginPath();
    g.roundRect(x - w / 2 + 3, o.y - h / 2 + 6, w, h, 12);
    g.fill();

    g.fillStyle = o.color;
    g.beginPath();
    g.roundRect(x - w / 2, o.y - h / 2, w, h, 12);
    g.fill();

    g.fillStyle = 'rgba(190,230,255,.72)';
    if (o.truck) {
      g.beginPath();
      g.roundRect(x - w / 2 + 7, o.y - h / 2 + 12, w - 14, h - 30, 7);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.fillRect(x - w / 2 + 7, o.y + h / 2 - 20, w - 14, 10);
    } else {
      g.beginPath();
      g.roundRect(x - w / 2 + 8, o.y - h / 2 + 12, w - 16, h * 0.32, 6);
      g.fill();
      g.beginPath();
      g.roundRect(x - w / 2 + 8, o.y + h * 0.16, w - 16, h * 0.2, 6);
      g.fill();
    }

    g.fillStyle = 'rgba(255,70,90,.92)';
    g.fillRect(x - w / 2 + 5, o.y + h / 2 - 8, 9, 4);
    g.fillRect(x + w / 2 - 14, o.y + h / 2 - 8, 9, 4);
    g.fillStyle = 'rgba(255,240,180,.9)';
    g.fillRect(x - w / 2 + 6, o.y - h / 2 + 3, 8, 3);
    g.fillRect(x + w / 2 - 14, o.y - h / 2 + 3, 8, 3);
  }

  function drawPickup(p) {
    const x = centerAt(p.y) + p.off;
    const isNitro = p.kind === 'nitro';
    g.save();
    g.translate(x, p.y);
    g.fillStyle = isNitro ? 'rgba(0,224,184,.18)' : 'rgba(61,220,132,.18)';
    g.beginPath();
    g.arc(0, 0, 18, 0, Math.PI * 2);
    g.fill();
    g.rotate(p.spin);
    g.fillStyle = isNitro ? '#00e0b8' : '#3ddc84';
    g.beginPath();
    g.roundRect(-7, -11, 14, 22, 5);
    g.fill();
    g.fillStyle = '#063c34';
    g.font = '900 11px Outfit,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(isNitro ? 'N' : '+', 0, 1);
    g.restore();
  }

  function drawParts() {
    for (const p of parts) {
      const alpha = Math.max(0, Math.min(1, p.life / p.max));
      g.globalAlpha = alpha;
      g.fillStyle = p.c;
      g.beginPath();
      g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  function drawBike() {
    g.save();
    g.translate(bike.x, PLAYER_Y);
    g.rotate(bike.lean);

    g.fillStyle = 'rgba(0,0,0,.32)';
    g.beginPath();
    g.ellipse(4, 20, 20, 10, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#0a0b12';
    g.beginPath();
    g.ellipse(0, -22, 6, 15, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(0, 22, 7, 16, 0, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = 'rgba(255,255,255,.18)';
    g.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const off = ((bike.wheel * 0.5 + i * 8) % 24) - 12;
      g.beginPath();
      g.moveTo(-5, -22 + off);
      g.lineTo(5, -22 + off);
      g.stroke();
      g.beginPath();
      g.moveTo(-6, 22 + off);
      g.lineTo(6, 22 + off);
      g.stroke();
    }

    const body = g.createLinearGradient(-10, 0, 10, 0);
    body.addColorStop(0, '#007a63');
    body.addColorStop(0.4, '#00e0b8');
    body.addColorStop(1, '#008b72');
    g.fillStyle = body;
    g.beginPath();
    g.roundRect(-10, -14, 20, 40, 9);
    g.fill();

    g.fillStyle = '#ff4d6d';
    g.beginPath();
    g.roundRect(-7, -24, 14, 14, 6);
    g.fill();

    g.fillStyle = '#1a1d2b';
    g.beginPath();
    g.ellipse(0, -8, 8, 11, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f2c48d';
    g.beginPath();
    g.arc(0, -16, 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a1d2b';
    g.beginPath();
    g.arc(0, -18, 7, Math.PI, Math.PI * 2);
    g.fill();
    g.fillStyle = '#00e0b8';
    g.beginPath();
    g.roundRect(-5, -18, 10, 4, 2);
    g.fill();

    g.strokeStyle = '#d8dbf2';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-9, -20);
    g.lineTo(9, -20);
    g.stroke();

    if (bike.boost) {
      const flick = 6 + Math.random() * 14;
      g.fillStyle = 'rgba(0,224,184,.85)';
      g.beginPath();
      g.moveTo(-5, 24);
      g.lineTo(0, 26 + flick);
      g.lineTo(5, 24);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)';
      g.beginPath();
      g.moveTo(-2, 24);
      g.lineTo(0, 24 + flick * 0.55);
      g.lineTo(2, 24);
      g.closePath();
      g.fill();
    }

    g.restore();
  }

  function drawSpeedLines() {
    const intensity = A.clamp((bike.speed - 300) / 420, 0, 1);
    if (intensity <= 0) return;
    g.strokeStyle = 'rgba(255,255,255,' + (0.06 + 0.18 * intensity) + ')';
    g.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const y = ((i * 53 + distance * 1.8) % (H + 100)) - 50;
      const side = i % 2 === 0 ? 1 : -1;
      const x = centerAt(y) + side * (ROAD_HALF - 16);
      const len = 30 + intensity * 80;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + len);
      g.stroke();
    }
  }

  function drawTexts() {
    for (const t of texts) {
      g.globalAlpha = Math.max(0, t.life / t.max);
      T(t.text, t.x, t.y, 14, t.color);
    }
    g.globalAlpha = 1;
  }

  function drawBar(x, y, w, h, pct, color) {
    g.fillStyle = 'rgba(255,255,255,.14)';
    g.beginPath();
    g.roundRect(x, y, w, h, h / 2);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(x, y, Math.max(0, Math.min(1, pct)) * w, h, h / 2);
    g.fill();
  }

  function drawHud() {
    g.fillStyle = 'rgba(5,8,18,.74)';
    g.beginPath();
    g.roundRect(12, 12, 168, 88, 14);
    g.fill();

    T('VELOCIDADE', 26, 28, 9, '#9aa0c8', 'left');
    T(Math.round(bike.speed) + ' km/h', 26, 50, 22, '#fff', 'left');
    T('VOLTA ' + lap + '/' + laps, 26, 72, 12, '#ffd23f', 'left');
    T('CIRCUITO ' + (stage + 1) + '/3', 26, 89, 10, '#9aa0c8', 'left');

    g.fillStyle = 'rgba(5,8,18,.74)';
    g.beginPath();
    g.roundRect(W - 190, 12, 178, 88, 14);
    g.fill();

    T('SAÚDE', W - 176, 28, 9, '#9aa0c8', 'left');
    drawBar(W - 176, 36, 150, 9, health / 100, health > 40 ? '#3ddc84' : '#ff4d6d');
    T('NITRO', W - 176, 57, 9, '#9aa0c8', 'left');
    drawBar(W - 176, 65, 150, 8, nitro / 100, '#00e0b8');
    T('COMBO ×' + combo, W - 176, 87, 11, combo > 1 ? '#ffd23f' : '#9aa0c8', 'left');

    g.fillStyle = 'rgba(5,8,18,.62)';
    g.beginPath();
    g.roundRect(W / 2 - 58, 12, 116, 30, 10);
    g.fill();
    T(Math.floor(score) + ' pts', W / 2, 27, 13, '#fff');

    if (distance < 900 && phase === 'race') {
      T('← → desviam · ↑ acelera · Espaço nitro', W / 2, H - 18, 11, 'rgba(255,255,255,.72)');
    }
  }

  function drawCountdown() {
    if (phase !== 'countdown') return;
    g.fillStyle = 'rgba(4,6,15,.5)';
    g.fillRect(0, 0, W, H);

    const label = countdown > 0 ? String(Math.min(3, Math.ceil(countdown))) : 'GO!';
    const pulse = 1 + (1 - Math.abs((countdown % 1) - 0.5) * 2) * 0.12;

    g.save();
    g.translate(W / 2, H * 0.4);
    g.scale(pulse, pulse);
    g.font = '900 92px Outfit,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = countdown > 0 ? '#7c5cff' : '#00e0b8';
    g.shadowBlur = 40;
    g.fillStyle = '#fff';
    g.fillText(label, 0, 0);
    g.shadowBlur = 0;
    g.restore();

    T('CIRCUITO ' + (stage + 1) + ' · ' + THEMES[stage].name, W / 2, H * 0.4 + 84, 14, '#ffd23f');
  }

  function draw() {
    g.save();
    if (cam > 0.3) g.translate(A.rf(-cam, cam), A.rf(-cam, cam));

    drawBackground();
    drawRoad();
    drawFinishLine();
    for (const p of pads) drawPad(p);
    for (const o of obstacles) drawCar(o);
    for (const p of pickups) drawPickup(p);
    drawParts();
    drawBike();
    drawSpeedLines();

    g.restore();

    drawTexts();
    if (phase === 'countdown') drawCountdown();
    drawHud();

    if (flash > 0) {
      g.fillStyle = 'rgba(255,255,255,' + Math.min(0.4, flash) + ')';
      g.fillRect(0, 0, W, H);
    }
    if (hurt > 0) {
      g.fillStyle = 'rgba(255,77,109,' + (hurt * 0.18) + ')';
      g.fillRect(0, 0, W, H);
    }
  }

  K.pad('lr a');
  K.swipe();
  K.setScore(0);
  K.banner('CIRCUITO 1', THEMES[0].name);

  K.loop(dt => {
    update(dt);
    draw();
  });
});
})();
