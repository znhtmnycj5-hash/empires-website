(async()=>{
  'use strict';
  const form=document.getElementById('createRegimentForm');
  const notice=document.getElementById('createRegimentNotice');
  const file=document.getElementById('regimentLogo');
  const preview=document.getElementById('regimentLogoPreview');
  if(!form)return;
  const setNotice=(message,type)=>{if(!notice)return;notice.hidden=false;notice.className='create-regiment-notice '+type;notice.textContent=message;};
  try{
    await window.EMPIRE_AUTH.init();
    const auth=window.EMPIRE_AUTH;
    if(!auth.user){
      form.innerHTML='<div class="create-regiment-blocked"><strong>Требуется авторизация</strong><p>Войдите в сообщество, чтобы создать полк.</p><a class="btn primary" href="register.html">Войти</a></div>';
      return;
    }
    const currentUser=auth.profile?.display_name||'Игрок';
    const {data:membership,error:membershipError}=await auth.client.from('empire_regiment_members')
      .select('empire_regiments(name)').eq('user_id',auth.user.id).is('left_at',null).limit(1).maybeSingle();
    if(membershipError)throw membershipError;
    const userRegiment=membership?.empire_regiments?.name||'';
    if(userRegiment){
      form.innerHTML='<div class="create-regiment-blocked"><strong>Создание полка недоступно</strong><p>Вы уже состоите в полку <b>'+String(userRegiment).replace(/[&<>"]/g,'')+'</b>. Сначала выйдите из текущего полка.</p><a class="btn" href="regiment.html?name='+encodeURIComponent(userRegiment)+'">Открыть полк</a></div>';
      return;
    }
    const REQUESTS_KEY='empire_regiment_creation_requests_v1';
    const getRequests=()=>{try{return JSON.parse(localStorage.getItem(REQUESTS_KEY)||'[]')}catch(e){return[]}};
    const saveRequests=x=>localStorage.setItem(REQUESTS_KEY,JSON.stringify(x));
    file?.addEventListener('change',()=>{
      const f=file.files?.[0];if(!f)return;
      if(!/^image\/(png|jpeg|webp|gif)$/.test(f.type)){setNotice('Можно загрузить только PNG, JPG, WEBP или GIF.','error');file.value='';return;}
      if(f.size>2*1024*1024){setNotice('Логотип должен быть не больше 2 МБ.','error');file.value='';return;}
      if(preview)preview.src=URL.createObjectURL(f);
    });
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const name=document.getElementById('regimentName').value.trim();
      const faction=document.getElementById('regimentFaction').value;
      const f=file?.files?.[0];
      if(!name||!faction||!f){setNotice('Заполните все поля и загрузите логотип.','error');return;}
      if(getRequests().some(r=>String(r.name||'').toLowerCase()===name.toLowerCase()&&r.status==='pending')){
        setNotice('Заявка на полк с таким названием уже находится на рассмотрении.','error');return;
      }
      const reader=new FileReader();
      reader.onload=()=>{
        const requests=getRequests();
        requests.push({id:'regreq-'+Date.now(),user:currentUser,user_id:auth.user.id,name,faction,logo:reader.result,status:'pending',createdAt:new Date().toISOString()});
        saveRequests(requests);form.reset();if(preview)preview.src='assets/default-soldier.jpg';
        setNotice('Заявка отправлена администратору. После проверки он примет или отклонит её.','success');
      };
      reader.readAsDataURL(f);
    });
  }catch(error){console.error(error);setNotice('Не удалось проверить членство в полку. Обновите страницу и попробуйте снова.','error');}
})();