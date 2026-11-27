/* =============================================================================
   ARCADIA - REFLEXOS
   -----------------------------------------------------------------------------
   Jogos rapidos, baseados em tempo de reacao e coordenacao. Muitos usam
   K.every para o cronometro e K.after para pequenas reacoes em sequencia.

   Jogos: Acerte a Toupeira, Teste de Cliques, Tempo de Reacao, Treino de
   Mira, Cor da Palavra, Estoura Baloes, Genius, Piano Tiles, Memoria Numerica,
   Tabela Relampago e Biscoito Clicker.
   ============================================================================= */
(function () {
const A = Arcadia;

/* Arena compartilhada do Lote 3B: cabeçalho, estatísticas, corpo e rodapé. */
const arena = (K, opts) => {
  const wrap = A.el('div', 'arena arena--reflex ' + (opts.cls || ''), '', K.root);
  const head = A.el('div', 'arena-head', '', wrap);
  A.el('div', 'arena-ico', opts.icon || '⚡', head);
  const title = A.el('div', 'arena-title', '', head);
  A.el('b', '', opts.title || '', title);
  A.el('small', '', opts.sub || '', title);
  const stats = A.el('div', 'arena-stats', '', head);
  const body = A.el('div', 'arena-body', '', wrap);
  const foot = A.el('div', 'arena-foot', '', wrap);
  A.el('div', 'arena-brand', '<img src="images/gpweb.png" alt=""> GPWeb', wrap);
  return { wrap, head, title, stats, body, foot };
};

const stat = (parent, label, icon) => {
  const box = A.el('div', 'arena-stat', '', parent);
  A.el('small', '', (icon ? icon + ' ' : '') + label, box);
  return A.el('b', '', '0', box);
};

const meter = (parent, cls) => {
  const box = A.el('div', 'meter' + (cls ? ' ' + cls : ''), '<i></i>', parent);
  return box.firstChild;
};

const setMeter = (bar, ratio) => {
  bar.style.width = Math.max(0, Math.min(1, ratio)) * 100 + '%';
};

const mountCanvas = (K, body, w, h) => {
  K.canvas(w, h);
  body.appendChild(K.cv);
  const fit = () => {
    const maxW = Math.max(200, Math.min(body.clientWidth, w));
    K.cv.style.width = maxW + 'px';
    K.cv.style.height = (maxW * h / w) + 'px';
  };
  fit();
  K.on(window, 'resize', fit);
  return K.cv;
};

// Acerte a Toupeira: 30 segundos, toupeiras valem pontos e bombas tiram pontos.
A.register('whackmole', K => {
  const ui = arena(K, {
    icon: '🐹',
    title: 'Acerte a Toupeira',
    sub: '30 segundos · toupeira +10 · bomba −5'
  });
  const sTime = stat(ui.stats, 'Tempo', '⏱');
  const sScore = stat(ui.stats, 'Pontos', '🏆');
  const bar = meter(ui.body);
  const grid = A.el('div', 'wm-grid', '', ui.body);
  const hint = A.el('p', 'arena-hint', 'Toque nas toupeiras e fuja das bombas.', ui.body);

  const mole = Array(9).fill(0);
  const holes = mole.map((_, i) => {
    const b = A.el('button', 'wm-hole', '<span></span>', grid);
    b.type = 'button';
    b.onclick = () => {
      if (!mole[i]) return;
      if (mole[i] === 2) {
        K.addScore(-5);
        A.sfx('hit');
        A.fx.shake(K.root, 240);
        hint.textContent = '💣 Bomba! −5 pontos.';
      } else {
        K.addScore(10);
        A.sfx('pop');
        hint.textContent = '🐹 Boa! +10 pontos.';
      }
      sScore.textContent = K.score;
      mole[i] = 0;
      draw();
    };
    return b;
  });

  const draw = () => holes.forEach((b, i) => {
    const v = mole[i];
    b.classList.toggle('up', !!v);
    b.classList.toggle('mole', v === 1);
    b.classList.toggle('bomb', v === 2);
    b.firstChild.textContent = v === 1 ? '🐹' : v === 2 ? '💣' : '';
  });

  let t = 30;
  const pop = () => {
    const free = mole.map((v, i) => v ? -1 : i).filter(i => i >= 0);
    if (free.length) {
      const i = A.pick(free);
      mole[i] = Math.random() < .16 ? 2 : 1;
      draw();
      K.after(() => {
        mole[i] = 0;
        draw();
      }, Math.max(360, A.rand(620, 980) - (30 - t) * 10));
    }
    K.after(pop, Math.max(240, A.rand(320, 620) - (30 - t) * 7));
  };

  sTime.textContent = '30s';
  sScore.textContent = '0';
  setMeter(bar, 1);
  draw();
  pop();

  K.every(() => {
    t--;
    sTime.textContent = t + 's';
    setMeter(bar, t / 30);
    if (t <= 0) K.over('Tempo! 🐹');
  }, 1000);
});

// Teste de Cliques: conta cliques durante 10 segundos e mostra cliques por segundo.
A.register('cps', K => {
  K.fmt = n => n + ' cliques';
  const ui = arena(K, {
    icon: '🖱️',
    title: 'Teste de Cliques',
    sub: 'Clique o mais rápido que puder em 10 segundos'
  });
  const sTime = stat(ui.stats, 'Tempo', '⏱');
  const sClicks = stat(ui.stats, 'Cliques', '👆');
  const sCps = stat(ui.stats, 'CPS', '⚡');
  const bar = meter(ui.body);
  const stage = A.el('div', 'cps-stage', '', ui.body);
  const btn = A.el('button', 'cps-btn', 'CLIQUE!<small>TOQUE RÁPIDO</small>', stage);
  btn.type = 'button';
  const hint = A.el('p', 'arena-hint', 'O cronômetro começa no primeiro clique.', ui.body);

  let n = 0, t = 10, on = false;
  const upd = () => {
    sTime.textContent = t + 's';
    sClicks.textContent = n;
    sCps.textContent = on ? (n / Math.max(1, 10 - t)).toFixed(1) : '0.0';
  };

  btn.onpointerdown = e => {
    if (K.dead) return;
    if (!on) {
      on = true;
      hint.textContent = 'Vai! Clique sem parar.';
      K.every(() => {
        t--;
        upd();
        setMeter(bar, t / 10);
        if (t <= 0) K.over((n / 10).toFixed(1) + ' cliques por segundo');
      }, 1000);
    }
    n++;
    K.setScore(n);
    upd();
    A.sfx('click');

    const ripple = A.el('span', 'cps-ripple', '', stage);
    const pr = stage.getBoundingClientRect();
    ripple.style.left = (e.clientX - pr.left - 10) + 'px';
    ripple.style.top = (e.clientY - pr.top - 10) + 'px';
    K.after(() => ripple.remove(), 600);

    btn.style.transform = 'scale(.94)';
  };
  const release = () => { btn.style.transform = ''; };
  btn.onpointerup = release;
  btn.onpointerleave = release;
  btn.onpointercancel = release;

  setMeter(bar, 1);
  upd();
});

// Tempo de Reacao: cinco rodadas esperando o verde para medir os milissegundos.
A.register('reaction', K => {
  K.low = true;
  K.fmt = n => n + ' ms';
  const ui = arena(K, {
    icon: '🚦',
    title: 'Tempo de Reação',
    sub: 'Espere o verde e clique o mais rápido possível'
  });
  const sRound = stat(ui.stats, 'Rodada', '🎯');
  const sLast = stat(ui.stats, 'Último', '⏱');
  const sAvg = stat(ui.stats, 'Média', '📊');
  const stage = A.el('button', 'reaction-stage', 'Clique para começar<small>5 rodadas</small>', ui.body);
  stage.type = 'button';
  const chips = A.el('div', 'reaction-chips', '', ui.body);
  A.el('p', 'arena-hint', 'Clique antes do verde e a rodada reinicia.', ui.body);

  const rounds = [];
  let state = 'idle', timer = 0, t0 = 0;
  const setState = (s, html) => {
    state = s;
    stage.className = 'reaction-stage ' + s;
    stage.innerHTML = html;
  };
  const start = () => {
    setState('wait', 'Espere o verde…<small>Não clique ainda</small>');
    timer = K.after(() => {
      setState('go', 'CLIQUE!<small>Agora!</small>');
      t0 = performance.now();
    }, A.rand(1500, 4500));
  };

  stage.onpointerdown = () => {
    if (state === 'wait') {
      clearTimeout(timer);
      setState('early', 'Cedo demais!<small>Clique para tentar de novo</small>');
      A.sfx('hit');
    } else if (state === 'go') {
      const ms = Math.round(performance.now() - t0);
      rounds.push(ms);
      const avg = Math.round(rounds.reduce((a, b) => a + b, 0) / rounds.length);
      K.setScore(avg);
      sLast.textContent = ms + ' ms';
      sAvg.textContent = avg + ' ms';
      sRound.textContent = Math.min(5, rounds.length) + '/5';
      chips.innerHTML = '';
      rounds.forEach(r => A.el('span', 'reaction-chip', r + ' ms', chips));
      A.sfx('coin');
      if (rounds.length >= 5) return K.over('Média: ' + avg + ' ms', avg);
      setState('res', ms + ' ms<small>Clique para a próxima rodada</small>');
    } else {
      start();
    }
  };

  sRound.textContent = '0/5';
  sLast.textContent = '–';
  sAvg.textContent = '–';
});

// Treino de Mira: alvos encolhem e desaparecem; clique rapido para pontuar.
A.register('aim', K => {
  const ui = arena(K, {
    icon: '🎯',
    title: 'Treino de Mira',
    sub: 'Acerte os alvos que encolhem · 30 segundos'
  });
  const sTime = stat(ui.stats, 'Tempo', '⏱');
  const sScore = stat(ui.stats, 'Pontos', '🏆');
  const sAcc = stat(ui.stats, 'Precisão', '🎯');

  mountCanvas(K, ui.body, 640, 400);
  const { g, T } = K;

  let tg = null, t = 30, hits = 0, shots = 0;
  const spawn = () => {
    tg = { x: A.rand(60, 580), y: A.rand(70, 340), r: 34, life: 1.3, max: 1.3 };
  };
  spawn();

  K.on(K.cv, 'pointerdown', e => {
    const p = K.pos(e);
    shots++;
    if (tg && Math.hypot(p.x - tg.x, p.y - tg.y) < tg.r) {
      hits++;
      K.addScore(10 + Math.round(tg.life / tg.max * 10));
      K.burst(tg.x, tg.y, '#ff4d6d', 16, 4);
      A.sfx('pop');
      spawn();
    } else {
      K.addScore(-2);
      K.burst(p.x, p.y, '#9aa0c8', 6, 2);
      A.sfx('hit');
    }
    sScore.textContent = K.score;
    sAcc.textContent = Math.round(hits / Math.max(1, shots) * 100) + '%';
  });

  K.every(() => {
    t--;
    sTime.textContent = t + 's';
    if (t <= 0) K.over('Tempo! 🎯');
  }, 1000);

  K.loop(dt => {
    tg.life -= dt;
    tg.r = 10 + 24 * Math.max(0, tg.life / tg.max);
    if (tg.life <= 0) spawn();

    const bg = g.createLinearGradient(0, 0, 0, 400);
    bg.addColorStop(0, '#0e1530');
    bg.addColorStop(1, '#1a2447');
    g.fillStyle = bg;
    g.fillRect(0, 0, 640, 400);

    g.strokeStyle = 'rgba(255,255,255,.045)';
    g.lineWidth = 1;
    for (let x = 0; x <= 640; x += 40) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 400); g.stroke();
    }
    for (let y = 0; y <= 400; y += 40) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(640, y); g.stroke();
    }

    K.C(tg.x, tg.y, tg.r + 10, 'rgba(255,77,109,.18)');
    K.C(tg.x, tg.y, tg.r, '#ff4d6d');
    K.C(tg.x, tg.y, tg.r * .66, '#fff');
    K.C(tg.x, tg.y, tg.r * .3, '#ff4d6d');

    g.strokeStyle = 'rgba(255,255,255,.35)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(tg.x - tg.r - 8, tg.y); g.lineTo(tg.x - tg.r + 4, tg.y);
    g.moveTo(tg.x + tg.r - 4, tg.y); g.lineTo(tg.x + tg.r + 8, tg.y);
    g.moveTo(tg.x, tg.y - tg.r - 8); g.lineTo(tg.x, tg.y - tg.r + 4);
    g.moveTo(tg.x, tg.y + tg.r - 4); g.lineTo(tg.x, tg.y + tg.r + 8);
    g.stroke();

    T('⏱ ' + t, 18, 22, 18, '#cfd4ff', 'left');
    T('🏆 ' + K.score, 622, 22, 18, '#ffd23f', 'right');
  });

  sTime.textContent = '30s';
  sScore.textContent = '0';
  sAcc.textContent = '0%';
});

