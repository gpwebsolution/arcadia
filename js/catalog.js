/* =============================================================================
   ARCADIA — CATÁLOGO DE JOGOS (catalog.js)
   -----------------------------------------------------------------------------
   Este arquivo é a "fonte da verdade" do portal. Cada linha da lista vira um
   card na home e determina qual script será carregado na página do jogo.

   Formato de cada linha:
     [ id, nome, categoria, ícone, descrição, como jogar, arquivo ]

   Onde:
     id        -> identificador único (também usado na URL ?g=id)
     nome      -> título exibido no card e no HUD
     categoria -> uma das chaves de Arcadia.cats
     ícone     -> emoji mostrado no card
     descrição -> texto curto na home e no painel "Sobre"
     como jogar-> instruções no painel "Como jogar"
     arquivo   -> nome do arquivo em js/games/ (sem o .js)

   Para adicionar um jogo:
     1. crie js/games/seuarquivo.js;
     2. registre com Arcadia.register('seu-id', K => { ... });
     3. acrescente uma linha nesta lista apontando para 'seu-arquivo'.
   ============================================================================= */

/* Categorias usadas pelos filtros, pelo menu lateral e pelo catálogo.
   A chave é usada no hash da URL (ex.: index.html#puzzle). */
Arcadia.cats = {
  arcade:    { name: 'Arcade',             icon: '👾' },
  puzzle:    { name: 'Puzzle',             icon: '🧩' },
  tabuleiro: { name: 'Tabuleiro',          icon: '♟️' },
  mente:     { name: 'Palavras & Mente',   icon: '🧠' },
  reflexo:   { name: 'Reflexos',           icon: '⚡' },
  cartas:    { name: 'Cartas & Sorte',     icon: '🃏' },
  esportes:  { name: 'Esportes & Corrida', icon: '🏁' }
};

