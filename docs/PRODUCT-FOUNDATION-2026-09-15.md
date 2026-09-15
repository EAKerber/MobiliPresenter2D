# Fundação de produto — configurador comercial 2D

**Data:** 2026-09-15
**Decisão:** manter o compositor fotográfico 2D como experiência final e usar o
MobiliPresenter apenas como referência de contrato, catálogo técnico e fluxo.

## Diagnóstico honesto

O runtime atual resolve bem composição, hospedeiros, oclusão, substituição do
fogão e acabamentos por máscara. Ele não é ainda uma experiência de venda: a
interface fala em camadas e pixels, aceita textura arbitrária, não apresenta
fichas por módulo, não explica dependências, não tem valor comercial nem resumo.

O renderer do MobiliPresenter contém boas decisões de fluxo e de apresentação
técnica, mas não deve ser migrado como visual final. A fotografia 2D comunica o
produto melhor e evita reabrir câmera, geometria e fidelidade 3D.

## Escopo do produto

Construir um configurador para uma **coleção modular fixa**, não um planejador
universal de cozinhas. O cliente escolhe uma composição válida, acabamentos
publicados e, quando existir uma tabela comercial, vê o valor e solicita uma
proposta.

Fora do primeiro ciclo: redimensionar módulos, arrastar móveis, trocar
eletrodomésticos, texturas enviadas pelo cliente, checkout e qualquer regra de
preço no navegador.

## Autoridades

| Autoridade | Responsabilidade | Nunca expor no público |
| --- | --- | --- |
| Manifesto visual | assets aprovados, ordem, máscaras e variantes | processo de produção do asset |
| Catálogo público | título, benefícios, medidas, requisitos, opções permitidas e referência de item comercial | custo e margem |
| Configuração | escolhas atuais do comprador | catálogo ou regras de preço |
| Livro comercial autenticado | custo, margem, vigência, disponibilidade e ajustes | tudo, exceto o preço calculado |

Uma rota escondida no site estático **não é** um painel de gestão. A gestão
precisa de serviço autenticado, perfis, versão de tabela e histórico de alteração.

## Contrato de composição a consolidar

Cada item visual deve declarar dono, ordem, asset, superfícies autorizadas e
regras `requires`, `conflicts`, `replaces`, `occludes` ou `reveals`. O resolvedor
deve retornar tanto a lista ordenada quanto uma razão legível.

Não criar recortes de conserto por combinação no runtime. Casos que exigirem
uma reconstrução devem virar variantes de asset pré-produzidas, aprovadas e
selecionadas por regra. Toda combinação vendável recebe fixture visual e gate de
regressão.

## Entrega iniciada nesta mudança

- Fluxo público em três etapas: Módulos, Acabamentos e Resumo.
- Cartões de módulos com benefícios, medidas e requisitos derivados de catálogo.
- Dependência declarada: aéreo da geladeira requer lateral estrutural; iluminação
  requer lateral e aéreo da pia.
- Acabamentos limitados a presets publicados; upload e seleção de cor arbitrária
  deixam de integrar a experiência pública.
- Esquema de estimativa pública preparado, sem preços fabricados. Enquanto não
  existir tabela publicada, o resumo informa que o valor está em configuração.

## Inventário pendente, por ordem

1. Conciliar a identidade e as medidas de cada módulo entre ficha técnica,
   catálogo e cena 2D; publicar apenas fatos verificados.
2. Criar superfícies semânticas (`front`, `carcass-white`, `stone`, `metal`,
   `exposed-end-panel`) para impedir pintura indevida ao ampliar os acabamentos.
3. Produzir assets aprovados e regras de compatibilidade para puxadores; não
   mostrar uma opção sem representação visual, preço e regra definidos.
4. Generalizar as quatro variantes de pedra 02/03 para um plano declarativo de
   composição e sua matriz de fixtures.
5. Criar API de cotação e back-office autenticado, com `PriceBookVersion`,
   preço publicado, custo privado, vigência e trilha de auditoria.
6. Acrescentar salvar/compartilhar configuração, CTA de orçamento e exportação
   somente após a autoridade comercial estar disponível.

## Critérios de aceite

- O comprador nunca vê "camada", pixel, malha ou controle de produção.
- Todo módulo ofertável apresenta benefícios, dimensões, componentes e limites.
- Dependência muda cena, resumo e explicação na mesma interação.
- Frentes não alteram caixaria branca, pedra, metal ou eletrodoméstico.
- Preço só aparece com tabela comercial publicada e bate com a resposta da API.
- Em 360–430 px não há rolagem horizontal, alvos têm pelo menos 44 px e avanço
  da etapa continua acessível.
- Cada combinação publicada passa em teste de regra, preço e regressão visual.
