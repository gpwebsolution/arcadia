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
const fit = (n, max, pad) => Math.max(24, Math.min(max, Math.floor((Math.min(innerWidth, 560) - (pad || 60)) / n)));
const inputCss = 'padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font:700 24px Outfit,sans-serif;text-align:center;outline:0;width:240px';

// Acerte a Toupeira: 30 segundos, toupeiras valem pontos e bombas tiram pontos.
A.register('whackmole', K => {
  const sz = fit(3, 100, 70), mole = Array(9).fill(0); let t = 30;
  const info = A.el('div', 'msg', '⏱ 30s', K.root), box = A.el('div', 'board', null, K.root); box.style.cssText = `grid-template-columns:repeat(3,${sz}px);gap:10px`;
  const cells = mole.map((_, i) => { const c = A.el('button', '', '', box); c.onclick = () => { if (!mole[i]) return; K.addScore(mole[i] == 2 ? -5 : 10); A.sfx(mole[i] == 2 ? 'hit' : 'pop'); if (mole[i] == 2) A.fx.shake(K.root, 260); mole[i] = 0; draw(); }; return c; });
  const draw = () => cells.forEach((c, i) => { c.textContent = mole[i] == 1 ? '🐹' : mole[i] == 2 ? '💣' : ''; c.style.cssText = `width:${sz}px;height:${sz}px;font-size:${sz * .5}px;border-radius:50%;background:radial-gradient(#5b3a1c 40%,#3b2410);box-shadow:inset 0 8px 16px #0009`; });
  const pop = () => { const free = mole.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (free.length) { const i = A.pick(free); mole[i] = Math.random() < .15 ? 2 : 1; draw(); K.after(() => { mole[i] = 0; draw(); }, A.rand(550, 950) - (30 - t) * 8); } K.after(pop, A.rand(300, 650) - (30 - t) * 6); };
  K.every(() => { t--; info.textContent = '⏱ ' + t + 's'; if (t <= 0) K.over('Tempo!'); }, 1000); draw(); pop();
});

// Teste de Cliques: conta cliques durante 10 segundos e mostra cliques por segundo.
A.register('cps', K => {
  K.fmt = n => n + ' cliques'; let n = 0, t = 10, on = false;
  const info = A.el('div', 'msg', 'Clique o mais rápido que puder por 10s!', K.root), b = A.el('button', 'btn', 'CLIQUE!', K.root); b.style.cssText = 'width:240px;height:240px;border-radius:50%;font-size:30px;font-weight:800;user-select:none;touch-action:manipulation';
  b.onpointerdown = () => { if (!on) { on = true; K.every(() => { t--; info.textContent = '⏱ ' + t + 's'; if (t <= 0) K.over((n / 10).toFixed(1) + ' cliques por segundo'); }, 1000); } n++; K.setScore(n); A.sfx('click'); b.style.transform = 'scale(.94)'; };
  b.onpointerup = b.onpointerleave = () => b.style.transform = '';
});

// Tempo de Reacao: cinco rodadas esperando o verde para medir os milissegundos.
A.register('reaction', K => {
  K.low = true; K.fmt = n => n + ' ms'; const rounds = []; let state = 'idle', timer, t0;
  const area = A.el('button', '', 'Clique para começar', K.root); area.style.cssText = 'width:100%;max-width:520px;height:260px;border-radius:20px;font-size:28px;font-weight:800;background:#3a3f6c;color:#fff;transition:background .1s;touch-action:manipulation';
  const info = A.el('div', 'msg', 'Rodada 1/5', K.root);
  const start = () => { state = 'wait'; area.style.background = '#c0392b'; area.textContent = 'Espere o verde…'; timer = K.after(() => { state = 'go'; t0 = performance.now(); area.style.background = '#27ae60'; area.textContent = 'CLIQUE!'; }, A.rand(1500, 4500)); };
  area.onpointerdown = () => {
    if (state == 'wait') { clearTimeout(timer); state = 'early'; area.style.background = '#e67e22'; area.textContent = 'Cedo demais! Clique para tentar de novo'; A.sfx('hit'); }
    else if (state == 'go') { const ms = Math.round(performance.now() - t0); rounds.push(ms); const avg = Math.round(rounds.reduce((a, b) => a + b) / rounds.length); K.setScore(avg); A.sfx('coin'); info.textContent = 'Rodada ' + Math.min(5, rounds.length + 1) + '/5 · ' + rounds.join(' · ') + ' ms';
      if (rounds.length == 5) return K.over('Média: ' + avg + ' ms', avg); state = 'res'; area.style.background = '#2a6fdb'; area.textContent = ms + ' ms · clique para continuar'; }
    else start();
  };
});

