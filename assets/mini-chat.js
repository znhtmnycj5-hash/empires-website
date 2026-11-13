(function(){
'use strict';
(async function(){
  const $=id=>document.getElementById(id);
  const general=$('generalMessages'),regiment=$('regimentMessages'),input=$('chatInput'),send=$('sendChat');
  if(!general||!regiment||!input||!send)return;
  let room='general',memberRegiment=null,profile=null,client=null,user=null,busy=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const avatar=p=>p?.avatar_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png';
  const empty=(box,msg)=>{box.innerHTML='<p class="empty-note">'+msg+'</p>';};
  function showTab(name){
    room=name==='regiments-chat'?'regiment':'general';
    document.querySelectorAll('.chat-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
    document.querySelectorAll('.chat-panel').forEach(p=>p.classList.toggle('active',p.id===name));
    $('chatInputWrap').style.display=room==='regiment'&&!memberRegiment?'none':'flex';
    if(room==='regiment'&&!memberRegiment)return;
    input.placeholder=user?'Написать сообщение...':'Войдите, чтобы написать сообщение...';
    input.disabled=!user||(room==='regiment'&&!memberRegiment);
    loadMessages();
  }
  function render(box,rows){
    if(!rows?.length){empty(box,'Сообщений пока нет.');return;}
    box.innerHTML=rows.map(m=>{
      const p=m.empire_profiles||{},mine=user&&m.author_id===user.id;
      const date=new Date(m.created_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      return '<div class="msg" data-message-id="'+m.id+'"><img class="chat-avatar" src="'+esc(avatar(p))+'" alt="" loading="lazy"><div class="mini-chat-message-body"><b>'+esc(p.display_name||'Пользователь')+'</b><p>'+esc(m.content)+'</p></div><div class="time">'+date+'</div>'+(mine?'<button type="button" class="mini-chat-delete" data-delete="'+m.id+'" title="Удалить своё сообщение" aria-label="Удалить сообщение">×</button>':'')+'</div>';
    }).join('');
    box.scrollTop=box.scrollHeight;
  }
  async function loadMessages(){
    const box=room==='regiment'?regiment:general;
    if(room==='regiment'&&!memberRegiment){empty(box,'Вы не состоите в полку.');return;}
    const query=client.from('empire_chat_messages').select('id,author_id,regiment_id,content,created_at,empire_profiles(display_name,avatar_url)')
      .order('created_at',{ascending:true}).limit(100);
    if(room==='regiment')query.eq('regiment_id',memberRegiment);else query.is('regiment_id',null);
    const {data,error}=await query;
    if(error){empty(box,'Не удалось загрузить сообщения.');console.warn('Mini chat:',error);return;}
    render(box,data||[]);
  }
  async function loadOnline(){
    const box=$('miniChatOnlineList'),count=$('miniChatOnlineCount');if(!box||!count)return;
    const cutoff=new Date(Date.now()-5*60*1000).toISOString();
    const {data,error}=await client.from('empire_profiles').select('display_name,avatar_url,last_seen_at').gte('last_seen_at',cutoff).order('last_seen_at',{ascending:false});
    if(error){empty(box,'Не удалось загрузить список.');return;}
    const users=data||[];count.textContent=String(users.length);
    if(!users.length){empty(box,'Сейчас никто не в сети.');return;}
    box.innerHTML=users.map(p=>'<a class="mini-chat-online-user" href="profile.html?user='+encodeURIComponent(p.display_name)+'"><img src="'+esc(avatar(p))+'" alt=""><span>'+esc(p.display_name)+'</span><i></i></a>').join('');
  }
  async function sendMessage(){
    const content=input.value.trim();if(!content||busy||!user)return;
    if(room==='regiment'&&!memberRegiment)return;
    busy=true;send.disabled=true;
    const {error}=await client.from('empire_chat_messages').insert({author_id:user.id,regiment_id:room==='regiment'?memberRegiment:null,content});
    busy=false;send.disabled=false;
    if(error){alert(error.message||'Не удалось отправить сообщение.');return;}
    input.value='';await loadMessages();
  }
  document.querySelectorAll('.chat-tab').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tab)));
  send.addEventListener('click',sendMessage);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendMessage();}});
  document.addEventListener('click',async e=>{
    const btn=e.target.closest('[data-delete]');if(!btn)return;
    const id=btn.dataset.delete;
    if(!confirm('Удалить своё сообщение?'))return;
    btn.disabled=true;
    const {error}=await client.from('empire_chat_messages').delete().eq('id',id).eq('author_id',user.id);
    if(error){alert(error.message||'Не удалось удалить сообщение.');btn.disabled=false;return;}
    await loadMessages();
  });
  try{
    await window.EMPIRE_AUTH.init();
    const auth=window.EMPIRE_AUTH;client=auth.client;user=auth.user;profile=auth.profile;
    if(user){
      const {data}=await client.from('empire_regiment_members').select('regiment_id').eq('user_id',user.id).is('left_at',null).maybeSingle();
      memberRegiment=data?.regiment_id||null;
      await auth.touchPresence();
    }
    if(memberRegiment){
      const {data:reg}=await client.from('empire_regiments').select('name').eq('id',memberRegiment).maybeSingle();
      $('regimentChatStatus').innerHTML='<span class="chat-access-ok">● Полковой чат: '+esc(reg?.name||'ваш полк')+'</span>';
      $('regimentChatLocked').style.display='none';
    }else{
      $('regimentChatStatus').innerHTML='<span class="chat-access-locked">● Доступ закрыт</span>';
      $('regimentChatLocked').style.display='block';
      regiment.style.display='none';
    }
    input.disabled=!user;
    if(!user)input.placeholder='Войдите, чтобы написать сообщение...';
    await Promise.all([loadMessages(),loadOnline()]);
    setInterval(()=>{loadMessages();loadOnline();if(user)auth.touchPresence();},15000);
    document.addEventListener('empire:auth-changed',async e=>{
      user=e.detail?.user||null;profile=e.detail?.profile||null;
      if(user)await auth.touchPresence();
      showTab(room==='regiment'?'regiments-chat':'general');
    });
  }catch(error){console.warn('Mini chat init:',error);empty(general,'Чат временно недоступен.');}
})();
})();
