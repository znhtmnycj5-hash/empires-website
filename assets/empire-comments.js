(function(){
'use strict';
const URL='https://pbaojidktzjnpavtdcga.supabase.co',KEY='sb_publishable_XVsmd-U_ZF5eD-UcxMw31g_Yv9rUdVk';
const waitAuth=async()=>{for(let i=0;i<80;i++){if(window.EMPIRE_AUTH?.client)return window.EMPIRE_AUTH;await new Promise(r=>setTimeout(r,100));}throw new Error('Авторизация Supabase не загрузилась');};
const contextId=(type,id)=>String(id||'');
const toLocal=row=>({id:row.id,parentId:row.content?.parentId||null,name:row.author_name,author:row.author_name,regiment:row.author_regiment,avatar:row.content?.avatar||'',text:row.content?.text||'',html:row.content?.html||'',image:row.content?.image||'',time:row.created_at?new Date(row.created_at).toLocaleString('ru-RU'): '',date:row.created_at?new Date(row.created_at).toLocaleString('ru-RU'): '',createdAt:row.created_at,updatedAt:row.updated_at,_remote:true,_authorId:row.author_id});
const api={
 async list(type,id){const a=await waitAuth(),{data,error}=await a.client.from('empire_comments').select('*').eq('context_type',type).eq('context_id',contextId(type,id)).order('created_at',{ascending:true});if(error)throw error;return(data||[]).map(toLocal);},
 async create(type,id,item){const a=await waitAuth();if(!a.user)throw new Error('Чтобы комментировать, войдите в аккаунт.');const content={text:item.text||'',html:item.html||'',image:item.image||'',parentId:item.parentId||null,avatar:a.profile?.avatar_url||''};const {data,error}=await a.client.from('empire_comments').insert({context_type:type,context_id:contextId(type,id),author_id:a.user.id,author_name:a.profile?.display_name||a.user.email,author_regiment:a.profile?.regiment||'',content}).select('*').single();if(error)throw error;return toLocal(data);},
 async update(id,item){const a=await waitAuth();if(!a.user)throw new Error('Войдите в аккаунт.');const content={text:item.text||'',html:item.html||'',image:item.image||'',parentId:item.parentId||null,avatar:a.profile?.avatar_url||''};const {data,error}=await a.client.from('empire_comments').update({content}).eq('id',id).select('*').single();if(error)throw error;return toLocal(data);},
 async remove(id){const a=await waitAuth();const {error}=await a.client.from('empire_comments').delete().eq('id',id);if(error)throw error;},
 async upload(file){const a=await waitAuth();if(!a.user)throw new Error('Войдите в аккаунт, чтобы прикреплять файлы.');if(file.size>30*1024*1024)throw new Error('Максимальный размер файла — 30 МБ.');const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'');const path=a.user.id+'/'+Date.now()+'-'+crypto.randomUUID()+'.'+ext;const {error}=await a.client.storage.from('comment-media').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;return a.client.storage.from('comment-media').getPublicUrl(path).data.publicUrl;},
 async requireLogin(){const a=await waitAuth();if(!a.user){document.querySelector('a.login')?.click();throw new Error('Сначала войдите в аккаунт.');}}
};
window.EMPIRE_COMMENTS=api;
const style=document.createElement('style');style.textContent='.battle-comment-text img,.battle-comment-text video,.battle-comment-image{max-width:min(100%,320px);max-height:240px;object-fit:contain;border-radius:8px}.battle-comment-text audio{display:block;max-width:320px;width:100%;margin:8px 0}.empire-attach-menu{position:absolute;z-index:20;display:none;background:#171a20;border:1px solid #8e744b;border-radius:8px;padding:8px;gap:6px;box-shadow:0 8px 24px #0009}.empire-attach-menu.open{display:flex;flex-direction:column}.empire-comment-extra{position:relative;display:inline-flex;gap:6px}.empire-comment-extra button{min-width:34px;min-height:34px}.comment-edit-button{margin-right:6px}';document.head.appendChild(style);
function enhance(){
 document.querySelectorAll('.battle-comment-form').forEach(form=>{
  if(form.dataset.empireEnhanced)return;form.dataset.empireEnhanced='1';
  const toolbar=form.querySelector('.battle-comment-toolbar'),editor=form.querySelector('[contenteditable="true"]');if(!toolbar||!editor)return;
  const extra=document.createElement('span');extra.className='empire-comment-extra';
  const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.title='Добавить вложение';
  const mic=document.createElement('button');mic.type='button';mic.textContent='🎙';mic.title='Записать голосовое сообщение (до 20 секунд)';
  const menu=document.createElement('div');menu.className='empire-attach-menu';
  const image=document.createElement('button');image.type='button';image.textContent='Добавить изображение';
  const video=document.createElement('button');video.type='button';video.textContent='Добавить видео';
  const spoiler=document.createElement('button');spoiler.type='button';spoiler.textContent='Добавить спойлер';
  const file=document.createElement('input');file.type='file';file.accept='image/*,video/mp4,video/webm';file.hidden=true;
  menu.append(image,video,spoiler);extra.append(plus,mic,menu,file);toolbar.append(extra);
  plus.addEventListener('click',()=>menu.classList.toggle('open'));
  const addFile=async kind=>{file.accept=kind==='image'?'image/*':'video/mp4,video/webm';file.click();menu.classList.remove('open');};
  image.addEventListener('click',()=>addFile('image'));video.addEventListener('click',()=>addFile('video'));
  file.addEventListener('change',async()=>{const f=file.files?.[0];if(!f)return;try{await api.requireLogin();const url=await api.upload(f);editor.focus();document.execCommand('insertHTML',false,f.type.startsWith('image/')?'<img src="'+url+'" alt="Изображение" loading="lazy">':'<video src="'+url+'" controls preload="metadata"></video>');}catch(e){alert(e.message||'Не удалось загрузить файл');}finally{file.value='';}});
  spoiler.addEventListener('click',()=>{menu.classList.remove('open');const title=prompt('Название спойлера:');if(title===null)return;const body=prompt('Содержимое спойлера:');if(body===null)return;editor.focus();document.execCommand('insertHTML',false,'<details><summary>'+title.replace(/[&<>]/g,'')+'</summary>'+body.replace(/[&<>]/g,'')+'</details>');});
  let recorder=null,chunks=[],stopTimer=null;
  mic.addEventListener('click',async()=>{try{await api.requireLogin();if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Запись аудио не поддерживается этим браузером.');const stream=await navigator.mediaDevices.getUserMedia({audio:true});recorder=new MediaRecorder(stream);chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=async()=>{clearTimeout(stopTimer);stream.getTracks().forEach(t=>t.stop());try{const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});const f=new File([blob],'voice-'+Date.now()+'.webm',{type:blob.type});const url=await api.upload(f);editor.focus();document.execCommand('insertHTML',false,'<audio controls src="'+url+'"></audio>');}catch(e){alert(e.message||'Не удалось сохранить запись');}mic.textContent='🎙';};recorder.start();mic.textContent='■';stopTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},20000);mic.onclick=()=>{if(recorder?.state==='recording')recorder.stop();};}catch(e){alert(e.message||'Не удалось начать запись');}});
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
document.addEventListener('empire:auth-changed',enhance);
})();