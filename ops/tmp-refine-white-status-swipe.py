from pathlib import Path

def replace_once(path, old, new):
    p=Path(path); text=p.read_text(); count=text.count(old)
    if count != 1: raise SystemExit(f"PATCH_COUNT:{path}:{count}:{old[:120]!r}")
    p.write_text(text.replace(old,new,1))

replace_once("app/data/catalog-data.js",
'id: "base-light", publicLabel: "Base clara", color: "#eeeae3", status: "published", adjustmentLabel: "normal",',
'id: "base-light", publicLabel: "Base clara", color: "#f6f5f2", status: "published", adjustmentLabel: "normal",')

replace_once("app/index.html",
'''          <p class="layer-status" aria-live="polite">
            <span aria-hidden="true"></span>
            <strong id="visibleCount">8</strong> de <span id="totalCount">8</span> itens incluídos
          </p>''',
'''          <p class="layer-status" aria-live="polite">
            <strong id="visibleCount">8</strong> de <span id="totalCount">8</span> itens incluídos
          </p>''')

replace_once("app/styles.css",
'.layer-status { display: flex; align-items: center; gap: 6px; color: rgba(255, 255, 255, 0.68); font-size: 14px; }\n.layer-status > span { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 12px var(--accent); }\n.layer-status strong { font-weight: 600; }',
'.layer-status { display: inline-flex; align-items: baseline; gap: 6px; color: rgba(255, 255, 255, 0.68); font-size: 14px; line-height: 1; font-variant-numeric: tabular-nums; }\n.layer-status strong, .layer-status #totalCount { display: inline-block; line-height: 1; }\n.layer-status strong { font-weight: 600; }')

app=Path("app/app.js"); text=app.read_text()
old='''    const dots = document.createElement("div");
    dots.className = "module-detail__carousel-dots";
    dots.setAttribute("aria-label", "Páginas de visualização");
'''
new='''    const dots = document.createElement("div");
    dots.className = "module-detail__carousel-dots";
    dots.setAttribute("aria-label", "Visualizações disponíveis");
    dots.setAttribute("role", "tablist");
    stage.setAttribute("role", "region");
    stage.setAttribute("aria-roledescription", "carrossel");
'''
if text.count(old)!=1: raise SystemExit("DOTS_ANCHOR")
text=text.replace(old,new,1)

old='''        dots.querySelectorAll("button").forEach((dot, index) => {
          const active = index === currentPage;
          dot.classList.toggle("is-active", active);
          dot.setAttribute("aria-current", active ? "true" : "false");
        });
'''
new='''        dots.querySelectorAll("button").forEach((dot, index) => {
          const active = index === currentPage;
          dot.classList.toggle("is-active", active);
          dot.setAttribute("aria-current", active ? "true" : "false");
          dot.setAttribute("aria-selected", String(active));
          dot.tabIndex = active ? 0 : -1;
        });
'''
if text.count(old)!=1: raise SystemExit("RENDER_DOTS_ANCHOR")
text=text.replace(old,new,1)

old='''      dot.className = "module-detail__carousel-dot";
      dot.setAttribute("aria-label", `Mostrar ${page.label}, página ${index + 1} de ${pages.length}`);
      dot.title = page.shortLabel;
      dot.addEventListener("click", () => renderPage(index, true));
      dots.append(dot);
'''
new='''      dot.className = "module-detail__carousel-dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-controls", stage.id);
      dot.setAttribute("aria-label", `Mostrar ${page.label}, página ${index + 1} de ${pages.length}`);
      dot.setAttribute("aria-selected", "false");
      dot.tabIndex = -1;
      dot.title = page.shortLabel;
      dot.addEventListener("click", () => renderPage(index, true));
      dots.append(dot);
'''
if text.count(old)!=1: raise SystemExit("DOT_CREATE_ANCHOR")
text=text.replace(old,new,1)

old='''    dots.children[currentPage]?.classList.add("is-active");
    dots.children[currentPage]?.setAttribute("aria-current", "true");
    collapse.setAttribute("aria-expanded", String(!isCollapsed));
'''
new='''    dots.children[currentPage]?.classList.add("is-active");
    dots.children[currentPage]?.setAttribute("aria-current", "true");
    dots.children[currentPage]?.setAttribute("aria-selected", "true");
    if (dots.children[currentPage]) dots.children[currentPage].tabIndex = 0;

    let swipeStartX = null;
    let swipeStartY = null;
    const clearSwipe = () => {
      swipeStartX = null;
      swipeStartY = null;
      stage.classList.remove("is-swiping");
    };
    stage.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
      stage.classList.add("is-swiping");
      stopAutoCycle();
    });
    stage.addEventListener("pointerup", (event) => {
      if (swipeStartX === null || swipeStartY === null) return;
      const deltaX = event.clientX - swipeStartX;
      const deltaY = event.clientY - swipeStartY;
      clearSwipe();
      const horizontal = Math.abs(deltaX) >= 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
      if (!horizontal) return;
      if (deltaX < 0 && currentPage < pages.length - 1) renderPage(currentPage + 1, true);
      if (deltaX > 0 && currentPage > 0) renderPage(currentPage - 1, true);
    });
    stage.addEventListener("pointercancel", clearSwipe);
    stage.addEventListener("lostpointercapture", clearSwipe);

    collapse.setAttribute("aria-expanded", String(!isCollapsed));
'''
if text.count(old)!=1: raise SystemExit("SWIPE_ANCHOR")
text=text.replace(old,new,1); app.write_text(text)

replace_once("app/styles.css",
'.module-detail__carousel-stage { display: grid; block-size: 252px; min-block-size: 252px; overflow: hidden; transition: opacity 180ms ease; }',
'.module-detail__carousel-stage { display: grid; block-size: 252px; min-block-size: 252px; overflow: hidden; transition: opacity 180ms ease; touch-action: pan-y; overscroll-behavior-inline: contain; user-select: none; }')
replace_once("app/styles.css",
'.module-detail__carousel-dots { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 20px; }',
'.module-detail__carousel-dots { display: flex; align-items: center; justify-content: center; gap: 7px; width: fit-content; max-width: 100%; min-height: 20px; margin-inline: auto; padding: 2px 4px; }')

backlog=Path("docs/work/global-materials-mobile-pip-backlog.md"); body=backlog.read_text()
addition='''

## B9 — Refinos visuais e navegação das visualizações
- [x] Branco base aproximado suavemente de branco puro sem alterar a textura nem a camada estrutural de seams.
- [x] Indicador decorativo sem semântica removido do contador `8 de 8`.
- [x] Corrigido o seletor CSS que transformava acidentalmente `#totalCount` em uma bolinha de 8×8 px.
- [x] Pager de visualizações explicitado semanticamente como tablist e mantido dentro do carousel.
- [x] Swipe horizontal adicionado às visualizações; gesto vertical continua reservado ao scroll da página.
- [x] Dots, clique e swipe compartilham o mesmo `detailPageByEntity` e permanecem sincronizados.
- [ ] Revisão visual do branco e do gesto de swipe no deploy-preview.
'''
if "## B9 — Refinos visuais e navegação das visualizações" not in body: backlog.write_text(body+addition)
