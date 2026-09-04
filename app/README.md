# Casa em Módulos — Configurador 2D

Configurador fotográfico em HTML, CSS e JavaScript puro. O runtime não possui dependências e continua abrindo diretamente pelo `index.html`.

## Abrir no computador

1. Extraia o ZIP.
2. Abra `index.html` com dois cliques.

Não é necessário instalar Node.js, npm ou qualquer biblioteca.

## Arquitetura atual

- `data/scene-data.js`: catálogo autoritativo da cena, módulos, ordem, defaults e acabamentos.
- `data/mask-data.js`: cópia Base64 gerada das máscaras, usada para funcionar diretamente sob `file://`.
- `core/state.js`: estado determinístico de visibilidade.
- `core/visibility.js`: resolução de intenção, hospedagem e substituições.
- `core/validation.js`: referências, ciclos e invariantes estruturais.
- `core/fingerprint.js`: identificação reproduzível de cada configuração.
- `core/finishes.js`: intensidade determinística das sobreposições de cor.
- `app.js`: montagem da interface e ligação entre dados, estado e DOM.
- `assets/kitchen`: parede-base, camadas transparentes e máscaras aprovadas.
- `data/technical-data.json`: hashes e limites alfa congelados do baseline vigente.
- `tools`: testes do núcleo e validação pixel a pixel.
- `docs`: guia de arquitetura e inventário de reaproveitamento do MobiliPresenter.

## Estado da migração

Fase 2 concluída: módulos, controles, ordem e defaults vêm dos dados; relações de hospedagem e substituições são resolvidas declarativamente. A Fase 3 começou com a separação determinística das pedras dos módulos 02 e 03. O fogão convencional ainda é um placeholder totalmente transparente. A correção 3.2.2 eliminou os pixels de parede incorporados ao alfa do módulo 02. A correção 3.2.3 consertou branco e preto. A correção 3.2.4 incorporou as máscaras ao JavaScript para permitir a recoloração ao abrir o `index.html` diretamente no Chrome ou Firefox.

As próximas fases devem seguir `docs/GUIA-IMPLEMENTACAO-2D-DATA-DRIVEN.md`. O próximo asset estrutural aprovável da Fase 3 é o fogão fotográfico; máscaras específicas de pedra serão produzidas antes de habilitar seus acabamentos.

## Validação opcional

Para desenvolvimento, com Node.js e Python/Pillow disponíveis:

```bash
npm test
npm run build
```
