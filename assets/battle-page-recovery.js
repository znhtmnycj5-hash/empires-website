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

  function simpleCommentCard(comment) {
    const name = comment.name || comment.author || 'Пользователь';
    const text = comment.html || escapeHtml(comment.text || '');
    return '<article class="battle-thread-item" data-comment-id="' + escapeHtml(comment.id) + '">' +
      '<div class="battle-comment">' +
        '<div class="battle-comment-author">' +
          '<a class="battle-comment-avatar-link" href="' + profileUrl(name) + '">' +
            '<img class="battle-comment-avatar" src="' + escapeHtml(comment.avatar || 'assets/default-soldier.jpg') + '" alt="' + escapeHtml(name) + '">' +
          '</a>' +
          '<div class="battle-comment-identity">' +
            '<div class="battle-comment-head"><a href="' + profileUrl(name) + '"><strong>' + escapeHtml(name) + '</strong></a></div>' +
            '<span class="battle-comment-time">' + escapeHtml(comment.time || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="battle-comment-content"><div class="battle-comment-text">' + text + '</div></div>' +
      '</div>' +
    '</article>';
  }

  async function initCommentRecovery(ctx) {
    const button = document.getElementById('commentSubmitButton');
    const editor = document.getElementById('commentInput');
    const list = document.getElementById('commentList');
    if (!button || !editor || !list || !window.EMPIRE_COMMENTS) return;

    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const text = editor.textContent.trim();
      const html = editor.innerHTML.trim();
      if (!text && !html.replace(/<[^>]*>/g, '').trim() && !html.includes('<img ')) return;

      if (!window.EMPIRE_AUTH?.user) {
        document.querySelector('a.login')?.click();
        alert('Для отправки комментария войдите в аккаунт.');
        return;
      }

      button.disabled = true;
      try {
        const remote = await window.EMPIRE_COMMENTS.create('battle', ctx.id, {
          text,
          html,
          image: '',
          parentId: null
        });

        const empty = list.querySelector('.battle-comments-empty');
        if (empty) empty.remove();
        list.insertAdjacentHTML('beforeend', simpleCommentCard(remote));
        const count = document.getElementById('commentCount');
        if (count) count.textContent = String(list.querySelectorAll('.battle-thread-item').length);
        editor.innerHTML = '';
      } catch (error) {
        alert(error.message || 'Не удалось сохранить комментарий.');
      } finally {
        button.disabled = false;
      }
    }, true);
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