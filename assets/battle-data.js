(function(){
'use strict';
const CACHE_KEY='clanwars_accepted_battles_v2';
const CACHE_TTL=5*60*1000;
const readCache=()=>{try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'null');}catch(e){return null;}};
const writeCache=data=>{try{localStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),data}));}catch(e){}};
const api={
  async client(){
    if(!window.EMPIRE_AUTH)throw new Error('Авторизация не подключена');
    return await window.EMPIRE_AUTH.init();
  },
  async loadAccepted(){
    const cached=readCache();
    if(cached&&Array.isArray(cached.data)){
      // Показываем последнюю известную версию сразу, а актуальные данные обновляем в фоне.
      api._refreshAccepted().catch(()=>{});
      return cached.data;
    }
    return await api._refreshAccepted();
  },
  async _refreshAccepted(){
    const client=await api.client();
    const {data,error}=await client.from('empire_public_battles')
      .select('id,challenger_regiment_id,target_regiment_id,battle_type,player_count,allies_allowed,ally_limit,scheduled_at,server,status,created_at')
      .eq('status','accepted')
      .order('scheduled_at',{ascending:true});
    if(error)throw error;
    const rows=data||[];
    const ids=[...new Set(rows.flatMap(x=>[x.challenger_regiment_id,x.target_regiment_id]).filter(Boolean))];
    let regiments=[];
    if(ids.length){
      const q=await client.from('empire_regiments').select('id,name,faction,logo_url').in('id',ids);
      if(q.error)throw q.error;
      regiments=q.data||[];
    }
    const byId=new Map(regiments.map(x=>[String(x.id),x]));
    const result=rows.map(x=>({
      ...x,
      left:byId.get(String(x.challenger_regiment_id))||null,
      right:byId.get(String(x.target_regiment_id))||null
    })).filter(x=>x.left&&x.right);
    writeCache(result);
    return result;
  },
  formatDate(value){
    return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  },
  status(row){
    const start=new Date(row.scheduled_at).getTime(),now=Date.now();
    if(now<start)return 'accepted';
    if(now<start+3600000)return 'ongoing';
    return 'awaiting_confirmation';
  }
};
api.refresh=api._refreshAccepted;
window.CLANWARS_BATTLES=api;
})();