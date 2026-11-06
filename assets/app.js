(async function initSupabaseAuth(){const client=window.EMPIRE_SUPABASE;if(!client)return;const {data:{session}}=await client.auth.getSession();if(session?.user){window.EMPIRE_CURRENT_USER={id:session.user.id,email:session.user.email||''};try{const {data:profile}=await client.from('profiles').select('username,display_name,avatar_url,status').eq('id',session.user.id).maybeSingle();if(profile)Object.assign(window.EMPIRE_CURRENT_USER,profile)}catch{};updateCurrentUserOnlineTile();}client.auth.onAuthStateChange((_event,newSession)=>{window.EMPIRE_CURRENT_USER=newSession?{id:newSession.user.id,email:newSession.user.email||''}:null;updateCurrentUserOnlineTile()})();
function updateCurrentUserOnlineTile(){const tile=document.getElementById('currentUserOnlineTile'),count=document.getElementById('onlineUsersCount'),u=window.EMPIRE_CURRENT_USER;if(!tile)return;if(u?.id){tile.hidden=false;const img=tile.querySelector('img');if(img&&u.avatar_url)img.src=u.avatar_url;tile.title=u.username||'Профиль';tile.setAttribute('aria-label','Профиль '+(u.username||''));if(img)img.alt=u.username||'Профиль';if(count)count.textContent='1 пользователь'}else{tile.hidden=true;if(count)count.textContent='0 пользователей'}}
const toast=(msg)=>{const e=document.getElementById('toast');if(!e)return;e.textContent=msg;e.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove('show'),2300)};
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');if(id&&id.length>1&&document.querySelector(id)){e.preventDefault();document.querySelector(id).scrollIntoView({behavior:'smooth',block:'start'})}}));
const modal=document.getElementById('loginModal');
document.querySelectorAll('[data-login]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();modal?.classList.add('show')}));
document.getElementById('closeLogin')?.addEventListener('click',()=>modal.classList.remove('show'));
modal?.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
document.getElementById('demoLogin')?.addEventListener('click',async()=>{const email=document.getElementById('loginName').value.trim(),password=document.getElementById('loginPassword').value;if(!email||!password){toast('Введите email и пароль.');return}const client=window.EMPIRE_SUPABASE;if(!client){toast('Supabase не подключён.');return}const {error}=await client.auth.signInWithPassword({email,password});if(error){toast(error.message);return}modal?.classList.remove('show');toast('Вход выполнен.');setTimeout(()=>location.href='profile.html',500)});
(function initHomeMiniChat(){
  const tabs=[...document.querySelectorAll('.chat-tab')];
  const panels=[...document.querySelectorAll('.chat-panel')];
  const input=document.getElementById('chatInput');
  const send=document.getElementById('sendChat');
  if(!tabs.length||!input||!send)return;

  // UI visibility only: production must provide this membership from the authenticated server session.
  const getCurrentRegiment=()=>{
    const sessionUser=window.EMPIRE_CURRENT_USER;
    if(sessionUser&&typeof sessionUser==='object'&&sessionUser.regimentId)return String(sessionUser.regimentId);
    try{return localStorage.getItem('empireCurrentRegiment')||''}catch{return ''}
  };
  const regimentTab=tabs.find(tab=>tab.dataset.tab==='regiment-chat');
  const regimentPanel=document.getElementById('regiment-chat');
  const membership=getCurrentRegiment();
  const isMember=Boolean(membership);
  if(regimentTab)regimentTab.hidden=!isMember;
  if(regimentPanel)regimentPanel.hidden=!isMember;

  let active='general';
  const updateComposer=()=>{
    const isRegiment=active==='regiment-chat';
    input.disabled=isRegiment&&!isMember;
    send.disabled=isRegiment&&!isMember;
    input.placeholder=isRegiment?'Сообщение участникам вашего полка':'Написать в общий чат...';
    input.setAttribute('aria-label',isRegiment?'Сообщение в полковой чат':'Сообщение в общий чат');
  };
  tabs.forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.tab==='regiment-chat'&&!isMember)return;
    active=button.dataset.tab;
    tabs.forEach(tab=>{
      const selected=tab===button;
      tab.classList.toggle('active',selected);
      tab.setAttribute('aria-selected',String(selected));
    });
    panels.forEach(panel=>panel.classList.toggle('active',panel.id===active));
    updateComposer();
  }));
  function sendChat(){
    const value=input.value.trim();
    if(!value)return;
    if(active==='regiment-chat'&&!isMember){
      toast('Полковой чат доступен только участникам полка.');
      return;
    }
    const box=document.querySelector('#'+active+' .messages');
    if(!box)return;
    const row=document.createElement('div');
    row.className='msg';
    const avatar=document.createElement('div');
    avatar.className='avatar';
    avatar.textContent='Я';
    const body=document.createElement('div');
    const author=document.createElement('b');
    author.textContent='Вы';
    const message=document.createElement('p');
    message.textContent=value;
    body.append(author,message);
    const time=document.createElement('div');
    time.className='time';
    time.textContent='сейчас';
    row.append(avatar,body,time);
    box.appendChild(row);
    input.value='';
    toast('Сообщение добавлено в демонстрационный чат');
  }
  send.addEventListener('click',sendChat);
  input.addEventListener('keydown',event=>{if(event.key==='Enter')sendChat()});
  updateComposer();
})();;
document.querySelectorAll('[data-regiment]').forEach(e=>e.addEventListener('click',()=>toast('Открываем профиль: '+e.dataset.regiment)));