(function () {
  /* Lista bruta. Mantida compacta de propósito para ficar fácil de editar. */
  const catalogRows = [

    /* ------------------------------- ARCADE ------------------------------- */
    ['snake',      'Cobrinha',              'arcade',    '🐍', 'Coma frutas e cresça em uma campanha de 40 fases.', 'Setas / WASD ou deslize o dedo.', 'arcade1'],
    ['pong',       'Pong',                  'arcade',    '🏓', 'Vença a IA no clássico duelo de raquetes.', 'Mouse, toque ou setas ↑ ↓.', 'arcade1'],
    ['breakout',   'Quebra-Tijolos',        'arcade',    '🧱', 'Destrua tijolos em 40 fases com padrões e tijolos resistentes.', 'Mouse / setas. Clique ou Espaço lança a bola.', 'arcade1'],
    ['flappy',     'Pássaro Saltitante',    'arcade',    '🐤', 'Passe entre os canos em 40 fases com vãos cada vez menores.', 'Clique, toque ou Espaço para bater as asas.', 'arcade1'],
    ['invaders',   'Invasores do Espaço',   'arcade',    '👽', 'Defenda a Terra em 40 fases de ondas alienígenas.', 'Setas movem, Espaço atira (ou mouse/toque).', 'arcade1'],
    ['asteroids',  'Asteroides',            'arcade',    '☄️', 'Estilhace rochas espaciais em 40 fases.', '← → giram, ↑ acelera, Espaço atira.', 'arcade1'],
    ['dino',       'Dino Corredor',         'arcade',    '🦖', 'Corra e desvie em 40 fases com metas de distância.', 'Espaço / ↑ / toque pula, ↓ abaixa.', 'arcade1'],
    ['tetris',     'Blocos Caindo',         'arcade',    '🟦', 'Complete 400 linhas em 40 fases, com queda cada vez mais rápida.', '← → move, ↑ gira, ↓ desce, Espaço derruba.', 'arcade2'],
    ['frogger',    'Sapo na Estrada',       'arcade',    '🐸', 'Atravesse o trânsito em 40 fases com três vidas por fase.', 'Setas ou deslize.', 'arcade2'],
    ['cardodge',   'Corrida Maluca',        'arcade',    '🏎️', 'Desvie dos carros em 40 fases com metas de distância.', 'Setas ← → ou mouse/toque.', 'arcade2'],
    ['stack',      'Torre de Blocos',       'arcade',    '🏗️', 'Empilhe blocos em 40 fases com metas de altura.', 'Clique, toque ou Espaço para soltar.', 'arcade2'],
    ['catcher',    'Chuva de Frutas',       'arcade',    '🍎', 'Pegue frutas em 40 fases e fuja das bombas.', 'Mouse, toque ou setas ← →.', 'arcade2'],
    ['doodle',     'Pula-Pula',             'arcade',    '🦘', 'Salte de plataforma em plataforma em 40 fases com metas de altura.', 'Mouse, toque ou setas ← →.', 'arcade2'],
    ['copter',     'Helicóptero',           'arcade',    '🚁', 'Voe pela caverna em 40 fases com vãos cada vez menores.', 'Segure clique / Espaço para subir.', 'arcade2'],
    ['ninja',      'Fatia Frutas',          'arcade',    '🍉', 'Corte frutas em 40 fases sem acertar bombas.', 'Arraste o mouse/dedo sobre as frutas.', 'arcade2'],
    ['maze',       'Labirinto',             'arcade',    '🌀', 'Encontre a saída em 40 labirintos cada vez maiores.', 'Setas / WASD ou deslize.', 'arcade3'],
    ['missile',    'Defesa de Cidades',     'arcade',    '🚀', 'Proteja as cidades em 40 ondas de mísseis.', 'Clique para disparar um míssil de defesa.', 'arcade3'],
    ['cannon',     'Canhão',                'arcade',    '💣', 'Acerte alvos em 40 fases com menos balas e alvos menores.', 'Mire com o mouse, segure para força, solte.', 'arcade3'],
    ['gravity',    'Gravidade Zero',        'arcade',    '🔄', 'Inverta a gravidade em 40 fases com metas de distância.', 'Clique, toque ou Espaço inverte a gravidade.', 'arcade3'],
    ['tron',       'Moto de Luz',           'arcade',    '🏍️', 'Vença a IA ou um amigo em duelos de motos de luz.', 'J1: setas · J2: WASD no modo 2 jogadores. Deslize na tela no 1 jogador.', 'arcade3'],
    ['comecoco',   'Come-Come',             'arcade',    '🟡', 'Coma todas as bolinhas em 40 fases com mais fantasmas.', 'Setas / WASD ou deslize.', 'arcade3'],
    ['lander',     'Pouso Lunar',           'arcade',    '🌙', 'Pouse em 40 setores com menos combustível.', '← → inclinam, ↑ / Espaço ligam o motor.', 'arcade3'],
    ['galaxy',     'Nave Galáctica',        'arcade',    '🛸', 'Sobreviva a 40 fases de abates espaciais.', 'Mouse, toque ou setas. Tiro automático.', 'arcade3'],

    /* ------------------------------- PUZZLE ------------------------------- */
    ['2048',       '2048',                  'puzzle',    '🔢', 'Campanha de 40 fases somando números até a meta.', 'Setas / WASD ou deslize. Cada fase tem meta de pontos e limite de jogadas.', 'puzzle1'],
    ['minesweeper','Campo Minado',          'puzzle',    '💥', 'Campanha de 40 campos com mais minas e tabuleiros maiores.', 'Clique abre; clique direito ou botão 🚩 marca. O primeiro clique nunca é mina.', 'puzzle1'],
    ['memory',     'Jogo da Memória',       'puzzle',    '🃏', 'Encontre todos os pares de bichinhos em 40 fases.', 'Clique nas cartas.', 'puzzle1'],
    ['slide15',    'Quebra-Cabeça 15',      'puzzle',    '🔲', 'Resolva quebra-cabeças de 3x3 até 7x7 em 40 fases.', 'Clique nas peças ou use as setas.', 'puzzle1'],
    ['lights',     'Apague as Luzes',       'puzzle',    '💡', 'Apague todas as luzes em 40 fases.', 'Clique nas luzes.', 'puzzle1'],
    ['flood',      'Inundação',             'puzzle',    '🌊', 'Inunde o tabuleiro em 40 fases.', 'Escolha uma cor para inundar a partir do canto.', 'puzzle1'],
    ['hanoi',      'Torre de Hanói',        'puzzle',    '🗼', 'Mova os discos em 40 níveis.', 'Clique numa torre e depois em outra.', 'puzzle1'],
    ['pegs',       'Resta Um',              'puzzle',    '📍', 'Campanha de 40 tabuleiros gerados para resolver com um pino.', 'Clique num pino e depois no buraco destino. Cada fase tem um tabuleiro novo.', 'puzzle1'],
    ['sudoku',     'Sudoku',                'puzzle',    '🧮', 'Campanha de 40 grades com mais lacunas a cada fase.', 'Selecione a célula e use o teclado numérico ou os botões.', 'puzzle2'],
    ['match3',     'Doces em Fila',         'puzzle',    '🍬', 'Bata a meta de pontos em 40 fases.', 'Clique em um doce e depois no vizinho.', 'puzzle2'],
    ['colorsort',  'Tubos de Cor',          'puzzle',    '🧪', 'Separe as cores em 40 fases.', 'Clique no tubo de origem e depois no destino.', 'puzzle2'],
    ['sokoban',    'Empurra Caixas',        'puzzle',    '📦', 'Empurre as caixas em 40 níveis.', 'Setas / deslize. Z desfaz.', 'puzzle2'],
    ['wordsearch', 'Caça-Palavras',         'puzzle',    '🔎', 'Campanha de 40 grades com mais palavras e direções.', 'Toque na primeira e na última letra da palavra.', 'puzzle2'],

    /* ------------------------------ TABULEIRO ----------------------------- */
    ['tictactoe',  'Jogo da Velha',         'tabuleiro', '⭕', 'Vença a IA em sequência para marcar pontos.', 'Clique nas casas.', 'board'],
    ['connect4',   'Ligue 4',               'tabuleiro', '🔴', 'Alinhe quatro peças antes da IA.', 'Clique na coluna para soltar a peça.', 'board'],
    ['reversi',    'Reversi',               'tabuleiro', '⚫', 'Cerque as peças do adversário e vire o jogo.', 'Clique numa casa marcada.', 'board'],
    ['mastermind', 'Código Secreto',        'tabuleiro', '🔐', 'Descubra a combinação de 4 cores em 10 tentativas.', 'Toque nas cores para montar o palpite.', 'board'],
    ['rps',        'Pedra, Papel e Tesoura', 'tabuleiro','✂️', 'Faça a maior sequência de vitórias contra a CPU.', 'Escolha sua jogada.', 'board'],
    ['battleship', 'Batalha Naval',         'tabuleiro', '🚢', 'Afunde a frota escondida com o mínimo de tiros.', 'Clique nas casas para atirar.', 'board'],
    ['mancala',    'Mancala',               'tabuleiro', '🥜', 'O jogo de sementes milenar contra a IA.', 'Clique numa cova da sua linha (embaixo).', 'board'],

    /* --------------------------- PALAVRAS & MENTE ------------------------- */
    ['wordle',     'Termo',                 'mente',     '🔤', 'Descubra a palavra de 5 letras em 6 tentativas.', 'Digite ou use o teclado na tela.', 'mente'],
    ['hangman',    'Forca',                 'mente',     '🪢', 'Adivinhe a palavra antes de completar o boneco.', 'Teclado físico ou na tela.', 'mente'],
    ['anagram',    'Palavra Embaralhada',   'mente',     '🔀', 'Desembaralhe as letras contra o relógio.', 'Digite a palavra correta.', 'mente'],
    ['typing',     'Teste de Digitação',    'mente',     '⌨️', 'Quantas palavras por minuto você digita?', 'Digite e aperte espaço.', 'mente'],
    ['mathrush',   'Matemática Relâmpago',  'mente',     '➗', 'Resolva contas rápido para ganhar tempo.', 'Toque na resposta certa.', 'mente'],
    ['guess',      'Adivinhe o Número',     'mente',     '🎯', 'Descubra o número de 1 a 100 no menor número de chutes.', 'Digite e aperte Enter.', 'mente'],
    ['quiz',       'Quiz Geral',            'mente',     '❓', 'Dez perguntas de conhecimentos gerais.', 'Escolha uma alternativa.', 'mente'],
    ['flags',      'Quiz de Bandeiras',     'mente',     '🏳️', 'Reconheça países pelas bandeiras. Três vidas!', 'Escolha o país certo.', 'mente'],

    /* ------------------------------ REFLEXOS ------------------------------ */
    ['whackmole',  'Acerte a Toupeira',     'reflexo',   '🐹', 'Acerte as toupeiras (e fuja das bombas) em 30s.', 'Clique / toque.', 'reflex'],
    ['cps',        'Teste de Cliques',      'reflexo',   '🖱️', 'Quantos cliques você faz em 10 segundos?', 'Clique o mais rápido possível.', 'reflex'],
    ['reaction',   'Tempo de Reação',       'reflexo',   '🚦', 'Clique assim que a tela ficar verde.', 'Espere o verde e clique.', 'reflex'],
    ['aim',        'Treino de Mira',        'reflexo',   '🎯', 'Acerte os alvos que encolhem rapidamente.', 'Clique nos alvos.', 'reflex'],
    ['stroop',     'Cor da Palavra',        'reflexo',   '🎨', 'Escolha a cor da tinta, não o que está escrito.', 'Toque no botão da cor certa.', 'reflex'],
    ['balloons',   'Estoura Balões',        'reflexo',   '🎈', 'Estoure os balões antes que escapem.', 'Clique / toque nos balões.', 'reflex'],
    ['simon',      'Genius',                'reflexo',   '🟢', 'Repita a sequência de luzes e sons.', 'Toque nas cores na ordem certa.', 'reflex'],
    ['piano',      'Piano Tiles',           'reflexo',   '🎹', 'Toque só nos tiles pretos. Não deixe nenhum passar!', 'Toque ou use ← ↓ ↑ →.', 'reflex'],
    ['numbermem',  'Memória Numérica',      'reflexo',   '🧠', 'Memorize números cada vez maiores.', 'Digite o número que apareceu.', 'reflex'],
    ['schulte',    'Tabela Relâmpago',      'reflexo',   '⏱️', 'Toque de 1 a 25 em ordem o mais rápido que puder.', 'Clique nos números em sequência.', 'reflex'],
    ['cookie',     'Biscoito Clicker',      'reflexo',   '🍪', 'Clique, compre melhorias e vire um império de biscoitos.', 'Clique no biscoito e compre upgrades. O progresso é salvo!', 'reflex'],

    /* --------------------------- CARTAS & SORTE --------------------------- */
    ['blackjack',  'Vinte e Um',            'cartas',    '🂡', 'Chegue o mais perto de 21 sem estourar.', 'Pedir, Parar ou Dobrar.', 'cards'],
    ['war',        'Guerra de Cartas',      'cartas',    '⚔️', 'Carta maior vence! Quem ganha mais rodadas?', 'Clique para virar as cartas.', 'cards'],
    ['hilo',       'Maior ou Menor',        'cartas',    '🔼', 'A próxima carta será maior ou menor?', 'Escolha ⬆ ou ⬇.', 'cards'],
    ['slots',      'Caça-Níquel',           'cartas',    '🎰', 'Gire os rolos e tente o jackpot (com fichas de mentirinha).', 'Escolha a ficha e gire. Três iguais pagam alto.', 'cards'],
    ['pig',        'Porquinho (Pig)',       'cartas',    '🐷', 'Role o dado, mas não tire 1! Primeiro a 50 vence.', 'Role ou guarde os pontos. Dado animado em 3D.', 'cards'],
    ['coinflip',   'Cara ou Coroa',         'cartas',    '🪙', 'Quantas vezes seguidas você acerta a moeda?', 'Escolha cara ou coroa.', 'cards'],
    ['roulette',   'Roleta',                'cartas',    '🎡', 'Roleta europeia de verdade: gire a roda e aposte na cor, par ou número.', 'Escolha a ficha, toque nas casas para apostar e gire a roda.', 'cards'],
    ['dados',      'Dados Poker',           'cartas',    '🎲', 'Role 5 dados em 3D e monte a melhor combinação.', 'Role, toque nos dados para segurar e escolha a categoria.', 'cards'],
    ['solitaire',  'Paciência (Klondike)',  'cartas',    '🃏', 'Monte as quatro fundações em uma campanha de 40 fases.', 'Toque na carta e depois no destino. Z desfaz e R reinicia a fase.', 'cards'],

    /* --------------------------- ESPORTES & CORRIDA ----------------------- */
    ['football',   'Futebol de Campo',       'esportes',  '⚽', 'Estádio animado, goleiros com defesa e chute carregado. 1P, 2P ou campeonato.', 'WASD move o J1; setas movem o J2. Segure Espaço/Enter para carregar o chute. Shift corre.', 'sports'],
    ['moto',       'Moto Veloz',             'esportes',  '🏍️', 'Três circuitos com estrada sinuosa, nitro, combo e trânsito pesado.', '← → ou A/D desviam, ↑ acelera, ↓ freia e Espaço usa o nitro. Deslize na tela.', 'sports']
  ];

  /* Converte as linhas em objetos nomeados. Isso deixa o restante do código
     mais legível: game.id, game.name, game.cat etc. */
  Arcadia.catalog = catalogRows.map(
    ([id, name, cat, icon, desc, how, file]) => ({ id, name, cat, icon, desc, how, file })
  );
})();

