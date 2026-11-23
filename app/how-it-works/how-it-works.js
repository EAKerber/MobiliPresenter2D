/* Scoped interactive explanation panel. */
(function(){
  const fullscreenButton=document.getElementById("howVideoFullscreen"),videoFrame=document.getElementById("howVideoPlayer");
  const videoContainer=videoFrame&&videoFrame.closest(".video-embed");
  if(fullscreenButton&&videoFrame&&videoContainer){
    const videoFullscreenCopy=window.CASA_UI_COPY.video.fullscreen;
    const activeFullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement||null;
    const syncFullscreenButton=()=>{
      const isFullscreen=activeFullscreenElement()===videoContainer;
      const label=isFullscreen?videoFullscreenCopy.close:videoFullscreenCopy.open;
      fullscreenButton.dataset.fullscreen=isFullscreen?"active":"inactive";
      fullscreenButton.setAttribute("aria-label",label);
      fullscreenButton.setAttribute("title",label);
      fullscreenButton.setAttribute("aria-pressed",String(isFullscreen));
    };
    fullscreenButton.addEventListener("click",()=>{
      if(activeFullscreenElement()===videoContainer){
        const exit=document.exitFullscreen||document.webkitExitFullscreen;
        if(exit)Promise.resolve(exit.call(document)).catch(()=>{});
        return;
      }
      const request=videoContainer.requestFullscreen||videoContainer.webkitRequestFullscreen;
      if(!request){window.open("https://www.youtube.com/shorts/hgcJ1k7lFkE","_blank","noopener,noreferrer");return;}
      try{Promise.resolve(request.call(videoContainer)).catch(()=>{});}catch(_){}
    });
    document.addEventListener("fullscreenchange",syncFullscreenButton);
    document.addEventListener("webkitfullscreenchange",syncFullscreenButton);
    syncFullscreenButton();
  }
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