const regSearch=document.getElementById('regSearch');
const regNation=document.getElementById('regNation');
const regList=document.getElementById('regList');
function sortAndFilterRegiments(){
  if(!regList)return;
  const q=(regSearch?.value||'').trim().toLowerCase();
  const nation=regNation?.value||'';
  const cards=[...regList.querySelectorAll('.regiment-tile')];
  cards.sort((a,b)=>Number(b.dataset.rating)-Number(a.dataset.rating));
  cards.forEach(card=>regList.appendChild(card));
  let visible=0;
  cards.forEach(card=>{
    const show=(!q||(card.dataset.name||'').toLowerCase().includes(q))&&(!nation||card.dataset.nation===nation);
    card.style.display=show?'block':'none';
    if(show)visible++;
  });
  const empty=document.getElementById('regEmpty');
  if(empty)empty.style.display=visible?'none':'block';
}
regSearch?.addEventListener('input',sortAndFilterRegiments);
regNation?.addEventListener('change',sortAndFilterRegiments);
sortAndFilterRegiments();

// Demo-only notices for controls that require the future server backend.
document.querySelectorAll('[data-demo]').forEach(b=>b.addEventListener('click',()=>toast(b.dataset.demo)));


// RU / EN language switch. Google Translate provides page-wide translation.
(function initLanguageSwitch(){
  const footer=document.querySelector('footer .footer-inner')||document.querySelector('footer');
  if(!footer)return;
  const readLang=()=>document.cookie.split('; ').find(x=>x.startsWith('googtrans='))?.split('/').pop()==='en'?'en':'ru';
  const button=document.createElement('button');
  button.type='button';
  button.className='language-switch';
  button.setAttribute('aria-label','Switch website language');
  button.textContent=readLang()==='ru'?'🇬🇧 EN':'🇷🇺 RU';
  button.addEventListener('click',()=>{
    const next=readLang()==='ru'?'en':'ru';
    if(next==='en'){
      document.cookie='googtrans=/ru/en;path=/;max-age=31536000;SameSite=Lax';
    }else{
      document.cookie='googtrans=;path=/;max-age=0;SameSite=Lax';
      document.cookie='googtrans=;path=/;domain='+location.hostname+';max-age=0;SameSite=Lax';
    }
    location.reload();
  });
  button.classList.add('footer-language-switch');
  footer.appendChild(button);
  const host=document.createElement('div');
  host.id='google_translate_element';
  host.setAttribute('aria-hidden','true');
  host.style.cssText='position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden';
  document.body.appendChild(host);
  window.googleTranslateElementInit=function(){
    if(window.google?.translate?.TranslateElement){
      new google.translate.TranslateElement({pageLanguage:'ru',includedLanguages:'ru,en',autoDisplay:false},'google_translate_element');
    }
  };
  const script=document.createElement('script');
  script.src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async=true;
  document.head.appendChild(script);
})();


// Public profile badge for elevated site roles. The server must supply data-site-role.
(function initSiteRoleBadge(){
  const labels={moderator:'МОДЕРАТОР EMPIRE',admin:'АДМИНИСТРАТОР EMPIRE'};
  document.querySelectorAll('[data-site-role]').forEach(el=>{
    const role=(el.dataset.siteRole||'user').toLowerCase();
    if(!labels[role]){el.hidden=true;return;}
    el.textContent=role==='admin'?'♛ '+labels[role]:'⚔ '+labels[role];
    el.classList.add('site-role-'+role);
    el.hidden=false;
  });
})();


