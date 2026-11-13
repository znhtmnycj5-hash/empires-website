(() => {
  const form=document.getElementById('siteSearchForm');
  const input=document.getElementById('siteSearchInput');
  const results=document.getElementById('searchResults');
  const label=document.getElementById('searchQueryLabel');
  const body=document.getElementById('searchResultsBody');

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const avatarFor=profile=>{
    if(profile?.avatar_url)return profile.avatar_url;
    try{return window.EMPIRE_FACTION_AVATARS?.[profile?.faction]||'assets/aea32583-9230-496e-af65-c2e33f73ff79.png';}catch(e){return 'assets/aea32583-9230-496e-af65-c2e33f73ff79.png';}
  };
  const commentUrl=row=>{
    const type=String(row.context_type||'');
    if(type==='battle')return 'battle.html?id='+encodeURIComponent(row.context_id||'');
    if(type==='regiment_news')return 'news.html?id='+encodeURIComponent(row.context_id||'');
    return 'index.html';
  };
  const commentTitle=row=>{
    const type=String(row.context_type||'');
    if(type==='battle')return 'Комментарий к сражению';
    if(type==='regiment_news')return 'Комментарий к новости полка';
    return 'Комментарий';
  };
  const commentText=row=>{
    const c=row.content&&typeof row.content==='object'?row.content:{};
    return String(c.text||c.html||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  };
  const empty=(message='Ничего не найдено.')=>'<div style="padding:22px 8px;color:#8f8068;text-align:center">'+esc(message)+'</div>';

  const renderSection=(title,items,renderer)=>{
    return '<section style="margin-bottom:22px"><h3 style="font-family:Cinzel,serif;color:#b99559;font-size:15px;margin:0 0 10px">'+title+' <span style="font:11px Roboto Slab;color:#8f8068">('+items.length+')</span></h3>'+ (items.length?items.map(renderer).join(''):empty())+'</section>';
  };

  const search=async q=>{
    const auth=await window.EMPIRE_AUTH.init();
    if(!auth?.client)throw new Error('Не удалось подключиться к базе данных.');

    const pattern='%'+q.replace(/[%_]/g,m=>'%'+m)+'%';
    const [usersRes,regimentsRes,commentsRes]=await Promise.all([
      auth.client.from('empire_profiles').select('id,display_name,regiment,avatar_url').ilike('display_name',pattern).order('display_name').limit(30),
      auth.client.from('empire_regiments').select('id,name,faction,logo_url,commander_id').ilike('name',pattern).order('name').limit(30),
      auth.client.from('empire_comments').select('id,context_type,context_id,author_id,author_name,author_regiment,content,created_at').ilike('content->>text',pattern).order('created_at',{ascending:false}).limit(30)
    ]);
    if(usersRes.error)throw usersRes.error;
    if(regimentsRes.error)throw regimentsRes.error;
    if(commentsRes.error)throw commentsRes.error;

    const users=usersRes.data||[];
    const regiments=regimentsRes.data||[];
    const comments=commentsRes.data||[];

    let html='';
    html+=renderSection('Пользователи',users,row=>{
      const href='profile.html?user='+encodeURIComponent(row.id);
      return '<a href="'+href+'" style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-bottom:1px solid #332b21;text-decoration:none;color:inherit"><img src="'+esc(avatarFor(row))+'" alt="" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:1px solid #7e633f"><span><strong style="color:#d8c39a">'+esc(row.display_name||'Пользователь')+'</strong><small style="display:block;color:#8f8068;margin-top:3px">'+esc(row.regiment||'Не состоит в полку')+'</small></span></a>';
    });
    html+=renderSection('Полки',regiments,row=>{
      const href='regiment.html?name='+encodeURIComponent(row.name);
      return '<a href="'+href+'" style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-bottom:1px solid #332b21;text-decoration:none;color:inherit"><img src="'+esc(row.logo_url||'assets/empire_logo_top_right.png')+'" alt="" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:1px solid #7e633f"><span><strong style="color:#d8c39a">'+esc(row.name)+'</strong><small style="display:block;color:#8f8068;margin-top:3px">'+esc(row.faction||'')+'</small></span></a>';
    });
    html+=renderSection('Комментарии',comments,row=>{
      const text=commentText(row);
      const href=commentUrl(row);
      const author=row.author_name||'Пользователь';
      const date=row.created_at?new Date(row.created_at).toLocaleString('ru-RU'):'';
      return '<a href="'+href+'" style="display:block;padding:12px 8px;border-bottom:1px solid #332b21;text-decoration:none;color:inherit"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><strong style="color:#d8c39a">'+esc(author)+'</strong><small style="color:#8f8068">'+esc(date)+'</small></div><div style="font-size:11px;color:#b49d7b;margin-top:3px">'+esc(commentTitle(row))+'</div><div style="margin-top:6px;color:#d0c1aa;line-height:1.5">'+esc(text.slice(0,300))+(text.length>300?'…':'')+'</div></a>';
    });
    return {html,counts:{users:users.length,regiments:regiments.length,comments:comments.length}};
  };

  const run=async()=>{
    const q=input.value.trim();
    if(q.length<2){
      results.hidden=false;
      label.textContent='';
      body.innerHTML=empty('Введите минимум 2 символа.');
      return;
    }
    results.hidden=false;
    label.textContent='— «'+q+'»';
    body.innerHTML=empty('Поиск…');
    try{
      const found=await search(q);
      body.innerHTML=found.html;
    }catch(error){
      body.innerHTML=empty('Не удалось выполнить поиск. Попробуйте ещё раз.');
      console.error(error);
    }
  };

  form.addEventListener('submit',event=>{event.preventDefault();run();});
  const initial=new URLSearchParams(location.search).get('q');
  if(initial){input.value=initial;run();}
})();