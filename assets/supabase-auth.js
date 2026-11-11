(function(){
  'use strict';
  const SUPABASE_URL='https://pbaojidktzjnpavtdcga.supabase.co';
  const SUPABASE_KEY='sb_publishable_XVsmd-U_ZF5eD-UcxMw31g_Yv9rUdVk';
  let client=null, ready=null, currentUser=null, currentProfile=null;
  const load=()=>new Promise((resolve,reject)=>{
    if(window.supabase&&window.supabase.createClient)return resolve();
    const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload=resolve;s.onerror=()=>reject(new Error('Не удалось загрузить библиотеку авторизации'));document.head.appendChild(s);
  });
  async function init(){
    if(ready)return ready;
    ready=(async()=>{await load();client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      const {data:{session}}=await client.auth.getSession();await sync(session);
      client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>sync(session),0);});
      return client;
    })();return ready;
  }
  async function sync(session){
    currentUser=session?.user||null;currentProfile=null;
    if(currentUser){
      const {data}=await client.from('empire_profiles').select('id,display_name,regiment,avatar_url').eq('id',currentUser.id).maybeSingle();
      currentProfile=data||{id:currentUser.id,display_name:currentUser.user_metadata?.display_name||currentUser.email?.split('@')[0]||'Игрок',regiment:'',avatar_url:''};
      try{localStorage.setItem('empire_current_user_v1',currentProfile.display_name);const old=JSON.parse(localStorage.getItem('empire_current_user')||'{}');const changed=old.name!==currentProfile.display_name||old.regiment!==(currentProfile.regiment||'');localStorage.setItem('empire_current_user',JSON.stringify({...old,name:currentProfile.display_name,regiment:currentProfile.regiment||''}));if(changed&&/battle|campaign|news/.test(location.pathname)&&sessionStorage.getItem('empire_auth_profile_synced')!=='1'){sessionStorage.setItem('empire_auth_profile_synced','1');location.reload();}}catch(e){}
    }
    if(currentUser){try{const pending=localStorage.getItem('empire_pending_avatar_v1');if(pending&&pending.startsWith('data:image/')){const blob=await (await fetch(pending)).blob();const ext=(blob.type.split('/')[1]||'png').replace('jpeg','jpg');const path=currentUser.id+'/'+Date.now()+'.'+ext;const uploaded=await client.storage.from('profile-avatars').upload(path,blob,{contentType:blob.type,upsert:true});if(!uploaded.error){const url=client.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl;await client.from('empire_profiles').update({avatar_url:url}).eq('id',currentUser.id);currentProfile={...currentProfile,avatar_url:url};localStorage.removeItem('empire_pending_avatar_v1');}}}catch(e){console.warn('Не удалось загрузить отложенный аватар:',e);}}
    window.EMPIRE_AUTH_STATE={user:currentUser,profile:currentProfile,client};
    document.dispatchEvent(new CustomEvent('empire:auth-changed',{detail:window.EMPIRE_AUTH_STATE}));
    updateHeader();
  }
  function updateHeader(){
    const link=document.querySelector('a.login');
    if(link){if(currentUser){link.textContent='♙ '+(currentProfile?.display_name||'Аккаунт');link.title='Нажмите, чтобы выйти';link.dataset.authSignout='1';}else{link.textContent='♙ Войти';link.removeAttribute('data-auth-signout');}}
    const cabinet=document.getElementById('personalCabinet');
    if(cabinet){cabinet.hidden=!currentUser;if(currentUser){const name=currentProfile?.display_name||'Пользователь';const label=document.getElementById('cabinetName');if(label)label.textContent=name;const avatar=document.getElementById('cabinetAvatar');if(avatar&&currentProfile?.avatar_url)avatar.src=currentProfile.avatar_url;const target=document.getElementById('cabinetProfileLink');if(target)target.href='profile.html?user='+encodeURIComponent(name);}}
  }
  async function signIn(email,password){await init();const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;}
  async function checkNameAvailable(displayName){await init();const name=String(displayName||'').trim();if(!name)throw new Error('Укажите никнейм.');const {data,error}=await client.from('empire_profiles').select('id').ilike('display_name',name).limit(1);if(error)throw error;return !data?.length;}
  async function signUp(email,password,displayName){await init();const name=String(displayName||'').trim();if(name.length<3||name.length>24)throw new Error('Никнейм должен содержать от 3 до 24 символов.');if(!/^[\p{L}\p{N}_ -]+$/u.test(name))throw new Error('В никнейме разрешены буквы, цифры, пробел, дефис и подчёркивание.');if(!(await checkNameAvailable(name)))throw new Error('Этот никнейм уже занят. Выберите другой.');const {data,error}=await client.auth.signUp({email:String(email).trim(),password,options:{data:{display_name:name}}});if(error){if(/duplicate|unique/i.test(error.message||''))throw new Error('Этот никнейм уже занят. Выберите другой.');throw error;}return data;}
  async function resetPassword(email){await init();const redirectTo=location.origin+location.pathname+'?mode=recovery';const {error}=await client.auth.resetPasswordForEmail(String(email).trim(),{redirectTo});if(error)throw error;}
  async function updatePassword(password){await init();const {error}=await client.auth.updateUser({password});if(error)throw error;}
  async function signOut(){await init();const {error}=await client.auth.signOut();if(error)throw error;}
  async function uploadAvatar(file){await init();if(!currentUser)throw new Error('Войдите в аккаунт');if(!file||!file.type.startsWith('image/'))throw new Error('Выберите файл изображения');if(file.size>5*1024*1024)throw new Error('Размер аватара не должен превышать 5 МБ');const ext=(file.type.split('/')[1]||'png').replace('jpeg','jpg');const path=currentUser.id+'/'+Date.now()+'.'+ext;const {error}=await client.storage.from('profile-avatars').upload(path,file,{contentType:file.type,upsert:true});if(error)throw error;const url=client.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl;await profilePatch({avatar_url:url});return url;}
  async function profilePatch(patch){await init();if(!currentUser)throw new Error('Войдите в аккаунт');const allowed={};['display_name','regiment','avatar_url'].forEach(k=>{if(k in patch)allowed[k]=patch[k];});const {error}=await client.from('empire_profiles').update(allowed).eq('id',currentUser.id);if(error)throw error;await sync({user:currentUser});}
  window.EMPIRE_AUTH={init,signIn,signUp,signOut,resetPassword,updatePassword,profilePatch,uploadAvatar,checkNameAvailable,get user(){return currentUser;},get profile(){return currentProfile;},get client(){return client;}};
  document.addEventListener('click',async e=>{const link=e.target.closest('[data-auth-signout]');if(!link)return;e.preventDefault();try{await signOut();location.reload();}catch(err){alert(err.message||'Не удалось выйти');}});
  init().catch(err=>console.error('Empire auth:',err));
})();