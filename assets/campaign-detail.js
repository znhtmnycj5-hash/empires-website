(() => {
  const KEY='empire_campaigns_v1';
  const COMMENTS='empire_campaign_comments_v1';
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v}catch(e){return f}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>new Date(v).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const status=c=>{const t=new Date(c.startAt).getTime(),n=Date.now();if(c.status==='completed')return 'completed';if(n<t)return 'upcoming';if(n<t+3600000)return 'ongoing';return 'awaiting'};
  const labels={upcoming:'ПРЕДСТОИТ',ongoing:'ИДЁТ БОЙ',awaiting:'ЖДЁТ ПОДТВЕРЖДЕНИЯ',completed:'ЗАВЕРШЕНА'};
  const fallback=[
    {id:'campaign-test-01',title:'Битва за Ватерлоо',server:'EMPIRE_WATERLOO_01',password:'WATERLOO1815',startAt:'2026-11-12T20:00:00',factions:['Французская армия','Британская армия'],organizer:'Kalashnikov',preview:'assets/IMG_2745.png',cover:'assets/IMG_2745.png',applications:[]},
    {id:'campaign-test-02',title:'Кампания на Рейне',server:'EMPIRE_RHEIN_02',password:'RHEIN1813',startAt:'2026-11-18T19:30:00',factions:['Французская армия','Прусская армия'],organizer:'Ankord',preview:'assets/IMG_2745.png',cover:'assets/IMG_2745.png',applications:[]},
    {id:'campaign-test-03',title:'Освобождение Испании',server:'EMPIRE_SPAIN_03',password:'SPAIN1812',startAt:'2026-11-22T20:00:00',factions:['Французская армия','Испанская армия','Британская армия'],organizer:'Kalashnikov',preview:'assets/IMG_2745.png',cover:'assets/IMG_2745.png',applications:[]}
  ];
  const box=document.getElementById('campaignDetail');
  if(!box)return;
  const id=new URLSearchParams(location.search).get('id');
  let all=read(KEY,[]);
  if(!Array.isArray(all))all=[];
  let c=all.find(x=>x.id===id);
  if(!c)c=fallback.find(x=>x.id===id);
  if(!c){box.innerHTML='<section class="card"><h1>Кампания не найдена</h1><a class="btn" href="campaigns.html">Вернуться к кампаниям</a></section>';return;}
  const s=status(c), accepted=(c.applications||[]).filter(a=>a.status==='accepted');
  const preview=esc(c.preview||c.cover||'assets/IMG_2745.png');
  const secure=true;
  box.innerHTML=
    '<section class="campaign-hero card has-cover" style="background-image:url(&quot;'+preview+'&quot;)">'+
      '<div class="campaign-status '+s+'">'+labels[s]+'</div>'+
      '<div class="page-kicker">ВОЕННАЯ КАМПАНИЯ</div>'+
      '<h1>'+esc(c.title)+'</h1>'+
      '<p class="campaign-organizer">Организатор: <strong>'+esc(c.organizer||'—')+'</strong></p>'+
      '<div class="campaign-countdown" id="campaignSafeCountdown"></div>'+
    '</section>'+
    '<section class="campaign-preview card"><img src="'+preview+'" alt="Превью кампании"></section>'+
    '<section class="campaign-info-grid">'+
      '<div class="card campaign-info-card"><div class="campaign-card-label">ВРЕМЯ ПРОВЕДЕНИЯ</div><strong class="campaign-start-date">'+date(c.startAt)+'</strong><span>Продолжительность — ровно 1 час</span></div>'+
      '<div class="card campaign-info-card"><div class="campaign-card-label">СЕРВЕР</div><strong>'+esc(c.server||'—')+'</strong><span>Пароль: <b>'+esc(c.password||'—')+'</b></span></div>'+
      '<div class="card campaign-info-card"><div class="campaign-card-label">ФРАКЦИИ</div><strong>'+esc((c.factions||[]).join(' · '))+'</strong><span>Фракция назначается организатором полку</span></div>'+
    '</section>'+
    '<section class="card campaign-participants"><div class="campaign-section-title"><div><div class="page-kicker">УЧАСТНИКИ</div><h2>Полки кампании</h2></div><span>'+accepted.length+'</span></div>'+
      '<div class="campaign-participant-list">'+(accepted.length?accepted.map(a=>'<div class="campaign-participant"><img src="'+esc(a.logo||'assets/empire_logo_top_right.png')+'" alt=""><div><strong>'+esc(a.regiment)+'</strong><small>'+esc(a.people||0)+' человек · '+esc(a.faction||'Фракция не назначена')+' · '+esc(a.troopType||'Род войск не назначен')+'</small></div><span class="campaign-attendance '+(a.attended?'present':'pending')+'">'+(a.attended?'ЯВИЛСЯ · +50':'ОЖИДАЕТ')+'</span></div>').join(''):'<div class="campaign-empty">Пока нет принятых заявок.</div>')+'</div>'+
    '</section>'+
    '<section class="card campaign-comments"><div class="card-title">💬 &nbsp; Комментарии <span id="campaignSafeCommentCount">0</span></div><div id="campaignSafeComments" class="battle-comments"></div></section>';
  const countdown=document.getElementById('campaignSafeCountdown');
  const tick=()=>{const st=status(c),end=new Date(new Date(c.startAt).getTime()+3600000);if(st==='upcoming'){const d=Math.max(0,new Date(c.startAt).getTime()-Date.now());const h=Math.floor(d/3600000),m=Math.floor(d%3600000/60000),sec=Math.floor(d%60000/1000);countdown.textContent='До начала: '+h+'ч '+String(m).padStart(2,'0')+'м '+String(sec).padStart(2,'0')+'с'}else if(st==='ongoing'){const d=Math.max(0,end-Date.now());countdown.textContent='Сражение идёт · до окончания: '+Math.floor(d/60000)+'м '+String(Math.floor(d%60000/1000)).padStart(2,'0')+'с'}else if(st==='awaiting')countdown.textContent='Сражение завершено. Организатор вносит результаты.';else countdown.textContent='Кампания завершена';};
  tick();setInterval(tick,1000);
  const comments=read(COMMENTS,[]).filter(x=>x.campaignId===c.id);
  const cb=document.getElementById('campaignSafeComments');
  const names={Kalashnikov:'1st Regiment',Ankord:'1st Regiment',Veli4estvo:'84e Régiment',Marquis:'95th Rifles',Fusilier:'Preobrazhensky',Grenadier87:'7th Hussars'};
  const commentHtml=x=>'<article class="battle-thread-item"><div class="battle-comment"><div class="battle-comment-author"><div class="battle-comment-avatar-link"><img class="battle-comment-avatar" src="'+esc(x.avatar||'assets/empire_logo_top_right.png')+'" alt=""></div><div class="battle-comment-identity"><div class="battle-comment-head"><strong>'+esc(x.author||'Пользователь')+'</strong></div><div class="battle-comment-regiment">'+esc(x.regiment||names[x.author]||'Без полка')+'</div><span class="battle-comment-time">'+esc(x.time||date(x.createdAt))+'</span></div></div><div class="battle-comment-content"><div class="battle-comment-text">'+esc(x.text||'')+'</div></div></div></article>';
  cb.innerHTML=comments.length?comments.map(commentHtml).join(''):'<div class="battle-comments-empty">Комментариев пока нет.</div>';
  const cc=document.getElementById('campaignSafeCommentCount');if(cc)cc.textContent=comments.length;
})();