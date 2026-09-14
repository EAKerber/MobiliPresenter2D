# Casa em Módulos — Configurador 2D

Configurador fotográfico em HTML, CSS e JavaScript puro. O runtime não possui dependências e continua abrindo diretamente pelo `index.html`.

## Abrir no computador

1. Extraia o ZIP.
2. Abra `index.html` com dois cliques.

Não é necessário instalar Node.js, npm ou qualquer biblioteca.

## Arquitetura atual

- `data/scene-data.js`: catálogo autoritativo da cena, módulos, ordem, defaults e acabamentos.
- `data/mask-data.js`: cópia Base64 gerada das máscaras, usada para funcionar diretamente sob `file://`.
- `data/stone-data.js`: entradas de pedra incorporadas para os quatro estados de visibilidade.
- `core/state.js`: estado determinístico de visibilidade.
- `core/visibility.js`: resolução de intenção, hospedagem e substituições.
- `core/validation.js`: referências, ciclos e invariantes estruturais.
- `core/fingerprint.js`: identificação reproduzível de cada configuração.
- `core/finishes.js`: intensidade determinística das sobreposições de cor.
- `core/stone.js`: recoloração da pedra com textura preservada e proteção dos objetos.
- `app.js`: montagem da interface e ligação entre dados, estado e DOM.
- `assets/kitchen`: parede-base, camadas transparentes e máscaras aprovadas.
- `data/technical-data.json`: hashes e limites alfa congelados do baseline vigente.
- `tools`: testes do núcleo e validação pixel a pixel.
- `docs`: guia de arquitetura e inventário de reaproveitamento do MobiliPresenter.

## Estado da migração

Fases 2 e 3 concluídas: módulos, controles, ordem e defaults vêm dos dados; relações de hospedagem e substituições são resolvidas declarativamente. O fogão convencional e o conjunto aprovado de cuba, cooktop, escorredor removido e torneira acompanham a visibilidade dos módulos correspondentes. A Fase 4 já oferece cores de pedra independentes das frentes, mantendo textura, objetos protegidos e reset exato, inclusive ao abrir o `index.html` diretamente no Chrome ou Firefox.

As próximas fases devem seguir `docs/GUIA-IMPLEMENTACAO-2D-DATA-DRIVEN.md`. O runtime da Fase 4 está publicado em <https://mobilipresenter2d.netlify.app/>; o julgamento estético fino dos tons e das bordas permanece registrado separadamente. Veja `../docs/work/STATUS-ATUAL.md` para o ponto de retomada.

## Validação opcional

Para desenvolvimento, com Node.js e Python/Pillow disponíveis:

```bash
npm test
npm run build
```
