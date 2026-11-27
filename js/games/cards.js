/* =============================================================================
   ARCADIA - CARTAS E SORTE
   -----------------------------------------------------------------------------
   Helpers deste arquivo:
     deck()      -> cria e embaralha um baralho completo;
     cardEl()    -> desenha uma carta;
     row()/btn() -> montam linhas e botoes;
     makeDie()   -> cria um dado 3D animado com CSS transform.

   Jogos: Vinte e Um, Guerra de Cartas, Maior ou Menor, Caca-Niquel, Porquinho,
   Cara ou Coroa, Roleta europeia e Dados Poker.
   ============================================================================= */
(function () {
const A = Arcadia;
const SU = ['♠', '♥', '♦', '♣'], RK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const deck = () => A.shuffle(SU.flatMap(s => RK.map((r, i) => ({ s, r, v: i + 1 }))));
const cardEl = (c, p) => {
  if (!c) return A.el('div', 'pcard back', '', p);
  const red = c.s == '♥' || c.s == '♦';
  return A.el('div', 'pcard' + (red ? ' red' : ''),
    `<span class="corner tl"><b>${c.r}</b><i>${c.s}</i></span>` +
    `<span class="pip">${c.s}</span>` +
    `<span class="corner br"><b>${c.r}</b><i>${c.s}</i></span>`, p);
};
const row = (root, label) => {
  const w = A.el('div', 'card-row', '', root);
  A.el('small', 'card-row-label', label, w);
  return A.el('div', 'card-row-cards', '', w);
};
const btn = (p, t, fn, pri) => { const b = A.el('button', 'gb' + (pri ? ' pri' : ''), t, p); b.onclick = fn; return b; };

/* Mesa de cassino compartilhada pelos jogos de cartas/dados.
   Cria a arena moderna (cabeçalho + assinatura GPWeb) em volta da moldura de
   feltro, do trilho dourado e do corpo do jogo. */
function table(K, variant, opts) {
  opts = opts || {};
  const wrap = A.el('div', 'arena arena--cards', '', K.root);
  const head = A.el('div', 'arena-head', '', wrap);
  A.el('div', 'arena-ico', opts.icon || '🃏', head);
  const title = A.el('div', 'arena-title', '', head);
  A.el('b', '', opts.title || '', title);
  A.el('small', '', opts.sub || '', title);
  const felt = A.el('div', 'game-table gt-' + (variant || 'cards'), null, wrap);
  A.el('div', 'gt-rail', '', felt);
  const body = A.el('div', 'gt-body', '', felt);
  A.el('div', 'arena-brand', '<img src="images/gpweb.png" alt=""> GPWeb', wrap);
  return body;
}

/* dado 3D reutilizável (CSS) */
const PIP = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const ORI = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
function makeDie(size) {
  const el = A.el('div', 'd3'); el.style.cssText = `width:${size}px;height:${size}px;perspective:${size * 5}px`;
  const cube = A.el('div', 'd3c', null, el); cube.style.width = '100%'; cube.style.height = '100%';
  const defs = [[1, `translateZ(${size / 2}px)`], [6, `rotateY(180deg) translateZ(${size / 2}px)`], [3, `rotateY(90deg) translateZ(${size / 2}px)`], [4, `rotateY(-90deg) translateZ(${size / 2}px)`], [2, `rotateX(90deg) translateZ(${size / 2}px)`], [5, `rotateX(-90deg) translateZ(${size / 2}px)`]];
  defs.forEach(([v, t]) => {
    const f = A.el('div', 'd3f', null, cube); f.style.transform = t;
    for (let i = 0; i < 9; i++) { const c = A.el('div', '', null, f); if (PIP[v].includes(i)) c.className = 'd3p'; }
  });
  const api = { el, cube, v: 1, _t: 0 };
  api.set = (v, anim) => {
    api.v = v; const base = ORI[v]; clearTimeout(api._t);
    if (anim) {
      const rx = base[0] + 360 * (2 + A.rand(0, 2)), ry = base[1] + 360 * (2 + A.rand(0, 2));
      cube.style.transition = 'transform .7s cubic-bezier(.2,.7,.2,1)';
      cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      api._t = setTimeout(() => { cube.style.transition = 'none'; cube.style.transform = `rotateX(${base[0]}deg) rotateY(${base[1]}deg)`; }, 720);
    } else {
      cube.style.transition = 'none'; cube.style.transform = `rotateX(${base[0]}deg) rotateY(${base[1]}deg)`;
    }
  };
  api.set(1, false);
  return api;
}

// Vinte e Um: fichas ficticias, pedir/parar/dobrar e blackjack paga mais.
A.register('blackjack', K => {
  const T = table(K, 'blackjack', { icon: '🂡', title: 'Vinte e Um', sub: 'Fichas fictícias · pedir, parar ou dobrar' });
  let bank = 100, d, ph, dh, bet; const info = A.el('div', 'msg', '', T), dr = row(T, 'CASA'), pr = row(T, 'VOCÊ'), ctl = A.el('div', 'btns', null, T);
  const bankEl = A.el('div', 'casino-bank', '<span class="cb-item"><small>Fichas</small><b data-bank>100</b></span><span class="cb-item"><small>Aposta</small><b data-bet>0</b></span>', T);
  const bankVal = bankEl.querySelector('[data-bank]'), betVal = bankEl.querySelector('[data-bet]');
  const sync = () => { bankVal.textContent = bank; betVal.textContent = bet || 0; };
  const val = h => { let t = h.reduce((s, c) => s + (c.v == 1 ? 11 : Math.min(10, c.v)), 0), a = h.filter(c => c.v == 1).length; while (t > 21 && a--) t -= 10; return t; };
  const show = hide => { dr.innerHTML = ''; pr.innerHTML = ''; dh && dh.forEach((c, i) => cardEl(hide && i ? null : c, dr)); ph && ph.forEach(c => cardEl(c, pr)); if (ph) info.textContent = `Você: ${val(ph)}${hide ? '' : ' · Casa: ' + val(dh)} · Aposta: ${bet}`; sync(); };
  const betPhase = () => {
    K.setScore(bank); ctl.innerHTML = ''; dh = ph = null; show(); info.textContent = `Fichas: ${bank}. Faça sua aposta!`;
    [10, 25, 50].forEach(b => { const x = btn(ctl, '🪙 ' + b, () => deal(b), 1); x.classList.add('chip-bet'); x.disabled = bank < b; }); btn(ctl, 'Sair e salvar', () => K.over('Você saiu com ' + bank + ' fichas', bank));
  };
  const finish = (msg, mult) => { bank += Math.round(bet * mult); K.setScore(bank); show(false); info.textContent = msg + ` (${bank} fichas)`; ctl.innerHTML = ''; A.sfx(mult > 0 ? 'win' : 'lose'); if (mult > 2) A.fx.confetti(140, true); if (bank < 10) return K.after(() => K.over('Faliu! 💸', bank), 1200); btn(ctl, 'Próxima mão', betPhase, 1); };
  const deal = b => { bet = b; bank -= b; d = deck(); ph = [d.pop(), d.pop()]; dh = [d.pop(), d.pop()]; A.sfx('click'); if (val(ph) == 21) return finish('Blackjack! 🎉', 2.5); turn(); };
  const stand = () => { while (val(dh) < 17) dh.push(d.pop()); const p = val(ph), c = val(dh); c > 21 || p > c ? finish('Você venceu! 🎉', 2) : p == c ? finish('Empate', 1) : finish('A casa venceu', 0); };
  const turn = () => { show(true); ctl.innerHTML = ''; btn(ctl, 'Pedir', () => { ph.push(d.pop()); A.sfx('click'); val(ph) > 21 ? (show(false), finish('Estourou! 💥', 0)) : turn(); }, 1); btn(ctl, 'Parar', stand); if (ph.length == 2 && bank >= bet) btn(ctl, 'Dobrar', () => { bank -= bet; bet *= 2; ph.push(d.pop()); val(ph) > 21 ? finish('Estourou! 💥', 0) : stand(); }); };
  betPhase();
});

// Guerra de Cartas: 26 rodadas, a carta maior leva; as vale 14.
A.register('war', K => {
  const T = table(K, 'war', { icon: '⚔️', title: 'Guerra de Cartas', sub: 'Carta maior vence · Ás é a maior' });
  const d = deck(), msg = A.el('div', 'msg', 'Carta maior vence a rodada. Ás é a maior!', T), a = row(T, 'VOCÊ'), b = row(T, 'CPU'); let me = 0, cpu = 0, n = 0;
  const scoreEl = A.el('div', 'duel-score', '<span class="me">Você <b>0</b></span><span class="vs">×</span><span class="cpu"><b>0</b> CPU</span><span class="vs">·</span><span>Rodada <b>0</b>/26</span>', T);
  const scoreVals = scoreEl.querySelectorAll('b');
  const bt = btn(T, '🃏 Virar cartas', () => {
    const x = d.pop(), y = d.pop(), vx = x.v == 1 ? 14 : x.v, vy = y.v == 1 ? 14 : y.v; a.innerHTML = ''; b.innerHTML = ''; cardEl(x, a); cardEl(y, b); n++; A.sfx('click');
    if (vx > vy) { me++; K.setScore(me); msg.textContent = 'Você ganhou a rodada!'; A.sfx('coin'); } else if (vy > vx) { cpu++; msg.textContent = 'CPU ganhou a rodada'; } else msg.textContent = 'Empate!';
    scoreVals[0].textContent = me; scoreVals[1].textContent = cpu; scoreVals[2].textContent = n;
    if (!d.length) { bt.disabled = true; me > cpu ? K.over('Você venceu a guerra! ⚔️', me) : K.over(me == cpu ? 'Empate!' : 'CPU venceu', me, me <= cpu); } else msg.textContent += ` · Rodada ${n}/26`;
  }, 1);
});

// Maior ou Menor: aposte se a proxima carta sera maior ou menor que a atual.
A.register('hilo', K => {
  const T = table(K, 'hilo', { icon: '🔼', title: 'Maior ou Menor', sub: 'Acerte a próxima carta e mantenha a sequência' });
  let d = deck(), cur = d.pop(), streak = 0; const msg = A.el('div', 'msg', 'A próxima carta é maior ou menor?', T), r = row(T, 'CARTA ATUAL'), ctl = A.el('div', 'btns', null, T);
  const streakEl = A.el('div', 'duel-score', '<span class="me">Acertos <b>0</b></span><span class="vs">·</span><span>Sequência <b>0</b></span>', T);
  const streakVals = streakEl.querySelectorAll('b');
  const show = () => { r.innerHTML = ''; cardEl(cur, r); };
  const go = hi => {
    if (!d.length) d = deck(); const n = d.pop(), a = cur.v, b = n.v; cur = n; show();
    if (a == b) { msg.textContent = 'Igual! Sem pontos.'; return; }
    if ((b > a) == hi) { streak++; K.addScore(10); streakVals[0].textContent = Math.floor(K.score / 10); streakVals[1].textContent = streak; msg.textContent = 'Acertou! 🔥'; A.sfx('coin'); }
    else K.over('Errou! Era ' + (b > a ? 'maior' : 'menor'));
  };
  btn(ctl, '⬆ Maior', () => go(true), 1); btn(ctl, '⬇ Menor', () => go(false));
  K.onKey(code => {
    if (code === 'ArrowUp' || code === 'w' || code === 'W') go(true);
    if (code === 'ArrowDown' || code === 's' || code === 'S') go(false);
  });
  show();
});

// Caca-Niquel: tres rolos animados, fichas ficticias e tabela de pagamentos.
A.register('slots', K => {
  const T = table(K, 'slots', { icon: '🎰', title: 'Caça-Níquel', sub: 'Três iguais pagam alto' });
  const S = ['🍒', '🍋', '🔔', '⭐', '7️⃣'], PAY = { '🍒': 50, '🍋': 30, '🔔': 60, '⭐': 100, '7️⃣': 200 }; let bank = 100, spinning = false; K.setScore(bank);
  const info = A.el('div', 'msg', 'Cada giro custa 10 fichas. Três iguais pagam muito!', T);
  const bankEl = A.el('div', 'casino-bank', '<span class="cb-item"><small>Fichas</small><b data-bank>100</b></span><span class="cb-item"><small>Giro</small><b>10</b></span>', T);
  const bankVal = bankEl.querySelector('[data-bank]');
  A.el('div', 'paytable', '🍒 50 · 🍋 30 · 🔔 60 · ⭐ 100 · 7️⃣ 200 · dois iguais 15', T);
  const machine = A.el('div', 'slots', null, T);
  const avail = Math.max(200, T.clientWidth - 40), rw = Math.max(50, Math.min(84, Math.floor((avail - 40) / 3))), rh = Math.round(rw * 1.24);
  const reels = [0, 1, 2].map(() => {
    const r = A.el('div', 'reel', null, machine); r.style.cssText = `width:${rw}px;height:${rh}px`;
    const st = A.el('div', 'reel-strip', null, r); st.innerHTML = `<div style="height:${rh}px;font-size:${rw * .64}px">${A.pick(S)}</div>`; return { r, st };
  });
  const ctl = A.el('div', 'btns', null, T);
  const sp = A.el('button', 'gb pri', '🎰 Girar (10)', ctl), leave = A.el('button', 'gb', 'Sair e salvar', ctl);
  const end = res => {
    spinning = false; machine.classList.remove('spinning'); let w = 0;
    if (res[0] == res[1] && res[1] == res[2]) w = PAY[res[0]]; else if (res[0] == res[1] || res[1] == res[2] || res[0] == res[2]) w = 15;
    bank += w; K.setScore(bank); bankVal.textContent = bank;
    info.innerHTML = w ? `🎉 <b style="color:#3ddc84">+${w} fichas!</b>` : 'Não foi dessa vez…';
    A.sfx(w ? 'win' : 'lose'); sp.disabled = false; leave.disabled = false;
    if (w) {
      reels.forEach(x => x.r.style.boxShadow = '0 0 0 3px #3ddc84,0 0 24px #3ddc84');
      machine.classList.add('win');
      if (w >= 60) A.fx.confetti(130, true);
      K.after(() => { reels.forEach(x => x.r.style.boxShadow = ''); machine.classList.remove('win'); }, 900);
    }
    if (bank < 10) K.after(() => K.over('Faliu! 💸', bank), 1000);
  };
  sp.onclick = () => {
    if (spinning || bank < 10) return; spinning = true; bank -= 10; K.setScore(bank); bankVal.textContent = bank; sp.disabled = true; leave.disabled = true; machine.classList.add('spinning');
    const res = [A.pick(S), A.pick(S), A.pick(S)];
    const tick = K.every(() => A.sfx('step'), 80);
    reels.forEach((reel, i) => {
      const strip = []; for (let k = 0; k < 14; k++) strip.push(A.pick(S)); strip.push(res[i]);
      reel.st.style.transition = 'none'; reel.st.style.transform = 'translateY(0)';
      reel.st.innerHTML = strip.map(s => `<div style="height:${rh}px;font-size:${rw * .64}px">${s}</div>`).join('');
      void reel.st.offsetHeight;
      const dur = 850 + i * 380;
      reel.st.style.transition = `transform ${dur}ms cubic-bezier(.15,.8,.15,1)`;
      reel.st.style.transform = `translateY(${-(strip.length - 1) * rh}px)`;
    });
    K.after(() => { clearInterval(tick); end(res); }, 850 + 2 * 380 + 140);
  };
  leave.onclick = () => K.over('Você saiu com ' + bank + ' fichas', bank);
});

// Porquinho: role o dado 3D, acumule pontos e nao tire 1; primeiro a 50 vence.
A.register('pig', K => {
  const T = table(K, 'pig', { icon: '🐷', title: 'Porquinho (Pig)', sub: 'Role o dado · primeiro a 50 vence' });
  let me = 0, cpu = 0, turn = 0, tp = 0, busy = false; const TARGET = 50;
  const info = A.el('div', 'msg', '', T);
  const scoreEl = A.el('div', 'casino-bank', '<span class="cb-item"><small>Você</small><b data-me>0</b></span><span class="cb-item"><small>CPU</small><b data-cpu>0</b></span><span class="cb-item"><small>Rodada</small><b data-tp>0</b></span>', T);
  const meVal = scoreEl.querySelector('[data-me]'), cpuVal = scoreEl.querySelector('[data-cpu]'), tpVal = scoreEl.querySelector('[data-tp]');
  const tray = A.el('div', 'dice-tray', null, T);
  const die = makeDie(96); die.el.style.margin = '6px auto'; tray.appendChild(die.el);
  const ctl = A.el('div', 'btns', null, T);
  const upd = () => {
    info.textContent = `Primeiro a ${TARGET} vence · Rodada vale ${tp} ponto${tp === 1 ? '' : 's'}`;
    meVal.textContent = me; cpuVal.textContent = cpu; tpVal.textContent = tp;
  };
  const end = who => { if (who) { A.sfx('lose'); K.over('A CPU venceu 🤖'); } else { K.addScore(1); A.sfx('win'); K.over('Você venceu! 🐷'); } };
  const roll = who => { const r = A.rand(1, 6); die.set(r, true); A.sfx('click'); if (r == 1) { tp = 0; return false; } tp += r; return true; };
  const hold = () => { if (turn == 0) me += tp; else cpu += tp; tp = 0; if (me >= TARGET) return end(0); if (cpu >= TARGET) return end(1); turn = 1 - turn; upd(); if (turn) cpuTurn(); };
  const cpuTurn = () => { busy = true; K.after(function step() { if (!roll(1)) { turn = 0; busy = false; upd(); return; } upd(); if (tp >= 18 || cpu + tp >= TARGET) { K.after(() => { busy = false; hold(); }, 500); } else K.after(step, 600); }, 700); };
  btn(ctl, '🎲 Rolar', () => { if (busy || turn) return; if (!roll(0)) { turn = 1; upd(); cpuTurn(); } else upd(); }, 1); btn(ctl, '✋ Guardar', () => { if (!busy && !turn && tp) hold(); }); upd();
});

// Cara ou Coroa: moeda 3D animada, sequencia, historico e mesa tematica.
A.register('coinflip', K => {
  const T = table(K, 'coinflip', { icon: '🪙', title: 'Cara ou Coroa', sub: 'Acerte em sequência e bata seu recorde' });
  const panel = A.el('div', 'coin-panel', null, T);
  const msg = A.el('div', 'msg', 'Cara ou coroa? Acerte em sequência!', panel);
  const stats = A.el('div', 'coin-stats', null, panel);
  const streakEl = A.el('span', 'coin-stat', '<small>Sequência</small><b>0</b>', stats);
  const bestEl = A.el('span', 'coin-stat', '<small>Recorde</small><b>0</b>', stats);
  const triesEl = A.el('span', 'coin-stat', '<small>Giros</small><b>0</b>', stats);
  const stageEl = A.el('div', 'coin-stage', null, panel);
  const c = A.el('div', 'coin3d', null, stageEl);
  A.el('div', 'coin-face front', '<span class="coin-emoji">👑</span><img class="coin-logo" src="images/gpweb.png" alt=""><b>CARA</b>', c);
  A.el('div', 'coin-face back', '<span class="coin-emoji">🔱</span><img class="coin-logo" src="images/gpweb.png" alt=""><b>COROA</b>', c);
  const historyEl = A.el('div', 'coin-history', null, panel);
  const ctl = A.el('div', 'btns coin-actions', null, T);
  let rot = 0, busy = false, best = 0, tries = 0, history = [];
  const paint = () => {
    streakEl.querySelector('b').textContent = K.score;
    bestEl.querySelector('b').textContent = best;
    triesEl.querySelector('b').textContent = tries;
    historyEl.innerHTML = history.length
      ? history.map((item, i) => '<span class="coin-chip ' + (item.win ? 'win' : 'lose') + '">' + item.label + '</span>').join('')
      : '<span class="coin-empty">Os últimos giros aparecem aqui.</span>';
  };
  const flip = pick => {
    if (busy) return;
    busy = true;
    const r = A.rand(0, 1);
    const label = r ? '🔱 Coroa' : '👑 Cara';
    tries++;
    rot = rot - (rot % 360) + 1080 + (r ? 180 : 0);
    c.classList.remove('landed');
    c.classList.add('tossing');
    c.style.transform = `rotateY(${rot}deg)`;
    A.sfx('step');
    K.after(() => {
      c.classList.remove('tossing');
      c.classList.add('landed');
      busy = false;
      const win = r === pick;
      history = [{ label, win }].concat(history).slice(0, 8);
      if (win) {
        K.addScore(1);
        best = Math.max(best, K.score);
        msg.textContent = K.score > 1 ? 'Acertou de novo! 🔥 Sequência de ' + K.score : 'Acertou! 🍀';
        A.sfx('coin');
        if (K.score % 5 === 0) A.fx.confetti(110, true);
      } else {
        msg.textContent = 'Deu ' + (r ? 'coroa' : 'cara') + '. Fim da sequência!';
        A.sfx('lose');
      }
      paint();
      if (!win) K.after(() => K.over('Você acertou ' + K.score + ' seguida' + (K.score === 1 ? '' : 's') + '. Deu ' + (r ? 'coroa' : 'cara') + '.', K.score), 900);
    }, 760);
  };
  [['👑 Cara', 0], ['🔱 Coroa', 1]].forEach(([t, v]) => btn(ctl, t, () => flip(v), 1));
  K.onKey(code => {
    if (code === 'ArrowLeft' || code === 'a' || code === 'A') flip(0);
    if (code === 'ArrowRight' || code === 'd' || code === 'D') flip(1);
  });
  paint();
});

// Roleta europeia: 37 numeros, apostas em cor/par/faixa/numero e roda animada.
A.register('roulette', K => {
  const T = table(K, 'roulette', { icon: '🎡', title: 'Roleta Europeia', sub: 'Aposte na cor, par ou número e gire a roda' });
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const STEP = Math.PI * 2 / 37, TAU = Math.PI * 2, C = 200, RW = 185;
  const colorOf = n => n === 0 ? 'zero' : RED.has(n) ? 'red' : 'black';
  let bank = 500, bets = {}, chip = 25, spinning = false, angle = -Math.PI / 2, anim = null, hist = [];
  K.setScore(bank);

  const wrap = A.el('div', 'rl', null, T);
  const wheelBox = A.el('div', 'rl-wheel', null, wrap);
  const cv = A.el('canvas', null, null, wheelBox); cv.width = 400; cv.height = 400;
  const g = cv.getContext('2d');
  const panel = A.el('div', 'rl-panel', null, wrap);
  const bankEl = A.el('div', 'rl-bank', '<div><small>Fichas</small><b>500</b></div><div style="text-align:right"><small>Aposta</small><b>0</b></div>', panel);
  const bEls = bankEl.querySelectorAll('b');
  const chips = A.el('div', 'rl-chips', null, panel);
  const histEl = A.el('div', 'rl-hist', null, panel);
  const resultEl = A.el('div', 'rl-result', 'Escolha uma ficha e toque nas casas para apostar.', panel);
  const ctl = A.el('div', 'btns', null, panel);
  const spinBtn = A.el('button', 'gb pri', '🎡 GIRAR', ctl);
  const clearBtn = A.el('button', 'gb', 'Limpar', ctl);
  const leaveBtn = A.el('button', 'gb', 'Sair', ctl);
  const board = A.el('div', 'rl-board', null, T);

  const spots = {};
  const chipBtns = [5, 10, 25, 50].map(v => {
    const b = A.el('button', 'rl-chip' + (v === chip ? ' on' : ''), v, chips);
    b.onclick = () => { chip = v; chipBtns.forEach(x => x.classList.toggle('on', x === b)); A.sfx('click'); };
    return b;
  });
  const mkSpot = (parent, label, cls, key) => {
    const b = A.el('button', 'rl-b ' + cls, `<span>${label}</span>`, parent);
    b.onclick = () => place(key); spots[key] = b; return b;
  };
  const zeroRow = A.el('div', 'rl-row', null, board); zeroRow.style.gridTemplateColumns = '1fr';
  mkSpot(zeroRow, '0', 'zero', 'n0');
  const nums = A.el('div', 'rl-row rl-nums', null, board);
  for (let n = 1; n <= 36; n++) mkSpot(nums, String(n), colorOf(n), 'n' + n);
  const out = A.el('div', 'rl-row rl-out', null, board);
  mkSpot(out, '🔴 Vermelho', 'red', 'red'); mkSpot(out, '⚫ Preto', 'black', 'black');
  mkSpot(out, 'Par', '', 'even'); mkSpot(out, 'Ímpar', '', 'odd');
  mkSpot(out, '1–18', '', 'low'); mkSpot(out, '19–36', '', 'high');

  const wheel = document.createElement('canvas'); wheel.width = wheel.height = 400; const wg = wheel.getContext('2d');
  for (let i = 0; i < 37; i++) {
    const n = ORDER[i], s = -Math.PI / 2 + (i - 0.5) * STEP, e = s + STEP;
    wg.beginPath(); wg.moveTo(C, C); wg.arc(C, C, RW - 20, s, e); wg.closePath();
    wg.fillStyle = n === 0 ? '#0e9f6e' : RED.has(n) ? '#e0245e' : '#171b2e'; wg.fill();
    wg.strokeStyle = 'rgba(255,255,255,.22)'; wg.lineWidth = 1; wg.stroke();
    wg.save(); wg.translate(C, C); wg.rotate(s + STEP / 2);
    wg.textAlign = 'center'; wg.textBaseline = 'middle'; wg.fillStyle = '#fff'; wg.font = '800 13px Outfit,sans-serif';
    wg.fillText(n, RW - 38, 0); wg.restore();
  }

  const total = () => Object.values(bets).reduce((s, v) => s + v, 0);
  function paint() {
    bEls[0].textContent = bank; bEls[1].textContent = total();
    chipBtns.forEach(b => b.disabled = bank < +b.textContent);
    for (const key in spots) {
      const el = spots[key], amt = bets[key] || 0, old = el.querySelector('.bet');
      if (amt) { const b = old || A.el('span', 'bet', '', el); b.textContent = amt; }
      else if (old) old.remove();
    }
  }
  function tossChip(from, to) {
    if (!from || !to || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const el = document.createElement('div'); el.className = 'rl-fly'; el.textContent = chip;
    el.style.left = (a.left + a.width / 2) + 'px'; el.style.top = (a.top + a.height / 2) + 'px';
    document.body.appendChild(el);
    const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    el.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.55)`, opacity: .35 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => el.remove();
  }
  function place(key) {
    if (spinning) return;
    if (bank < chip) { resultEl.textContent = 'Fichas insuficientes.'; A.sfx('hit'); return; }
    bank -= chip; bets[key] = (bets[key] || 0) + chip; A.sfx('coin'); paint();
    tossChip(chipBtns.find(b => +b.textContent === chip), spots[key]);
  }
  function clearBets() {
    if (spinning) return; bank += total(); bets = {}; A.sfx('click'); resultEl.textContent = 'Apostas devolvidas.'; paint();
  }
  function resolve(key, n) {
    const amt = bets[key] || 0;
    if (key[0] === 'n') return +key.slice(1) === n ? amt * 36 : 0;
    if (key === 'red') return n !== 0 && RED.has(n) ? amt * 2 : 0;
    if (key === 'black') return n !== 0 && !RED.has(n) ? amt * 2 : 0;
    if (key === 'even') return n !== 0 && n % 2 === 0 ? amt * 2 : 0;
    if (key === 'odd') return n % 2 === 1 ? amt * 2 : 0;
    if (key === 'low') return n >= 1 && n <= 18 ? amt * 2 : 0;
    if (key === 'high') return n >= 19 ? amt * 2 : 0;
    return 0;
  }
  function finish(n) {
    spinning = false; spinBtn.disabled = false; clearBtn.disabled = false; leaveBtn.disabled = false;
    let win = 0; const won = [];
    for (const key in bets) { const w = resolve(key, n); if (w) { win += w; won.push(key); } }
    bank += win; K.setScore(bank);
    hist.unshift(n); hist = hist.slice(0, 12);
    histEl.innerHTML = hist.map(x => `<span class="rl-h ${colorOf(x)}">${x}</span>`).join('');
    won.forEach(key => { const el = spots[key]; if (!el) return; el.classList.remove('win'); void el.offsetWidth; el.classList.add('win'); K.after(() => el.classList.remove('win'), 900); });
    bets = {}; paint();
    const tag = n === 0 ? '🟢' : RED.has(n) ? '🔴' : '⚫';
    if (win) { resultEl.innerHTML = `${tag} Caiu <b>${n}</b> · 🎉 <b style="color:#3ddc84">+${win} fichas!</b>`; A.sfx('win'); A.fx.confetti(win >= 300 ? 160 : 70, true); }
    else { resultEl.innerHTML = `${tag} Caiu <b>${n}</b> · não foi dessa vez.`; A.sfx('lose'); }
    if (bank < 5) K.after(() => K.over('Faliu! 💸', bank), 1300);
  }
  function spin() {
    if (spinning) return;
    if (!total()) { resultEl.textContent = 'Faça uma aposta primeiro!'; A.sfx('hit'); return; }
    spinning = true; spinBtn.disabled = true; clearBtn.disabled = true; leaveBtn.disabled = true;
    const n = A.rand(0, 36), idx = ORDER.indexOf(n), base = -idx * STEP;
    let delta = base - (angle % TAU); delta = ((delta % TAU) + TAU) % TAU;
    anim = { t: 0, dur: 4.2, from: angle, to: angle + (4 + A.rand(0, 2)) * TAU + delta, n };
    resultEl.textContent = 'A bola está girando…';
  }
  function draw() {
    g.clearRect(0, 0, 400, 400);
    g.beginPath(); g.arc(C, C, RW + 6, 0, TAU); g.fillStyle = '#3a2a12'; g.fill();
    g.beginPath(); g.arc(C, C, RW, 0, TAU); g.fillStyle = '#1a1020'; g.fill();
    g.save(); g.translate(C, C); g.rotate(angle); g.drawImage(wheel, -C, -C); g.restore();
    g.beginPath(); g.arc(C, C, 42, 0, TAU); g.fillStyle = '#1a1030'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.arc(C, C, 28, 0, TAU); g.fillStyle = '#2a1a5e'; g.fill();
    const p = anim ? Math.min(1, anim.t / anim.dur) : 1, eb = 1 - Math.pow(1 - p, 3);
    const ba = -Math.PI / 2 - (1 - eb) * TAU * 5, br = RW - 10 - 16 * eb;
    g.beginPath(); g.arc(C + Math.cos(ba) * br, C + Math.sin(ba) * br, 7, 0, TAU); g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 12; g.fill(); g.shadowBlur = 0;
    g.beginPath(); g.moveTo(C, 6); g.lineTo(C - 13, 30); g.lineTo(C + 13, 30); g.closePath(); g.fillStyle = '#ffd23f'; g.fill();
  }
  spinBtn.onclick = spin; clearBtn.onclick = clearBets;
  leaveBtn.onclick = () => K.over('Você saiu com ' + bank + ' fichas', bank);
  K.onKey(c => { if (c === 'Space') spin(); });
  paint(); draw();
  K.loop(dt => {
    if (anim) {
      anim.t += dt;
      const p = Math.min(1, anim.t / anim.dur), e = 1 - Math.pow(1 - p, 3);
      angle = anim.from + (anim.to - anim.from) * e;
      if (p >= 1) { const n = anim.n; anim = null; finish(n); }
    }
    draw();
  });
});

// Dados Poker: cinco dados 3D, tres rolagens e oito categorias de pontuacao.
A.register('dados', K => {
  const T = table(K, 'dados', { icon: '🎲', title: 'Dados Poker', sub: 'Cinco dados · três rolagens · oito categorias' });
  const CAT = [['Par', '👯', d => { for (let v = 6; v >= 1; v--) if (d.filter(x => x == v).length >= 2) return v * 2; return 0; }], ['Dois pares', '👬', d => { const p = [1, 2, 3, 4, 5, 6].filter(v => d.filter(x => x == v).length >= 2); return p.length >= 2 ? p.reduce((s, v) => s + v * 2, 0) : 0; }], ['Trinca', '🎯', d => { for (let v = 6; v >= 1; v--) if (d.filter(x => x == v).length >= 3) return v * 3; return 0; }], ['Sequência (30)', '🪜', d => { const s = [...new Set(d)].sort().join(''); return /12345|23456/.test(s) ? 30 : 0; }], ['Full house (25)', '🏠', d => { const c = [1, 2, 3, 4, 5, 6].map(v => d.filter(x => x == v).length); return c.includes(3) && c.includes(2) ? 25 : 0; }], ['Quadra (40)', '💥', d => [1, 2, 3, 4, 5, 6].some(v => d.filter(x => x == v).length >= 4) ? 40 : 0], ['Yahtzee (50)', '🏆', d => d.every(x => x == d[0]) ? 50 : 0], ['Soma', '➕', d => d.reduce((a, b) => a + b)]];
  let d = Array.from({ length: 5 }, () => A.rand(1, 6)), hold = [0, 0, 0, 0, 0], rolls = 0, used = {}, turns = 0, busy = false;
  const info = A.el('div', 'msg', 'Role até 3 vezes, toque nos dados para segurar e escolha uma categoria.', T);
  const stats = A.el('div', 'dice-stats', null, T);
  const statBox = (label, icon) => {
    const w = A.el('div', 'dice-stat', `<small>${icon} ${label}</small><b>0</b>`, stats);
    return w.querySelector('b');
  };
  const totalEl = statBox('Pontos', '⭐'), roundEl = statBox('Rodada', '🎯'), rollEl = statBox('Rolagens', '🎲');

  const tray = A.el('div', 'dice-tray', null, T);
  const dots = A.el('div', 'dice-dots', null, tray);
  const diceRow = A.el('div', 'dice-row', null, tray);
  const avail = Math.max(200, T.clientWidth - 40), ds = Math.max(42, Math.min(66, Math.floor((avail - 40) / 5)));
  const dice = d.map((v, i) => {
    const die = makeDie(ds); diceRow.appendChild(die.el); die.set(v, false);
    die.el.onclick = () => { if (!rolls || busy) return; hold[i] ^= 1; A.sfx('click'); draw(); };
    return die;
  });
  const heldHint = A.el('div', 'dice-hint', 'Toque num dado para segurá-lo entre as rolagens.', tray);
  const rb = A.el('button', 'gb pri', '🎲 Rolar', T);
  const cat = A.el('div', 'dice-cats', null, T);
  const cs = CAT.map((c, i) => { const b = A.el('button', 'score-cat', '', cat); b.onclick = () => pick(i); return b; });
  const draw = () => {
    dice.forEach((die, i) => {
      die.el.classList.toggle('held', !!hold[i]);
      die.el.dataset.held = hold[i] ? 'SEGURO' : '';
    });
    dots.innerHTML = [0, 1, 2].map(n => '<i class="' + (n < rolls ? 'used' : '') + '"></i>').join('');
    rb.textContent = rolls >= 3 ? '🎲 Sem rolagens' : `🎲 Rolar (${3 - rolls})`;
    rb.disabled = rolls >= 3 || busy;
    cs.forEach((b, i) => {
      const sc = used[i], active = rolls > 0 && sc == null && !busy, pts = CAT[i][2](d);
      b.disabled = !active; b.classList.toggle('pri', active && pts > 0);
      b.classList.toggle('done', sc != null);
      b.innerHTML = '<span class="sc-ico">' + CAT[i][1] + '</span>' +
        '<span class="sc-copy"><b>' + CAT[i][0] + '</b>' +
        (sc != null ? '<small class="sc-done">+' + sc + ' pts</small>' : rolls ? '<small class="' + (pts ? 'sc-pts' : 'sc-zero') + '">' + pts + ' pts</small>' : '<small class="sc-zero">—</small>') +
        '</span>';
    });
    totalEl.textContent = K.score; roundEl.textContent = Math.min(turns + 1, CAT.length) + '/' + CAT.length; rollEl.textContent = rolls + '/3';
  };
  const roll = () => {
    if (rolls >= 3 || busy || K.dead) return;
    busy = true; A.sfx('click'); diceRow.classList.add('rolling');
    const next = d.map((v, i) => hold[i] ? v : A.rand(1, 6));
    dice.forEach((die, i) => { if (!hold[i]) die.set(next[i], true); });
    d = next; rolls++; draw();
    K.after(() => { busy = false; diceRow.classList.remove('rolling'); draw(); }, 760);
  };
  const pick = i => {
    if (rolls <= 0 || used[i] != null || busy) return;
    const pts = CAT[i][2](d); used[i] = pts; K.addScore(pts); A.sfx(pts ? 'coin' : 'hit');
    if (pts >= 30) A.fx.confetti(110, true);
    rolls = 0; hold = [0, 0, 0, 0, 0]; turns++;
    draw();
    if (turns === CAT.length) K.after(() => K.over('Fim das rodadas! 🎲', K.score), 600);
    else info.textContent = pts ? `+${pts} pontos! Role novamente.` : 'Zero pontos… tente outra categoria.';
  };
  rb.onclick = roll;
  K.onKey(code => {
    if (code === 'r' || code === 'R' || code === 'Space') roll();
    const n = Number(code);
    if (n >= 1 && n <= CAT.length) pick(n - 1);
  });
  draw();
});

A.register('solitaire', K => {
  K.low = true; K.fmt = n => n + ' mov.';
  const RED = new Set(['♥', '♦']);
  const SUITS = ['♠', '♥', '♦', '♣'];
  const TIER = ['Aprendiz', 'Clássico', 'Desafio', 'Especialista', 'Mestre'];
  const CAMPAIGN = Array.from({ length: 40 }, (_, i) => {
    const tier = i < 8 ? 0 : i < 16 ? 1 : i < 24 ? 2 : i < 32 ? 3 : 4;
    return {
      seed: (0x9e3779b9 ^ ((i + 1) * 0x85ebca6b)) >>> 0 || 1,
      draw: i < 24 ? 1 : 3,
      passes: tier === 0 ? null : tier === 1 ? 5 : tier === 2 ? 3 : tier === 3 ? 2 : 1,
      tier
    };
  });
  const rng = seed => {
    let x = seed >>> 0;
    return () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  };
  const makeDeck = () => SUITS.flatMap(s => RK.map((r, i) => ({ s, r, v: i + 1, up: false })));
  const shuffled = seed => {
    const a = makeDeck(), r = rng(seed);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const red = c => RED.has(c.s);

  const DECKS = A.cardDecks || [{
    id: 'classic', name: 'Clássico', cost: 0,
    face: 'linear-gradient(155deg,#fff,#e8ebf6)',
    back: A.cardBack || 'url(../images/gpweb.png) center 44%/66% no-repeat, radial-gradient(circle at 50% 28%,#24356f,#070a1a 74%)',
    ink: '#14172a', red: '#d21f3c'
  }];
  const deckId = A.store.get('sol:deck', 'classic');
  const theme = DECKS.find(item => item.id === deckId) || DECKS[0];

  let level = 0, baseMoves = 0, moves = 0, drawCount = 1, passesLeft = null;
  let stock = [], waste = [], found = [[], [], [], []], tab = [[], [], [], [], [], [], []];
  let sel = null, undoStack = [], busy = false, won = false;
  let hint = null, hintTimer = 0, dealFx = false, flash = null, suppressClick = false, drag = null;

  const sol = A.el('div', 'sol', null, K.root);
  function applyTheme(deck) {
    sol.dataset.deck = deck.id;
    sol.style.setProperty('--card-bg', deck.face);
    sol.style.setProperty('--card-back', deck.back);
    sol.style.setProperty('--card-ink', deck.ink);
    sol.style.setProperty('--card-red', deck.red);
  }
  applyTheme(theme);

  const info = A.el('div', 'sol-info', null, sol);
  const top = A.el('div', 'sol-top', null, sol);
  const tableau = A.el('div', 'sol-tableau', null, sol);
  const ctl = A.el('div', 'btns sol-ctl', null, sol);
  const hintBtn = A.el('button', 'gb sol-ico', '💡', ctl);
  const undoBtn = A.el('button', 'gb sol-ico', '↶', ctl);
  const restartBtn = A.el('button', 'gb sol-ico', '↻', ctl);
  const helpBtn = A.el('button', 'gb sol-ico', '?', ctl);
  [['Dica', hintBtn], ['Voltar jogada', undoBtn], ['Reiniciar', restartBtn], ['Como jogar', helpBtn]]
    .forEach(([label, button]) => {
      button.title = label;
      button.setAttribute('aria-label', label);
    });

  const help = A.el('div', 'sol-help', `
    <button class="sol-help-x" type="button" aria-label="Fechar dicas">✕</button>
    <h3>Dicas rápidas</h3>
    <ul>
      <li>Arraste uma carta para o destino <b>ou</b> toque nela e depois no destino.</li>
      <li>Monte sequências com cores alternadas e em ordem decrescente. Só um Rei pode ocupar uma coluna vazia.</li>
      <li>Clique no monte fechado para comprar cartas. Quando ele esvaziar, clique no espaço ↻ para reembaralhar.</li>
      <li><b>↶</b> desfaz o último movimento. <b>💡</b> destaca uma jogada possível. <b>↻</b> reinicia a fase.</li>
    </ul>`, sol);
  help.hidden = true;

  const clone = c => ({ s: c.s, r: c.r, v: c.v, up: c.up });
  const snapshot = () => ({
    stock: stock.map(clone),
    waste: waste.map(clone),
    found: found.map(pile => pile.map(clone)),
    tab: tab.map(pile => pile.map(clone)),
    moves, passesLeft, baseMoves
  });
  const pushUndo = () => {
    undoStack.push(snapshot());
    if (undoStack.length > 240) undoStack.shift();
    undoBtn.disabled = false;
  };
  const cardEl = c => {
    const e = A.el('div', 'scard ' + (c.up ? 'up' : 'down') + (c.up && red(c) ? ' red' : ''), '');
    if (c.up) e.innerHTML = `<span class="corner"><b>${c.r}</b><i>${c.s}</i></span><span class="pip">${c.s}</span>`;
    e.setAttribute('aria-label', c.up ? c.r + ' de ' + c.s : 'carta virada');
    return e;
  };
  const clearHint = () => {
    if (hintTimer) { clearTimeout(hintTimer); hintTimer = 0; }
    if (hint) sol.querySelectorAll('.hint-src,.hint-dst').forEach(el => el.classList.remove('hint-src', 'hint-dst'));
    hint = null;
  };
  const toast = text => {
    const rect = hintBtn.getBoundingClientRect();
    A.fx.floatText(text, rect.left + rect.width / 2, rect.top - 6, '#ffd23f');
  };
  const upd = () => {
    const L = CAMPAIGN[level];
    const passText = L.passes == null ? 'reembaralhe ∞' : 'reembaralhe ' + L.passes;
    info.innerHTML = `<b>Fase ${level + 1}/40</b> · ${TIER[L.tier]} · compre ${L.draw} · ${passText} · <b>${moves}</b> mov. · 🪙 <b class="sol-coin">${A.economy ? A.economy.balance('solitaire') : 0}</b>`;
    K.setScore(baseMoves + moves);
  };
  const canRun = (col, index) => {
    const pile = tab[col];
    if (!pile[index] || !pile[index].up) return false;
    for (let i = index; i < pile.length - 1; i++) {
      const a = pile[i], b = pile[i + 1];
      if (!b.up || a.v !== b.v + 1 || red(a) === red(b)) return false;
    }
    return true;
  };
  const canPlaceOn = (card, col) => {
    const pile = tab[col];
    if (!pile.length) return card.v === 13;
    const last = pile[pile.length - 1];
    return last.up && last.v === card.v + 1 && red(last) !== red(card);
  };
  const canPlaceFound = (card, fi) => {
    const pile = found[fi];
    if (card.s !== SUITS[fi]) return false;
    return pile.length ? card.v === pile[pile.length - 1].v + 1 : card.v === 1;
  };
  const runFor = source => {
    if (!source) return null;
    if (source.type === 'waste') return waste.length ? [waste[waste.length - 1]] : null;
    if (source.type === 'found') {
      const pile = found[source.fi];
      return pile.length ? [pile[pile.length - 1]] : null;
    }
    const pile = tab[source.col];
    return pile.slice(source.index);
  };
  const getRun = () => runFor(sel);
  const removeRun = () => {
    if (sel.type === 'waste') waste.pop();
    else if (sel.type === 'found') found[sel.fi].pop();
    else {
      const pile = tab[sel.col];
      pile.splice(sel.index);
      if (pile.length && !pile[pile.length - 1].up) pile[pile.length - 1].up = true;
    }
  };

  function render() {
    top.innerHTML = '';
    tableau.innerHTML = '';

    const recycle = !stock.length && (passesLeft == null || passesLeft > 0);
    const stockSlot = A.el('div', 'sol-slot sol-stock' + (!stock.length ? ' sol-empty' : '') + (recycle ? ' sol-recycle' : '') + (hint && hint.draw ? ' hint-dst' : ''), '', top);
    if (stock.length) {
      stockSlot.appendChild(cardEl(stock[stock.length - 1]));
      stockSlot.appendChild(A.el('span', 'sol-badge', String(stock.length), stockSlot));
    } else {
      stockSlot.appendChild(A.el('span', 'sol-mark', waste.length ? (recycle ? '↻' : '✕') : '·', stockSlot));
    }
    stockSlot.onclick = drawStock;

    const wasteSlot = A.el('div', 'sol-slot sol-waste' + (sel && sel.type === 'waste' ? ' sel' : ''), '', top);
    if (waste.length) {
      const card = waste[waste.length - 1];
      const el = cardEl(card);
      if (hint && hint.source && hint.source.type === 'waste') el.classList.add('hint-src');
      if (sel && sel.type === 'waste') el.classList.add('sel');
      if (drag && drag.started && drag.source.type === 'waste') el.classList.add('dragging');
      attachDrag(el, { type: 'waste' });
      wasteSlot.appendChild(el);
      if (waste.length > 1) wasteSlot.appendChild(A.el('span', 'sol-badge', String(waste.length), wasteSlot));
    } else wasteSlot.appendChild(A.el('span', 'sol-mark', '·', wasteSlot));
    wasteSlot.onclick = clickWaste;

    A.el('div', 'sol-blank', '', top);

    found.forEach((pile, fi) => {
      const picked = sel && sel.type === 'found' && sel.fi === fi;
      const hinted = hint && hint.target && hint.target.type === 'found' && hint.target.fi === fi;
      const slot = A.el('div', 'sol-slot sol-found' + (picked ? ' sel' : '') + (hinted ? ' hint-dst' : ''), '', top);
      slot.dataset.fi = fi;
      if (pile.length) {
        const el = cardEl(pile[pile.length - 1]);
        if (picked) el.classList.add('sel');
        if (hint && hint.source && hint.source.type === 'found' && hint.source.fi === fi) el.classList.add('hint-src');
        if (flash && flash.type === 'found' && flash.fi === fi) el.classList.add('move-in');
        if (drag && drag.started && drag.source.type === 'found' && drag.source.fi === fi) el.classList.add('dragging');
        attachDrag(el, { type: 'found', fi });
        slot.appendChild(el);
      } else slot.appendChild(A.el('span', 'sol-mark', SUITS[fi], slot));
      slot.onclick = () => clickFoundation(fi);
    });

    tab.forEach((pile, col) => {
      const hinted = hint && hint.target && hint.target.type === 'tab' && hint.target.col === col;
      const colEl = A.el('div', 'sol-col' + (!pile.length ? ' sol-empty-col' : '') + (hinted ? ' hint-dst' : ''), '', tableau);
      colEl.dataset.col = col;
      pile.forEach((card, index) => {
        const el = cardEl(card);
        if (sel && sel.type === 'tab' && sel.col === col && index >= sel.index) el.classList.add('sel');
        if (hint && hint.source && hint.source.type === 'tab' && hint.source.col === col && index >= hint.source.index) el.classList.add('hint-src');
        if (drag && drag.started && drag.source.type === 'tab' && drag.source.col === col && index >= drag.source.index) el.classList.add('dragging');
        if (dealFx) {
          el.classList.add('deal-in');
          el.style.animationDelay = ((col * 2 + index) * 18) + 'ms';
        }
        if (flash && flash.type === 'tab' && flash.col === col && index >= pile.length - flash.count) el.classList.add('move-in');
        el.onclick = event => { if (suppressClick) return; event.stopPropagation(); clickTableau(col, index); };
        if (card.up) attachDrag(el, { type: 'tab', col, index });
        colEl.appendChild(el);
      });
      colEl.onclick = event => { if (suppressClick) return; if (event.target === colEl) clickEmptyCol(col); };
    });

    undoBtn.disabled = !undoStack.length || busy || won;
    hintBtn.disabled = busy || won;
    restartBtn.disabled = busy || won;
    dealFx = false;
    flash = null;
    upd();
  }

  function tryMoveToTableau(col) {
    if (!sel) return false;
    if (sel.type === 'tab' && sel.col === col) return false;
    const run = getRun();
    if (!run || !run.length || !canPlaceOn(run[0], col)) return false;
    pushUndo();
    removeRun();
    run.forEach(card => { card.up = true; tab[col].push(card); });
    moves++; sel = null;
    clearHint();
    flash = { type: 'tab', col, count: run.length };
    A.sfx('step'); render(); checkWin();
    return true;
  }
  function tryMoveToFoundation(fi) {
    if (!sel) return false;
    const run = getRun();
    if (!run || run.length !== 1 || !canPlaceFound(run[0], fi)) return false;
    pushUndo();
    removeRun();
    found[fi].push(run[0]);
    moves++; sel = null;
    clearHint();
    flash = { type: 'found', fi, count: 1 };
    A.sfx('coin'); render(); checkWin();
    return true;
  }
  function checkWin() {
    if (!found.every(pile => pile.length === 13)) return false;
    busy = true; won = true; sel = null;
    const reward = 14 + (level + 2) * 2;
    baseMoves += moves; moves = 0;
    if (K.story) A.story.set('solitaire', Math.min(40, level + 2), level === CAMPAIGN.length - 1);
    if (A.economy) A.economy.earn('solitaire', reward);
    sol.classList.add('won');
    render();
    A.fx.confetti(190, true); A.sfx('win');
    const coinEl = sol.querySelector('.sol-coin');
    if (coinEl) {
      const rect = coinEl.getBoundingClientRect();
      A.fx.floatText('+' + reward + ' 🪙', rect.left + rect.width / 2, rect.top, '#ffd23f');
    }

    if (level === CAMPAIGN.length - 1) {
      K.after(() => K.over('Campanha completa! 🏆', baseMoves), 1200);
    } else if (K.story && K.phaseGate) {
      K.paused = true;
      K.phaseGate({
        level: level + 1,
        total: CAMPAIGN.length,
        next: level + 2,
        subtitle: `+${reward} moedas · próximo baralho embaralhado`,
        onNext: () => {
          sol.classList.remove('won');
          K.paused = false;
          deal(level + 1);
        }
      });
    } else {
      K.banner('FASE ' + (level + 1) + ' CONCLUÍDA', '+' + reward + ' moedas');
      K.after(() => {
        sol.classList.remove('won');
        deal(level + 1);
      }, 1300);
    }
    return true;
  }
  function clickTableau(col, index) {
    if (suppressClick || busy || won) return;
    clearHint();
    const pile = tab[col], card = pile[index];
    if (!card) return clickEmptyCol(col);
    if (!card.up) {
      if (index === pile.length - 1) {
        pushUndo();
        card.up = true; moves++; sel = null;
        flash = { type: 'tab', col, count: 1 };
        A.sfx('click'); render();
      }
      return;
    }
    if (sel) {
      if (sel.type === 'tab' && sel.col === col) {
        sel = sel.index === index ? null : (canRun(col, index) ? { type: 'tab', col, index } : null);
        render();
        return;
      }
      if (tryMoveToTableau(col)) return;
      sel = canRun(col, index) ? { type: 'tab', col, index } : null;
      render();
      return;
    }
    sel = canRun(col, index) ? { type: 'tab', col, index } : null;
    if (!sel) A.sfx('hit');
    render();
  }
  function clickWaste() {
    if (suppressClick || busy || won || !waste.length) return;
    clearHint();
    sel = sel ? null : { type: 'waste' };
    A.sfx('click'); render();
  }
  function clickFoundation(fi) {
    if (suppressClick || busy || won) return;
    clearHint();
    if (!sel) {
      if (found[fi].length) { sel = { type: 'found', fi }; A.sfx('click'); }
      render();
      return;
    }
    if (sel.type === 'found' && sel.fi === fi) { sel = null; render(); return; }
    if (tryMoveToFoundation(fi)) return;
    sel = null; A.sfx('hit'); render();
  }
  function clickEmptyCol(col) {
    if (suppressClick || busy || won) return;
    if (sel) tryMoveToTableau(col);
  }
  function drawStock() {
    if (suppressClick || busy || won) return;
    clearHint();
    if (!stock.length) {
      if (!waste.length) return;
      if (passesLeft === 0) { A.sfx('hit'); return; }
      pushUndo();
      stock = waste.slice().reverse();
      stock.forEach(card => { card.up = false; });
      waste = [];
      if (passesLeft != null) passesLeft--;
      moves++; sel = null; A.sfx('step'); render();
      return;
    }
    pushUndo();
    for (let i = 0; i < drawCount && stock.length; i++) {
      const card = stock.pop();
      card.up = true;
      waste.push(card);
    }
    moves++; sel = null; A.sfx('step'); render();
  }
  function undo() {
    if (drag || busy || won || !undoStack.length) return;
    clearHint();
    const s = undoStack.pop();
    stock = s.stock; waste = s.waste; found = s.found; tab = s.tab;
    moves = s.moves; passesLeft = s.passesLeft; baseMoves = s.baseMoves;
    sel = null; A.sfx('step'); render();
  }
  function deal(nextLevel) {
    if (drag) return;
    level = Math.max(0, Math.min(CAMPAIGN.length - 1, Number(nextLevel) || 0));
    const L = CAMPAIGN[level];
    drawCount = L.draw; passesLeft = L.passes;
    const deck = shuffled(L.seed);
    tab = [[], [], [], [], [], [], []];
    found = [[], [], [], []];
    waste = []; stock = []; sel = null; moves = 0; busy = false; won = false; undoStack = [];
    hint = null; flash = null;
    if (hintTimer) { clearTimeout(hintTimer); hintTimer = 0; }
    sol.classList.remove('won');
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck.pop();
        card.up = row === col;
        tab[col].push(card);
      }
    }
    stock = deck;
    dealFx = true;
    render();
  }

  /* -------------------------------------------------------------------------
     DICAS
     Procura a melhor jogada disponível e destaca origem/destino por alguns
     segundos. Se não houver jogada, aponta para o monte.
     ------------------------------------------------------------------------- */
  function showHint() {
    if (drag || busy || won) return;
    clearHint();
    const options = [];
    const add = (score, source, target) => options.push({ score, source, target });

    if (waste.length) {
      const card = waste[waste.length - 1];
      for (let fi = 0; fi < 4; fi++) {
        if (canPlaceFound(card, fi)) add(130, { type: 'waste' }, { type: 'found', fi });
      }
      for (let col = 0; col < 7; col++) {
        if (canPlaceOn(card, col)) add(70, { type: 'waste' }, { type: 'tab', col });
      }
    }

    tab.forEach((pile, col) => {
      for (let index = 0; index < pile.length; index++) {
        if (!pile[index].up || !canRun(col, index)) continue;
        const run = pile.slice(index);
        const card = run[0];
        if (run.length === 1) {
          for (let fi = 0; fi < 4; fi++) {
            if (canPlaceFound(card, fi)) add(card.v === 1 ? 160 : 110, { type: 'tab', col, index }, { type: 'found', fi });
          }
        }
        for (let to = 0; to < 7; to++) {
          if (to === col || !canPlaceOn(card, to)) continue;
          let score = 20;
          if (index > 0 && !pile[index - 1].up) score += 80;
          if (index === 0) score += 30;
          add(score, { type: 'tab', col, index }, { type: 'tab', col: to });
        }
      }
    });

    options.sort((a, b) => b.score - a.score);
    if (options.length) {
      hint = { source: options[0].source, target: options[0].target };
      A.sfx('click');
      render();
      hintTimer = setTimeout(() => {
        hint = null;
        hintTimer = 0;
        if (!K.dead) render();
      }, 4200);
      return;
    }

    if (stock.length || (waste.length && (passesLeft == null || passesLeft > 0))) {
      hint = { draw: true };
      A.sfx('click');
      render();
      toast('Sem jogadas visíveis — compre uma carta');
      hintTimer = setTimeout(() => {
        hint = null;
        hintTimer = 0;
        if (!K.dead) render();
      }, 3200);
      return;
    }

    A.sfx('hit');
    toast('Sem jogadas. Volte uma jogada ou reinicie.');
  }

  /* -------------------------------------------------------------------------
     ARRASTAR E SOLTAR (mouse e toque)
     A carta (ou sequência) vira um "fantasma" que segue o dedo/mouse. O destino
     fica verde quando aceita a jogada e vermelho quando não aceita. Tocar sem
     arrastar continua selecionando a carta normalmente.
     ------------------------------------------------------------------------- */
  function canDragSource(source) {
    if (source.type === 'waste') return waste.length > 0;
    if (source.type === 'found') return found[source.fi].length > 0;
    const pile = tab[source.col];
    return !!(pile[source.index] && pile[source.index].up && canRun(source.col, source.index));
  }
  function attachDrag(element, source) {
    element.addEventListener('pointerdown', event => startDrag(event, source, element));
  }
  function startDrag(event, source, element) {
    if (busy || won || drag) return;
    if (event.button && event.button !== 0) return;
    if (!canDragSource(source)) return;
    const run = runFor(source);
    if (!run || !run.length) return;
    const rect = element.getBoundingClientRect();
    drag = {
      source, run, pointerId: event.pointerId,
      startX: event.clientX, startY: event.clientY,
      offX: event.clientX - rect.left, offY: event.clientY - rect.top,
      started: false, ghost: null, target: null, targetEl: null, srcEl: element
    };
    addEventListener('pointermove', onDragMove, { passive: false });
    addEventListener('pointerup', onDragEnd);
    addEventListener('pointercancel', onDragEnd);
  }
  function makeGhost() {
    const ghost = A.el('div', 'sol-ghost');
    const width = Math.max(46, Math.min(90, drag.srcEl.getBoundingClientRect().width));
    const height = Math.round(width * 1.4);
    ghost.style.width = width + 'px';
    ghost.style.setProperty('--card-bg', theme.face);
    ghost.style.setProperty('--card-back', theme.back);
    ghost.style.setProperty('--card-ink', theme.ink);
    ghost.style.setProperty('--card-red', theme.red);
    drag.run.forEach((card, index) => {
      const el = cardEl(card);
      if (index) el.style.marginTop = -(height - 18) + 'px';
      ghost.appendChild(el);
    });
    document.body.appendChild(ghost);
    drag.ghost = ghost;
  }
  function positionGhost(x, y) {
    if (!drag || !drag.ghost) return;
    drag.ghost.style.left = (x - drag.offX) + 'px';
    drag.ghost.style.top = (y - drag.offY) + 'px';
  }
  function findTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el || !el.closest) return { el: null, target: null };
    const colEl = el.closest('.sol-col');
    if (colEl && colEl.dataset.col != null) return { el: colEl, target: { type: 'tab', col: Number(colEl.dataset.col) } };
    const foundEl = el.closest('.sol-found');
    if (foundEl && foundEl.dataset.fi != null) return { el: foundEl, target: { type: 'found', fi: Number(foundEl.dataset.fi) } };
    return { el: null, target: null };
  }
  function targetAccepts(source, target) {
    if (!source || !target) return false;
    const run = runFor(source);
    if (!run || !run.length) return false;
    if (target.type === 'tab') {
      if (source.type === 'tab' && source.col === target.col) return false;
      return canPlaceOn(run[0], target.col);
    }
    return run.length === 1 && canPlaceFound(run[0], target.fi);
  }
  function updateDropTarget(x, y) {
    if (!drag) return;
    const hit = findTarget(x, y);
    if (drag.targetEl && drag.targetEl !== hit.el) drag.targetEl.classList.remove('drop-ok', 'drop-bad');
    drag.targetEl = hit.el;
    drag.target = hit.target;
    if (!drag.targetEl || !drag.target) return;
    const ok = targetAccepts(drag.source, drag.target);
    drag.targetEl.classList.add(ok ? 'drop-ok' : 'drop-bad');
  }
  function onDragMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.started) {
      if (Math.hypot(dx, dy) < 7) return;
      drag.started = true;
      suppressClick = true;
      clearHint();
      drag.srcEl.classList.add('dragging');
      if (drag.source.type === 'tab') {
        const colEl = tableau.children[drag.source.col];
        if (colEl) Array.from(colEl.children).forEach((child, index) => {
          if (index >= drag.source.index) child.classList.add('dragging');
        });
      }
      makeGhost();
    }
    event.preventDefault();
    positionGhost(event.clientX, event.clientY);
    updateDropTarget(event.clientX, event.clientY);
  }
  function onDragEnd(event) {
    if (!drag || (event && event.pointerId != null && event.pointerId !== drag.pointerId)) return;
    removeEventListener('pointermove', onDragMove);
    removeEventListener('pointerup', onDragEnd);
    removeEventListener('pointercancel', onDragEnd);
    const active = drag;
    drag = null;
    if (active.ghost) active.ghost.remove();
    if (active.targetEl) active.targetEl.classList.remove('drop-ok', 'drop-bad');
    active.srcEl.classList.remove('dragging');
    if (active.source.type === 'tab') {
      const colEl = tableau.children[active.source.col];
      if (colEl) Array.from(colEl.children).forEach(child => child.classList.remove('dragging'));
    }
    if (!active.started) return;
    setTimeout(() => { suppressClick = false; }, 0);
    if (active.target && targetAccepts(active.source, active.target)) {
      sel = active.source;
      if (active.target.type === 'tab') tryMoveToTableau(active.target.col);
      else tryMoveToFoundation(active.target.fi);
    } else {
      A.sfx('hit');
    }
  }

  hintBtn.onclick = showHint;
  helpBtn.onclick = () => {
    help.hidden = !help.hidden;
    A.sfx('click');
  };
  help.querySelector('.sol-help-x').onclick = () => {
    help.hidden = true;
    A.sfx('click');
  };
  undoBtn.onclick = undo;
  restartBtn.onclick = () => { if (!busy && !won) deal(level); };
  K.on(window, 'keydown', event => {
    if (K.dead || K.paused) return;
    if (event.key === 'z' || event.key === 'Z') undo();
    if (event.key === 'r' || event.key === 'R') { if (!busy && !won) deal(level); }
    if (event.key === 'h' || event.key === 'H') showHint();
  });

  const saved = K.story ? A.story.get('solitaire') : null;
  const startIndex = saved ? Math.min(CAMPAIGN.length - 1, Math.max(0, saved.level - 1)) : 0;
  deal(startIndex);
});
})();
