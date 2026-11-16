const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const cap = s => { s = String(s ?? ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const es = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'es', { numeric: true });
const leer = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

let recetas = [], selVol = new Set(), selCat = new Set(), selEtq = new Set(), busqueda = '', actual = null, raciones = 0, cocina = false, wake = null;
let orden = leer('orden', 'volumen'), vista = leer('vista', 'rejilla');
if (!['volumen', 'az', 'tiempo', 'nuevas'].includes(orden)) orden = 'az';
if (!['rejilla', 'lista'].includes(vista)) vista = 'rejilla';

/* ---------- Tema ---------- */
function pintarTema() { $('#tema').textContent = document.documentElement.dataset.tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'; }
$('#tema').onclick = () => {
  const t = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  document.documentElement.dataset.tema = t; guardar('tema', t); pintarTema();
};
pintarTema();

/* ---------- Catálogo ---------- */
function foto(r) {
  const ph = `<div class="ph">${esc(r.titulo)}</div>`;
  if (!r.imagen) return ph;
  return `<img class="foto" src="${esc(r.imagen)}" alt="${esc(r.titulo)}" loading="lazy" onerror="this.outerHTML=this.dataset.ph" data-ph="${esc(ph)}">`;
}
const marco = (r, extra = '') => `<div class="marco ${extra}"><div class="in">${foto(r)}</div></div>`;
const minutos = t => {
  if (!t) return Infinity;
  const h = /(\d+)\s*h/.exec(t), m = /(\d+)\s*min/.exec(t), n = /(\d+)/.exec(t);
  return h || m ? (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0) : n ? +n[1] : Infinity;
};
function filtradas() {
  const q = norm(busqueda.trim());
  return recetas.filter(r =>
    (!selVol.size || selVol.has(String(r.volumen))) &&
    (!selCat.size || selCat.has(r.categoria)) &&
    [...selEtq].every(t => (r.etiquetas || []).includes(t)) &&
    (!q || norm(r.titulo).includes(q) || r.ingredientes.some(i => i.nombre && norm(i.nombre).includes(q))));
}
function ordenadas(l) {
  const c = [...l];
  if (orden === 'volumen') c.sort((a, b) => es(a.volumen, b.volumen) || es(a.categoria, b.categoria) || es(a.titulo, b.titulo));
  else if (orden === 'az') c.sort((a, b) => es(a.titulo, b.titulo));
  else if (orden === 'tiempo') c.sort((a, b) => minutos(a.tiempo) - minutos(b.tiempo) || es(a.titulo, b.titulo));
  else c.sort((a, b) => (b.fecha || '9999').localeCompare(a.fecha || '9999') || recetas.indexOf(b) - recetas.indexOf(a));
  return c;
}
const tarjeta = r => {
  const meta = [r.tiempo, r.raciones ? r.raciones + ' raciones' : ''].filter(Boolean).join(' / ');
  return `<a class="tarjeta" href="#${esc(r.id)}">${marco(r)}
    <span class="sello">— ${esc(r.categoria)} —</span>
    <h2>${esc(r.titulo)}</h2>${meta ? `<p class="meta">${esc(meta)}</p>` : ''}</a>`;
};
const fila = r => {
  const sub = [r.categoria, ...(r.etiquetas || []).map(cap)].join(' / ');
  return `<a class="fila" href="#${esc(r.id)}"><span class="thumb">${r.imagen ? `<img src="${esc(r.imagen)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>
    <span class="txt"><span class="l1"><b>${esc(r.titulo)}</b>${r.tiempo ? `<i></i><em>${esc(r.tiempo)}</em>` : ''}</span><span class="l2">${esc(sub)}</span></span></a>`;
};
function pintarRejilla() {
  const lista = ordenadas(filtradas());
  $('#vacio').hidden = lista.length > 0;
  $('#cuenta').textContent = `${lista.length} ${lista.length === 1 ? 'receta' : 'recetas'}`;
  const g = $('#rejilla'); g.className = vista === 'lista' ? 'lista' : 'rejilla';
  g.innerHTML = lista.map(vista === 'lista' ? fila : tarjeta).join('');
}
const chip = (k, v) => `<button data-k="${k}" data-v="${esc(v)}" aria-label="Quitar filtro ${esc(v)}">${esc(k === 'v' ? v.replace(/^\d+\.\s*/, '') : cap(v))}</button>`;
function pintarFiltros() {
  const n = selVol.size + selCat.size + selEtq.size;
  $('#abrir-filtros').textContent = 'Filtrar' + (n ? ` (${n})` : '');
  $('#chips').innerHTML = [...[...selVol].map(v => chip('v', v)), ...[...selCat].map(c => chip('c', c)), ...[...selEtq].map(t => chip('e', t))].join('');
}
$('#buscar').oninput = e => { busqueda = e.target.value; pintarRejilla(); };
$('#chips').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  (b.dataset.k === 'v' ? selVol : b.dataset.k === 'c' ? selCat : selEtq).delete(b.dataset.v); pintarFiltros(); pintarRejilla();
};
$('#orden').value = orden;
$('#orden').onchange = e => { orden = e.target.value; guardar('orden', orden); pintarRejilla(); };
function pintarVista() {
  $('#v-rejilla').setAttribute('aria-pressed', vista === 'rejilla');
  $('#v-lista').setAttribute('aria-pressed', vista === 'lista');
}
[['#v-rejilla', 'rejilla'], ['#v-lista', 'lista']].forEach(([s, v]) => $(s).onclick = () => { vista = v; guardar('vista', v); pintarVista(); pintarRejilla(); });
pintarVista();

/* ---------- Panel de filtros ---------- */
function pintarPanel() {
  const enVol = r => selVol.has(String(r.volumen));
  const cats = selVol.size ? [...new Set(recetas.filter(enVol).map(r => r.categoria))].sort(es) : [];
  $('#bloque-cat').hidden = !selVol.size;
  const etqs = [...new Set(recetas.flatMap(r => r.etiquetas || []))].sort(es);
  const vols = [...new Set(recetas.map(r => String(r.volumen)))].sort(es);
  $('#lista-vol').innerHTML = vols.map(v =>
    `<li><button aria-pressed="${selVol.has(v)}" data-v="${esc(v)}"><span class="p"></span><span>${esc(v)}</span><i></i><span class="c">${recetas.filter(r => String(r.volumen) === v).length}</span></button></li>`).join('');
  const buscar = $('#buscar-cat'); buscar.hidden = cats.length <= 10;
  const q = norm(buscar.value);
  $('#lista-cats').innerHTML = cats.filter(c => norm(c).includes(q)).map(c =>
    `<li><button aria-pressed="${selCat.has(c)}" data-v="${esc(c)}"><span class="p"></span><span>${esc(c)}</span><i></i><span class="c">${recetas.filter(r => r.categoria === c && enVol(r)).length}</span></button></li>`).join('');
  $('#bloque-etq').hidden = !etqs.length;
  $('#lista-etq').innerHTML = etqs.map(t => `<button aria-pressed="${selEtq.has(t)}" data-v="${esc(t)}">${esc(cap(t))}</button>`).join('');
  const n = filtradas().length;
  $('#aplicar').textContent = `Ver ${n} ${n === 1 ? 'receta' : 'recetas'}`;
}
const refrescar = () => { pintarPanel(); pintarFiltros(); pintarRejilla(); };
function abrirPanel() { $('#buscar-cat').value = ''; pintarPanel(); $('#panel').hidden = false; document.body.classList.add('bloqueado'); }
function cerrarPanel() { $('#panel').hidden = true; document.body.classList.remove('bloqueado'); }
$('#abrir-filtros').onclick = abrirPanel;
$('#velo').onclick = $('#aplicar').onclick = cerrarPanel;
$('#buscar-cat').oninput = pintarPanel;
$('#borrar').onclick = () => { selVol.clear(); selCat.clear(); selEtq.clear(); refrescar(); };
const alternar = (set, e) => { const b = e.target.closest('button'); if (!b) return; const v = b.dataset.v; set.has(v) ? set.delete(v) : set.add(v); refrescar(); };
$('#lista-vol').onclick = e => { alternar(selVol, e); [...selCat].forEach(c => { if (!recetas.some(r => r.categoria === c && selVol.has(String(r.volumen)))) selCat.delete(c); }); refrescar(); };
$('#lista-cats').onclick = e => alternar(selCat, e);
$('#lista-etq').onclick = e => alternar(selEtq, e);

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
    const q = i.cantidad == null ? (i.texto || (i.pendiente ? 'por confirmar' : 'al gusto')) : fmt(i.cantidad * k) + (i.unidad ? ' ' + i.unidad : '');
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
      <p class="datos">${esc(r.volumen.replace(/^\d+\.\s*/, 'Volumen ' + r.volumen.slice(0, 2) + ': '))}${r.origen ? ' / ' + esc(r.origen) : ''}</p>
      ${r.tiempo ? `<p class="datos">Tiempo <b>${esc(r.tiempo)}</b></p>` : ''}
      ${r.etiquetas && r.etiquetas.length ? `<p class="datos">${esc(r.etiquetas.map(cap).join(' / '))}</p>` : ''}
      ${marco(r, 'grande')}
      ${r.ingredientes.length ? sec('Ingredientes') : ''}
      ${r.raciones ? `<div class="escalador">${r.racionesEstimadas ? 'Raciones aprox.' : 'Raciones'} <button id="menos" aria-label="Menos raciones">−</button><b id="n"></b><button id="mas" aria-label="Más raciones">+</button></div>` : ''}
      <ul class="ingredientes" id="ings"></ul>
      ${sec('Elaboración')}
      <ol class="pasos">${r.pasos.map(p => p.grupo ? `<li class="sub">${esc(p.grupo)}</li>` : `<li>${esc(p)}</li>`).join('')}</ol>
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
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#panel').hidden) cerrarPanel(); else if (!$('#detalle').hidden) location.hash = '';
});

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
Promise.all([
  fetch('recipes.json').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status + ' en recipes.json'); return r.json(); }),
  fetch('volumes.json').then(r => r.ok ? r.json() : []).catch(() => [])
]).then(([data, vols]) => {
  const nombres = {}; vols.forEach(v => { nombres[v.n] = v.nombre; });
  data.forEach(r => {
    if (typeof r.volumen === 'number') r.volumen = String(r.volumen).padStart(2, '0') + (nombres[r.volumen] ? '. ' + nombres[r.volumen] : '');
  });
  recetas = data; pintarFiltros(); pintarRejilla(); ruta();
}).catch(e => { $('#vacio').hidden = false; $('#vacio').textContent = 'No se pudieron mostrar las recetas (' + e.message + '). Si abres index.html directamente desde el ordenador, usa un servidor local o súbelo a GitHub Pages.'; });
