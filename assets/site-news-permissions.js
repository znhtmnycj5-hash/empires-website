(function(){
  'use strict';
  async function resolve(){
    try{
      if(!window.EMPIRE_AUTH)return;
      const client=await window.EMPIRE_AUTH.init();
      const user=window.EMPIRE_AUTH.user;
      if(!user)return;
      const [{data:commanded,error:commandedError},{data:members,error:membersError}]=await Promise.all([
        client.from('empire_regiments').select('id').eq('commander_id',user.id),
        client.from('empire_regiment_members').select('regiment_id,role,left_at').eq('user_id',user.id).in('role',['commander','officer']).is('left_at',null)
      ]);
      if(commandedError||membersError)throw commandedError||membersError;
      const commanderIds=new Set((commanded||[]).map(x=>x.id));
      let role='';
      if(commanderIds.size)role='commander';
      else if((members||[]).some(x=>x.role==='commander'))role='commander';
      else if((members||[]).some(x=>x.role==='officer'))role='officer';
      const canPublish=role==='commander'||role==='officer';
      document.dispatchEvent(new CustomEvent('empire:site-news-permission',{detail:{canPublish,role}}));
      const actions=document.getElementById('homeSiteNewsActions');
      if(actions&&canPublish){
        actions.innerHTML='<a class="btn primary home-site-news-write" href="site-news.html?compose=1">✒ Написать</a>';
      }
    }catch(e){console.warn('Site news permissions:',e);}
  }
  resolve();
})();
