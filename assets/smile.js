(function(){
'use strict';
const items=Array.from({length:30},(_,i)=>({key:'smile'+(i+1),src:'assets/smile/'+(i+1)+'.png',label:'Смайл '+(i+1)}));
const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const renderText=s=>escapeText(s).replace(/:smile([1-9]|1[0-9]|2[0-9]|30):/gi,(m,n)=>'<img class="clanwars-smile" src="assets/smile/'+n+'.png" alt="Смайл '+n+'" title="Смайл '+n+'">');
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
      const textNode=document.createTextNode(token);
      range.deleteContents();range.insertNode(textNode);range.setStartAfter(textNode);range.collapse(true);
      sel.removeAllRanges();sel.addRange(range);
      target.dispatchEvent(new Event('input',{bubbles:true}));
    }else{
      const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;
      target.value=target.value.slice(0,start)+token+target.value.slice(end);
      const pos=start+token.length;target.focus();target.setSelectionRange(pos,pos);
      target.dispatchEvent(new Event('input',{bubbles:true}));
    }
    picker.classList.remove('show');
  };
  picker.addEventListener('click',e=>{const b=e.target.closest('[data-smile-key]');if(b)insertKey(b.dataset.smileKey);});
  button.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    const open=!picker.classList.contains('show');
    if(open){
      if(picker.parentNode!==document.body)document.body.appendChild(picker);
      picker.classList.add('show');
      picker.style.setProperty('position','fixed','important');
      picker.style.setProperty('z-index','2147483647','important');
      picker.style.setProperty('display','grid','important');
      picker.style.setProperty('width',Math.min(240,window.innerWidth-16)+'px','important');
      const r=button.getBoundingClientRect(),h=picker.getBoundingClientRect().height,w=picker.getBoundingClientRect().width;
      const left=Math.max(8,Math.min(r.left,window.innerWidth-w-8));
      const top=r.top-h-8>=8?r.top-h-8:Math.min(window.innerHeight-h-8,r.bottom+8);
      picker.style.setProperty('left',left+'px','important');
      picker.style.setProperty('top',Math.max(8,top)+'px','important');
      picker.style.setProperty('right','auto','important');
      picker.style.setProperty('bottom','auto','important');
    }else{
      picker.classList.remove('show');
      picker.style.removeProperty('display');
      wrap.appendChild(picker);
    }
  });
  document.addEventListener('click',e=>{if(!wrap.contains(e.target)&&!picker.contains(e.target)){picker.classList.remove('show');picker.style.removeProperty('display');wrap.appendChild(picker);}});
  return {wrap,picker,insertKey};
}
window.CLANWARS_SMILES={items,renderText,makePicker};
})();