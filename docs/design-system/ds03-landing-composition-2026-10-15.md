# DS-03 — Composição de ambientes da landing (2026-10-15)

Implementado exclusivamente na branch de trabalho do PR #204; não envolve máscaras, camadas ou dados da cena.

## Arquivos e contrato
- 5 interiores de ambiente em `app/landing/assets/icons/large/{id}.webp` (900 × 738) e derivados `small/{id}.webp` (300 × 246). Substituem os dez antigos WebPs nos **mesmos caminhos**, de forma que `landing/data.js` não requer alteração. São **interiores recortados**, não ícones completos.
- 2 frames vetoriais compartilhados `frame-light.svg` / `frame-dark.svg` na mesma pasta; viewBox 900 × 738, path simétrico e gap preservado, esquerda #22211F/#F9F2E9, direita #AE5B09.
- Composição no navegador: elemento `.environment-art` com a foto do interior em `<img>` e frame como `::after` (background SVG). CSS `html[data-theme="dark"]` escolhe somente o frame escuro. Sem canvas, shaders, DOM pesado, JS de recoloração ou assets duplicados por tema.
- Carrossel recebe `small` com loading lazy; painel selecionado recebe `large`. Mesmo seletor `#featureImage` e mesmos IDs/links/cópias.
- A fonte PNG canônica e o código cookie cutter permanecem no pacote homologado `MobiliPresenter2D_DS03_Cenas_5_Ambientes_Dois_Frames_v1.zip` da Library; WebPs gerados de forma reproduzível usando Pillow (LANCZOS para small, quality=94, method=6, exact=True). O canal alpha decodificado foi verificado pixel a pixel e é idêntico ao PNG mestre em cada escala.
- O SVG do frame é idêntico à fonte homologada. Como background-image CSS, o browser carrega um frame de cada vez e utiliza cache entre cards; mudanças Auto/Claro/Escuro usam atributo de tema já suportado.

## Testes e limites
- 10 WebPs: SHA Git exato dos arquivos gerados e alfa intacto; todos com canvas correto.
- `tests/ui-theme-contract.cjs`: marca, contratos de tema e assinatura RIFF/WEBP das dez imagens.
- Browser gate visual pendente em desktop/mobile, inclusive bordas ao alternar light/dark e ao selecionar ambientes. Nenhum merge automático para main.
- `WebP` usado por serem imagens estáticas (não formato de vídeo `WebM`).
