# 🕹 ARCADIA — portal de 70+ jogos (HTML + CSS + JS puro)

Sem login, sem build, sem dependências. Funciona direto no **GitHub Pages**.
Recordes, favoritos e "recentes" ficam salvos no `localStorage` do navegador.

## ⭐ Destaques de estúdio
- **Futebol de Campo** — estádio com torcida animada, gramado listrado, goleiros
  que se esticam, chute carregado, pique com stamina, IA com ataque/defesa,
  clima (dia/noite/chuva), modo 2 jogadores e campeonato de 3 rodadas com gol de ouro.
- **Moto Veloz** — 3 circuitos (cidade, deserto e neon), estrada sinuosa com curvas
  reais, nitro, boost pads, combo de quase-acidente, carros e caminhões, faíscas,
  fumaça e HUD completo.
- **Campanhas de 40 fases** nos jogos de arcade e nos puzzles de progressão: metas, dificuldade crescente e tela de vitória ao completar a fase 40.
- **Pausa em qualquer jogo** pelo botão ⏸ ou pela tecla `P`.
- **Ajustes por jogo**: som, volume, vibração, controles de toque, dificuldade,
  duração, voltas, clima do estádio e densidade do trânsito.

## 🎒 Progressão 100% individual
- **Não existe carteira, bolsa, loja ou desafios globais do site.** Cada jogo
  tem a própria moeda, a própria loja e os próprios desafios.
- **Também não existe vida infinita, renascimento automático, multiplicador
  global de pontos nem drops compartilhados.** Qualquer melhoria pertence ao
  jogo em que foi comprada e só vale ali.
- A home não mostra saldo, loja nem desafios: tudo aparece apenas dentro da
  página do jogo, com a moeda daquele jogo.

## 🪙 Economia por jogo
- **Cada jogo tem a própria carteira** (`arc:econ:<id>`), com saldo, ganhos, partidas, recorde, temas e desafios resgatados.
- As moedas do jogo são ganhas ao terminar partidas e ao concluir fases; o valor depende do placar, do recorde e do modo (história/campeonato).
- **Loja do jogo** no header (pílula 🪙), no menu pré-jogo e na pausa: temas de mesa/cenário exclusivos (Neon, Ouro, Rubi…). Na Paciência, a loja vende baralhos.
- **Desafios próprios**: jogar 3 e 10 partidas e acumular moedas, cada um com recompensa em moedas do jogo.
- O cenário de cada partida usa a marca **GPWEB** como mesa de fundo, tingida pelo tema escolhido e pela categoria do jogo.
- A home não mostra saldo, bolsa, loja nem desafios: esses elementos existem só no jogo, com a moeda daquele jogo.

## Como publicar no GitHub Pages
1. Crie um repositório no GitHub e envie **o conteúdo desta pasta** (o `index.html` precisa ficar na raiz).
2. No repositório: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
3. Em ~1 minuto o site estará em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

> **O que é o `.nojekyll`?** É um arquivo vazio (0 bytes) na raiz do projeto. Ele diz ao
> GitHub Pages para **não processar o site com Jekyll**. Assim os arquivos são publicados
> exatamente como estão, sem build, sem demora e sem ignorar pastas/arquivos que começam
> com `_` ou `.`. Ele não afeta o funcionamento local; pode manter sem medo.

> Para testar localmente: `python3 -m http.server` dentro da pasta e abra `http://localhost:8000`.
> (Abrir o `index.html` com duplo clique também funciona, exceto a página do jogo, que carrega scripts dinamicamente — prefira o servidor local.)

## Navegação e visual
- **Logotipo oficial** (`images/arcadia-logo.png`) no header e no menu lateral, com favicon próprio.
- **Header fixo** no topo com busca instantânea (atalho `/`).
- **Menu lateral animado** (hambúrguer) com Início, Favoritos, Recentes, Jogo aleatório e todas as categorias.
- **Dock fixo no rodapé** (celular) com cinco atalhos, pensado para toque (com área segura do iPhone).
- **Barra de progresso** de rolagem no topo, cards com entrada em cascata e animações de feedback.
- Tudo responsivo, inclusive em telas pequenas, e respeitando `prefers-reduced-motion`.

