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

/* Arena compartilhada do Lote 3C. */
const arena = (K, opts) => {
  const wrap = A.el('div', 'arena arena--mind ' + (opts.cls || ''), '', K.root);
  const head = A.el('div', 'arena-head', '', wrap);
  A.el('div', 'arena-ico', opts.icon || '🧠', head);
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

const keyboard = (parent, onKey) => {
  const kb = A.el('div', 'wordle-keyboard', '', parent);
  const map = {};
  KB.forEach(row => {
    const r = A.el('div', 'wordle-row', '', kb);
    [...row].forEach(ch => {
      const wide = ch === '⏎' || ch === '⌫';
      const b = A.el('button', 'wordle-key' + (wide ? ' wide' : ''), ch, r);
      b.type = 'button';
      b.onclick = () => onKey(ch);
      map[ch] = b;
    });
  });
  return map;
};

const physical = (K, fn) => K.on(window, 'keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key;
  if (/^[a-zA-Z]$/.test(k)) fn(k.toUpperCase());
  else if (k === 'Enter') fn('⏎');
  else if (k === 'Backspace') fn('⌫');
});

// Termo: seis tentativas para acertar a palavra de cinco letras; teclado colorido.
A.register('wordle', K => {
  const ui = arena(K, {
    icon: '🔤',
    title: 'Termo',
    sub: 'Descubra a palavra de 5 letras em 6 tentativas'
  });
  const sTry = stat(ui.stats, 'Tentativa', '🔁');
  const sScore = stat(ui.stats, 'Pontos', '🏆');
  const grid = A.el('div', 'wordle-grid', '', ui.body);
  const hint = A.el('p', 'arena-hint', 'Digite uma palavra de 5 letras e confirme.', ui.body);

  const T = A.pick(W5);
  const tiles = Array.from({ length: 30 }, () => A.el('div', 'wordle-tile', '', grid));
  const rows = [];
  let cur = '', done = false;

  const evaluate = g => {
    const r = Array(5).fill('a');
    const cnt = {};
    [...T].forEach((c, i) => {
      if (g[i] === c) r[i] = 'c';
      else cnt[c] = (cnt[c] || 0) + 1;
    });
    [...g].forEach((c, i) => {
      if (r[i] !== 'c' && cnt[c] > 0) {
        r[i] = 'p';
        cnt[c]--;
      }
    });
    return r;
  };

  const draw = () => {
    tiles.forEach((t, i) => {
      const r = Math.floor(i / 5), c = i % 5;
      t.className = 'wordle-tile';
      let ch = '';
      if (r < rows.length) {
        ch = rows[r].g[c];
        t.classList.add({ c: 'correct', p: 'present', a: 'absent' }[rows[r].e[c]]);
      } else if (r === rows.length) {
        ch = cur[c] || '';
        if (ch) t.classList.add('filled');
      }
      t.textContent = ch;
    });
    sTry.textContent = Math.min(rows.length + (done ? 0 : 1), 6) + '/6';
  };

  const reveal = r => {
    for (let c = 0; c < 5; c++) {
      const t = tiles[r * 5 + c];
      t.classList.add('reveal');
      t.style.animationDelay = (c * 55) + 'ms';
    }
  };

  const keys = keyboard(ui.body, k => press(k));

  const press = k => {
    if (done) return;
    if (k === '⌫') {
      cur = cur.slice(0, -1);
    } else if (k === '⏎') {
      if (cur.length < 5) {
        hint.textContent = 'A palavra precisa ter 5 letras.';
        K.shake(160);
        return;
      }
      const g = cur;
      const e = evaluate(g);
      rows.push({ g, e });
      cur = '';
      A.sfx('click');
      draw();
      reveal(rows.length - 1);
      [...g].forEach((ch, i) => {
        const b = keys[ch];
        const rank = { c: 3, p: 2, a: 1 };
        if (b && rank[e[i]] > (+b.dataset.r || 0)) {
          b.dataset.r = rank[e[i]];
          b.classList.remove('correct', 'present', 'absent');
          b.classList.add({ c: 'correct', p: 'present', a: 'absent' }[e[i]]);
        }
      });
      if (g === T) {
        done = true;
        draw();
        return K.over('Acertou! 🎉', (7 - rows.length) * 100);
      }
      if (rows.length === 6) {
        done = true;
        draw();
        return K.over('A palavra era ' + T, 0, true);
      }
      hint.textContent = 'Continue! Você tem ' + (6 - rows.length) + ' tentativa(s).';
    } else if (cur.length < 5) {
      cur += k;
    }
    draw();
  };

  physical(K, press);
  sTry.textContent = '1/6';
  sScore.textContent = '0';
  draw();
});

