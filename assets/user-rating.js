(async function(){
'use strict';
const HOME_CACHE_KEY='clanwars_home_user_rating_v2';
const HOME_CACHE_TTL=10*60*1000;
const readHomeCache=()=>{try{return JSON.parse(localStorage.getItem(HOME_CACHE_KEY)||'null');}catch(e){return null;}};
const writeHomeCache=data=>{try{localStorage.setItem(HOME_CACHE_KEY,JSON.stringify({at:Date.now(),data}));}catch(e){}};
try{
 await window.EMPIRE_AUTH.init();
 const auth=window.EMPIRE_AUTH, client=auth.client;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const scoreMap=votes=>{const m={};(votes||[]).forEach(v=>{m[v.target_user_id]=(m[v.target_user_id]||0)+Number(v.value)});return m;};
 const profileRoot=document.getElementById('profileUserRating');
 if(profileRoot){
  const name=new URLSearchParams(location.search).get('user')||auth.profile?.display_name||'';
  const q=await client.from('empire_profiles').select('id,display_name,avatar_url').ilike('display_name',name).maybeSingle();
  if(q.error)throw q.error;
  const target=q.data;
  if(target){
   const load=async()=>{
    const [all,vote]=await Promise.all([
     client.from('empire_user_ratings').select('voter_id,target_user_id,value,created_at').eq('target_user_id',target.id).order('created_at',{ascending:false}),
     auth.user?client.from('empire_user_ratings').select('value').eq('voter_id',auth.user.id).eq('target_user_id',target.id).maybeSingle():Promise.resolve({data:null,error:null})
    ]);
    if(all.error)throw all.error;if(vote.error)throw vote.error;
    const rows=all.data||[], ids=[...new Set(rows.map(x=>x.voter_id))];
    let people=[];
    if(ids.length){const p=await client.from('empire_profiles').select('id,display_name,avatar_url').in('id',ids);if(p.error)throw p.error;people=p.data||[];}
    const byId=Object.fromEntries(people.map(p=>[p.id,p]));
    const plus=rows.filter(x=>x.value===1),minus=rows.filter(x=>x.value===-1);
    const total=plus.length-minus.length, own=auth.user?.id===target.id;
    const current=vote.data?.value||0;
    const voterRows=(list)=>list.map(x=>x.demo?'<div class="user-rating-demo-voter"><img src="assets/aea32583-9230-496e-af65-c2e33f73ff79.png" alt=""><span>'+esc(byId[x.voter_id]?.display_name||'Демо-боец')+'</span></div>':'<a href="profile.html?user='+encodeURIComponent(byId[x.voter_id]?.display_name||'')+'"><img src="'+esc(byId[x.voter_id]?.avatar_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png')+'" alt=""><span>'+esc(byId[x.voter_id]?.display_name||'Участник')+'</span></a>').join('');
    const voterPanel=(kind,label,list)=>'<section class="user-rating-voter-panel"><button type="button" class="user-rating-voter-toggle '+kind+'" aria-expanded="false">'+label+' <b>('+list.length+')</b><span class="user-rating-toggle-mark">＋</span></button><div class="user-rating-voter-list" hidden>'+(list.length?voterRows(list):'<p>Пока нет оценок</p>')+'</div></section>';
    profileRoot.innerHTML='<div class="user-rating-summary"><strong class="user-rating-score '+(total>0?'positive':total<0?'negative':'')+'">'+Math.abs(total)+'</strong><span><b class="positive">+'+plus.length+'</b> положительных · <b class="negative">−'+minus.length+'</b> отрицательных</span></div>'+
     (own?'<p class="user-rating-hint">Вы не можете менять собственный рейтинг.</p>':auth.user?'<div class="user-rating-actions"><button type="button" data-value="1" class="user-rating-button positive '+(current===1?'selected':'')+'">+1</button><button type="button" data-value="-1" class="user-rating-button negative '+(current===-1?'selected':'')+'">−1</button></div>':'<p class="user-rating-hint">Войдите, чтобы оценить участника.</p>')+
     '<div class="user-rating-columns">'+voterPanel('positive','Кто поставил +',plus)+voterPanel('negative','Кто поставил −',minus)+'</div>';
    profileRoot.querySelectorAll('.user-rating-voter-toggle').forEach(button=>button.addEventListener('click',()=>{
      const list=button.nextElementSibling,expanded=button.getAttribute('aria-expanded')==='true';
      button.setAttribute('aria-expanded',String(!expanded));list.hidden=expanded;
      button.querySelector('.user-rating-toggle-mark').textContent=expanded?'＋':'−';
    }));
    profileRoot.querySelectorAll('button[data-value]').forEach(b=>b.onclick=async()=>{
      b.disabled=true;
      try{const {error}=await client.rpc('set_empire_user_rating',{p_target_user_id:target.id,p_value:Number(b.dataset.value)});if(error)throw error;await load();}
      catch(e){alert(e.message||'Не удалось изменить рейтинг.');b.disabled=false;}
    });
   };
   await load();
  }
 }

 const rankingRoot=document.getElementById('ratingUsers');
 if(rankingRoot){
  const cachedRanking=readHomeCache();
  if(cachedRanking?.data?.length){
   const cachedRows=cachedRanking.data;
   const avatar=p=>esc(p.avatar_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png');
   const score=p=>'<span class="rating-row-score user-rating-row-score '+(p.score>0?'positive':p.score<0?'negative':'')+'">'+(p.score>0?'+':'')+p.score+'</span>';
   const podium=cachedRows.slice(0,3).map((p,i)=>'<a class="podium-card '+(i===0?'gold':i===1?'silver':'bronze')+'" href="profile.html?user='+encodeURIComponent(p.display_name)+'"><div class="place">'+(i+1)+' МЕСТО</div><img class="podium-avatar" src="'+avatar(p)+'" alt="" decoding="async"><div class="podium-name">'+esc(p.display_name)+'</div><div class="podium-score">'+(p.score>0?'+':'')+p.score+' баллов</div></a>').join('');
   const list=cachedRows.map((p,i)=>'<a class="rating-row user-rating-row" href="profile.html?user='+encodeURIComponent(p.display_name)+'"><span class="rating-place">'+(i+1)+'</span><img class="rating-row-avatar" src="'+avatar(p)+'" alt="" decoding="async"><span class="rating-row-name">'+esc(p.display_name)+'<small class="rating-row-sub">Рейтинг участника</small></span>'+score(p)+'</a>').join('');
   rankingRoot.innerHTML='<div class="podium">'+podium+'</div><div class="rating-list">'+list+'</div>';
  }
  const [profiles,votes]=await Promise.all([
   client.from('empire_profiles').select('id,display_name,avatar_url'),
   client.from('empire_user_ratings').select('target_user_id,value')
  ]);
  if(profiles.error)throw profiles.error;if(votes.error)throw votes.error;
  const totals=scoreMap(votes.data);
  const rows=(profiles.data||[]).map(p=>({...p,score:totals[p.id]||0}))
   .sort((a,b)=>b.score-a.score||a.display_name.localeCompare(b.display_name));
  writeHomeCache(rows.slice(0,50));
  const avatar=p=>esc(p.avatar_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png');
  const score=p=>'<span class="rating-row-score user-rating-row-score '+(p.score>0?'positive':p.score<0?'negative':'')+'">'+(p.score>0?'+':'')+p.score+'</span>';
  const podium=rows.slice(0,3).map((p,i)=>{
   const cls=i===0?'gold':i===1?'silver':'bronze';
   return '<a class="podium-card '+cls+'" href="profile.html?user='+encodeURIComponent(p.display_name)+'"><div class="place">'+(i+1)+' МЕСТО</div><img class="podium-avatar" src="'+avatar(p)+'" alt="" decoding="async"><div class="podium-name">'+esc(p.display_name)+'</div><div class="podium-score">'+(p.score>0?'+':'')+p.score+' баллов</div></a>';
  }).join('');
  const list=rows.map((p,i)=>'<a class="rating-row user-rating-row" href="profile.html?user='+encodeURIComponent(p.display_name)+'"><span class="rating-place">'+(i+1)+'</span><img class="rating-row-avatar" src="'+avatar(p)+'" alt="" decoding="async"><span class="rating-row-name">'+esc(p.display_name)+'<small class="rating-row-sub">Рейтинг участника</small></span>'+score(p)+'</a>').join('');
  rankingRoot.innerHTML=rows.length?'<div class="podium">'+podium+'</div><div class="rating-list">'+list+'</div>':'<div class="empty">Пока нет участников.</div>';
 }

 const homeRoot=document.getElementById('homeUserRating');
 if(homeRoot){
  const cachedHome=readHomeCache();
  if(cachedHome?.data?.length) {
   const cachedRows=cachedHome.data;
   homeRoot.innerHTML=cachedRows.slice(0,5).map((x,i)=>'<tr class="home-user-rating-row"><td class="pos">'+(i+1)+'.</td><td><a class="home-user-rating-link" href="profile.html?user='+encodeURIComponent(x.display_name)+'"><img src="'+esc(x.avatar_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png')+'" alt="">'+esc(x.display_name)+'</a></td><td class="points"><b class="'+(x.score>0?'positive':x.score<0?'negative':'')+'">'+Math.abs(x.score)+'</b></td></tr>').join('');
  }
  const [p,v]=await Promise.all([
   client.from('empire_profiles').select('id,display_name,avatar_url,regiment'),
   client.from('empire_user_ratings').select('target_user_id,value')
  ]);
  if(p.error)throw p.error;if(v.error)throw v.error;
  const scores=scoreMap(v.data), rows=(p.data||[]).map(x=>({...x,score:scores[x.id]||0})).sort((a,b)=>b.score-a.score||a.display_name.localeCompare(b.display_name)).slice(0,8);
  writeHomeCache(rows);
  homeRoot.innerHTML=rows.length?rows.slice(0,5).map((x,i)=>'<tr class="home-user-rating-row"><td class="pos">'+(i+1)+'.</td><td><a class="home-user-rating-link" href="profile.html?user='+encodeURIComponent(x.display_name)+'"><img src="'+esc(x.avatar_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png')+'" alt="">'+esc(x.display_name)+'</a></td><td class="points"><b class="'+(x.score>0?'positive':x.score<0?'negative':'')+'">'+Math.abs(x.score)+'</b></td></tr>').join(''):'<tr><td colspan="3" class="empty-note">Пока нет участников.</td></tr>';
 }
}catch(e){console.warn('User ratings:',e);const roots=['profileUserRating','homeUserRating','ratingUsers'];roots.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<p class="empty-note">Рейтинг временно недоступен.</p>';});}
})();