// Cor da Palavra: escolha a cor da tinta, ignorando o texto escrito.
A.register('stroop', K => {
  const C = [
    ['VERMELHO', '#ff4d6d'],
    ['AZUL', '#4c7dff'],
    ['VERDE', '#3ddc84'],
    ['AMARELO', '#ffd23f'],
    ['ROXO', '#b05cff'],
    ['LARANJA', '#ff9f43']
  ];
  const ui = arena(K, {
    icon: '🎨',
    title: 'Cor da Palavra',
    sub: 'Toque na COR da tinta, não no que está escrito'
  });
  const sTime = stat(ui.stats, 'Tempo', '⏱');
  const sStreak = stat(ui.stats, 'Sequência', '🔥');
  const sScore = stat(ui.stats, 'Pontos', '🏆');
  const bar = meter(ui.body);
  const word = A.el('div', 'stroop-word', '', ui.body);
  const grid = A.el('div', 'stroop-grid', '', ui.body);
  const hint = A.el('p', 'arena-hint', 'A tinta pode dizer uma coisa e ser outra. Confie na cor.', ui.body);

  let t = 30, ink = C[0], streak = 0;
  const next = () => {
    const a = A.pick(C);
    let b;
    do b = A.pick(C); while (b === a);
    ink = b;
    word.textContent = a[0];
    word.style.color = b[1];
    word.classList.remove('pop');
    void word.offsetWidth;
    word.classList.add('pop');
  };

  C.forEach(c => {
    const b = A.el('button', 'stroop-btn', '', grid);
    b.type = 'button';
    const sw = A.el('span', 'stroop-swatch', '', b);
    sw.style.background = c[1];
    sw.style.color = c[1];
    A.el('span', '', c[0], b);
    b.onclick = () => {
      if (c === ink) {
        streak++;
        K.addScore(10 + Math.min(streak, 5));
        A.sfx('coin');
        hint.textContent = '🎨 Certo! Sequência de ' + streak + '.';
      } else {
        streak = 0;
        t = Math.max(0, t - 3);
        A.sfx('hit');
        K.shake(220);
        hint.textContent = 'Errou! −3 segundos.';
      }
      sTime.textContent = t + 's';
      sStreak.textContent = streak;
      sScore.textContent = K.score;
      setMeter(bar, t / 30);
      next();
    };
  });

  sTime.textContent = '30s';
  setMeter(bar, 1);
  next();

  K.every(() => {
    t--;
    sTime.textContent = t + 's';
    setMeter(bar, t / 30);
    if (t <= 0) K.over('Tempo! 🎨');
  }, 1000);
});