// Forca: palavras longas, seis erros permitidos e teclado na tela/fisico.
A.register('hangman', K => {
  const ui = arena(K, {
    icon: '🪢',
    title: 'Forca',
    sub: 'Adivinhe a palavra antes de completar o boneco'
  });
  const sMiss = stat(ui.stats, 'Erros', '❌');
  const sScore = stat(ui.stats, 'Acertos', '🏆');
  const sWord = stat(ui.stats, 'Letras', '🔤');
  const fig = A.el('div', 'hangman-figure', '', ui.body);
  const wordBox = A.el('div', 'hangman-word', '', ui.body);
  const hint = A.el('p', 'arena-hint', 'Escolha uma letra.', ui.body);

  const parts = [
    '<circle cx="100" cy="62" r="14"/>',
    '<line x1="100" y1="76" x2="100" y2="120"/>',
    '<line x1="100" y1="86" x2="82" y2="106"/>',
    '<line x1="100" y1="86" x2="118" y2="106"/>',
    '<line x1="100" y1="120" x2="84" y2="148"/>',
    '<line x1="100" y1="120" x2="116" y2="148"/>'
  ];

  let word = '', used = new Set(), miss = 0;
  const keys = keyboard(ui.body, k => press(k));

  const draw = () => {
    fig.innerHTML = `<svg viewBox="0 0 200 170" style="width:100%;height:auto;display:block" fill="none" stroke-linecap="round">
      <path d="M20 160H120M50 160V10H100V48" stroke="#9aa0c8" stroke-width="4"/>
      ${parts.slice(0, miss).map(p => p.replace('/>', ' class="hg-part"/>')).join('')}
    </svg>`;
    wordBox.innerHTML = '';
    [...word].forEach(c => {
      const filled = used.has(c);
      const letter = A.el('span', 'hangman-letter' + (filled ? ' filled' : ''), filled ? c : '', wordBox);
      letter.dataset.c = c;
    });
    sMiss.textContent = miss + '/6';
    sScore.textContent = K.score;
    sWord.textContent = word.length;
  };

  const next = () => {
    word = A.pick(WL.filter(w => w.length >= 6));
    used = new Set();
    miss = 0;
    Object.values(keys).forEach(b => {
      b.disabled = false;
      b.classList.remove('correct', 'absent');
    });
    hint.textContent = 'Escolha uma letra.';
    draw();
  };

  const press = k => {
    if (!/^[A-Z]$/.test(k) || used.has(k)) return;
    used.add(k);
    const b = keys[k];
    if (b) {
      b.disabled = true;
      b.classList.add(word.includes(k) ? 'correct' : 'absent');
    }
    if (!word.includes(k)) {
      miss++;
      A.sfx('hit');
      hint.textContent = '❌ A letra ' + k + ' não está na palavra.';
    } else {
      A.sfx('click');
      hint.textContent = '✅ Boa! A letra ' + k + ' está na palavra.';
    }
    draw();
    if (miss >= parts.length) return K.over('A palavra era ' + word + ' · ' + K.score + ' acertada(s)');
    if ([...word].every(c => used.has(c))) {
      K.addScore(1);
      A.sfx('win');
      hint.textContent = '🎉 Palavra completa! Próxima…';
      K.after(next, 800);
    }
  };

  physical(K, press);
  sMiss.textContent = '0/6';
  sScore.textContent = '0';
  next();
});

