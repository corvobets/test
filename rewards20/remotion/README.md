# Corvo Bets Rewards em Remotion

Projeto Remotion com as duas composições, **Vertical** (1080×1920) e **Horizontal** (1920×1080), a 60 fps e 19,2 s, com a banda sonora.

As cenas são o mesmo código de `../comp.js`, `../layout-*.js`, `../engine.js` e `../timeline.js`, por isso o resultado é igual aos MP4 já entregues. Cada fotograma do Remotion desenha o tempo `frame / 60` desse código.

## No teu computador

Precisas de [Node.js](https://nodejs.org) 18 ou mais recente.

```bash
cd rewards20/remotion
npm install
npm run studio              # abre o Remotion Studio no browser: timeline, scrub, props
npm run render              # renderiza as duas versões para out/
npm run render:vertical     # só a vertical
```

No Studio, as props de cada composição são:
- `motionBlur`: sub-fotogramas de desfoque de movimento, de 1 a 8. Usa 5 na versão final e 1 para pré-visualizar mais depressa.
- `music`: liga ou desliga a banda sonora.

## Editar

- **Texto, cenas e animações:** `../comp.js`.
- **Posições de cada formato:** `../layout-vertical.js` e `../layout-horizontal.js`.
- **Tempos:** `../timeline.js`.
- **Som:** `../audio.mjs` gera `../rewards-audio.wav`, com `cd .. && ./build.sh audio`. Se mudares os tempos, gera o som outra vez.

`npm run studio` e `npm run render` copiam estes ficheiros para `public/` antes de arrancar. Se o Studio já estiver aberto, corre `npm run sync` e recarrega a página.

Licença: o Remotion é gratuito para particulares e empresas até 3 pessoas. Acima disso precisa de uma licença de empresa (remotion.pro).