// Estoura Baloes: baloes sobem; deixe tres escaparem e o jogo acaba.
A.register('balloons', K => {
  const ui = arena(K, {
    icon: '🎈',
    title: 'Estoura Balões',
    sub: 'Não deixe três balões escaparem'
  });
  const sLives = stat(ui.stats, 'Vidas', '❤️');
  const sScore = stat(ui.stats, 'Pontos', '🏆');

  mountCanvas(K, ui.body, 480, 560);
  const { g, T } = K;

  let bl = [], t = 0, lives = 3;

  K.on(K.cv, 'pointerdown', e => {
    const p = K.pos(e);
    for (let i = bl.length - 1; i >= 0; i--) {
      const b = bl[i];
      if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 6) {
        K.addScore(b.r < 26 ? 20 : 10);
        K.burst(b.x, b.y, `hsl(${b.h},85%,62%)`, 16, 4);
        A.sfx('pop');
        bl.splice(i, 1);
        sScore.textContent = K.score;
        return;
      }
    }
  });

  const updLives = () => {
    sLives.textContent = '♥'.repeat(Math.max(0, lives));
    sLives.style.color = lives <= 1 ? '#ff6b8a' : '#3ddc84';
  };
  updLives();

  K.loop(() => {
    if (--t <= 0) {
      bl.push({
        x: A.rand(40, 440),
        y: 600,
        r: A.rand(20, 40),
        v: A.rf(1.4, 2.6) + K.score / 600,
        h: A.rand(0, 360)
      });
      t = Math.max(18, 55 - K.score / 15);
    }

    bl.forEach(b => {
      b.y -= b.v;
      b.x += Math.sin(b.y / 30) * .6;
    });
    bl = bl.filter(b => {
      if (b.y < -50) {
        lives--;
        updLives();
        A.sfx('lose');
        return false;
      }
      return true;
    });
    if (lives <= 0) return K.over('Os balões escaparam! 🎈');

    const sky = g.createLinearGradient(0, 0, 0, 560);
    sky.addColorStop(0, '#6ec6ff');
    sky.addColorStop(.55, '#9fd9ff');
    sky.addColorStop(1, '#e6f6ff');
    g.fillStyle = sky;
    g.fillRect(0, 0, 480, 560);

    g.fillStyle = 'rgba(255,255,255,.45)';
    g.beginPath(); g.ellipse(90, 90, 54, 20, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(130, 78, 40, 16, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(390, 150, 60, 22, 0, 0, 7); g.fill();

    bl.forEach(b => {
      g.strokeStyle = 'rgba(0,0,0,.22)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(b.x, b.y + b.r);
      g.quadraticCurveTo(b.x + Math.sin(b.y / 20) * 10, b.y + b.r + 22, b.x + Math.sin(b.y / 20) * 6, b.y + b.r + 42);
      g.stroke();

      const grad = g.createRadialGradient(b.x - b.r * .3, b.y - b.r * .35, b.r * .1, b.x, b.y, b.r);
      grad.addColorStop(0, `hsl(${b.h},95%,82%)`);
      grad.addColorStop(.55, `hsl(${b.h},85%,58%)`);
      grad.addColorStop(1, `hsl(${b.h},75%,42%)`);
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(b.x, b.y, b.r * .85, b.r, 0, 0, 7);
      g.fill();
      K.C(b.x - b.r * .3, b.y - b.r * .35, b.r * .14, 'rgba(255,255,255,.65)');
    });

    T('♥'.repeat(Math.max(0, lives)), 24, 28, 24, '#e0245e', 'left');
    T(String(K.score), 456, 28, 24, '#0b1020', 'right');
  });
});

// Genius: repita a sequencia de cores, que cresce a cada rodada.
A.register('simon', K => {
  const C = ['#3ddc84', '#ff4d6d', '#ffd23f', '#4c7dff'];
  const ui = arena(K, {
    icon: '🟢',
    title: 'Genius',
    sub: 'Observe a sequência e repita na ordem'
  });
  const sRound = stat(ui.stats, 'Rodada', '🔁');
  const sSeq = stat(ui.stats, 'Sequência', '🎵');
  const sScore = stat(ui.stats, 'Pontos', '🏆');
  const grid = A.el('div', 'simon-grid', '', ui.body);
  const seqBox = A.el('div', 'simon-seq', '', ui.body);
  const hint = A.el('p', 'arena-hint', 'Observe…', ui.body);

  const seq = [];
  let pos = 0, busy = true;

  const pads = C.map((c, i) => {
    const b = A.el('button', 'simon-pad', '', grid);
    b.type = 'button';
    b.style.setProperty('--c', c);
    b.onclick = () => press(i);
    return b;
  });

  const flash = i => {
    pads[i].classList.add('on');
    A.sfx('pop');
    K.after(() => pads[i].classList.remove('on'), 320);
  };

  const play = () => {
    busy = true;
    pos = 0;
    hint.textContent = 'Observe…';
    seqBox.innerHTML = '';
    seq.forEach((s, k) => K.after(() => {
      flash(s);
      const dot = A.el('span', 'simon-dot', '', seqBox);
      dot.style.background = C[s];
    }, 700 + k * 650));
    K.after(() => {
      busy = false;
      hint.textContent = 'Sua vez! Repita a sequência.';
    }, 700 + seq.length * 650);
    sRound.textContent = seq.length;
  };

  const add = () => {
    seq.push(A.rand(0, 3));
    sSeq.textContent = seq.length;
    if (seq.length % 5 === 0) A.fx.confetti(60, true);
    play();
  };

  const press = i => {
    if (busy) return;
    flash(i);
    if (i !== seq[pos]) return K.over('Errou na rodada ' + seq.length);
    if (++pos === seq.length) {
      K.setScore(seq.length);
      sScore.textContent = K.score;
      busy = true;
      hint.textContent = 'Boa! Próxima sequência…';
      K.after(add, 900);
    }
  };

  sSeq.textContent = '0';
  sScore.textContent = '0';
  K.after(add, 600);
});

// Piano Tiles: toque nos tiles pretos na ordem certa; a velocidade aumenta.
A.register('piano', K => {
  const ui = arena(K, {
    icon: '🎹',
    title: 'Piano Tiles',
    sub: 'Toque só nos tiles pretos · a velocidade aumenta'
  });
  const sScore = stat(ui.stats, 'Pontos', '🎵');
  const sSpeed = stat(ui.stats, 'Velocidade', '⚡');

  mountCanvas(K, ui.body, 360, 560);
  const { g, T } = K;

  const TH = 140;
  let rows = [], sp = 4, started = false;
  const rr = (x, y, w, h, r, fill) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };

  for (let i = 0; i < 5; i++) {
    rows.push({ y: 560 - TH * (i + 2), c: A.rand(0, 3), hit: 0 });
  }

  const tap = (c, y) => {
    started = true;
    const r = rows.find(r => !r.hit && r.c === c && y >= r.y && y <= r.y + TH);
    if (r) {
      r.hit = 1;
      K.addScore(1);
      sp = Math.min(13, sp + .12);
      K.burst(c * 90 + 45, r.y + TH / 2, '#ff4d6d', 10, 3);
      A.sfx('click');
      sScore.textContent = K.score;
      sSpeed.textContent = sp.toFixed(1);
    } else {
      K.over('Tile errado!');
    }
  };

  K.on(K.cv, 'pointerdown', e => {
    const p = K.pos(e);
    tap(Math.floor(p.x / 90), p.y);
  });
  K.onKey(c => {
    const m = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 }[c];
    if (m != null) {
      const r = rows.filter(r => !r.hit).sort((a, b) => b.y - a.y)[0];
      if (r) tap(m, r.y + 1);
    }
  });

  sScore.textContent = '0';
  sSpeed.textContent = sp.toFixed(1);

  K.loop(() => {
    if (started) rows.forEach(r => r.y += sp);
    const top = Math.min(...rows.map(r => r.y));
    if (top > 0) rows.push({ y: top - TH, c: A.rand(0, 3), hit: 0 });
    if (rows.some(r => !r.hit && r.y > 560)) return K.over('Perdeu um tile!');
    rows = rows.filter(r => r.y < 700);

    const bg = g.createLinearGradient(0, 0, 0, 560);
    bg.addColorStop(0, '#0b1020');
    bg.addColorStop(1, '#171f3d');
    g.fillStyle = bg;
    g.fillRect(0, 0, 360, 560);

    for (let i = 1; i < 4; i++) {
      g.fillStyle = 'rgba(255,255,255,.06)';
      g.fillRect(i * 90 - 1, 0, 2, 560);
    }

    rows.forEach(r => {
      if (r.hit) {
        rr(r.c * 90 + 3, r.y + 3, 84, TH - 6, 12, 'rgba(255,255,255,.08)');
        return;
      }
      g.save();
      g.shadowColor = 'rgba(255,77,109,.55)';
      g.shadowBlur = 18;
      const grad = g.createLinearGradient(0, r.y, 0, r.y + TH);
      grad.addColorStop(0, '#ff5c7a');
      grad.addColorStop(.5, '#d61f45');
      grad.addColorStop(1, '#7c0f27');
      rr(r.c * 90 + 3, r.y + 3, 84, TH - 6, 12, grad);
      g.restore();
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.fillRect(r.c * 90 + 12, r.y + 12, 66, 4);
    });

    T(String(K.score), 180, 42, 36, '#ffd23f');
    T(sp.toFixed(1) + 'x', 344, 30, 16, '#9aa0c8', 'right');
    if (!started) T('Toque no primeiro tile', 180, 300, 18, '#9aa0c8');
  });
});

