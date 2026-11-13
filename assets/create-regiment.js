(() => {
  const REQUESTS_KEY = "empire_regiment_creation_requests_v1";
  const CURRENT_USER_KEY = "empire_current_user_v1";
  const APPROVED_KEY = "empire_approved_regiments_v1";
  const profiles = {
    Kalashnikov:"1st Regiment", Veli4estvo:"1st Regiment",
    Mel:"1st Regiment", Kazak:"1st Regiment", MeGusta:"1st Regiment",
    Flashkodr:"1st Regiment", MrDixon:"1st Regiment", Theodor:"1st Regiment",
    Grenadier87:"1st Regiment", Marquis:"95th Rifles", Fusilier:""
  };
  const form=document.getElementById("createRegimentForm");
  const notice=document.getElementById("createRegimentNotice");
  const file=document.getElementById("regimentLogo");
  const preview=document.getElementById("regimentLogoPreview");
  const currentUser=localStorage.getItem(CURRENT_USER_KEY)||"Kalashnikov";

  const getRequests=()=>{try{return JSON.parse(localStorage.getItem(REQUESTS_KEY)||"[]")}catch(e){return[]}};
  const saveRequests=x=>localStorage.setItem(REQUESTS_KEY,JSON.stringify(x));
  const getApproved=()=>{try{return JSON.parse(localStorage.getItem(APPROVED_KEY)||"[]")}catch(e){return[]}};
  const setNotice=(text,type)=>{notice.hidden=false;notice.className="create-regiment-notice "+type;notice.textContent=text};

  const approvedRegiment=getApproved().find(r=>r.commander===currentUser)?.name||"";
  const userRegiment=profiles[currentUser]||approvedRegiment;
  if(userRegiment){
    form.innerHTML='<div class="create-regiment-blocked"><strong>Создание полка недоступно</strong><p>Вы уже состоите в полку <b>'+userRegiment+'</b>. Сначала выйдите из текущего полка.</p><a class="btn" href="regiment.html?name='+encodeURIComponent(userRegiment)+'">Открыть полк</a></div>';
  }

  file?.addEventListener("change",()=>{
    const f=file.files?.[0];
    if(!f)return;
    if(!/^image\/(png|jpeg|webp|gif)$/.test(f.type)){setNotice("Можно загрузить только PNG, JPG, WEBP или GIF.","error");file.value="";return}
    if(f.size>2*1024*1024){setNotice("Логотип должен быть не больше 2 МБ.","error");file.value="";return}
    preview.src=URL.createObjectURL(f);
  });

  form?.addEventListener("submit",e=>{
    e.preventDefault();
    if(userRegiment){setNotice("Вы уже состоите в полку и не можете подать заявку.","error");return}
    const name=document.getElementById("regimentName").value.trim();
    const faction=document.getElementById("regimentFaction").value;
    const f=file.files?.[0];
    if(!name||!faction||!f){setNotice("Заполните все поля и загрузите логотип.","error");return}
    const existing=[...document.querySelectorAll("body")].length ? getApproved() : [];
    if(existing.some(r=>r.name.toLowerCase()===name.toLowerCase()) || getRequests().some(r=>r.name.toLowerCase()===name.toLowerCase()&&r.status==="pending")){
      setNotice("Полк с таким названием уже существует или уже находится на рассмотрении.","error");return
    }
    const reader=new FileReader();
    reader.onload=()=>{
      const requests=getRequests();
      requests.push({
        id:"regreq-"+Date.now(),
        user:currentUser,
        name,
        faction,
        logo:reader.result,
        status:"pending",
        createdAt:new Date().toISOString()
      });
      saveRequests(requests);
      form.reset();
      preview.src="assets/default-soldier.jpg";
      setNotice("Заявка отправлена администратору. После проверки он примет или отклонит её.","success");
    };
    reader.readAsDataURL(f);
  });
})();