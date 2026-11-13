(async function(){
'use strict';
try{
  await window.EMPIRE_AUTH.init();
  const auth=window.EMPIRE_AUTH;
  const params=new URLSearchParams(location.search);
  const name=params.get('name')||'1st Regiment';
  const {data:reg,error:regError}=await auth.client.from('empire_regiments').select('id,name,faction,logo_url,commander_id').eq('name',name).maybeSingle();
  if(regError)throw regError;
  if(!reg)return;

  const rosterSection=document.querySelector('.roster-section .regiment-section-content');
  if(!rosterSection)return;

  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const avatarFor=p=>p?.avatar_url||'assets/default-soldier.jpg';

  const {data:members,error:membersError}=await auth.client
    .from('empire_regiment_members')
    .select('id,user_id,role,joined_at,empire_profiles(id,display_name,avatar_url,regiment,last_seen_at)')
    .eq('regiment_id',reg.id)
    .is('left_at',null)
    .order('role',{ascending:true})
    .order('joined_at',{ascending:true});
  if(membersError)throw membersError;

  const active=members||[];
  const actualCount=String(active.length);
  ['detailCount','detailCountMobile'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=actualCount;});
  const commander=active.find(m=>m.role==='commander')||active.find(m=>m.user_id===reg.commander_id);
  const isCommander=!!auth.user && (auth.user.id===reg.commander_id || active.some(m=>m.user_id===auth.user.id && m.role==='commander'));
  if(commander?.empire_profiles){
    const p=commander.empire_profiles;
    const el=document.getElementById('detailCommander');
    const img=document.getElementById('commanderAvatar');
    const link=document.getElementById('commanderProfileLink');
    if(el)el.textContent=p.display_name;
    if(img)img.src=avatarFor(p);
    if(link)link.href='profile.html?user='+encodeURIComponent(p.display_name);
  }

  const renderMembers=(role,id)=>{
    const box=document.getElementById(id);if(!box)return;
    const list=active.filter(m=>m.role===role&&m.user_id!==reg.commander_id);
    if(!list.length)return;
    const html=list.map(m=>{
      const p=m.empire_profiles||{};
      return '<a class="member-card" href="profile.html?user='+encodeURIComponent(p.display_name||'Пользователь')+'"><img class="member-avatar" src="'+escape(avatarFor(p))+'" alt=""><strong>'+escape(p.display_name||'Пользователь')+'</strong><small>'+escape(role==='officer'?'Офицер':'Солдат')+'</small></a>';
    }).join('');
    if(box.querySelector('.empty-note'))box.innerHTML='';
    box.insertAdjacentHTML('afterbegin',html);
  };
  renderMembers('officer','officersGrid');
  renderMembers('soldier','soldiersGrid');

  const oldJoin=document.getElementById('regimentMembershipControls');
  if(oldJoin)oldJoin.remove();
  const controls=document.createElement('div');
  controls.id='regimentMembershipControls';
  controls.className='regiment-membership-controls';
  rosterSection.appendChild(controls);

  let myMembership=auth.user?active.find(m=>m.user_id===auth.user.id):null;
  let pending=null;
  if(auth.user){
    const q=await auth.client.from('empire_regiment_applications')
      .select('id,status,created_at').eq('regiment_id',reg.id).eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
    pending=q.data||null;
  }

  if(auth.user&&!isCommander){
    if(myMembership){
      const button=document.createElement('button');
      button.className='btn danger';button.textContent='Покинуть полк';
      button.onclick=async()=>{
        if(!confirm('Покинуть '+reg.name+'?'))return;
        const {error}=await auth.client.from('empire_regiment_members').update({left_at:new Date().toISOString()}).eq('id',myMembership.id).eq('user_id',auth.user.id);
        if(error)alert(error.message||'Не удалось покинуть полк.');else location.reload();
      };
      controls.appendChild(button);
    }else if(pending?.status==='pending'){
      const span=document.createElement('div');span.className='membership-status';span.textContent='Заявка на вступление отправлена';controls.appendChild(span);
    }else{
      const button=document.createElement('button');
      button.className='btn primary';button.textContent='Вступить в полк';
      button.onclick=async()=>{
        const {data:existing}=await auth.client.from('empire_regiment_members').select('id').eq('user_id',auth.user.id).is('left_at',null).maybeSingle();
        if(existing){alert('Вы уже состоите в другом полку. Сначала покиньте его.');return;}
        const {error}=await auth.client.from('empire_regiment_applications').insert({regiment_id:reg.id,user_id:auth.user.id,status:'pending'});
        if(error){alert(error.message||'Не удалось отправить заявку.');return;}
        alert('Заявка отправлена главе полка.');
        location.reload();
      };
      controls.appendChild(button);
    }
  }else if(!auth.user){
    const link=document.createElement('a');link.className='btn primary';link.href='register.html';link.textContent='Войти, чтобы вступить в полк';controls.appendChild(link);
  }

  if(isCommander){
    const q=await auth.client.from('empire_regiment_applications')
      .select('id,status,created_at,empire_profiles(id,display_name,avatar_url,regiment)')
      .eq('regiment_id',reg.id).eq('status','pending').order('created_at',{ascending:true});
    if(q.error)throw q.error;
    const panel=document.createElement('section');
    panel.className='regiment-join-requests';
    panel.innerHTML='<div class="page-kicker">ЗАЯВКИ НА ВСТУПЛЕНИЕ</div><h3>Кандидаты</h3>';
    if(!q.data?.length){
      panel.insertAdjacentHTML('beforeend','<p class="empty-note">Новых заявок нет.</p>');
    }else{
      const list=document.createElement('div');list.className='regiment-request-list';
      q.data.forEach(app=>{
        const p=app.empire_profiles||{};
        const row=document.createElement('div');row.className='regiment-request';
        row.innerHTML='<a href="profile.html?user='+encodeURIComponent(p.display_name||'Пользователь')+'"><img src="'+escape(avatarFor(p))+'" alt=""><div><strong>'+escape(p.display_name||'Пользователь')+'</strong><small>Подана '+new Date(app.created_at).toLocaleString('ru-RU')+'</small></div></a><div class="regiment-request-actions"><button class="btn primary" data-application="'+app.id+'" data-decision="accepted">Принять</button><button class="btn danger" data-application="'+app.id+'" data-decision="rejected">Отклонить</button></div>';
        list.appendChild(row);
      });
      panel.appendChild(list);
      list.addEventListener('click',async e=>{
        const btn=e.target.closest('[data-application]');if(!btn)return;
        btn.disabled=true;
        const {error}=await auth.client.rpc('empire_review_regiment_application',{p_application_id:btn.dataset.application,p_decision:btn.dataset.decision});
        if(error){alert(error.message||'Не удалось обработать заявку.');btn.disabled=false;return;}
        location.reload();
      });
    }
    rosterSection.appendChild(panel);
  }

  const chronicle=document.querySelector('.regiment-chronicle-list');
  if(chronicle&&active.length){
    const entries=active.slice().sort((a,b)=>new Date(b.joined_at)-new Date(a.joined_at)).map(m=>{
      const p=m.empire_profiles||{};
      return '<article class="chronicle-item"><div class="chronicle-date">'+new Date(m.joined_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})+'</div><div class="chronicle-content"><strong>Вступление в полк</strong><p>'+escape(p.display_name||'Пользователь')+' принят в состав полка.</p></div></article>';
    }).join('');
    chronicle.insertAdjacentHTML('afterbegin',entries);
  }

  const countEl=document.getElementById('detailCount');
  const mobileCount=document.getElementById('detailCountMobile');
  const count=active.length||Number((countEl?.textContent||'0').replace(/\D/g,''))||0;
  if(countEl)countEl.textContent=count+' человек';
  if(mobileCount)mobileCount.textContent=count+' человек';
}catch(error){
  console.warn('Региментальная система:',error);
}
})();