/* =============================================================================
   REGRAS DETALHADAS
   -----------------------------------------------------------------------------
   O catálogo acima tem uma instrução curta. Aqui ficam regras completas,
   exibidas no início da partida e no painel "Como jogar". A ideia é ensinar
   o objetivo, os controles, a pontuação e quando a partida termina.
   ============================================================================= */
Arcadia.rules = {
  snake: 'Coma as frutas para crescer e ganhar pontos. Não bata nas paredes nem no próprio corpo. A campanha tem 40 fases: cada uma exige mais frutas, começa com uma cobra maior e acelera o ritmo.',
  pong: 'Marque pontos fazendo a bola passar pela raquete adversária. A primeira raquete a atingir a meta de pontos vence. No modo 2 jogadores, o jogador 1 usa W/S e o jogador 2 usa ↑/↓.',
  breakout: 'Rebata a bola com a raquete para destruir todos os tijolos. Você tem 3 vidas por fase; cada fase adiciona fileiras, padrões e, mais adiante, tijolos que precisam de dois acertos. Complete as 40 fases para vencer a campanha.',
  flappy: 'Passe entre os canos sem encostar neles. Cada cano ultrapassado conta para a meta da fase. A campanha tem 40 fases, com vãos menores, mais velocidade e metas maiores. Um toque no cano, no chão ou no teto encerra a tentativa.',
  invaders: 'Destrua todas as naves de cada fase antes que elas desçam. Você tem 3 vidas e ganha uma vida extra ao limpar algumas fases. As 40 fases trazem formações diferentes, naves resistentes e tiros mais frequentes.',
  asteroids: 'Gire e acelere a nave para desviar das rochas e destruí-las com tiros. Pedras grandes se dividem em menores. A campanha tem 40 fases com mais rochas e fragmentos; as 3 vidas são restauradas a cada fase.',
  dino: 'Pule os cactos e abaixe-se para passar pelos pássaros. Cada fase tem uma meta de distância e fica mais rápida. Complete as 40 fases da campanha sem bater; a pontuação soma a distância de todas as fases.',
  tetris: 'Encaixe as peças para completar linhas horizontais. Linhas completas somem e valem pontos; quanto mais linhas de uma vez, maior o bônus. A campanha tem 40 fases: cada 10 linhas avançam uma fase, e a queda acelera até a fase 40, encerrada ao completar 400 linhas.',
  frogger: 'Atravesse as dez faixas até a grama do topo. Evite carros e caminhões, que ficam mais rápidos e densos a cada fase. Você tem 3 vidas por fase; complete as 40 travessias para vencer.',
  cardodge: 'Desvie dos carros que descem pela rodovia. Cada fase tem uma meta de distância, mais velocidade e mais trânsito. Você tem 3 vidas por fase; complete as 40 fases para vencer a campanha.',
  stack: 'Solte cada bloco em cima do anterior. A parte que sobrar para fora é cortada e diminui a base. Cada fase exige uma altura mínima e acelera o bloco; complete as 40 torres para vencer.',
  catcher: 'Mova a cesta para pegar as frutas que caem e desviar das bombas. Cada fase tem uma meta de frutas, mais bombas e queda mais rápida. Você tem 3 vidas por fase; complete as 40 fases para vencer.',
  doodle: 'Salte automaticamente de plataforma em plataforma. Use ←/→ ou o mouse para se mover no ar. Cada fase tem uma meta de altura, plataformas móveis e espaçamentos maiores. Se cair abaixo da tela, a tentativa termina.',
  copter: 'Segure o clique, o toque ou o Espaço para subir e solte para descer. Passe pelas aberturas da caverna sem tocar nas paredes. São 40 fases com cavernas mais estreitas, obstáculos mais frequentes e 3 vidas por fase.',
  ninja: 'Arraste o mouse ou o dedo para cortar as frutas. Cada fruta fatiada conta para a meta da fase. Não corte as bombas e não deixe frutas caírem. A campanha tem 40 fases, com mais frutas, bombas e velocidade.',
  maze: 'Encontre a saída do labirinto antes do tempo acabar. As 40 fases aumentam o labirinto até 25x25 e reduzem o tempo disponível. Use as setas, WASD ou deslize.',
  missile: 'Clique para lançar mísseis de defesa e interceptar os ataques inimigos. Proteja as seis cidades; elas são restauradas a cada fase. As 40 fases trazem mais mísseis e ataques mais rápidos.',
  cannon: 'Mire com o mouse e segure para carregar a força. Solte para disparar e acertar o alvo. Cada fase exige vários acertos, com alvos menores e menos balas. Complete as 40 fases para vencer.',
  gravity: 'Inverta a gravidade para desviar dos obstáculos e continuar vivo. Cada fase tem uma meta de distância, mais velocidade e obstáculos duplos. Você tem 3 vidas por fase; complete as 40 para vencer.',
  tron: 'Pilote uma moto de luz e deixe um rastro brilhante. Force a IA (ou o outro jogador) a bater no rastro ou na parede — e não toque em nenhum rastro você mesmo. No modo 2 jogadores, o J1 usa as setas e o J2 usa WASD; a partida é melhor de três, com placar de rodadas. Na campanha, são 40 rodadas com a IA cada vez mais rápida e agressiva.',
  comecoco: 'Coma todas as bolinhas do labirinto e fuja dos fantasmas. As pílulas grandes deixam os fantasmas vulneráveis por alguns segundos. São 40 fases; depois da fase 10 entram mais fantasmas, e as 3 vidas são restauradas a cada labirinto.',
  lander: 'Controle a inclinação e o motor para pousar devagar na plataforma verde. Bater forte, inclinar demais ou sair da área de pouso destrói a nave. A campanha tem 40 setores, com menos combustível e terreno mais acidentado.',
  galaxy: 'Mova a nave e atire automaticamente nos inimigos. Desvie dos tiros e das colisões. Cada fase exige um número de abates, com inimigos mais rápidos e resistentes. Você tem 3 vidas por fase; complete as 40 para vencer.',
  '2048': 'Use as setas para deslizar todos os números. Números iguais se somam ao encostar. Cada fase tem uma meta de pontos e um limite de jogadas; alcance a meta antes de acabar o limite. Complete as 40 fases para vencer a campanha.',
  minesweeper: 'Abra todas as casas sem minas. Os números indicam quantas minas existem ao redor. Use a bandeira para marcar suspeitas. O primeiro clique nunca é mina. A campanha tem 40 campos, com mais minas e tabuleiros maiores; o tempo total é o seu placar.',
  memory: 'Vire duas cartas por vez e encontre os pares de bichinhos. Cada par certo fica aberto. Complete todos os pares para avançar de nível; são 40 fases com cada vez mais pares. Menos jogadas significam melhor resultado.',
  slide15: 'Mova as peças para o espaço vazio e ordene os números de 1 até N. A campanha tem 40 fases, de 3x3 até 7x7, com embaralhamentos cada vez maiores. O objetivo é completar o quebra-cabeça no menor número de movimentos.',
  lights: 'Cada clique inverte a luz escolhida e as quatro vizinhas. Apague todas as luzes usando o menor número de movimentos. As 40 fases crescem de 3x3 até 8x8 e misturam mais luzes.',
  flood: 'Comece pela cor do canto superior esquerdo e escolha novas cores para inundar áreas vizinhas. Cubra o tabuleiro inteiro dentro do limite de jogadas. As 40 fases ficam maiores, usam mais cores e têm limites mais apertados.',
  hanoi: 'Mova a torre de discos até a haste destacada. Só é possível mover um disco por vez e nunca colocar um disco maior sobre um menor. Complete as 40 fases, com torres iniciais e destinos diferentes e até 9 discos.',
  pegs: 'Salte uma peça sobre outra para um espaço vazio e remova a peça saltada. O objetivo é terminar com apenas uma peça no tabuleiro. A campanha tem 40 tabuleiros gerados a partir de soluções válidas, com mais peças nas fases finais. Pense antes: nem todo salto leva à solução.',
  sudoku: 'Preencha a grade 9x9 com números de 1 a 9. Cada linha, coluna e bloco 3x3 deve ter todos os números sem repetição. Os números fixos não podem ser alterados. A campanha tem 40 grades, com mais lacunas a cada fase; o tempo total é o seu placar.',
  match3: 'Troque dois doces vizinhos para formar uma fila de 3 ou mais iguais. As combinações somem, rendem pontos e fazem novos doces cair. Bata a meta antes que os movimentos acabem. São 40 fases com metas cada vez maiores.',
  colorsort: 'Despeje a cor do topo de um tubo em outro. Só é possível despejar sobre a mesma cor ou em um tubo vazio. Separe todas as cores para avançar; são 40 fases, de 4 até 10 cores.',
  sokoban: 'Empurre todas as caixas até os pontos marcados. Você só pode empurrar, nunca puxar, e não pode atravessar caixas ou paredes. Use Z para desfazer. A campanha tem 40 níveis, com salas maiores, mais caixas e novas paredes.',
  wordsearch: 'Encontre todas as palavras escondidas na grade. Marque a primeira e a última letra de cada palavra; elas podem estar na horizontal, vertical ou diagonal. A campanha tem 40 grades, com mais palavras e direções a cada fase; o tempo total é o seu placar.',
  tictactoe: 'Marque três símbolos em linha, coluna ou diagonal. No modo 1 jogador você é X contra a máquina; no modo 2 jogadores, X e O alternam cliques. Cada vitória vale um ponto.',
  connect4: 'Solte uma peça na coluna escolhida. O objetivo é alinhar quatro peças iguais na horizontal, vertical ou diagonal. No modo 2 jogadores, vermelho e amarelo alternam; no modo 1 jogador você enfrenta a IA.',
  reversi: 'Coloque uma peça de modo a cercar peças adversárias em linha; elas são viradas para a sua cor. Quando ninguém puder jogar, vence quem tiver mais peças. No modo 2 jogadores, preto e branco alternam.',
  mastermind: 'Descubra a combinação secreta de quatro cores. Após cada palpite, as bolinhas indicam quantas cores estão certas na posição certa e quantas estão certas na posição errada. Você tem 10 tentativas.',
  rps: 'Escolha pedra, papel ou tesoura. Pedra vence tesoura, tesoura vence papel e papel vence pedra. Cada vitória aumenta sua sequência; uma derrota encerra a partida.',
  battleship: 'A frota inimiga está escondida no tabuleiro. Clique nas casas para atirar e afundar todos os navios. Cada tiro errado conta; use os acertos para deduzir as posições.',
  mancala: 'Semeie as pedras das suas covas no sentido anti-horário. Ao terminar na sua reserva, você joga de novo. Quando uma cova sua fica vazia, você captura as pedras da cova oposta. Vence quem tiver mais pedras na reserva.',
  wordle: 'Descubra a palavra secreta de 5 letras em 6 tentativas. Verde = letra certa na posição certa; amarelo = letra certa na posição errada; cinza = letra ausente. A palavra muda a cada partida.',
  hangman: 'Adivinhe a palavra secreta uma letra por vez. Cada erro desenha uma parte do boneco. Você perde ao completar o boneco; acerte a palavra para vencer.',
  anagram: 'Reorganize as letras embaralhadas para formar a palavra correta. Digite a resposta e confirme antes do tempo acabar. Palavras maiores valem mais pontos.',
  typing: 'Digite as palavras que aparecem e pressione Espaço para confirmar. O placar mostra palavras por minuto e precisão. Erros e acentos contam contra você.',
  mathrush: 'Resolva a conta escolhendo a alternativa correta. Cada acerto soma pontos e devolve tempo; cada erro custa tempo. Responda o máximo que puder antes do relógio zerar.',
  guess: 'Descubra o número secreto entre 1 e 100. Após cada chute você recebe a dica "maior" ou "menor". Quanto menos tentativas, melhor o recorde.',
  quiz: 'Responda às perguntas de conhecimentos gerais escolhendo uma alternativa. Cada acerto vale 1 ponto. O resultado final mostra quantas você acertou de 10.',
  flags: 'Identifique o país correspondente à bandeira. Cada acerto soma pontos e aumenta a sequência. Você tem 3 vidas; cada erro perde uma.',
  whackmole: 'Acerte as toupeiras que aparecem e evite as bombas. Você tem 30 segundos para fazer o máximo de pontos. Cada erro ou bomba pode custar tempo ou pontos.',
  cps: 'Clique o mais rápido possível durante 10 segundos. O placar mostra cliques por segundo. Use o mouse ou toque; o recorde é a maior quantidade de cliques.',
  reaction: 'Espere o semáforo ficar verde e clique imediatamente. O tempo de reação é medido em milissegundos; quanto menor, melhor. Clicar antes do verde reinicia a tentativa.',
  aim: 'Acerte os alvos que aparecem e encolhem. Cada alvo vale pontos e os menores valem mais. Errar o alvo pode reduzir sua precisão ou o tempo.',
  stroop: 'Escolha a cor da tinta da palavra, não o significado escrito. Exemplo: a palavra "AZUL" escrita em vermelho pede o botão vermelho. Acerte o máximo antes do tempo.',
  balloons: 'Estoure os balões clicando ou tocando neles. Balões mais rápidos e menores valem mais. Deixe os balões escaparem e você perde pontos ou vidas.',
  simon: 'Observe a sequência de luzes e sons e repita na mesma ordem. A cada rodada a sequência cresce. Um erro encerra a partida.',
  piano: 'Toque apenas nos tiles pretos, na ordem em que descem. Não deixe um tile passar e não toque nos brancos. A velocidade aumenta com o tempo.',
  numbermem: 'Memorize o número que aparece e digite-o quando ele sumir. A cada acerto o número fica maior. Um erro termina a partida.',
  schulte: 'Clique nos números de 1 a 25 na ordem crescente. O tempo corre desde o primeiro clique. Quanto menor o tempo, melhor o recorde.',
  cookie: 'Clique no biscoito para ganhar biscoitos e compre melhorias que produzem automaticamente. O progresso fica salvo no navegador. Deixe o império crescer até onde quiser.',
  blackjack: 'Chegue o mais perto de 21 sem estourar. Cartas numéricas valem seu número; J, Q e K valem 10; Ás vale 1 ou 11. Você pode Pedir, Parar ou Dobrar. O dealer compra até 17.',
  war: 'Cada jogador vira uma carta; a maior vence a rodada e leva as duas. Empates iniciam uma guerra com cartas extras. Vença rodadas até acabar o baralho ou a partida.',
  hilo: 'Adivinhe se a próxima carta será maior ou menor que a atual. Acertos aumentam a sequência e os pontos. Um erro encerra a rodada; cartas iguais podem ser configuradas como empate.',
  slots: 'Escolha uma ficha e gire os rolos. Três símbolos iguais pagam prêmios; combinações raras pagam mais. As fichas são de mentirinha e o saldo fica salvo no navegador.',
  pig: 'Role o dado e some os pontos da rodada. Se tirar 1, perde os pontos acumulados na rodada. Guarde antes de arriscar. O primeiro a chegar a 50 vence.',
  coinflip: 'Escolha cara ou coroa antes de cada giro. Cada acerto aumenta sua sequência. Um erro zera a sequência; o recorde é a maior sequência de acertos.',
  roulette: 'Escolha uma ficha, aposte em vermelho/preto, par/ímpar ou números e gire a roda. A roleta é europeia, com um único zero. O saldo é fictício e fica salvo no navegador.',
  dados: 'Role cinco dados e escolha quais segurar. Você tem até 3 rolagens para montar a melhor combinação de pôquer. A categoria escolhida define sua pontuação.',
  solitaire: 'Monte as quatro fundações de Ás a Rei, uma por naipe. No tabuleiro, sequências descem em cores alternadas e só o Rei pode ocupar uma coluna vazia. Toque numa carta para selecionar uma sequência válida e toque no destino. Use o monte para comprar cartas e o espaço vazio para reembaralhar. A campanha tem 40 fases; cada uma usa um baralho diferente e aumenta a dificuldade de compra e o limite de reembaralhamentos.',
  football: 'Marque no gol adversário e defenda o seu. Segure Espaço (ou Enter no J2) perto da bola para carregar a potência do chute; Shift dá um pique e gasta stamina. A IA marca, apoia e finaliza, e os goleiros se esticam para defender. No modo 2 jogadores, o J1 usa WASD + Espaço + Shift esquerdo e o J2 usa as setas + Enter + Shift direito. O campeonato tem três partidas eliminatórias, com prorrogação de gol de ouro em caso de empate. Escolha dia, noite ou chuva nos Ajustes.',
  moto: 'Pilote por três circuitos (cidade, deserto e neon) numa estrada que serpenteia de verdade. Troque de faixa, acelere, freie e use o nitro para ultrapassar. Colete nitro, pegue boost pads e passe raspando nos carros para ganhar bônus de quase-acidente e multiplicar o combo. Bater reduz a saúde e zera o combo; se a moto for destruída, a corrida termina. Ajuste voltas, dificuldade e densidade do trânsito nos Ajustes.'
};

