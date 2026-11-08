(function(){
'use strict';
const NEWS_KEY='empire_site_news_v1';
const LIKES_KEY='empire_site_news_interests_v1';
const COMMENTS_KEY='empire_news_comments_v1';
const $=id=>document.getElementById(id);
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v==null?fallback:v;}catch(e){return fallback;}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const user=(()=>{const v=read('empire_current_user',null);return v&&typeof v==='object'?{name:String(v.name||'Пользователь'),regiment:String(v.regiment||''),role:String(v.role||'user')}:{name:'Kalashnikov',regiment:'1st Regiment',role:'user'};})();
const role=user.role.toLowerCase();
const canPublish=['admin','administrator','moderator','commander'].includes(role);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatar=name=>window.empireUserAvatar?window.empireUserAvatar(name):'assets/default-soldier.jpg';
const profile=name=>window.empireProfileUrl?window.empireProfileUrl(name):'profile.html?user='+encodeURIComponent(name);
const seed=[
{id:'site-news-001',title:'Обновление правил кампаний',date:'05.11.2026',author:'Администрация EMPIRE',roleLabel:'Администрация',image:'https://upload.wikimedia.org/wikipedia/commons/7/7b/Moskowa_1812.jpg',body:'Обновлены правила проведения кампаний. Ознакомьтесь с изменениями перед подачей заявок на новые сражения.',created:1793870000000},
{id:'site-news-002',title:'Итоги осеннего турнира',date:'01.11.2026',author:'Kalashnikov',roleLabel:'Командование',image:'https://upload.wikimedia.org/wikipedia/commons/e/ea/A_19._magyar_gyalogezred_rohama_a_lipcsei_csataban_%281813%29.JPG',body:'Поздравляем 1st Regiment с победой в турнире Empire Autumn Cup! Благодарим все полки за участие и достойную игру.',created:1793520000000},
{id:'site-news-003',title:'Открыта регистрация новой кампании',date:'28.10.2026',author:'Модерация EMPIRE',roleLabel:'Модератор',image:'https://upload.wikimedia.org/wikipedia/commons/4/4a/Battle_of_Bayonne.jpg',body:'Полки уже могут подать заявку на участие в новом сезоне. Подробности и расписание будут опубликованы дополнительно.',created:1793260000000}
];
const getNews=()=>{let v=read(NEWS_KEY,null);if(!Array.isArray(v)){v=seed;write(NEWS_KEY,v);}return v.filter(x=>x&&x.id).sort((a,b)=>(Number(b.created)||0)-(Number(a.created)||0));};
const getLikes=()=>read(LIKES_KEY,{})||{};
const getComments=()=>read(COMMENTS_KEY,{})||{};
const fmtDate=()=>new Date().toLocaleDateString('ru-RU');
const likeMarkup=n=>{const names=Array.isArray(getLikes()[n.id])?getLikes()[n.id]:[];const preview=names.slice(0,4).map(x=>'<a href="'+esc(profile(x))+'">'+esc(x)+'</a>').join(', ');return '<div class="site-news-interest" data-news-id="'+esc(n.id)+'"><button type="button" class="site-news-interest-btn '+(names.includes(user.name)?'is-active':'')+'" data-interest="'+esc(n.id)+'">✦ Интересно <b>'+names.length+'</b></button><div class="site-news-interest-pop"><span>'+(preview||'Пока никто не отметил')+'</span> <button type="button" data-all-likes="'+esc(n.id)+'">Посмотреть всех</button></div><div class="site-news-interest-all" id="likes-'+esc(n.id)+'" hidden>'+(names.length?names.map(x=>'<a href="'+esc(profile(x))+'">'+esc(x)+'</a>').join(''):'Пока нет отметок')+'</div></div>';};
const commentCount=n=>{const map=getComments();return Array.isArray(map[n.id])?map[n.id].length:0;};
const commentBadge=n=>'<span class="preview-comment-count" aria-label="Комментарии: '+commentCount(n)+'"><span class="preview-comment-icon" aria-hidden="true">💬</span> <span>'+commentCount(n)+'</span></span>';
const card=n=>'<article class="site-news-card"><a class="site-news-card-main" href="site-news.html?id='+encodeURIComponent(n.id)+'"><img src="'+esc(n.image||'assets/battlefield.jpg')+'" alt=""><div class="site-news-card-copy"><div class="site-news-meta">'+esc(n.date)+' · '+esc(n.author)+'</div><h2>'+esc(n.title)+'</h2><p>'+esc(n.body).replace(/<[^>]*>/g,' ').slice(0,190)+'</p><span class="site-news-read">Читать новость →</span></div></a><div class="site-news-card-actions">'+commentBadge(n)+likeMarkup(n)+'</div></article>';
function renderHome(){const box=$('homeNewsPreview');if(!box)return;box.innerHTML=getNews().slice(0,10).map(card).join('')||'<p class="empty-note">Пока нет новостей.</p>';}
function toggleInterest(id){const map=getLikes();const names=Array.isArray(map[id])?map[id]:[];const i=names.indexOf(user.name);if(i>=0)names.splice(i,1);else names.push(user.name);map[id]=names;write(LIKES_KEY,map);renderPage();}
function bindLikes(root){root.querySelectorAll('[data-interest]').forEach(b=>b.addEventListener('click',()=>toggleInterest(b.dataset.interest)));root.querySelectorAll('[data-all-likes]').forEach(b=>b.addEventListener('click',()=>{const el=$('likes-'+b.dataset.allLikes);if(el)el.hidden=!el.hidden;}));}
function renderPage(){
 const list=$('siteNewsList'),detail=$('siteNewsDetail'),editor=$('siteNewsEditor'),comments=$('siteNewsComments');if(!list&&!detail)return;
 const params=new URLSearchParams(location.search),id=params.get('id');
 if(id){
  const n=getNews().find(x=>x.id===id);if(!n){if(detail)detail.innerHTML='<p class="empty-note">Новость не найдена.</p>';return;}
  if(list)list.hidden=true;
  if(detail){detail.hidden=false;detail.innerHTML='<div class="site-news-detail"><div class="site-news-meta">'+esc(n.date)+' · '+esc(n.author)+' · '+esc(n.roleLabel||'Участник')+'</div><h1>'+esc(n.title)+'</h1><img class="site-news-detail-image" src="'+esc(n.image||'assets/battlefield.jpg')+'" alt=""><div class="site-news-article">'+esc(n.body).replace(/\n/g,'<br>')+'</div>'+likeMarkup(n)+'<a class="back-link" href="site-news.html">← Ко всем новостям</a></div>';bindLikes(detail);}
  if(comments){comments.hidden=false;renderComments(n);}
  return;
 }
 if(detail)detail.hidden=true;if(comments)comments.hidden=true;
 if(list){list.hidden=false;list.innerHTML='<div class="site-news-list-head"><div><div class="page-kicker">EMPIRE · ОБЪЯВЛЕНИЯ И СОБЫТИЯ</div><h1>Новости сообщества</h1><p>Главные события, объявления и новости полков</p></div>'+(canPublish?'<button class="btn primary" id="siteNewsCreate">＋ Опубликовать новость</button>':'')+'</div>'+getNews().map(card).join('');bindLikes(list);const create=$('siteNewsCreate');if(create)create.addEventListener('click',()=>{if(editor){editor.hidden=false;editor.scrollIntoView({behavior:'smooth'});}});}
 if(editor&&canPublish){editor.innerHTML='<div class="card-title">✒ Новая публикация</div><form id="siteNewsForm" class="site-news-form"><label>Заголовок<input name="title" maxlength="140" required placeholder="Заголовок новости"></label><label>Изображение (ссылка)<input name="image" type="url" placeholder="https://..."></label><label>Текст новости<textarea name="body" rows="7" required placeholder="Текст публикации..."></textarea></label><button class="btn primary" type="submit">Опубликовать</button></form>';editor.hidden=true;$('siteNewsForm').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget,title=f.elements.title.value.trim(),body=f.elements.body.value.trim();if(!title||!body)return;const arr=getNews();arr.unshift({id:'site-news-'+Date.now(),title,date:fmtDate(),author:user.name,roleLabel:role==='commander'?'Командир полка':role==='moderator'?'Модератор':'Администратор',image:f.elements.image.value.trim()||'assets/battlefield.jpg',body,created:Date.now()});write(NEWS_KEY,arr);location.href='site-news.html';});}
}
function renderComments(n){
 const box=$('siteNewsComments');if(!box)return;
 const map=getComments(),arr=Array.isArray(map[n.id])?map[n.id]:[];
 box.innerHTML='<div class="card-title">Комментарии <span class="battle-comment-count">'+arr.length+'</span></div><div class="site-news-comment-list">'+arr.map(c=>'<div class="site-news-comment"><a href="'+esc(profile(c.author))+'"><img src="'+esc(c.avatar||avatar(c.author))+'" alt=""></a><div><b><a href="'+esc(profile(c.author))+'">'+esc(c.author)+'</a></b><small>'+esc(c.date||'')+'</small><p>'+esc(c.text)+'</p></div></div>').join('')+'</div><form id="siteNewsCommentForm" class="site-news-comment-form"><textarea name="text" rows="3" required placeholder="Написать комментарий..."></textarea><button class="btn primary" type="submit">Отправить</button></form>';
 $('siteNewsCommentForm').addEventListener('submit',e=>{e.preventDefault();const textValue=e.currentTarget.elements.text.value.trim();if(!textValue)return;const latest=getComments(),items=Array.isArray(latest[n.id])?latest[n.id]:[];items.push({id:'comment-'+Date.now(),author:user.name,avatar:avatar(user.name),date:new Date().toLocaleString('ru-RU'),text:textValue});latest[n.id]=items;write(COMMENTS_KEY,latest);renderComments(n);});
}
renderHome();renderPage();
})();
