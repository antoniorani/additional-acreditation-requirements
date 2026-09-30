const deck=document.querySelector('.deck');
const slides=[...document.querySelectorAll('.slide')];
const progress=document.querySelector('.progress span');
const counter=document.querySelector('.counter');
const presenter=document.querySelector('.presenter');
const presenterTitle=document.querySelector('.presenter h2');
const presenterText=document.querySelector('.presenter div');
const presenterClose=document.querySelector('.presenter-close');
const state={index:getInitialSlideIndex(),isAnimating:false,presenterOpen:new URLSearchParams(location.search).get('presenter')==='1'};
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function getInitialSlideIndex(){const raw=location.hash.replace('#/','').replace('#','');const parsed=Number.parseInt(raw,10);return Number.isFinite(parsed)?clamp(parsed-1,0,slides.length-1):0}
function hasGsap(){return typeof window.gsap!=='undefined'}
function animateContent(slide){const items=[...slide.querySelectorAll('.reveal')];items.forEach(el=>{el.style.opacity=0;el.style.transform='translateY(14px)'});if(hasGsap()){window.gsap.to(items,{opacity:1,y:0,duration:.58,stagger:.055,ease:'power3.out',clearProps:'transform'});const rule=slide.querySelector('.rule');if(rule){window.gsap.fromTo(rule,{scaleX:0},{scaleX:1,duration:.65,ease:'power3.out',transformOrigin:'left'})}return}items.forEach((el,i)=>{el.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:580,delay:i*55,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'})})}
function out(slide,dir=1){if(hasGsap()){return new Promise(resolve=>window.gsap.to(slide,{opacity:0,x:dir*-18,duration:.22,ease:'power2.in',onComplete:resolve}))}return slide.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:`translateX(${dir*-18}px)`}],{duration:220,easing:'ease-in',fill:'forwards'}).finished}
async function goTo(i,dir=1){const next=clamp(i,0,slides.length-1);if(state.isAnimating||next===state.index)return;state.isAnimating=true;const current=slides[state.index];await out(current,dir);current.classList.remove('active');current.style.opacity='';current.style.transform='';state.index=next;activate(dir);state.isAnimating=false}
function activate(dir=1){const slide=slides[state.index];slides.forEach(s=>s.classList.toggle('active',s===slide));if(hasGsap()){window.gsap.set(slide,{opacity:1,x:dir*18});window.gsap.to(slide,{opacity:1,x:0,duration:.32,ease:'power3.out'})}animateContent(slide);updateHud();updateHash();updatePresenter()}
function next(){goTo(state.index+1,1)}function previous(){goTo(state.index-1,-1)}
function updateHud(){progress.style.width=`${((state.index+1)/slides.length)*100}%`;counter.textContent=`${state.index+1} / ${slides.length}`}
function updateHash(){const h=`#/${state.index+1}`;if(location.hash!==h)history.replaceState(null,'',h)}
function updatePresenter(){const slide=slides[state.index];presenter.classList.toggle('open',state.presenterOpen);presenter.setAttribute('aria-hidden',String(!state.presenterOpen));presenterTitle.textContent=slide.dataset.title||`Slide ${state.index+1}`;presenterText.textContent=slide.dataset.notes||''}
function togglePresenter(force){state.presenterOpen=typeof force==='boolean'?force:!state.presenterOpen;updatePresenter()}
function toggleFullscreen(){!document.fullscreenElement?document.documentElement.requestFullscreen?.():document.exitFullscreen?.()}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowright',' ','pagedown'].includes(k)){e.preventDefault();next()}if(['arrowleft','pageup'].includes(k)){e.preventDefault();previous()}if(k==='home')goTo(0,-1);if(k==='end')goTo(slides.length-1,1);if(k==='f')toggleFullscreen();if(k==='p')togglePresenter();if(k==='escape')togglePresenter(false)});
let pointerStart=null;deck.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY}});deck.addEventListener('pointerup',e=>{if(!pointerStart)return;const dx=e.clientX-pointerStart.x;const dy=e.clientY-pointerStart.y;pointerStart=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)){dx<0?next():previous();return}next()});presenterClose.addEventListener('click',e=>{e.stopPropagation();togglePresenter(false)});window.addEventListener('load',()=>activate(1));