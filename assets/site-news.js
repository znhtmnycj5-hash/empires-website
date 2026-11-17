
const escapeRichComment=value=>String(value??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const cleanRichComment=html=>{
 const doc=new DOMParser().parseFromString(String(html||""),"text/html"),allowed=new Set(["B","STRONG","I","EM","U","BLOCKQUOTE","BR","SPAN","IMG","VIDEO","AUDIO","DETAILS","SUMMARY"]);
 const safeUrl=value=>{try{const u=new URL(String(value||""),location.href);return ["http:","https:"].includes(u.protocol)?u.href:"";}catch(e){return "";}};
 const walk=node=>[...node.childNodes].forEach(ch=>{
  if(ch.nodeType===Node.TEXT_NODE)return;
  if(ch.nodeType!==Node.ELEMENT_NODE||!allowed.has(ch.tagName)){const p=ch.parentNode;if(p){while(ch.firstChild)p.insertBefore(ch.firstChild,ch);p.removeChild(ch);}return;}
  const originalSrc=ch.getAttribute("src"),isSpoiler=ch.dataset.spoiler==="true";
  [...ch.attributes].forEach(a=>ch.removeAttribute(a.name));
  if(ch.tagName==="IMG"||ch.tagName==="VIDEO"||ch.tagName==="AUDIO"){const src=safeUrl(originalSrc);if(!src){ch.remove();return;}ch.setAttribute("src",src);if(ch.tagName==="IMG"){ch.setAttribute("alt","Вставленная картинка");ch.setAttribute("loading","lazy");if(/(?:^|\/)smile\//i.test(src)||/assets\/smile\//i.test(src))ch.setAttribute("class","clanwars-smile");}else{ch.setAttribute("controls","");ch.setAttribute("preload","metadata");}}
  if(ch.tagName==="SPAN"&&!isSpoiler){ch.replaceWith(...ch.childNodes);return;}
  if(ch.tagName==="SPAN"&&isSpoiler)ch.setAttribute("data-spoiler","true");walk(ch);
 });walk(doc.body);return doc.body.innerHTML;
};
const richCommentHtml=c=>c.html?cleanRichComment(c.html):escapeRichComment(c.text||"").replace(/\n/g,"<br>");
const bindRichEditor=(form,editor)=>{
 const toolbar=form.querySelector(".battle-comment-toolbar");let savedRange=null;
 editor.addEventListener("keyup",save);editor.addEventListener("mouseup",save);editor.addEventListener("input",save);
 function save(){const sel=getSelection();if(sel&&sel.rangeCount&&editor.contains(sel.anchorNode))savedRange=sel.getRangeAt(0).cloneRange();}
 function restore(){editor.focus();const sel=getSelection();if(savedRange){sel.removeAllRanges();sel.addRange(savedRange);}else{const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);sel.removeAllRanges();sel.addRange(r);}}
 function insert(html){restore();document.execCommand("insertHTML",false,html);save();}
 toolbar.addEventListener("mousedown",e=>{if(e.target.closest("[data-editor-command]"))e.preventDefault();});
 toolbar.addEventListener("click",e=>{const b=e.target.closest("[data-editor-command]");if(!b)return;const cmd=b.dataset.editorCommand;restore();
  if(["bold","italic","underline"].includes(cmd))document.execCommand(cmd,false,null);
  else if(cmd==="quote")document.execCommand("formatBlock",false,"blockquote");
  else if(cmd==="spoiler"){const sel=getSelection(),txt=sel&&sel.toString();insert('<span data-spoiler="true">'+(txt?escapeRichComment(txt):"Спойлер")+'</span>');}
  else if(cmd==="image"){const url=prompt("Вставьте прямую ссылку на картинку:");if(url&&/^https?:\/\//i.test(url.trim()))insert('<img src="'+escapeRichComment(url.trim())+'" alt="Вставленная картинка">');}
  else if(cmd==="video"){const url=prompt("Вставьте прямую ссылку на видео:");if(url&&/^https?:\/\//i.test(url.trim()))insert('<video src="'+escapeRichComment(url.trim())+'" controls preload="metadata"></video>');}
  save();
 });
};
const richToolbarHtml='<div class="battle-comment-toolbar" role="toolbar" aria-label="Комментарий"></div>';
(function(){
'use strict';
const NEWS_KEY='empire_site_news_v1';
const LIKES_KEY='empire_site_news_interests_v1';
const COMMENTS_KEY='empire_news_comments_v1';
const DELETED_KEY='empire_site_news_deleted_v1';
const $=id=>document.getElementById(id);
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v;}catch(e){return fallback;}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const hasCurrentUser=!!read('empire_current_user',null);
let user=(()=>{const v=read('empire_current_user',null);return v&&typeof v==='object'?{name:String(v.name||'Пользователь'),regiment:String(v.regiment||''),role:String(v.role||'user')}:{name:'Kalashnikov',regiment:'',role:'user'};})();
let role=user.role.toLowerCase();
let canPublish=['admin','administrator','moderator','commander','officer'].includes(role);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatar=name=>window.empireUserAvatar?window.empireUserAvatar(name):'assets/default-soldier.jpg';
const commentAuthorMeta=name=>({regiment:'Без полка',online:false});
async function refreshSiteNewsCommentPresence(news){
 try{
  if(!news||!window.EMPIRE_AUTH?.init)return;
  const auth=await window.EMPIRE_AUTH.init(),client=auth?.client;
  if(!client)return;
  const map=getComments(),arr=Array.isArray(map[news.id])?map[news.id]:[];
  if(!arr.length)return;
  const ids=[...new Set(arr.map(c=>c._authorId).filter(Boolean).map(String))];
  const names=[...new Set(arr.filter(c=>!c._authorId).map(c=>String(c.author||'').trim()).filter(Boolean))];
  let profiles=[];
  if(ids.length){
   const q=await client.from('empire_profiles').select('id,display_name,regiment,last_seen_at').in('id',ids);
   if(q.error)throw q.error;
   profiles.push(...(q.data||[]));
  }
  if(names.length){
   const q=await client.from('empire_profiles').select('id,display_name,regiment,last_seen_at').in('display_name',names);
   if(q.error)throw q.error;
   const known=new Set(profiles.map(p=>String(p.id)));
   profiles.push(...(q.data||[]).filter(p=>!known.has(String(p.id))));
  }
  const byId=new Map(profiles.map(p=>[String(p.id),p]));
  const byName=new Map(profiles.map(p=>[String(p.display_name||'').trim().toLowerCase(),p]));
  const cutoff=Date.now()-5*60*1000;
  let changed=false;
  arr.forEach(c=>{
   const p=c._authorId?byId.get(String(c._authorId)):byName.get(String(c.author||'').trim().toLowerCase());
   const online=!!p?.last_seen_at&&Date.parse(p.last_seen_at)>=cutoff;
   const regiment=String(p?.regiment||c.regiment||'Без полка');
   if(c.online!==online||String(c.regiment||'')!==regiment){c.online=online;c.regiment=regiment;changed=true;}
  });
  if(changed){map[news.id]=arr;write(COMMENTS_KEY,map);renderComments(news);}
 }catch(e){console.warn('Site news comment presence:',e);}
}
const profile=name=>window.empireProfileUrl?window.empireProfileUrl(name):'profile.html?user='+encodeURIComponent(name);
const LEGACY_TEST_NEWS_IDS=['site-news-001','site-news-002','site-news-003'];
const getNews=()=>{let v=read(NEWS_KEY,null);if(!Array.isArray(v))v=[];v=v.filter(x=>x&&x.id&&!/^site-news-test-/.test(String(x.id))&&!LEGACY_TEST_NEWS_IDS.includes(String(x.id)));write(NEWS_KEY,v);const deleted=read(DELETED_KEY,[]);return v.filter(x=>x&&x.id&&!deleted.includes(x.id)).sort((a,b)=>(Number(b.created)||0)-(Number(a.created)||0));};
let remoteNewsReady=false;
const mapRemoteNews=row=>({id:String(row.legacy_id||row.id),title:row.title,date:row.created_at?new Date(row.created_at).toLocaleDateString('ru-RU'):'',author:row.author_name||'Пользователь',roleLabel:row.role_label||'Участник',image:row.image_url||'assets/battlefield.jpg',body:row.body,created:row.created_at?new Date(row.created_at).getTime():Date.now(),updated:row.updated_at?new Date(row.updated_at).getTime():Date.now(),_remoteId:row.id,author_id:row.author_id});
async function syncSiteNewsRemote(){
  try{
    if(!window.EMPIRE_AUTH)return;
    const client=await window.EMPIRE_AUTH.init(), current=window.EMPIRE_AUTH.user;
    if(!client)return;
    const local=getNews();
    const currentName=String(window.EMPIRE_AUTH.profile?.display_name||user.name||current?.email||'').trim();
    const currentAliases=new Set([currentName,user.name,'Kalash','Kalashnikov'].map(x=>String(x||'').trim().toLowerCase()).filter(Boolean));
    const own=current&&local.length
      ? local.filter(x=>currentAliases.has(String(x.author||'').trim().toLowerCase()))
      : [];
    if(current&&own.length){
      const ids=[...new Set(own.map(x=>String(x.id)))];
      const {data:existing}=await client.from('empire_site_news').select('legacy_id').in('legacy_id',ids);
      const known=new Set((existing||[]).map(x=>String(x.legacy_id)));
      for(const item of own.filter(x=>!known.has(String(x.id)))){
        const {error:insertError}=await client.from('empire_site_news').insert({
          legacy_id:String(item.id),
          author_id:current.id,
          title:item.title,
          body:item.body,
          image_url:item.image||'',
          role_label:item.roleLabel||'Участник',
          created_at:new Date(Number(item.created)||Date.now()).toISOString(),
          updated_at:new Date(Number(item.updated||item.created)||Date.now()).toISOString()
        });
        if(insertError)console.warn('Site news migration:',insertError);
      }
    }
    const {data,error}=await client.from('empire_site_news').select('id,legacy_id,author_id,title,body,image_url,role_label,created_at,updated_at').order('created_at',{ascending:false});
    if(error)throw error;
    if(Array.isArray(data)){
      const authorIds=[...new Set(data.map(x=>x.author_id).filter(Boolean))];
      let profiles=[];
      if(authorIds.length){const p=await client.from('empire_profiles').select('id,display_name').in('id',authorIds);profiles=p.data||[];}
      const names=new Map(profiles.map(x=>[String(x.id),x.display_name]));
      const mapped=data.map(x=>({...mapRemoteNews(x),author:names.get(String(x.author_id))||x.author_name||'Пользователь'}));
      const remoteIds=new Set(mapped.map(x=>String(x.id)));
      const localFallback=local.filter(x=>!remoteIds.has(String(x.id)));
      const merged=[...mapped,...localFallback].sort((a,b)=>(Number(b.created)||0)-(Number(a.created)||0));
      // Do not wipe local news if the remote table is temporarily empty.
      if(mapped.length||localFallback.length){
        // Keep every local news item that is not represented remotely, including Kalash/Kalashnikov legacy items.
        write(NEWS_KEY,merged);
      }
      remoteNewsReady=true;
      renderHome();
      renderPage();
    }
  }catch(e){console.warn('Site news remote sync:',e);}
}
const getLikes=()=>read(LIKES_KEY,{})||{};
const getComments=()=>read(COMMENTS_KEY,{})||{};
try{const cm=getComments();Object.keys(cm).filter(k=>/^site-news-test-/.test(k)||LEGACY_TEST_NEWS_IDS.includes(k)||k==='sample-4').forEach(k=>delete cm[k]);write(COMMENTS_KEY,cm);const lk=getLikes();Object.keys(lk).filter(k=>/^site-news-test-/.test(k)||LEGACY_TEST_NEWS_IDS.includes(k)).forEach(k=>delete lk[k]);write(LIKES_KEY,lk);}catch(e){}
const fmtDate=()=>new Date().toLocaleDateString('ru-RU');
const likeMarkup=n=>{const names=Array.isArray(getLikes()[n.id])?getLikes()[n.id]:[];const preview=names.slice(0,4).map(x=>'<a href="'+esc(profile(x))+'">'+esc(x)+'</a>').join(', ');return '<div class="site-news-interest" data-news-id="'+esc(n.id)+'"><button type="button" class="site-news-interest-btn '+(names.includes(user.name)?'is-active':'')+'" data-interest="'+esc(n.id)+'">✦ Интересно <b>'+names.length+'</b></button><div class="site-news-interest-pop"><span>'+(preview||'Пока никто не отметил')+'</span> <button type="button" data-all-likes="'+esc(n.id)+'">Посмотреть всех</button></div><div class="site-news-interest-all" id="likes-'+esc(n.id)+'" hidden>'+(names.length?names.map(x=>'<a href="'+esc(profile(x))+'">'+esc(x)+'</a>').join(''):'Пока нет отметок')+'</div></div>';};
const commentCount=n=>{const map=getComments();return Array.isArray(map[n.id])?map[n.id].length:0;};
const commentBadge=n=>'<span class="preview-comment-count" aria-label="Комментарии: '+commentCount(n)+'"><span class="preview-comment-icon" aria-hidden="true">💬</span> <span>'+commentCount(n)+'</span></span>';
const card=(n,isHome)=>'<article class="site-news-card"><a class="site-news-card-main" href="site-news.html?id='+encodeURIComponent(n.id)+'"><span class="site-news-preview-wrap"><img src="'+esc(n.image||'assets/battlefield.jpg')+'" alt=""><span class="site-news-preview-overlay">Открыть</span></span><div class="site-news-card-copy"><div class="site-news-meta">'+esc(n.date)+' · '+esc(n.author)+'</div><h2>'+esc(n.title)+'</h2><p>'+esc(n.body).replace(/<[^>]*>/g,' ').slice(0,190)+'</p>'+(isHome?'':'<span class="site-news-read">Читать новость →</span>')+'</div></a><div class="site-news-card-actions">'+commentBadge(n)+'</div></article>';
function renderHome(){const box=$('homeNewsPreview');if(!box)return;box.innerHTML=getNews().slice(0,10).map(n=>card(n,true)).join('')||'<p class="empty-note">Пока нет новостей.</p>';}
function toggleInterest(id){const map=getLikes();const names=Array.isArray(map[id])?map[id]:[];const i=names.indexOf(user.name);if(i>=0)names.splice(i,1);else names.push(user.name);map[id]=names;write(LIKES_KEY,map);renderPage();}
function bindLikes(root){root.querySelectorAll('[data-interest]').forEach(b=>b.addEventListener('click',()=>toggleInterest(b.dataset.interest)));root.querySelectorAll('[data-all-likes]').forEach(b=>b.addEventListener('click',()=>{const el=$('likes-'+b.dataset.allLikes);if(el)el.hidden=!el.hidden;}));}
function renderPage(){
 const list=$('siteNewsList'),detail=$('siteNewsDetail'),editor=$('siteNewsEditor'),comments=$('siteNewsComments');if(!list&&!detail)return;
 const params=new URLSearchParams(location.search),id=params.get('id');
 if(id){
  const n=getNews().find(x=>x.id===id);if(!n){if(detail)detail.innerHTML='<p class="empty-note">Новость не найдена.</p>';return;}
  if(list)list.hidden=true;
  if(detail){detail.hidden=false;const isAuthor=hasCurrentUser&&n.author===user.name;detail.innerHTML='<div class="site-news-detail"><div class="site-news-meta">'+esc(n.date)+' · '+esc(n.author)+' · '+esc(n.roleLabel||'Участник')+'</div><h1>'+esc(n.title)+'</h1>'+(n.image?'<img class="site-news-detail-image" src="'+esc(n.image)+'" alt="">':'')+'<div class="site-news-article">'+esc(n.body).replace(/\n/g,'<br>')+'</div><div class="site-news-detail-bottom"><div class="site-news-author-actions">'+(isAuthor?'<button type="button" class="btn" id="siteNewsEdit">Редактировать</button><button type="button" class="btn site-news-delete-btn" id="siteNewsDelete">Удалить</button>':'')+'</div>'+likeMarkup(n)+'</div><a class="back-link" href="site-news.html">← Ко всем новостям</a></div>';bindLikes(detail);const edit=$('siteNewsEdit'),remove=$('siteNewsDelete');if(edit)edit.addEventListener('click',()=>renderEditor(n));if(remove)remove.addEventListener('click',()=>{if(!confirm('Удалить эту новость без возможности восстановления?'))return;const arr=read(NEWS_KEY,[]).filter(x=>String(x.id)!==String(n.id));write(NEWS_KEY,arr);const deleted=read(DELETED_KEY,[]);if(!deleted.includes(n.id))deleted.push(n.id);write(DELETED_KEY,deleted);location.href='site-news.html';});}
  if(comments){comments.hidden=false;renderComments(n);}
  return;
 }
 if(detail)detail.hidden=true;if(comments)comments.hidden=true;
 if(list){list.hidden=false;list.innerHTML='<div class="site-news-list-head"><div><div class="page-kicker">EMPIRE · ОБЪЯВЛЕНИЯ И СОБЫТИЯ</div><h1>Новости сообщества</h1><p>Главные события, объявления и новости полков</p></div>'+(canPublish?'<button class="btn primary" id="siteNewsCreate">＋ Опубликовать новость</button>':'')+'</div>'+getNews().map(n=>card(n,false)).join('');bindLikes(list);const create=$('siteNewsCreate');if(create)create.addEventListener('click',()=>{if(editor)renderEditor();});if(params.get('compose')==='1'&&canPublish&&editor)renderEditor();}
 if(editor&&canPublish&&params.get('compose')!=='1'){editor.innerHTML='';editor.hidden=true;}
}
function renderEditor(existing){
 const editor=$('siteNewsEditor');if(!editor)return;
 const editing=!!existing&&existing.author===user.name;
 if(!canPublish&&!editing)return;
 editor.hidden=false;
 editor.innerHTML='<div class="card-title">'+(editing?'✎ Редактирование новости':'✒ Новая публикация')+'</div><form id="siteNewsForm" class="site-news-form"><label>Заголовок<input name="title" maxlength="140" required placeholder="Заголовок новости" value="'+esc(existing?.title||'')+'"></label><label>Изображение для превью<input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><span class="site-news-file-hint">Можно загрузить изображение с компьютера. До 8 МБ.</span></label><label>Или ссылка на изображение<input name="image" type="url" placeholder="https://..." value="'+esc(existing?.image||'')+'"></label><label>Текст новости<textarea name="body" rows="7" required placeholder="Текст публикации...">'+esc(existing?.body||'')+'</textarea></label><div class="site-news-editor-actions"><button class="btn primary" type="submit">'+(editing?'Сохранить изменения':'Опубликовать')+'</button><button class="btn" type="button" id="siteNewsCancel">Отмена</button></div></form>';
 editor.scrollIntoView({behavior:'smooth',block:'start'});
 $('siteNewsCancel').addEventListener('click',()=>{editor.hidden=true;editor.innerHTML='';});
 $('siteNewsForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const f=e.currentTarget,title=f.elements.title.value.trim(),body=f.elements.body.value.trim();
  if(!title||!body)return;
  const submit=f.querySelector('button[type="submit"]');
  const file=f.elements.imageFile.files[0];
  let image=f.elements.image.value.trim()||String(existing?.image||'')||'assets/battlefield.jpg';
  try{
   if(file){
    if(!file.type.startsWith('image/'))throw new Error('Выберите файл изображения.');
    if(file.size>8*1024*1024)throw new Error('Размер изображения не должен превышать 8 МБ.');
    await window.EMPIRE_AUTH.init();
    const client=window.EMPIRE_AUTH.client;
    const currentUser=window.EMPIRE_AUTH.user;
    if(!client||!currentUser)throw new Error('Сначала войдите в аккаунт.');
    const ext=(file.type.split('/')[1]||'png').replace('jpeg','jpg');
    const path=currentUser.id+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
    if(submit)submit.disabled=true;
    const {error:uploadError}=await client.storage.from('site-news-media').upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError)throw uploadError;
    image=client.storage.from('site-news-media').getPublicUrl(path).data.publicUrl;
   }
   const arr=read(NEWS_KEY,[]);
   if(editing){
    const item=arr.find(x=>String(x.id)===String(existing.id));
    if(!item||item.author!==user.name){alert('Редактировать новость может только её автор.');return;}
    item.title=title;item.body=body;item.image=image;item.updated=Date.now();write(NEWS_KEY,arr);location.href='site-news.html?id='+encodeURIComponent(existing.id);return;
   }
   arr.unshift({id:'site-news-'+Date.now(),title,date:fmtDate(),author:user.name,roleLabel:role==='commander'?'Командир полка':role==='officer'?'Офицер полка':role==='moderator'?'Модератор':'Администратор',image,body,created:Date.now()});
   write(NEWS_KEY,arr);location.href='site-news.html';
  }catch(err){
   alert('Не удалось загрузить изображение или сохранить новость: '+(err?.message||err));
   if(submit)submit.disabled=false;
  }
 });
}
const COMMENT_LIKES_KEY='empire-comment-likes-v1';
const getCommentLikes=key=>{const map=read(COMMENT_LIKES_KEY,{})||{};return Array.isArray(map[key])?map[key]:[]};
const toggleCommentLike=(key)=>{const map=read(COMMENT_LIKES_KEY,{})||{};const names=Array.isArray(map[key])?map[key]:[];const i=names.indexOf(user.name);if(i>=0)names.splice(i,1);else names.push(user.name);map[key]=names;write(COMMENT_LIKES_KEY,map);};
const reportComment=(newsId,commentId,textValue,author)=>{
 const key='empire_comment_reports_v1';
 let reports=read(key,[]);if(!Array.isArray(reports))reports=[];
 const location='site-news.html?id='+newsId;
 const duplicate=reports.some(r=>r.status==='pending'&&r.location===location&&String(r.commentId)===String(commentId)&&r.reporter===user.name);
 if(duplicate){alert('Вы уже пожаловались на этот комментарий.');return;}
 reports.push({id:'comment-report-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),status:'pending',reporter:user.name,target:author,location,commentId:String(commentId),comment:String(textValue||''),reason:'Жалоба пользователя',createdAt:new Date().toISOString()});
 write(key,reports);alert('Жалоба отправлена модераторам.');
};


function renderComments(n){
 const box=$('siteNewsComments');if(!box)return;

 const map=getComments(),arr=Array.isArray(map[n.id])?map[n.id]:[];
 const card=(c,depth=0)=>{
  const cid=String(c.id||""),author=String(c.author||"Пользователь"),kids=arr.filter(x=>String(x.parentId||"")===cid),likes=getCommentLikes('site-news:'+n.id+':'+cid),meta={regiment:String(c.regiment||commentAuthorMeta(author).regiment||'Без полка'),online:typeof c.online==='boolean'?c.online:commentAuthorMeta(author).online},commentAvatar=String(c.avatar||'');
  const like='<div class="comment-reactions"><button type="button" class="comment-like-button'+(likes.includes(user.name)?' is-liked':'')+'" data-like-comment="'+esc(cid)+'">♥ <span>Нравится</span> <b>'+likes.length+'</b></button>'+(likes.length?'<div class="comment-like-popover"><span class="comment-like-preview">'+likes.slice(0,2).map(esc).join(', ')+'</span><button type="button" class="comment-like-all" data-show-likes="'+esc(cid)+'">Посмотреть всех</button><div class="comment-like-full" hidden>'+likes.map(x=>'<a href="'+esc(profile(x))+'">'+esc(x)+'</a>').join('')+'</div></div>':'')+'</div>';
  const own=author===user.name?'<span class="site-news-comment-actions"><button class="comment-edit-button btn" type="button" data-site-news-edit-comment="'+esc(cid)+'">Изменить</button><button class="comment-delete-button btn" type="button" data-delete-comment="'+esc(cid)+'">Удалить</button></span>':'';
  const status='<span class="battle-comment-presence '+(meta.online?'is-online':'is-offline')+'"><i></i>'+(meta.online?'В сети':'Не в сети')+'</span>';
  return '<article class="battle-thread-item'+(depth?' is-reply':'')+'" data-comment-id="'+esc(cid)+'" style="--comment-depth:'+Math.min(depth,8)+'"><div class="battle-comment"><div class="battle-comment-author"><a class="battle-comment-avatar-link" href="'+esc(profile(author))+'"><img class="battle-comment-avatar" src="'+esc(commentAvatar||((window.EMPIRE_USER_AVATARS&&window.EMPIRE_USER_AVATARS[author])||"")||avatar(author))+'" alt="'+esc(author)+'" loading="lazy"></a><div class="battle-comment-identity"><div class="battle-comment-head"><a href="'+esc(profile(author))+'"><strong>'+esc(author)+'</strong></a></div><span class="battle-comment-regiment">'+esc(meta.regiment)+'</span>'+status+'<span class="battle-comment-time">'+esc(c.date||'')+'</span></div></div><div class="battle-comment-content"><div class="battle-comment-text">'+richCommentHtml(c)+'</div>'+like+'<button type="button" class="comment-report-button" data-report-comment="'+esc(cid)+'">⚑ Пожаловаться</button>'+own+'<a href="#" class="battle-reply-link" data-reply-to="'+esc(cid)+'">Ответить</a><form class="battle-reply-form" data-parent-id="'+esc(cid)+'" hidden><input type="text" maxlength="500" placeholder="Ответить '+esc(author)+'…" required><button type="submit">Отправить</button></form></div></div>'+(kids.length?'<div class="battle-thread-replies">'+kids.map(x=>card(x,depth+1)).join('')+'</div>':'')+'</article>';
 };
 const roots=arr.filter(c=>!c.parentId||!arr.some(p=>String(p.id)===String(c.parentId)));
 box.innerHTML='<div class="card-title"><img class="site-section-icon" src="icon/i3.png" alt=""> Комментарии <span class="battle-comment-count">'+arr.length+'</span></div><div class="battle-comments" id="siteNewsCommentList">'+(roots.map(c=>card(c)).join('')||'<div class="battle-comments-empty">Комментариев пока нет.</div>')+'</div><form id="siteNewsCommentForm" class="battle-comment-form"><div class="site-news-comment-editor-shell">'+richToolbarHtml+'<div class="battle-comment-editor"><div id="siteNewsCommentInput" class="battle-comment-input" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Написать комментарий…"></div></div></div><div class="site-news-comment-submit-actions"><button type="button" id="siteNewsCommentCancelEdit" hidden>Отмена</button><button type="submit" id="siteNewsCommentSubmit">Отправить</button></div></form>';
 const list=$('siteNewsCommentList'),form=$('siteNewsCommentForm'),editor=$('siteNewsCommentInput');bindRichEditor(form,editor);
 const save=item=>{if(!window.EMPIRE_AUTH?.user){document.querySelector("a.login")?.click();alert("Для отправки комментария войдите в аккаунт.");return;}const latest=getComments(),items=Array.isArray(latest[n.id])?latest[n.id]:[];items.push(item);latest[n.id]=items;write(COMMENTS_KEY,latest);renderComments(n);if(window.EMPIRE_COMMENTS)window.EMPIRE_COMMENTS.create("site_news",n.id,{text:item.text,html:item.html,parentId:item.parentId}).then(remote=>{Object.assign(item,remote);latest[n.id]=items;write(COMMENTS_KEY,latest);renderComments(n);}).catch(err=>alert(err.message||"Не удалось сохранить комментарий в общей базе."));};
 let editingCommentId=null;
 const resetCommentEditor=()=>{
  editingCommentId=null;
  editor.innerHTML='';
  const submit=$('siteNewsCommentSubmit'),cancel=$('siteNewsCommentCancelEdit');
  if(submit)submit.textContent='Отправить';
  if(cancel)cancel.hidden=true;
 };
 const beginCommentEdit=target=>{
  editingCommentId=String(target.id);
  editor.innerHTML=richCommentHtml(target);
  const submit=$('siteNewsCommentSubmit'),cancel=$('siteNewsCommentCancelEdit');
  if(submit)submit.textContent='Сохранить изменения';
  if(cancel)cancel.hidden=false;
  editor.focus();
  editor.scrollIntoView({behavior:'smooth',block:'center'});
 };
 list.addEventListener('click',e=>{const b=e.target.closest('button,a[data-reply-to]');if(!b)return;
  if(b.dataset.siteNewsEditComment){
    const target=arr.find(x=>String(x.id)===String(b.dataset.siteNewsEditComment));
    if(target&&target.author===user.name)beginCommentEdit(target);
  }
  else if(b.dataset.replyTo){
  if(b.dataset.replyTo){e.preventDefault();const f=b.closest('.battle-thread-item')?.querySelector(':scope > .battle-comment .battle-reply-form');if(f){f.hidden=!f.hidden;if(!f.hidden){const input=f.querySelector('input');if(!f.querySelector('.site-news-reply-smile-button')&&window.CLANWARS_SMILES&&input){const btn=document.createElement('button');btn.type='button';btn.className='site-news-reply-smile-button';btn.textContent='☺';btn.title='Выбрать смайл';btn.setAttribute('aria-label','Выбрать смайл');f.insertBefore(btn,input);window.CLANWARS_SMILES.makePicker(btn,input);}input.focus();}}}
  else if(b.dataset.likeComment){toggleCommentLike('site-news:'+n.id+':'+b.dataset.likeComment);renderComments(n);}
  else if(b.dataset.showLikes){const p=b.parentElement.querySelector('.comment-like-full');if(p)p.hidden=!p.hidden;}
  else if(b.dataset.reportComment){const c=b.closest('[data-comment-id]');reportComment(n.id,b.dataset.reportComment,c?.querySelector('.battle-comment-text')?.textContent||'',c?.querySelector('.battle-comment-head strong')?.textContent||'Пользователь');}
  else if(b.dataset.deleteComment){const target=arr.find(x=>String(x.id)===b.dataset.deleteComment);if(target&&target.author===user.name&&confirm('Удалить этот комментарий?')){const next=arr.filter(x=>String(x.id)!==b.dataset.deleteComment);next.forEach(x=>{if(x.parentId===b.dataset.deleteComment)delete x.parentId;});const latest=getComments();latest[n.id]=next;write(COMMENTS_KEY,latest);renderComments(n);}}}
 });
 list.addEventListener('submit',e=>{const f=e.target.closest('.battle-reply-form');if(!f)return;e.preventDefault();const input=f.querySelector('input'),value=input.value.trim();if(value)save({id:'comment-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),parentId:f.dataset.parentId,author:user.name,avatar:avatar(user.name),date:new Date().toLocaleString('ru-RU'),text:value});});
 refreshSiteNewsCommentPresence(n);
 if(!window.__siteNewsPresenceTimer){window.__siteNewsPresenceTimer=setInterval(()=>refreshSiteNewsCommentPresence(n),60000);}
 const cancelEdit=$('siteNewsCommentCancelEdit');
 cancelEdit?.addEventListener('click',()=>resetCommentEditor());
 form.addEventListener('submit',e=>{
  e.preventDefault();
  const html=cleanRichComment(editor.innerHTML),textValue=editor.textContent.trim();
  if(!textValue&&!html.replace(/<[^>]*>/g,'').trim()&&!html.includes('<img '))return;
  if(editingCommentId){
   const latest=getComments(),items=Array.isArray(latest[n.id])?latest[n.id]:[],item=items.find(x=>String(x.id)===String(editingCommentId));
   if(!item)return;
   item.text=textValue;item.html=html;item.updatedAt=new Date().toISOString();write(COMMENTS_KEY,latest);
   const remoteId=item._remote?item.id:null;
   resetCommentEditor();renderComments(n);
   if(remoteId&&window.EMPIRE_COMMENTS)window.EMPIRE_COMMENTS.update(remoteId,{text:textValue,html,parentId:item.parentId}).then(remote=>{const fresh=getComments(),list2=Array.isArray(fresh[n.id])?fresh[n.id]:[],idx=list2.findIndex(x=>String(x.id)===String(remoteId));if(idx>=0){list2[idx]={...list2[idx],...remote};fresh[n.id]=list2;write(COMMENTS_KEY,fresh);renderComments(n);}}).catch(err=>alert(err.message||'Не удалось сохранить изменение.'));
   return;
  }
  save({id:'comment-'+Date.now(),author:user.name,avatar:avatar(user.name),date:new Date().toLocaleString('ru-RU'),html,text:textValue});
 });
}

document.addEventListener('empire:site-news-permission',e=>{const d=e.detail||{};if(!d.canPublish)return;canPublish=true;role=String(d.role||role).toLowerCase();user={...user,role};renderHome();renderPage();});
renderHome();renderPage();
document.addEventListener('empire:auth-changed',()=>{syncSiteNewsRemote();});
document.addEventListener('empire:site-news-permission',()=>{syncSiteNewsRemote();});
setTimeout(syncSiteNewsRemote,800);
})();
