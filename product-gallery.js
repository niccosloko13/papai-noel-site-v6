(()=>{
"use strict";
const gallery=document.getElementById("lareiraProductGallery");
const tablist=document.getElementById("lareiraGalleryThumbs");
if(!gallery||!tablist)return;
const slides=Array.from(gallery.querySelectorAll(".gallery-slide"));
const thumbs=Array.from(tablist.querySelectorAll("[data-gallery-index]"));
const counter=gallery.querySelector(".gallery-counter");
const previous=gallery.querySelector(".gallery-arrow-prev");
const next=gallery.querySelector(".gallery-arrow-next");
if(slides.length!==5||thumbs.length!==slides.length||!previous||!next)return;
const reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let current=0,timer=0,hovered=false,focused=false,visible=true,touchX=null;
function schedule(){
  window.clearTimeout(timer);
  if(reduced||hovered||focused||!visible||document.hidden)return;
  const isVideo=!!slides[current].querySelector("video");
  timer=window.setTimeout(()=>show(current+1),isVideo?11500:4700);
}
function show(index){
  current=(index+slides.length)%slides.length;
  slides.forEach((slide,i)=>{
    const active=i===current;
    slide.classList.toggle("is-current",active);
    slide.setAttribute("aria-hidden",String(!active));
    const video=slide.querySelector("video");
    if(video){
      video.muted=true;
      video.volume=0;
      if(active){
        video.currentTime=0;
        const playback=video.play();
        if(playback&&playback.catch)playback.catch(()=>{});
      }else{video.pause()}
    }
  });
  thumbs.forEach((thumb,i)=>{
    const active=i===current;
    thumb.classList.toggle("is-current",active);
    thumb.setAttribute("aria-selected",String(active));
    thumb.tabIndex=active?0:-1;
  });
  if(counter)counter.textContent=(current+1)+" / "+slides.length;
  schedule();
}
previous.addEventListener("click",()=>show(current-1));
next.addEventListener("click",()=>show(current+1));
thumbs.forEach((thumb,i)=>thumb.addEventListener("click",()=>show(i)));
gallery.addEventListener("touchstart",event=>{
  touchX=event.touches&&event.touches.length===1?event.touches[0].clientX:null;
},{passive:true});
gallery.addEventListener("touchend",event=>{
  if(touchX===null||!event.changedTouches?.length)return;
  const distance=event.changedTouches[0].clientX-touchX;
  touchX=null;
  if(Math.abs(distance)>=42)show(current+(distance<0?1:-1));
},{passive:true});
gallery.addEventListener("mouseenter",()=>{hovered=true;window.clearTimeout(timer)});
gallery.addEventListener("mouseleave",()=>{hovered=false;schedule()});
const panel=gallery.closest(".hero-product");
panel?.addEventListener("focusin",()=>{focused=true;window.clearTimeout(timer)});
panel?.addEventListener("focusout",()=>{focused=panel.contains(document.activeElement);schedule()});
tablist.addEventListener("keydown",event=>{
  if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
  event.preventDefault();
  const target=event.key==="Home"?0:event.key==="End"?slides.length-1:current+(event.key==="ArrowRight"?1:-1);
  show(target);
  thumbs[current].focus();
});
document.addEventListener("visibilitychange",()=>{
  const video=slides[current].querySelector("video");
  if(document.hidden){window.clearTimeout(timer);video?.pause()}
  else {if(video){const p=video.play();if(p&&p.catch)p.catch(()=>{})}schedule()}
});
if("IntersectionObserver" in window){
  const observer=new IntersectionObserver(entries=>{
    visible=!!entries[0]?.isIntersecting;
    if(!visible){window.clearTimeout(timer);slides[current].querySelector("video")?.pause()}
    else{
      const video=slides[current].querySelector("video");
      if(video){const p=video.play();if(p&&p.catch)p.catch(()=>{})}
      schedule();
    }
  },{threshold:0.1});
  observer.observe(gallery);
}
show(0);
})();
