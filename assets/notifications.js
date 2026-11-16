(function(){
'use strict';
(async()=>{
  try{
    if(!window.EMPIRE_AUTH)return;
    await window.EMPIRE_AUTH.init();
    const auth=window.EMPIRE_AUTH, client=auth.client;
    if(!auth.user)return;

    const cabinet=document.getElementById('personalCabinet');
    const profileLink=document.getElementById('cabinetProfileLink');
    if(!cabinet||!profileLink)return;

    const style=document.createElement('style');
    style.textContent=`
      .cw-notification-wrap{position:relative;display:inline-flex;align-items:center;gap:8px;margin-left:8px}
      .cw-notification-button{position:relative;width:46px;height:42px;border:1px solid #9b7744;background:linear-gradient(#382a1b,#211810);color:#e1c27e;cursor:pointer;font-size:20px;line-height:1;border-radius:2px}
      .cw-notification-button:hover{background:linear-gradient(#4a3520,#281c12)}
      .cw-notification-badge{position:absolute;top:-7px;right:-7px;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:999px;background:#a94237;color:#fff;font:700 11px/20px Arial,sans-serif;border:2px solid #17130f;display:none}
      .cw-notification-badge.visible{display:block}
      .cw-notification-panel{position:absolute;z-index:1000;right:0;top:50px;width:min(390px,calc(100vw - 34px));border:1px solid #765a35;background:#17130f;box-shadow:0 14px 35px rgba(0,0,0,.55);display:none;color:#d9c49a}
      .cw-notification-panel.open{display:block}
      .cw-notification-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #4c3925}
      .cw-notification-head strong{color:#e0bd75;font:700 16px Georgia,serif}
      .cw-notification-readall{border:0;background:none;color:#a98a5a;font:12px Georgia,serif;cursor:pointer}
      .cw-notification-list{max-height:390px;overflow:auto}
      .cw-notification-empty{padding:25px 16px;text-align:center;color:#8f8068;font-size:13px}
      .cw-notification-item{display:block;padding:12px 14px;border:0;border-bottom:1px solid #33271b;background:#17130f;color:#d9c49a;text-decoration:none;cursor:pointer;text-align:left;width:100%;box-sizing:border-box}
      .cw-notification-item:hover{background:#211a13}
      .cw-notification-item.unread{background:#211a13;border-left:3px solid #b99559;padding-left:11px}
      .cw-notification-title{display:block;color:#e1c27e;font-weight:700;font-size:13px;margin-bottom:4px}
      .cw-notification-body{display:block;color:#b6a68e;font-size:12px;line-height:1.4}
      .cw-notification-time{display:block;color:#756957;font-size:10px;margin-top:6px}
      @media(max-width:600px){
        .cw-notification-wrap{margin-left:5px}
        .cw-notification-button{width:43px;height:40px}
        .cw-notification-panel{right:-8px;top:48px}
      }
    `;
    document.head.appendChild(style);

    const wrap=document.createElement('div');
    wrap.className='cw-notification-wrap';
    wrap.innerHTML='<button type="button" class="cw-notification-button" id="cwNotificationButton" aria-label="Уведомления" aria-expanded="false">🔔<span class="cw-notification-badge" id="cwNotificationBadge">0</span></button><div class="cw-notification-panel" id="cwNotificationPanel" aria-hidden="true"><div class="cw-notification-head"><strong>Уведомления</strong><button type="button" class="cw-notification-readall" id="cwNotificationReadAll">Прочитать все</button></div><div class="cw-notification-list" id="cwNotificationList"><div class="cw-notification-empty">Загрузка уведомлений…</div></div></div>';
    profileLink.insertAdjacentElement('afterend',wrap);

    const button=document.getElementById('cwNotificationButton');
    const badge=document.getElementById('cwNotificationBadge');
    const panel=document.getElementById('cwNotificationPanel');
    const list=document.getElementById('cwNotificationList');
    let rows=[];

    const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const iconFor=type=>({private_message:'✉',battle:'⚔',profile_rating:'★',regiment_created:'♜',regiment_application:'♙',regiment_member_left:'⚑'}[type]||'•');
    const formatTime=value=>{
      const d=new Date(value),now=new Date(),diff=Math.max(0,now-d);
      if(diff<60000)return 'только что';
      if(diff<3600000)return Math.floor(diff/60000)+' мин. назад';
      if(diff<86400000)return Math.floor(diff/3600000)+' ч. назад';
      return d.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    };

    const render=()=>{
      const unread=rows.filter(x=>!x.read_at).length;
      badge.textContent=unread>99?'99+':String(unread);
      badge.classList.toggle('visible',unread>0);
      if(!rows.length){
        list.innerHTML='<div class="cw-notification-empty">Новых уведомлений нет.</div>';
        return;
      }
      list.innerHTML=rows.map(n=>'<button type="button" class="cw-notification-item '+(!n.read_at?'unread':'')+'" data-id="'+escape(n.id)+'" data-link="'+escape(n.link||'')+'"><span class="cw-notification-title">'+iconFor(n.type)+' &nbsp;'+escape(n.title)+'</span><span class="cw-notification-body">'+escape(n.body)+'</span><span class="cw-notification-time">'+formatTime(n.created_at)+'</span></button>').join('');
    };

    const load=async()=>{
      const {data,error}=await client.from('empire_notifications')
        .select('id,type,title,body,link,created_at,read_at')
        .eq('recipient_id',auth.user.id)
        .order('created_at',{ascending:false})
        .limit(30);
      if(error){
        console.warn('Уведомления Clanwars:',error);
        return;
      }
      rows=data||[];
      render();
    };

    const markRead=async(id)=>{
      const {error}=await client.from('empire_notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('recipient_id',auth.user.id);
      if(error)throw error;
      const row=rows.find(x=>x.id===id);
      if(row)row.read_at=new Date().toISOString();
      render();
    };

    list.addEventListener('click',async e=>{
      const item=e.target.closest('.cw-notification-item');
      if(!item)return;
      const id=item.dataset.id,link=item.dataset.link;
      try{if(rows.find(x=>x.id===id)?.read_at==null)await markRead(id);}catch(error){console.warn(error);}
      if(link)window.location.href=link;
    });

    document.getElementById('cwNotificationReadAll').onclick=async()=>{
      const unread=rows.filter(x=>!x.read_at);
      if(!unread.length)return;
      const {error}=await client.from('empire_notifications').update({read_at:new Date().toISOString()}).eq('recipient_id',auth.user.id).is('read_at',null);
      if(error){alert(error.message||'Не удалось отметить уведомления.');return;}
      rows.forEach(x=>{x.read_at=x.read_at||new Date().toISOString();});
      render();
    };

    button.onclick=async()=>{
      const open=panel.classList.toggle('open');
      button.setAttribute('aria-expanded',String(open));
      panel.setAttribute('aria-hidden',String(!open));
      if(open)await load();
    };

    document.addEventListener('click',e=>{
      if(!wrap.contains(e.target)){
        panel.classList.remove('open');
        button.setAttribute('aria-expanded','false');
        panel.setAttribute('aria-hidden','true');
      }
    });

    await load();
    setInterval(load,30000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  }catch(error){
    console.warn('Не удалось запустить уведомления Clanwars:',error);
  }
})();
})();