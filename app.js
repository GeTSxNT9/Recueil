const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

let recetas = [], categoria = 'Todas', busqueda = '', actual = null, raciones = 0, cocina = false, wake = null;

/* ---------- Tema ---------- */
function pintarTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  $('#tema').textContent = oscuro ? '☀' : '☾';
}
$('#tema').onclick = () => {
  const t = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  document.documentElement.dataset.tema = t;
  try { localStorage.setItem('tema', t); } catch (e) {}
  pintarTema();
};
pintarTema();

/* ---------- Catálogo ---------- */
function foto(r) {
  const ph = `<div class="ph">${esc(r.titulo)}</div>`;
  if (!r.imagen) return ph;
  return `<img class="foto" src="${esc(r.imagen)}" alt="${esc(r.titulo)}" loading="lazy" onerror="this.outerHTML=this.dataset.ph" data-ph="${esc(ph)}">`;
}
function pintarCategorias() {
  const cats = ['Todas', ...new Set(recetas.map(r => r.categoria))];
  $('#cats').innerHTML = cats.map(c => `<button aria-pressed="${c === categoria}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
}
function pintarRejilla() {
  const q = norm(busqueda.trim());
  const lista = recetas.filter(r =>
    (categoria === 'Todas' || r.categoria === categoria) &&
    (!q || norm(r.titulo).includes(q) || r.ingredientes.some(i => norm(i.nombre).includes(q))));
  $('#vacio').hidden = lista.length > 0;
  $('#rejilla').innerHTML = lista.map(r => `
    <a class="tarjeta" href="#${esc(r.id)}">
      ${foto(r)}
      <div class="cuerpo">
        <span class="cat">${esc(r.categoria)}</span>
        <h2>${esc(r.titulo)}</h2>
        <p class="meta">${esc(r.tiempo)}, ${r.raciones} raciones</p>
      </div>
    </a>`).join('');
}
$('#buscar').oninput = e => { busqueda = e.target.value; pintarRejilla(); };
$('#cats').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  categoria = b.dataset.c; pintarCategorias(); pintarRejilla();
};

/* ---------- Cantidades ---------- */
function fmt(n) {
  if (n >= 10) return String(Math.round(n));
  const q = Math.round(n * 4) / 4, ent = Math.floor(q), fr = q - ent;
  const f = { 0: '', .25: '¼', .5: '½', .75: '¾' }[fr];
  return (ent || !f ? ent : '') + f || '0';
}
function pintarIngredientes() {
  const k = raciones / actual.raciones;
  $('#ings').innerHTML = actual.ingredientes.map(i => {
    const cant = i.cantidad == null ? '' : fmt(i.cantidad * k) + (i.unidad ? ' ' + i.unidad : '') + ' ';
    return `<li><label><input type="checkbox"><span>${cant}${esc(i.nombre)}</span></label></li>`;
  }).join('');
  $('#n').textContent = raciones;
}

/* ---------- Detalle ---------- */
function abrir(r) {
  actual = r; raciones = r.raciones;
  const d = $('#detalle');
  d.innerHTML = `
    <div class="barra">
      <button id="cerrar">Volver</button>
      <button id="cocina" aria-pressed="false">Modo cocina</button>
    </div>
    <div class="hoja">
      ${foto(r)}
      <span class="cat">${esc(r.categoria)}</span>
      <h2>${esc(r.titulo)}</h2>
      <div class="datos">
        <span>${esc(r.tiempo)}</span>
        <span class="escalador">
          <button id="menos" aria-label="Menos raciones">−</button>
          <b id="n"></b> raciones
          <button id="mas" aria-label="Más raciones">+</button>
        </span>
      </div>
      <h3>Ingredientes</h3>
      <ul class="ingredientes" id="ings"></ul>
      <h3>Elaboración</h3>
      <ol class="pasos">${r.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
    </div>`;
  d.hidden = false; d.scrollTop = 0;
  document.body.classList.add('bloqueado');
  pintarIngredientes();
  $('#menos').onclick = () => { if (raciones > 1) { raciones--; pintarIngredientes(); } };
  $('#mas').onclick = () => { if (raciones < 40) { raciones++; pintarIngredientes(); } };
  $('#cerrar').onclick = () => { location.hash = ''; };
  $('#cocina').onclick = alternarCocina;
  d.querySelector('.pasos').onclick = e => { const li = e.target.closest('li'); if (li) li.classList.toggle('hecho'); };
}
function cerrar() {
  $('#detalle').hidden = true;
  document.body.classList.remove('bloqueado');
  if (cocina) alternarCocina();
}
function ruta() {
  const r = recetas.find(x => x.id === decodeURIComponent(location.hash.slice(1)));
  r ? abrir(r) : cerrar();
}
addEventListener('hashchange', ruta);
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#detalle').hidden) location.hash = ''; });

/* ---------- Modo cocina ---------- */
async function pedirWake() {
  try { if ('wakeLock' in navigator) wake = await navigator.wakeLock.request('screen'); } catch (e) {}
}
async function alternarCocina() {
  cocina = !cocina;
  document.documentElement.style.setProperty('--base', cocina ? '1.25rem' : '');
  const b = $('#cocina'); if (b) b.setAttribute('aria-pressed', cocina);
  if (cocina) await pedirWake();
  else if (wake) { try { await wake.release(); } catch (e) {} wake = null; }
}
document.addEventListener('visibilitychange', () => {
  if (cocina && document.visibilityState === 'visible') pedirWake();
});

/* ---------- Inicio ---------- */
fetch('recipes.json')
  .then(r => r.json())
  .then(data => { recetas = data; pintarCategorias(); pintarRejilla(); ruta(); })
  .catch(() => { $('#vacio').hidden = false; $('#vacio').textContent = 'No se pudo cargar recipes.json. Si abres index.html directamente desde el ordenador, usa un servidor local o súbelo a GitHub Pages.'; });
