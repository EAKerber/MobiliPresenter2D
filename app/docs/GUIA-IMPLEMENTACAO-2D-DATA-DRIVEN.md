# Casa em Módulos — Guia de implementação 2D data-driven

**Versão:** 0.1  
**Data:** 2026-09-02  
**Status:** decisão de arquitetura e guia para implementação futura  
**Produto alvo:** configurador fotográfico 2D, determinístico no runtime e sem dependências obrigatórias

---

## 1. Finalidade e modo de uso

Este documento reduz a carga cognitiva da futura implementação. Ele registra:

1. a decisão de manter a representação fotográfica 2D;
2. quais conceitos do repositório EAKerber/MobiliPresenter serão usados;
3. quais partes serão consultadas, adiadas ou descartadas;
4. o modelo de dados do novo compositor;
5. o contrato dos assets;
6. o pipeline de produção de imagens por IA;
7. as fases de migração;
8. os testes e critérios de aceite.

Ao retomar o trabalho, ler este guia e o inventário JSON. Não é necessário reler todo o MobiliPresenter.

---

## 2. Decisão arquitetural consolidada

O configurador permanecerá um **compositor de imagens fotográficas 2D em câmera fixa**.

A inteligência artificial será usada **offline**, durante a fabricação e correção dos assets. Depois de aprovado, cada resultado torna-se um arquivo estático e determinístico. A IA não decide geometria, visibilidade, posição ou aparência durante o uso da interface.

O experimento 3D trouxe aprendizado relevante sobre estado, ownership, substituições, materiais, acessórios, fidelidade e separação entre dados, runtime e UI. Entretanto, sua representação visual ficou abaixo da fotografia 2D em realismo do ambiente, eletrodomésticos, madeira, pedra, iluminação e detalhes naturais.

> O MobiliPresenter será fonte de conceitos e regras, não será o renderer do novo configurador.

| Categoria | Estimativa |
|---|---:|
| Conceitos e regras reaproveitáveis | 50–70% |
| Código diretamente reaproveitável | 10–20% |
| Código do renderer 3D reaproveitável | aproximadamente 0% |
| Assets 3D usados como visual final | 0% |

Os percentuais são orientação de esforço, não uma meta contratual.

---

## 3. Baselines observados

### 3.1 Compositor 2D atual

- Projeto: casa-em-modulos-configurador
- Baseline funcional: versão 3
- Canvas canônico: **1536 × 1024 px**
- Runtime: HTML, CSS e JavaScript puros
- Dependências obrigatórias: nenhuma
- Cena: um background, oito camadas, oito máscaras e uma composição completa de referência

### 3.2 Repositório analisado

- Repositório: EAKerber/MobiliPresenter
- Branch: main
- Commit: 539173ed46de49b90ca32f09d3ac4caabd183c56
- Data do commit: 2026-08-30
- Estado declarado: between-increments
- Próximo incremento declarado: M13
- Modo da análise: somente leitura

---

## 4. Invariantes do produto

Estes pontos não devem ser reabertos durante a implementação sem nova decisão explícita.

### 4.1 Visuais

1. O canvas lógico é fixo em 1536 × 1024 px.
2. Todos os assets da composição ocupam o canvas completo.
3. Nenhuma camada é reposicionada, redimensionada ou reenquadrada no runtime.
4. A responsividade redimensiona a composição inteira uniformemente.
5. O background é a autoridade do ambiente vazio.
6. A composição completa aprovada é o golden target do estado inicial.
7. Módulos devem se sobrepor como camadas de um arquivo do Photoshop.
8. Laterais, fundos, topos e caixaria permanecem brancos quando essa for a construção física.
9. Máscaras afetam somente as superfícies autorizadas.
10. Madeira, pedra e eletrodomésticos realistas preferem assets fotográficos aprovados a efeitos procedurais.

### 4.2 De estado

1. A UI não contém a lista autoritativa de módulos.
2. A ordem vem dos dados.
3. Visibilidade efetiva é derivada do estado e das relações.
4. Itens hospedados somem quando seu hospedeiro some.
5. Substituições são regras declaradas, não condicionais espalhadas.
6. Acabamento geral afeta todo o conjunto autorizado.
7. Restaurar retorna à configuração declarada.
8. A mesma configuração produz a mesma lista ordenada de assets.

