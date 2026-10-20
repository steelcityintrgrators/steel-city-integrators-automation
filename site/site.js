(() => {
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
  if (!('IntersectionObserver' in window)) { reveal.forEach((el) => el.classList.add('visible')); return; }
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .08 });
  reveal.forEach((el) => observer.observe(el));
})();
