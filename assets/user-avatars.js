/* Shared user avatars and faction fallbacks for EMPIRE */
window.EMPIRE_USER_AVATARS={
 "Kalashnikov":"assets/avatar.jpg","Ankord":"assets/avatar.jpg",
 "Veli4estvo":"assets/images (4).jpg","Mel":"assets/images (1).jpg",
 "Kazak":"assets/images (6).jpg","MeGusta":"assets/images.jpg",
 "Flashkodr":"assets/images (2).jpg","MrDixon":"assets/images (3).jpg",
 "Theodor":"assets/images (5).jpg","Grenadier87":"assets/images.jpg",
 "Marquis":"assets/images (1).jpg","Fusilier":"assets/images (2).jpg"
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
 "Британская Империя":"assets/avatar-britain.png",
 "Британская империя":"assets/avatar-britain.png",
 "Рейнский Союз":"assets/avatar-bavaria.png",
 "Рейнский союз":"assets/avatar-bavaria.png"
};

/* Приоритет: фракционный аватар для тестовых профилей без личной фотографии. */
window.empireUserAvatar=function(name,ownAvatar,faction){
  const resolvedFaction=faction||window.EMPIRE_USER_FACTIONS[name];
  if(resolvedFaction&&window.EMPIRE_FACTION_AVATARS[resolvedFaction])return window.EMPIRE_FACTION_AVATARS[resolvedFaction];
  if(ownAvatar)return ownAvatar;
  const personal=window.EMPIRE_USER_AVATARS[name];
  return personal||"assets/default-soldier.jpg";
};
window.empireProfileUrl=function(name){return "profile.html?user="+encodeURIComponent(name||"");};