### 4.3 De produção por IA

1. IA nunca é chamada no runtime.
2. Geração ocorre contra referências fixas e canvas conhecido.
3. Alterações fora da região autorizada são rejeitadas.
4. Asset aprovado é versionado e nunca regenerado silenciosamente.
5. Prompt, referências, bounding box e observações ficam registrados.
6. Aprovação humana é o gate final de realismo.

---

## 5. Autoridades do sistema

| Autoridade | Responsabilidade | Não pode decidir |
|---|---|---|
| Catálogo da cena | IDs, ordem, relações, defaults, presets e referências | aparência dos pixels |
| Assets aprovados | aparência fotográfica final | lógica de visibilidade |
| Estado do viewer | escolhas atuais do usuário | catálogo ou geometria |

DOM, resumo, contagem e composição exportada são representações derivadas.

---

## 6. Arquitetura-alvo

### 6.1 Estrutura proposta

~~~text
/
├── index.html
├── styles.css
├── app.js
├── data/
│   ├── scene-data.js
│   ├── catalog-data.js
│   └── technical-data.js
├── core/
│   ├── state.js
│   ├── visibility.js
│   ├── composition.js
│   ├── validation.js
│   └── fingerprint.js
├── ui/
│   ├── controls.js
│   ├── viewer.js
│   └── summary.js
├── assets/scenes/cozinha-01/
│   ├── manifest.js
│   ├── base/
│   ├── modules/
│   ├── masks/
│   ├── finishes/
│   ├── stones/
│   ├── substitutions/
│   ├── handles/
│   ├── lighting/
│   ├── decor/
│   └── reference/
└── tools/
    ├── validate-assets.py
    ├── compose-reference.py
    ├── compare-images.py
    └── generate-report.py
~~~

### 6.2 Compatibilidade offline

Os dados serão objetos JavaScript com conteúdo compatível com JSON e carregados por tags script. Isso evita fetch obrigatório e permite abrir index.html diretamente onde file:// bloqueia módulos ES ou requisições.

~~~js
window.CASA_EM_MODULOS_SCENE = Object.freeze({
  schemaVersion: "Scene2D 1.0",
  canvas: { width: 1536, height: 1024 }
});
~~~

Um espelho JSON pode ser gerado para ferramentas, mas não é necessário no navegador.

### 6.3 Dependências

- Runtime: nenhuma.
- Build: não obrigatório.
- Ferramentas offline: Python e Pillow para validação/composição.
- IA: ferramenta externa de produção, nunca dependência do site.

---

## 7. Modelo de dados

### 7.1 Cena

~~~js
{
  schemaVersion: "Scene2D 1.0",
  id: "cozinha-01",
  canvas: { width: 1536, height: 1024 },
  baseAsset: "assets/scenes/cozinha-01/base/base.png",
  goldenAsset: "assets/scenes/cozinha-01/reference/completa.png",
  defaultConfiguration: {
    visible: ["module-01", "module-02", "module-03", "module-04",
              "module-05", "module-06", "module-07", "lighting-08"],
    frontFinish: "gianduia-original",
    stoneFinish: "stone-original",
    handlePreset: "none",
    lightingPreset: "on",
    decorVisible: []
  },
  entities: [],
  substitutionGroups: [],
  finishGroups: []
}
~~~

### 7.2 Entidade

~~~js
{
  id: "module-03",
  alias: "03",
  label: "Inferior da pia",
  kind: "module",
  zIndex: 300,
  asset: "assets/scenes/cozinha-01/modules/03.png",
  alphaBounds: { x: 736, y: 442, width: 481, height: 470 },
  defaultVisible: true,
  controllable: true,
  hostId: null,
  visibilityIntent: "auto",
  finishGroups: ["fronts-all", "stone-all"],
  tags: ["lower", "sink-zone"]
}
~~~

### 7.3 Item hospedado

~~~js
{
  id: "decor-dish-rack",
  label: "Escorredor",
  kind: "decor",
  zIndex: 720,
  asset: "assets/scenes/cozinha-01/decor/dish-rack.png",
  hostId: "module-03",
  defaultVisible: true,
  controllable: true
}
~~~

Se module-03 estiver oculto, o escorredor terá visibilidade efetiva falsa.

### 7.4 Substituição

