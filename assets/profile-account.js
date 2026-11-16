(async function(){
'use strict';

try{
  await window.EMPIRE_AUTH.init();
  const auth=window.EMPIRE_AUTH;
  const params=new URLSearchParams(location.search);
  const requested=params.get('user')||'';
  const requestedName=requested||auth.profile?.display_name||'';
  if(!requestedName){
    const title=document.getElementById('profileName');
    if(title)title.textContent='Войдите в аккаунт или выберите профиль пользователя.';
    return;
  }

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));  const profileCacheKey='clanwars_profile_v3_'+encodeURIComponent(requestedName.toLowerCase());
  const readProfileCache=()=>{try{return JSON.parse(localStorage.getItem(profileCacheKey)||'null');}catch(e){return null;}};
  const writeProfileCache=data=>{try{localStorage.setItem(profileCacheKey,JSON.stringify({at:Date.now(),data}));}catch(e){}};
  const cachedProfile=readProfileCache();
  const hydrateCachedProfile=payload=>{
    if(!payload)return;
    const p=payload.profile||{},r=payload.regiment||null,m=payload.activeMembership||null;
    const setCached=(id,value)=>{const el=document.getElementById(id);if(el&&value!=null)el.textContent=value;};
    if(p.display_name)setCached('profileName',p.display_name);
    setCached('profileRegiment',p.regiment||'Без полка');
    setCached('profileRole',r?.commander_id===p.id?'Глава полка':m?.role==='officer'?'Офицер':m?.role==='soldier'?'Солдат':'Не состоит в полку');
    if(p.avatar_url){const a=document.getElementById('profileAvatar');if(a){a.src=p.avatar_url;a.style.visibility='visible';}}
    const rl=document.getElementById('profileRegimentLink'),lg=document.getElementById('profileRegimentLogo');
    if(rl&&r){rl.href='regiment.html?name='+encodeURIComponent(r.name);if(lg)lg.src=r.logo_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png';}
    const serviceBox=document.getElementById('serviceList');
    if(serviceBox&&Array.isArray(payload.service)){
      serviceBox.innerHTML=payload.service.length?payload.service.map(row=>{
        const from=new Date(row.joined_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
        const to=row.left_at?new Date(row.left_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'по настоящее время';
        return '<div class="service-item"><div class="service-regiment">'+esc(row.empire_regiments?.name||'Полк')+'</div><div class="service-dates"><span>С '+from+'</span><span>'+to+'</span></div></div>';
      }).join(''):'<p class="empty-note">Не служил.</p>';
    }
  };
  hydrateCachedProfile(cachedProfile?.data);
  const avatarFallback=(name,regiment)=>{
    const map={
      'Французская Империя':'assets/f88263f8-b7d4-40a2-83c7-13e4e9cc4442.png',
      'Британская Империя':'assets/1BR.jpg',
      'Российская Империя':'assets/russia-avatar.png',
      'Пруссия':'assets/avatar-prussia.png',
      'Рейнский Союз':'assets/Bav.jpg',
      'Австрийская Империя':'assets/austria-avatar.png'
    };
    return map[regiment?.faction]||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png';
  };

  let {data:profile,error:profileError}=await auth.client
    .from('empire_profiles')
    .select('id,display_name,regiment,avatar_url,created_at,last_seen_at,is_admin')
    .ilike('display_name',requestedName)
    .limit(1)
    .maybeSingle();
  if(profileError)throw profileError;
  if(!profile){
    if(auth.user&&auth.profile&&String(auth.profile.display_name||'').toLowerCase()===String(requestedName||'').toLowerCase()){
      profile=auth.profile;
    }else{
      return;
    }
  }

  let regiment=null;
  if(profile.regiment){
    const q=await auth.client.from('empire_regiments').select('id,name,faction,logo_url,commander_id').eq('name',profile.regiment).maybeSingle();
    regiment=q.data||null;
  }

  // Сохраняем основные данные сразу после их получения; следующий вход отрисует их до сети.
  writeProfileCache({profile,regiment});
  const isOwn=!!auth.user&&auth.user.id===profile.id;
  const online=isOwn||(profile.last_seen_at&&Date.now()-new Date(profile.last_seen_at).getTime()<180000);
  if(isOwn){auth.touchPresence();setInterval(()=>auth.touchPresence(),60000);}

  const {data:activeMembership,error:membershipError}=await auth.client
    .from('empire_regiment_members')
    .select('role')
    .eq('user_id',profile.id)
    .is('left_at',null)
    .limit(1)
    .maybeSingle();
  // Ошибка/несколько старых записей членства не должны блокировать весь профиль.
  if(membershipError)console.warn('Не удалось определить текущую должность:',membershipError);

  document.title=profile.display_name+' — Clanwars';
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  set('profileName',profile.display_name);
  set('profileRegiment',profile.regiment||'Без полка');
  const regimentLink=document.getElementById('profileRegimentLink');
  const regimentLogo=document.getElementById('profileRegimentLogo');
  if(regimentLink){
    if(regiment){
      regimentLink.href='regiment.html?name='+encodeURIComponent(regiment.name);
      regimentLink.title='Открыть страницу полка';
      regimentLink.setAttribute('aria-label','Открыть страницу полка '+regiment.name);
      if(regimentLogo)regimentLogo.src=regiment.logo_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png';
    }else{
      regimentLink.removeAttribute('href');
      regimentLink.removeAttribute('title');
      if(regimentLogo)regimentLogo.src='assets/aea32583-9230-496e-af65-c2e33f73ff79.png';
    }
  }
  const profileRole=regiment?.commander_id===profile.id?'Глава полка':
    activeMembership?.role==='officer'?'Офицер':
    activeMembership?.role==='soldier'?'Солдат':
    'Не состоит в полку';
  set('profileRole',profileRole);
  const actions=document.getElementById('profileActions');
  if(profile.is_admin){
    const badge=document.getElementById('profileRoleBadge');
    if(badge){
      badge.hidden=false;
      badge.textContent='АДМИНИСТРАТОР';
    }
    if(isOwn&&actions&&!document.getElementById('adminProfileButton')){
      const adminButton=document.createElement('a');
      adminButton.id='adminProfileButton';
      adminButton.className='btn profile-admin-button';
      adminButton.href='admin.html';
      adminButton.textContent='Панель админа';
      actions.appendChild(adminButton);
    }
  }
  const onlineEl=document.getElementById('profileOnlineStatus');
  if(onlineEl){
    onlineEl.className='profile-online-status '+(online?'online':'offline');
    const em=onlineEl.querySelector('em');if(em)em.textContent=online?'В сети':'Не в сети';
  }

  const avatar=document.getElementById('profileAvatar');
  if(avatar){
    avatar.src=profile.avatar_url||avatarFallback(profile.display_name,regiment);
    avatar.alt='Аватар '+profile.display_name;
    avatar.style.visibility='visible';
  }

  if(actions&&isOwn&&!document.getElementById('profileEditButton')){
    const button=document.createElement('button');
    button.type='button';
    button.id='profileEditButton';
    button.className='btn profile-edit-button';
    button.textContent='Редактировать профиль';
    actions.appendChild(button);

    const deleteButton=document.createElement('button');
    deleteButton.type='button';
    deleteButton.id='profileDeleteAccount';
    deleteButton.className='btn profile-delete-visible';
    deleteButton.textContent='Удалить профиль';
    actions.appendChild(deleteButton);

    const panel=document.createElement('div');
    panel.id='profileEditPanel';
    panel.className='profile-edit-panel';
    panel.hidden=true;
    panel.innerHTML=
      '<button type="button" class="btn" id="profileChangeAvatar">Изменить аватар</button>'+
      '<button type="button" class="btn" id="profileRemoveAvatar">Удалить аватар</button>'+
      '<button type="button" class="btn" id="profileChangeName">Изменить имя пользователя</button>';
    actions.appendChild(panel);

    button.onclick=()=>{panel.hidden=!panel.hidden;};
    panel.querySelector('#profileChangeAvatar').onclick=()=>{
      const input=document.createElement('input');
      input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif';
      input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const url=await auth.uploadAvatar(file);avatar.src=url;alert('Аватар изменён.');}catch(e){alert(e.message||'Не удалось изменить аватар.');}};
      input.click();
    };
    panel.querySelector('#profileRemoveAvatar').onclick=async()=>{
      if(!confirm('Удалить текущий аватар? На его место будет установлен стандартный аватар.'))return;
      try{
        await auth.deleteAvatar();
        const fallback=avatarFallback(profile.display_name,regiment);
        avatar.src=fallback;
        avatar.alt='Стандартный аватар '+profile.display_name;
        profile.avatar_url='';
        if(auth.profile)auth.profile.avatar_url='';
        alert('Аватар удалён.');
      }catch(e){alert(e.message||'Не удалось удалить аватар.');}
    };
    panel.querySelector('#profileChangeName').onclick=async()=>{
      const next=prompt('Новое имя пользователя:',profile.display_name);
      if(next===null)return;
      const name=next.trim();
      if(name===profile.display_name)return;
      if(name.length<3||name.length>24){alert('Имя должно содержать от 3 до 24 символов.');return;}
      try{await auth.profilePatch({display_name:name});location.href='profile.html?user='+encodeURIComponent(name);}
      catch(e){alert(e.message||'Не удалось изменить имя пользователя.');}
    };
    deleteButton.onclick=async()=>{
      if(!confirm('Удалить профиль и аккаунт? Это действие нельзя отменить.'))return;
      if(!confirm('Все сообщения, заявки и история службы этого аккаунта будут удалены. Продолжить?'))return;
      try{await auth.deleteAccount();location.href='index.html';}
      catch(e){alert(e.message||'Не удалось удалить профиль.');}
    };
  }

  const serviceBox=document.getElementById('serviceList');
  if(serviceBox){
    try{
      const {data:service,error}=await auth.client
        .from('empire_regiment_members')
        .select('joined_at,left_at,role,empire_regiments(name)')
        .eq('user_id',profile.id)
        .order('joined_at',{ascending:true});
      if(error)throw error;
      if(service?.length){
        serviceBox.innerHTML=service.map(row=>{
          const from=new Date(row.joined_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
          const to=row.left_at?new Date(row.left_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'по настоящее время';
          return '<div class="service-item"><div class="service-regiment">'+esc(row.empire_regiments?.name||'Полк')+'</div><div class="service-dates"><span>С '+from+'</span><span>'+to+'</span></div></div>';
        }).join('');
      }else serviceBox.innerHTML='<p class="empty-note">Не служил.</p>';
      const currentCache=readProfileCache()?.data||{};
      writeProfileCache({...currentCache,profile,regiment,activeMembership,service:service||[]});
    }catch(serviceError){
      console.warn('Не удалось загрузить послужной список:',serviceError);
      serviceBox.innerHTML='<p class="empty-note">Послужной список пока недоступен.</p>';
    }

  // Record the latest visit once per visitor/profile pair and show unique recent guests.
  const guestsBox=document.getElementById('profileGuests');
  if(guestsBox){
    try{
      if(auth.user && auth.user.id!==profile.id){
        const visit=await auth.client.rpc('empire_record_profile_visit',{p_profile_id:profile.id});
        if(visit.error)throw visit.error;
      }
      const {data:visits,error:visitsError}=await auth.client
        .from('empire_profile_visits')
        .select('visitor_id,last_visited_at')
        .eq('profile_id',profile.id)
        .order('last_visited_at',{ascending:false})
        .limit(12);
      if(visitsError)throw visitsError;
      const visitorIds=[...new Set((visits||[]).map(v=>v.visitor_id))];
      let visitorsById={};
      if(visitorIds.length){
        const people=await auth.client.from('empire_profiles').select('id,display_name,avatar_url,regiment').in('id',visitorIds);
        if(people.error)throw people.error;
        visitorsById=Object.fromEntries((people.data||[]).map(p=>[p.id,p]));
      }
      const dateText=value=>new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
      const guests=(visits||[]).filter(v=>visitorsById[v.visitor_id]);
      guestsBox.innerHTML=guests.length?guests.map(v=>{
        const person=visitorsById[v.visitor_id];
        const visited=dateText(v.last_visited_at);
        const avatarUrl=person.avatar_url||avatarFallback(person.display_name,{faction:''});
        return '<a class="profile-friend profile-guest" href="profile.html?user='+encodeURIComponent(person.display_name)+'" title="'+esc('Последнее посещение: '+visited)+'" aria-label="'+esc(person.display_name+'. Последнее посещение: '+visited)+'"><img src="'+esc(avatarUrl)+'" alt="'+esc(person.display_name)+'"><span>'+esc(person.display_name)+'</span><small>'+esc(visited)+'</small></a>';
      }).join(''):'<p class="empty-note">Посетителей пока нет.</p>';
      const currentCache=readProfileCache()?.data||{};
      writeProfileCache({...currentCache,guests:guests||[]});
    }catch(guestError){
      console.warn('Не удалось загрузить гостей профиля:',guestError);
      guestsBox.innerHTML='<p class="empty-note">История посещений пока недоступна.</p>';
    }
  }

  const messageArea=document.getElementById('messageArea');
  const renderMessages=async contact=>{
    try{
    if(!messageArea)return;
    if(!auth.user){messageArea.innerHTML='<div class="no-conversation"><p>Войдите в сообщество, чтобы пользоваться перепиской.</p><a class="btn primary" href="register.html">Войти</a></div>';return;}
    if(!contact){
      const {data:rows,error}=await auth.client
        .from('empire_private_messages')
        .select('sender_id,recipient_id,content,created_at')
        .or('sender_id.eq.'+auth.user.id+',recipient_id.eq.'+auth.user.id)
        .order('created_at',{ascending:false});
      if(error)throw error;
      const ids=[...new Set((rows||[]).map(row=>row.sender_id===auth.user.id?row.recipient_id:row.sender_id))];
      let contacts=[];
      if(ids.length){
        const q=await auth.client.from('empire_profiles').select('id,display_name,avatar_url,regiment').in('id',ids);
        if(q.error)throw q.error;
        const byId=Object.fromEntries((q.data||[]).map(p=>[p.id,p]));
        const regimentNames=[...new Set((q.data||[]).map(p=>String(p.regiment||'').trim()).filter(Boolean))];
        let factions={};
        if(regimentNames.length){
          const rq=await auth.client.from('empire_regiments').select('name,faction').in('name',regimentNames);
          if(!rq.error)factions=Object.fromEntries((rq.data||[]).map(r=>[r.name,r.faction||'']));
        }
        (q.data||[]).forEach(p=>{p._regimentFaction=factions[p.regiment]||'';});
        const seen=new Set();
        (rows||[]).forEach(row=>{
          const id=row.sender_id===auth.user.id?row.recipient_id:row.sender_id;
          const p=byId[id];
          if(p&&!seen.has(p.id)){seen.add(p.id);contacts.push(p);}
        });
      }
      if(!contacts.length){
        messageArea.innerHTML='<div class="no-conversation"><p>Переписок пока нет.</p></div>';
        return;
      }
      messageArea.innerHTML='<div class="conversation-list">'+contacts.map(p=>{
        const a=p.avatar_url||avatarFallback(p.display_name,{faction:p._regimentFaction||''});
        return '<a class="conversation-item" href="profile.html?user='+encodeURIComponent(p.display_name)+'"><img src="'+esc(a)+'" alt=""><div><strong>'+esc(p.display_name)+'</strong><small>'+(p.regiment?esc(p.regiment):'Без полка')+'</small></div><span>›</span></a>';
      }).join('')+'</div>';
      return;
    }

    const target=contact;
    const {data:rows,error}=await auth.client
      .from('empire_private_messages')
      .select('id,sender_id,recipient_id,content,created_at')
      .or('and(sender_id.eq.'+auth.user.id+',recipient_id.eq.'+target.id+'),and(sender_id.eq.'+target.id+',recipient_id.eq.'+auth.user.id+')')
      .order('created_at',{ascending:true});
    if(error)throw error;
    let targetFaction=target._regimentFaction||'';
    if(!targetFaction&&target.regiment){
      const rq=await auth.client.from('empire_regiments').select('faction').eq('name',target.regiment).maybeSingle();
      targetFaction=rq.data?.faction||'';
    }
    const targetAvatar=target.avatar_url||avatarFallback(target.display_name,{faction:targetFaction});
    messageArea.innerHTML='<div class="conversation-head"><a href="profile.html?user='+encodeURIComponent(target.display_name)+'"><img src="'+esc(targetAvatar)+'" alt=""><strong>'+esc(target.display_name)+'</strong></a></div>'+
      '<div class="message-history">'+(rows||[]).map(m=>{
        const mine=m.sender_id===auth.user.id;
        return '<div class="private-message '+(mine?'mine':'')+'"><img src="'+esc(mine?(auth.profile?.avatar_url||avatarFallback(auth.profile?.display_name,{faction:auth.profile?._regimentFaction||''})):targetAvatar)+'" alt=""><div><b>'+esc(mine?(auth.profile?.display_name||'Вы'):target.display_name)+'</b><p>'+((window.CLANWARS_SMILES?.renderText?window.CLANWARS_SMILES.renderText(m.content):esc(m.content)))+'</p><span>'+new Date(m.created_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span></div>'+(mine?'<button type="button" class="private-message-delete" data-message-id="'+esc(m.id)+'" title="Удалить сообщение" aria-label="Удалить своё сообщение">×</button>':'')+'</div>';
      }).join('')+'</div>'+
      '<div class="message-compose"><input id="privateMessageInput" maxlength="2000" placeholder="Написать сообщение…"><button type="button" class="private-message-smile-button" id="privateMessageSmile" title="Выбрать смайл" aria-label="Выбрать смайл">☺</button><button id="privateMessageSend">Отправить</button></div>';
    messageArea.querySelectorAll('.private-message-delete').forEach(button=>{
      button.onclick=async()=>{
        const messageId=button.dataset.messageId;
        if(!messageId||!confirm('Удалить это сообщение?'))return;
        button.disabled=true;
        const {data:deleted,error:deleteError}=await auth.client
          .from('empire_private_messages')
          .delete()
          .eq('id',messageId)
          .eq('sender_id',auth.user.id)
          .select('id');
        if(deleteError){button.disabled=false;alert(deleteError.message||'Не удалось удалить сообщение.');return;}
        if(!deleted?.length){button.disabled=false;alert('Не удалось удалить сообщение: проверьте права доступа в Supabase.');return;}
        await renderMessages(target);
      };
    });
    const send=async()=>{
      const input=document.getElementById('privateMessageInput');const text=input?.value.trim();if(!text)return;
      const {error}=await auth.client.from('empire_private_messages').insert({sender_id:auth.user.id,recipient_id:target.id,content:text});
      if(error){alert(error.message||'Не удалось отправить сообщение.');return;}
      input.value='';await renderMessages(target);
    };
    const privateSmileButton=document.getElementById('privateMessageSmile');
    if(privateSmileButton&&window.CLANWARS_SMILES)window.CLANWARS_SMILES.makePicker(privateSmileButton,document.getElementById('privateMessageInput'));
    document.getElementById('privateMessageSend').onclick=send;
    document.getElementById('privateMessageInput').onkeydown=e=>{if(e.key==='Enter')send();};
  };

    }catch(messageError){
      console.warn('Не удалось загрузить переписку:',messageError);
      messageArea.innerHTML='<div class="no-conversation"><p>Переписка временно недоступна. Попробуйте обновить страницу.</p></div>';
    }
  };

  if(auth.user){
    const target=auth.user.id===profile.id?null:profile;
    await renderMessages(target);
  }else{
    await renderMessages(null);
  }

  const profileParams=new URLSearchParams(location.search);
  const targetForLink=profile.display_name;
  const title=document.querySelector('.profile-messages-section .card-title');
  if(title&&auth.user&&auth.user.id!==profile.id)title.textContent='✉  Переписка с '+profile.display_name;

}catch(error){
  console.warn('Не удалось загрузить профиль Clanwars:',error);
}
})();