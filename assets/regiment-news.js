(function(){
'use strict';
(async()=>{
 try{
  await window.EMPIRE_AUTH.init();
  const auth=window.EMPIRE_AUTH,client=auth.client,user=auth.user;
  const name=new URLSearchParams(location.search).get('name')||'';
  const {data:reg,error:regError}=await client.from('empire_regiments').select('id,name').eq('name',name).maybeSingle();
  if(regError||!reg)return;
  const {data:membership,error}=user?await client.from('empire_regiment_members').select('role').eq('regiment_id',reg.id).eq('user_id',user.id).is('left_at',null).maybeSingle():{data:null,error:null};
  if(error)throw error;
  const canWrite=!!membership&&['commander','officer'].includes(membership.role);

  const list=document.getElementById('regimentNewsList');
  const actions=document.getElementById('regimentNewsActions');
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  if(actions&&canWrite){
    actions.innerHTML='<button type="button" class="btn primary regiment-news-write-button" id="regimentNewsWrite">✒ Написать</button>';
    actions.querySelector('#regimentNewsWrite').onclick=()=>{
      if(document.getElementById('regimentNewsEditor'))return;
      const form=document.createElement('div');
      form.id='regimentNewsEditor';
      form.className='regiment-news-editor';
      form.innerHTML='<form><label>Заголовок<input name="title" maxlength="140" required placeholder="Заголовок новости"></label><label>Текст новости<textarea name="body" rows="6" required placeholder="Текст новости..."></textarea></label><label>Изображение <span>(необязательно)</span><input name="image" type="url" placeholder="https://..."></label><div class="regiment-news-editor-actions"><button class="btn primary" type="submit">Опубликовать</button><button class="btn" type="button" data-cancel>Отмена</button></div></form>';
      actions.insertAdjacentElement('afterend',form);
      form.querySelector('[data-cancel]').onclick=()=>form.remove();
      form.querySelector('form').onsubmit=async e=>{
        e.preventDefault();
        const f=e.currentTarget,submit=f.querySelector('[type="submit"]');
        submit.disabled=true;submit.textContent='Публикация…';
        const {error}=await client.rpc('empire_publish_regiment_news',{p_regiment_id:reg.id,p_title:f.title.value,p_body:f.body.value,p_image_url:f.image.value});
        if(error){alert(error.message||'Не удалось опубликовать новость.');submit.disabled=false;submit.textContent='Опубликовать';return;}
        form.remove();await render();
      };
    };
  }

  async function render(){
    if(!list)return;
    const {data,error}=await client.from('empire_regiment_news').select('id,title,body,image_url,created_at,author_id,empire_profiles(display_name)').eq('regiment_id',reg.id).order('created_at',{ascending:false}).limit(5);
    if(error){list.innerHTML='<p class="empty-note">Не удалось загрузить новости полка.</p>';console.warn(error);return;}
    if(!data?.length){list.innerHTML='<p class="empty-note">Новостей полка пока нет.</p>';return;}
    list.innerHTML=data.map(n=>'<article class="regiment-news-item news-clickable"><div class="regiment-news-body"><div class="regiment-news-date">'+new Date(n.created_at).toLocaleDateString('ru-RU')+' · '+escape(n.empire_profiles?.display_name||'Участник')+'</div><h3>'+escape(n.title)+'</h3><p>'+escape(n.body).slice(0,220)+'</p></div></article>').join('');
  }
  await render();
 }catch(e){console.warn('Новости полка:',e);}
})();
})();