(async function(){
'use strict';
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
    // Прозрачные демонстрационные оценки Commander: они существуют только в отображении профиля и не записываются в базу.
    if(String(target.display_name||'').toLowerCase()==='commander'){
      for(let i=1;i<=15;i++){
        const id='clanwars-demo-voter-'+String(i).padStart(2,'0');
        const value=i<=10?1:-1;
        rows.push({voter_id:id,target_user_id:target.id,value,created_at:'2099-01-'+String(i).padStart(2,'0')+'T00:00:00Z',demo:true});
        people.push({id,display_name:'Демо-боец '+String(i).padStart(2,'0'),avatar_url:null});
      }
    }
    const byId=Object.fromEntries(people.map(p=>[p.id,p]));
    const plus=rows.filter(x=>x.value===1),minus=rows.filter(x=>x.value===-1);
    const total=plus.length-minus.length, own=auth.user?.id===target.id;
    const current=vote.data?.value||0;
    profileRoot.innerHTML='<div class="user-rating-summary"><strong class="user-rating-score '+(total>0?'positive':total<0?'negative':'')+'">'+Math.abs(total)+'</strong><span><b class="positive">+'+plus.length+'</b> положительных · <b class="negative">−'+minus.length+'</b> отрицательных</span></div>'+
     (own?'<p class="user-rating-hint">Вы не можете менять собственный рейтинг.</p>':auth.user?'<div class="user-rating-actions"><button type="button" data-value="1" class="user-rating-button positive '+(current===1?'selected':'')+'">+1</button><button type="button" data-value="-1" class="user-rating-button negative '+(current===-1?'selected':'')+'">−1</button></div>':'<p class="user-rating-hint">Войдите, чтобы оценить участника.</p>')+
     '<div class="user-rating-columns"><div><h4>Положительные оценки</h4>'+(plus.length?plus.map(x=>'<a href="profile.html?user='+encodeURIComponent(byId[x.voter_id]?.display_name||'')+'"><img src="'+esc(byId[x.voter_id]?.avatar_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png')+'" alt=""><span>'+esc(byId[x.voter_id]?.display_name||'Участник')+'</span></a>').join(''):'<p>Пока нет оценок</p>')+'</div><div><h4>Отрицательные оценки</h4>'+(minus.length?minus.map(x=>'<a href="profile.html?user='+encodeURIComponent(byId[x.voter_id]?.display_name||'')+'"><img src="'+esc(byId[x.voter_id]?.avatar_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png')+'" alt=""><span>'+esc(byId[x.voter_id]?.display_name||'Участник')+'</span></a>').join(''):'<p>Пока нет оценок</p>')+'</div></div>';
    profileRoot.querySelectorAll('button[data-value]').forEach(b=>b.onclick=async()=>{
      b.disabled=true;
      try{const {error}=await client.rpc('set_empire_user_rating',{p_target_user_id:target.id,p_value:Number(b.dataset.value)});if(error)throw error;await load();}
      catch(e){alert(e.message||'Не удалось изменить рейтинг.');b.disabled=false;}
    });
   };
   await load();
  }
 }
 const homeRoot=document.getElementById('homeUserRating');
 if(homeRoot){
  const [p,v]=await Promise.all([
   client.from('empire_profiles').select('id,display_name,avatar_url,regiment'),
   client.from('empire_user_ratings').select('target_user_id,value')
  ]);
  if(p.error)throw p.error;if(v.error)throw v.error;
  const scores=scoreMap(v.data), rows=(p.data||[]).map(x=>({...x,score:scores[x.id]||0})).sort((a,b)=>b.score-a.score||a.display_name.localeCompare(b.display_name)).slice(0,8);
  homeRoot.innerHTML=rows.length?rows.slice(0,5).map((x,i)=>'<tr class="home-user-rating-row"><td class="pos">'+(i+1)+'.</td><td><a class="home-user-rating-link" href="profile.html?user='+encodeURIComponent(x.display_name)+'"><img src="'+esc(x.avatar_url||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png')+'" alt="">'+esc(x.display_name)+'</a></td><td class="points"><b class="'+(x.score>0?'positive':x.score<0?'negative':'')+'">'+Math.abs(x.score)+'</b></td></tr>').join(''):'<tr><td colspan="3" class="empty-note">Пока нет участников.</td></tr>';
 }
}catch(e){console.warn('User ratings:',e);const roots=['profileUserRating','homeUserRating'];roots.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<p class="empty-note">Рейтинг временно недоступен.</p>';});}
})();