(() => {
const K='empire_campaigns_v1', CK='empire_campaign_comments_v1';
const read=(key,fallback=[])=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v}catch(e){return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentUser=()=>{try{const v=JSON.parse(localStorage.getItem('empire_current_user_v1')||'null');if(typeof v==='string'&&v)return v;if(v?.name)return String(v.name)}catch(e){}return localStorage.getItem('empire_current_user')||'Kalashnikov'};
const roles={Kalashnikov:'admin',Ankord:'moderator'};
const commanders={Kalashnikov:'1st Regiment',Marquis:'95th Rifles',Veli4estvo:'84e Régiment',Fusilier:'Preobrazhensky',Grenadier87:'7th Hussars'};
const regiments=[['1st Regiment','assets/1st.jpg'],['95th Rifles','assets/95.webp'],['84e Régiment','assets/84e.png'],['Preobrazhensky','assets/preobraz.webp'],['7th Hussars','assets/hussars.png'],['13e Léger','assets/1st.jpg'],['33e Ligne','assets/95.webp'],['92nd Gordon Highlanders','assets/84e.png'],['Semenovsky','assets/preobraz.webp'],["King's German Legion",'assets/kgr.png'],['6e Hussards','assets/1st.jpg'],['Royal Scots','assets/95.webp']];
const troopTypes=['Стрелки','Пехота','Кавалерия','Артиллерия'];
const statusOf=c=>{const t=new Date(c.startAt).getTime(),now=Date.now();if(c.status==='completed')return 'completed';if(now<t)return 'upcoming';if(now<t+3600000)return 'ongoing';return 'awaiting';};
const formatDate=v=>new Date(v).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const countdown=v=>{const d=Math.max(0,new Date(v).getTime()-Date.now());const h=Math.floor(d/3600000),m=Math.floor(d%3600000/60000),s=Math.floor(d%60000/1000);return h+'ч '+String(m).padStart(2,'0')+'м '+String(s).padStart(2,'0')+'с'};
const seed=()=>{
 let all=read(K);
 if(!Array.isArray(all)) all=[];
 const testCampaigns=[
  {id:'campaign-test-01',title:'Битва за Ватерлоо',server:'EMPIRE_WATERLOO_01',password:'WATERLOO1815',startAt:'2026-11-12T20:00:00',factions:['Французская армия','Британская армия'],organizer:'Kalashnikov',status:'published',applications:[],createdAt:'2026-11-08T18:00:00',preview:'assets/IMG_2745.png',cover:'assets/IMG_2745.png'},
  {id:'campaign-test-02',title:'Кампания на Рейне',server:'EMPIRE_RHEIN_02',password:'RHEIN1813',startAt:'2026-11-18T19:30:00',factions:['Французская армия','Прусская армия'],organizer:'Ankord',status:'published',applications:[],createdAt:'2026-11-08T18:05:00',preview:'assets/IMG_2745.png',cover:'assets/IMG_2745.png'},
  {id:'campaign-test-03',title:'Освобождение Испании',server:'EMPIRE_SPAIN_03',password:'SPAIN1812',startAt:'2026-11-22T20:00:00',factions:['Французская армия','Испанская армия','Британская армия'],organizer:'Kalashnikov',status:'published',applications:[],createdAt:'2026-11-08T18:10:00',preview:'assets/IMG_2745.png',cover:'assets/IMG_2745.png'}
 ];
 all=all.filter(x=>x.id!=='campaign-001');
 testCampaigns.forEach(tc=>{if(!all.some(x=>x.id===tc.id))all.unshift(tc);});
 write(K,all);

 const c=all.find(x=>x.id==='campaign-001');
 if(c){
  c.factions=['Французская армия','Британская армия'];
  c.preview=c.preview||'assets/IMG_2745.png';
  c.cover=c.cover||'assets/IMG_2745.png';
  c.applications=c.applications||[];
  const testParticipants=[
   ['1st Regiment','Kalashnikov',18,'Французская армия','Пехота','assets/1st.jpg'],
   ['95th Rifles','Marquis',15,'Британская армия','Стрелки','assets/95.webp'],
   ['84e Régiment','Veli4estvo',16,'Французская армия','Пехота','assets/84e.png'],
   ['Preobrazhensky','Fusilier',14,'Французская армия','Пехота','assets/preobraz.webp'],
   ['7th Hussars','Grenadier87',12,'Британская армия','Кавалерия','assets/hussars.png'],
   ["King's German Legion",'Ankord',13,'Британская армия','Пехота','assets/kgr.png']
  ];
  testParticipants.forEach((p,i)=>{
   if(!c.applications.some(a=>a.regiment===p[0])) c.applications.push({id:'test-app-'+String(i+1).padStart(2,'0'),regiment:p[0],commander:p[1],people:p[2],status:'accepted',logo:p[5],faction:p[3],troopType:p[4],attended:false});
  });
  write(K,all);
 }
 const seededComments=[
  ['Ankord','Отличная идея для большой кампании. Уже собираем состав.'],
  ['Veli4estvo','84e Régiment готовится к сражению.'],
  ['Marquis','95th Rifles принимают вызов. Увидимся на поле боя.'],
  ['Fusilier','Предлагаю заранее согласовать время сбора полков.'],
  ['Grenadier87','7th Hussars готовы поддержать союзников.'],
  ['Kalashnikov','Сервер и пароль будут доступны всем принятым участникам.'],
  ['Mel','Будет интересно увидеть массовое сражение.'],
  ['Kazak','Главное — не забыть про построения перед началом.'],
  ['MeGusta','Состав уже почти собран.'],
  ['Flashkodr','Нужна ли регистрация каждого бойца отдельно?'],
  ['MrDixon','Достаточно заявки от главы полка.'],
  ['Theodor','Хорошо, что участвуют сразу две фракции.'],
  ['Grenadier87','Предлагаю после боя сделать общий скриншот.'],
  ['Marquis','Поддерживаю, такой скриншот пригодится для альбома.'],
  ['Veli4estvo','84e Régiment будет на месте заранее.'],
  ['Ankord','Не забудьте проверить пароль перед стартом.'],
  ['Kazak','Будем следить за временем начала.'],
  ['Mel','Ждём подтверждения результатов после кампании.'],
  ['Fusilier','Удачи всем полкам и честного боя!'],
  ['Kalashnikov','После завершения отмечу явку и результаты участников.']
 ];
 const comments=read(CK);
 if(!comments.some(x=>x.campaignId==='campaign-001'&&x.id==='campaign-001-comment-20')){
  seededComments.forEach((item,i)=>comments.push({id:'campaign-001-comment-'+String(i+1).padStart(2,'0'),campaignId:'campaign-001',author:item[0],text:item[1],createdAt:new Date(Date.UTC(2026,10,8,16,0+i,0)).toISOString()}));
  write(CK,comments);
 }
 return all;
};
const badgeStatus=s=>({upcoming:'ПРЕДСТОИТ',ongoing:'ИДЁТ БОЙ',awaiting:'ЖДЁТ ПОДТВЕРЖДЕНИЯ',completed:'ЗАВЕРШЕНА'}[s]||s);
function campaignCard(c){
 const s=statusOf(c), accepted=(c.applications||[]).filter(a=>a.status==='accepted').length;
 return '<a class="campaign-card" href="campaign.html?id='+encodeURIComponent(c.id)+'"><div class="campaign-card-preview" style="background-image:url(&quot;'+esc(c.preview||'assets/IMG_2745.png')+'&quot;)"></div><div class="campaign-card-date"><strong>'+new Date(c.startAt).toLocaleDateString('ru-RU',{day:'2-digit',month:'short'})+'</strong><span>'+new Date(c.startAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})+'</span></div><div class="campaign-card-main"><div class="campaign-status '+s+'">'+badgeStatus(s)+'</div><h3>'+esc(c.title)+'</h3><p>Фракции: '+esc((c.factions||[]).join(' · '))+'</p><small>Участников-полков: '+accepted+' · Организатор: '+esc(c.organizer)+'</small></div><div class="campaign-card-arrow">→</div></a>';
}
function renderList(){
 const all=seed().sort((a,b)=>new Date(a.startAt)-new Date(b.startAt));
 const up=all.filter(c=>statusOf(c)!=='completed'),done=all.filter(c=>statusOf(c)==='completed').reverse();
 const u=document.getElementById('upcomingCampaigns'),d=document.getElementById('completedCampaigns');
 if(u){u.innerHTML=up.length?up.map(campaignCard).join(''):'<div class="campaign-empty">Предстоящих кампаний нет.</div>';document.getElementById('upcomingCampaignsCount').textContent=up.length}
 if(d){d.innerHTML=done.length?done.map(campaignCard).join(''):'<div class="campaign-empty">Завершённых кампаний пока нет.</div>';document.getElementById('completedCampaignsCount').textContent=done.length}
}
function role(){return roles[currentUser()]||''}
function renderDetail(){
 const box=document.getElementById('campaignDetail');if(!box)return;
 const id=new URLSearchParams(location.search).get('id');const c=seed().find(x=>x.id===id)||seed()[0];
 if(!c){box.innerHTML='<section class="card"><h1>Кампания не найдена</h1><a class="btn" href="campaigns.html">Вернуться к кампаниям</a></section>';return}
 const s=statusOf(c),me=currentUser(),isOrg=me===c.organizer&&!!role(),myRegiment=commanders[me],myApp=(c.applications||[]).find(a=>a.regiment===myRegiment);
 const accepted=(c.applications||[]).filter(a=>a.status==='accepted');
 const participant=accepted.some(a=>a.regiment===myRegiment);
 const secure=participant||isOrg;
 let html='<section class="campaign-hero card has-cover" style="background-image:url(&quot;'+esc(c.cover||'assets/IMG_2745.png')+'&quot;)"><div class="campaign-status '+s+'">'+badgeStatus(s)+'</div><div class="page-kicker">ВОЕННАЯ КАМПАНИЯ</div><h1>'+esc(c.title)+'</h1><p class="campaign-organizer">Организатор: <strong>'+esc(c.organizer)+'</strong></p><div class="campaign-countdown" data-start="'+esc(c.startAt)+'"></div></section>';
 html+='<section class="campaign-preview card"><img src="'+esc(c.preview||c.cover||'assets/IMG_2745.png')+'" alt="Превью кампании" loading="lazy"></section><section class="campaign-info-grid"><div class="card campaign-info-card"><div class="campaign-card-label">Время проведения</div><strong class="campaign-start-date">'+formatDate(c.startAt)+'</strong><span>Продолжительность — ровно 1 час</span></div><div class="card campaign-info-card"><div class="campaign-card-label">Сервер</div><strong>'+ (secure?esc(c.server):'Доступен участникам')+'</strong><span>'+ (secure?'Пароль: <b>'+esc(c.password)+'</b>':'Сервер и пароль доступны после принятия заявки')+'</span></div><div class="card campaign-info-card"><div class="campaign-card-label">Фракции</div><strong>'+esc((c.factions||[]).join(' · '))+'</strong><span>Фракция назначается организатором полку</span></div></section>';
 if(myRegiment&&!myApp&&s==='upcoming') html+='<section class="card campaign-apply"><div><div class="page-kicker">ЗАЯВКА ПОЛКА</div><h2>'+esc(myRegiment)+'</h2><p>Вы можете подать заявку как глава полка и указать количество бойцов.</p></div><form id="campaignApplyForm"><label>Сколько человек выставляете?<input id="campaignPeople" type="number" min="1" max="200" required value="10"></label><button class="btn primary">Подать заявку</button></form></section>';
 if(myApp) html+='<section class="card campaign-application-status"><div><div class="page-kicker">ЗАЯВКА '+esc(myRegiment)+'</div><h2>'+({pending:'На рассмотрении',accepted:'Принята',rejected:'Отклонена'}[myApp.status]||myApp.status)+'</h2><p>Выставляемый состав: <strong>'+esc(myApp.people)+' человек</strong></p></div>'+ (myApp.status==='accepted'?'<div class="campaign-assignment"><b>Фракция:</b> '+esc(myApp.faction||'Назначается организатором')+'<br><b>Род войск:</b> '+esc(myApp.troopType||'Назначается организатором')+'</div>':'')+'</section>';
 if(isOrg) html+=organizerPanel(c,s);
 html+='<section class="card campaign-participants"><div class="campaign-section-title"><div><div class="page-kicker">УЧАСТНИКИ</div><h2>Полки кампании</h2></div><span>'+accepted.length+'</span></div><div class="campaign-participant-list">'+(accepted.length?accepted.map(a=>'<div class="campaign-participant"><img src="'+esc(a.logo||'assets/empire_logo_top_right.png')+'" alt=""><div><strong>'+esc(a.regiment)+'</strong><small>'+esc(a.people)+' человек · '+esc(a.faction||'Фракция не назначена')+' · '+esc(a.troopType||'Род войск не назначен')+'</small></div><span class="campaign-attendance '+(a.attended?'present':'pending')+'">'+(a.attended?'ЯВИЛСЯ · +50':'ОЖИДАЕТ')+'</span></div>').join(''):'<div class="campaign-empty">Пока нет принятых заявок.</div>')+'</div></section>';
 html+='<section class="card battle-comments-card campaign-comments"><div class="card-title">💬 &nbsp; Комментарии <span class="battle-comment-count" id="campaignCommentCount">0</span></div><div id="campaignComments" class="battle-comments"></div><form id="campaignCommentForm" class="battle-comment-form"><div class="battle-comment-editor" id="campaignCommentEditorWrap"><div class="battle-comment-toolbar" role="toolbar" aria-label="Форматирование комментария"><button type="button" data-editor-command="bold" title="Жирный"><strong>B</strong></button><button type="button" data-editor-command="italic" title="Курсив"><em>I</em></button><button type="button" data-editor-command="underline" title="Подчёркивание"><u>U</u></button><button type="button" data-editor-command="quote" title="Цитата">❝</button><button type="button" data-editor-command="spoiler" title="Спойлер">S</button><button type="button" data-editor-command="image" title="Вставить картинку">▧</button><button type="button" data-editor-command="video" title="Вставить видео">▶</button></div><div id="campaignCommentInput" class="battle-comment-input" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Написать комментарий…"></div></div><button type="submit">Отправить</button></form></section>';
 box.innerHTML=html;
 try{renderComments(c.id)}catch(commentError){const commentBox=document.getElementById('campaignComments');if(commentBox)commentBox.innerHTML='<div class="battle-comments-empty">Комментарии временно недоступны.</div>';}
 const countdownEl=box.querySelector('.campaign-countdown');
 const tick=()=>{const st=statusOf(c);countdownEl.textContent=st==='upcoming'?'До начала: '+countdown(c.startAt):st==='ongoing'?'Сражение идёт · до окончания: '+countdown(new Date(new Date(c.startAt).getTime()+3600000)):st==='awaiting'?'Сражение завершено. Организатор вносит результаты.':'Кампания завершена';};tick();setInterval(tick,1000);
 const form=document.getElementById('campaignApplyForm');if(form)form.addEventListener('submit',e=>{e.preventDefault();const n=Math.max(1,Number(document.getElementById('campaignPeople').value)||0);const all=read(K),x=all.find(v=>v.id===c.id);x.applications=x.applications||[];x.applications.push({id:'app-'+Date.now(),regiment:myRegiment,commander:me,people:n,status:'pending',logo:regiments.find(r=>r[0]===myRegiment)?.[1]||'assets/empire_logo_top_right.png'});write(K,all);location.reload()});
 const cf=document.getElementById('campaignCommentForm');if(cf)cf.addEventListener('submit',e=>{e.preventDefault();const editor=document.getElementById('campaignCommentInput');const html=campaignSanitizeHtml(editor.innerHTML),text=editor.textContent.trim();if(!text&&!html.replace(/<[^>]*>/g,'').trim())return;const all=read(CK);all.push({id:'cc-'+Date.now(),campaignId:c.id,author:me,avatar:(typeof empireUserAvatar==='function')?empireUserAvatar(me):'assets/empire_logo_top_right.png',html,text,time:new Date().toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}),createdAt:new Date().toISOString()});write(CK,all);editor.innerHTML='';renderComments(c.id)});
 const editor=document.getElementById('campaignCommentInput'),toolbar=document.querySelector('#campaignCommentForm .battle-comment-toolbar');if(toolbar){toolbar.addEventListener('mousedown',e=>{const b=e.target.closest('[data-editor-command]');if(b)e.preventDefault()});toolbar.addEventListener('click',e=>{const b=e.target.closest('[data-editor-command]');if(!b)return;const cmd=b.dataset.editorCommand;editor.focus();if(cmd==='bold'||cmd==='italic'||cmd==='underline')document.execCommand(cmd,false,null);else if(cmd==='quote')document.execCommand('formatBlock',false,'blockquote');else if(cmd==='spoiler'){const s=window.getSelection(),t=s&&s.toString();document.execCommand('insertHTML',false,'<span data-spoiler="true">'+campaignEscapeHtml(t||'Спойлер')+'</span>')}else if(cmd==='image'){const url=prompt('Вставьте прямую ссылку на картинку:');if(url&&/^https?:\\/\\//i.test(url.trim()))document.execCommand('insertHTML',false,'<img src="'+campaignEscapeHtml(url.trim())+'" alt="Вставленная картинка">')}else if(cmd==='video'){const url=prompt('Вставьте прямую ссылку на видео:');if(url&&/^https?:\\/\\//i.test(url.trim()))document.execCommand('insertHTML',false,'<video src="'+campaignEscapeHtml(url.trim())+'" controls preload="metadata"></video>')}})};
}
function organizerPanel(c,s){
 const pending=(c.applications||[]).filter(a=>a.status==='pending');
 const html='<section class="card campaign-organizer-panel"><div class="campaign-section-title"><div><div class="page-kicker">ОРГАНИЗАТОР</div><h2>Управление кампанией</h2></div><span>'+pending.length+' заявок</span></div><div class="campaign-requests">'+(pending.length?pending.map(a=>'<div class="campaign-request"><div class="campaign-request-main"><img src="'+esc(a.logo||'assets/empire_logo_top_right.png')+'" alt=""><div><strong>'+esc(a.regiment)+'</strong><small>Глава: '+esc(a.commander)+' · '+esc(a.people)+' человек</small></div></div><div class="campaign-request-actions"><select data-app="'+esc(a.id)+'" data-field="faction"><option value="">Фракция</option>'+c.factions.map(f=>'<option>'+esc(f)+'</option>').join('')+'</select><select data-app="'+esc(a.id)+'" data-field="troop"><option value="">Род войск</option>'+troopTypes.map(f=>'<option>'+f+'</option>').join('')+'</select><button class="btn primary" data-campaign-action="accept" data-app="'+esc(a.id)+'">Принять</button><button class="btn" data-campaign-action="reject" data-app="'+esc(a.id)+'">Отклонить</button></div></div>').join(''):'<div class="campaign-empty">Новых заявок нет.</div>')+'</div>';
 const accepted=(c.applications||[]).filter(a=>a.status==='accepted');
 return html+'<div class="campaign-results"><div class="page-kicker">РЕЗУЛЬТАТЫ</div><h3>Отметить явку после боя</h3><p>Участники, отмеченные как явившиеся, получают +50 к рейтингу.</p>'+accepted.map(a=>'<label class="campaign-attendance-check"><input type="checkbox" data-attendance="'+esc(a.id)+'" '+(a.attended?'checked':'')+' '+(s==='awaiting'||s==='completed'?'':'disabled')+'> <span>'+esc(a.regiment)+' — '+esc(a.people)+' человек</span></label>').join('')+(s==='awaiting'?'<button class="btn primary" id="finishCampaign">Сохранить результаты и завершить кампанию</button>':'')+(s==='completed'?'<div class="campaign-finished-note">Результаты сохранены. Начисление +50 учитывается в рейтинге.</div>':'')+'</div></section>';
}
const campaignCommentRegiments={Kalashnikov:'1st Regiment',Ankord:'1st Regiment',Veli4estvo:'84e Régiment',Mel:'1st Regiment',Kazak:'1st Regiment',MeGusta:'1st Regiment',Flashkodr:'1st Regiment',MrDixon:'1st Regiment',Theodor:'1st Regiment',Grenadier87:'7th Hussars',Marquis:'95th Rifles',Fusilier:'Preobrazhensky'};
const campaignPresence=()=>{try{return JSON.parse(localStorage.getItem('empire_profile_presence_v1')||'{}')}catch(e){return {}}};
const campaignOnline=name=>{const last=campaignPresence()[name];return typeof last==='number'&&Date.now()-last<5*60*1000};
const campaignEscapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const campaignSanitizeHtml=html=>{const doc=new DOMParser().parseFromString(String(html||''),'text/html');const allowed=new Set(['B','STRONG','I','EM','U','BLOCKQUOTE','BR','SPAN','IMG','VIDEO']);const cleanUrl=v=>{try{const u=new URL(String(v||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch(e){return ''}};const walk=node=>{[...node.childNodes].forEach(ch=>{if(ch.nodeType===Node.TEXT_NODE)return;if(ch.nodeType!==Node.ELEMENT_NODE||!allowed.has(ch.tagName)){const p=ch.parentNode;if(p){while(ch.firstChild)p.insertBefore(ch.firstChild,ch);p.removeChild(ch)}return} [...ch.attributes].forEach(a=>ch.removeAttribute(a.name));if(ch.tagName==='IMG'){const src=cleanUrl(ch.getAttribute('src'));if(!src){ch.remove();return}ch.setAttribute('src',src);ch.setAttribute('alt','Вставленная картинка');ch.setAttribute('loading','lazy')}if(ch.tagName==='VIDEO'){const src=cleanUrl(ch.getAttribute('src'));if(!src){ch.remove();return}ch.setAttribute('src',src);ch.setAttribute('controls','');ch.setAttribute('preload','metadata')}if(ch.tagName==='SPAN'&&ch.dataset.spoiler!=='true'){ch.replaceWith(...ch.childNodes);return}walk(ch)})};walk(doc.body);return doc.body.innerHTML};
const campaignRenderText=c=>c.html?campaignSanitizeHtml(c.html):campaignEscapeHtml(c.text||'').replace(/\\n/g,'<br>');
const campaignLikes=key=>{try{const m=JSON.parse(localStorage.getItem('empire-comment-likes-v1')||'{}');return Array.isArray(m[key])?m[key]:[]}catch(e){return []}};
const campaignToggleLike=key=>{let m={};try{m=JSON.parse(localStorage.getItem('empire-comment-likes-v1')||'{}')||{}}catch(e){}const n=Array.isArray(m[key])?m[key]:[],i=n.indexOf(currentUser());if(i>=0)n.splice(i,1);else n.push(currentUser());m[key]=n;localStorage.setItem('empire-comment-likes-v1',JSON.stringify(m));};
function renderComments(id){
 const box=document.getElementById('campaignComments');if(!box)return;
 const all=read(CK).filter(x=>x.campaignId===id);
 const card=(c,depth=0)=>{const name=String(c.author||'Пользователь'),avatar=c.avatar||((typeof empireUserAvatar==='function')?empireUserAvatar(name):'assets/empire_logo_top_right.png'),regiment=String(c.regiment||campaignCommentRegiments[name]||''),children=all.filter(x=>x.parentId===c.id),likes=campaignLikes('campaign:'+id+':'+c.id),image=c.image?'<a class="battle-comment-image-link" href="'+campaignEscapeHtml(c.image)+'" target="_blank" rel="noopener"><img class="battle-comment-image" src="'+campaignEscapeHtml(c.image)+'" alt="Вставленная картинка" loading="lazy"></a>':'',likePreview=likes.slice(0,2).map(campaignEscapeHtml).join(', '),likeControls='<div class="comment-reactions"><button class="comment-like-button'+(likes.includes(currentUser())?' is-liked':'')+'" type="button" data-campaign-like="'+campaignEscapeHtml(c.id)+'" aria-pressed="'+likes.includes(currentUser())+'">♥ <span>Нравится</span> <b>'+likes.length+'</b></button>'+(likes.length?'<div class="comment-like-popover"><span class="comment-like-preview">'+likePreview+(likes.length>2?' и ещё':'')+'</span><button type="button" class="comment-like-all" data-campaign-likes="'+campaignEscapeHtml(c.id)+'">Посмотреть всех</button><div class="comment-like-full" hidden>'+likes.map(n=>'<a href="profile.html?name='+encodeURIComponent(n)+'">'+campaignEscapeHtml(n)+'</a>').join('')+'</div></div>':'')+'</div>',report='<button class="comment-report-button" type="button" data-campaign-report="'+campaignEscapeHtml(c.id)+'">⚑ Пожаловаться</button>',del=c.author===currentUser()?'<button class="comment-delete-button" type="button" data-campaign-delete="'+campaignEscapeHtml(c.id)+'">Удалить</button>':'',online=campaignOnline(name),status='<div class="battle-comment-status '+(online?'is-online':'is-offline')+'"><i></i><span>'+(online?'В сети':'Не в сети')+'</span></div>',regLine=regiment?'<div class="battle-comment-regiment">'+campaignEscapeHtml(regiment)+'</div>':'',replies=children.map(x=>card(x,depth+1)).join('');return '<article class="battle-thread-item'+(depth?' is-reply':'')+'" data-campaign-comment-id="'+campaignEscapeHtml(c.id)+'"><div class="battle-comment"><div class="battle-comment-author"><a class="battle-comment-avatar-link" href="profile.html?name='+encodeURIComponent(name)+'"><img class="battle-comment-avatar" src="'+campaignEscapeHtml(avatar)+'" alt="'+campaignEscapeHtml(name)+'" loading="lazy"></a><div class="battle-comment-identity"><div class="battle-comment-head"><a href="profile.html?name='+encodeURIComponent(name)+'"><strong>'+campaignEscapeHtml(name)+'</strong></a></div>'+regLine+status+'<span class="battle-comment-time">'+campaignEscapeHtml(c.time||formatDate(c.createdAt))+'</span></div></div><div class="battle-comment-content"><div class="battle-comment-text">'+campaignRenderText(c)+'</div>'+image+likeControls+report+del+'<a href="#" class="battle-reply-link" data-campaign-reply="'+campaignEscapeHtml(c.id)+'">Ответить</a><form class="battle-reply-form" data-parent-id="'+campaignEscapeHtml(c.id)+'" hidden><input type="text" maxlength="500" placeholder="Ответить '+campaignEscapeHtml(name)+'…" required><button type="submit">Ответить</button></form></div></div>'+ (children.length?'<div class="battle-thread-replies">'+replies+'</div>':'')+'</article>'};
 const roots=all.filter(c=>!c.parentId||!all.some(p=>p.id===c.parentId));box.innerHTML=roots.length?roots.map(c=>card(c)).join(''):'<div class="battle-comments-empty">Комментариев пока нет.</div>';const count=document.getElementById('campaignCommentCount');if(count)count.textContent=all.length;
}
document.addEventListener('click',e=>{
 const reply=e.target.closest('[data-campaign-reply]');if(reply){e.preventDefault();const card=reply.closest('.battle-thread-item'),form=card?.querySelector(':scope > .battle-comment .battle-reply-form');if(form){form.hidden=!form.hidden;form.style.display=form.hidden?'none':'flex';if(!form.hidden)form.querySelector('input').focus()}return}
 const like=e.target.closest('[data-campaign-like]');if(like){const id=new URLSearchParams(location.search).get('id')||'campaign-001';campaignToggleLike('campaign:'+id+':'+like.dataset.campaignLike);renderComments(id);return}
 const likes=e.target.closest('[data-campaign-likes]');if(likes){const panel=likes.parentElement.querySelector('.comment-like-full');if(panel)panel.hidden=!panel.hidden;return}
 const del=e.target.closest('[data-campaign-delete]');if(del){const id=new URLSearchParams(location.search).get('id')||'campaign-001',all=read(CK),target=all.find(x=>String(x.id)===String(del.dataset.campaignDelete));if(target&&target.author===currentUser()&&confirm('Удалить этот комментарий?')){write(CK,all.filter(x=>String(x.id)!==String(del.dataset.campaignDelete)));renderComments(id)}return}
 const report=e.target.closest('[data-campaign-report]');if(report){alert('Жалоба отправлена модераторам.');return}
 const b=e.target.closest('[data-campaign-action]');if(!b)return;
 const me=currentUser(),all=read(K),id=new URLSearchParams(location.search).get('id'),c=all.find(x=>x.id===id);if(!c||c.organizer!==me)return;
 const a=(c.applications||[]).find(x=>x.id===b.dataset.app);if(!a)return;
 if(b.dataset.campaignAction==='accept'){const faction=document.querySelector('select[data-app="'+a.id+'"][data-field="faction"]').value,troop=document.querySelector('select[data-app="'+a.id+'"][data-field="troop"]').value;if(!faction||!troop){alert('Выберите фракцию и род войск.');return}a.status='accepted';a.faction=faction;a.troopType=troop}
 else a.status='rejected';
 write(K,all);location.reload();
});
document.addEventListener('submit',e=>{const form=e.target.closest('.battle-reply-form');if(!form)return;e.preventDefault();const input=form.querySelector('input'),text=input.value.trim();if(!text)return;const id=new URLSearchParams(location.search).get('id')||'campaign-001',all=read(CK);all.push({id:'cc-'+Date.now(),campaignId:id,parentId:form.dataset.parentId,author:currentUser(),avatar:(typeof empireUserAvatar==='function')?empireUserAvatar(currentUser()):'assets/empire_logo_top_right.png',text,time:new Date().toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}),createdAt:new Date().toISOString()});write(CK,all);renderComments(id)});
document.addEventListener('change',e=>{const input=e.target.closest('[data-attendance]');if(!input)return;const all=read(K),id=new URLSearchParams(location.search).get('id'),c=all.find(x=>x.id===id),a=(c?.applications||[]).find(x=>x.id===input.dataset.attendance);if(!a)return;a.attended=input.checked;write(K,all)});
document.addEventListener('click',e=>{if(e.target.id!=='finishCampaign')return;const all=read(K),id=new URLSearchParams(location.search).get('id'),c=all.find(x=>x.id===id);if(!c||c.organizer!==currentUser())return;c.status='completed';c.completedAt=new Date().toISOString();write(K,all);location.reload()});
if(document.getElementById('campaignDetail'))renderDetail();else renderList();
})();