// Treino de Mira: alvos encolhem e desaparecem; clique rapido para pontuar.
A.register('aim', K => {
  K.canvas(640, 400); const { R, T } = K; let tg = null, t = 30, acc = 0;
  const spawn = () => { tg = { x: A.rand(50, 590), y: A.rand(60, 350), r: 34, life: 1.3, max: 1.3 }; };
  spawn();
  K.on(K.cv, 'pointerdown', e => { const p = K.pos(e); if (tg && Math.hypot(p.x - tg.x, p.y - tg.y) < tg.r) { K.addScore(10 + Math.round(tg.life / tg.max * 10)); K.burst(tg.x, tg.y, '#ff4d6d', 16, 4); A.sfx('pop'); spawn(); } else { K.addScore(-2); K.burst(p.x, p.y, '#9aa0c8', 6, 2); A.sfx('hit'); } });
  K.every(() => { t--; if (t <= 0) K.over('Tempo!'); }, 1000);
  K.loop(dt => {
    tg.life -= dt; tg.r = 10 + 24 * Math.max(0, tg.life / tg.max); if (tg.life <= 0) spawn();
    R(0, 0, 640, 400, '#0b1020'); K.C(tg.x, tg.y, tg.r + 8, 'rgba(255,77,109,.25)'); K.C(tg.x, tg.y, tg.r, '#ff4d6d'); K.C(tg.x, tg.y, tg.r * .6, '#fff'); K.C(tg.x, tg.y, tg.r * .25, '#ff4d6d');
    T('⏱ ' + t, 40, 24, 20);
  });
});

// Cor da Palavra: escolha a cor da tinta, ignorando o texto escrito.
A.register('stroop', K => {
  const C = [['VERMELHO', '#ff4d6d'], ['AZUL', '#4c7dff'], ['VERDE', '#3ddc84'], ['AMARELO', '#ffd23f'], ['ROXO', '#b05cff'], ['LARANJA', '#ff9f43']]; let t = 30, ink;
  const info = A.el('div', 'msg', 'Toque na COR da palavra, não no que ela diz!', K.root), w = A.el('div', '', '', K.root); w.style.cssText = 'font-size:60px;font-weight:800;min-height:90px;display:grid;place-items:center';
  const box = A.el('div', '', '', K.root); box.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;max-width:440px';
  const next = () => { const a = A.pick(C); let b; do b = A.pick(C); while (b == a); ink = b; w.textContent = a[0]; w.style.color = b[1]; };
  C.forEach(c => { const b = A.el('button', 'gb', c[0], box); b.style.cssText = 'padding:14px 4px;font-size:14px'; b.onclick = () => { if (c == ink) { K.addScore(10); A.sfx('coin'); } else { t -= 3; A.sfx('hit'); } info.textContent = '⏱ ' + t + 's'; next(); }; });
  K.every(() => { t--; info.textContent = '⏱ ' + t + 's'; if (t <= 0) K.over('Tempo!'); }, 1000); next();
});

// Estoura Baloes: baloes sobem; deixe tres escaparem e o jogo acaba.
A.register('balloons', K => {
  K.canvas(480, 560); const { g, R, T } = K; let bl = [], t = 0, lives = 3;
  K.on(K.cv, 'pointerdown', e => { const p = K.pos(e); for (let i = bl.length - 1; i >= 0; i--) { const b = bl[i]; if (Math.hypot(p.x - b.x, p.y - b.y * 1) < b.r + 6) { K.addScore(b.r < 26 ? 20 : 10); K.burst(b.x, b.y, `hsl(${b.h},85%,62%)`, 16, 4); A.sfx('pop'); bl.splice(i, 1); return; } } });
  K.loop(() => {
    if (--t <= 0) { bl.push({ x: A.rand(40, 440), y: 600, r: A.rand(20, 40), v: A.rf(1.4, 2.6) + K.score / 600, h: A.rand(0, 360) }); t = Math.max(18, 55 - K.score / 15); }
    bl.forEach(b => { b.y -= b.v; b.x += Math.sin(b.y / 30) * .6; });
    bl = bl.filter(b => { if (b.y < -50) { lives--; A.sfx('lose'); return false; } return true; }); if (lives <= 0) return K.over();
    const gr = g.createLinearGradient(0, 0, 0, 560); gr.addColorStop(0, '#6ec6ff'); gr.addColorStop(1, '#d6f0ff'); g.fillStyle = gr; g.fillRect(0, 0, 480, 560);
    bl.forEach(b => { g.strokeStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.moveTo(b.x, b.y + b.r); g.lineTo(b.x + Math.sin(b.y / 20) * 6, b.y + b.r + 40); g.stroke(); g.fillStyle = `hsl(${b.h},80%,55%)`; g.beginPath(); g.ellipse(b.x, b.y, b.r * .85, b.r, 0, 0, 7); g.fill(); K.C(b.x - b.r * .3, b.y - b.r * .35, b.r * .15, 'rgba(255,255,255,.6)'); });
    T('♥'.repeat(lives), 50, 24, 20, '#e0245e');
  });
});

