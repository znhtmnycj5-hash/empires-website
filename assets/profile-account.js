(async function(){
'use strict';

try{
  await window.EMPIRE_AUTH.init();
  const auth=window.EMPIRE_AUTH;
  const params=new URLSearchParams(location.search);
  const requested=params.get('user')||'';
  const requestedName=requested||auth.profile?.display_name||'Kalashnikov';

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const avatarFallback=(name,regiment)=>{
    const map={
      'Французская Империя':'assets/default-soldier.jpg',
      'Британская Империя':'assets/1BR.jpg',
      'Российская Империя':'assets/russia-avatar.png',
      'Пруссия':'assets/avatar-prussia.png',
      'Рейнский Союз':'assets/Bav.jpg',
      'Австрийская Империя':'assets/austria-avatar.png'
    };
    return map[regiment?.faction]||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png';
  };

  const {data:profile,error:profileError}=await auth.client
    .from('empire_profiles')
    .select('id,display_name,regiment,avatar_url,created_at,last_seen_at')
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

  const isOwn=!!auth.user&&auth.user.id===profile.id;
  const online=isOwn||(profile.last_seen_at&&Date.now()-new Date(profile.last_seen_at).getTime()<180000);
  if(isOwn){auth.touchPresence();setInterval(()=>auth.touchPresence(),60000);}

  document.title=profile.display_name+' — EMPIRE';
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  set('profileName',profile.display_name);
  set('profileRegiment',profile.regiment||'Без полка');
  set('profileRole',regiment?.commander_id===profile.id?'Глава полка':'Солдат');
  const onlineEl=document.getElementById('profileOnlineStatus');
  if(onlineEl){
    onlineEl.className='profile-online-status '+(online?'online':'offline');
    const em=onlineEl.querySelector('em');if(em)em.textContent=online?'В сети':'Не в сети';
  }

  const avatar=document.getElementById('profileAvatar');
  if(avatar){
    avatar.src=profile.avatar_url||avatarFallback(profile.display_name,regiment);
    avatar.alt='Аватар '+profile.display_name;
  }

  const main=document.querySelector('.profile-main');
  if(main&&isOwn&&!document.getElementById('profileEditButton')){
    const button=document.createElement('button');
    button.type='button';
    button.id='profileEditButton';
    button.className='btn profile-edit-button';
    button.textContent='Редактировать профиль';
    main.appendChild(button);

    const panel=document.createElement('div');
    panel.id='profileEditPanel';
    panel.className='profile-edit-panel';
    panel.hidden=true;
    panel.innerHTML=
      '<button type="button" class="btn" id="profileChangeAvatar">Изменить аватар</button>'+
      '<button type="button" class="btn" id="profileChangeName">Изменить имя пользователя</button>'+
      '<button type="button" class="btn danger" id="profileDeleteAccount">Удалить профиль</button>';
    main.appendChild(panel);

    button.onclick=()=>{panel.hidden=!panel.hidden;};
    panel.querySelector('#profileChangeAvatar').onclick=()=>{
      const input=document.createElement('input');
      input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif';
      input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const url=await auth.uploadAvatar(file);avatar.src=url;alert('Аватар изменён.');}catch(e){alert(e.message||'Не удалось изменить аватар.');}};
      input.click();
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
    panel.querySelector('#profileDeleteAccount').onclick=async()=>{
      if(!confirm('Удалить профиль и аккаунт? Это действие нельзя отменить.'))return;
      if(!confirm('Все сообщения, заявки и история службы этого аккаунта будут удалены. Продолжить?'))return;
      try{await auth.deleteAccount();location.href='index.html';}
      catch(e){alert(e.message||'Не удалось удалить профиль.');}
    };
  }

  const serviceBox=document.getElementById('serviceList');
  if(serviceBox){
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
        return '<div class="service-item"><div class="service-regiment">'+esc(row.empire_regiments?.name||'Полк')+'</div><div class="service-dates"><span>С '+from+'</span><span>По '+to+'</span></div></div>';
      }).join('');
    }else serviceBox.innerHTML='<p class="empty-note">Не служил.</p>';
  }

  const messageArea=document.getElementById('messageArea');
  const renderMessages=async contact=>{
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
        const a=p.avatar_url||avatarFallback(p.display_name,{faction:''});
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
    const targetAvatar=target.avatar_url||avatarFallback(target.display_name,{faction:''});
    messageArea.innerHTML='<div class="conversation-head"><a href="profile.html?user='+encodeURIComponent(target.display_name)+'"><img src="'+esc(targetAvatar)+'" alt=""><strong>'+esc(target.display_name)+'</strong></a></div>'+
      '<div class="message-history">'+(rows||[]).map(m=>{
        const mine=m.sender_id===auth.user.id;
        return '<div class="private-message '+(mine?'mine':'')+'"><img src="'+esc(mine?(auth.profile?.avatar_url||avatarFallback(auth.profile?.display_name,{})):targetAvatar)+'" alt=""><div><b>'+esc(mine?(auth.profile?.display_name||'Вы'):target.display_name)+'</b><p>'+esc(m.content)+'</p><span>'+new Date(m.created_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span></div></div>';
      }).join('')+'</div>'+
      '<div class="message-compose"><input id="privateMessageInput" maxlength="2000" placeholder="Написать сообщение…"><button id="privateMessageSend">Отправить</button></div>';
    const send=async()=>{
      const input=document.getElementById('privateMessageInput');const text=input?.value.trim();if(!text)return;
      const {error}=await auth.client.from('empire_private_messages').insert({sender_id:auth.user.id,recipient_id:target.id,content:text});
      if(error){alert(error.message||'Не удалось отправить сообщение.');return;}
      input.value='';await renderMessages(target);
    };
    document.getElementById('privateMessageSend').onclick=send;
    document.getElementById('privateMessageInput').onkeydown=e=>{if(e.key==='Enter')send();};
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
  console.warn('Не удалось загрузить профиль EMPIRE:',error);
}
})();