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
    window.EMPIRE_AUTH_STATE={user:currentUser,profile:currentProfile,client};
    document.dispatchEvent(new CustomEvent('empire:auth-changed',{detail:window.EMPIRE_AUTH_STATE}));
    updateHeader();
  }
  function updateHeader(){
    const link=document.querySelector('a.login');
    if(!link)return;
    if(currentUser){link.textContent='♙ '+(currentProfile?.display_name||currentUser.email||'Аккаунт');link.title='Выйти из аккаунта';link.dataset.authSignout='1';}
    else{link.textContent='♙ Войти';link.removeAttribute('data-auth-signout');}
  }
  async function signIn(email,password){await init();const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;}
  async function signUp(email,password,displayName){await init();const {error}=await client.auth.signUp({email,password,options:{data:{display_name:displayName}}});if(error)throw error;}
  async function signOut(){await init();const {error}=await client.auth.signOut();if(error)throw error;}
  async function profilePatch(patch){await init();if(!currentUser)throw new Error('Войдите в аккаунт');const allowed={};['display_name','regiment','avatar_url'].forEach(k=>{if(k in patch)allowed[k]=patch[k];});const {error}=await client.from('empire_profiles').update(allowed).eq('id',currentUser.id);if(error)throw error;await sync({user:currentUser});}
  window.EMPIRE_AUTH={init,signIn,signUp,signOut,profilePatch,get user(){return currentUser;},get profile(){return currentProfile;},get client(){return client;}};
  document.addEventListener('click',async e=>{const link=e.target.closest('[data-auth-signout]');if(!link)return;e.preventDefault();try{await signOut();location.reload();}catch(err){alert(err.message||'Не удалось выйти');}});
  init().catch(err=>console.error('Empire auth:',err));
})();