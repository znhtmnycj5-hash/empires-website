/* Shared user avatars and profile links for comments */
window.EMPIRE_USER_AVATARS={
 "Kalashnikov":"assets/avatar.jpg","Ankord":"assets/avatar.jpg",
 "Veli4estvo":"assets/images (4).jpg","Mel":"assets/images (1).jpg",
 "Kazak":"assets/images (6).jpg","MeGusta":"assets/images.jpg",
 "Flashkodr":"assets/images (2).jpg","MrDixon":"assets/images (3).jpg",
 "Theodor":"assets/images (5).jpg","Grenadier87":"assets/images.jpg",
 "Marquis":"assets/images (1).jpg","Fusilier":"assets/images (2).jpg"
};
window.empireUserAvatar=function(name){return window.EMPIRE_USER_AVATARS[name]||"assets/default-soldier.jpg";};
window.empireProfileUrl=function(name){return "profile.html?user="+encodeURIComponent(name||"");};