## Estrutura
```
index.html          → home (destaque do dia, busca, categorias, favoritos, recentes)
game.html           → página que carrega qualquer jogo (?g=id)
.nojekyll           → arquivo vazio que desativa o Jekyll no GitHub Pages
images/
  gpweb.png         → marca GPWEB transparente usada como cenário/mesa
  arcadia.png       → logotipo original (fonte)
  arcadia-logo.png  → logotipo otimizado usado no header e no menu lateral
  arcadia-icon.png  → ícone/favicon gerado a partir do logotipo
css/style.css       → todo o visual (inclui a seção de navegação avançada)
js/common.js        → utilidades, som (WebAudio), favoritos, efeitos
js/catalog.js       → LISTA DE JOGOS (nome, ícone, descrição, controles, arquivo)
js/ui.js            → menu lateral, dock inferior, progresso de scroll e atalhos
js/portal.js        → lógica da home (filtros, busca e hash da URL)
js/powerups.js      → itens, inventário, efeitos temporários, loja, desafios e renascimento
js/economy.js       → carteira/loja/desafios por jogo, temas de mesa e cenário da marca
js/player.js        → moldura do jogo + "kit" (loop, teclado, toque, canvas, placar)
js/games/
  arcade1.js  arcade2.js  arcade3.js   → 23 jogos de ação (canvas)
  puzzle1.js  puzzle2.js               → 13 puzzles
  board.js                             → 8 jogos de tabuleiro (com IA, inclui Xadrez)
  mente.js                             → 8 jogos de palavras/conhecimento
  reflex.js                            → 11 jogos de reflexo/clicker
  cards.js                             → 9 jogos de cartas/sorte
  sports.js                            → Futebol de Campo e Moto Veloz (canvas avançado)
```

## Controles dos jogos em destaque
**Futebol de Campo**
- J1: `WASD` move, `Shift` esquerdo corre, segure `Espaço` para carregar o chute.
- J2: setas movem, `Shift` direito corre, segure `Enter` para carregar o chute.
- No celular, o direcional e o botão ● aparecem automaticamente.
- Torneio: 3 partidas eliminatórias; empate leva à prorrogação com gol de ouro.

**Moto Veloz**
- `← →` ou `A D` desviam, `↑` acelera, `↓` freia e `Espaço` usa o nitro.
- No celular, deslize para trocar de faixa e use os botões ◀ ▶ ●.
- Complete as voltas de cada circuito; passar raspando nos carros aumenta o combo.

## Adicionando um jogo novo
1. Em qualquer arquivo de `js/games/` (ou um novo), registre:
```js
Arcadia.register('meujogo', K => {
  K.canvas(480, 480);               // cria um canvas que se ajusta à tela
  K.loop(dt => {                    // game loop (dt em segundos)
    K.R(0, 0, 480, 480, '#000');    // K.R retângulo, K.C círculo, K.T texto
    if (K.keys.ArrowLeft) { /* ... */ }
  });
  // K.addScore(10)  K.over('Fim!')  K.sfx('coin')  K.pad('arrows')  K.swipe()
});
```
2. Adicione uma linha em `js/catalog.js` apontando para o arquivo.

Recursos do kit `K`: `setScore/addScore`, `over(msg, score, naoSalvar)`, `low=true` (menor pontuação é melhor), `fmt`, `onKey`, `keys`, `dir()`, `pad()` (botões de toque), `swipe()`, `after/every` (timers com limpeza automática), `pos(e)` (coordenadas no canvas).

## Observações
- O Quiz de Bandeiras usa imagens de `flagcdn.com` (precisa de internet). Os demais jogos funcionam offline.
- As fontes vêm do Google Fonts; sem internet o site usa fontes do sistema.