/* Recursos extras de configuração disponíveis em cada jogo.
   O player monta a aba de configurações a partir daqui. */
Arcadia.features = {
  pong:      { players: true, difficulty: true, target: true },
  tron:      { players: true },
  tictactoe: { players: true, difficulty: true },
  connect4:  { players: true, difficulty: true },
  reversi:   { players: true, difficulty: true },
  football:  { players: true, difficulty: true, minutes: true, tournament: true, weather: true },
  moto:      { difficulty: true, laps: true, traffic: true }
};

/* Jogos que usam A.campaign e, por isso, ganham o modo História com
   progresso salvo por fase. A Paciência tem campanha própria, mas também
   usa A.story para aparecer em "Continue sua história". */
Arcadia.storyGames = new Set([
  'snake', 'breakout', 'flappy', 'invaders', 'asteroids', 'dino',
  'cardodge', 'stack', 'catcher', 'doodle', 'copter', 'ninja',
  'maze', 'missile', 'cannon', 'gravity', 'tron', 'galaxy',
  '2048', 'minesweeper', 'pegs', 'sudoku', 'wordsearch', 'solitaire'
]);

/* Jogos em que MENOR pontuação é melhor (tempo, movimentos, tentativas).
   Usado pelo ranking para ordenar os rivais corretamente. */
