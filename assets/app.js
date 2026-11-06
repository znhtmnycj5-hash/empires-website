const toast=(msg)=>{const e=document.getElementById('toast');if(!e)return;e.textContent=msg;e.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove('show'),2300)};
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');if(id&&id.length>1&&document.querySelector(id)){e.preventDefault();document.querySelector(id).scrollIntoView({behavior:'smooth',block:'start'})}}));
const modal=document.getElementById('loginModal');
document.querySelectorAll('[data-login]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();modal?.classList.add('show')}));
document.getElementById('closeLogin')?.addEventListener('click',()=>modal.classList.remove('show'));
modal?.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
document.getElementById('demoLogin')?.addEventListener('click',()=>{const n=document.getElementById('loginName').value.trim()||'Император';modal.classList.remove('show');toast('Добро пожаловать, '+n+'!')});
document.querySelectorAll('.chat-tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.chat-tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.chat-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById(b.dataset.tab).classList.add('active')}));
function sendChat(){const i=document.getElementById('chatInput'),v=i?.value.trim();if(!v)return;const box=document.querySelector('#general .messages');const r=document.createElement('div');r.className='msg';r.innerHTML='<div class="avatar">Я</div><div><b>Вы</b><p></p></div><div class="time">сейчас</div>';r.querySelector('p').textContent=v;box.appendChild(r);i.value='';toast('Сообщение добавлено в чат')}
document.getElementById('sendChat')?.addEventListener('click',sendChat);document.getElementById('chatInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')sendChat()});
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


// Regiment registration demo: a faction is mandatory and exactly one can be selected.
(function initRegimentRegistration(){
  const openButton=document.getElementById('createRegiment');
  const dialog=document.getElementById('regimentModal');
  const closeButton=document.getElementById('closeRegiment');
  const form=document.getElementById('regimentForm');
  const nameInput=document.getElementById('newRegimentName');
  const factionInput=document.getElementById('newRegimentFaction');
  const list=document.getElementById('regList');
  if(!openButton||!dialog||!form||!list)return;
  openButton.addEventListener('click',()=>{
    dialog.classList.add('show');
    nameInput?.focus();
  });
  closeButton?.addEventListener('click',()=>dialog.classList.remove('show'));
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.classList.remove('show')});
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const name=(nameInput?.value||'').trim();
    const faction=factionInput?.value||'';
    if(!name||!faction){toast('Укажите название полка и выберите фракцию.');return;}
    const card=document.createElement('div');
    card.className='regiment-tile';
    card.dataset.name=name;
    card.dataset.nation=faction;
    card.dataset.rating='0';
    const logo=document.createElement('div');
    logo.className='regiment-logo';
    logo.textContent='⚔';
    const title=document.createElement('h2');
    title.textContent=name;
    const rating=document.createElement('div');
    rating.className='regiment-rating';
    rating.textContent='0 ';
    const label=document.createElement('span');
    label.textContent='РЕЙТИНГ';
    rating.appendChild(label);
    const factionLabel=document.createElement('p');
    factionLabel.className='regiment-faction';
    factionLabel.textContent=faction;
    card.append(logo,title,factionLabel,rating);
    list.appendChild(card);
    if(typeof sortAndFilterRegiments==='function')sortAndFilterRegiments();
    form.reset();
    dialog.classList.remove('show');
    toast('Полк добавлен в демонстрационный список. Для постоянной регистрации требуется сервер.');
  });
})();


