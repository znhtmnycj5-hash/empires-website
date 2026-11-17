(async function(){
const K={requests:'empire_regiment_creation_requests_v1',approved:'empire_approved_regiments_v1',userReports:'empire_user_reports_v1',commentReports:'empire_comment_reports_v1',permanent:'empire_permanent_bans_v1',temporary:'empire_temporary_bans_v1',deletedRegiments:'empire_deleted_regiments_v1',deletedAlliances:'empire_deleted_alliances_v1'};
const ROLES={};

const read=(k,f=[])=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?f:v}catch(e){return f}},write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
// Remove legacy demo reports and requests previously inserted into this browser.
try{for(const k of ['empire_user_reports_v1','empire_comment_reports_v1']){const a=read(k);write(k,a.filter(x=>!String(x.id||'').startsWith('demo-')));}const q=read('empire_regiment_creation_requests_v1');write('empire_regiment_creation_requests_v1',q.filter(x=>!String(x.id||'').startsWith('demo-')));}catch(e){}
const loadingBox='<div class="admin-empty">Загрузка…</div>';
document.getElementById('adminStats').innerHTML=loadingBox;
for(const id of ['regimentRequests','userReports','commentReports','permanentBans','temporaryBans','allRegiments','allAlliances','siteUsers']){const el=document.getElementById(id);if(el)el.innerHTML=loadingBox;}
await window.EMPIRE_AUTH.init();
const auth=window.EMPIRE_AUTH;
const user=auth.profile?.display_name||'';
let isAdmin=false;
let initialRequestsPromise=Promise.resolve({data:[],error:null});
if(auth.user){
 const [adminResult,requestsResult]=await Promise.all([
  auth.client.from('empire_profiles').select('is_admin').eq('id',auth.user.id).maybeSingle(),
  auth.client.from('empire_regiment_creation_requests').select('id,user_name,name,faction,logo,status,created_at').order('created_at',{ascending:false})
 ]);
 isAdmin=!!adminResult.data?.is_admin;
 initialRequestsPromise=Promise.resolve(requestsResult);
}
if(!isAdmin){document.querySelector('main').innerHTML='<section class="card admin-access-denied"><div class="page-kicker">ДОСТУП ЗАПРЕЩЁН</div><h1>Панель управления</h1><p>У вашей учётной записи нет прав администратора или модератора.</p><a class="btn" href="index.html">Вернуться на главную</a></section>';return}
try{const {data:chief}=await auth.client.rpc('empire_master_is_chief');if(chief){const host=document.querySelector('.admin-hero > div');if(host)host.insertAdjacentHTML('beforeend','<p style="margin-top:14px"><a class="btn primary" href="master-admin.html">★ Панель главного администратора</a></p>');}}catch(e){console.warn('Проверка главного администратора недоступна до выполнения SQL:',e.message||e)}
let requestLoadError='';
const date=v=>{try{return new Date(v).toLocaleString('ru-RU')}catch(e){return String(v||'')}};
async function logAdminAction(target,action){try{const {error}=await auth.client.rpc('empire_admin_log_action',{p_target_name:String(target||'—'),p_action:String(action||'Действие')});if(error)throw error;await renderAdminActionLog();}catch(e){console.warn('Не удалось записать действие в журнал:',e.message||e);}}