// Palavra Embaralhada: 60 segundos, cada acerto soma pontos e ganha 3 segundos.
A.register('anagram', K => {
  const ui = arena(K, {
    icon: '🔀',
    title: 'Palavra Embaralhada',
    sub: 'Desembaralhe as letras contra o relógio'
  });
  const sTime = stat(ui.stats, 'Tempo', '⏱');
  const sHits = stat(ui.stats, 'Acertos', '✅');
  const sScore = stat(ui.stats, 'Pontos', '🏆');
  const bar = meter(ui.body);
  const tiles = A.el('div', 'anagram-tiles', '', ui.body);
  const inp = A.el('input', 'mind-input', '', ui.body);
  inp.placeholder = 'Digite a palavra';
  inp.autocomplete = 'off';
  inp.autocapitalize = 'characters';
  const hint = A.el('p', 'arena-hint', 'Cada acerto vale pontos e +3 segundos.', ui.body);
  const skip = A.el('button', 'arena-btn ghost', 'Pular (−5s)', ui.foot);

  let t = 60, w = '', hits = 0;

  const upd = () => {
    sTime.textContent = t + 's';
    sHits.textContent = hits;
    sScore.textContent = K.score;
    setMeter(bar, t / 60);
  };

  const next = () => {
    w = A.pick(WL.concat(W5));
    let s;
    do s = A.shuffle([...w]).join(''); while (s === w);
    tiles.innerHTML = '';
    [...s].forEach(ch => A.el('span', 'anagram-tile', ch, tiles));
    inp.value = '';
    inp.focus();
  };

  inp.oninput = () => {
    if (inp.value.toUpperCase().trim() === w) {
      hits++;
      K.addScore(10 + w.length);
      t += 3;
      A.sfx('coin');
      upd();
      next();
    }
  };

  skip.onclick = () => {
    t = Math.max(0, t - 5);
    upd();
    next();
  };

  K.every(() => {
    t--;
    upd();
    if (t <= 0) K.over('Tempo esgotado!');
  }, 1000);

  upd();
  next();
});

// Teste de Digitacao: 60 segundos digitando palavras; calcula palavras por minuto.
A.register('typing', K => {
  K.fmt = n => n + ' ppm';
  const ui = arena(K, {
    icon: '⌨️',
    title: 'Teste de Digitação',
    sub: 'Digite as palavras e aperte espaço · 60 segundos'
  });
  const sTime = stat(ui.stats, 'Tempo', '⏱');
  const sWords = stat(ui.stats, 'Palavras', '✅');
  const sAcc = stat(ui.stats, 'Precisão', '🎯');
  const box = A.el('div', 'typing-text', '', ui.body);
  const inp = A.el('input', 'mind-input', '', ui.body);
  inp.placeholder = 'Digite aqui…';
  inp.autocomplete = 'off';
  inp.autocapitalize = 'off';
  const hint = A.el('p', 'arena-hint', 'Aperte espaço para confirmar cada palavra.', ui.body);

  const words = A.shuffle(WL.concat(W5)).map(w => w.toLowerCase());
  let i = 0, ok = 0, bad = 0, t = 60, started = false;

  const acc = () => {
    const total = ok + bad;
    return (total ? Math.round(ok / total * 100) : 100) + '%';
  };

  const draw = () => {
    box.innerHTML = '';
    const typed = inp.value.trim();
    words.slice(i, i + 16).forEach((w, k) => {
      const sp = A.el('span', 'typing-word' + (k === 0 ? ' current' : ''), w, box);
      if (k === 0 && typed) {
        sp.classList.toggle('ok', w.startsWith(typed));
        sp.classList.toggle('bad', !w.startsWith(typed));
      }
    });
  };

  inp.oninput = () => {
    if (!started) {
      started = true;
      K.every(() => {
        t--;
        sTime.textContent = t + 's';
        if (t <= 0) K.over('Tempo! ' + ok + ' palavras');
      }, 1000);
    }
    if (inp.value.endsWith(' ')) {
      const typed = inp.value.trim();
      if (typed === words[i]) {
        ok++;
        K.setScore(ok);
        A.sfx('click');
      } else {
        bad++;
        A.sfx('hit');
      }
      i++;
      inp.value = '';
      sWords.textContent = ok;
      sAcc.textContent = acc();
      draw();
    } else {
      draw();
    }
  };

  sTime.textContent = '60s';
  sWords.textContent = '0';
  sAcc.textContent = '100%';
  draw();
  inp.focus();
});

