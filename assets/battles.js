(function(){
'use strict';
async function render(){
  const list=document.getElementById('all');
  if(!list)return;
  try{
    const rows=await window.CLANWARS_BATTLES.loadAccepted();
    if(!rows.length){
      list.innerHTML='<p class="empty-note">Пока нет принятых сражений.</p>';
      updateFilters([]);
      return;
    }
    list.innerHTML=rows.map(row=>{
      const status=window.CLANWARS_BATTLES.status(row);
      const date=window.CLANWARS_BATTLES.formatDate(row.scheduled_at);
      const left=row.left,right=row.right;
      return '<article class="battle-record" id="'+esc(row.id)+'" data-status="'+status+'" data-battle-id="'+esc(row.id)+'">'+
        '<div class="battle-record-top"><span>'+esc(statusLabel(status))+'</span><span>'+esc(date)+'</span></div>'+
        '<div class="battle-record-main">'+
          '<a class="battle-side" href="regiment.html?name='+encodeURIComponent(left.name)+'"><img src="'+esc(left.logo_url||'assets/default-soldier.jpg')+'" alt=""><strong>'+esc(left.name)+'</strong><small>'+esc(left.faction||'')+'</small></a>'+
          '<div class="battle-vs">VS</div>'+
          '<a class="battle-side" href="regiment.html?name='+encodeURIComponent(right.name)+'"><img src="'+esc(right.logo_url||'assets/default-soldier.jpg')+'" alt=""><strong>'+esc(right.name)+'</strong><small>'+esc(right.faction||'')+'</small></a>'+
        '</div>'+
        '<div class="battle-record-bottom"><span>'+esc(row.battle_type)+' · '+esc(String(row.player_count))+' на '+esc(String(row.player_count))+'</span><span>'+ (row.allies_allowed?'Союзники до '+esc(String(row.ally_limit)):'Союзники запрещены') +'</span></div>'+
        '<div class="battle-countdown" data-start="'+esc(row.scheduled_at)+'"></div>'+
        '<a class="battle-open-link" href="battle.html?id='+encodeURIComponent(row.id)+'">Открыть сражение →</a>'+
      '</article>';
    }).join('');
    updateFilters([...list.querySelectorAll('.battle-record')]);
  }catch(e){
    console.error('Сражения:',e);
    list.innerHTML='<p class="empty-note">Не удалось загрузить сражения. Обновите страницу.</p>';
  }
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function statusLabel(s){return {accepted:'ВЫЗОВ ПРИНЯТ',ongoing:'ИДЁТ БОЙ',awaiting_confirmation:'ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ'}[s]||'ВЫЗОВ ПРИНЯТ';}
function updateFilters(records){
  const counts={all:records.length,challenged:0,accepted:0,ongoing:0,awaiting_confirmation:0,completed:0};
  records.forEach(r=>{
    const status=window.CLANWARS_BATTLES.status({scheduled_at:r.querySelector('.battle-countdown')?.dataset.start||''});
    r.dataset.dynamicStatus=status;
    counts[status]=(counts[status]||0)+1;
    const badge=r.querySelector('.battle-record-top span');
    if(badge)badge.textContent=statusLabel(status);
  });
  Object.keys(counts).forEach(k=>{const el=document.getElementById('count-'+k);if(el)el.textContent=counts[k];});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
setInterval(()=>updateFilters([...document.querySelectorAll('.battle-record')]),1000);
})();