(function(){
  const users=[
    ["Kalashnikov","assets/avatar.jpg"],["Ankord","assets/avatar.jpg"],
    ["Veli4estvo","assets/images (4).jpg"],["Mel","assets/images (1).jpg"],
    ["Kazak","assets/images (6).jpg"],["MeGusta","assets/images.jpg"],
    ["Flashkodr","assets/images (2).jpg"],["MrDixon","assets/images (3).jpg"],
    ["Theodor","assets/images (5).jpg"],["Grenadier87","assets/images.jpg"],
    ["Marquis","assets/images (1).jpg"],["Fusilier","assets/images (2).jpg"]
  ];
  const strip=document.getElementById("onlineUsersStrip");
  const count=document.getElementById("onlineUsersCount");
  if(!strip||!count)return;
  const unique=users.filter((u,i,a)=>a.findIndex(x=>x[0]===u[0])===i);
  count.textContent=unique.length;
  strip.innerHTML=unique.map(u=>{
    const name=u[0];
    return '<a class="online-user" href="profile.html?user='+encodeURIComponent(name)+'" title="'+name+'">'+
      '<img class="online-user-avatar" src="'+u[1]+'" alt="'+name+'" loading="lazy" decoding="async">'+
      '<span class="online-user-dot" aria-label="В сети"></span>'+
      '<span class="online-user-name">'+name+'</span></a>';
  }).join("");
})();
