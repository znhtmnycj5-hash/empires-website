(() => {
  'use strict';
  const SUPABASE_URL='https://pbaojidktzjnpavtdcga.supabase.co';
  const SUPABASE_KEY='sb_publishable_XVsmd-U_ZF5eD-UcxMw31g_Yv9rUdVk';
  let clientPromise=null,ratingsPromise=null,ratingsCache=null,ratingsCacheAt=0;
  const CACHE_KEY='clanwars_regiment_ratings_v2';
  const CACHE_TTL=10*60*1000;
  const readCache=()=>{try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(x?.data?.length)return x;}catch(e){}return null;};
  const writeCache=data=>{try{localStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),data}));}catch(e){}};
  async function getClient(){
    if(window.EMPIRE_AUTH){await window.EMPIRE_AUTH.init();return window.EMPIRE_AUTH.client;}
    if(window.supabase?.createClient)return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    if(!clientPromise)clientPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload=()=>resolve(window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY));
      s.onerror=()=>reject(new Error('Не удалось загрузить Supabase'));
      document.head.appendChild(s);
    });
    return clientPromise;
  }
  const parseBattleResult=record=>{
    if((record.dataset.status||'')!=='completed')return null;
    const sides=[...record.querySelectorAll('.battle-side strong')].map(el=>el.textContent.trim());
    const summary=record.querySelector('.battle-result-box span')?.textContent.trim()||'';
    if(summary.includes('Ничья'))return{type:'draw',teams:sides};
    const win=summary.match(/^Победа\s+(.+)$/),loss=summary.match(/^Поражение\s+(.+)$/);
    if(win)return{type:'win',winner:win[1].trim(),loser:sides.find(n=>n!==win[1].trim())||''};
    if(loss)return{type:'win',winner:sides.find(n=>n!==loss[1].trim())||'',loser:loss[1].trim()};
    return null;
  };
  const refreshRatings=async()=>{
    if(ratingsPromise)return ratingsPromise;
    ratingsPromise=(async()=>{
      const client=await getClient();
      const [{data:regiments,error:regimentError},{data:members,error:memberError},{data:userVotes,error:userVotesError}]=await Promise.all([
        client.from('empire_regiments').select('id,name,faction,logo_url,commander_id,created_at').order('created_at',{ascending:true}),
        client.from('empire_regiment_members').select('regiment_id,user_id,role,left_at'),
        client.from('empire_user_ratings').select('target_user_id,value')
      ]);
      if(regimentError)throw regimentError;
      if(memberError)throw memberError;
      if(userVotesError)throw userVotesError;
      const userScores={};
      (userVotes||[]).forEach(v=>{userScores[v.target_user_id]=(userScores[v.target_user_id]||0)+Number(v.value||0);});
      const ratings={};
      (regiments||[]).forEach(r=>{
        const active=(members||[]).filter(m=>m.regiment_id===r.id&&!m.left_at);
        const memberScore=active.reduce((sum,m)=>sum+(userScores[m.user_id]||0),0);
        ratings[r.name]={id:r.id,name:r.name,faction:r.faction,logo:r.logo_url,logo_url:r.logo_url,count:active.length,score:memberScore,memberScore,wins:0,losses:0,draws:0};
      });
      try{
        const response=await fetch('battles.html',{cache:'no-store'});
        if(response.ok){
          const doc=new DOMParser().parseFromString(await response.text(),'text/html');
          doc.querySelectorAll('.battle-record').forEach(record=>{
            const result=parseBattleResult(record);if(!result)return;
            if(result.type==='draw')result.teams.forEach(name=>{if(ratings[name]){ratings[name].draws++;ratings[name].score+=25;}});
            else{if(ratings[result.winner]){ratings[result.winner].wins++;ratings[result.winner].score+=50;}if(ratings[result.loser]){ratings[result.loser].losses++;ratings[result.loser].score-=50;}}
          });
        }
      }catch(e){}
      const result=Object.values(ratings).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
      ratingsCache=result;ratingsCacheAt=Date.now();writeCache(result);return result;
    })();
    try{return await ratingsPromise;}finally{ratingsPromise=null;}
  };
  window.calculateRegimentRatings=async(force=false)=>{
    const now=Date.now();
    if(ratingsCache&&now-ratingsCacheAt<30000)return ratingsCache;
    const cached=readCache();
    if(cached&&Array.isArray(cached.data)&&cached.data.length){
      ratingsCache=cached.data;ratingsCacheAt=Number(cached.at)||now;
      refreshRatings().catch(()=>{});
      return cached.data;
    }
    return await refreshRatings();
  };
})();