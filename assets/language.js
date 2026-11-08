(function(){
  const KEY='empire_site_language_v1';
  const saved=localStorage.getItem(KEY);
  const lang=saved==='en'?'en':'ru';
  document.documentElement.lang=lang;
  document.body.classList.toggle('lang-en',lang==='en');

  const dict={
    'Главная':'Home','Полки':'Regiments','Сражения':'Battles','Кампании':'Campaigns','Рейтинг':'Ranking','Форум':'Forum','Союзы':'Alliances',
    'Сообщество Mount & Blade: Napoleonic Wars':'Mount & Blade: Napoleonic Wars Community',
    'Сражайся и побеждай':'Fight and conquer','Все новости':'All news','Новости':'News','Читать новость':'Read news','Интересно':'Interesting',
    'Комментарии':'Comments','Комментариев пока нет.':'No comments yet.','Отправить':'Send','Ответить':'Reply','Нравится':'Like',
    'Предстоящие сражения':'Upcoming battles','Союз':'Alliance','Не состоит':'Not a member',
    'Состав':'Roster','История сражений':'Battle history','Летопись':'Chronicle','Альбом':'Album',
    'Показать остальные скриншоты':'Show remaining screenshots','Свернуть скриншоты':'Hide screenshots',
    'Список полков':'Regiment list','Участники':'Members','Командир':'Commander','Глава союза':'Alliance leader',
    'Рейтинг полка':'Regiment rating','Рейтинг союза':'Alliance rating','Полков':'Regiments',
    'Заявки':'Applications','Подать заявку':'Submit application','Принять':'Accept','Отклонить':'Reject',
    'Заявок пока нет.':'No applications yet.','В союзе пока нет полков.':'No regiments in this alliance yet.',
    'Союзных сражений пока нет.':'No alliance battles yet.','Заявка отправлена главе союза.':'Application sent to the alliance leader.',
    'Победа':'Victory','Поражение':'Defeat','Ничья':'Draw',
    'Вызов брошен':'Challenge issued','Вызов принят':'Challenge accepted','Идёт бой':'Battle in progress',
    'Ожидает подтверждения':'Awaiting confirmation','Завершено':'Completed',
    'Сейчас':'Now','сейчас':'now','Далее →':'Next →','Назад':'Back','Вернуться к союзам':'Back to alliances',
    'Союз не найден':'Alliance not found','Полк не найден':'Regiment not found',
    'Пользователи в сети':'Users online','Общий чат':'General chat','Полковой чат':'Regiment chat',
    'Доступ закрыт':'Access denied','Сообщение добавлено в чат':'Message added to chat',
    'Написать сообщение':'Write a message','Переписки с пользователем пока нет.':'No conversation with this user yet.',
    'Гости':'Visitors','Послужной список':'Service record','Профиль':'Profile',
    'Сохранить':'Save','Удалить':'Delete','Редактировать':'Edit','Создать':'Create',
    'Дата':'Date','Название':'Title','Описание':'Description','Изображение':'Image',
    'Результат':'Result','Дата сражения':'Battle date','Сервер':'Server','Пароль':'Password',
    'Открытая':'Public','Приватная':'Private','Рейтинг полков':'Regiment ranking','Статистика':'Statistics','Сообщество':'Community',
    'Полк':'Regiment','бойцов':'fighters','человек':'members','человека':'members','Рейтинг':'Rating',
    'Спасибо за тренировку!':'Thanks for the training!','Отправлю в общий чат.':'I will send it to the general chat.',
    'Все доступные полки уже состоят в союзе.':'All available regiments are already members of an alliance.',
    'Командир:':'Commander:','Глава союза:':'Alliance leader:','Помощь вызвана полком':'Assistance called by regiment',
    'Подготовка к сражению':'Preparing for battle','Сражение идёт':'Battle in progress',
    'Ожидается подтверждение командиров':'Awaiting commanders’ confirmation',
    'Сражение завершено':'Battle completed','Сражение не состоялось':'Battle did not take place',
    'Vive l’Empire!':'Vive l’Empire!','Союз не найден':'Alliance not found'
  };

  function translateText(node){
    const value=node.nodeValue, trimmed=value.trim();
    if(!trimmed)return;
    if(dict[trimmed]){node.nodeValue=value.replace(trimmed,dict[trimmed]);return;}
    Object.keys(dict).forEach(ru=>{
      if(ru.length>3 && value.includes(ru) && !value.includes('://'))node.nodeValue=node.nodeValue.split(ru).join(dict[ru]);
    });
  }
  function translateAttrs(el){
    ['placeholder','title','aria-label'].forEach(attr=>{
      const value=el.getAttribute(attr);
      if(value&&dict[value])el.setAttribute(attr,dict[value]);
    });
  }
  function translatePage(){
    if(lang!=='en')return;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(translateText);
    document.querySelectorAll('input,textarea,select,button,a,img').forEach(translateAttrs);
  }
  function addSwitcher(){
    const footer=document.querySelector('footer'); if(!footer)return;
    const host=footer.querySelector('.footer-inner')||footer;
    if(host.querySelector('.language-switcher'))return;
    const box=document.createElement('div');
    box.className='language-switcher';
    box.innerHTML='<button type="button" data-lang="ru">RU</button><span class="lang-separator">/</span><button type="button" data-lang="en">EN</button>';
    host.appendChild(box);
    box.querySelectorAll('button').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.lang===lang);
      btn.addEventListener('click',()=>{localStorage.setItem(KEY,btn.dataset.lang);location.reload();});
    });
  }
  addSwitcher();
  translatePage();
  window.EMPIRE_LANGUAGE={lang,translatePage};
})();