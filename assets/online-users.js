(function(){
  'use strict';

  const strip=document.getElementById("onlineUsersStrip");
  const count=document.getElementById("onlineUsersCount");
  if(!strip||!count)return;

  const ONLINE_WINDOW_MS=5*60*1000;

  function fallback(){
    count.textContent='0';
    strip.innerHTML='<div style="grid-column:1/-1;text-align:center;color:#8f8068;font-size:11px;padding:16px 6px">Сейчас никто не в сети.</div>';
  }

  function render(users){
    const unique=[];
    const seen=new Set();
    for(const user of users||[]){
      const name=String(user.display_name||'').trim();
      if(!name||seen.has(name.toLowerCase()))continue;
      seen.add(name.toLowerCase());
      unique.push(user);
    }

    count.textContent=String(unique.length);

    if(!unique.length){
      fallback();
      return;
    }

    strip.innerHTML=unique.map(user=>{
      const name=String(user.display_name||'').trim();
      const ownAvatar=user.avatar_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png';
      const avatar=typeof window.empireUserAvatar==='function'
        ? window.empireUserAvatar(name,ownAvatar)
        : ownAvatar;

      return '<a class="online-user" href="profile.html?user='+encodeURIComponent(name)+'" title="'+name+'" aria-label="'+name+'">'+
        '<img class="online-user-avatar" src="'+avatar+'" alt="'+name+'" loading="lazy" decoding="async">'+
        '<span class="online-user-dot" aria-label="В сети"></span>'+
      '</a>';
    }).join('');
  }

  async function loadRealOnlineUsers(){
    try{
      if(!window.EMPIRE_AUTH||typeof window.EMPIRE_AUTH.init!=='function')return;
      await window.EMPIRE_AUTH.init();

      const client=window.EMPIRE_AUTH.client;
      if(!client)return;

      const cutoff=new Date(Date.now()-ONLINE_WINDOW_MS).toISOString();

      const {data,error}=await client
        .from('empire_profiles')
        .select('id,display_name,avatar_url,last_seen_at')
        .gte('last_seen_at',cutoff)
        .order('last_seen_at',{ascending:false});

      if(error)throw error;
      render(data||[]);
    }catch(error){
      console.warn('Онлайн-пользователи:',error);
      fallback();
    }
  }

  document.addEventListener('empire:auth-changed',loadRealOnlineUsers);

  loadRealOnlineUsers();
  setInterval(loadRealOnlineUsers,30000);
})();