~~~js
{
  id: "stove-zone",
  primaryEntityId: "module-02",
  replacementEntityId: "range-freestanding",
  policy: "replacement-when-primary-hidden"
}
~~~

### 7.5 Acabamento global

~~~js
{
  id: "fronts-all",
  label: "Acabamento geral das frentes",
  scope: "global",
  targets: ["module-01", "module-03", "module-04",
            "module-05", "module-06", "module-07"],
  presets: ["gianduia-original", "white-tx", "black", "wood-cumaru"],
  defaultPresetId: "gianduia-original"
}
~~~

O scope global congela a decisão de aplicar cor ao conjunto completo.

### 7.6 Preset fotográfico

~~~js
{
  id: "wood-cumaru",
  label: "Cumaru",
  strategy: "baked-layer-per-entity",
  assetsByEntity: {
    "module-01": "assets/scenes/cozinha-01/finishes/cumaru/01.png",
    "module-03": "assets/scenes/cozinha-01/finishes/cumaru/03.png"
  }
}
~~~

### 7.7 Máscara para cor lisa

~~~js
{
  id: "solid-color-custom",
  strategy: "masked-blend",
  blendMode: "color",
  opacity: 0.92,
  masksByEntity: {
    "module-03": "assets/scenes/cozinha-01/masks/fronts/03.png"
  }
}
~~~

### 7.8 Âncora de puxador

~~~js
{
  id: "module-03/right-door/handle",
  hostEntityId: "module-03",
  surfaceId: "right-door",
  anchorPx: { x: 1182, y: 646 },
  rotationDeg: 90,
  perspectiveVariant: "front-near-right"
}
~~~

Âncoras são metadados. Para máxima fidelidade, o asset final será preferencialmente pré-renderizado por módulo.

---

## 8. Estado e resolução

### 8.1 Estado mínimo

~~~js
{
  schemaVersion: "ViewerState2D 1.0",
  visibilityByEntity: {},
  frontFinishId: "gianduia-original",
  stoneFinishId: "stone-original",
  handlePresetId: "none",
  lightingPresetId: "on",
  decorVisibility: {},
  selectedEntityId: null,
  gridVisible: false
}
~~~

### 8.2 Ordem

1. carregar defaults;
2. aplicar overrides;
3. resolver host/filho;
4. resolver substituições;
5. resolver acabamento global;
6. resolver pedra;
7. resolver puxadores;
8. resolver iluminação;
9. resolver decoração;
10. ordenar por zIndex;
11. gerar DOM/composição;
12. calcular fingerprint.

### 8.3 Motivos de visibilidade

- visible
- intent-off
- default-hidden
- host-hidden
- host-missing
- substitution-primary-visible

Essa taxonomia vem do MobiliPresenter e será mantida porque facilita diagnóstico.

### 8.4 Fingerprint

Serializar schema, IDs visíveis em ordem, presets, iluminação, decoração e versão do manifest. Não precisa criptografia; serve para reproduzir estados e bugs.

---

## 9. Contrato dos assets

| Regra | Valor |
|---|---|
| Canvas | 1536 × 1024 px |
| Perfil | sRGB |
| Transparência | PNG RGBA |
| Origem | canto superior esquerdo |
| Reposicionamento runtime | proibido |
| Escala interna runtime | proibida |
| Crop no arquivo final | proibido |
| Compressão destrutiva | proibida em camadas/máscaras |
| Fundo transparente | obrigatório fora do item |
| Nome | ID estável + variante |

### 9.1 Alpha

- bordas antialiased;
- sem halos brancos ou pretos;
- sem ilhas retangulares de seleção;
- sombras do item podem permanecer no alpha;
- sombras do ambiente ficam no background;
- feather documentado;
- RGB limpo em pixels totalmente transparentes quando possível.

### 9.2 Bounding box e hash

Cada asset terá alphaBounds registrado. A validação recalcula o bbox. O manifest pode guardar SHA-256 do background, golden, camadas, máscaras e variantes para detectar trocas silenciosas.

### 9.3 Classes

1. base;
2. module;
3. finish;
4. mask;
5. stone;
6. substitution;
7. handle;
8. lighting;
9. decor;
10. reference.

---

## 10. Inventário do compositor atual

