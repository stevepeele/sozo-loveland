// SOZO Loveland — shared interactions
(function(){
  // Nav scroll state
  var nav = document.getElementById('nav');
  function onScroll(){ if(nav) nav.classList.toggle('scrolled', window.scrollY > 60); }
  window.addEventListener('scroll', onScroll); onScroll();

  // Mobile menu
  var toggle = document.querySelector('.nav-toggle'), menu = document.querySelector('.nav-links');
  if(toggle && menu){
    toggle.addEventListener('click', function(){
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Tabs (values page)
  document.querySelectorAll('.tab').forEach(function(t){
    t.addEventListener('click', function(){
      document.querySelectorAll('.tab').forEach(function(x){ x.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function(x){ x.classList.remove('active'); });
      t.classList.add('active');
      var panel = document.getElementById('tab-' + t.dataset.tab);
      if(panel) panel.classList.add('active');
    });
  });

  // Reveal on scroll
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, {threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  // Contact form (demo)
  var form = document.getElementById('contactForm');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      btn.textContent = 'Message Sent \u2713'; btn.disabled = true;
      btn.style.background = '#2d7d4f';
      setTimeout(function(){
        form.reset(); btn.textContent = 'Send Message';
        btn.disabled = false; btn.style.background = '';
      }, 4000);
    });
  }
})();
