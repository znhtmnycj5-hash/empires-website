(() => {
  const KEY='empire_campaigns_v1';
  const COMMENTS='empire_campaign_comments_v1';
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v}catch(e){return f}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>{const d=new Date(v);return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear()};
  const status=c=>{const t=new Date(c.startAt).getTime(),n=Date.now();if(c.status==='completed')return 'completed';if(n<t)return 'upcoming';if(n<t+3600000)return 'ongoing';return 'awaiting'};
  const labels={upcoming:'ПРЕДСТОИТ',ongoing:'ИДЁТ БОЙ',awaiting:'ЖДЁТ ПОДТВЕРЖДЕНИЯ',completed:'ЗАВЕРШЕНА'};
  const fallback=[
    {id:'campaign-test-01',title:'Битва за Ватерлоо',server:'EMPIRE_WATERLOO_01',password:'WATERLOO1815',startAt:'2026-11-12T20:00:00',factions:['Французская армия','Британская армия'],organizer:'Kalashnikov',preview:'assets/IMG_2745.png',cover:'assets/IMG_2745.png',applications:[
{id:'w1',regiment:'1st Regiment',people:32,faction:'Французская армия',troopType:'Пехота',attended:false,status:'accepted'},
{id:'w2',regiment:'84e Régiment',people:28,faction:'Французская армия',troopType:'Пехота',attended:false,status:'accepted'},
{id:'w3',regiment:'95th Rifles',people:24,faction:'Британская армия',troopType:'Стрелки',attended:false,status:'accepted'},
{id:'w4',regiment:'7th Hussars',people:18,faction:'Британская армия',troopType:'Кавалерия',attended:false,status:'accepted'}],comments:[
{id:'wc1',author:'Ankord',regiment:'1st Regiment',text:'Готовимся к сражению. Полный состав будет на сервере.',createdAt:'2026-11-08T18:20:00'},
{id:'wc2',author:'Marquis',regiment:'95th Rifles',text:'95th Rifles подтверждает участие. До встречи на поле боя!',createdAt:'2026-11-08T18:28:00'},
{id:'wc3',author:'Grenadier87',regiment:'7th Hussars',text:'Кавалерия готова. Просьба не забыть пароль сервера.',createdAt:'2026-11-08T18:35:00'},
{id:'wc4',author:'Veli4estvo',regiment:'84e Régiment',text:'Заявку подали, ждём распределения по фракциям.',createdAt:'2026-11-08T18:41:00'},
{id:'wc5',author:'Kalashnikov',regiment:'1st Regiment',text:'Организатор: сбор за 15 минут до начала кампании.',createdAt:'2026-11-08T18:50:00'}]},
    {id:'campaign-test-02',title:'Кампания на Рейне',server:'EMPIRE_RHEIN_02',password:'RHEIN1813',startAt:'2026-11-18T19:30:00',factions:['Французская армия','Прусская армия'],organizer:'Ankord',preview:'assets/IMG_2745.png',cover:'assets/IMG_2745.png',applications:[
{id:'r1',regiment:'1st Regiment',people:30,faction:'Французская армия',troopType:'Пехота',attended:false,status:'accepted'},
{id:'r2',regiment:'84e Régiment',people:26,faction:'Французская армия',troopType:'Пехота',attended:false,status:'accepted'},
{id:'r3',regiment:'Preobrazhensky',people:22,faction:'Прусская армия',troopType:'Пехота',attended:false,status:'accepted'},
{id:'r4',regiment:'7th Hussars',people:16,faction:'Прусская армия',troopType:'Кавалерия',attended:false,status:'accepted'}],comments:[
{id:'rc1',author:'Ankord',regiment:'1st Regiment',text:'Кампания на Рейне открыта для заявок. Ждём полки союзников.',createdAt:'2026-11-08T18:25:00'},
{id:'rc2',author:'Fusilier',regiment:'Preobrazhensky',text:'Наш полк готов принять участие в кампании.',createdAt:'2026-11-08T18:33:00'},
{id:'rc3',author:'Grenadier87',regiment:'7th Hussars',text:'Будем держать кавалерийский фланг.',createdAt:'2026-11-08T18:39:00'},
{id:'rc4',author:'Veli4estvo',regiment:'84e Régiment',text:'Состав предварительно подтверждён командованием.',createdAt:'2026-11-08T18:46:00'},
{id:'rc5',author:'Kalashnikov',regiment:'1st Regiment',text:'Время сбора уточним перед началом боя.',createdAt:'2026-11-08T18:54:00'}]},
    {id:'campaign-test-03',title:'Освобождение Испании',server:'EMPIRE_SPAIN_03',password:'SPAIN1812',startAt:'2026-11-22T20:00:00',factions:['Французская армия','Британская армия'],organizer:'Kalashnikov',preview:'assets/IMG_2745.png',cover:'assets/IMG_2745.png',applications:[
{id:'s1',regiment:'1st Regiment',people:34,faction:'Французская армия',troopType:'Пехота',attended:false,status:'accepted'},
{id:'s2',regiment:'84e Régiment',people:25,faction:'Французская армия',troopType:'Пехота',attended:false,status:'accepted'},
{id:'s3',regiment:'95th Rifles',people:21,faction:'Британская армия',troopType:'Стрелки',attended:false,status:'accepted'},
{id:'s4',regiment:'7th Hussars',people:17,faction:'Британская армия',troopType:'Кавалерия',attended:false,status:'accepted'},
{id:'s5',regiment:'Preobrazhensky',people:23,faction:'Британская армия',troopType:'Пехота',attended:false,status:'accepted'}],comments:[
{id:'sc1',author:'Kalashnikov',regiment:'1st Regiment',text:'Подготовка к испанской кампании началась. Проверяем составы.',createdAt:'2026-11-08T18:22:00'},
{id:'sc2',author:'Marquis',regiment:'95th Rifles',text:'Британская сторона готова. В этот раз без опозданий.',createdAt:'2026-11-08T18:31:00'},
{id:'sc3',author:'Fusilier',regiment:'Preobrazhensky',text:'Наш отряд присоединится к кампании.',createdAt:'2026-11-08T18:38:00'},
{id:'sc4',author:'Grenadier87',regiment:'7th Hussars',text:'Кавалерия ждёт приказов организатора.',createdAt:'2026-11-08T18:44:00'},
{id:'sc5',author:'Ankord',regiment:'1st Regiment',text:'Предлагаю всем командирам заранее сверить состав.',createdAt:'2026-11-08T18:52:00'}]}
  ];
  const box=document.getElementById('campaignDetail');
  if(!box)return;
  const id=new URLSearchParams(location.search).get('id');
  let all=read(KEY,[]);
  if(!Array.isArray(all))all=[];
  let c=all.find(x=>x.id===id);
  if(!c)c=fallback.find(x=>x.id===id);
  if(c){
    const seeded=fallback.find(x=>x.id===c.id);
    if(seeded){
      if(!Array.isArray(c.applications)||!c.applications.length)c.applications=seeded.applications||[];
      if(!Array.isArray(c.comments)||!c.comments.length)c.comments=seeded.comments||[];
      if(!c.preview)c.preview=seeded.preview;
    }
  }
  if(!c){box.innerHTML='<section class="card"><h1>Кампания не найдена</h1><a class="btn" href="campaigns.html">Вернуться к кампаниям</a></section>';return;}
  const s=status(c), accepted=(c.applications||[]).filter(a=>a.status==='accepted');
  const preview=esc(c.preview||c.cover||'assets/IMG_2745.png');
  const regimentAvatars={'1st Regiment':'assets/1st.jpg','84e Régiment':'assets/84e.png','95th Rifles':'assets/95.webp','7th Hussars':'assets/hussars.png','Preobrazhensky':'assets/preobraz.webp',"King's German Legion":'assets/kgr.png','13e Léger':'assets/1st.jpg','33e Ligne':'assets/95.webp','92nd Gordon Highlanders':'assets/84e.png','Semenovsky':'assets/preobraz.webp','6e Hussards':'assets/1st.jpg','Royal Scots':'assets/95.webp'};
  const secure=true;
  box.innerHTML=
    '<section class="campaign-hero card has-cover" style="background-image:url(\''+preview+'\')">'+
      '<div class="campaign-status '+s+'">'+labels[s]+'</div>'+
      '<div class="page-kicker">ВОЕННАЯ КАМПАНИЯ</div>'+
      '<h1>'+esc(c.title)+'</h1>'+
      '<p class="campaign-organizer">Организатор: <strong>'+esc(c.organizer||'—')+'</strong></p>'+
      '<div class="campaign-countdown" id="campaignSafeCountdown"></div>'+
    '</section>'+
    '<section class="campaign-info-grid">'+
      '<div class="card campaign-info-card"><div class="campaign-card-label">ВРЕМЯ ПРОВЕДЕНИЯ</div><strong class="campaign-start-date">'+date(c.startAt)+'</strong><span>Продолжительность — ровно 1 час</span></div>'+
      '<div class="card campaign-info-card"><div class="campaign-card-label">СЕРВЕР</div><strong>'+esc(c.server||'—')+'</strong><span>Пароль: <b>'+esc(c.password||'—')+'</b></span></div>'+
      '<div class="card campaign-info-card"><div class="campaign-card-label">ФРАКЦИИ</div><strong>'+esc((c.factions||[]).join(' · '))+'</strong><span>Фракция назначается организатором полку</span></div>'+
    '</section>'+
    '<section class="card campaign-participants"><div class="campaign-section-title"><div><div class="page-kicker">УЧАСТНИКИ</div><h2>Полки кампании</h2></div><span>'+accepted.length+'</span></div>'+
      '<div class="campaign-faction-columns">'+
        '<div class="campaign-faction-side"><div class="campaign-faction-title">'+esc((c.factions||[])[0]||'Первая фракция')+'</div><div class="campaign-participant-list">'+
          accepted.filter(a=>a.faction===(c.factions||[])[0]).map(a=>'<div class="campaign-participant"><img loading="lazy" decoding="async" src="'+esc(a.logo||regimentAvatars[a.regiment]||'assets/empire_logo_top_right.png')+'" alt="Эмблема '+esc(a.regiment)+'"><div><strong>'+esc(a.regiment)+'</strong><small>'+esc(a.people||0)+' человек · '+esc(a.troopType||'Род войск не назначен')+'</small></div><span class="campaign-attendance '+(a.attended?'present':'pending')+'">'+(a.attended?'ЯВИЛСЯ · +50':'ОЖИДАЕТ')+'</span></div>').join('')+'</div></div>'+
        '<div class="campaign-faction-side"><div class="campaign-faction-title">'+esc((c.factions||[])[1]||'Вторая фракция')+'</div><div class="campaign-participant-list">'+
          accepted.filter(a=>a.faction===(c.factions||[])[1]).map(a=>'<div class="campaign-participant"><img loading="lazy" decoding="async" src="'+esc(a.logo||regimentAvatars[a.regiment]||'assets/empire_logo_top_right.png')+'" alt=""><div><strong>'+esc(a.regiment)+'</strong><small>'+esc(a.people||0)+' человек · '+esc(a.troopType||'Род войск не назначен')+'</small></div><span class="campaign-attendance '+(a.attended?'present':'pending')+'">'+(a.attended?'ЯВИЛСЯ · +50':'ОЖИДАЕТ')+'</span></div>').join('')+'</div></div>'+
      '</div></section>'+
    '<section class="card campaign-comments"><div class="card-title">💬 &nbsp; Комментарии <span class="battle-comment-count" id="campaignSafeCommentCount">0</span></div><div id="campaignSafeComments" class="battle-comments"></div><form id="campaignCommentForm" class="battle-comment-form"><div class="battle-comment-editor" id="campaignCommentEditorWrap"><div class="battle-comment-toolbar" role="toolbar" aria-label="Форматирование комментария"><button type="button" data-editor-command="bold" title="Жирный"><strong>B</strong></button><button type="button" data-editor-command="italic" title="Курсив"><em>I</em></button><button type="button" data-editor-command="underline" title="Подчёркивание"><u>U</u></button><button type="button" data-editor-command="quote" title="Цитата">❝</button><button type="button" data-editor-command="spoiler" title="Спойлер">S</button><button type="button" data-editor-command="image" title="Вставить картинку">▧</button><button type="button" data-editor-command="video" title="Вставить видео">▶</button></div><div id="campaignCommentInput" class="battle-comment-input" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Написать комментарий…"></div></div><button type="submit">Отправить</button></form></section>';
  box.dataset.safeRendered='true';
  const countdown=document.getElementById('campaignSafeCountdown');
  const tick=()=>{const st=status(c),end=new Date(new Date(c.startAt).getTime()+3600000);if(st==='upcoming'){const d=Math.max(0,new Date(c.startAt).getTime()-Date.now());const h=Math.floor(d/3600000),m=Math.floor(d%3600000/60000),sec=Math.floor(d%60000/1000);countdown.textContent='До начала: '+h+'ч '+String(m).padStart(2,'0')+'м '+String(sec).padStart(2,'0')+'с'}else if(st==='ongoing'){const d=Math.max(0,end-Date.now());countdown.textContent='Сражение идёт · до окончания: '+Math.floor(d/60000)+'м '+String(Math.floor(d%60000/1000)).padStart(2,'0')+'с'}else if(st==='awaiting')countdown.textContent='Сражение завершено. Организатор вносит результаты.';else countdown.textContent='Кампания завершена';};
  tick();setInterval(tick,1000);
  const seededComments=Array.isArray(c.comments)?c.comments:[];
  const storedComments=read(COMMENTS,[]).filter(x=>x.campaignId===c.id);
  const getComments=()=>{const stored=read(COMMENTS,[]).filter(x=>x.campaignId===c.id);return stored.length?stored:seededComments};
  const cb=document.getElementById('campaignSafeComments');
  const currentUser={name:'Kalashnikov',regiment:'1st Regiment'};
  const presenceKey='empire_profile_presence_v1';
  const getPresence=()=>{try{return JSON.parse(localStorage.getItem(presenceKey)||'{}')||{}}catch(e){return {}}};
  const setOnline=name=>{if(!name)return;const m=getPresence();m[name]=Date.now();try{localStorage.setItem(presenceKey,JSON.stringify(m))}catch(e){}};
  const isOnline=name=>{const t=getPresence()[name];return typeof t==='number'&&Date.now()-t<5*60*1000};
  setOnline(currentUser.name);
  setInterval(()=>setOnline(currentUser.name),30000);
  const names={Kalashnikov:'1st Regiment',Ankord:'1st Regiment',Veli4estvo:'1st Regiment',Marquis:'95th Rifles',Fusilier:'Без полка',Grenadier87:'1st Regiment',Mel:'1st Regiment',Kazak:'1st Regiment',MeGusta:'1st Regiment',Flashkodr:'1st Regiment',MrDixon:'1st Regiment',Theodor:'1st Regiment'};
  const escapeHtml=v=>String(v??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const sanitizeHtml=html=>{
    const doc=new DOMParser().parseFromString(String(html||''),'text/html');
    const allowed=new Set(['B','STRONG','I','EM','U','BLOCKQUOTE','BR','SPAN','IMG','VIDEO']);
    const cleanUrl=value=>{try{const u=new URL(String(value||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch(e){return ''}};
    const walk=node=>[...node.childNodes].forEach(ch=>{
      if(ch.nodeType===Node.TEXT_NODE)return;
      if(ch.nodeType!==Node.ELEMENT_NODE||!allowed.has(ch.tagName)){const p=ch.parentNode;if(p){while(ch.firstChild)p.insertBefore(ch.firstChild,ch);p.removeChild(ch)}return}
      [...ch.attributes].forEach(a=>ch.removeAttribute(a.name));
      if(ch.tagName==='IMG'){const src=cleanUrl(ch.getAttribute('src'));if(!src){ch.remove();return}ch.setAttribute('src',src);ch.setAttribute('alt','Вставленная картинка');ch.setAttribute('loading','lazy');ch.setAttribute('decoding','async')}
      if(ch.tagName==='VIDEO'){const src=cleanUrl(ch.getAttribute('src'));if(!src){ch.remove();return}ch.setAttribute('src',src);ch.setAttribute('controls','');ch.setAttribute('preload','metadata')}
      if(ch.tagName==='SPAN'&&ch.dataset.spoiler!=='true'){ch.replaceWith(...ch.childNodes);return}
      walk(ch);
    });
    walk(doc.body);return doc.body.innerHTML;
  };
  const renderText=x=>x.html?sanitizeHtml(x.html):escapeHtml(x.text||'').replace(/\\n/g,'<br>');
  const likeKey='empire-comment-likes-v1';
  const getLikeMap=()=>{try{return JSON.parse(localStorage.getItem(likeKey)||'{}')||{}}catch(e){return {}}};
  const likesFor=id=>Array.isArray(getLikeMap()['campaign:'+c.id+':'+id])?getLikeMap()['campaign:'+c.id+':'+id]:[];
  const toggleLike=id=>{const m=getLikeMap(),key='campaign:'+c.id+':'+id,a=Array.isArray(m[key])?m[key]:[],i=a.indexOf(currentUser.name);if(i>=0)a.splice(i,1);else a.push(currentUser.name);m[key]=a;localStorage.setItem(likeKey,JSON.stringify(m))};
  const commentCard=(x,all,depth=0)=>{
    const name=String(x.author||x.name||'Пользователь'),regiment=String(x.regiment||names[name]||'Без полка'),avatar=(x.avatar&&String(x.avatar).trim())||((window.EMPIRE_USER_AVATARS&&window.EMPIRE_USER_AVATARS[name])||'')||empireUserAvatar(name,'',window.EMPIRE_USER_FACTIONS&&window.EMPIRE_USER_FACTIONS[name]),children=all.filter(y=>y.parentId===x.id),likes=likesFor(x.id),online=isOnline(name);
    const likePreview=likes.slice(0,2).map(escapeHtml).join(', ');
    const likeControls='<div class="comment-reactions"><button class="comment-like-button'+(likes.includes(currentUser.name)?' is-liked':'')+'" type="button" data-like-comment="'+escapeHtml(x.id)+'" aria-pressed="'+likes.includes(currentUser.name)+'">♥ <span>Нравится</span> <b>'+likes.length+'</b></button>'+(likes.length?'<div class="comment-like-popover"><span class="comment-like-preview">'+likePreview+(likes.length>2?' и ещё':'')+'</span><button type="button" class="comment-like-all" data-show-likes="'+escapeHtml(x.id)+'">Посмотреть всех</button><div class="comment-like-full" hidden>'+likes.map(n=>'<a href="'+empireProfileUrl(n)+'">'+escapeHtml(n)+'</a>').join('')+'</div></div>':'')+'</div>';
    const report='<button class="comment-report-button" type="button" data-report-comment="'+escapeHtml(x.id)+'">⚑ Пожаловаться</button>';
    const del=name===currentUser.name?'<button class="comment-delete-button" type="button" data-delete-comment="'+escapeHtml(x.id)+'">Удалить</button>':'';
    const reply='<a href="#" class="battle-reply-link" data-reply-to="'+escapeHtml(x.id)+'">Ответить</a><form class="battle-reply-form" data-parent-id="'+escapeHtml(x.id)+'" hidden><input type="text" maxlength="500" placeholder="Ответить '+escapeHtml(name)+'…" required><button type="submit">Ответить</button></form>';
    const status='<div class="battle-comment-status '+(online?'is-online':'is-offline')+'"><i></i><span>'+(online?'В сети':'Не в сети')+'</span></div>';
    const media=x.image?'<a class="battle-comment-image-link" href="'+escapeHtml(x.image)+'" target="_blank" rel="noopener"><img class="battle-comment-image" src="'+escapeHtml(x.image)+'" alt="Вставленная картинка" loading="lazy"></a>':'';
    return '<article class="battle-thread-item'+(depth?' is-reply':'')+'" data-comment-id="'+escapeHtml(x.id)+'"><div class="battle-comment"><div class="battle-comment-author"><a class="battle-comment-avatar-link" href="'+empireProfileUrl(name)+'"><img class="battle-comment-avatar" src="'+escapeHtml(avatar)+'" alt="'+escapeHtml(name)+'" loading="lazy"></a><div class="battle-comment-identity"><div class="battle-comment-head"><a href="'+empireProfileUrl(name)+'"><strong>'+escapeHtml(name)+'</strong></a></div><div class="battle-comment-regiment">'+escapeHtml(regiment)+'</div>'+status+'<span class="battle-comment-time">'+escapeHtml(x.time||date(x.createdAt))+'</span></div></div><div class="battle-comment-content"><div class="battle-comment-text">'+renderText(x)+'</div>'+media+likeControls+report+del+reply+'</div></div>'+(children.length?'<div class="battle-thread-replies">'+children.map(y=>commentCard(y,all,depth+1)).join('')+'</div>':'')+'</article>';
  };
  const renderComments=()=>{
    const all=getComments().concat([]);
    const roots=all.filter(x=>!x.parentId||!all.some(p=>p.id===x.parentId));
    cb.innerHTML=roots.length?roots.map(x=>commentCard(x,all)).join(''):'<div class="battle-comments-empty">Комментариев пока нет.</div>';
    const cc=document.getElementById('campaignSafeCommentCount');if(cc)cc.textContent=all.length;
  };
  const saveComment=x=>{let arr=read(COMMENTS,[]);if(!Array.isArray(arr))arr=[];arr.push({...x,campaignId:c.id});localStorage.setItem(COMMENTS,JSON.stringify(arr));renderComments();if(window.EMPIRE_COMMENTS)window.EMPIRE_COMMENTS.create('campaign',c.id,{text:x.text,html:x.html,image:x.image,parentId:x.parentId}).then(remote=>{Object.assign(x,remote);localStorage.setItem(COMMENTS,JSON.stringify(arr));renderComments()}).catch(err=>alert(err.message||'Не удалось сохранить комментарий в общей базе.'))};
  cb.addEventListener('click',e=>{
    const reply=e.target.closest('[data-reply-to]');if(reply){e.preventDefault();const card=reply.closest('.battle-thread-item');const form=card?.querySelector(':scope > .battle-comment .battle-reply-form');if(form){form.hidden=!form.hidden;form.style.display=form.hidden?'none':'flex';if(!form.hidden)form.querySelector('input').focus()}return}
    const like=e.target.closest('[data-like-comment]');if(like){toggleLike(like.dataset.likeComment);renderComments();return}
    const show=e.target.closest('[data-show-likes]');if(show){const p=show.parentElement.querySelector('.comment-like-full');if(p)p.hidden=!p.hidden;return}
    const del=e.target.closest('[data-delete-comment]');if(del){const arr=read(COMMENTS,[]),target=arr.find(x=>String(x.id)===String(del.dataset.deleteComment)&&x.campaignId===c.id);if(!target||target.author!==currentUser.name)return;if(confirm('Удалить этот комментарий?')){localStorage.setItem(COMMENTS,JSON.stringify(arr.filter(x=>x!==target)));renderComments()}return}
    const report=e.target.closest('[data-report-comment]');if(report){let arr=read('empire_comment_reports_v1',[]);if(!Array.isArray(arr))arr=[];if(!arr.some(x=>x.campaignId===c.id&&x.commentId===report.dataset.reportComment&&x.reporter===currentUser.name&&x.status==='pending')){arr.push({id:'campaign-report-'+Date.now(),status:'pending',reporter:currentUser.name,campaignId:c.id,commentId:report.dataset.reportComment,reason:'Жалоба пользователя',createdAt:new Date().toISOString()});localStorage.setItem('empire_comment_reports_v1',JSON.stringify(arr));alert('Жалоба отправлена модераторам.')}else alert('Вы уже пожаловались на этот комментарий.');return}
  });
  cb.addEventListener('submit',e=>{const form=e.target.closest('.battle-reply-form');if(!form)return;e.preventDefault();const input=form.querySelector('input'),text=input.value.trim();if(!text)return;saveComment({id:'campaign-comment-'+Date.now(),parentId:form.dataset.parentId,author:currentUser.name,regiment:currentUser.regiment,avatar:empireUserAvatar(currentUser.name),text,time:new Date().toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})});});
  const editor=document.getElementById('campaignCommentInput');
  const restore=()=>{editor.focus();const sel=window.getSelection();if(sel&&sel.rangeCount)return;const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);sel.removeAllRanges();sel.addRange(r)};
  const insert=html=>{restore();document.execCommand('insertHTML',false,html);editor.focus()};
  document.querySelector('#campaignCommentForm .battle-comment-toolbar').addEventListener('mousedown',e=>{if(e.target.closest('[data-editor-command]'))e.preventDefault()});
  document.querySelector('#campaignCommentForm .battle-comment-toolbar').addEventListener('click',e=>{
    const b=e.target.closest('[data-editor-command]');if(!b)return;restore();const cmd=b.dataset.editorCommand;
    if(['bold','italic','underline'].includes(cmd))document.execCommand(cmd,false,null);
    else if(cmd==='quote')document.execCommand('formatBlock',false,'blockquote');
    else if(cmd==='spoiler'){const sel=window.getSelection(),t=sel&&sel.toString();insert('<span data-spoiler="true">'+escapeHtml(t||'Спойлер')+'</span>')}
    else if(cmd==='image'){const u=prompt('Вставьте прямую ссылку на картинку:');if(u&&/^https?:\/\//i.test(u.trim()))insert('<img loading="lazy" decoding="async" src="'+escapeHtml(u.trim())+'" alt="Вставленная картинка">')}
    else if(cmd==='video'){const u=prompt('Вставьте прямую ссылку на видео:');if(u&&/^https?:\/\//i.test(u.trim()))insert('<video src="'+escapeHtml(u.trim())+'" controls preload="metadata"></video>')}
  });
  document.getElementById('campaignCommentForm').addEventListener('submit',e=>{
    e.preventDefault();const html=sanitizeHtml(editor.innerHTML),text=editor.textContent.trim();if(!text&&!html.replace(/<[^>]*>/g,'').trim())return;
    saveComment({id:'campaign-comment-'+Date.now(),parentId:null,author:currentUser.name,regiment:currentUser.regiment,avatar:empireUserAvatar(currentUser.name),html,text,time:new Date().toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})});editor.innerHTML='';
  });
  renderComments();
})();