(function initProfile(){
 const form=document.getElementById('profileSettingsForm');if(!form)return;
 const name=document.getElementById('profileName'),motto=document.getElementById('profileMotto'),avatar=document.getElementById('profileAvatar'),note=document.getElementById('profileSaveNote'),avatarImg=document.getElementById('profileAvatarImage');
 let userId=null,currentAvatarUrl='';
 const setNote=(text,error=false)=>{if(!note)return;note.textContent=text;note.style.color=error?'#b94a48':'';if(text&&!error)setTimeout(()=>{note.textContent=''},2600)};
 const setPresence=online=>{const s=document.querySelector('.user-status');if(!s)return;s.dataset.presenceStatus=online?'online':'offline';s.innerHTML='<span class="status-dot"></span> '+(online?'В сети':'Не в сети')};
 const applyProfile=p=>{if(!p)return;if(name)name.value=p.username||'';if(motto)motto.value=p.motto||'';if(p.avatar_url){currentAvatarUrl=p.avatar_url;if(avatarImg)avatarImg.src=p.avatar_url}document.getElementById('profileDisplayName').textContent=p.username||'Пользователь';document.getElementById('profileDisplayMotto').textContent=p.motto||'—';setPresence(p.status!=='offline')};
 const client=window.EMPIRE_SUPABASE;if(!client){setNote('Не удалось подключить базу данных.',true);return}
 async function loadProfile(){
   const {data:{session}}=await client.auth.getSession();if(!session?.user){location.href='auth.html';return}userId=session.user.id;
   const {data:p,error}=await client.from('profiles').select('id,username,display_name,motto,avatar_url,status,created_at').eq('id',userId).single();
   if(error){console.error(error);setNote('Не удалось загрузить профиль.',true);return}
   applyProfile(p);document.getElementById('profileId').textContent='ID '+userId.slice(0,8).toUpperCase();document.getElementById('profileJoined').textContent=new Date(p.created_at).toLocaleDateString('ru-RU');
   const {data:m,error:me}=await client.from('regiment_members').select('member_role,joined_at,regiments(id,name,faction)').eq('user_id',userId);
   if(me){console.error(me);return}
   const current=m?.[0];if(current?.regiments){document.getElementById('profileRegiment').textContent=current.regiments.name;document.getElementById('profileFaction').textContent=current.regiments.faction;document.getElementById('profileMemberRole').textContent=({commander:'Командир',officer:'Офицер',soldier:'Солдат'}[current.member_role]||'Участник');document.getElementById('profileService').innerHTML='<div class="user-facts"><div><span>Полк</span><b><a href="regiment.html?id='+encodeURIComponent(current.regiments.id)+'">'+current.regiments.name+'</a></b></div><div><span>Фракция</span><b>'+current.regiments.faction+'</b></div><div><span>Роль</span><b>'+({commander:'Командир',officer:'Офицер',soldier:'Солдат'}[current.member_role]||'Участник')+'</b></div><div><span>В полку с</span><b>'+new Date(current.joined_at).toLocaleDateString('ru-RU')+'</b></div></div>'}else document.getElementById('profileService').textContent='Вы пока не состоите ни в одном полку.';
 }
 async function saveProfile(){
   if(!userId){setNote('Профиль ещё не загружен.',true);return}
   const updates={username:name.value.trim(),display_name:name.value.trim(),motto:motto.value.trim()};const file=avatar.files[0];
   if(file){if(file.size>10*1024*1024){setNote('Аватар должен быть не больше 10 МБ.',true);return}updates.avatar_url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)})}else if(currentAvatarUrl)updates.avatar_url=currentAvatarUrl;
   const {data,error}=await client.from('profiles').update(updates).eq('id',userId).select().single();if(error){setNote(error.code==='23505'?'Это имя пользователя уже занято.':'Не удалось сохранить профиль: '+error.message,true);return}currentAvatarUrl=data.avatar_url||'';applyProfile(data);setNote('Изменения сохранены в базе данных.')
 }
 form.addEventListener('submit',e=>{e.preventDefault();saveProfile()});document.querySelector('.avatar-edit')?.addEventListener('click',()=>avatar?.click());
 const sync=async online=>{setPresence(online);if(userId)await client.from('profiles').update({status:online?'online':'offline'}).eq('id',userId)};document.addEventListener('visibilitychange',()=>sync(document.visibilityState==='visible'));window.addEventListener('focus',()=>sync(true));window.addEventListener('blur',()=>sync(false));loadProfile();
})();