// Genius: repita a sequencia de cores, que cresce a cada rodada.
A.register('simon', K => {
  const C = ['#3ddc84', '#ff4d6d', '#ffd23f', '#4c7dff'], seq = []; let pos = 0, busy = true; const sz = fit(2, 140, 90);
  const info = A.el('div', 'msg', 'Observe…', K.root), box = A.el('div', 'board', null, K.root); box.style.cssText = `grid-template-columns:repeat(2,${sz}px);gap:12px`;
  const pads = C.map((c, i) => { const b = A.el('button', '', '', box); b.style.cssText = `width:${sz}px;height:${sz}px;border-radius:${['100% 20px 20px 20px', '20px 100% 20px 20px', '20px 20px 20px 100%', '20px 20px 100% 20px'][i]};background:${c};opacity:.45;transition:.1s`; b.onclick = () => press(i); return b; });
  const flash = i => { pads[i].style.opacity = 1; pads[i].style.transform = 'scale(1.05)'; A.sfx('pop'); K.after(() => { pads[i].style.opacity = .45; pads[i].style.transform = ''; }, 350); };
  const play = () => { busy = true; pos = 0; info.textContent = 'Observe…'; seq.forEach((s, k) => K.after(() => flash(s), 700 + k * 650)); K.after(() => { busy = false; info.textContent = 'Sua vez!'; }, 700 + seq.length * 650); };
  const add = () => { seq.push(A.rand(0, 3)); if (seq.length % 5 === 0) A.fx.confetti(60, true); play(); };
  const press = i => {
    if (busy) return; flash(i);
    if (i != seq[pos]) return K.over('Errou na rodada ' + (seq.length));
    if (++pos == seq.length) { K.setScore(seq.length); busy = true; K.after(add, 900); }
  };
  K.after(add, 600);
});

// Piano Tiles: toque nos tiles pretos na ordem certa; a velocidade aumenta.
A.register('piano', K => {
  K.canvas(360, 560); const { R, T } = K, TH = 140; let rows = [], sp = 4, started = false;
  for (let i = 0; i < 5; i++) rows.push({ y: 560 - TH * (i + 2), c: A.rand(0, 3), hit: 0 });
  const tap = (c, y) => { started = true; const r = rows.find(r => !r.hit && r.c == c && y >= r.y && y <= r.y + TH); if (r) { r.hit = 1; K.addScore(1); sp = Math.min(13, sp + .12); K.burst(c * 90 + 45, r.y + TH / 2, '#e0245e', 10, 3); A.sfx('click'); } else K.over('Tile errado!'); };
  K.on(K.cv, 'pointerdown', e => { const p = K.pos(e); tap(Math.floor(p.x / 90), p.y); });
  K.onKey(c => { const m = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 }[c]; if (m != null) { const r = rows.filter(r => !r.hit).sort((a, b) => b.y - a.y)[0]; r && tap(m, r.y + 1); } });
  K.loop(() => {
    if (started) rows.forEach(r => r.y += sp);
    const top = Math.min(...rows.map(r => r.y)); if (top > 0) rows.push({ y: top - TH, c: A.rand(0, 3), hit: 0 });
    if (rows.some(r => !r.hit && r.y > 560)) return K.over('Perdeu um tile!'); rows = rows.filter(r => r.y < 700);
    R(0, 0, 360, 560, '#f5f5f5'); for (let i = 1; i < 4; i++) R(i * 90 - 1, 0, 2, 560, '#ccc');
    rows.forEach(r => { R(r.c * 90 + 2, r.y + 2, 86, TH - 4, r.hit ? '#bbb' : '#111'); }); T(String(K.score), 180, 50, 44, '#e0245e');
    if (!started) T('Toque no primeiro tile', 180, 300, 20, '#888');
  });
});

