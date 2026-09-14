# MobiliPresenter2D

Configurador fotográfico 2D em câmera fixa, canvas 1536 × 1024 e runtime determinístico.

**Estado atual: Fase 4 — cor da pedra / R6 publicada.** Componentes aprovados e controle independente da pedra estão na `main`, com textura preservada e reset. A entrega funcional foi integrada pelo PR #25 no commit `9ec9cb052c43cccf2ffd5cbb8c1b2c947ef2bc27` e está disponível em <https://mobilipresenter2d.netlify.app/>. A avaliação estética fina dos novos tons continua separada da validação funcional.

Leia [Estado atual e próximos passos](docs/work/STATUS-ATUAL.md) para retomar o projeto sem reconstruir o histórico.
O [guia geral](app/docs/GUIA-IMPLEMENTACAO-2D-DATA-DRIVEN.md) descreve as fases 0–9.

Abra `app/index.html` para usar o configurador. A execução local não exige servidor.
Validação: `cd app && npm test`. As alterações seguem branches de trabalho; main permanece protegida.
