const menuButton=document.querySelector(".menu-button");
const nav=document.querySelector(".main-nav");
menuButton?.addEventListener("click",()=>{const open=menuButton.getAttribute("aria-expanded")==="true";menuButton.setAttribute("aria-expanded",String(!open));nav.classList.toggle("mobile-open",!open);});
document.querySelectorAll(".main-nav a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("mobile-open");menuButton?.setAttribute("aria-expanded","false");}));
const sections=[...document.querySelectorAll("main section[id]")];
const links=[...document.querySelectorAll(".main-nav a")];
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){links.forEach(l=>l.classList.toggle("active",l.getAttribute("href")==="#"+entry.target.id));}}),{rootMargin:"-40% 0px -45% 0px"});
sections.forEach(s=>observer.observe(s));
