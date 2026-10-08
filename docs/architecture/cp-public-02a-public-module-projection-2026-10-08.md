# CP-PUBLIC-02a — projeção pública de módulos (fixture, 2026-10-08)

Estado: **IMPLEMENTAÇÃO ISOLADA / PR #178 DRAFT; CI e integração pendentes**. Branch `work/cp-public-02a-public-module-projection-20261008`. Não há endpoint, entrega de v5 à página pública, mudança de rota ou publicação de dados produtivos.

## Autoridades verificadas
- `ConfiguratorAdministration2D 5.0` publicado: stage `kind=modules` / `sections[].itemIds` para seleção/ordem; `objects[moduleId].title`, `.description`, `.benefits`, `.components`, `.requirements` para conteúdo editável pelo ADM. **Esses campos existem no v5 e já são apresentados/editáveis pelo admin.** Destaques, Componentes e Requisitos são *listas*, uma entrada por linha. `app/core/configuration.js` valida e normaliza listas; a mesma publicação já atualiza o `catalog` efetivo em `app/app.js`.
- `ProductCatalog2D 1.0` da main atual: `referenceLabel`, `category`, `dimensions.display` e dados técnicos físicos. O `ProductCatalog2D 1.1` declarado em `app/viewer/data.js` na PR #175 é **metadado de doador defasado**.
- `Scene2D 1.0`: geometria, bounds, entidades/visibilidade, assets de base e máscaras, não título ou conteúdo comercial. Os `objectAssets` autorados no v5 podem sobrepor assets da cena no configurador; essa política ainda não foi projetada no viewer.

## Fronteira implementada
`app/core/public-module-projection.js` é **normalizador puro de fixture**: recebe v5 validado, catálogo físico e cena. Produz `PublicModulePresentation2D 0.1` com `modules[]` em ordem publicada, cada objeto limitado por allowlist a `id`, `referenceLabel`, `title`, `description`, `category`, `dimensionLabel`, `benefits`, `components`, `requirements`. Título, descrição e as três listas vêm **exclusivamente de `published.objects[id]`**; referência, categoria e medidas vêm do catálogo físico. Campos opcionais vazios são omitidos.

Rejeita v5 inválido de versão/shape básico, stage desabilitada, IDs duplicados/desconhecidos, módulo sem catálogo/cena/registro autorado e listas de autor ausentes. **Não é autenticação, não valida integralmente o v5, não produz um endpoint**, não deve receber snapshots administrativos no navegador. Chamador confiável deve executar `administration-v5.validate()` sobre fonte integral e controlar o transporte. Não retornar `published-buyer-projection.prepare().source` ao público: contém preços e demais dados privados. `objectAssets`, visibilidade inicial, presets de acabamento e desenhos ficam para decisões explícitas de contrato/transporte.

## Incompatibilidades semânticas detectadas (não confundir com lacuna de schema)
| ADM / fonte | Viewer do PR #175 | Situação |
| --- | --- | --- |
| `Nome público → objects[id].title` | `product.title` / fallback por entidade | Diferente após edição no ADM; trocar autoridade |
| `Descrição → objects[id].description` | `summary`, fallback `benefits[0]` ou texto fabricado | Renomeação e fallback indevido; omitir vazio |
| `Destaques (um por linha) → benefits[]` | `benefits[]` como lista, mas também filtra item que diga `caixaria` | Lista correta, porém o filtro semântico altera conteúdo publicado |
| `Componentes (um por linha) → components[]` | Lista de detalhes `components[]` | Correto; não confundir com `section.component` do renderer |
| `Requisitos (um por linha) → requirements[]` | Lista de detalhes `requirements[]` | Correto como copy; não equivale à `dependencies[]` executável |
| `objectAssets[id].detailImageAsset / imageAsset` | `scene.entities[].asset` | Override editável ignorado pelo viewer; projetar só assets autorizados futuramente |
| `initialState.finishId`, `finishes[]` | Finish base derivado de `core.createInitialState(scene)` | Pode divergir do preset publicado; paridade visual separada |
| `category`, `dimensions`, `frontLayout`, `drawingSpec` | Catálogo/Scene | Fonte física correta; não duplicar no v5 |
| `stone-all` e `stone-skirting` | Composição do viewer incompleta | Material de pedra compartilhado, serviço de rodapé distinto por design; não criar segunda autoridade |
| `pricing` v5 | Viewer não exibe preço | Excluir dados de preço inteiramente na fronteira pública |

## Caixaria — decisão de produto / gate separado
O viewer tenta extrair `carcass` de um campo antigo `publicPresentation.carcass` ou de texto livre em `benefits[]`. **Isso não é fonte de verdade válida**. Decisão solicitada: caixaria como *família própria de acabamento*, com aplicabilidade explícita por módulo e **seleção global**, semelhante às frentes, e apenas opção **Branco** neste primeiro momento.

**Modelo mínimo proposto**, a ser provado primeiro com fixture offline, sem escrever v5 produtivo:
- Material canônico `carcass-white` (rótulo `Branco`, cor nominal branca; não reaproveitar automaticamente `base-light` das frentes, que representa outro acabamento).
- Grupo `carcass-all` com `materialIds: ["carcass-white"]`, `scope: "global"` e `moduleIds` explicitamente editáveis/validados para os módulos aos quais caixaria se aplica. Um módulo fora desse conjunto **não recebe** campo de caixaria automaticamente (atenção a módulos estruturais, como 04; não presumir).
- Estado inicial global `carcassFinishId: "carcass-white"` e viewer exibindo rótulo apenas nos módulos aplicáveis. Enquanto existir uma única opção, não exigir seletor comercial sem ação útil.
- **Não** recolorir imagem ou máscara por CSS como se a cena suportasse caixaria independente: hoje frentes e caixaria não têm máscaras separadas. Estado/texto pode ser modelado sem alegar resultado visual não implementado.
- Não introduzir por ora seleção local, segunda cor, preços ou regras condicionais: sem caso de uso/teste.

**Risco de compatibilidade:** validação v3 herdada pelo v5 exige exatamente três `materialGroups`, com IDs `fronts-all`, `handles-all`, `stone-all`, e biblioteca `groupIds` restringe os materiais a frentes/pedra. Adicionar um quarto grupo diretamente **quebra** validação e roundtrip v5↔v4/v3. Portanto primeiro decidir uma extensão versionada com migração/downgrade seguros, testes do save/readback e browser; só depois disponibilizar no ADM e projetar no viewer. Não alterar a publicação revision 7 para esse desenho.

## Gates
- Teste `node --test tests/public-module-projection.test.cjs` incluído no `app/package.json` / CI: sete módulos, textos editados publicados, listas, negativos de exclusão e ausência; status CI a confirmar.
- Próximo gate: contrato de transporte de projeção pública validada, publicação/consumo seguro, asset allowlist, verificação das descrições efetivamente preenchidas.
- Em paralelo: fixture isolada de caixaria `Branco` + membership por módulo, sem tocar no schema produtivo; decisões de elegibilidade e futura separação de máscara devem ser aprovadas por dados de cena.
- PR #175 continua HOLD até paridade de cena (pedra/rodapé/sombras etc.), auth e cutover.