| ID | Asset atual | Alpha bbox |
|---|---|---|
| base | base.png | canvas completo |
| 01 | 01_modulo_lavanderia.png | x122–392, y54–308 |
| 02 | 02_inferior_fogao.png | x471–763, y456–911 |
| 03 | 03_inferior_pia.png | x736–1216, y442–911 |
| 04 | 04_lateral_geladeira.png | x1205–1242, y44–913 |
| 05 | 05_aereo_fogao.png | x490–764, y60–335 |
| 06 | 06_aereo_pia.png | x745–1224, y60–337 |
| 07 | 07_aereo_geladeira.png | x1232–1505, y46–230 |
| 08 | 08_iluminacao.png | x715–1248, y266–378 |

Os limites acima são inclusivos na descrição humana. Pillow retorna right/bottom exclusivos.

### 10.1 Correções já incorporadas no v3

- portas central e direita do módulo 03 com 154 px;
- módulo 04 deslocado para contato;
- pedra atrás das panelas reconstruída;
- aresta da coluna reforçada tonalmente.

### 10.2 Débito visual conhecido

Os azulejos da coluna têm a mesma fase vertical da parede, reduzindo a leitura de profundidade. Correção futura no background:

1. preservar geometria;
2. deslocar a fase somente na face frontal da coluna;
3. preservar a parede adjacente;
4. reforçar discretamente sombra de contato e face lateral;
5. validar crop e composição completa.

---

## 11. Estratégia por recurso

### 11.1 Cores lisas

Máscara + blend preservando luminância. Aplicação global, máscara sem caixaria branca, frestas/reflexos preservados e preset original sem overlay.

### 11.2 Amadeirado

Layers fotográficos pré-renderizados por entidade. Não usar repetição CSS, textura plana multiplicada ou shader procedural. Direção de veio, escala, perspectiva, bordas e iluminação precisam ser coerentes.

### 11.3 Pedras

Separar peças dos módulos 02 e 03, agrupá-las em stone-all e usar variantes com padrão, escala e iluminação coerentes. Máscara serve para tonalidade provisória; granito/mármore devem preferir variante fotográfica.

### 11.4 Fogão convencional

Ao ocultar module-02:

- ocultar forno, cooktop, pedra e rodapé hospedados;
- mostrar range-freestanding;
- usar asset gerado por IA no canvas completo;
- preservar perspectiva, iluminação, piso e parede;
- tratar naturalmente a costura com a pedra do módulo 03.

### 11.5 Puxadores

Default none. Preferência:

1. overlay fotográfico por módulo/família;
2. overlay por superfície com perspectiva;
3. transformação CSS apenas como preview.

Puxadores herdam visibilidade do módulo.

### 11.6 Iluminação

Primeiro: off sem camada e on com layer aprovado. O interruptor troca o preset. Extensão possível: emissivo + relight + sombras/reflexos e intensidade limitada. Não prometer simulação física.

### 11.7 Decoração

Cada item é entidade full-canvas RGBA, com host opcional, toggle e zIndex. Sem drag livre na primeira versão.

---

## 12. Pipeline de assets por IA

### 12.1 Entradas

- background ou montagem-mestra;
- asset atual;
- máscara/ROI;
- crop ampliado;
- canvas;
- referências técnicas;
- landmarks em pixels;
- instrução explícita do que não pode mudar.

### 12.2 Processo

1. congelar referência;
2. medir landmarks e bbox;
3. preparar máscara;
4. gerar somente a região;
5. recompor no canvas;
6. comparar pixels fora da máscara;
7. inspecionar em 100%, 200% e reduzido;
8. testar isolado e com vizinhos;
9. registrar prompt/parâmetros;
10. aprovar e versionar.

### 12.3 Proveniência

~~~js
{
  id: "range-freestanding-v1",
  sourceSceneVersion: "cozinha-01/v3",
  generator: "image-edit",
  promptRevision: 1,
  allowedBounds: { x: 460, y: 430, width: 330, height: 490 },
  referenceIds: ["master-v3", "fogao-reference-01"],
  notes: "preservar parede, piso, luz e pedra do módulo 03",
  approval: { status: "approved", date: "YYYY-MM-DD" }
}
~~~

A geração não é determinística. O arquivo aprovado, seu hash e sua posição são determinísticos.

---

