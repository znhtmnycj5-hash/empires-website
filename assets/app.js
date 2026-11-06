const toast=(msg)=>{const e=document.getElementById('toast');if(!e)return;e.textContent=msg;e.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove('show'),2300)};
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');if(id&&id.length>1&&document.querySelector(id)){e.preventDefault();document.querySelector(id).scrollIntoView({behavior:'smooth',block:'start'})}}));
const modal=document.getElementById('loginModal');
document.querySelectorAll('[data-login]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();modal?.classList.add('show')}));
document.getElementById('closeLogin')?.addEventListener('click',()=>modal.classList.remove('show'));
modal?.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
document.getElementById('demoLogin')?.addEventListener('click',()=>{const n=document.getElementById('loginName').value.trim()||'Император';modal.classList.remove('show');toast('Добро пожаловать, '+n+'!')});
document.querySelectorAll('.chat-tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.chat-tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.chat-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById(b.dataset.tab).classList.add('active')}));
function sendChat(){const i=document.getElementById('chatInput'),v=i?.value.trim();if(!v)return;const box=document.querySelector('#general .messages');const r=document.createElement('div');r.className='msg';r.innerHTML='<div class="avatar">Я</div><div><b>Вы</b><p></p></div><div class="time">сейчас</div>';r.querySelector('p').textContent=v;box.appendChild(r);i.value='';toast('Сообщение добавлено в чат')}
document.getElementById('sendChat')?.addEventListener('click',sendChat);document.getElementById('chatInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')sendChat()});
document.querySelectorAll('[data-regiment]').forEach(e=>e.addEventListener('click',()=>toast('Открываем профиль: '+e.dataset.regiment)));


const regSearch=document.getElementById('regSearch');
const regNation=document.getElementById('regNation');
const regList=document.getElementById('regList');
function sortAndFilterRegiments(){
  if(!regList)return;
  const q=(regSearch?.value||'').trim().toLowerCase();
  const nation=regNation?.value||'';
  const cards=[...regList.querySelectorAll('.regiment-tile')];
  cards.sort((a,b)=>Number(b.dataset.rating)-Number(a.dataset.rating));
  cards.forEach(card=>regList.appendChild(card));
  let visible=0;
  cards.forEach(card=>{
    const show=(!q||(card.dataset.name||'').toLowerCase().includes(q))&&(!nation||card.dataset.nation===nation);
    card.style.display=show?'block':'none';
    if(show)visible++;
  });
  const empty=document.getElementById('regEmpty');
  if(empty)empty.style.display=visible?'none':'block';
}
regSearch?.addEventListener('input',sortAndFilterRegiments);
regNation?.addEventListener('change',sortAndFilterRegiments);
sortAndFilterRegiments();
