(()=>{"use strict";document.querySelectorAll("[data-ml-click]").forEach(link=>link.addEventListener("click",()=>{try{window.natalAnalytics?.track("marketplace_click",{product_id:"mercadolivre",page:location.pathname})}catch{}}));})();

const salesNotice = document.querySelector('.sales-notice');

if (typeof salesNotice?.showModal === 'function') {
  const noticeKey = 'lareira-feliz-sales-notice-v1';
  let dismissed = false;

  try {
    dismissed = sessionStorage.getItem(noticeKey) === 'dismissed';
  } catch {
    // The notice still works when session storage is unavailable.
  }

  if (!dismissed) {
    salesNotice.addEventListener('close', () => {
      try {
        sessionStorage.setItem(noticeKey, 'dismissed');
      } catch {
        // Closing the notice does not depend on storage.
      }
    }, { once: true });
    salesNotice.showModal();
  }
}