Arcadia.lowGames = new Set([
  'minesweeper', 'memory', 'slide15', 'lights', 'flood', 'hanoi', 'pegs',
  'sudoku', 'colorsort', 'wordsearch', 'guess', 'reaction', 'schulte',
  'mastermind', 'battleship', 'solitaire'
]);

/* Formatação dos números do ranking (a mesma ideia do K.fmt de cada jogo). */
Arcadia.rankFormat = {
  minesweeper: n => n + 's',
  memory: n => n + ' jog.',
  slide15: n => n + ' mov.',
  lights: n => n + ' mov.',
  flood: n => n + ' jog.',
  hanoi: n => n + ' mov.',
  pegs: n => n + ' mov.',
  sudoku: n => n + 's',
  colorsort: n => n + ' mov.',
  wordsearch: n => n + 's',
  guess: n => n + ' tent.',
  reaction: n => n + ' ms',
  schulte: n => (n / 10).toFixed(1) + 's',
  mastermind: n => n + ' tent.',
  battleship: n => n + ' tiros',
  solitaire: n => n + ' mov.',
  typing: n => n + ' ppm',
  cps: n => n + ' cliques',
  cookie: n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n),
  football: n => n + ' gols'
};

/* Faixas plausíveis para os rivais do ranking. Quando o jogador já tem um
   recorde, os rivais são gerados em torno dele; estas faixas cobrem o caso
   de alguém abrir o ranking antes de jogar. */
