(function(){
  const KEY='empire_alliances_v1';
  const defaultRegiments={
    "1st Regiment":{rating:1840,members:42,img:"assets/1st.jpg"},
    "95th Rifles":{rating:1715,members:37,img:"assets/95.webp"},
    "84e Régiment":{rating:1630,members:35,img:"assets/84e.png"},
    "Preobrazhensky":{rating:1590,members:31,img:"assets/preobraz.webp"},
    "7th Hussars":{rating:1565,members:29,img:"assets/hussars.png"},
    "13e Léger":{rating:1510,members:28,img:"assets/1st.jpg"},
    "33e Ligne":{rating:1475,members:26,img:"assets/95.webp"},
    "92nd Gordon Highlanders":{rating:1420,members:24,img:"assets/84e.png"},
    "Semenovsky":{rating:1385,members:23,img:"assets/preobraz.webp"},
    "King's German Legion":{rating:1320,members:21,img:"assets/kgr.png"},
    "6e Hussards":{rating:1260,members:19,img:"assets/1st.jpg"},
    "Royal Scots":{rating:1195,members:17,img:"assets/95.webp"}
  };
  const seeds=[
    {id:"alliance-001",name:"Имперский союз",avatar:"assets/empire_logo_top_right.png",leader:"Ankord",members:["1st Regiment","Preobrazhensky","7th Hussars"],battles:[
      {id:"battle-002",date:"29.10.2026",title:"1st Regiment vs 84e Régiment",result:"win",calledBy:"1st Regiment",helpedBy:["Preobrazhensky"]},
      {id:"battle-006",date:"06.11.2026",title:"1st Regiment vs Preobrazhensky",result:"draw",calledBy:"1st Regiment",helpedBy:["7th Hussars"]}
    ]},
    {id:"alliance-002",name:"Братство линии",avatar:"assets/95.webp",leader:"Marquis",members:["95th Rifles","33e Ligne","Royal Scots"],battles:[
      {id:"battle-001",date:"26.10.2026",title:"95th Rifles vs 1st Regiment",result:"loss",calledBy:"95th Rifles",helpedBy:["33e Ligne"]}
    ]},
    {id:"alliance-003",name:"Северная коалиция",avatar:"assets/preobraz.webp",leader:"Veli4estvo",members:["84e Régiment","Semenovsky","King's German Legion"],battles:[]}
  ];
  const clone=o=>JSON.parse(JSON.stringify(o));
  function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return Array.isArray(v)?v:clone(seeds)}catch(e){return clone(seeds)}}
  function write(v){localStorage.setItem(KEY,JSON.stringify(v))}
  function ensure(){const current=read();const ids=new Set(current.map(a=>a.id));seeds.forEach(s=>{if(!ids.has(s.id))current.push(clone(s))});write(current);return current}
  function getAll(){return ensure().filter(a=>{try{return !(JSON.parse(localStorage.getItem('empire_deleted_alliances_v1')||'[]')).includes(a.id)}catch(e){return true}})}
  function getById(id){return getAll().find(a=>a.id===id)}
  function regimentRating(name){return defaultRegiments[name]?.rating||0}
  function calcBattlePoints(a){
    return (a.battles||[]).reduce((sum,b)=>sum+(b.result==="win"?120:b.result==="draw"?40:-80),0)
  }
  function calcRating(a){
    return a.members.reduce((sum,n)=>sum+regimentRating(n),0)+calcBattlePoints(a)
  }
  function statusForBattle(b){return b.result==="win"?"Победа":b.result==="loss"?"Поражение":"Ничья"}
  function totalMembers(a){return a.members.reduce((sum,n)=>sum+(defaultRegiments[n]?.members||0),0)}
  function create(name,leader,avatar){
    const all=getAll();
    const id='alliance-'+Date.now();
    const item={id,name:name.trim(),avatar:avatar||'assets/empire_logo_top_right.png',leader:leader.trim()||'Командир',members:[],battles:[],applications:[]};
    all.push(item);write(all);return item
  }
  function apply(allianceId,regiment,commander){
    const all=getAll(),a=all.find(x=>x.id===allianceId);if(!a)return false;
    if(a.members.includes(regiment))return false;
    if(all.some(x=>x.id!==allianceId&&x.members.includes(regiment)))return false;
    a.applications=a.applications||[];
    if(a.applications.some(x=>x.regiment===regiment&&x.status==="pending"))return false;
    a.applications.push({regiment,commander,status:"pending",date:new Date().toLocaleDateString('ru-RU')});
    write(all);return true
  }
  function decide(allianceId,regiment,accept){
    const all=getAll(),a=all.find(x=>x.id===allianceId);if(!a)return false;
    a.applications=a.applications||[];
    const app=a.applications.find(x=>x.regiment===regiment&&x.status==="pending");if(!app)return false;
    app.status=accept?"accepted":"rejected";
    if(accept)a.members.push(regiment);
    write(all);return true
  }
  window.EMPIRE_ALLIANCES={getAll,getById,create,apply,decide,calcRating,totalMembers,statusForBattle,regimentRating,defaultRegiments};
})();