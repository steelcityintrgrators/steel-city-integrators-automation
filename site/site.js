(() => {
  const APP_URL = 'https://script.google.com/macros/s/AKfycbxY9w1aN8opIaV-u_uxu1V_FDXoUg3vFPjC6AdTTGHBkQGEodIFf5LA5EVQFUCVqpQO/exec';
  document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = new Date().getFullYear(); });

  const button = document.querySelector('.menu-button');
  const menu = document.querySelector('.site-menu');
  if (button && menu) {
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('open', !open);
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      button.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
    }));
  }

  const reveal = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) reveal.forEach((el) => el.classList.add('visible'));
  else {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    reveal.forEach((el) => observer.observe(el));
  }

  const attributionKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  let attribution = {};
  try {
    attribution = JSON.parse(sessionStorage.getItem('sci_attribution') || '{}');
    const incoming = new URLSearchParams(window.location.search);
    attributionKeys.forEach((key) => { if (incoming.get(key)) attribution[key] = incoming.get(key); });
    sessionStorage.setItem('sci_attribution', JSON.stringify(attribution));
  } catch (_) { attribution = {}; }
  document.querySelectorAll('.js-project-request').forEach((link) => {
    try {
      const url = new URL(link.href);
      attributionKeys.forEach((key) => { if (attribution[key] && !url.searchParams.has(key)) url.searchParams.set(key, attribution[key]); });
      link.href = url.toString();
    } catch (_) {}
  });

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('.checkout-form');
    if (!form || document.body.dataset.checkoutEnabled === 'true') return;
    event.preventDefault();
    const fallback = form.dataset.fallbackUrl || (APP_URL + '?action=service&campaign=support-fallback');
    window.location.assign(fallback);
  });

  if (document.body.dataset.paymentAuto === 'true') {
    window.SCI_PAYMENT_STATUS = (status) => {
      if (status && status.configured === true && status.provider && status.provider !== 'disabled') {
        document.body.dataset.checkoutEnabled = 'true';
      }
    };
    const statusScript = document.createElement('script');
    statusScript.async = true;
    statusScript.src = APP_URL + '?action=payment_status';
    document.head.appendChild(statusScript);
  }
})();

