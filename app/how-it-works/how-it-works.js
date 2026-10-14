(function () {
  "use strict";

  const toggle = document.getElementById("menuToggle");
  const navigation = document.getElementById("primaryNav");
  if (!toggle || !navigation) return;

  function setMenuOpen(open) {
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }

  toggle.addEventListener("click", function () {
    setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
  });
  navigation.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () { setMenuOpen(false); });
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setMenuOpen(false);
  });
  document.addEventListener("pointerdown", function (event) {
    if (!navigation.contains(event.target) && !toggle.contains(event.target)) setMenuOpen(false);
  });
})();

/* Scoped interactive explanation panel. */
(function(){
  const explanations={
    escala:['Compra em escala','Concentrar a compra de chapas, ferragens e outros insumos em mais pedidos ajuda a negociar com fornecedores e programar as aquisições.'],
    coletivas:['Compras coletivas','Diferentes apartamentos compartilham uma plataforma técnica, sem exigir que todos escolham a mesma composição. Materiais e processos comuns podem ser planejados juntos.'],
    producao:['Produção planejada','Projetos individuais exigem programação de máquinas, detalhamento e planos de corte próprios. Os módulos previamente desenvolvidos permitem organizar etapas repetíveis.'],
    chapas:['Aproveitamento de material','Planos de corte organizados ajudam a distribuir melhor as peças nas chapas e reduzir sobras, sem diminuir a qualidade dos materiais.'],
    engenharia:['Engenharia já estudada','Na marcenaria individual, cada projeto demanda uma parcela maior de trabalho técnico desde o início. Aqui, as soluções-base são estudadas para o empreendimento e reaproveitadas em diferentes apartamentos.'],
    retrabalho:['Menos retrabalho','Padrões, furações e conferências previamente definidos permitem repetir soluções verificadas e reduzir ajustes durante a fabricação.']
  };
  const grid=document.querySelector('.economy-grid'),panel=document.getElementById('economyDetail');if(!grid||!panel)return;
  const cards=Array.from(grid.querySelectorAll('[data-economy]'));let active=null;
  function place(){if(!active)return;const i=cards.findIndex(c=>c.dataset.economy===active),cols=Math.max(1,getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);cards[Math.min(cards.length-1,Math.ceil((i+1)/cols)*cols-1)].after(panel);}
  cards.forEach(card=>card.addEventListener('click',()=>{const key=card.dataset.economy;active=active===key?null:key;cards.forEach(c=>c.setAttribute('aria-expanded',String(c.dataset.economy===active)));if(!active){panel.hidden=true;return;}const [title,description]=explanations[active];panel.replaceChildren();const heading=document.createElement('h3');heading.textContent=title;const p=document.createElement('p');p.textContent=description;panel.append(heading,p);panel.hidden=false;place();}));
  let raf=0;window.addEventListener('resize',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(place);});
})();