// Real regiments from Supabase. Demonstration regiment records have been removed.
(function initRealRegiments(){
  const list=document.getElementById('regList'), createButton=document.getElementById('createRegiment'), modal=document.getElementById('regimentModal'), close=document.getElementById('closeRegiment'), form=document.getElementById('regimentForm');
  if(!list)return;
  const client=window.EMPIRE_SUPABASE;
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const render=items=>{list.querySelectorAll('.regiment-tile').forEach(x=>x.remove());const empty=document.getElementById('regEmpty');if(!items.length){if(empty)empty.style.display='block';return}if(empty)empty.style.display='none';items.forEach(r=>{const a=document.createElement('a');a.className='regiment-tile';a.href='regiment.html?id='+encodeURIComponent(r.id);a.dataset.name=r.name;a.dataset.nation=r.faction||'';a.dataset.rating=String(r.rating||0);a.innerHTML='<div class="regiment-logo">'+(r.logo_url?'<img src="'+esc(r.logo_url)+'" alt="Флаг '+esc(r.name)+'">':'⚔')+'</div><h2>'+esc(r.name)+'</h2><div class="regiment-rating">'+Number(r.rating||0)+' <span>РЕЙТИНГ</span></div>';list.insertBefore(a,empty||null)});if(typeof sortAndFilterRegiments==='function')sortAndFilterRegiments()};
  const load=async()=>{if(!client){render([]);return}const {data,error}=await client.from('regiments').select('id,name,faction,logo_url,rating').order('rating',{ascending:false});if(error){console.error(error);toast('Не удалось загрузить полки из базы данных.');render([]);return}render(data||[])};
  createButton?.addEventListener('click',async()=>{if(!client){toast('Supabase не подключён.');return}const {data:{session}}=await client.auth.getSession();if(!session){toast('Для создания полка войдите в аккаунт.');return}modal?.classList.add('show')});
  close?.addEventListener('click',()=>modal?.classList.remove('show'));modal?.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
  form?.addEventListener('submit',async e=>{e.preventDefault();if(!client)return;const {data:{session}}=await client.auth.getSession();if(!session){toast('Для создания полка войдите в аккаунт.');return}const name=document.getElementById('newRegimentName').value.trim(),faction=document.getElementById('newRegimentFaction').value;if(!name||!faction){toast('Укажите название полка и фракцию.');return}const {data,error}=await client.from('regiments').insert({name,faction,commander_id:session.user.id}).select().single();if(error){toast(error.code==='23505'?'Такой полк уже существует.':'Не удалось создать полк: '+error.message);return}const memberError=(await client.from('regiment_members').insert({regiment_id:data.id,user_id:session.user.id,member_role:'commander'})).error;if(memberError){toast('Полк создан, но не удалось добавить командира: '+memberError.message);return}form.reset();modal?.classList.remove('show');await load();toast('Полк создан и сохранён в базе данных.')});
  load();
})();
// Demo campaign: one standalone battle, seeded once for the campaign page preview.
(function seedCampaignBattle(){
  if(!document.getElementById('campaignList'))return;
  const key='empireCampaignsDemo';
  let items=[];try{items=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
  if(!items.some(c=>c.id==='demo-campaign-battle-01')){
    items.unshift({
      id:'demo-campaign-battle-01',
      name:'Сражение при Ватерлоо',
      start:'2026-11-15T19:00',
      description:'Демонстрационная кампания EMPIRE: союзные войска выступают против французской армии. Задача сторон — удержать ключевые позиции и добиться победы в генеральном сражении. Это одно самостоятельное сражение продолжительностью ровно 60 минут.',
      server:'EMPIRE — Waterloo Event Server',
      password:'demo-hidden',
      factions:['Французская империя','Британская Империя','Пруссия'],
      participants:[
        {regiment:'84e Régiment',count:45,faction:'Французская империя',arms:['Пехота','Стрелки'],attendance:'pending',ratingAwarded:false},
        {regiment:'7th Hussars',count:24,faction:'Французская империя',arms:['Кавалерия'],attendance:'pending',ratingAwarded:false},
        {regiment:'95th Rifles',count:32,faction:'Британская Империя',arms:['Стрелки','Пехота'],attendance:'pending',ratingAwarded:false},
        {regiment:'Prussian Guard',count:40,faction:'Пруссия',arms:['Пехота','Артиллерия'],attendance:'pending',ratingAwarded:false}
      ],
      status:'registration',
      demo:true
    });
    localStorage.setItem(key,JSON.stringify(items));
  }
})();

// Campaign management and participation demo. Each campaign is one standalone battle. Production permissions and storage must be enforced by the server.
(function initCampaigns(){
  const list=document.getElementById('campaignList');
  if(!list)return;
  const storeKey='empireCampaignsDemo';
  const getItems=()=>{try{return JSON.parse(localStorage.getItem(storeKey)||'[]')}catch{return []}};
  const saveItems=items=>localStorage.setItem(storeKey,JSON.stringify(items));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arms=['Пехота','Кавалерия','Стрелки','Артиллерия'];
  const factions=['Французская империя','Австрийская Империя','Пруссия','Российская империя','Рейнский Союз','Британская Империя'];
  const demoBattles=[
    {regiment:'1st Regiment',start:'2026-11-08T20:00'},
    {regiment:'7th Hussars',start:'2026-11-10T21:00'}
  ];
  const overlaps=(a,b)=>{const x=new Date(a).getTime(),y=new Date(b).getTime();return Number.isFinite(x)&&Number.isFinite(y)&&x<y+3600000&&y<x+3600000};
  const conflict=(regiment,start,items)=>demoBattles.some(b=>b.regiment===regiment&&overlaps(start,b.start))||items.some(c=>c.status!=='completed'&&c.participants.some(p=>p.regiment===regiment)&&overlaps(start,c.start));
  const dateText=s=>new Date(s).toLocaleString('ru-RU',{dateStyle:'long',timeStyle:'short'});
  const create=document.getElementById('campaignCreateForm');
  const render=()=>{
    const items=getItems(), active=items.filter(c=>c.status!=='completed'), archived=items.filter(c=>c.status==='completed');
    list.innerHTML=active.length?active.map(c=>`<article class="campaign-event"><div class="campaign-event-head"><div><span class="status status-planned">${Date.now()<new Date(c.start).getTime()?'Предстоящее сражение':Date.now()<new Date(c.start).getTime()+3600000?'Сражение идёт':'Сражение завершено — ожидает итогов'}</span><h2>${esc(c.name)}</h2><p>${dateText(c.start)} · продолжительность 1 час</p></div><span class="campaign-event-count">${c.participants.length} полк.</span></div><p>${esc(c.description)}</p><div class="campaign-factions"><b>Фракции:</b> ${c.factions.map(esc).join(' · ')}</div><div class="campaign-participation"><form class="campaign-join-form" data-join="${c.id}"><label>Полк<select name="regiment" required><option value="">Выберите свой полк</option><option>1st Regiment</option><option>84e Régiment</option><option>7th Hussars</option><option>95th Rifles</option><option>Preobrazhensky</option><option>Prussian Guard</option></select></label><label>Количество бойцов<input name="count" type="number" min="1" max="200" value="10" required></label><button class="btn primary" type="submit">Принять участие</button></form></div><div class="campaign-roster"><b>Заявки и распределение</b>${c.participants.length?c.participants.map(p=>`<div class="campaign-roster-row"><span><strong>${esc(p.regiment)}</strong><small>${p.count} бойцов · ${esc(p.faction||'Фракция не назначена')} · ${(p.arms||[]).map(esc).join(', ')||'Рода войск не назначены'}</small></span><span class="status ${p.attendance==='yes'?'status-done':p.attendance==='no'?'status-pending':'status-planned'}">${p.attendance==='yes'?'Явился':p.attendance==='no'?'Не явился':'Ожидает проверки'}</span></div>`).join(''):'<p class="empty-state">Заявок пока нет.</p>'}</div><details class="campaign-admin-tools"><summary>Администрирование участников</summary>${c.participants.map(p=>`<div class="campaign-manage-row" data-manage="${c.id}" data-regiment="${esc(p.regiment)}"><b>${esc(p.regiment)}</b><label>Фракция<select class="assign-faction"><option value="">Не назначена</option>${factions.map(f=>`<option ${p.faction===f?'selected':''}>${esc(f)}</option>`).join('')}</select></label><fieldset class="campaign-fieldset"><legend>Рода войск (можно несколько)</legend><div class="check-grid">${arms.map(a=>`<label class="checkline"><input type="checkbox" class="assign-arm" value="${a}" ${(p.arms||[]).includes(a)?'checked':''}>${a}</label>`).join('')}</div></fieldset><label>Явка после сражения<select class="assign-attendance" ${Date.now()<new Date(c.start).getTime()+3600000?'disabled':''}><option value="pending" ${p.attendance==='pending'?'selected':''}>Ожидает проверки</option><option value="yes" ${p.attendance==='yes'?'selected':''}>Явился</option><option value="no" ${p.attendance==='no'?'selected':''}>Не явился</option></select></label><button class="btn save-assignment" type="button">Сохранить сторону и роды войск</button></div>`).join('')||'<p>Пока нет заявок.</p>'}<div class="campaign-server-unlock"><b>Данные игрового сервера</b><p>${Date.now()>=new Date(c.start).getTime()?'Кампания началась. В рабочей системе сервер и пароль будут доступны только подтверждённым участникам; демонстрационная версия не раскрывает пароль.':'Сервер и пароль скрыты до начала кампании.'}</p></div><button class="btn finish-campaign" type="button" data-finish="${c.id}" ${Date.now()<new Date(c.start).getTime()+3600000?'disabled':''}>Подвести итоги и начислить рейтинг</button><p class="campaign-admin-note">${Date.now()<new Date(c.start).getTime()+3600000?'Отметка явки и подведение итогов станут доступны после завершения часового сражения.':'После проверки явки нажмите кнопку, чтобы завершить кампанию и начислить по 50 очков явившимся полкам.'}</p></details></article>`).join(''):'<div class="empty-state">Пока нет опубликованных кампаний. Создайте событие в блоке управления ниже.</div>';
    const archive=document.getElementById('campaignArchive');
    archive.innerHTML=archived.length?archived.map(c=>`<div class="archive-row"><div><b>${esc(c.name)}</b><small>${dateText(c.start)} · ${c.participants.filter(p=>p.attendance==='yes').length} полков явились</small></div><span class="status status-done">Завершена</span></div>` ).join(''):'Завершённых кампаний пока нет.';
  };
  create?.addEventListener('submit',e=>{
    e.preventDefault();
    const chosen=[...create.querySelectorAll('[name="campaignFaction"]:checked')].map(x=>x.value);
    if(!chosen.length){toast('Выберите хотя бы одну фракцию кампании.');return;}
    const start=document.getElementById('campaignDate').value+'T'+document.getElementById('campaignTime').value;
    if(!Number.isFinite(new Date(start).getTime())){toast('Укажите корректные дату и время.');return;}
    const items=getItems();
    items.push({id:String(Date.now()),name:document.getElementById('campaignName').value.trim(),start,description:document.getElementById('campaignDescription').value.trim(),server:document.getElementById('campaignServer').value.trim(),password:document.getElementById('campaignPassword').value,factions:chosen,participants:[],status:'registration'});
    saveItems(items);create.reset();render();toast('Сражение кампании создано в демонстрационном режиме.');
  });
  list.addEventListener('submit',e=>{
    const form=e.target.closest('.campaign-join-form');if(!form)return;e.preventDefault();
    const items=getItems(),c=items.find(x=>x.id===form.dataset.join);if(!c)return;
    const regiment=form.regiment.value.trim(),count=Number(form.count.value);
    if(!regiment||!Number.isInteger(count)||count<1){toast('Укажите полк и количество бойцов.');return;}
    if(c.participants.some(p=>p.regiment===regiment)){toast('Этот полк уже подал заявку на кампанию.');return;}
    if(conflict(regiment,c.start,items)){toast('Нельзя подать заявку: у полка есть сражение или другая кампания в это время.');return;}
    c.participants.push({regiment,count,faction:'',arms:[],attendance:'pending',ratingAwarded:false});saveItems(items);render();toast('Заявка полка добавлена.');
  });
  list.addEventListener('click',e=>{
    const row=e.target.closest('.campaign-manage-row');
    if(e.target.matches('.save-assignment')&&row){
      const items=getItems(),c=items.find(x=>x.id===row.dataset.manage),p=c?.participants.find(x=>x.regiment===row.dataset.regiment);if(!p)return;
      p.faction=row.querySelector('.assign-faction').value;p.arms=[...row.querySelectorAll('.assign-arm:checked')].map(x=>x.value);const attendanceControl=row.querySelector('.assign-attendance');if(!attendanceControl.disabled)p.attendance=attendanceControl.value;
      saveItems(items);render();toast(attendanceControl.disabled?'Сторона и рода войск полка сохранены. Явку можно отметить после сражения.':p.attendance==='yes'?'Явка отмечена. +50 будет начислено после подведения итогов.':'Данные участника сохранены.');
    }
    const finish=e.target.closest('[data-finish]');if(finish){const items=getItems(),c=items.find(x=>x.id===finish.dataset.finish);if(!c)return;if(Date.now()<new Date(c.start).getTime()+3600000){toast('Подведение итогов доступно только после завершения часового сражения.');return;}if(c.participants.some(p=>p.attendance==='pending')){toast('Сначала отметьте явку или неявку каждого полка.');return;}c.status='completed';c.participants.forEach(p=>{if(p.attendance==='yes'&&!p.ratingAwarded){p.ratingAwarded=true;p.ratingAward=50;}});saveItems(items);render();toast('Итоги сражения зафиксированы. Явившимся полкам начислено по 50 очков.');}
  });
  render();
})();
