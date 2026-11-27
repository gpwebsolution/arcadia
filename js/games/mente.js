/* =============================================================================
   ARCADIA - PALAVRAS E MENTE
   -----------------------------------------------------------------------------
   Este arquivo traz listas de palavras e um teclado virtual reutilizavel.
   A funcao keyboard() desenha o teclado na tela e physical() escuta o teclado
   real, para que os mesmos jogos funcionem no computador e no celular.

   Jogos: Termo, Forca, Palavra Embaralhada, Teste de Digitacao, Matematica
   Relampago, Adivinhe o Numero, Quiz Geral e Quiz de Bandeiras.
   ============================================================================= */
(function () {
const A = Arcadia;
const W5 = ('ABRIR AMIGO ANTES BANCO BARCO BEIJO BRAVO CAIXA CAMPO CARRO CASAL CERTO CHAVE CHUVA CINCO CLARO COISA CORPO CURSO DANCA DENTE DOCES ENTRE FAROL FESTA FILHO FORCA FRUTA GALHO GENTE GRAMA GRUPO HOMEM HORAS IDEIA JOGAR LIVRO LONGE MACIO MANHA MARCA MEDIA MENTE METRO MORTE MUNDO NOITE NUVEM OBRAS OLHAR ONTEM PAPEL PEDRA PEIXE PIANO PLANO PORTA PRAIA PRATO PRAZO QUASE RADIO RAIVA REGRA RISCO ROUPA SABER SALAO SENHA SERIE SINAL SOLTO SONHO TARDE TEMPO TERRA TIGRE TINTA TORRE TREMO TURMA UNIAO VALOR VENTO VERDE VIDRO VISTA VOLTA ZEBRA NOBRE CALMA FALAR GOSTO LINDO MOTOR NAVIO PONTE SALTO TROCA USADO VELHO').split(' ').filter(w => w.length == 5);
const WL = ('COMPUTADOR TECLADO JOGADOR AVENTURA CAMINHO ESCOLA AMARELO CACHORRO PASSARO BORBOLETA MONTANHA CHOCOLATE FUTEBOL BRINCADEIRA ESTRELA FLORESTA PRESENTE ELEFANTE GIRAFA ABACAXI BANANA LARANJA MORANGO JANELA CADEIRA TELEFONE BICICLETA PLANETA FOGUETE DINOSSAURO PIRATA TESOURO CASTELO DRAGAO PRINCESA FANTASMA CAMISETA SORVETE PIPOCA MACACO TARTARUGA CAMINHAO RELOGIO GUARDACHUVA TROVAO ARCOIRIS CAPIVARA').split(' ');
const KB = ['QWERTYUIOP', 'ASDFGHJKL', '⏎ZXCVBNM⌫'];
const keyboard = (root, onKey) => {
  const kb = A.el('div', '', '', root); kb.style.cssText = 'display:flex;flex-direction:column;gap:6px;align-items:center'; const m = {};
  KB.forEach(r => { const row = A.el('div', '', '', kb); row.style.cssText = 'display:flex;gap:5px'; [...r].forEach(ch => { const b = A.el('button', 'gb', ch, row); b.style.cssText = `padding:0;width:${Math.max(20, Math.min(34, Math.floor((Math.min(innerWidth, 520) - 100) / 10)))}px;height:42px;font-size:14px`; b.onclick = () => onKey(ch); m[ch] = b; }); });
  return m;
};
const physical = (K, fn) => K.on(window, 'keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey || /INPUT/.test(e.target.tagName)) return; const k = e.key; if (/^[a-zA-Z]$/.test(k)) fn(k.toUpperCase()); else if (k == 'Enter') fn('⏎'); else if (k == 'Backspace') fn('⌫'); });

// Termo: seis tentativas para acertar a palavra de cinco letras; teclado colorido.
A.register('wordle', K => {
  const T = A.pick(W5), sz = Math.min(54, Math.floor((Math.min(innerWidth, 520) - 80) / 5)); let rows = [], cur = '', done = false;
  const msg = A.el('div', 'msg', 'Descubra a palavra de 5 letras em 6 tentativas.', K.root), box = A.el('div', 'board', null, K.root); box.style.cssText = `grid-template-columns:repeat(5,${sz}px);gap:5px`;
  const tiles = Array.from({ length: 30 }, () => A.el('div', 'cellb', '', box));
  const ev = g => { const r = Array(5).fill('a'), cnt = {};[...T].forEach((c, i) => { if (g[i] == c) r[i] = 'c'; else cnt[c] = (cnt[c] || 0) + 1; });[...g].forEach((c, i) => { if (r[i] != 'c' && cnt[c] > 0) { r[i] = 'p'; cnt[c]--; } }); return r; };
  const COL = { c: '#3a9d5d', p: '#c9a227', a: '#3a3f5c' };
  const draw = () => tiles.forEach((t, i) => { const r = Math.floor(i / 5), c = i % 5; let ch = '', bg = 'rgba(255,255,255,.07)'; if (r < rows.length) { ch = rows[r].g[c]; bg = COL[rows[r].e[c]]; } else if (r == rows.length) ch = cur[c] || ''; t.textContent = ch; t.style.cssText = `width:${sz}px;height:${sz}px;font-size:${sz * .5}px;background:${bg}`; });
  const keys = keyboard(K.root, k => press(k));
  const press = k => {
    if (done) return; if (k == '⌫') cur = cur.slice(0, -1); else if (k == '⏎') {
      if (cur.length < 5) return; const e = ev(cur); rows.push({ g: cur, e });
      [...cur].forEach((ch, i) => { const b = keys[ch], rank = { c: 3, p: 2, a: 1 }; if (b && (rank[e[i]] > (+b.dataset.r || 0))) { b.dataset.r = rank[e[i]]; b.style.background = COL[e[i]]; } });
      A.sfx('click'); const g = cur; cur = '';
      if (g == T) { done = true; draw(); return K.over('Acertou! 🎉', (7 - rows.length) * 100); }
      if (rows.length == 6) { done = true; draw(); return K.over('A palavra era ' + T, 0, true); }
    } else if (cur.length < 5) cur += k; draw();
  };
  physical(K, press); draw();
});

// Forca: palavras longas, seis erros permitidos e teclado na tela/fisico.
A.register('hangman', K => {
  let word, used, miss; const parts = ['<circle cx="100" cy="62" r="14"/>', '<line x1="100" y1="76" x2="100" y2="120"/>', '<line x1="100" y1="86" x2="82" y2="106"/>', '<line x1="100" y1="86" x2="118" y2="106"/>', '<line x1="100" y1="120" x2="84" y2="148"/>', '<line x1="100" y1="120" x2="116" y2="148"/>'];
  const svg = A.el('div', '', '', K.root), wd = A.el('div', 'msg', '', K.root); wd.style.cssText = 'font-size:30px;letter-spacing:6px;font-family:monospace;min-height:40px';
  const keys = keyboard(K.root, k => press(k));
  const draw = () => { svg.innerHTML = `<svg width="200" height="170" viewBox="0 0 200 170" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"><path d="M20 160H120M50 160V10H100V48" stroke="#9aa0c8"/>${parts.slice(0, miss).join('')}</svg>`; wd.textContent = [...word].map(c => used.has(c) ? c : '_').join(' '); };
  const next = () => { word = A.pick(WL.filter(w => w.length >= 6)); used = new Set(); miss = 0; Object.values(keys).forEach(b => { b.disabled = false; b.style.opacity = 1; }); draw(); };
  const press = k => {
    if (!/^[A-Z]$/.test(k) || used.has(k)) return; used.add(k); keys[k].disabled = true; keys[k].style.opacity = .35;
    if (!word.includes(k)) { miss++; A.sfx('hit'); } else A.sfx('click'); draw();
    if (miss >= parts.length) return K.over('A palavra era ' + word + ' · ' + K.score + ' acertadas');
    if ([...word].every(c => used.has(c))) { K.addScore(1); A.sfx('win'); K.after(next, 700); }
  };
  physical(K, press); next();
});

// Palavra Embaralhada: 60 segundos, cada acerto soma pontos e ganha 3 segundos.
A.register('anagram', K => {
  let t = 60, w, ans;
  const info = A.el('div', 'msg', '', K.root), sc = A.el('div', '', '', K.root); sc.style.cssText = 'font-size:44px;letter-spacing:8px;font-weight:800;color:#ffd23f';
  const inp = A.el('input', '', '', K.root); inp.placeholder = 'Digite a palavra'; inp.autocomplete = 'off'; inp.style.cssText = 'padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font:600 20px Outfit,sans-serif;text-align:center;text-transform:uppercase;width:260px;outline:0';
  const sk = A.el('button', 'gb', 'Pular (-5s)', K.root);
  const next = () => { w = A.pick(WL.concat(W5)); let s; do s = A.shuffle([...w]).join(''); while (s == w); sc.textContent = s; inp.value = ''; inp.focus(); };
  const upd = () => info.textContent = `⏱ ${t}s`;
  inp.oninput = () => { if (inp.value.toUpperCase().trim() == w) { K.addScore(10 + w.length); t += 3; A.sfx('coin'); upd(); next(); } };
  sk.onclick = () => { t = Math.max(0, t - 5); upd(); next(); };
  K.every(() => { t--; upd(); if (t <= 0) K.over('Tempo esgotado!'); }, 1000); upd(); next();
});

// Teste de Digitacao: 60 segundos digitando palavras; calcula palavras por minuto.
A.register('typing', K => {
  const words = A.shuffle(WL.concat(W5)).map(w => w.toLowerCase()); let i = 0, ok = 0, t = 60, started = false;
  const info = A.el('div', 'msg', 'Digite as palavras e aperte espaço. Você tem 60s!', K.root), box = A.el('div', '', '', K.root); box.style.cssText = 'max-width:520px;font-size:22px;line-height:2;background:rgba(255,255,255,.06);padding:14px 18px;border-radius:14px;min-height:130px';
  const inp = A.el('input', '', '', K.root); inp.autocomplete = 'off'; inp.autocapitalize = 'off'; inp.style.cssText = 'padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font:600 20px Outfit,sans-serif;width:260px;outline:0;text-align:center'; inp.focus();
  const res = []; const draw = () => { box.innerHTML = words.slice(i, i + 16).map((w, k) => `<span style="padding:2px 6px;border-radius:6px;${k == 0 ? 'background:#7c5cff' : 'color:#9aa0c8'}">${w}</span>`).join(' '); };
  inp.oninput = () => {
    if (!started) { started = true; K.every(() => { t--; info.textContent = '⏱ ' + t + 's'; if (t <= 0) K.over('Tempo! ' + ok + ' palavras'); }, 1000); }
    if (inp.value.endsWith(' ')) { if (inp.value.trim() == words[i]) { ok++; K.setScore(ok); A.sfx('click'); } else A.sfx('hit'); i++; inp.value = ''; draw(); }
    box.firstChild && (box.firstChild.style.background = words[i].startsWith(inp.value.trim()) ? '#7c5cff' : '#c0392b');
  };
  K.fmt = n => n + ' ppm'; draw();
});

// Matematica Relampago: 45 segundos, contas ficam mais dificeis conforme a pontuacao.
A.register('mathrush', K => {
  let t = 45, streak = 0, ans; const info = A.el('div', 'msg', '', K.root), q = A.el('div', '', '', K.root); q.style.cssText = 'font-size:56px;font-weight:800;margin:8px 0';
  const opts = A.el('div', 'btns', null, K.root); opts.style.cssText += ';max-width:340px';
  const upd = () => info.textContent = `⏱ ${t}s   🔥 ${streak}`;
  const next = () => {
    const lv = Math.min(3, 1 + Math.floor(K.score / 150)), op = A.pick(['+', '-', '×']); let a = A.rand(2, 9 * lv + 3), b = A.rand(2, 9 * lv + 3);
    if (op == '×') { a = A.rand(2, 9 + lv * 2); b = A.rand(2, 9); } if (op == '-' && b > a) [a, b] = [b, a];
    ans = op == '+' ? a + b : op == '-' ? a - b : a * b; q.textContent = `${a} ${op} ${b}`;
    const s = new Set([ans]); while (s.size < 4) s.add(ans + A.rand(-9, 9) || ans + 11); opts.innerHTML = '';
    A.shuffle([...s]).forEach(v => { const bt = A.el('button', 'gb', v, opts); bt.style.cssText = 'font-size:26px;width:150px;padding:14px'; bt.onclick = () => { if (v == ans) { streak++; K.addScore(10 + Math.min(streak, 10)); t = Math.min(60, t + 1); A.sfx('coin'); } else { streak = 0; t -= 4; A.sfx('hit'); } upd(); next(); }; });
  };
  K.every(() => { t--; upd(); if (t <= 0) K.over('Tempo esgotado!'); }, 1000); upd(); next();
});

// Adivinhe o Numero: de 1 a 100; cada chute reduz o intervalo (busca binaria).
A.register('guess', K => {
  K.low = true; K.fmt = n => n + ' tent.';
  const n = A.rand(1, 100); let lo = 1, hi = 100, tries = 0;
  const info = A.el('div', 'msg', 'Estou pensando em um número de 1 a 100…', K.root), rg = A.el('div', '', '', K.root); rg.style.cssText = 'font-size:40px;font-weight:800';
  const inp = A.el('input', '', '', K.root); inp.type = 'number'; inp.style.cssText = 'padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font:700 24px Outfit;width:140px;text-align:center;outline:0'; inp.focus();
  const bt = A.el('button', 'gb pri', 'Chutar', K.root), hist = A.el('div', '', '', K.root); hist.style.cssText = 'color:#9aa0c8;max-width:420px;text-align:center';
  const upd = () => rg.textContent = `${lo} — ${hi}`;
  const go = () => {
    const v = +inp.value; if (!v || v < 1 || v > 100) return; tries++; K.setScore(tries); inp.value = '';
    if (v == n) return K.over('Acertou! 🎯', tries);
    if (v < n) { lo = Math.max(lo, v + 1); info.textContent = '⬆ Maior que ' + v; } else { hi = Math.min(hi, v - 1); info.textContent = '⬇ Menor que ' + v; }
    hist.textContent += v + '  '; A.sfx('click'); upd();
  };
  bt.onclick = go; inp.onkeydown = e => { if (e.key == 'Enter') go(); }; upd();
});

const QS = [['Qual é a capital do Brasil?', 'Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'], ['Quantos planetas tem o Sistema Solar?', '8', '7', '9', '10'], ['Qual é o maior oceano do mundo?', 'Pacífico', 'Atlântico', 'Índico', 'Ártico'], ['Quem pintou a Mona Lisa?', 'Leonardo da Vinci', 'Michelangelo', 'Van Gogh', 'Picasso'], ['Qual é o maior animal terrestre?', 'Elefante-africano', 'Girafa', 'Rinoceronte', 'Hipopótamo'], ['Em que ano o homem pisou na Lua pela primeira vez?', '1969', '1959', '1975', '1981'], ['Qual é o símbolo químico do ouro?', 'Au', 'Ag', 'Go', 'Or'], ['Quantos jogadores um time de futebol tem em campo?', '11', '10', '12', '9'], ['Qual é o maior rio do Brasil em volume de água?', 'Amazonas', 'São Francisco', 'Paraná', 'Tocantins'], ['Quem escreveu "Dom Casmurro"?', 'Machado de Assis', 'José de Alencar', 'Clarice Lispector', 'Graciliano Ramos'], ['Qual é o menor país do mundo?', 'Vaticano', 'Mônaco', 'Malta', 'San Marino'], ['Quantos lados tem um hexágono?', '6', '5', '7', '8'], ['Qual planeta é conhecido como Planeta Vermelho?', 'Marte', 'Vênus', 'Júpiter', 'Mercúrio'], ['Qual é a língua mais falada do mundo por falantes nativos?', 'Mandarim', 'Inglês', 'Espanhol', 'Hindi'], ['Em que continente fica o Egito?', 'África', 'Ásia', 'Europa', 'Oceania'], ['Quanto é 7 × 8?', '56', '54', '48', '63'], ['Quem comandou a esquadra que chegou ao Brasil em 1500?', 'Pedro Álvares Cabral', 'Cristóvão Colombo', 'Vasco da Gama', 'Américo Vespúcio'], ['Qual gás as plantas absorvem na fotossíntese?', 'Gás carbônico', 'Oxigênio', 'Nitrogênio', 'Hidrogênio'], ['Qual é o osso mais longo do corpo humano?', 'Fêmur', 'Tíbia', 'Úmero', 'Costela'], ['Quantas cores tem o arco-íris?', '7', '6', '8', '5'], ['Qual é a capital da França?', 'Paris', 'Lyon', 'Marselha', 'Bordeaux'], ['Qual país tem formato de bota?', 'Itália', 'Espanha', 'Grécia', 'Portugal'], ['Qual é o maior deserto quente do mundo?', 'Saara', 'Gobi', 'Atacama', 'Kalahari'], ['Qual é o ponto mais alto da Terra?', 'Monte Everest', 'K2', 'Aconcágua', 'Kilimanjaro'], ['Quem escreveu "O Pequeno Príncipe"?', 'Antoine de Saint-Exupéry', 'Julio Verne', 'Monteiro Lobato', 'Hans Andersen'], ['Qual metal é líquido à temperatura ambiente?', 'Mercúrio', 'Chumbo', 'Alumínio', 'Ferro']];
const choice = (K, fmtQ, pool, opts) => {
  const head = A.el('div', 'msg', '', K.root), q = A.el('div', '', '', K.root); q.style.cssText = 'font-size:24px;font-weight:700;text-align:center;max-width:480px;min-height:70px;display:grid;place-items:center';
  const box = A.el('div', '', '', K.root); box.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:480px';
  let busy = false;
  return { head, show(item, answers, ok, done) {
    busy = false; fmtQ(q, item); box.innerHTML = '';
    A.shuffle(answers).forEach(a => { const b = A.el('button', 'gb', a, box); b.style.cssText = 'padding:14px 8px;font-size:16px'; b.onclick = () => { if (busy) return; busy = true; const right = a == ok; b.style.background = right ? '#3a9d5d' : '#c0392b'; [...box.children].forEach(x => x.textContent == ok && (x.style.background = '#3a9d5d')); A.sfx(right ? 'coin' : 'hit'); K.after(() => done(right), 800); }; });
  } };
};

// Quiz Geral: dez perguntas sorteadas de um banco de conhecimentos gerais.
A.register('quiz', K => {
  const qs = A.shuffle(QS).slice(0, 10); let i = 0;
  const c = choice(K, (q, it) => q.textContent = it[0]);
  const next = () => { if (i >= qs.length) return K.over('Fim do quiz! 🧠'); const it = qs[i]; c.head.textContent = `Pergunta ${i + 1}/${qs.length}`; c.show(it, it.slice(1), it[1], r => { if (r) K.addScore(10); i++; next(); }); };
  next();
});

// Quiz de Bandeiras: reconheca o pais pela bandeira (imagens do flagcdn).
A.register('flags', K => {
  const F = { br: 'Brasil', ar: 'Argentina', us: 'Estados Unidos', jp: 'Japão', fr: 'França', de: 'Alemanha', it: 'Itália', es: 'Espanha', pt: 'Portugal', gb: 'Reino Unido', ca: 'Canadá', mx: 'México', cn: 'China', in: 'Índia', ru: 'Rússia', au: 'Austrália', za: 'África do Sul', eg: 'Egito', kr: 'Coreia do Sul', cl: 'Chile', co: 'Colômbia', uy: 'Uruguai', se: 'Suécia', no: 'Noruega', gr: 'Grécia', tr: 'Turquia', ng: 'Nigéria', pe: 'Peru', nl: 'Países Baixos', ch: 'Suíça' };
  let lives = 3; const keys = Object.keys(F);
  const c = choice(K, (q, code) => q.innerHTML = `<img src="https://flagcdn.com/w160/${code}.png" alt="bandeira" style="height:90px;border-radius:6px;box-shadow:0 4px 14px #0008">`);
  const next = () => { const code = A.pick(keys), ans = new Set([F[code]]); while (ans.size < 4) ans.add(F[A.pick(keys)]); c.head.textContent = '♥'.repeat(lives) + ' · De que país é esta bandeira?'; c.show(code, [...ans], F[code], r => { if (r) K.addScore(10); else if (--lives <= 0) return K.over('Fim de jogo'); next(); }); };
  next();
});
})();
