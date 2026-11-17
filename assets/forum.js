(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{try{return new Date(v).toLocaleDateString('ru-RU',{day:'2-digit',month:'long',year:'numeric'});}catch(e){return '';}};
const params=()=>new URLSearchParams(location.search);
let auth=null, client=null, currentUser=null, currentProfile=null, staff=false;
const topicIcon='icon/i6.png', discussionIcon='icon/i5.png';

async function initAuth(){
  auth=await window.EMPIRE_AUTH.init();
  client=auth.client; currentUser=auth.user; currentProfile=auth.profile;
  try{
    if(currentUser){
      const q=await client.from('empire_profiles').select('is_admin,is_moderator').eq('id',currentUser.id).maybeSingle();
      staff=!!q.data?.is_admin||!!q.data?.is_moderator;
    }
  }catch(e){
    const raw=JSON.parse(localStorage.getItem('empire_current_user')||'null');
    const role=String(raw?.role||'').toLowerCase();
    staff=['admin','administrator','moderator'].includes(role);
  }
  if(!staff){
    const raw=JSON.parse(localStorage.getItem('empire_current_user')||'null');
    const role=String(raw?.role||'').toLowerCase();
    staff=['admin','administrator','moderator'].includes(role);
  }
}
function profileUrl(name){return 'profile.html?user='+encodeURIComponent(name||'');}
async function loadTopics(){
  const {data,error}=await client.from('empire_forum_topics').select('id,title,description,icon_url,created_at,updated_at').order('created_at',{ascending:true});
  if(error)throw error;
  const topics=data||[];
  const {data:discussions,error:de}=await client.from('empire_forum_discussions').select('id,topic_id,title,created_at,updated_at,views,last_comment_at,author_name').order('updated_at',{ascending:false});
  if(de)throw de;
  const rows=discussions||[];
  const enriched=await Promise.all(rows.map(async d=>{
    const {count,error:ce}=await client.from('empire_comments').select('id',{count:'exact',head:true}).eq('context_type','forum_discussion').eq('context_id',String(d.id));
    return {...d,comment_count:error?0:(count||0)};
  }));
  return topics.map(t=>({...t,discussions:enriched.filter(d=>String(d.topic_id)===String(t.id))}));
}
function renderTopicList(topics){
  const root=$('forumRoot');
  root.innerHTML=topics.length?topics.map(t=>'<section class="card forum-topic" data-topic="'+esc(t.id)+'">'+
    '<div class="forum-topic-head"><div class="forum-topic-title"><img src="'+esc(t.icon_url||topicIcon)+'" alt=""><div><h2>'+esc(t.title)+'</h2><p>'+esc(t.description||'')+'</p></div></div>'+
    (staff?'<button class="btn forum-topic-create" data-topic="'+esc(t.id)+'">＋ Создать тему</button>':'')+'</div>'+
    '<div class="forum-discussions">'+(t.discussions.length?t.discussions.map(d=>'<a class="forum-discussion-row" href="forum.html?discussion='+encodeURIComponent(d.id)+'">'+
      '<img src="'+discussionIcon+'" alt=""><div class="forum-discussion-main"><strong>'+esc(d.title)+'</strong><span>Автор: '+esc(d.author_name||'Пользователь')+' · '+fmt(d.updated_at||d.created_at)+'</span></div>'+
      '<div class="forum-discussion-stats"><span>💬 '+Number(d.comment_count||0)+'</span><span>◉ '+Number(d.views||0)+'</span></div></a>').join(''):'<div class="forum-empty">В этой теме пока нет обсуждений.</div>')+'</div></section>').join(''):'<section class="card forum-empty-card"><div class="forum-empty">Тем форума пока нет.</div></section>';
  bindTopicButtons();
}
function bindTopicButtons(){
  document.querySelectorAll('.forum-topic-create').forEach(btn=>btn.onclick=()=>openDiscussionForm(btn.dataset.topic));
}
function openDiscussionForm(topicId){
  const old=document.getElementById('forumDiscussionComposer');if(old)old.remove();
  const section=document.querySelector('.forum-topic[data-topic="'+CSS.escape(topicId)+'"]');
  const box=document.createElement('div');box.id='forumDiscussionComposer';box.className='forum-composer card';
  box.innerHTML='<div class="card-title">Новое обсуждение</div><form id="forumDiscussionForm"><label>Название обсуждения<input name="title" maxlength="140" required placeholder="Например: Первая модификация"></label><label>Описание<textarea name="body" maxlength="500" rows="3" placeholder="Коротко опишите, о чём обсуждение"></textarea></label><div class="forum-form-actions"><button class="btn primary" type="submit">Создать обсуждение</button><button class="btn" type="button" id="forumComposerCancel">Отмена</button></div></form>';
  (section||$('forumRoot')).prepend(box);
  $('forumComposerCancel').onclick=()=>box.remove();
  $('forumDiscussionForm').onsubmit=async e=>{
    e.preventDefault();const f=e.currentTarget,title=f.elements.title.value.trim(),body=f.elements.body.value.trim();if(!title)return;
    try{
      if(!currentUser)throw new Error('Чтобы создать обсуждение, войдите в аккаунт.');
      const {data,error}=await client.from('empire_forum_discussions').insert({topic_id:topicId,title,description:body,author_id:currentUser.id,author_name:currentProfile?.display_name||currentUser.email}).select('*').single();
      if(error)throw error;
      location.href='forum.html?discussion='+encodeURIComponent(data.id);
    }catch(err){alert(err.message||'Не удалось создать обсуждение.');}
  };
}
function renderDiscussion(d,comments){
  const root=$('forumRoot');
  const back='<a class="back-link forum-back" href="forum.html">← Вернуться к форуму</a>';
  root.innerHTML='<section class="card forum-discussion-detail"><div class="forum-detail-head"><div><div class="page-kicker">ФОРУМ · ОБСУЖДЕНИЕ</div><h1>'+esc(d.title)+'</h1><p>'+esc(d.description||'')+'</p><div class="forum-detail-meta">Автор: '+esc(d.author_name||'Пользователь')+' · '+fmt(d.created_at)+' · Просмотров: '+Number(d.views||0)+'</div></div></div>'+
    back+
    '<div class="forum-comments" id="forumComments">'+(comments.length?comments.map(renderComment).join(''):'<div class="forum-empty">Пока нет комментариев. Будьте первым.</div>')+'</div>'+
    '<div class="forum-comment-form-wrap">'+(currentUser?'<form id="forumCommentForm" class="forum-comment-form"><div class="forum-comment-toolbar"><button type="button" id="forumSmileButton" title="Выбрать смайл">☺</button></div><div id="forumCommentEditor" class="forum-comment-editor" contenteditable="true" data-placeholder="Напишите комментарий…"></div><div class="forum-form-actions"><button class="btn primary" type="submit">Опубликовать комментарий</button></div></form>':'<div class="forum-login-note">Чтобы комментировать обсуждение, <a href="register.html">войдите в аккаунт</a>.</div>')+'</div></section>';
  if(currentUser)bindCommentForm(d);
}
function sanitizeCommentHtml(html){
  const doc=new DOMParser().parseFromString(String(html||''),'text/html');
  const allowed=new Set(['B','STRONG','I','EM','U','BR','BLOCKQUOTE','IMG']);
  const walk=node=>[...node.childNodes].forEach(ch=>{
    if(ch.nodeType===Node.TEXT_NODE)return;
    if(ch.nodeType!==Node.ELEMENT_NODE||!allowed.has(ch.tagName)){const p=ch.parentNode;if(p){while(ch.firstChild)p.insertBefore(ch.firstChild,ch);p.removeChild(ch);}return;}
    const src=ch.getAttribute('src');
    [...ch.attributes].forEach(a=>ch.removeAttribute(a.name));
    if(ch.tagName==='IMG'){if(!src||!/^(https?:|assets\/)/i.test(src)){ch.remove();return;}ch.setAttribute('src',src);ch.setAttribute('alt','');ch.setAttribute('loading','lazy');if(/assets\/smile\//i.test(src))ch.className='clanwars-smile';}
    walk(ch);
  });
  walk(doc.body);return doc.body.innerHTML;
}
function renderComment(c){
  const html=sanitizeCommentHtml(c.content?.html||esc(c.content?.text||''));
  return '<article class="forum-comment" data-comment="'+esc(c.id)+'"><a class="forum-comment-avatar" href="'+profileUrl(c.author_name)+'"><img src="'+esc(c.content?.avatar||'assets/default-soldier.jpg')+'" alt=""></a><div class="forum-comment-body"><div class="forum-comment-head"><a href="'+profileUrl(c.author_name)+'">'+esc(c.author_name||'Пользователь')+'</a><time>'+fmt(c.created_at)+'</time></div><div class="forum-comment-text">'+html+'</div></div></article>';
}
async function loadComments(id){
  const {data,error}=await client.from('empire_comments').select('*').eq('context_type','forum_discussion').eq('context_id',String(id)).order('created_at',{ascending:true});
  if(error)throw error;return data||[];
}
function bindCommentForm(d){
  const form=$('forumCommentForm'),editor=$('forumCommentEditor'),smile=$('forumSmileButton');
  if(window.CLANWARS_SMILES&&smile)window.CLANWARS_SMILES.makePicker(smile,editor);
  form.onsubmit=async e=>{
    e.preventDefault();const html=editor.innerHTML.trim(),text=editor.textContent.trim();if(!text&&!html)return;
    const btn=form.querySelector('button[type="submit"]');btn.disabled=true;
    try{
      await window.EMPIRE_COMMENTS.create('forum_discussion',d.id,{text,html});
      await client.from('empire_forum_discussions').update({last_comment_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',d.id);
      editor.innerHTML='';await refreshDiscussion(d.id);
    }catch(err){alert(err.message||'Не удалось сохранить комментарий.');}
    finally{btn.disabled=false;}
  };
}
async function refreshDiscussion(id){
  const {data,error}=await client.from('empire_forum_discussions').select('*').eq('id',id).maybeSingle();
  if(error)throw error;if(!data)throw new Error('Обсуждение не найдено.');
  const comments=await loadComments(id);renderDiscussion(data,comments);
}
async function incrementViews(id){
  try{await client.rpc('increment_forum_discussion_views',{p_discussion_id:id});}
  catch(e){
    try{
      const {data}=await client.from('empire_forum_discussions').select('views').eq('id',id).maybeSingle();
      if(data)await client.from('empire_forum_discussions').update({views:Number(data.views||0)+1}).eq('id',id);
    }catch(_){}
  }
}
async function render(){
  const root=$('forumRoot');
  try{
    await initAuth();
    const id=params().get('discussion');
    if(id){await incrementViews(id);await refreshDiscussion(id);}
    else{renderTopicList(await loadTopics());}
  }catch(e){
    console.error('Forum:',e);
    root.innerHTML='<section class="card forum-error"><div class="page-kicker">ФОРУМ</div><h2>Не удалось загрузить форум</h2><p>'+esc(e.message||'Проверьте подключение к базе данных.')+'</p><a class="btn" href="index.html">Вернуться на главную</a></section>';
  }
}
document.addEventListener('DOMContentLoaded',render);
})();