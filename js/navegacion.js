// Navegación ligera: un botón en cada sección que lleva a la siguiente (para no depender de un scroll largo)
// y el botón fijo de agendar, que se esconde cuando la agenda ya está en pantalla.
const secciones = [...document.querySelectorAll('main > section[data-corto]')];

secciones.forEach((sec, i) => {
  const sig = secciones[i + 1];
  if (!sig) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'siguiente';
  b.innerHTML = `<span class="siguiente__flecha" aria-hidden="true">↓</span><span><small>Siguiente · </small>${sig.dataset.corto}</span>`;
  b.setAttribute('aria-label', `Ir a ${sig.dataset.corto}`);
  b.addEventListener('click', () => {
    const y = sig.getBoundingClientRect().top + scrollY;
    scrollTo({ top: Math.max(0, y), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  // en la sección fija, el botón va dentro de lo que se queda pegado en pantalla
  (sec.querySelector('.despiece__fijo') || sec).appendChild(b);
});

// botón fijo de agendar: fuera de vista mientras se ve la agenda o la portada ya trae el suyo
const cta = document.getElementById('cta-fija');
const agenda = document.getElementById('agenda');
const portadaBoton = document.querySelector('.portada .boton--grande');
const visibles = new Set();
const io = new IntersectionObserver(entradas => {
  for (const e of entradas) e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target);
  cta.classList.toggle('oculta', visibles.size > 0);
}, { threshold: 0.15 });
io.observe(agenda);
if (portadaBoton) io.observe(portadaBoton);
