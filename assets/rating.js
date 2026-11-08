(() => {
  const parseBattleResult = (record) => {
    if ((record.dataset.status || '') !== 'completed') return null;
    const sides = [...record.querySelectorAll('.battle-side strong')].map(el => el.textContent.trim());
    const summary = record.querySelector('.battle-result-box span')?.textContent.trim() || '';
    if (summary.includes('Ничья')) return {type:'draw', teams:sides};
    const winMatch = summary.match(/^Победа\\s+(.+)$/);
    const lossMatch = summary.match(/^Поражение\\s+(.+)$/);
    if (winMatch) return {type:'win', winner:winMatch[1].trim(), loser:sides.find(n => n !== winMatch[1].trim()) || ''};
    if (lossMatch) return {type:'win', winner:sides.find(n => n !== lossMatch[1].trim()) || '', loser:lossMatch[1].trim()};
    return null;
  };

  window.calculateRegimentRatings = async () => {
    const [regimentsHtml, battlesHtml] = await Promise.all([
      fetch('regiments.html', {cache:'no-store'}).then(r => r.text()),
      fetch('battles.html', {cache:'no-store'}).then(r => r.text())
    ]);
    const regimentsDoc = new DOMParser().parseFromString(regimentsHtml, 'text/html');
    const battlesDoc = new DOMParser().parseFromString(battlesHtml, 'text/html');

    const ratings = {};
    regimentsDoc.querySelectorAll('.regiment-tile').forEach(tile => {
      const name = tile.querySelector('h2')?.textContent.trim();
      const countText = tile.querySelector('.regiment-meta span:last-child')?.textContent || '';
      const count = parseInt(countText.match(/\\d+/)?.[0] || '0', 10);
      if (name) ratings[name] = {name, count, score: count * 10, wins:0, losses:0, draws:0};
    });

    battlesDoc.querySelectorAll('.battle-record').forEach(record => {
      const result = parseBattleResult(record);
      if (!result) return;
      if (result.type === 'draw') {
        result.teams.forEach(name => {
          if (ratings[name]) { ratings[name].draws++; ratings[name].score += 25; }
        });
      } else {
        if (ratings[result.winner]) { ratings[result.winner].wins++; ratings[result.winner].score += 50; }
        if (ratings[result.loser]) { ratings[result.loser].losses++; ratings[result.loser].score -= 30; }
      }
    });

    return Object.values(ratings).sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
  };
})();