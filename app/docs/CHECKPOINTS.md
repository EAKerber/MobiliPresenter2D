# Checkpoints

## Fase 0 — baseline v3

- Composição fotográfica aprovada congelada.
- Canvas canônico: 1536 × 1024.
- Background + oito camadas recompõem o golden com zero pixels diferentes.
- Débito visual conhecido: fase dos azulejos da coluna ainda alinhada à parede.

## Fase 1 — dados sem mudança visual

- Catálogo da cena externalizado em `data/scene-data.js`.
- Módulos, controles, ordem e opções de cor são gerados a partir dos dados.
- Estado mínimo centralizado em `core/state.js`.
- Fingerprint determinístico implementado em `core/fingerprint.js`.
- Fingerprint do estado inicial: `scene2d-679b38a8`.
- Hashes e limites alfa do v3 congelados em `data/technical-data.json`.
- Teste do núcleo e fidelity harness adicionados em `tools/`.
- Nenhum asset visual foi alterado.
- Nenhum recurso das fases 2–9 foi antecipado.
- Gate: 18 assets validados e zero pixels diferentes do golden.

## Fase 2 — relações e substituições

- Visibilidade efetiva separada da intenção do usuário.
- Motivos implementados: `visible`, `intent-off`, `default-hidden`, `host-hidden`, `host-missing` e `substitution-primary-visible`.
- Itens hospedados herdam a invisibilidade do hospedeiro.
- Ciclos e referências ausentes são rejeitados antes da montagem da UI.
- Grupo `stove-zone` declara a troca `module-02` → `range-freestanding`.
- O fogão convencional usa um PNG integralmente transparente como placeholder temporário.
- Ocultar o módulo 02 ativa a substituição sem adicionar pixels nesta fase.
- Fingerprint do estado inicial: `scene2d-eb92f11c`.
- Gate: 19 assets validados e zero pixels diferentes do golden no estado inicial.

## Correção 3.2.1 — tentativa na parede-base (supersedida)

- A primeira hipótese atribuiu o deslocamento à sombra da parede-base.
- A inspeção posterior demonstrou que a hipótese estava incompleta: o módulo 02 carregava pixels de azulejo em seu próprio alfa.
- Este checkpoint fica preservado no histórico, mas não é mais a autoridade visual.

## Correção 3.2.2 — alfa do módulo 02

- Causa real: um retângulo de parede estava incorporado ao PNG do módulo do fogão.
- `base.png` voltou à versão v3 com a sombra sutil correta da coluna.
- O alfa do módulo 02 passou de `[471, 456, 764, 912]` para `[484, 491, 764, 912]`.
- O grande retângulo de azulejo foi removido sem alterar RGB, câmera ou geometria.
- O espelho de pedra foi recomposto como faixa contínua em perspectiva, eliminando os recortes quadriculados entre as panelas.
- Um fragmento bege junto à alça esquerda e um traço escuro na junção também foram removidos.
- `tools/build-module02-alpha-v2.py` recria a máscara e `tools/fix-module02-alpha.py` restringe qualquer recuperação de pixels ao espelho de pedra.
- O fidelity harness compara explicitamente o alfa final do módulo 02 com a máscara aprovada.
- Fingerprint do estado inicial corrigido: `scene2d-855d5633`.
- Gate: 19 assets validados, alfa exato e zero pixels diferentes da nova referência.

## Correção 3.2.3 — acabamentos branco e preto

- Causa: `mix-blend-mode: color` preservava a luminosidade original e anulava visualmente cores acromáticas.
- As cores agora usam sobreposição normal limitada pelas mesmas máscaras fotográficas.
- Cada preset declara `overlayOpacity`; Branco TX usa `0.84` e Preto usa `0.78`.
- Cores personalizadas recebem intensidade adaptativa pela luminância escolhida.
- Imagens, máscaras e golden permanecem byte a byte inalterados.
- O teste do núcleo cobre explicitamente os extremos branco e preto.
- Fingerprint do estado inicial: `scene2d-e195140a`.

## Correção 3.2.4 — máscaras compatíveis com arquivo local

- Causa: navegadores modernos não carregam PNGs externos em `mask-image` sob `file://` por regras de origem/CORS.
- `data/mask-data.js` contém Data URLs das seis máscaras editáveis.
- Os caminhos originais continuam sendo a identidade autoritativa nos dados da cena.
- `tools/build-inline-masks.py` recria o arquivo incorporado a partir dos PNGs.
- O teste do núcleo decodifica cada Data URL e exige igualdade byte a byte com o PNG original.
- O build agora inclui tanto `data/mask-data.js` quanto `core/finishes.js`.
- Resultado esperado: cores e texturas funcionam ao abrir `index.html` diretamente do disco, sem servidor.
- Fingerprint do estado inicial: `scene2d-3c945a88`.

## Fase 3.3.0 — pedras separadas dos módulos

- As pedras dos módulos 02 e 03 passaram a ser entidades hospedadas independentes: `stone-02` e `stone-03`.
- Cada entidade preserva bancada, espelho, rodapé e as oclusões fotográficas já aprovadas.
- Os módulos inferiores agora contêm somente a faixa de caixaria entre `y=590` e `y=855`.
- As fontes combinadas aprovadas permanecem em `tools/sources` e são a autoridade do recorte.
- `tools/split-stone-layers.py` reconstrói deterministicamente os quatro PNGs derivados.
- Ocultar o módulo 02 ou 03 oculta automaticamente sua pedra por relação de hospedagem.
- A ordem explícita de composição foi registrada em `data/technical-data.json`.
- As duas recomposições locais e a composição completa têm zero pixels visíveis divergentes.
- Fingerprint do estado inicial: `scene2d-89ce17bc`.