// Campaign management and participation demo. Production permissions and storage must be enforced by the server.
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
    list.innerHTML=active.length?active.map(c=>`<article class="campaign-event"><div class="campaign-event-head"><div><span class="status status-planned">${c.status==='started'?'Идёт кампания':'Регистрация / подготовка'}</span><h2>${esc(c.name)}</h2><p>${dateText(c.start)} · продолжительность 1 час</p></div><span class="campaign-event-count">${c.participants.length} полк.</span></div><p>${esc(c.description)}</p><div class="campaign-factions"><b>Фракции:</b> ${c.factions.map(esc).join(' · ')}</div><div class="campaign-participation"><form class="campaign-join-form" data-join="${c.id}"><label>Полк<select name="regiment" required><option value="">Выберите свой полк</option><option>1st Regiment</option><option>84e Régiment</option><option>7th Hussars</option><option>95th Rifles</option><option>Preobrazhensky</option><option>Prussian Guard</option></select></label><label>Количество бойцов<input name="count" type="number" min="1" max="200" value="10" required></label><button class="btn primary" type="submit">Принять участие</button></form></div><div class="campaign-roster"><b>Заявки и распределение</b>${c.participants.length?c.participants.map(p=>`<div class="campaign-roster-row"><span><strong>${esc(p.regiment)}</strong><small>${p.count} бойцов · ${esc(p.faction||'Фракция не назначена')} · ${(p.arms||[]).map(esc).join(', ')||'Рода войск не назначены'}</small></span><span class="status ${p.attendance==='yes'?'status-done':p.attendance==='no'?'status-pending':'status-planned'}">${p.attendance==='yes'?'Явился':p.attendance==='no'?'Не явился':'Ожидает проверки'}</span></div>`).join(''):'<p class="empty-state">Заявок пока нет.</p>'}</div><details class="campaign-admin-tools"><summary>Администрирование участников</summary>${c.participants.map(p=>`<div class="campaign-manage-row" data-manage="${c.id}" data-regiment="${esc(p.regiment)}"><b>${esc(p.regiment)}</b><label>Фракция<select class="assign-faction"><option value="">Не назначена</option>${factions.map(f=>`<option ${p.faction===f?'selected':''}>${esc(f)}</option>`).join('')}</select></label><fieldset class="campaign-fieldset"><legend>Рода войск (можно несколько)</legend><div class="check-grid">${arms.map(a=>`<label class="checkline"><input type="checkbox" class="assign-arm" value="${a}" ${(p.arms||[]).includes(a)?'checked':''}>${a}</label>`).join('')}</div></fieldset><label>Явка<select class="assign-attendance"><option value="pending" ${p.attendance==='pending'?'selected':''}>Ожидает проверки</option><option value="yes" ${p.attendance==='yes'?'selected':''}>Явился</option><option value="no" ${p.attendance==='no'?'selected':''}>Не явился</option></select></label><button class="btn save-assignment" type="button">Сохранить назначение и явку</button></div>`).join('')||'<p>Пока нет заявок.</p>'}<div class="campaign-server-unlock"><b>Серверные данные (только с момента начала)</b><p>${Date.now()>=new Date(c.start).getTime()?'Сервер: '+esc(c.server)+' · Пароль: '+esc(c.password):'Сервер и пароль пока скрыты до начала кампании.'}</p></div><button class="btn finish-campaign" type="button" data-finish="${c.id}">Завершить кампанию</button></details></article>`).join(''):'<div class="empty-state">Пока нет опубликованных кампаний. Создайте событие в блоке управления ниже.</div>';
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
    saveItems(items);create.reset();render();toast('Кампания создана в демонстрационном режиме.');
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
      p.faction=row.querySelector('.assign-faction').value;p.arms=[...row.querySelectorAll('.assign-arm:checked')].map(x=>x.value);p.attendance=row.querySelector('.assign-attendance').value;
      if(p.attendance==='yes'&&!p.ratingAwarded){p.ratingAwarded=true;p.ratingAward=50;}
      if(p.attendance!=='yes'&&p.ratingAwarded){p.ratingAwarded=false;p.ratingAward=0;}
      saveItems(items);render();toast(p.attendance==='yes'?'Явка подтверждена: полку начислено +50 (демо).':'Данные участника сохранены.');
    }
    const finish=e.target.closest('[data-finish]');if(finish){const items=getItems(),c=items.find(x=>x.id===finish.dataset.finish);if(!c)return;c.status='completed';c.participants.forEach(p=>{if(p.attendance==='yes'&&!p.ratingAwarded){p.ratingAwarded=true;p.ratingAward=50;}});saveItems(items);render();toast('Кампания завершена. Начисления рассчитаны в демонстрационном режиме.');}
  });
  render();
})();