Arcadia.rankRanges = {
  snake: [80, 1600], pong: [3, 11], breakout: [150, 2600], flappy: [5, 80],
  invaders: [200, 2400], asteroids: [200, 2400], dino: [300, 5000],
  tetris: [10, 120], frogger: [50, 500], cardodge: [300, 5000],
  stack: [10, 90], catcher: [20, 120], doodle: [300, 6000], copter: [50, 600],
  ninja: [20, 300], maze: [30, 400], missile: [200, 2400], cannon: [50, 600],
  gravity: [300, 5000], tron: [1, 5], comecoco: [300, 3500], lander: [50, 600],
  galaxy: [200, 3000], '2048': [800, 16000], minesweeper: [90, 600],
  memory: [18, 40], slide15: [40, 180], lights: [12, 60], flood: [18, 70],
  hanoi: [15, 80], pegs: [15, 45], sudoku: [300, 1200], match3: [400, 4000],
  colorsort: [25, 90], sokoban: [60, 300], wordsearch: [120, 500],
  tictactoe: [1, 12], connect4: [1, 10], reversi: [10, 60], mastermind: [4, 10],
  rps: [1, 12], battleship: [25, 80], mancala: [20, 48], wordle: [1, 10],
  hangman: [1, 10], anagram: [20, 200], typing: [25, 80], mathrush: [10, 150],
  guess: [4, 10], quiz: [1, 10], flags: [1, 30], whackmole: [5, 60],
  cps: [60, 140], reaction: [180, 450], aim: [10, 120], stroop: [10, 100],
  balloons: [10, 120], simon: [3, 20], piano: [10, 200], numbermem: [3, 20],
  schulte: [140, 700], cookie: [500, 50000], blackjack: [50, 500],
  war: [5, 26], hilo: [10, 200], slots: [0, 1000], pig: [1, 10],
  coinflip: [1, 20], roulette: [0, 2000], dados: [50, 400],
  solitaire: [70, 180], football: [0, 10], moto: [500, 8000]
};

