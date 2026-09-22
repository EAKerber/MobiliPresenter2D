# Reconciliação visual do preview 32

## Objetivo deste recorte

Trazer para a linha aprovada a qualidade de materiais e a navegação compacta
do preview 32, sem transportar o estado comercial antigo daquela branch.

## Incluído

- Texturas locais para seis frentes e três pedras, com rótulos públicos
  neutros: Base clara, Avelã, Névoa, Aço, Bosque, Carvão; Padrão, Padrão +
  cuba nova, Clara mineral, Verde profundo e Preta mineral.
- Renderização semântica em canvas para pedra superior e rodapé: rodapé usa a
  frente global quando não há opt-in e usa a pedra escolhida quando há.
- Navegação compacta por largura real do próprio container, não apenas por
  breakpoint de viewport.
- Carregamento coeso de dados, renderer e aplicação via uma revisão de asset
  comum, evitando misturar APIs antigas e novas no cache do navegador.
- Restauro da configuração para o estado comercial aprovado: todos os módulos
  padrão e iluminação opcional desligada.

## Deliberadamente excluído

- Nenhuma tabela de preços, dependência comercial, estado de acabamentos ou
  regra de iluminação do preview 32 foi importada.
- A substituição de máscaras estruturais e a promoção de vistas orientativas a
  técnicas continuam fora deste recorte.
- Os arquivos de textura são rastreáveis no Git de origem, mas não há prova de
  licença/autorização editorial no repositório. O inventário com hashes está em
  `docs/work/preview32-material-provenance.md`.

## Gates executados localmente

- Regras comerciais: `node app/tools/test-core.js` passou; o padrão permanece
  R$ 7.166,00 e a iluminação não é reativada por Restaurar.
- Integridade de cena: os casos com M02, M03 e ambos ocultos não geraram novos
  erros do renderer e preservaram os totais esperados.
- Materiais: pedra Verde profundo, rodapé e Padrão + cuba nova foram
  selecionados sem erro de console; cuba nova preserva a pedra visual padrão.
- Visual responsivo: 320, 360, 390, 480, 700, 701, 1050, 1051 e 1280 px sem
  overflow horizontal; as etapas compactas não ultrapassaram o container.
- Acessibilidade: abertura pela mini-cena e retorno de foco ao fechar a ficha
  foram confirmados; há regra de redução de movimento.

## Critério para integração

Apenas submeter esta branch à revisão depois do commit e de uma prévia remota
que confirme visualmente os materiais. A integração em `main` continua
condicionada a nenhum bloqueador comercial ou mobile e à aprovação do painel
de qualidade.