// Matematica Relampago: 45 segundos, contas ficam mais dificeis conforme a pontuacao.
A.register('mathrush', K => {
  const ui = arena(K, {
    icon: '➗',
    title: 'Matemática Relâmpago',
    sub: 'Resolva contas rápido para ganhar tempo'
  });
  const sTime = stat(ui.stats, 'Tempo', '⏱');
  const sStreak = stat(ui.stats, 'Sequência', '🔥');
  const sScore = stat(ui.stats, 'Pontos', '🏆');
  const bar = meter(ui.body);
  const question = A.el('div', 'math-question', '', ui.body);
  const opts = A.el('div', 'math-options', '', ui.body);
  const hint = A.el('p', 'arena-hint', 'Acertos dão +1s. Erros custam 4s.', ui.body);

  let t = 45, streak = 0, ans = 0;

  const upd = () => {
    sTime.textContent = t + 's';
    sStreak.textContent = streak;
    sScore.textContent = K.score;
    setMeter(bar, t / 60);
  };

  const next = () => {
    const lv = Math.min(3, 1 + Math.floor(K.score / 150));
    const op = A.pick(['+', '-', '×']);
    let a = A.rand(2, 9 * lv + 3);
    let b = A.rand(2, 9 * lv + 3);
    if (op === '×') {
      a = A.rand(2, 9 + lv * 2);
      b = A.rand(2, 9);
    }
    if (op === '-' && b > a) [a, b] = [b, a];
    ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
    question.textContent = `${a} ${op} ${b}`;

    const s = new Set([ans]);
    while (s.size < 4) s.add(ans + A.rand(-9, 9) || ans + 11);
    opts.innerHTML = '';

    const buttons = A.shuffle([...s]).map(v => {
      const bt = A.el('button', 'math-option', v, opts);
      bt.type = 'button';
      bt.onclick = () => {
        if (bt.disabled) return;
        const right = v === ans;
        buttons.forEach(x => x.disabled = true);
        bt.classList.add(right ? 'right' : 'wrong');
        if (right) {
          streak++;
          K.addScore(10 + Math.min(streak, 10));
          t = Math.min(60, t + 1);
          A.sfx('coin');
          hint.textContent = '✅ Certo! Sequência de ' + streak + '.';
        } else {
          streak = 0;
          t = Math.max(0, t - 4);
          A.sfx('hit');
          hint.textContent = '❌ Errou! A resposta era ' + ans + '.';
        }
        upd();
        K.after(next, 200);
      };
      return bt;
    });
  };

  K.every(() => {
    t--;
    upd();
    if (t <= 0) K.over('Tempo esgotado!');
  }, 1000);

  upd();
  next();
});

// Adivinhe o Numero: de 1 a 100; cada chute reduz o intervalo (busca binaria).
A.register('guess', K => {
  K.low = true;
  K.fmt = n => n + ' tent.';
  const ui = arena(K, {
    icon: '🎯',
    title: 'Adivinhe o Número',
    sub: 'Estou pensando em um número de 1 a 100'
  });
  const sTries = stat(ui.stats, 'Tentativas', '🔁');
  const sLast = stat(ui.stats, 'Último', '💭');
  const range = A.el('div', 'guess-range', '', ui.body);
  const hint = A.el('p', 'arena-hint', 'Digite um número e aperte Enter.', ui.body);
  const hist = A.el('div', 'guess-history', '', ui.body);
  const inp = A.el('input', 'mind-input', '', ui.body);
  inp.type = 'number';
  inp.min = '1';
  inp.max = '100';
  inp.placeholder = '1 a 100';
  const btn = A.el('button', 'arena-btn pri', 'Chutar', ui.foot);

  const n = A.rand(1, 100);
  let lo = 1, hi = 100, tries = 0;

  const upd = () => {
    range.textContent = `${lo} — ${hi}`;
    sTries.textContent = tries;
  };

  const go = () => {
    const v = +inp.value;
    if (!v || v < 1 || v > 100) {
      K.shake(160);
      hint.textContent = 'Escolha um número entre 1 e 100.';
      return;
    }
    tries++;
    K.setScore(tries);
    sTries.textContent = tries;
    sLast.textContent = v;
    inp.value = '';

    if (v === n) return K.over('Acertou! 🎯', tries);

    if (v < n) {
      lo = Math.max(lo, v + 1);
      hint.textContent = '⬆ O número é maior que ' + v + '.';
      A.el('span', 'guess-chip low', v + ' ↑', hist);
    } else {
      hi = Math.min(hi, v - 1);
      hint.textContent = '⬇ O número é menor que ' + v + '.';
      A.el('span', 'guess-chip high', v + ' ↓', hist);
    }
    A.sfx('click');
    upd();
    inp.focus();
  };

  btn.onclick = go;
  inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  sTries.textContent = '0';
  sLast.textContent = '–';
  upd();
  inp.focus();
});

