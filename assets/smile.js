(function(){
'use strict';
const items=Array.from({length:20},(_,i)=>({key:'smile'+(i+1),src:'assets/smile/'+(i+1)+'.png',label:'Смайл '+(i+1)}));
const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const renderText=s=>escapeText(s).replace(/:smile([1-9]|1[0-9]|20):/gi,(m,n)=>'<img class="clanwars-smile" src="assets/smile/'+n+'.png" alt="Смайл '+n+'" title="Смайл '+n+'">');
function makePicker(button, target, opts){
  if(!button||!target||button.dataset.smileReady)return;
  button.dataset.smileReady='1';
  const wrap=document.createElement('span');wrap.className='clanwars-smile-wrap';
  const picker=document.createElement('span');picker.className='clanwars-smile-picker';picker.setAttribute('aria-label','Смайлы');
  picker.innerHTML=items.map(e=>'<button type="button" data-smile-key="'+e.key+'" title="'+e.label+'"><img src="'+e.src+'" alt="'+e.label+'"></button>').join('');
  button.parentNode.insertBefore(wrap,button);wrap.append(button,picker);
  const insertKey=key=>{
    if(target.disabled)return;
    const n=key.replace('smile',''),token=':'+key+':';
    if(target.isContentEditable){
      target.focus();
      const sel=getSelection();
      let range=sel&&sel.rangeCount?sel.getRangeAt(0):null;
      if(!range||!target.contains(range.commonAncestorContainer)){range=document.createRange();range.selectNodeContents(target);range.collapse(false);}
      const img=document.createElement('img');img.className='clanwars-smile';img.src='assets/smile/'+n+'.png';img.alt='Смайл '+n;img.title='Смайл '+n;img.dataset.smile=key;
      range.deleteContents();range.insertNode(img);range.setStartAfter(img);range.collapse(true);
      sel.removeAllRanges();sel.addRange(range);
    }else{
      const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;
      target.value=target.value.slice(0,start)+token+target.value.slice(end);
      const pos=start+token.length;target.focus();target.setSelectionRange(pos,pos);
      target.dispatchEvent(new Event('input',{bubbles:true}));
    }
    picker.classList.remove('show');
  };
  picker.addEventListener('click',e=>{const b=e.target.closest('[data-smile-key]');if(b)insertKey(b.dataset.smileKey);});
  button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();picker.classList.toggle('show');});
  document.addEventListener('click',e=>{if(!wrap.contains(e.target))picker.classList.remove('show');});
  return {wrap,picker,insertKey};
}
window.CLANWARS_SMILES={items,renderText,makePicker};
})();