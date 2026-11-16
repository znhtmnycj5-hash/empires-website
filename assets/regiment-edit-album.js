(async function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const factions=['Австрийская Империя','Французская Империя','Российская Империя','Британская Империя','Пруссия','Рейнский Союз'];
const params=new URLSearchParams(location.search), requestedName=params.get('name')||'';
const controls=$('albumCommanderControls'), grid=$('albumGrid');
try{
 await window.EMPIRE_AUTH.init();
 const auth=window.EMPIRE_AUTH, client=auth.client;
 const {data:reg,error}=await client.from('empire_regiments').select('id,name,faction,logo_url,commander_id').eq('name',requestedName).maybeSingle();
 if(error)throw error;if(!reg)return;
 const {data:members,error:memberError}=await client.from('empire_regiment_members').select('user_id,role').eq('regiment_id',reg.id).is('left_at',null);
 if(memberError)throw memberError;
 const mine=(members||[]).find(m=>m.user_id===auth.user?.id);
 const commander=!!auth.user&&(reg.commander_id===auth.user.id||mine?.role==='commander');
 const canUpload=commander||mine?.role==='officer';
 const bucket=client.storage.from('regiment-media');
 const uploadFile=async(file,prefix)=>{
   if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw new Error('Поддерживаются JPG, PNG, WEBP и GIF.');
   if(file.size>8*1024*1024)throw new Error('Размер изображения не должен превышать 8 МБ.');
   const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
   const path=reg.id+'/'+prefix+'-'+crypto.randomUUID()+'.'+ext;
   const {error}=await bucket.upload(path,file,{contentType:file.type,upsert:false});
   if(error)throw error;
   return {path,url:bucket.getPublicUrl(path).data.publicUrl};
 };
 const renderAlbum=async()=>{
   const {data:items,error}=await client.from('empire_regiment_album').select('id,image_url,title,storage_path,created_at').eq('regiment_id',reg.id).order('created_at',{ascending:false});
   if(error)throw error;
   grid.innerHTML='';
   if(!items?.length){grid.innerHTML='<p class="empty-note album-empty-note">В альбоме пока нет скриншотов.</p>';return;}
   items.forEach(item=>{
     const card=document.createElement('div');card.className='album-item';
     const link=document.createElement('a');link.href=item.image_url;link.target='_blank';link.rel='noopener';
     const img=document.createElement('img');img.src=item.image_url;img.alt=item.title||'Скриншот полка';img.loading='lazy';link.append(img);card.append(link);
     if(canUpload){const del=document.createElement('button');del.type='button';del.className='album-delete-button';del.textContent='×';del.title='Удалить скриншот';del.addEventListener('click',async()=>{
       if(!confirm('Удалить этот скриншот из альбома?'))return;
       const {error:removeError}=await bucket.remove([item.storage_path]);if(removeError){alert(removeError.message);return;}
       const {error:rowError}=await client.from('empire_regiment_album').delete().eq('id',item.id);if(rowError){alert(rowError.message);return;}await renderAlbum();
     });card.append(del);}
     grid.append(card);
   });
 };
 if(controls){
   controls.innerHTML='';
   if(canUpload){
     controls.innerHTML='<label class="album-upload-button">+ Добавить скриншоты<input id="regimentAlbumUpload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden></label>';
     $('regimentAlbumUpload').addEventListener('change',async e=>{
       const files=Array.from(e.target.files||[]);if(!files.length)return;
       const label=e.target.closest('label');label.style.opacity='.6';
       try{
         for(const file of files){
           const uploaded=await uploadFile(file,'album');
           const {error:insertError}=await client.from('empire_regiment_album').insert({regiment_id:reg.id,storage_path:uploaded.path,image_url:uploaded.url,title:file.name,uploaded_by:auth.user.id});
           if(insertError){await bucket.remove([uploaded.path]);throw insertError;}
         }
         await renderAlbum();
       }catch(err){alert(err.message||'Не удалось загрузить скриншоты.');}
       finally{label.style.opacity='1';e.target.value='';}
     });
   }
 }
 if(commander){
   const edit=document.createElement('button');edit.type='button';edit.className='btn regiment-edit-button';edit.textContent='Редактировать полк';
   const info=document.querySelector('.regiment-main-copy');
   const area=document.createElement('div');area.className='regiment-edit-controls';area.append(edit);info.append(area);
   edit.addEventListener('click',()=>{
     const old=document.getElementById('regimentEditDialog');if(old)old.remove();
     const dialog=document.createElement('dialog');dialog.id='regimentEditDialog';dialog.className='regiment-edit-dialog';
     dialog.innerHTML='<form method="dialog" class="regiment-edit-form"><h2>Редактировать полк</h2><label>Название полка<input name="name" maxlength="60" required value="'+esc(reg.name)+'"></label><label>Фракция<select name="faction">'+factions.map(f=>'<option '+(f===reg.faction?'selected':'')+'>'+esc(f)+'</option>').join('')+'</select></label><label>Логотип полка<input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><div class="regiment-edit-actions"><button type="button" class="btn" data-cancel>Отмена</button><button type="submit" class="btn primary">Сохранить</button></div><p class="regiment-edit-notice" aria-live="polite"></p></form>';
     document.body.append(dialog);dialog.showModal();
     dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
     dialog.querySelector('form').onsubmit=async ev=>{
       ev.preventDefault();const form=ev.currentTarget,submit=form.querySelector('[type=submit]'),notice=form.querySelector('.regiment-edit-notice');
       submit.disabled=true;notice.textContent='Сохранение…';
       try{
         let logoUrl=reg.logo_url||'';
         const file=form.elements.logo.files[0];
         if(file){const up=await uploadFile(file,'logo');logoUrl=up.url;}
         const {error:updateError}=await client.rpc('empire_update_regiment',{p_regiment_id:reg.id,p_name:form.elements.name.value.trim(),p_faction:form.elements.faction.value,p_logo_url:logoUrl});
         if(updateError)throw updateError;
         location.href='regiment.html?name='+encodeURIComponent(form.elements.name.value.trim());
       }catch(err){notice.textContent=err.message||'Не удалось сохранить изменения.';submit.disabled=false;}
     };
   });
 }
 await renderAlbum();
}catch(err){console.error('Управление полком и альбомом:',err);if(controls)controls.innerHTML='<span class="album-commander-note">Не удалось загрузить управление альбомом</span>';}
})();