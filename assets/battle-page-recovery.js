(() => {
  'use strict';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  const profileUrl = name => 'profile.html?user=' + encodeURIComponent(String(name || ''));

  async function getClient() {
    if (!window.EMPIRE_AUTH?.init) throw new Error('Авторизация Supabase не загрузилась');
    return await window.EMPIRE_AUTH.init();
  }

  async function loadBattle() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) throw new Error('В адресе страницы отсутствует id сражения');

    const client = await getClient();
    const { data: row, error } = await client
      .from('empire_public_battles')
      .select('id,challenger_regiment_id,target_regiment_id,battle_type,player_count,scheduled_at,status')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!row) throw new Error('Сражение не найдено');

    const { data: regiments, error: regimentError } = await client
      .from('empire_regiments')
      .select('id,name,faction,logo_url')
      .in('id', [row.challenger_regiment_id, row.target_regiment_id]);

    if (regimentError) throw regimentError;

    const map = new Map((regiments || []).map(r => [String(r.id), r]));
    const left = map.get(String(row.challenger_regiment_id));
    const right = map.get(String(row.target_regiment_id));

    if (!left || !right) throw new Error('Не удалось загрузить полки сражения');

    return { id, row, left, right, client };
  }

  function renderVotes(ctx, votes) {
    const box = document.getElementById('battleVoteContent');
    if (!box) return;

    const leftId = String(ctx.left.id);
    const rightId = String(ctx.right.id);
    const leftVotes = votes.filter(v => String(v.voted_regiment_id) === leftId).length;
    const rightVotes = votes.filter(v => String(v.voted_regiment_id) === rightId).length;
    const total = leftVotes + rightVotes;
    const leftPct = total ? Math.round(leftVotes / total * 100) : 0;
    const rightPct = total ? 100 - leftPct : 0;
    const userId = window.EMPIRE_AUTH?.user?.id;
    const mine = votes.find(v => String(v.user_id) === String(userId));
    const beforeStart = ctx.row.status === 'accepted' && Date.now() < new Date(ctx.row.scheduled_at).getTime();

    const voterNames = id => {
      const names = votes.filter(v => String(v.voted_regiment_id) === String(id))
        .map(v => v.display_name || 'Пользователь');
      return names.length
        ? names.map(n => '<a href="' + profileUrl(n) + '">' + escapeHtml(n) + '</a>').join(' · ')
        : '<span class="battle-voter-empty">Пока никто не проголосовал</span>';
    };

    const side = (regiment, id, pct, count) => {
      const selected = mine && String(mine.voted_regiment_id) === String(id);
      const disabled = !!mine || !beforeStart;
      const label = selected
        ? '✓ Вы выбрали этот полк'
        : beforeStart
          ? 'Голосовать за ' + escapeHtml(regiment.name)
          : 'Голосование завершено';

      return '<div class="battle-vote-side">' +
        '<div class="battle-vote-side-head">' +
          '<img src="' + escapeHtml(regiment.logo_url || 'assets/default-soldier.jpg') + '" alt="">' +
          '<div><strong>' + escapeHtml(regiment.name) + '</strong><span>' + count + ' ' + (count === 1 ? 'голос' : count >= 2 && count <= 4 ? 'голоса' : 'голосов') + '</span></div>' +
        '</div>' +
        '<div class="battle-vote-bar"><span style="width:' + pct + '%"></span></div>' +
        '<div class="battle-vote-percent">' + pct + '%</div>' +
        '<button type="button" class="battle-vote-button' + (selected ? ' is-selected' : '') + '" data-recovery-vote="' + escapeHtml(id) + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>' +
        '<div class="battle-voters"><b>Кто голосовал:</b><div>' + voterNames(id) + '</div></div>' +
      '</div>';
    };

    box.innerHTML =
      '<div class="battle-vote-intro">' +
        '<p>До начала сражения каждый пользователь может один раз выбрать, какой полк, по его мнению, победит.</p>' +
        '<strong>' + (total ? 'Мнение пользователей: ' + leftPct + '% против ' + rightPct + '%' : 'Мнение пользователей пока не сформировано') + '</strong>' +
      '</div>' +
      '<div class="battle-vote-grid">' +
        side(ctx.left, leftId, leftPct, leftVotes) +
        '<div class="battle-vote-vs">VS</div>' +
        side(ctx.right, rightId, rightPct, rightVotes) +
      '</div>' +
      '<div class="battle-vote-note">' +
        (mine
          ? '✓ Ваш голос уже принят. Изменить его нельзя.'
          : beforeStart
            ? 'Голосовать можно только один раз. Участники самого сражения тоже могут голосовать.'
            : 'Голосование завершено с началом сражения.') +
      '</div>';
  }

  async function initVotes(ctx) {
    const box = document.getElementById('battleVoteContent');
    if (!box) return;

    box.innerHTML = '<div class="battle-vote-loading">Загрузка голосования…</div>';

    const load = async () => {
      const { data, error } = await ctx.client
        .from('empire_public_battle_votes')
        .select('battle_id,user_id,voted_regiment_id,display_name,created_at')
        .eq('battle_id', ctx.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      renderVotes(ctx, Array.isArray(data) ? data : []);
    };

    try {
      await load();
    } catch (error) {
      console.error('Battle voting:', error);
      box.innerHTML = '<div class="battle-vote-unavailable">Не удалось загрузить голосование.</div>';
      return;
    }

    box.addEventListener('click', async event => {
      const button = event.target.closest('[data-recovery-vote]');
      if (!button || button.disabled) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!window.EMPIRE_AUTH?.user) {
        document.querySelector('a.login')?.click();
        alert('Для голосования войдите в аккаунт.');
        return;
      }

      button.disabled = true;
      const { error } = await ctx.client.rpc('empire_vote_battle', {
        p_battle_id: ctx.id,
        p_voted_regiment_id: button.dataset.recoveryVote
      });

      if (error) {
        alert(error.message || 'Не удалось сохранить голос.');
        await load().catch(() => {});
        return;
      }

      await load();
    }, true);

    setInterval(() => load().catch(() => {}), 10000);
  }

  const commentsKey = battleId => 'empire-battle-comments-' + battleId;
  const likesKey = id => 'battle:' + id;
  const readLikes = id => {
    try{
      const map=JSON.parse(localStorage.getItem('empire-comment-likes-v1')||'{}');
      return Array.isArray(map[likesKey(id)]) ? map[likesKey(id)] : [];
    }catch(e){return [];}
  };
  const toggleLike = id => {
    let map={};
    try{map=JSON.parse(localStorage.getItem('empire-comment-likes-v1')||'{}')||{};}catch(e){}
    const list=Array.isArray(map[likesKey(id)])?map[likesKey(id)]:[];
    const name=window.EMPIRE_AUTH?.profile?.display_name||window.EMPIRE_AUTH?.user?.email||'Пользователь';
    const i=list.indexOf(name);
    if(i>=0)list.splice(i,1);else list.push(name);
    map[likesKey(id)]=list;
    localStorage.setItem('empire-comment-likes-v1',JSON.stringify(map));
  };

  function renderBattleComments(ctx, comments){
    const list=document.getElementById('commentList');
    const count=document.getElementById('commentCount');
    if(!list)return;
    const all=Array.isArray(comments)?comments:[];
    const escape=escapeHtml;
    const profileUrl=name=>'profile.html?user='+encodeURIComponent(String(name||''));
    const card=(c,depth=0)=>{
      const id=String(c.id||''), name=String(c.name||c.author||'Пользователь');
      const children=all.filter(x=>String(x.parentId||'')===id);
      const likes=readLikes(id);
      const own=String(c._authorId||c.author_id||'')===String(window.EMPIRE_AUTH?.user?.id||'') || (c.name||c.author)===((window.EMPIRE_AUTH?.profile?.display_name)||'');
      const online=!!c.online;
      const regiment=String(c.regiment||c.author_regiment||'').trim();
      const smileHtml=value=>String(value||'')
        .replace(/:smile(1[0-9]|20|[1-9]):/gi,(m,n)=>'<img class="clanwars-smile" src="/empires-website/assets/smile/'+n+'.png" alt="Смайл '+n+'" title="Смайл '+n+'">')
        .replace(/(<img\b[^>]*\bsrc=["'])(?:\.\.\/|\.\/)?(?:empires-website\/)?assets\/smile\/(1[0-9]|20|[1-9])\.png(["'][^>]*>)/gi,'$1/empires-website/assets/smile/$2.png$3')
        .replace(/(<img\b[^>]*\bsrc=["'])\/assets\/smile\/(1[0-9]|20|[1-9])\.png(["'][^>]*>)/gi,'$1/empires-website/assets/smile/$2.png$3');
      const sourceHtml=c.html||c.text||'';
      const textHtml=smileHtml(c.html?sourceHtml:escape(sourceHtml)).replace(/\\n/g,'<br>');
      const likePreview=likes.slice(0,2).map(escape).join(', ');
      const likeHtml='<div class="comment-reactions"><button class="comment-like-button'+(likes.includes(window.EMPIRE_AUTH?.profile?.display_name)?' is-liked':'')+'" type="button" data-recovery-like="'+escape(id)+'">♥ <span>Нравится</span> <b>'+likes.length+'</b></button>'+(likes.length?'<div class="comment-like-popover"><span class="comment-like-preview">'+likePreview+'</span><button type="button" class="comment-like-all" data-recovery-likes="'+escape(id)+'">Посмотреть всех</button><div class="comment-like-full" hidden>'+likes.map(x=>'<a href="'+profileUrl(x)+'">'+escape(x)+'</a>').join(' · ')+'</div></div>':'')+'</div>';
      const actions=(own?'<button class="comment-edit-button" type="button" data-recovery-edit="'+escape(id)+'">Изменить</button><button class="comment-delete-button" type="button" data-recovery-delete="'+escape(id)+'">Удалить</button>':'')+
        '<button class="comment-report-button" type="button" data-recovery-report="'+escape(id)+'">⚑ Пожаловаться</button>'+
        '<button class="battle-reply-button" type="button" data-recovery-reply="'+escape(id)+'">Ответить</button>'+
        '<form class="battle-reply-form" data-recovery-parent="'+escape(id)+'" hidden><input type="text" maxlength="500" placeholder="Ответить '+escape(name)+'…" required><button type="submit">Ответить</button></form>';
      return '<article class="battle-thread-item'+(depth?' is-reply':'')+'" data-comment-id="'+escape(id)+'"><div class="battle-comment"><div class="battle-comment-author"><a class="battle-comment-avatar-link" href="'+profileUrl(name)+'"><img class="battle-comment-avatar" src="'+escape(c.avatar||'assets/default-soldier.jpg')+'" alt="'+escape(name)+'" loading="lazy"></a><div class="battle-comment-identity"><div class="battle-comment-head"><a href="'+profileUrl(name)+'"><strong>'+escape(name)+'</strong></a></div>'+(regiment?'<div class="battle-comment-regiment">'+escape(regiment)+'</div>':'')+'<span class="battle-comment-presence '+(online?'is-online':'is-offline')+'"><i></i>'+(online?'В сети':'Не в сети')+'</span></div></div><div class="battle-comment-content"><div class="battle-comment-text">'+textHtml+'</div>'+likeHtml+actions+'</div></div>'+(children.length?'<div class="battle-thread-replies">'+children.map(x=>card(x,depth+1)).join('')+'</div>':'')+'</article>';
    };
    const roots=all.filter(c=>!c.parentId||!all.some(p=>String(p.id)===String(c.parentId)));
    list.innerHTML=roots.length?roots.map(c=>card(c)).join(''):'<div class="battle-comments-empty">Комментариев пока нет.</div>';
    if(count)count.textContent=String(all.length);
  }

  async function initCommentRecovery(ctx){
    const list=document.getElementById('commentList');
    const button=document.getElementById('commentSubmitButton');
    const editor=document.getElementById('commentInput');
    if(!list||!button||!editor||!window.EMPIRE_COMMENTS)return;

    let comments=[];
    const sync=async()=>{
      const remote=await window.EMPIRE_COMMENTS.list('battle',ctx.id);
      comments=remote||[];
      try{localStorage.setItem(commentsKey(ctx.id),JSON.stringify(comments));}catch(e){}
      renderBattleComments(ctx,comments);
    };

    try{await sync();}catch(error){console.warn('Battle comments load:',error);}

    button.addEventListener('click',async event=>{
      event.preventDefault();event.stopImmediatePropagation();
      const text=editor.textContent.trim(),html=editor.innerHTML.trim();
      if(!text&&!html.replace(/<[^>]*>/g,'').trim()&&!html.includes('<img '))return;
      if(!window.EMPIRE_AUTH?.user){document.querySelector('a.login')?.click();alert('Для отправки комментария войдите в аккаунт.');return;}
      button.disabled=true;
      try{
        await window.EMPIRE_COMMENTS.create('battle',ctx.id,{text,html,image:'',parentId:null});
        editor.innerHTML='';
        await sync();
      }catch(error){alert(error.message||'Не удалось сохранить комментарий.');}
      finally{button.disabled=false;}
    },true);

    list.addEventListener('click',async event=>{
      const edit=event.target.closest('[data-recovery-edit]');
      if(edit){
        event.preventDefault();event.stopImmediatePropagation();
        const item=comments.find(x=>String(x.id)===String(edit.dataset.recoveryEdit));if(!item)return;
        const next=prompt('Изменить комментарий:',item.text||item.html?.replace(/<[^>]*>/g,'')||'');if(next===null)return;
        try{await window.EMPIRE_COMMENTS.update(item.id,{text:next,html:escapeHtml(next)});await sync();}catch(e){alert(e.message||'Не удалось изменить комментарий.');}
        return;
      }
      const del=event.target.closest('[data-recovery-delete]');
      if(del){
        event.preventDefault();event.stopImmediatePropagation();
        if(!confirm('Удалить этот комментарий?'))return;
        try{await window.EMPIRE_COMMENTS.remove(del.dataset.recoveryDelete);await sync();}catch(e){alert(e.message||'Не удалось удалить комментарий.');}
        return;
      }
      const like=event.target.closest('[data-recovery-like]');
      if(like){event.preventDefault();toggleLike(like.dataset.recoveryLike);renderBattleComments(ctx,comments);return;}
      const likes=event.target.closest('[data-recovery-likes]');
      if(likes){const panel=likes.parentElement.querySelector('.comment-like-full');if(panel)panel.hidden=!panel.hidden;return;}
      const report=event.target.closest('[data-recovery-report]');
      if(report){event.preventDefault();alert('Жалоба отправлена модераторам.');return;}
      const reply=event.target.closest('[data-recovery-reply]');
      if(reply){event.preventDefault();const form=reply.closest('.battle-thread-item')?.querySelector(':scope > .battle-comment .battle-reply-form');if(form){form.hidden=!form.hidden;form.style.display=form.hidden?'none':'flex';if(!form.hidden)form.querySelector('input')?.focus();}return;}
    },true);

    list.addEventListener('submit',async event=>{
      const form=event.target.closest('[data-recovery-parent]');if(!form)return;
      event.preventDefault();event.stopImmediatePropagation();
      const input=form.querySelector('input'),text=input?.value.trim();if(!text)return;
      try{await window.EMPIRE_COMMENTS.create('battle',ctx.id,{text,html:escapeHtml(text),image:'',parentId:form.dataset.recoveryParent});await sync();}catch(e){alert(e.message||'Не удалось сохранить ответ.');}
    },true);
  }

  async function start() {
    try {
      const ctx = await loadBattle();
      await initVotes(ctx);
      await initCommentRecovery(ctx);
    } catch (error) {
      console.error('Battle page recovery:', error);
      const vote = document.getElementById('battleVoteContent');
      if (vote) vote.innerHTML = '<div class="battle-vote-unavailable">Не удалось загрузить данные голосования.</div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();