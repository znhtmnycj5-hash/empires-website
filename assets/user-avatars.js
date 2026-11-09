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

/* Личные фотографии сохраняем. Заглушку считаем отсутствием аватара и заменяем аватаром фракции полка. */
window.empireUserAvatar=function(name,ownAvatar,faction){
  const isPlaceholder=!ownAvatar||/default-soldier\\.(jpg|jpeg|png)$/i.test(String(ownAvatar));
  if(!isPlaceholder)return ownAvatar;
  const rawFaction=faction||window.EMPIRE_USER_FACTIONS[name]||"";
  const normalized=String(rawFaction).trim().toLocaleLowerCase("ru");
  const factionAliases={
    "французская империя":"Французская Империя",
    "австрийская империя":"Австрийская Империя",
    "российская империя":"Российская Империя",
    "пруссия":"Пруссия",
    "королевство пруссия":"Пруссия",
    "прусское королевство":"Пруссия",
    "британская империя":"Британская Империя",
    "рейнский союз":"Рейнский Союз"
  };
  const key=factionAliases[normalized]||rawFaction;
  return window.EMPIRE_FACTION_AVATARS[key]||ownAvatar||"assets/default-soldier.jpg";
};
window.empireProfileUrl=function(name){return "profile.html?user="+encodeURIComponent(name||"");};
