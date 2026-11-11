(async function(){
'use strict';
try{
  await window.EMPIRE_AUTH.init();
  const params=new URLSearchParams(location.search);
  const requested=params.get('user')||'Kalashnikov';
  const auth=window.EMPIRE_AUTH;
  let profile=null;
  if(auth.user&&auth.profile&&auth.profile.display_name.toLowerCase()===requested.toLowerCase())profile=auth.profile;
  else{
    const {data,error}=await auth.client.from('empire_profiles').select('id,display_name,regiment,avatar_url,created_at').ilike('display_name',requested).limit(1).maybeSingle();
    if(error)throw error;profile=data;
  }
  if(!profile)return;
  const name=profile.display_name||requested;
  document.title=name+' — EMPIRE';
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  set('profileName',name);
  set('profileRegiment',profile.regiment||'Без полка');
  set('profileRole','Солдат');
  const avatar=document.getElementById('profileAvatar');
  if(avatar&&profile.avatar_url){avatar.src=profile.avatar_url;avatar.alt='Аватар '+name;}
  const kicker=document.querySelector('.profile-main .page-kicker');
  if(kicker)kicker.textContent='ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ';
  if(auth.user&&auth.user.id===profile.id){
    const main=document.querySelector('.profile-main');
    if(main&&!document.getElementById('profileEditAvatar')){
      const wrap=document.createElement('label');wrap.id='profileEditAvatar';wrap.className='profile-avatar-edit';wrap.innerHTML='<span>Изменить аватар</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>';
      main.appendChild(wrap);
      wrap.querySelector('input').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const url=await auth.uploadAvatar(file);if(avatar)avatar.src=url;}catch(err){alert(err.message||'Не удалось загрузить аватар');}});
    }
    const note=document.createElement('p');note.className='profile-private-note';note.textContent='Ваш адрес электронной почты скрыт от других пользователей.';main.appendChild(note);
  }
}catch(error){console.warn('Не удалось загрузить профиль EMPIRE:',error);}
})();