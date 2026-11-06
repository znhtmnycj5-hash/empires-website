(function initProfile(){
  const form=document.getElementById('profileSettingsForm');
  if(!form)return;
  const name=document.getElementById('profileName');
  const motto=document.getElementById('profileMotto');
  const avatar=document.getElementById('profileAvatar');
  const note=document.getElementById('profileSaveNote');
  const avatarImg=document.querySelector('.user-avatar img');
  let userId=null;
  let currentAvatarUrl='';

  const setNote=(text,error=false)=>{
    if(!note)return;
    note.textContent=text;
    note.style.color=error?'#b94a48':'';
    if(text&&!error)setTimeout(()=>{note.textContent=''},2600);
  };
  const applyProfile=(profile)=>{
    if(!profile)return;
    if(profile.username)name.value=profile.username;
    if(profile.motto)motto.value=profile.motto;
    if(profile.avatar_url){currentAvatarUrl=profile.avatar_url;if(avatarImg)avatarImg.src=profile.avatar_url;}
    const h=document.querySelector('.user-identity h2');
    const m=document.querySelector('.user-motto');
    if(h)h.textContent=profile.username||'Пользователь';
    if(m)m.textContent=profile.motto||'«За честь и Империю»';
    setPresence(profile.status!=='offline');
  };
  const setPresence=(online)=>{
    const s=document.querySelector('.user-status');
    if(!s)return;
    s.dataset.presenceStatus=online?'online':'offline';
    s.innerHTML='<span class="status-dot"></span> '+(online?'В сети':'Не в сети');
  };
  const client=window.EMPIRE_SUPABASE;
  if(!client){setNote('Не удалось подключить базу данных.',true);return;}

  async function loadProfile(){
    const {data:{session}}=await client.auth.getSession();
    if(!session?.user){window.location.href='auth.html';return;}
    userId=session.user.id;
    const {data,error}=await client.from('profiles').select('id,username,display_name,motto,avatar_url,status').eq('id',userId).single();
    if(error){console.error(error);setNote('Не удалось загрузить профиль.',true);return;}
    applyProfile(data);
  }

  async function saveProfile(){
    if(!userId){setNote('Профиль ещё не загружен.',true);return;}
    const updates={username:name.value.trim(),display_name:name.value.trim(),motto:motto.value.trim()};
    const file=avatar.files[0];
    if(file){
      if(file.size>2*1024*1024){setNote('Аватар должен быть не больше 2 МБ.',true);return;}
      updates.avatar_url=await new Promise((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);
      });
    } else if(currentAvatarUrl){updates.avatar_url=currentAvatarUrl;}
    const {data,error}=await client.from('profiles').update(updates).eq('id',userId).select().single();
    if(error){console.error(error);setNote(error.code==='23505'?'Это имя пользователя уже занято.':('Не удалось сохранить профиль: '+error.message),true);return;}
    currentAvatarUrl=data.avatar_url||'';
    applyProfile(data);
    setNote('Изменения сохранены в базе данных.');
  }

  form.addEventListener('submit',async e=>{e.preventDefault();await saveProfile();});
  document.querySelector('.avatar-edit')?.addEventListener('click',()=>avatar?.click());
  const syncPresence=async online=>{
    setPresence(online);
    if(userId){await client.from('profiles').update({status:online?'online':'offline'}).eq('id',userId);}
  };
  document.addEventListener('visibilitychange',()=>syncPresence(document.visibilityState==='visible'));
  window.addEventListener('focus',()=>syncPresence(true));
  window.addEventListener('blur',()=>syncPresence(false));
  loadProfile();
})();