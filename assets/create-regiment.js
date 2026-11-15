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
    // Проверяем членство без вложенного relation-запроса: он ломался при изменении схемы Supabase.
    const {data:membership,error:membershipError}=await auth.client.from('empire_regiment_members')
      .select('id,regiment_id').eq('user_id',auth.user.id).is('left_at',null).limit(1).maybeSingle();
    if(membershipError){
      console.warn('Не удалось проверить членство через empire_regiment_members:',membershipError);
    }
    let userRegiment='';
    if(membership?.regiment_id){
      const {data:regiment,error:regimentError}=await auth.client.from('empire_regiments')
        .select('name').eq('id',membership.regiment_id).maybeSingle();
      if(!regimentError)userRegiment=regiment?.name||'';
    }
    // Дополнительный источник для уже синхронизированного профиля.
    if(!userRegiment)userRegiment=String(auth.profile?.regiment||'').trim();
    if(userRegiment){
      form.innerHTML='<div class="create-regiment-blocked"><strong>Создание полка недоступно</strong><p>Вы уже состоите в полку <b>'+String(userRegiment).replace(/[&<>"]/g,'')+'</b>. Сначала выйдите из текущего полка.</p><a class="btn" href="regiment.html?name='+encodeURIComponent(userRegiment)+'">Открыть полк</a></div>';
      return;
    }
    const getRequests=async()=>{const {data,error}=await auth.client.from('empire_regiment_creation_requests').select('name,status').eq('status','pending');if(error)throw error;return data||[]};
    file?.addEventListener('change',()=>{
      const f=file.files?.[0];if(!f)return;
      if(!/^image\/(png|jpeg|webp|gif)$/.test(f.type)){setNotice('Можно загрузить только PNG, JPG, WEBP или GIF.','error');file.value='';return;}
      if(f.size>4*1024*1024){setNotice('Логотип должен быть не больше 4 МБ.','error');file.value='';return;}
      if(preview)preview.src=URL.createObjectURL(f);
    });
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const name=document.getElementById('regimentName').value.trim();
      const faction=document.getElementById('regimentFaction').value;
      const f=file?.files?.[0];
      if(!name||!faction||!f){setNotice('Заполните все поля и загрузите логотип.','error');return;}
      try{
        const requests=await getRequests();
        if(requests.some(r=>String(r.name||'').toLowerCase()===name.toLowerCase())){
          setNotice('Заявка на полк с таким названием уже находится на рассмотрении.','error');return;
        }
        const logo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Не удалось прочитать логотип.'));reader.readAsDataURL(f);});
        const {error}=await auth.client.from('empire_regiment_creation_requests').insert({user_id:auth.user.id,user_name:currentUser,name,faction,logo,status:'pending'});
        if(error)throw error;
        form.reset();if(preview)preview.src='assets/default-soldier.jpg';
        setNotice('Заявка отправлена администратору. После проверки он примет или отклонит её.','success');
      }catch(error){console.error('Заявка на создание полка:',error);setNotice(error.message||'Не удалось отправить заявку.','error');}
    });
  }catch(error){console.error(error);setNotice('Не удалось проверить членство в полку. Обновите страницу и попробуйте снова.','error');}
})();