// Memoria Numerica: memorize a sequencia e digite; fica maior a cada nivel.
A.register('numbermem', K => {
  const ui = arena(K, {
    icon: '🧠',
    title: 'Memória Numérica',
    sub: 'Memorize o número e digite de volta'
  });
  const sLevel = stat(ui.stats, 'Nível', '📈');
  const sScore = stat(ui.stats, 'Pontos', '🏆');
  const disp = A.el('div', 'mem-display', '', ui.body);
  const inp = A.el('input', 'mind-input', '', ui.body);
  inp.inputMode = 'numeric';
  inp.placeholder = 'Digite o número';
  inp.autocomplete = 'off';
  inp.disabled = true;
  const btn = A.el('button', 'arena-btn pri', 'Confirmar', ui.foot);
  const hint = A.el('p', 'arena-hint', 'Prepare-se…', ui.body);

  let lvl = 1, n = '';

  const round = () => {
    n = Array.from({ length: lvl + 2 }, () => A.rand(0, 9)).join('');
    disp.textContent = n;
    disp.classList.remove('hidden');
    inp.value = '';
    inp.disabled = true;
    btn.disabled = true;
    hint.textContent = 'Memorize! Nível ' + lvl;
    sLevel.textContent = lvl;
    K.after(() => {
      disp.textContent = '❓';
      disp.classList.add('hidden');
      hint.textContent = 'Digite o número que apareceu.';
      inp.disabled = false;
      btn.disabled = false;
      inp.focus();
    }, 900 + lvl * 450);
  };

  const go = () => {
    if (inp.value.trim() === n) {
      K.setScore(lvl);
      sScore.textContent = K.score;
      lvl++;
      A.sfx('coin');
      K.banner('NÍVEL ' + lvl, 'Sequência maior');
      if (lvl % 3 === 0) A.fx.confetti(70, true);
      round();
    } else {
      disp.textContent = n;
      disp.classList.remove('hidden');
      K.over('Era ' + n, lvl - 1);
    }
  };

  btn.onclick = go;
  inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  sLevel.textContent = lvl;
  sScore.textContent = '0';
  round();
});