// Memoria Numerica: memorize a sequencia e digite; fica maior a cada nivel.
A.register('numbermem', K => {
  let lvl = 1; const info = A.el('div', 'msg', '', K.root), nb = A.el('div', '', '', K.root); nb.style.cssText = 'font-size:52px;font-weight:800;letter-spacing:6px;min-height:80px;font-family:monospace;word-break:break-all;text-align:center';
  const inp = A.el('input', '', '', K.root); inp.style.cssText = inputCss; inp.inputMode = 'numeric'; inp.disabled = true; const bt = A.el('button', 'gb pri', 'Confirmar', K.root); let n = '';
  const round = () => { n = Array.from({ length: lvl + 2 }, () => A.rand(0, 9)).join(''); nb.textContent = n; inp.value = ''; inp.disabled = true; bt.disabled = true; info.textContent = 'Memorize! (nível ' + lvl + ')'; K.after(() => { nb.textContent = '❓'; info.textContent = 'Digite o número'; inp.disabled = false; bt.disabled = false; inp.focus(); }, 900 + lvl * 450); };
  const go = () => { if (inp.value.trim() == n) { K.setScore(lvl); lvl++; A.sfx('coin'); K.banner('NÍVEL ' + lvl, 'Sequência maior'); if (lvl % 3 === 0) A.fx.confetti(70, true); round(); } else { nb.textContent = n; K.over('Era ' + n, lvl - 1); } };
  bt.onclick = go; inp.onkeydown = e => { if (e.key == 'Enter') go(); }; round();
});

// Tabela Relampago: clique de 1 a 25 em ordem; o tempo e o criterio de vitoria.
A.register('schulte', K => {
  K.low = true; K.fmt = n => (n / 10).toFixed(1) + 's'; const sz = fit(5, 64, 70); let nx = 1, t = 0, on = false;
  const info = A.el('div', 'msg', 'Toque de 1 a 25 em ordem, o mais rápido possível!', K.root), box = A.el('div', 'board', null, K.root); box.style.cssText = `grid-template-columns:repeat(5,${sz}px);gap:6px`;
  A.shuffle(Array.from({ length: 25 }, (_, i) => i + 1)).forEach(v => { const b = A.el('button', 'cellb', v, box); b.style.cssText = `width:${sz}px;height:${sz}px;font-size:${sz * .42}px`; b.onclick = () => {
    if (!on) { on = true; K.every(() => K.setScore(++t), 100); } if (v != nx) return A.sfx('hit'); b.style.background = '#3a9d5d'; b.style.opacity = .5; A.sfx('click'); nx++; info.textContent = 'Próximo: ' + nx; if (nx > 25) { A.fx.confetti(120, true); K.over('Concluído! ⚡', t); } }; });
});

// Biscoito Clicker: clique para ganhar biscoitos, compre upgrades e salve o progresso.
A.register('cookie', K => {
  K.fmt = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n;
  const U = [['👆 Cursor', 15, .2], ['👵 Vovó', 100, 1], ['🌾 Fazenda', 1100, 8], ['⛏ Mina', 12000, 47], ['🏭 Fábrica', 130000, 260], ['🚀 Foguete', 1400000, 1400]];
  const st = A.store.get('cookie', null) || { c: 0, tot: 0, n: U.map(() => 0), pw: 1 };
  const cost = i => Math.ceil(U[i][1] * Math.pow(1.15, st.n[i])), cps = () => st.n.reduce((s, n, i) => s + n * U[i][2], 0);
  const info = A.el('div', 'msg', '', K.root), ck = A.el('button', '', '🍪', K.root); ck.style.cssText = 'font-size:120px;transition:.08s;filter:drop-shadow(0 10px 20px #0008);touch-action:manipulation';
  const shop = A.el('div', '', '', K.root); shop.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;width:100%;max-width:560px';
  const bs = U.map((u, i) => { const b = A.el('button', 'gb', '', shop); b.onclick = () => { if (st.c >= cost(i)) { st.c -= cost(i); st.n[i]++; A.sfx('coin'); draw(); } }; return b; });
  const pw = A.el('button', 'gb pri', '', shop); pw.onclick = () => { const c = 50 * Math.pow(3, st.pw - 1); if (st.c >= c) { st.c -= c; st.pw++; A.sfx('win'); draw(); } };
  const draw = () => { info.textContent = `🍪 ${K.fmt(Math.floor(st.c))}  ·  ${cps().toFixed(1)}/s`; bs.forEach((b, i) => { b.innerHTML = `${U[i][0]} <small>(${st.n[i]})</small><br><small>🍪 ${K.fmt(cost(i))}</small>`; b.disabled = st.c < cost(i); }); const c = 50 * Math.pow(3, st.pw - 1); pw.innerHTML = `💪 Clique forte (+${st.pw})<br><small>🍪 ${K.fmt(c)}</small>`; pw.disabled = st.c < c; K.setScore(Math.floor(st.tot)); };
  ck.onpointerdown = () => { st.c += st.pw; st.tot += st.pw; ck.style.transform = 'scale(.9)'; A.sfx('click'); draw(); }; ck.onpointerup = ck.onpointerleave = () => ck.style.transform = '';
  K.every(() => { const g = cps() / 10; st.c += g; st.tot += g; draw(); }, 100);
  K.every(() => { A.store.set('cookie', st); K.submit(Math.floor(st.tot)); }, 3000); draw();
  K.on(window, 'pagehide', () => A.store.set('cookie', st));
});
})();