const QS = [['Qual é a capital do Brasil?', 'Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'], ['Quantos planetas tem o Sistema Solar?', '8', '7', '9', '10'], ['Qual é o maior oceano do mundo?', 'Pacífico', 'Atlântico', 'Índico', 'Ártico'], ['Quem pintou a Mona Lisa?', 'Leonardo da Vinci', 'Michelangelo', 'Van Gogh', 'Picasso'], ['Qual é o maior animal terrestre?', 'Elefante-africano', 'Girafa', 'Rinoceronte', 'Hipopótamo'], ['Em que ano o homem pisou na Lua pela primeira vez?', '1969', '1959', '1975', '1981'], ['Qual é o símbolo químico do ouro?', 'Au', 'Ag', 'Go', 'Or'], ['Quantos jogadores um time de futebol tem em campo?', '11', '10', '12', '9'], ['Qual é o maior rio do Brasil em volume de água?', 'Amazonas', 'São Francisco', 'Paraná', 'Tocantins'], ['Quem escreveu "Dom Casmurro"?', 'Machado de Assis', 'José de Alencar', 'Clarice Lispector', 'Graciliano Ramos'], ['Qual é o menor país do mundo?', 'Vaticano', 'Mônaco', 'Malta', 'San Marino'], ['Quantos lados tem um hexágono?', '6', '5', '7', '8'], ['Qual planeta é conhecido como Planeta Vermelho?', 'Marte', 'Vênus', 'Júpiter', 'Mercúrio'], ['Qual é a língua mais falada do mundo por falantes nativos?', 'Mandarim', 'Inglês', 'Espanhol', 'Hindi'], ['Em que continente fica o Egito?', 'África', 'Ásia', 'Europa', 'Oceania'], ['Quanto é 7 × 8?', '56', '54', '48', '63'], ['Quem comandou a esquadra que chegou ao Brasil em 1500?', 'Pedro Álvares Cabral', 'Cristóvão Colombo', 'Vasco da Gama', 'Américo Vespúcio'], ['Qual gás as plantas absorvem na fotossíntese?', 'Gás carbônico', 'Oxigênio', 'Nitrogênio', 'Hidrogênio'], ['Qual é o osso mais longo do corpo humano?', 'Fêmur', 'Tíbia', 'Úmero', 'Costela'], ['Quantas cores tem o arco-íris?', '7', '6', '8', '5'], ['Qual é a capital da França?', 'Paris', 'Lyon', 'Marselha', 'Bordeaux'], ['Qual país tem formato de bota?', 'Itália', 'Espanha', 'Grécia', 'Portugal'], ['Qual é o maior deserto quente do mundo?', 'Saara', 'Gobi', 'Atacama', 'Kalahari'], ['Qual é o ponto mais alto da Terra?', 'Monte Everest', 'K2', 'Aconcágua', 'Kilimanjaro'], ['Quem escreveu "O Pequeno Príncipe"?', 'Antoine de Saint-Exupéry', 'Julio Verne', 'Monteiro Lobato', 'Hans Andersen'], ['Qual metal é líquido à temperatura ambiente?', 'Mercúrio', 'Chumbo', 'Alumínio', 'Ferro']];

