# CORVO BETS REWARDS: 19,2 s vertical (Stories / Reels)

**Entregável:** `CorvoBetsRewards_20s_Vertical.mp4`. 1080×1920, 9:16, 60 fps, 19,2 s, H.264 High com AAC 320 kbps.

## Conceito

"Joga. Acumula. Ganha extra."

A linguagem vem da referência (`source/reference.mp4`):
- títulos grandes em itálico Black com ponto final e cortes na batida;
- glitch RGB nos cortes e um túnel de rastos de luz no drop;
- profundidade (bokeh, luzes, pódios) e um fecho palavra a palavra.

Tudo foi recomposto de raiz para 9:16 e para a identidade Corvo Bets Rewards: lima #C8F000, roxo #0E0934, cards #17133C, violeta #9641FD, branco e lilás #B8B4CC. As fontes são Montserrat Black/ExtraBold nos títulos e Inter nos textos de apoio.

## Estrutura (150 BPM: 1 tempo = 0,4 s; compassos a 0,8 · 2,4 · 4,0 · 5,6 · 7,2 · 8,8 · 10,4 · 12,0 · 13,6 · 15,2 · 16,8 · 18,4 s)

| Tempo | Cena | Texto |
|---|---|---|
| 0–2,4 | **Gancho.** Cada palavra entra com um golpe. O saldo do site ("CP 0") treme, parado em zero. Rufo, glitch e um corte seco antes do drop. | "APOSTAS…" · "E NÃO RECEBES" · "NADA EXTRA?" |
| 2,4 | **Drop.** Túnel de luz lima e violeta, flash e onda de choque. Entra o logótipo CORVO BETS REWARDS. | "AS TUAS APOSTAS" · "AGORA DÃO" · "RECOMPENSAS." |
| 4,0 | **Como funciona.** Os dois cartões do site entram em 3D e o gráfico "Evolução dos pontos" desenha-se. | "PONTOS AUTOMÁTICOS." · "1€ DEPOSITADO = 10 CP" · "1€ APOSTADO = 1,5 CP" · "As tuas apostas nas casas parceiras dão Corvo Points." |
| 5,6 | **01/04 Cashback.** O cartão real da loja ("Depósito 20€ · 40 021 CPs"), com moedas CP em profundidade. O botão RESGATAR é premido na batida (6,4 s). | "CASHBACK." · "Troca os teus pontos por depósitos." |
| 7,2 | **02/04 Leaderboard mensal.** As cinco primeiras linhas reais de Agosto de 2026 entram em cascata. Os pontos contam a ritmos diferentes, as linhas trocam de posição em direto e assentam na ordem final real, com destaque no 1.º lugar. | "LEADERBOARD MENSAL." · "Um novo ranking todos os meses." |
| 8,8 | **03/04 Roda da Sorte diária.** A roda do site (12 segmentos, pela mesma ordem) entra inclinada. "GIRAR" é premido às 9,2 s e o giro abranda com desfoque de rotação, com um tick por segmento. Às 11,2 s calha no **JACKPOT 10 000 CP**: explosão dourada, onda de choque e tremor de câmara. Às 11,8 s acelera e dá um zoom de chicote para o plano seguinte. | "RODA DA SORTE DIÁRIA." · "Gira todos os dias." · "JACKPOT!" · "10 000 CP" |
| 12,0 | **04/04 Giveaways.** Os prémios reais do site (camisola, iPhones, boné), recortados, caem em pódios de luz, cada um na batida. | "GIVEAWAYS." · "Prémios reais." |
| 13,6 | **Recapitulação**, uma palavra por tempo, como no fecho da referência. | "CASHBACK." · "LEADERBOARD." · "RODA DA SORTE." · "GIVEAWAYS." · "Tudo ligado às tuas apostas nas casas parceiras." |
| 15,2–19,2 | **Fecho.** Drop, logótipo, chamada à ação e CTA lima, completos por volta das 16,5 s e mantidos cerca de 2,7 s. O CTA pulsa na batida e o golpe final é às 18,4 s. | "JUNTA-TE À" · "CORVO BETS" · "REWARDS." · "corvobetsrewards.com" · "18+ \| Joga com responsabilidade." |

**Zonas seguras.** O texto essencial, o logótipo e o CTA ficam entre y ≈ 280 e 1460 e entre x ≈ 70 e 1000. Assim ficam fora das barras do topo, da legenda e do nome em baixo, e da coluna de botões à direita. O vídeo funciona sem som: todo o conteúdo está em texto.

## Materiais e valores (nada inventado)

- **Imagens do site** (`source/site-*.png`). As interfaces foram reconstruídas em vetor para ficarem nítidas em 1080 px (os prints têm 390 px), com os textos e valores exatos:
  - taxas de pontos;
  - cartão "Depósito 20€ · 40 021 CPs";
  - leaderboard "Encerrado · Agosto de 2026", com os cinco primeiros, pontos e prémios;
  - segmentos da roda.
- **Leaderboard:** os avatares com fotografia foram substituídos pelo ícone genérico do site, por privacidade.
- **Recortes de produto** (`tools/prep_cutouts.py`, rembg): camisola, iPhones e boné da imagem principal, e a miniatura "20€" da loja, usada inteira. O iPhone branco e a PS5 ficaram de fora porque não se separam limpos do fumo claro.
- **Cashback:** o site não mostra percentagens. O benefício é apresentado com o cartão real de troca de pontos por depósito.
- **Sem promessas:** não há percentagens nem condições inventadas, nem ganhos garantidos. O jackpot da roda é uma dramatização pedida, sem promessa de resultado.

## Som (`audio.mjs`)

- **Música:** faixa original a 150 BPM em sol menor (Gm, E♭, B♭, F):
  - stabs supersaw nos contratempos, 808 com camada de distorção para colunas de telemóvel;
  - kick e clap fortes e hi-hats com rolls;
  - breakdown na roda, drops a 2,4 s, 11,2 s (jackpot) e 15,2 s, e golpe final a 18,4 s.
- **Efeitos:**
  - glitch zaps nos cortes, whooshes e cliques nos botões;
  - ticks do leaderboard e um tick da roda por segmento, calculados a partir da mesma curva de rotação da imagem;
  - impacto e sub-drop no jackpot, e pousos dos prémios.
- **Master:** cerca de −11,5 LUFS, com limite de −2,3 dBTP.
- **Música licenciada:** `MUSIC=faixa.mp3 MUSIC_START=12.0 ./build.sh` substitui a partitura e mantém os efeitos. `MUSIC_START` é o ponto da faixa que cai no 0,0 s do vídeo.

## Editar e reconstruir

- **`timeline.js`:** todos os tempos, partilhados pela imagem e pelo som.
- **`comp-vertical.js`:** cenas, layout e texto.
- **`engine.js`:** palco, logótipo, tremor e ciclo de render.
- **Pré-visualização ao vivo:** abre `vertical.html` num servidor local e clica para tocar com som. Acrescenta `?t=11.3` para parar num fotograma.

```bash
FFMPEG=/path/to/ffmpeg ./build.sh                 # build completo (~15 min em 4 núcleos)
./build.sh audio                                  # só a banda sonora
SUB=1 node render.mjs vertical.html stills ./stills 1.9,7.9,11.3,17.0
python3 tools/prep_cutouts.py                     # refaz os recortes (rembg, pillow, scipy)
```