## 13. Fidelity harness 2D

### 13.1 Gates estruturais

- assets existem e medem 1536 × 1024;
- IDs únicos;
- zIndex determinístico;
- hosts existentes e grafo sem ciclo;
- substituições sem ciclo;
- máscaras válidas;
- presets referenciam entidades existentes.

### 13.2 Gates de pixels

- default versus golden;
- diff fora da ROI;
- alpha bbox;
- halos;
- contato entre módulos;
- cor consistente no grupo;
- costura das pedras;
- iluminação on/off.

### 13.3 Critérios conhecidos

- módulo 03: duas portas com 154 px;
- módulo 03/módulo 04: sem lacuna visual;
- pedra atrás das panelas: sem ilhas quadriculadas;
- coluna: plano saliente inequívoco;
- caixaria: laterais, fundos e topos brancos;
- original: equivalente ao golden.

### 13.4 Tolerâncias

- composição sem efeitos: igualdade exata quando aplicável;
- blends: tolerância documentada;
- navegadores: tolerância perceptual;
- landmarks: 0–1 px;
- estética: gate humano.

O relatório registra status, expected, observed, tolerância, diff, crops e fingerprint.

---

## 14. Inventário de reaproveitamento do MobiliPresenter

Classificações:

- **USAR:** portar a regra;
- **ADAPTAR:** reescrever para pixels/assets;
- **CONSULTAR:** fonte, não dependência;
- **ADIAR:** útil depois;
- **DESCARTAR:** não entra.

### 14.1 Núcleo e dados

| Origem | Classe | Decisão |
|---|---|---|
| scene-core/src/contracts/model.ts | ADAPTAR | IDs, kinds, visibilidade, host, controllable e substituições; remover geometria, transforms e câmera |
| scene-core/src/state/scene-state.ts | USAR/REESCREVER | visibilidade efetiva, motivos, host e substituição |
| scene-core/src/core/signature.ts | ADAPTAR | fingerprint do estado 2D |
| scene-core/src/contracts/appearance.ts | ADAPTAR | presets, assignments e emitters viram assets |
| scene-core/src/appearance/materials.ts | CONSULTAR | precedência de defaults/overrides |
| scene-core/src/appearance/lighting.ts | ADAPTAR | luz acompanha visibilidade |
| scene-core/src/contracts/hardware.ts | ADAPTAR | catálogo e âncoras em pixels |
| scene-core/src/hardware/anchors.ts | ADAPTAR | validação sem transforms 3D |
| scene-core/src/contracts/invariants.ts | CONSULTAR | padrão de invariantes |

### 14.2 Fixtures

| Origem | Classe | Decisão |
|---|---|---|
| current-scene.ts | CONSULTAR/ADAPTAR | ownership, hospedagem e forno→fogão |
| current-geometry.ts | CONSULTAR | medidas/relações; não renderizar boxes |
| current-context.ts | CONSULTAR | contexto dos módulos |
| current-laundry.ts | CONSULTAR | dados técnicos do 01 |
| current-hardware.ts | ADAPTAR | intenção; recalibrar em pixels |
| current-appearance.ts | CONSULTAR | papéis e requisitos visuais |
| current-under-cab-light.ts | ADAPTAR | ownership da luz |
| current-faucet.ts | CONSULTAR | referência técnica |
| current-camera.ts | DESCARTAR | projeção já está no raster |
| current-fidelity.ts | ADAPTAR | canvas canônico |
| portable-scene.ts | CONSULTAR | portabilidade |

### 14.3 Viewer e UI

