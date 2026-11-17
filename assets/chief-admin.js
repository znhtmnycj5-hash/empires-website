(async function(){
const box=document.getElementById('chiefStaffList'),count=document.getElementById('chiefStaffCount'),logBox=document.getElementById('chiefAdminLog');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{try{return new Date(v).toLocaleString('ru-RU')}catch(e){return String(v||'')}};
await window.EMPIRE_AUTH.init();
const auth=window.EMPIRE_AUTH;
if(!auth.user){document.querySelector('main').innerHTML='<section class="card admin-access-denied"><h1>Требуется вход</h1><p>Войдите в аккаунт Commander.</p><a class="btn" href="index.html#openLogin">Войти</a></section>';return;}
try{
 const {data:isChief,error:checkError}=await auth.client.rpc('empire_master_is_chief');
 if(checkError)throw checkError;
 if(!isChief){document.querySelector('main').innerHTML='<section class="card admin-access-denied"><div class="page-kicker">ДОСТУП ЗАПРЕЩЁН</div><h1>Главный администратор</h1><p>Эта панель доступна только аккаунту Commander.</p><a class="btn" href="index.html">На главную</a></section>';return;}
 async function load(){
  box.innerHTML='<div class="admin-empty">Загрузка администрации…</div>';
  const {data,error}=await auth.client.rpc('empire_master_list_staff');
  if(error)throw error;
  count.textContent=(data||[]).length;
  box.innerHTML=data?.length?data.map(u=>{
   const role=u.is_admin?'Администратор':'Модератор';
   const action=u.is_admin?'remove_admin':'remove_moderator';
   const label=u.is_admin?'Снять с должности администратора':'Снять с должности модератора';
   return '<article class="admin-user-row chief-staff-row"><div class="admin-user-link"><div class="chief-staff-emblem">'+(u.is_admin?'★':'✦')+'</div><div class="admin-user-main"><strong>'+esc(u.display_name)+'</strong><small>'+role+'</small></div></div><div class="admin-user-actions"><button class="btn admin-danger" data-staff-id="'+esc(u.id)+'" data-staff-action="'+action+'" data-staff-name="'+esc(u.display_name)+'">'+label+'</button></div></article>';
  }).join(''):'<div class="admin-empty">Администраторов и модераторов пока нет.</div>';
 }
 async function loadLog(){
  const {data,error}=await auth.client.from('empire_admin_action_log').select('actor_name,target_name,action,created_at').order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  logBox.innerHTML=data?.length?data.map(x=>'<div class="admin-log-row"><div><strong>'+esc(x.actor_name)+'</strong> <span>'+esc(x.action)+'</span> <b>'+esc(x.target_name)+'</b></div><time>'+date(x.created_at)+'</time></div>').join(''):'<div class="admin-empty">Записей пока нет.</div>';
 }
 box.addEventListener('click',async e=>{
  const b=e.target.closest('button[data-staff-action]');if(!b)return;
  const name=b.dataset.staffName,action=b.dataset.staffAction;
  if(!confirm('Снять с должности пользователя «'+name+'»?'))return;
  b.disabled=true;b.textContent='Выполняется…';
  try{
   const {error}=await auth.client.rpc('empire_master_manage_staff',{p_target_id:b.dataset.staffId,p_action:action});
   if(error)throw error;
   await load();await loadLog();
  }catch(err){alert(err.message||'Не удалось изменить должность.');b.disabled=false;b.textContent=action==='remove_admin'?'Снять с должности администратора':'Снять с должности модератора';}
 });
 await load();await loadLog();
}catch(e){
 console.error('Главная админ-панель:',e);
 box.innerHTML='<div class="admin-empty">Не удалось проверить доступ или загрузить данные. Сначала выполните SQL-файл chief_admin.sql в Supabase. Подробности: '+esc(e.message||'ошибка')+'</div>';
 count.textContent='!';
}
})();