function ban(key,target,reason,days,hours){const a=read(key),x={id:'ban-'+Date.now(),user:target,reason,createdAt:new Date().toISOString()};const durationMs=((Number(days)||0)*86400000)+((Number(hours)||0)*3600000);if(durationMs>0){x.until=new Date(Date.now()+durationMs).toISOString();x.days=Number(days)||0;x.hours=Number(hours)||0}a.push(x);write(key,a)}
let siteUsersCache=[];
function renderSiteUsersList(){
 const box=document.getElementById('siteUsers'),count=document.getElementById('siteUsersCount');
 if(!box||!count)return;
 const query=String(document.getElementById('siteUsersSearch')?.value||'').trim().toLocaleLowerCase('ru');
 const filtered=siteUsersCache.filter(u=>(u.display_name||'').toLocaleLowerCase('ru').includes(query)||(u.regiment||'').toLocaleLowerCase('ru').includes(query));
 count.textContent=filtered.length+(query?' / '+siteUsersCache.length:'');
 box.innerHTML=filtered.length?filtered.map(u=>{
  const avatar=u.avatar_url||'assets/default-soldier.jpg';
  const role=u.is_admin?'Администратор':u.is_moderator?'Модератор':'Пользователь';
  const profile='profile.html?user='+encodeURIComponent(u.id);
  return '<article class="admin-user-row"><a class="admin-user-link" href="'+profile+'"><img src="'+esc(avatar)+'" alt=""><div class="admin-user-main"><strong>'+esc(u.display_name)+'</strong><small>'+esc(u.regiment||'Без полка')+' · '+role+'</small></div><time>'+date(u.created_at)+'</time></a><div class="admin-user-actions"><button class="btn admin-danger" data-type="site-user" data-action="delete" data-id="'+esc(u.id)+'">Удалить с сайта</button></div></article>';
 }).join(''):'<div class="admin-empty">'+(query?'Ничего не найдено.':'Пользователей пока нет.')+'</div>';
}
async function renderSiteUsers(){
 const box=document.getElementById('siteUsers');
 if(!box)return;
 box.innerHTML='<div class="admin-empty">Загрузка пользователей…</div>';
 try{
  const client=window.EMPIRE_AUTH.client;
  let all=[],from=0;
  while(true){
   const {data,error}=await client.from('empire_profiles').select('id,display_name,regiment,avatar_url,created_at,is_admin,is_moderator').order('created_at',{ascending:false}).range(from,from+99);
   if(error)throw error;
   all=all.concat(data||[]);
   if(!data||data.length<100)break;
   from+=100;
  }
  siteUsersCache=all;renderSiteUsersList();
 }catch(e){
  document.getElementById('siteUsersCount').textContent='0';
  box.innerHTML='<div class="admin-empty">Не удалось загрузить список пользователей: '+esc(e.message||'ошибка доступа')+'</div>';
  console.error('Список пользователей:',e);
 }
}
async function renderAdminActionLog(){
 const box=document.getElementById('adminActionLog'),count=document.getElementById('adminActionLogCount');
 if(!box||!count)return;
 try{
  const {data,error}=await auth.client.from('empire_admin_action_log').select('id,actor_name,target_name,action,created_at').order('created_at',{ascending:false}).limit(200);
  if(error)throw error;
  count.textContent=(data||[]).length;
  box.innerHTML=data?.length?data.map(x=>'<div class="admin-log-row"><div><strong>'+esc(x.actor_name)+'</strong> <span>'+esc(x.action)+'</span> <b>'+esc(x.target_name)+'</b></div><time>'+date(x.created_at)+'</time></div>').join(''):'<div class="admin-empty">Действий пока нет.</div>';
 }catch(e){
  count.textContent='!';
  box.innerHTML='<div class="admin-empty">Не удалось загрузить историю. Проверьте, что выполнен SQL-файл управления пользователями.</div>';
  console.warn('История действий админов:',e);
}
}

