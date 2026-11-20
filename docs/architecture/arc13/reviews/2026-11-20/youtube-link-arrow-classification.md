# ARC-13 — classificação do link do YouTube na Home

**Data:** 20/11/2026 (BRT)  
**ID:** `0c5db734ff22f8ae`  
**Alvo:** Product `main@dc066f55619824626ea4752ecc0bafc67f9d9110` e PR #274 head `a9c39c8220bcbccefea4cf74e666445d35ccf1d9`.

## Evidência

Em `app/index.html:35`, o hero contém um anchor estático cujo `href` aponta para o YouTube Shorts e cujo único nó de texto é “Assistir no YouTube ↗”. O arquivo tem o mesmo Git blob em Product `main@dc066f5` e no head candidato #274 (`8a49e80c28a563d852704b1814bd8b5313184b13`). A seta não é um elemento separado no DOM.

## Julgamento Common Sense

A classe do sink completo é **`ui-static`**: trata-se de texto fixo de interface dentro de um link. A seta final não transforma o sink inteiro em decoração. A decisão preenche a classe que faltava; não cria uma ocorrência nem separa o símbolo como sink novo.

## Limites e pendências

O source atual deixa a seta dentro do nome textual do link. Se ela deve ser pronunciada ou ficar visualmente presente e ser ocultada do nome acessível ainda pede uma revisão assistiva focada. O código disponível não prova como tecnologias assistivas reais pronunciam o símbolo. Por isso, `contentOwner=null`, `destination=hold` e `status=pending-semantic-review` permanecem; a classe `ui-static` não aprova wording, chave, extração ou comportamento assistivo.

Nenhum código de runtime ou teste foi alterado/executado nesta classificação.