/* Baralhos da Paciência. O preço é pago com as moedas ganhas ao concluir
   fases. Cada tema define o verso e a face das cartas. */
Arcadia.cardDecks = [
  {
    id: 'classic', name: 'Clássico', cost: 0,
    face: 'linear-gradient(155deg,#ffffff,#e8ebf6)',
    back: 'repeating-linear-gradient(45deg,#4c3bd0,#4c3bd0 6px,#6b57ff 6px,#6b57ff 12px)',
    ink: '#14172a', red: '#d21f3c'
  },
  {
    id: 'gold', name: 'Ouro', cost: 90,
    face: 'linear-gradient(155deg,#fff9e0,#f6df9b)',
    back: 'repeating-linear-gradient(45deg,#8a6a1a,#8a6a1a 6px,#d4af37 6px,#d4af37 12px)',
    ink: '#4a3210', red: '#a0122a'
  },
  {
    id: 'neon', name: 'Neon', cost: 150,
    face: 'linear-gradient(155deg,#eafffb,#c9fff4)',
    back: 'repeating-linear-gradient(45deg,#0a6b61,#0a6b61 6px,#00e0b8 6px,#00e0b8 12px)',
    ink: '#07332f', red: '#e0245e'
  },
  {
    id: 'ruby', name: 'Rubi', cost: 240,
    face: 'linear-gradient(155deg,#fff1f4,#ffd4de)',
    back: 'repeating-linear-gradient(45deg,#7a0f2a,#7a0f2a 6px,#e0245e 6px,#e0245e 12px)',
    ink: '#3a0a16', red: '#b0002a'
  },
  {
    id: 'ocean', name: 'Oceano', cost: 360,
    face: 'linear-gradient(155deg,#eff8ff,#c7e6ff)',
    back: 'repeating-linear-gradient(45deg,#0d3b66,#0d3b66 6px,#1b8cd4 6px,#1b8cd4 12px)',
    ink: '#0a2740', red: '#c2185b'
  },
  {
    id: 'midnight', name: 'Meia-noite', cost: 480,
    face: 'linear-gradient(155deg,#dfe3ff,#aab4ff)',
    back: 'repeating-linear-gradient(45deg,#1a1f3d,#1a1f3d 6px,#4c7dff 6px,#4c7dff 12px)',
    ink: '#101430', red: '#e0245e'
  },
  {
    id: 'forest', name: 'Floresta', cost: 600,
    face: 'linear-gradient(155deg,#f2ffe9,#c9f5b8)',
    back: 'repeating-linear-gradient(45deg,#1e5b2a,#1e5b2a 6px,#3ddc84 6px,#3ddc84 12px)',
    ink: '#133018', red: '#c2185b'
  }
];