// Tabela Relampago: clique de 1 a 25 em ordem; o tempo e o criterio de vitoria.
A.register('schulte', K => {
  K.low = true;
  K.fmt = n => (n / 10).toFixed(1) + 's';
  const ui = arena(K, {
    icon: '⏱️',
    title: 'Tabela Relâmpago',
    sub: 'Toque de 1 a 25 em ordem o mais rápido possível'
  });
  const sNext = stat(ui.stats, 'Próximo', '🔢');
  const sTime = stat(ui.stats, 'Tempo', '⏱');
  const bar = meter(ui.body);
  const grid = A.el('div', 'schulte-grid', '', ui.body);

  let nx = 1, t = 0, on = false;

  A.shuffle(Array.from({ length: 25 }, (_, i) => i + 1)).forEach(v => {
    const b = A.el('button', 'schulte-cell', v, grid);
    b.type = 'button';
    b.onclick = () => {
      if (!on) {
        on = true;
        K.every(() => {
          t++;
          K.setScore(t);
          sTime.textContent = (t / 10).toFixed(1) + 's';
        }, 100);
      }
      if (v !== nx) {
        A.sfx('hit');
        K.shake(180);
        return;
      }
      b.classList.add('done');
      b.disabled = true;
      A.sfx('click');
      nx++;
      sNext.textContent = nx > 25 ? '✓' : nx;
      setMeter(bar, (nx - 1) / 25);
      if (nx > 25) {
        A.fx.confetti(120, true);
        K.over('Concluído! ⚡', t);
      }
    };
  });

  sNext.textContent = '1';
  sTime.textContent = '0.0s';
  setMeter(bar, 0);
});

