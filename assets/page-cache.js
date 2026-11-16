(() => {
  'use strict';

  const KEY_PREFIX='clanwars_page_snapshot_v1:';
  const MAX_HTML=220000;
  const selectors=[
    '.regiments-list',
    '#all',
    '#upcomingCampaigns',
    '#completedCampaigns',
    '#alliancesList',
    '#ratingUsers',
    '#regimentRating',
    '#upcomingBattlesHome',
    '#homeUserRating',
    '#homeNewsPreview',
    '#homeSiteNewsActions',
    '#generalMessages',
    '#regimentMessages',
    '#onlineUsersStrip',
    '#searchResultsBody',
    '#siteNewsList',
    '#newsList'
  ];

  const key=KEY_PREFIX+location.pathname;
  const read=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      if(!value||!value.html||Date.now()-Number(value.at||0)>30*60*1000)return null;
      return value;
    }catch(e){return null;}
  };
  const write=()=>{
    const data={};
    let total=0;
    selectors.forEach(selector=>{
      const nodes=[...document.querySelectorAll(selector)];
      nodes.forEach((node,index)=>{
        const html=node.innerHTML;
        if(!html||html.includes('Загрузка'))return;
        if(html.length>MAX_HTML)return;
        const id=node.id||selector+'#'+index;
        data[id]={selector,index,html};
        total+=html.length;
      });
    });
    if(!Object.keys(data).length)return;
    try{
      localStorage.setItem(key,JSON.stringify({at:Date.now(),html:data}));
    }catch(e){}
  };

  const restore=()=>{
    const cached=read();
    if(!cached)return;
    Object.values(cached.html||{}).forEach(item=>{
      const nodes=[...document.querySelectorAll(item.selector)];
      const node=nodes[item.index||0];
      if(node&&item.html)node.innerHTML=item.html;
    });
    document.documentElement.dataset.pageCacheRestored='1';
  };

  restore();

  let timer=0;
  const schedule=()=>{
    clearTimeout(timer);
    timer=setTimeout(write,350);
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      selectors.forEach(selector=>{
        document.querySelectorAll(selector).forEach(node=>{
          new MutationObserver(schedule).observe(node,{childList:true,subtree:true});
        });
      });
      schedule();
    },{once:true});
  }else{
    selectors.forEach(selector=>{
      document.querySelectorAll(selector).forEach(node=>{
        new MutationObserver(schedule).observe(node,{childList:true,subtree:true});
      });
    });
    schedule();
  }

  window.CLANWARS_PAGE_CACHE={read,write,restore};
})();
