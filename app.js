const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

let recetas = [], categoria = 'Todas', busqueda = '', actual = null, raciones = 0, cocina = false, wake = null;

/* ---------- Tema ---------- */
function pintarTema() { $('#tema').textContent = document.documentElement.dataset.tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'; }
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
const marco = (r, extra = '') => `<div class="marco ${extra}"><div class="in">${foto(r)}</div></div>`;
function pintarCategorias() {
  const cats = ['Todas', ...new Set(recetas.map(r => r.categoria))];
  $('#cats').innerHTML = cats.map(c => `<button aria-pressed="${c === categoria}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
}
function pintarRejilla() {
  const q = norm(busqueda.trim());
  const lista = recetas.filter(r =>
    (categoria === 'Todas' || r.categoria === categoria) &&
    (!q || norm(r.titulo).includes(q) || r.ingredientes.some(i => i.nombre && norm(i.nombre).includes(q))));
  $('#vacio').hidden = lista.length > 0;
  $('#cuenta').textContent = `— ${lista.length} ${lista.length === 1 ? 'receta' : 'recetas'} —`;
  $('#rejilla').innerHTML = lista.map(r => {
    const meta = [r.tiempo, r.raciones ? r.raciones + ' raciones' : ''].filter(Boolean).join(' / ');
    return `<a class="tarjeta" href="#${esc(r.id)}">${marco(r)}
      <span class="sello">— ${esc(r.categoria)} —</span>
      <h2>${esc(r.titulo)}</h2>${meta ? `<p class="meta">${esc(meta)}</p>` : ''}</a>`;
  }).join('');
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
  return String(ent || !f ? ent : '') + f;
}
function pintarIngredientes() {
  const k = actual.raciones ? raciones / actual.raciones : 1;
  $('#ings').innerHTML = actual.ingredientes.map(i => {
    if (i.grupo) return `<li class="grupo">${esc(i.grupo)}</li>`;
    const q = i.cantidad == null ? 'al gusto' : fmt(i.cantidad * k) + (i.unidad ? ' ' + i.unidad : '');
    return `<li><label><input type="checkbox"><span class="n">${esc(cap(i.nombre))}</span><i class="l"></i><b>${esc(q)}</b></label></li>`;
  }).join('');
  const n = $('#n'); if (n) n.textContent = raciones;
}
const sec = t => `<div class="sec"><i></i><h3>${t}</h3><i></i></div>`;

/* ---------- Detalle ---------- */
function abrir(r) {
  actual = r; raciones = r.raciones || 0;
  const d = $('#detalle');
  d.innerHTML = `
    <div class="barra">
      <button id="cerrar" class="texto">← Volver</button>
      <button id="cocina" class="texto" aria-pressed="false">Modo cocina</button>
    </div>
    <div class="ficha">
      <span class="sello">— ${esc(r.categoria)} —</span>
      <h2>${esc(r.titulo)}</h2>
      ${r.tiempo ? `<p class="datos">Tiempo <b>${esc(r.tiempo)}</b></p>` : ''}
      ${marco(r, 'grande')}
      ${sec('Ingredientes')}
      ${r.raciones ? `<div class="escalador">Raciones <button id="menos" aria-label="Menos raciones">−</button><b id="n"></b><button id="mas" aria-label="Más raciones">+</button></div>` : ''}
      <ul class="ingredientes" id="ings"></ul>
      ${sec('Elaboración')}
      <ol class="pasos">${r.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
      ${r.notas ? sec('Notas') + `<div class="notas"><p>${esc(r.notas)}</p></div>` : ''}
    </div>`;
  d.hidden = false; d.scrollTop = 0;
  document.body.classList.add('bloqueado');
  pintarIngredientes();
  const menos = $('#menos'), mas = $('#mas');
  if (menos) {
    menos.onclick = () => { if (raciones > 1) { raciones--; pintarIngredientes(); } };
    mas.onclick = () => { if (raciones < 40) { raciones++; pintarIngredientes(); } };
  }
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
  document.documentElement.style.setProperty('--base', cocina ? '1.3rem' : '');
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
