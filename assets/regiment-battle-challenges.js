(function(){
'use strict';
async function init(){
  const box=document.getElementById('battleChallengeNotice');
  if(!box||!window.EMPIRE_AUTH)return;
  try{
    const client=await window.EMPIRE_AUTH.init();
    const user=window.EMPIRE_AUTH.user;
    if(!client||!user)return;
    const name=new URLSearchParams(location.search).get('name')||'';
    const {data:r,error:re}=await client.from('empire_regiments').select('id,name,commander_id').eq('name',name).maybeSingle();
    if(re||!r||String(r.commander_id)!==String(user.id))return;
    const {data:rows,error}=await client.from('empire_battle_challenges')
      .select('id,challenger_regiment_id,challenger_id,battle_type,player_count,allies_allowed,ally_limit,scheduled_at,server,password,created_at,status')
      .eq('target_regiment_id',r.id).eq('status','pending').order('created_at',{ascending:false});
    if(error)throw error;
    if(!rows||!rows.length){box.hidden=true;box.innerHTML='';return;}
    const ids=[...new Set(rows.map(x=>x.challenger_regiment_id).filter(Boolean))];
    let regs=[];
    if(ids.length){
      const q=await client.from('empire_regiments').select('id,name,logo_url').in('id',ids);
      regs=q.data||[];
    }
    const byId=new Map(regs.map(x=>[String(x.id),x]));
    box.hidden=false;
    box.innerHTML=rows.map(x=>{
      const source=byId.get(String(x.challenger_regiment_id));
      const dt=new Date(x.scheduled_at);
      const date=dt.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
      return '<div class="battle-challenge-card" data-challenge-id="'+esc(x.id)+'">'+
        '<div class="battle-challenge-card-title">⚔ Вам назначено сражение</div>'+
        '<div class="battle-challenge-card-main">'+
          (source&&source.logo_url?'<img src="'+esc(source.logo_url)+'" alt="">':'')+
          '<div><strong>'+esc(source?.name||'Неизвестный полк')+'</strong>'+
          '<span>'+esc(x.battle_type)+' · '+esc(String(x.player_count))+' игроков</span>'+
          '<span>Дата: '+esc(date)+'</span>'+
          (x.allies_allowed?'<span>Союзники: до '+esc(String(x.ally_limit))+'</span>':'<span>Союзники: запрещены</span>')+
          (x.server?'<span>Сервер: '+esc(x.server)+'</span>':'')+
          '</div></div>'+
        '<div class="battle-challenge-actions"><button type="button" class="btn battle-challenge-accept" data-decision="accepted">✓ Принять</button><button type="button" class="btn battle-challenge-reject" data-decision="rejected">✕ Отклонить</button></div>'+
      '</div>';
    }).join('');
    box.querySelectorAll('[data-decision]').forEach(btn=>btn.addEventListener('click',async()=>{
      const card=btn.closest('.battle-challenge-card'),id=card?.dataset.challengeId;
      if(!id)return;
      btn.disabled=true;
      card.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{
        const {error}=await client.rpc('empire_review_battle_challenge',{p_challenge_id:id,p_decision:btn.dataset.decision});
        if(error)throw error;
        card.remove();
        if(!box.querySelector('.battle-challenge-card')){box.hidden=true;box.innerHTML='';}
      }catch(e){
        alert(e?.message||'Не удалось обработать назначение сражения.');
        card.querySelectorAll('button').forEach(b=>b.disabled=false);
      }
    }));
  }catch(e){console.warn('Battle challenge notice:',e);}
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