function render(){
 const rq=read(K.requests).filter(x=>x.status==='pending'),ur=read(K.userReports).filter(x=>x.status==='pending'),cr=read(K.commentReports).filter(x=>x.status==='pending'),pb=read(K.permanent),tb=read(K.temporary);
 document.getElementById('adminStats').innerHTML=[['Заявки',rq.length],['Жалобы на пользователей',ur.length],['Жалобы на комментарии',cr.length],['Блокировок',pb.length+tb.length]].map(x=>'<div class="admin-stat card"><strong>'+x[1]+'</strong><span>'+x[0]+'</span></div>').join('');
 document.getElementById('regimentRequestsCount').textContent=rq.length;document.getElementById('userReportsCount').textContent=ur.length;document.getElementById('commentReportsCount').textContent=cr.length;document.getElementById('permanentBansCount').textContent=pb.length;document.getElementById('temporaryBansCount').textContent=tb.length;
 const requestState=window.__adminPages||(window.__adminPages={});const requestPages=Math.max(1,Math.ceil(rq.length/5));requestState.requests=Math.min(Math.max(1,requestState.requests||1),requestPages);const requestStart=(requestState.requests-1)*5;const visibleRequests=rq.slice(requestStart,requestStart+5);document.getElementById('regimentRequests').innerHTML=requestLoadError?'<div class="admin-empty">'+esc(requestLoadError)+'</div>':(visibleRequests.length?visibleRequests.map(r=>'<article class="admin-request"><img src="'+esc(r.logo)+'" alt=""><div class="admin-request-info"><h2>'+esc(r.name)+'</h2><p><b>Заявитель:</b> '+esc(r.user)+'</p><p><b>Фракция:</b> '+esc(r.faction)+'</p><small>'+date(r.createdAt)+'</small></div><div class="admin-request-actions"><button class="btn primary" data-type="request" data-action="approve" data-id="'+esc(r.id)+'">Принять</button><button class="btn admin-reject" data-type="request" data-action="reject" data-id="'+esc(r.id)+'">Отклонить</button></div></article>').join(''):'<div class="admin-empty">Новых заявок нет.</div>');if(!requestLoadError&&requestPages>1){document.getElementById('regimentRequests').insertAdjacentHTML('beforeend','<div class="admin-pagination"><button class="btn" data-type="page" data-pagekey="requests" data-page="'+(requestState.requests-1)+'" '+(requestState.requests===1?'disabled':'')+'>‹ Назад</button><span>Страница '+requestState.requests+' из '+requestPages+'</span><button class="btn" data-type="page" data-pagekey="requests" data-page="'+(requestState.requests+1)+'" '+(requestState.requests===requestPages?'disabled':'')+'>Вперёд ›</button></div>')};
 document.getElementById('userReports').innerHTML=ur.length?ur.map(r=>'<article class="admin-report"><div class="admin-report-main"><div class="admin-report-title"><span class="admin-badge">ЖАЛОБА</span><h3>'+esc(r.target)+'</h3></div><p><b>От:</b> '+esc(r.reporter)+' &nbsp; <b>Причина:</b> '+esc(r.reason)+'</p><p class="admin-report-details">'+esc(r.details||'')+'</p><small>'+date(r.createdAt)+'</small></div><div class="admin-report-actions"><button class="btn admin-warning" data-type="user-report" data-action="temp-ban-form" data-id="'+esc(r.id)+'">Бан на время</button><div class="admin-temp-form" id="temp-user-'+esc(r.id)+'" hidden><label>Дни<input type="number" min="0" max="3650" value="7" data-days></label><label>Часы<input type="number" min="0" max="23" value="0" data-hours></label><button class="btn admin-warning" data-type="user-report" data-action="temp-ban-confirm" data-id="'+esc(r.id)+'">Подтвердить бан</button></div><button class="btn admin-danger" data-type="user-report" data-action="perm-ban" data-id="'+esc(r.id)+'">Бан навсегда</button><button class="btn" data-type="user-report" data-action="dismiss" data-id="'+esc(r.id)+'">Отклонить</button></div></article>').join(''):'<div class="admin-empty">Новых жалоб нет.</div>';
 document.getElementById('commentReports').innerHTML=cr.length?cr.map(r=>'<article class="admin-report"><div class="admin-report-main"><div class="admin-report-title"><span class="admin-badge">КОММЕНТАРИЙ</span><h3>'+esc(r.target)+'</h3></div><p><b>От:</b> '+esc(r.reporter)+' &nbsp; <b>Причина:</b> '+esc(r.reason)+'</p><blockquote>'+esc(r.comment||'')+'</blockquote><small>'+esc(r.location||'')+' · '+date(r.createdAt)+'</small></div><div class="admin-report-actions"><button class="btn admin-danger" data-type="comment-report" data-action="delete-temp-form" data-id="'+esc(r.id)+'">Удалить + бан на время</button><div class="admin-temp-form" id="temp-comment-'+esc(r.id)+'" hidden><label>Дни<input type="number" min="0" max="3650" value="7" data-days></label><label>Часы<input type="number" min="0" max="23" value="0" data-hours></label><button class="btn admin-danger" data-type="comment-report" data-action="delete-temp-confirm" data-id="'+esc(r.id)+'">Подтвердить</button></div><button class="btn admin-danger-dark" data-type="comment-report" data-action="delete-perm" data-id="'+esc(r.id)+'">Удалить + бан навсегда</button><button class="btn" data-type="comment-report" data-action="dismiss" data-id="'+esc(r.id)+'">Отклонить</button></div></article>').join(''):'<div class="admin-empty">Новых жалоб нет.</div>';
 const banRow=(b,p)=>'<div class="admin-ban-row"><div><strong>'+esc(b.user)+'</strong><small>'+esc(b.reason||'Причина не указана')+'</small></div><div class="admin-ban-meta"><span>'+esc(p?'Навсегда':((b.days||0)+' дн. '+(b.hours||0)+' ч. · до '+date(b.until)))+'</span><button class="btn admin-unban" data-type="unban" data-key="'+esc(p?K.permanent:K.temporary)+'" data-id="'+esc(b.id)+'">Убрать бан</button></div></div>';
 document.getElementById('permanentBans').innerHTML=pb.length?pb.map(x=>banRow(x,true)).join(''):'<div class="admin-empty">Нет постоянных блокировок.</div>';
 document.getElementById('temporaryBans').innerHTML=tb.length?tb.map(x=>banRow(x,false)).join(''):'<div class="admin-empty">Нет временных блокировок.</div>';
 const base=[];
 const delR=read(K.deletedRegiments),seen=new Set(),regs=[...base.map(x=>[x[0],x[1]]),...read(K.approved).map(x=>[x.name,x.logo])].filter(x=>!seen.has(x[0])&&!delR.includes(x[0])&&(seen.add(x[0])||true));
 document.getElementById('regimentsCount').textContent=regs.length;
 const renderPaged=(containerId,items,pageKey,renderItem)=>{const state=window.__adminPages||(window.__adminPages={});const pages=Math.max(1,Math.ceil(items.length/5));state[pageKey]=Math.min(Math.max(1,state[pageKey]||1),pages);const start=(state[pageKey]-1)*5;document.getElementById(containerId).innerHTML=items.slice(start,start+5).map(renderItem).join('')||'<div class="admin-empty">Нет записей.</div>';if(pages>1){document.getElementById(containerId).insertAdjacentHTML('beforeend','<div class="admin-pagination"><button class="btn" data-type="page" data-pagekey="'+pageKey+'" data-page="'+(state[pageKey]-1)+'" '+(state[pageKey]===1?'disabled':'')+'>‹ Назад</button><span>Страница '+state[pageKey]+' из '+pages+'</span><button class="btn" data-type="page" data-pagekey="'+pageKey+'" data-page="'+(state[pageKey]+1)+'" '+(state[pageKey]===pages?'disabled':'')+'>Вперёд ›</button></div>')}};
 renderPaged('allRegiments',regs,'regiments',x=>'<div class="admin-object-row"><div class="admin-object-identity"><img src="'+esc(x[1])+'" alt=""><strong>'+esc(x[0])+'</strong></div><button class="btn admin-danger" data-type="regiment" data-name="'+esc(x[0])+'">Удалить с сайта</button></div>');
 const delA=read(K.deletedAlliances),all=window.EMPIRE_ALLIANCES.getAll().filter(x=>!delA.includes(x.id));document.getElementById('alliancesCount').textContent=all.length;renderPaged('allAlliances',all,'alliances',x=>'<div class="admin-object-row"><div class="admin-object-identity"><img src="'+esc(x.avatar||'assets/empire_logo_top_right.png')+'" alt=""><strong>'+esc(x.name)+'</strong><small>'+(x.members||[]).length+' полков</small></div><button class="btn admin-danger" data-type="alliance" data-id="'+esc(x.id)+'">Удалить с сайта</button></div>');
}
document.addEventListener('click',async e=>{const b=e.target.closest('button[data-type]');if(!b)return;const t=b.dataset.type,id=b.dataset.id,a=b.dataset.action;if(t==='page'){const state=window.__adminPages||(window.__adminPages={});state[b.dataset.pagekey]=Number(b.dataset.page);render();return}if(t==='unban'){const key=b.dataset.key,old=read(key).find(v=>v.id===id),a=read(key).filter(v=>v.id!==id);write(key,a);render();logAdminAction(old?.user||'Пользователь','Снята блокировка');return;}
 if(t==='site-user'){
  const target=siteUsersCache.find(x=>x.id===id);
  if(!target)return;
  const labels={admin:'назначить администратором',moderator:'назначить модератором',delete:'удалить пользователя'};
  if(!confirm('Вы действительно хотите '+labels[a]+' «'+target.display_name+'»?'))return;
  b.disabled=true;b.textContent='Выполняется…';
  try{
   const {error}=await auth.client.rpc('empire_admin_manage_user',{p_target_id:id,p_action:a});
   if(error)throw error;
   await renderSiteUsers();await renderAdminActionLog();
   alert(a==='delete'?'Пользователь удалён с сайта.':'Права пользователя изменены.');
  }catch(err){console.error('Управление пользователем:',err);alert(err.message||'Не удалось выполнить действие.');b.disabled=false;b.textContent=a==='admin'?'Назначить администратором':a==='moderator'?'Назначить модератором':'Удалить с сайта';}
  return;
 }
 if(t==='request'){const decision=a==='approve'?'approved':'rejected';b.disabled=true;b.textContent='Обработка…';try{const {data,error}=await auth.client.rpc('empire_admin_review_regiment_creation_request',{p_request_id:id,p_decision:decision});if(error)throw error;const {data:requests,error:loadError}=await auth.client.from('empire_regiment_creation_requests').select('id,user_name,name,faction,logo,status,created_at').order('created_at',{ascending:false});if(loadError)throw loadError;write(K.requests,(requests||[]).map(r=>({id:r.id,user:r.user_name,name:r.name,faction:r.faction,logo:r.logo,status:r.status,createdAt:r.created_at})));render();logAdminAction('заявка на создание полка','Заявка '+(decision==='approved'?'одобрена':'отклонена'));if(decision==='approved')alert('Заявка принята. Полк создан в общей базе, создатель назначен командиром.');}catch(error){console.error('Обработка заявки на создание полка:',error);alert(error.message||'Не удалось обработать заявку.');b.disabled=false;b.textContent=a==='approve'?'Принять':'Отклонить';}return}
 if(t==='user-report'){const x=read(K.userReports),i=x.findIndex(v=>v.id===id);if(i<0)return;const r=x[i];if(a==='temp-ban-form'){const el=document.getElementById('temp-user-'+id);if(el)el.hidden=!el.hidden;return}if(a==='temp-ban-confirm'){const el=document.getElementById('temp-user-'+id);if(!el)return;const days=Math.max(0,Math.min(3650,Number(el.querySelector('[data-days]').value)||0)),hours=Math.max(0,Math.min(23,Number(el.querySelector('[data-hours]').value)||0));if(days===0&&hours===0){alert('Укажите срок бана.');return}ban(K.temporary,r.target,r.reason,days,hours)}if(a==='perm-ban')ban(K.permanent,r.target,r.reason,null);r.status=a==='dismiss'?'dismissed':'resolved';r.decision=a;r.processedAt=new Date().toISOString();write(K.userReports,x);render();logAdminAction(r.target,a==='dismiss'?'Отклонена жалоба на пользователя':a==='perm-ban'?'Постоянная блокировка по жалобе':'Жалоба на пользователя обработана');return}
 if(t==='comment-report'){const x=read(K.commentReports),i=x.findIndex(v=>v.id===id);if(i<0)return;const r=x[i];if(a==='delete-temp-form'){const el=document.getElementById('temp-comment-'+id);if(el)el.hidden=!el.hidden;return}if(a==='delete-temp-confirm'){const el=document.getElementById('temp-comment-'+id);if(!el)return;const days=Math.max(0,Math.min(3650,Number(el.querySelector('[data-days]').value)||0)),hours=Math.max(0,Math.min(23,Number(el.querySelector('[data-hours]').value)||0));if(days===0&&hours===0){alert('Укажите срок бана.');return}ban(K.temporary,r.target,r.reason,days,hours)}if(a==='delete-perm')ban(K.permanent,r.target,r.reason,null);r.status=a==='dismiss'?'dismissed':'resolved';r.commentDeleted=a!=='dismiss';r.processedAt=new Date().toISOString();write(K.commentReports,x);render();logAdminAction(r.target,a==='dismiss'?'Отклонена жалоба на комментарий':a==='delete-perm'?'Удаление комментария и постоянная блокировка':'Жалоба на комментарий обработана');return}
 if(t==='regiment'){const n=b.dataset.name;if(!confirm('Удалить полк «'+n+'» со списка сайта?'))return;const x=read(K.deletedRegiments);if(!x.includes(n))x.push(n);write(K.deletedRegiments,x);write(K.approved,read(K.approved).filter(v=>v.name!==n));render();logAdminAction(n,'Полк удалён из списка сайта');return}
 if(t==='alliance'){const x=read(K.deletedAlliances);if(!x.includes(id))x.push(id);write(K.deletedAlliances,x);render();logAdminAction(id,'Союз удалён с сайта')}
});

try {
 const {data,error}=await initialRequestsPromise;
 if(error) throw error;
 requestLoadError='';
 write(K.requests,(data||[]).map(r=>({id:r.id,user:r.user_name,name:r.name,faction:r.faction,logo:r.logo,status:r.status,createdAt:r.created_at})));
} catch(error) {
 console.error('Заявки на создание полка:',error);
 requestLoadError='Не удалось загрузить заявки из Supabase: '+(error.message||'проверьте права доступа к таблице empire_regiment_creation_requests.');
}
render();
renderAdminActionLog();
const usersSearch=document.getElementById('siteUsersSearch');if(usersSearch)usersSearch.addEventListener('input',renderSiteUsersList);
// Загружаем полный список пользователей только когда администратор прокручивает страницу к этому разделу.
const usersSection=document.getElementById('siteUsers');
if(usersSection){
 let started=false;
 const startUsers=()=>{if(started)return;started=true;renderSiteUsers();};
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();startUsers();}},{rootMargin:'500px'});
  observer.observe(usersSection);
 }else startUsers();
}
})();