// Quiz Geral: dez perguntas sorteadas de um banco de conhecimentos gerais.
A.register('quiz', K => {
  const ui = arena(K, {
    icon: '❓',
    title: 'Quiz Geral',
    sub: 'Dez perguntas de conhecimentos gerais'
  });
  const sQ = stat(ui.stats, 'Pergunta', '📋');
  const sScore = stat(ui.stats, 'Acertos', '🏆');
  const qBox = A.el('div', 'quiz-question', '', ui.body);
  const opts = A.el('div', 'quiz-options', '', ui.body);
  const hint = A.el('p', 'arena-hint', 'Escolha uma alternativa.', ui.body);

  const qs = A.shuffle(QS).slice(0, 10);
  let i = 0;

  const next = () => {
    if (i >= qs.length) return K.over('Fim do quiz! 🧠');
    const it = qs[i];
    sQ.textContent = (i + 1) + '/' + qs.length;
    qBox.textContent = it[0];
    opts.innerHTML = '';
    hint.textContent = 'Escolha uma alternativa.';

    A.shuffle(it.slice(1)).forEach(a => {
      const b = A.el('button', 'quiz-option', a, opts);
      b.type = 'button';
      b.onclick = () => {
        if (b.disabled) return;
        const right = a === it[1];
        [...opts.children].forEach(x => {
          x.disabled = true;
          if (x.textContent === it[1]) x.classList.add('right');
        });
        if (!right) b.classList.add('wrong');
        if (right) {
          K.addScore(10);
          A.sfx('coin');
          hint.textContent = '✅ Correto!';
        } else {
          A.sfx('hit');
          hint.textContent = '❌ A resposta certa era ' + it[1] + '.';
        }
        sScore.textContent = K.score;
        K.after(() => { i++; next(); }, 850);
      };
    });
  };

  sQ.textContent = '1/10';
  sScore.textContent = '0';
  next();
});

// Quiz de Bandeiras: reconheca o pais pela bandeira (imagens do flagcdn).
A.register('flags', K => {
  const F = { br: 'Brasil', ar: 'Argentina', us: 'Estados Unidos', jp: 'Japão', fr: 'França', de: 'Alemanha', it: 'Itália', es: 'Espanha', pt: 'Portugal', gb: 'Reino Unido', ca: 'Canadá', mx: 'México', cn: 'China', in: 'Índia', ru: 'Rússia', au: 'Austrália', za: 'África do Sul', eg: 'Egito', kr: 'Coreia do Sul', cl: 'Chile', co: 'Colômbia', uy: 'Uruguai', se: 'Suécia', no: 'Noruega', gr: 'Grécia', tr: 'Turquia', ng: 'Nigéria', pe: 'Peru', nl: 'Países Baixos', ch: 'Suíça' };
  const ui = arena(K, {
    icon: '🏳️',
    title: 'Quiz de Bandeiras',
    sub: 'Reconheça o país pela bandeira · três vidas'
  });
  const sLives = stat(ui.stats, 'Vidas', '❤️');
  const sScore = stat(ui.stats, 'Acertos', '🏆');
  const card = A.el('div', 'flags-card', '', ui.body);
  const opts = A.el('div', 'quiz-options', '', ui.body);
  const hint = A.el('p', 'arena-hint', 'De que país é esta bandeira?', ui.body);

  const keys = Object.keys(F);
  let lives = 3;

  const updLives = () => {
    sLives.textContent = '♥'.repeat(Math.max(0, lives));
    sLives.style.color = lives <= 1 ? '#ff6b8a' : '#3ddc84';
  };

  const next = () => {
    const code = A.pick(keys);
    const ans = new Set([F[code]]);
    while (ans.size < 4) ans.add(F[A.pick(keys)]);

    card.innerHTML = `<img src="https://flagcdn.com/w160/${code}.png" alt="Bandeira de ${F[code]}">`;
    opts.innerHTML = '';
    hint.textContent = 'De que país é esta bandeira?';

    A.shuffle([...ans]).forEach(a => {
      const b = A.el('button', 'quiz-option', a, opts);
      b.type = 'button';
      b.onclick = () => {
        if (b.disabled) return;
        const right = a === F[code];
        [...opts.children].forEach(x => {
          x.disabled = true;
          if (x.textContent === F[code]) x.classList.add('right');
        });
        if (!right) b.classList.add('wrong');
        if (right) {
          K.addScore(10);
          A.sfx('coin');
          hint.textContent = '✅ Certo!';
        } else {
          lives--;
          updLives();
          A.sfx('hit');
          hint.textContent = '❌ Era ' + F[code] + '.';
        }
        sScore.textContent = K.score;
        K.after(() => {
          if (lives <= 0) return K.over('Fim de jogo 🏳️');
          next();
        }, 800);
      };
    });
  };

  updLives();
  sScore.textContent = '0';
  next();
});
})();
