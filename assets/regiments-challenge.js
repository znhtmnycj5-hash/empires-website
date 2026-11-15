(function(){
'use strict';

const style=document.createElement('style');
style.textContent=`
.regiment-tile{position:relative}
.regiment-challenge-hover{
  position:absolute;right:12px;bottom:12px;z-index:3;
  display:none;padding:9px 14px;border:1px solid #a7834d;
  background:linear-gradient(#73552f,#49351f);color:#f4dfb5;
  font-weight:700;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.45)
}
.regiment-tile:hover .regiment-challenge-hover,
.regiment-tile:focus-within .regiment-challenge-hover{display:block}
.regiment-challenge-overlay{
  position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
  padding:20px;background:rgba(0,0,0,.7)
}
.regiment-challenge-modal{
  width:min(680px,100%);max-height:90vh;overflow:auto;padding:22px;
  border:1px solid #745832;background:#17120d;color:#d9c49a;
  box-shadow:0 12px 40px rgba(0,0,0,.7)
}
.regiment-challenge-modal h3{margin:0 0 16px;color:#d6b16d;font:600 18px "Roboto Slab",serif}
.regiment-challenge-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.regiment-challenge-form label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#c8b38e}
.regiment-challenge-form input,.regiment-challenge-form select{
  width:100%;box-sizing:border-box;padding:9px;background:#17120d;
  border:1px solid #685034;color:#eee
}
.regiment-challenge-form .wide{grid-column:1/-1}
.regiment-challenge-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.regiment-challenge-button{
  padding:10px 18px;border:1px solid #a7834d;
  background:linear-gradient(#73552f,#49351f);color:#f4dfb5;font-weight:700;cursor:pointer
}
@media(max-width:600px){
  .regiment-challenge-form{grid-template-columns:1fr}
  .regiment-challenge-form .wide{grid-column:auto}
  .regiment-challenge-hover{right:8px;bottom:8px;padding:8px 11px}
}
`;
document.head.appendChild(style);

(async()=>{
  try{
    if(!window.EMPIRE_AUTH)return;
    await window.EMPIRE_AUTH.init();
    const client=window.EMPIRE_AUTH.client;
    const {data:{user}}=await client.auth.getUser();
    if(!user)return;

    const {data:commanded,error:commandedError}=await client
      .from('empire_regiments')
      .select('id,name')
      .eq('commander_id',user.id);
    if(commandedError)throw commandedError;

    const {data:members,error:membersError}=await client
      .from('empire_regiment_members')
      .select('regiment_id,role,left_at')
      .eq('user_id',user.id)
      .eq('role','commander')
      .is('left_at',null);
    if(membersError)throw membersError;

    const commanderIds=new Set((commanded||[]).map(r=>r.id));
    (members||[]).forEach(m=>commanderIds.add(m.regiment_id));
    if(!commanderIds.size)return;

    const list=document.querySelector('.regiments-list');
    if(!list)return;

    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    const openChallenge=(targetId,targetName)=>{
      const overlay=document.createElement('div');
      overlay.className='regiment-challenge-overlay';
      overlay.innerHTML=`
        <div class="regiment-challenge-modal" role="dialog" aria-modal="true">
          <h3>⚔ Бросить вызов: ${esc(targetName)}</h3>
          <form class="regiment-challenge-form">
            <label>Тип сражения
              <select name="type" required>
                <option>Линейное сражение</option>
                <option>Осадное сражение</option>
                <option>Кавалерийское сражение</option>
                <option>Другое</option>
              </select>
            </label>
            <label>Количество игроков с каждой стороны
              <input name="count" type="number" min="1" max="200" value="10" required>
            </label>
            <label>Дата и время
              <input name="date" type="datetime-local" required>
            </label>
            <label>Союзники
              <select name="allies">
                <option value="false">Не допускаются</option>
                <option value="true">Допускаются</option>
              </select>
            </label>
            <label>Максимум союзников
              <input name="allyLimit" type="number" min="0" max="200" value="0">
            </label>
            <label>Сервер
              <input name="server" maxlength="200" placeholder="Название или адрес сервера">
            </label>
            <label class="wide">Пароль сервера
              <input name="password" maxlength="200" placeholder="Пароль (если требуется)">
            </label>
            <div class="wide regiment-challenge-actions">
              <button class="regiment-challenge-button" type="submit">Отправить вызов</button>
              <button class="regiment-challenge-button" type="button" data-close>Отмена</button>
            </div>
          </form>
        </div>`;
      document.body.appendChild(overlay);

      const form=overlay.querySelector('form');
      const allies=overlay.querySelector('[name=allies]');
      const limit=overlay.querySelector('[name=allyLimit]');
      const syncAllies=()=>{limit.disabled=allies.value!=='true';};
      allies.addEventListener('change',syncAllies);
      syncAllies();

      overlay.querySelector('[data-close]').onclick=()=>overlay.remove();
      overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});

      form.addEventListener('submit',async e=>{
        e.preventDefault();
        const submit=form.querySelector('[type=submit]');
        const v=new FormData(form);
        const date=new Date(v.get('date'));
        if(!Number.isFinite(date.getTime())||date<=new Date()){
          alert('Укажите дату и время в будущем.');
          return;
        }
        submit.disabled=true;
        submit.textContent='Отправка…';
        const {error}=await client.rpc('empire_create_battle_challenge',{
          p_target_regiment_id:targetId,
          p_battle_type:String(v.get('type')),
          p_player_count:Number(v.get('count')),
          p_allies_allowed:v.get('allies')==='true',
          p_ally_limit:Number(v.get('allyLimit')||0),
          p_scheduled_at:date.toISOString(),
          p_server:String(v.get('server')||''),
          p_password:String(v.get('password')||'')
        });
        if(error){
          alert(error.message||'Не удалось отправить вызов');
          submit.disabled=false;
          submit.textContent='Отправить вызов';
          return;
        }
        alert('Вызов отправлен командиру полка '+targetName+'.');
        overlay.remove();
      });
    };

    const addButtons=()=>{
      list.querySelectorAll('.regiment-tile[data-regiment-name]').forEach(tile=>{
        if(tile.dataset.regimentChallengeReady==='1')return;
        const targetName=tile.dataset.regimentName;
        const targetId=tile.dataset.regimentId;
        if(!targetId||!targetName)return;
        if(commanderIds.has(targetId))return;

        const button=document.createElement('button');
        button.type='button';
        button.className='regiment-challenge-hover';
        button.textContent='⚔ Бросить вызов';
        button.addEventListener('click',e=>{
          e.preventDefault();
          e.stopPropagation();
          openChallenge(targetId,targetName);
        });
        tile.appendChild(button);
        tile.dataset.regimentChallengeReady='1';
      });
    };

    const hydrateTargetIds=async()=>{
      const names=[...list.querySelectorAll('.regiment-tile[data-regiment-name]')]
        .filter(tile=>!tile.dataset.regimentId)
        .map(tile=>tile.dataset.regimentName);
      if(!names.length){addButtons();return;}
      const {data,error}=await client.from('empire_regiments').select('id,name').in('name',names);
      if(error)throw error;
      const ids=new Map((data||[]).map(r=>[r.name,r.id]));
      list.querySelectorAll('.regiment-tile[data-regiment-name]').forEach(tile=>{
        const id=ids.get(tile.dataset.regimentName);
        if(id)tile.dataset.regimentId=id;
      });
      addButtons();
    };

    await hydrateTargetIds();
    new MutationObserver(()=>{hydrateTargetIds().catch(e=>console.error('Кнопки вызова:',e));}).observe(list,{childList:true});
  }catch(error){
    console.error('Кнопки вызова на странице полков:',error);
  }
})();
})();