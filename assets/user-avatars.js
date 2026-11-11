/* Shared user avatars and faction fallbacks for EMPIRE */
window.EMPIRE_USER_AVATARS={
 "Kalashnikov":"assets/avatar.jpg","Ankord":"assets/avatar.jpg",
 "Veli4estvo":"assets/images (4).jpg","Mel":"assets/images (1).jpg",
 "Kazak":"assets/images (6).jpg","MeGusta":"assets/images.jpg",
 "Flashkodr":"assets/images (2).jpg","MrDixon":"assets/images (3).jpg",
 "Theodor":"assets/images (5).jpg","Grenadier87":"assets/images.jpg",
 "Marquis":"assets/images (1).jpg","Fusilier":"assets/aea32583-9230-496e-af65-c2e33f73ff79.png"
};

/* Фракция определяется по полку пользователя; список можно расширять при добавлении составов. */
window.EMPIRE_USER_FACTIONS={
 "Kalashnikov":"Французская Империя","Ankord":"Французская Империя",
 "Veli4estvo":"Французская Империя","Mel":"Французская Империя",
 "Kazak":"Французская Империя","MeGusta":"Французская Империя",
 "Flashkodr":"Французская Империя","MrDixon":"Французская Империя",
 "Theodor":"Французская Империя","Grenadier87":"Французская Империя",
 "Marquis":"Британская Империя"
};

window.EMPIRE_FACTION_AVATARS={
 "Французская Империя":"assets/default-soldier.jpg",
 "Австрийская Империя":"assets/austria-avatar.png",
 "Австрийская империя":"assets/austria-avatar.png",
 "Российская Империя":"assets/russia-avatar.png",
 "Российская империя":"assets/russia-avatar.png",
 "Пруссия":"assets/avatar-prussia.png",
 "Королевство Пруссия":"assets/avatar-prussia.png",
 "Прусское Королевство":"assets/avatar-prussia.png",
 "Британская Империя":"assets/1BR.jpg",
 "Британская империя":"assets/1BR.jpg",
 "Рейнский Союз":"assets/Bav.jpg",
 "Рейнский союз":"assets/Bav.jpg"
};

/* Для отсутствующих фотографий используем аватар фракции. */
window.empireUserAvatar=function(name,ownAvatar,faction){
  const avatar=String(ownAvatar||"").trim();
  const file=avatar.split(/[?#]/)[0].split("/").pop().toLowerCase();
  const placeholder=!avatar||!file||file==="default-soldier.jpg"||file==="default-soldier.jpeg"||file==="default-soldier.png";
  if(!placeholder)return avatar;
  const raw=String(faction||window.EMPIRE_USER_FACTIONS[name]||"").trim().toLocaleLowerCase("ru").replace(/\\s+/g," ");
  const aliases={
    "французская империя":"Французская Империя",
    "австрийская империя":"Австрийская Империя",
    "российская империя":"Российская Империя",
    "пруссия":"Пруссия",
    "королевство пруссия":"Пруссия",
    "прусское королевство":"Пруссия",
    "британская империя":"Британская Империя",
    "рейнский союз":"Рейнский Союз"
  };
  const key=aliases[raw];
  return (key&&window.EMPIRE_FACTION_AVATARS[key])||"assets/aea32583-9230-496e-af65-c2e33f73ff79.png";
};
window.empireProfileUrl=function(name){return "profile.html?user="+encodeURIComponent(name||"");};
