/* Ajustes visuales para portada y Saldos. No modifica datos. */
(()=>{'use strict';
const style=document.createElement('style');
style.textContent=`
.dv-home .dv-menu #dv-reminders-open{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:12px;width:100%;min-height:72px;margin:0!important;padding:16px!important;border:2px solid #087d40!important;border-radius:22px!important;background:linear-gradient(115deg,#0ba95d,#067944)!important;color:#fff!important;font-size:clamp(16px,3.6vw,23px)!important;font-weight:800!important;box-shadow:0 5px 14px #06794435!important;text-shadow:0 1px 1px #07522e!important}
.dv-home .dv-menu #dv-reminders-open::before{content:'✉';font-size:28px;line-height:1}
body:has(header) header{background:linear-gradient(115deg,#004b9b,#087fca);border-radius:0 0 20px 20px;padding:18px 16px;box-shadow:0 4px 12px #004b9b24}
body:has(header) header strong{font-size:clamp(16px,4vw,23px);line-height:1.2}
body:has(header) main{max-width:1000px;padding:16px}
body:has(header) main .card{border:2px solid #c9e8f6;border-radius:22px;padding:clamp(15px,3vw,25px);box-shadow:0 5px 16px #0076b012}
body:has(header) main h2{color:#073b85;font-size:clamp(22px,5vw,30px)}
body:has(header) main .btn{background:linear-gradient(125deg,#0784ce,#0059a8);color:#fff;border-radius:13px;padding:11px 16px;font-weight:700}
body:has(header) main .btn.secondary{background:#e6f5ff;color:#06518e}
body:has(header) main .item{padding:17px 0;line-height:1.5}
body:has(header) main .tabs .btn{border-radius:14px}
body:has(header) header #dv-reminders-open{background:linear-gradient(115deg,#0ca65a,#087843)!important;color:#fff!important;border:0!important;border-radius:14px!important;padding:12px!important;font-weight:800!important;box-shadow:0 3px 9px #044d292b}
@media(max-width:520px){body:has(header) header{flex-wrap:wrap;gap:10px}body:has(header) header #dv-reminders-open{width:100%;margin:0!important}body:has(header) main .item .btn{margin-top:6px}}
`;
document.head.appendChild(style);
const place=()=>{
 const homeMenu=document.querySelector('.dv-home .dv-menu');
 const button=document.getElementById('dv-reminders-open');
 if(homeMenu&&button&&!homeMenu.contains(button))homeMenu.appendChild(button);
};
new MutationObserver(place).observe(document.getElementById('app')||document.body,{subtree:true,childList:true});
place();
})();