| Origem | Classe | Decisão |
|---|---|---|
| runtime/viewer-state.ts | USAR/REESCREVER | reducer, defaults e fingerprint |
| runtime/query.ts | ADAPTAR | alias→ID |
| runtime/presets.ts | ADAPTAR | assets em lugar de PBR |
| runtime/composition.ts | DESCARTAR | Three.js |
| runtime/sync.ts | CONSULTAR | separar sync por domínio |
| api/ui-contract.ts | USAR/REESCREVER | catálogo, snapshot e comandos |
| api/ui-adapter.ts | ADAPTAR | UI não inventa domínio |
| ui/runtime-controls.ts | CONSULTAR | fluxo, não código acoplado |
| ui/*.css | CONSULTAR | responsividade/linguagem |
| docs/ui/guided-configurator-v0.3.md | USAR | módulos→acabamentos→acessórios→resumo |
| docs/ui/responsive-fixed-frame-v0.1.md | ADAPTAR | frame fixo |
| outros docs/ui | CONSULTAR | decisões visuais úteis |

### 14.4 Apresentação técnica

| Origem | Classe | Decisão |
|---|---|---|
| presentation/contracts.ts | ADAPTAR | identidade, fatos, componentes, avisos e dependências |
| technical-catalog.ts | CONSULTAR/ADAPTAR | migrar fatos verificados |
| compile.ts | ADIAR | fora do núcleo inicial |
| current-service.ts | ADIAR | detalhes na segunda fase |
| technical-diagram.ts | ADIAR | preferir assets autorados |
| technical-view-geometry.ts | DESCARTAR | projeção 3D |
| renderer/presentation-frame.ts | ADAPTAR CONCEITO | contain responsivo |

### 14.5 Fidelidade

| Origem | Classe | Decisão |
|---|---|---|
| fidelity/report.ts | USAR/REESCREVER | hard/soft/human e expected/observed |
| fidelity/overlay.ts | ADAPTAR | grid e landmarks em pixels |
| fidelity/readability.ts | ADAPTAR | probes 2D |
| fidelity/projection.ts | DESCARTAR | sem projeção 3D |
| readability_compare.py | ADAPTAR | comparação de crops |
| fidelity_smoke.py | ADAPTAR | smoke da UI |
| tests de state/substitution | USAR COMO MODELO | regras centrais |
| tests de hardware/state/UI/presets | ADAPTAR | contratos 2D |
| tests do renderer | DESCARTAR | backend removido |
| fidelity/baselines | CONSULTAR | estrutura, não números 3D |
| fidelity/migrations | DESCARTAR | histórico 3D |

### 14.6 Renderer 3D

| Origem | Classe | Decisão |
|---|---|---|
| viewer-next/src/renderer/three/** | DESCARTAR CÓDIGO | não entra no runtime |
| materials.ts | CONSULTAR APENAS | lições de continuidade |
| lighting.ts | CONSULTAR APENAS | ownership de luz |
| wall-tiles.ts | CONSULTAR/EVITAR REGRA | fase mundial contínua enfraquece a coluna |
| hardware.ts | CONSULTAR APENAS | sem meshes |
| refinements fh06 | CONSULTAR RESULTADOS | problemas, não soluções |
| Three/Vite/TypeScript | DESCARTAR COMO DEPENDÊNCIA | runtime puro |

### 14.7 Source e DXF

| Origem | Classe | Decisão |
|---|---|---|
| fixed-camera-calibration.json | DESCARTAR NO RUNTIME |
| promob-dxf-profile.json | ARQUIVAR/CONSULTAR |
| source/dxf.ts | ADIAR |
| dxf_inventory.py | ADIAR |
| validate_promob_profile.py | ADIAR |
| core/camera.ts | DESCARTAR |
| core/math.ts | DESCARTAR QUASE TODO |

### 14.8 Governança

| Grupo | Classe | Decisão |
|---|---|---|
| ops/** | DESCARTAR |
| tools/** do root | DESCARTAR |
| workflows de agentes/coordenação | DESCARTAR |
| workflows scene-core/viewer-next | CONSULTAR para CI mínima |
| docs/architecture/agent-* | DESCARTAR |
| docs/experiments/** | DESCARTAR |
| docs/kickstarts/** | DESCARTAR |
| planos M12/M13, scheduler, leases e recovery | DESCARTAR |
| AGENTS.md | NÃO PORTAR; vale só no original |
| netlify.toml | DESCARTAR |
| pending.html | DESCARTAR |

### 14.9 Documentos úteis

| Documento | Classe |
|---|---|
| ADR 0002 — scene core boundaries | ADAPTAR |
| ADR 0003 — technical presentation | CONSULTAR |
| scene-core-0.1 | CONSULTAR |
| fidelity-harness-v1 | USAR/ADAPTAR |
| fixed-view-renderer-0.1 | CONSULTAR fixed-frame; descartar backend |
| coordinated module metadata | ADIAR/CONSULTAR |
| fh06 methodology e specs | CONSULTAR |
| ADR 0001 e 0004–0008 | DESCARTAR no projeto novo |

O JSON acompanhante detalha o inventário em formato processável.

---

## 15. Plano de migração

### Fase 0 — Congelar baseline

Entregáveis: v3 imutável, golden, hashes, bboxes e débitos.  
Gate: baseline recomposto com sucesso.

### Fase 1 — Externalizar dados sem mudar pixels

Criar scene-data, gerar módulos/controles, mover defaults e implementar fingerprint.  
Gate: default idêntico ao v3 e nenhum recurso novo.

### Fase 2 — Relações

Implementar visibilidade efetiva, host/filho, substituições e validações.  
Gate: testes de ciclo, host ausente e módulo 02→fogão com placeholder.

### Fase 3 — Assets estruturais

Corrigir azulejos da coluna, separar pedras, revisar alpha e produzir fogão por IA.  
Gate: aprovação humana de crops e composição.

### Fase 4 — Acabamentos globais

Frentes, cores, amadeirados, pedras e reset.  
Gate: conjunto completo muda; caixaria branca e pedras coerentes.

### Fase 5 — Puxadores

Base sem puxadores, catálogo, anchors e overlays.  
Gate: nenhum puxador em módulo oculto e posição aprovada.

### Fase 6 — Iluminação

Switch, layers e dependências.  
Gate: off restaura base e on não cria halos.

### Fase 7 — Decoração

Catálogo, hosts, toggles e ordem.  
Gate: isolamento e herança corretos.

### Fase 8 — UI guiada e resumo

Módulos, acabamentos, acessórios, resumo e dados técnicos confiáveis.  
Gate: desktop/mobile, cena persistente e nenhum fato inventado.

### Fase 9 — Exportação e endurecimento

Configuração compartilhável, exportação PNG, testes e documentação de novos cenários.

---

## 16. Ordem para a próxima sessão

1. ler este guia;
2. abrir o v3;
3. abrir o inventário JSON;
4. congelar o golden;
5. implementar somente a Fase 1;
6. validar zero mudança visual;
7. avançar uma fase por vez.

Não começar pela IA do fogão, catálogo de puxadores ou UI nova. Primeiro tornar a base data-driven sem mudar pixels.

---

## 17. Riscos e controles

| Risco | Controle |
|---|---|
| abstração excessiva | schema pequeno e específico |
| trazer complexidade antiga | não copiar ops, Three, câmera ou geometria |
| IA mudar áreas externas | ROI + diff |
| isolado bom/composição ruim | testar isolado, vizinhos e golden |
| pintar caixaria | masks por superfície |
| madeira repetitiva | assets fotográficos por módulo |
| puxadores flutuantes | overlays calibrados |
| costura do fogão | gerar considerando módulo 03 |
| explosão de combinações | grupos globais e catálogo inicial pequeno |
| luz parecer filtro | layers produzidos para o ambiente |
| peso dos arquivos | otimizar sem perda após aprovação |

---

## 18. Decisões adiadas

- quantidade final de pedras;
- catálogo final de amadeirados;
- puxadores e acabamentos;
- itens decorativos;
- intensidade contínua de luz;
- exportação;
- URL/localStorage;
- preços;
- múltiplos ambientes;
- cards técnicos completos.

Esses pontos não bloqueiam o núcleo.

---

## 19. Critério de conclusão

O projeto estará maduro quando:

1. a cena for descrita por dados;
2. a UI não tiver módulos hardcoded;
3. estados forem reproduzíveis por fingerprint;
4. o default reproduzir o golden;
5. forno/fogão funcionar;
6. frentes e pedras forem globais/coerentes;
7. puxadores, luz e decoração respeitarem ownership;
8. novos assets entrarem sem alterar o core;
9. a aparência continuar fotográfica;
10. não for necessário reler o histórico 3D.

---

## 20. Resumo para retomada

**Construir um compositor 2D orientado por dados.**  
**Reescrever apenas o núcleo lógico do MobiliPresenter.**  
**Não migrar Three.js, PBR, câmera, DXF ou governança operacional.**  
**Usar IA apenas para produzir assets fixos.**  
**Executar primeiro uma migração estrutural com zero mudança visual.**  
**Adicionar fogão, pedras, puxadores, luz e decoração em fases verificáveis.**