// Biscoito Clicker: clique para ganhar biscoitos, compre upgrades e salve o progresso.
A.register('cookie', K => {
  K.fmt = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n;
  const ui = arena(K, {
    icon: '🍪',
    title: 'Biscoito Clicker',
    sub: 'Clique, compre melhorias e monte seu império'
  });
  const sCookies = stat(ui.stats, 'Biscoitos', '🍪');
  const sCps = stat(ui.stats, 'Por segundo', '⚙️');
  const sTotal = stat(ui.stats, 'Total', '🏆');

  const U = [
    ['👆 Cursor', 15, .2],
    ['👵 Vovó', 100, 1],
    ['🌾 Fazenda', 1100, 8],
    ['⛏ Mina', 12000, 47],
    ['🏭 Fábrica', 130000, 260],
    ['🚀 Foguete', 1400000, 1400]
  ];
  const st = A.store.get('cookie', null) || { c: 0, tot: 0, n: U.map(() => 0), pw: 1 };
  const cost = i => Math.ceil(U[i][1] * Math.pow(1.15, st.n[i]));
  const cps = () => st.n.reduce((s, n, i) => s + n * U[i][2], 0);

  const stage = A.el('div', 'cookie-stage', '', ui.body);
  const ck = A.el('button', 'cookie-btn', '🍪', stage);
  ck.type = 'button';
  const shop = A.el('div', 'cookie-shop', '', ui.body);
  const hint = A.el('p', 'arena-hint', 'Clique no biscoito para começar. O progresso é salvo automaticamente.', ui.body);
  const endBtn = A.el('button', 'arena-btn ghost', 'Encerrar e resgatar', ui.foot);

  const bs = U.map((u, i) => {
    const b = A.el('button', 'cookie-upgrade', '', shop);
    b.type = 'button';
    b.onclick = () => {
      if (st.c >= cost(i)) {
        st.c -= cost(i);
        st.n[i]++;
        A.sfx('coin');
        draw();
      }
    };
    return b;
  });
  const pw = A.el('button', 'cookie-upgrade', '', shop);
  pw.type = 'button';
  pw.onclick = () => {
    const c = 50 * Math.pow(3, st.pw - 1);
    if (st.c >= c) {
      st.c -= c;
      st.pw++;
      A.sfx('win');
      draw();
    }
  };

  const draw = () => {
    sCookies.textContent = K.fmt(Math.floor(st.c));
    sCps.textContent = cps().toFixed(1) + '/s';
    sTotal.textContent = K.fmt(Math.floor(st.tot));
    bs.forEach((b, i) => {
      b.innerHTML = `<b>${U[i][0]}</b><small>${st.n[i]} comprados</small><small>🍪 ${K.fmt(cost(i))}</small>`;
      b.disabled = st.c < cost(i);
    });
    const c = 50 * Math.pow(3, st.pw - 1);
    pw.innerHTML = `<b>💪 Clique forte</b><small>+${st.pw} por clique</small><small>🍪 ${K.fmt(c)}</small>`;
    pw.disabled = st.c < c;
    K.setScore(Math.floor(st.tot));
  };

  ck.onpointerdown = () => {
    st.c += st.pw;
    st.tot += st.pw;
    ck.style.transform = 'scale(.9)';
    A.sfx('click');
    draw();
  };
  const release = () => { ck.style.transform = ''; };
  ck.onpointerup = release;
  ck.onpointerleave = release;
  ck.onpointercancel = release;

  endBtn.onclick = () => K.over('Sessão encerrada · ' + K.fmt(Math.floor(st.tot)) + ' biscoitos', Math.floor(st.tot));

  K.every(() => {
    const gain = cps() / 10;
    st.c += gain;
    st.tot += gain;
    draw();
  }, 100);

  K.every(() => {
    A.store.set('cookie', st);
    K.submit(Math.floor(st.tot));
  }, 3000);

  K.on(window, 'pagehide', () => A.store.set('cookie', st));
  draw();
});
})();
