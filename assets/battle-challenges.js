(function(){
'use strict';
const style=document.createElement('style');
style.textContent=`
.battle-challenge-panel{margin:18px 0;padding:18px;border:1px solid #745832;background:rgba(15,11,8,.72);color:#d9c49a}
.battle-challenge-panel h3{margin:0 0 12px;color:#d6b16d;font:600 15px "Roboto Slab",serif}
.battle-challenge-button{display:inline-block;padding:11px 22px;border:1px solid #a7834d;background:linear-gradient(#73552f,#49351f);color:#f4dfb5;text-decoration:none;font-weight:700;cursor:pointer}
.battle-challenge-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
.battle-challenge-form label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#c8b38e}
.battle-challenge-form input,.battle-challenge-form select{width:100%;box-sizing:border-box;padding:9px;background:#17120d;border:1px solid #685034;color:#eee}
.battle-challenge-form .wide{grid-column:1/-1}.battle-challenge-actions{display:flex;gap:8px;flex-wrap:wrap}
.battle-challenge-list{display:grid;gap:10px}.battle-challenge-row{padding:12px;border:1px solid #59452e;background:rgba(0,0,0,.2)}
.battle-challenge-row small{display:block;color:#bba783;margin:5px 0}
@media(max-width:600px){.battle-challenge-form{grid-template-columns:1fr}.battle-challenge-form .wide{grid-column:auto}}
`;
document.head.appendChild(style);
(async()=>{
 try{
  await window.EMPIRE_AUTH.init();
  const auth=window.EMPIRE_AUTH,client=auth.client;
  const {data:{user}}=await client.auth.getUser();
  const name=new URLSearchParams(location.search).get('name')||'1st Regiment';
  const {data:target,error}=await client.from('empire_regiments').select('id,name,commander_id').eq('name',name).maybeSingle();
  if(error||!target)return;

  const {data:myMemberships,error:memberError}=user
    ?await client.from('empire_regiment_members').select('role,regiment_id').eq('user_id',user.id).is('left_at',null)
    :{data:[],error:null};
  if(memberError)throw memberError;
  const {data:commandedRegiments,error:commandedError}=user
    ?await client.from('empire_regiments').select('id,commander_id').eq('commander_id',user.id)
    :{data:[],error:null};
  if(commandedError)throw commandedError;
  const commanderRegimentIds=new Set((commandedRegiments||[]).map(r=>r.id));\n  (myMemberships||[]).filter(m=>m.role==='commander').forEach(m=>commanderRegimentIds.add(m.regiment_id));
  const isOwnCommander=!!user&&commanderRegimentIds.has(target.id);
  const canChallenge=!!user&&[...commanderRegimentIds].some(id=>id!==target.id);

  const panel=document.createElement('section');panel.className='battle-challenge-panel';
  const battleStatistics=document.getElementById('battleStatistics');
  if(!battleStatistics)return;
  battleStatistics.insertAdjacentElement('afterend',panel);

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  if(isOwnCommander){
   panel.innerHTML='<h3>Вызовы полку</h3><div class="battle-challenge-list" id="incomingChallenges">Загрузка вызовов…</div>';
   const list=panel.querySelector('#incomingChallenges');
   const {data:incoming,error}=await client.from('empire_battle_challenges').select('id,battle_type,player_count,allies_allowed,ally_limit,scheduled_at,server,password,status,created_at,challenger_regiment_id').eq('target_regiment_id',target.id).eq('status','pending').order('created_at',{ascending:false});
   if(error)throw error;
   if(!incoming?.length){list.textContent='Новых вызовов нет.';return;}
   const ids=[...new Set(incoming.map(x=>x.challenger_regiment_id))];
   const {data:regiments}=await client.from('empire_regiments').select('id,name').in('id',ids);
   const names=new Map((regiments||[]).map(x=>[x.id,x.name]));
   list.innerHTML=incoming.map(c=>'<article class="battle-challenge-row"><strong>Вызов от '+esc(names.get(c.challenger_regiment_id)||'Полк')+'</strong><small>'+esc(c.battle_type)+' · '+c.player_count+' на '+c.player_count+' · '+new Date(c.scheduled_at).toLocaleString('ru-RU')+(c.allies_allowed?' · Союзники до '+c.ally_limit:'')+'</small><small>Сервер: '+esc(c.server||'не указан')+' · Пароль: '+esc(c.password||'не указан')+'</small><div class="battle-challenge-actions"><button class="battle-challenge-button" data-answer="accepted" data-id="'+c.id+'">Принять вызов</button><button class="battle-challenge-button" data-answer="rejected" data-id="'+c.id+'">Отклонить</button></div></article>').join('');
   list.addEventListener('click',async e=>{const b=e.target.closest('[data-answer]');if(!b)return;b.disabled=true;const {error}=await client.rpc('empire_review_battle_challenge',{p_challenge_id:b.dataset.id,p_decision:b.dataset.answer});if(error){alert(error.message||'Не удалось обработать вызов');b.disabled=false;return;}location.reload();});
   return;
  }

  if(!canChallenge)return;

  panel.innerHTML='<button type="button" class="battle-challenge-button" id="openBattleChallenge">⚔ Бросить вызов</button><div id="battleChallengeFormWrap" hidden><h3>Назначить сражение полку '+esc(target.name)+'</h3><form class="battle-challenge-form" id="battleChallengeForm"><label>Тип сражения<select name="type" required><option>Линейное сражение</option><option>Осадное сражение</option><option>Кавалерийское сражение</option><option>Другое</option></select></label><label>Количество игроков с каждой стороны<input name="count" type="number" min="1" max="200" value="10" required></label><label>Дата и время<input name="date" type="datetime-local" required></label><label>Союзники<select name="allies"><option value="false">Не допускаются</option><option value="true">Допускаются</option></select></label><label>Максимум союзников<input name="allyLimit" type="number" min="0" max="200" value="0"></label><label>Сервер<input name="server" maxlength="200" placeholder="Название или адрес сервера"></label><label class="wide">Пароль сервера<input name="password" maxlength="200" placeholder="Пароль (если требуется)"></label><div class="wide battle-challenge-actions"><button class="battle-challenge-button" type="submit">Отправить вызов</button><button class="battle-challenge-button" type="button" id="cancelBattleChallenge">Отмена</button></div></form></div>';
  const wrap=panel.querySelector('#battleChallengeFormWrap');
  panel.querySelector('#openBattleChallenge').onclick=()=>{wrap.hidden=false;};
  panel.querySelector('#cancelBattleChallenge').onclick=()=>{wrap.hidden=true;};
  panel.querySelector('[name=allies]').onchange=e=>{panel.querySelector('[name=allyLimit]').disabled=e.target.value!=='true';};
  panel.querySelector('[name=allies]').dispatchEvent(new Event('change'));
  panel.querySelector('#battleChallengeForm').addEventListener('submit',async e=>{
   e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type=submit]'),v=new FormData(f);
   const date=new Date(v.get('date'));if(!Number.isFinite(date.getTime())||date<=new Date()){alert('Укажите дату и время в будущем.');return;}
   b.disabled=true;b.textContent='Отправка…';
   const {error}=await client.rpc('empire_create_battle_challenge',{p_target_regiment_id:target.id,p_battle_type:v.get('type'),p_player_count:Number(v.get('count')),p_allies_allowed:v.get('allies')==='true',p_ally_limit:Number(v.get('allyLimit')||0),p_scheduled_at:date.toISOString(),p_server:String(v.get('server')||''),p_password:String(v.get('password')||'')});
   if(error){alert(error.message||'Не удалось отправить вызов');b.disabled=false;b.textContent='Отправить вызов';return;}
   alert('Вызов отправлен командиру полка '+target.name+'.');location.reload();
  });
 }catch(e){console.error('Система полковых вызовов:',e);}
})();
