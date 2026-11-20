const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const cap = s => { s = String(s ?? ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const es = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'es', { numeric: true });
const leer = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

let recetas = [], selVol = new Set(), selCat = new Set(), selEtq = new Set(), busqueda = '', actual = null, raciones = 0, cocina = false, wake = null;
let orden = leer('orden', 'volumen'), vista = leer('vista', 'rejilla');
if (!['volumen', 'az', 'nuevas'].includes(orden)) orden = 'az';
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
  else c.sort((a, b) => (b.fecha || '9999').localeCompare(a.fecha || '9999') || recetas.indexOf(b) - recetas.indexOf(a));
  return c;
}
const tarjeta = r => {
  const meta = r.raciones ? r.raciones + ' raciones' : '';
  return `<a class="tarjeta" href="#${esc(r.id)}">${marco(r)}
    <span class="sello">— ${esc(r.categoria)} —</span>
    <h2>${esc(r.titulo)}</h2>${meta ? `<p class="meta">${esc(meta)}</p>` : ''}</a>`;
};
const fila = r => {
  const sub = [r.categoria, ...(r.etiquetas || []).map(cap)].join(' / ');
  return `<a class="fila" href="#${esc(r.id)}"><span class="thumb">${r.imagen ? `<img src="${esc(r.imagen)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>
    <span class="txt"><span class="l1"><b>${esc(r.titulo)}</b></span><span class="l2">${esc(sub)}</span></span></a>`;
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
  const etqs = [...new Set(recetas.flatMap(r => r.etiquetas || []))].sort(es);
  const vols = [...new Set(recetas.map(r => String(r.volumen)))].sort(es);
  $('#lista-vol').innerHTML = vols.map(v => {
    const sel = selVol.has(v);
    const cats = sel ? [...new Set(recetas.filter(r => String(r.volumen) === v).map(r => r.categoria))].sort(es) : [];
    const sub = sel ? `<ul class="subcats">${cats.map(c => `<li><button class="sub" aria-pressed="${selCat.has(c)}" data-c="${esc(c)}"><span class="p"></span><span>${esc(c)}</span><i></i><span class="c">${recetas.filter(r => r.categoria === c && String(r.volumen) === v).length}</span></button></li>`).join('')}</ul>` : '';
    return `<li><button aria-pressed="${sel}" data-v="${esc(v)}"><span class="p"></span><span>${esc(v)}</span><i></i><span class="c">${recetas.filter(r => String(r.volumen) === v).length}</span></button>${sub}</li>`;
  }).join('');
  $('#bloque-etq').hidden = !etqs.length;
  $('#lista-etq').innerHTML = etqs.map(t => `<button aria-pressed="${selEtq.has(t)}" data-v="${esc(t)}">${esc(cap(t))}</button>`).join('');
  const n = filtradas().length;
  $('#aplicar').textContent = `Ver ${n} ${n === 1 ? 'receta' : 'recetas'}`;
}
const refrescar = () => { pintarPanel(); pintarFiltros(); pintarRejilla(); };
function abrirPanel() { pintarPanel(); $('#panel').hidden = false; document.body.classList.add('bloqueado'); }
function cerrarPanel() { $('#panel').hidden = true; document.body.classList.remove('bloqueado'); }
$('#abrir-filtros').onclick = abrirPanel;
$('#velo').onclick = $('#aplicar').onclick = cerrarPanel;
$('#borrar').onclick = () => { selVol.clear(); selCat.clear(); selEtq.clear(); refrescar(); };
const alternar = (set, e) => { const b = e.target.closest('button'); if (!b) return; const v = b.dataset.v; set.has(v) ? set.delete(v) : set.add(v); refrescar(); };
$('#lista-vol').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.c) { const c = b.dataset.c; selCat.has(c) ? selCat.delete(c) : selCat.add(c); }
  else {
    const v = b.dataset.v; selVol.has(v) ? selVol.delete(v) : selVol.add(v);
    [...selCat].forEach(c => { if (!recetas.some(r => r.categoria === c && selVol.has(String(r.volumen)))) selCat.delete(c); });
  }
  refrescar();
};
$('#lista-etq').onclick = e => alternar(selEtq, e);

/* ---------- Cantidades ---------- */
function fmt(n, u) {
  if (n >= 10) return String(Math.round(n));
  if (u === 'g' || u === 'ml') return String(Math.round(n * 10) / 10).replace('.', ',');
  const q = Math.round(n * 4) / 4, ent = Math.floor(q), fr = q - ent;
  const f = { 0: '', .25: '¼', .5: '½', .75: '¾' }[fr];
  return String(ent || !f ? ent : '') + f;
}
const UNI = { diente: 'dientes', hoja: 'hojas', rama: 'ramas', loncha: 'lonchas', rebanada: 'rebanadas', vaso: 'vasos', lata: 'latas', sobre: 'sobres', taza: 'tazas', puñado: 'puñados', pizca: 'pizcas', chorro: 'chorros', manojo: 'manojos', ramillete: 'ramilletes', cabeza: 'cabezas', trozo: 'trozos', barra: 'barras', bote: 'botes' };
const PLU = Object.fromEntries(Object.entries(UNI).map(([s, p]) => [p, s]));
const unidad = (u, c) => { if (!u) return ''; const s = PLU[u] || u; return UNI[s] ? (c <= 1 ? s : UNI[s]) : u; };
function secciones(ings) {
  const out = []; let cur = { titulo: 'Ingredientes', items: [] };
  for (const i of ings) {
    if (i.grupo) { if (cur.items.length) out.push(cur); cur = { titulo: i.grupo, items: [] }; }
    else cur.items.push(i);
  }
  if (cur.items.length) out.push(cur);
  return out;
}
function pintarIngredientes() {
  const k = actual.raciones ? raciones / actual.raciones : 1;
  $('#ings').innerHTML = secciones(actual.ingredientes).map((s, n) => (n ? sec(s.titulo) : '') + '<ul class="ingredientes">' + s.items.map(i => {
    const c = i.cantidad == null ? null : i.cantidad * k;
    const q = c == null ? (i.texto || (i.pendiente ? 'por confirmar' : 'al gusto')) : fmt(c, i.unidad) + (i.unidad ? ' ' + unidad(i.unidad, c) : '');
    return `<li><label><input type="checkbox"><span class="n">${esc(cap(i.nombre))}</span><i class="l"></i><b>${esc(q)}</b></label></li>`;
  }).join('') + '</ul>').join('');
  const n = $('#n'); if (n) n.textContent = raciones;
}
function pasosHTML(pasos) {
  const secs = []; let cur = { titulo: null, items: [] };
  for (const p of pasos) {
    if (typeof p === 'object') { if (cur.items.length) secs.push(cur); cur = { titulo: p.grupo, items: [] }; }
    else cur.items.push(p);
  }
  secs.push(cur);
  return secs.filter(s => s.items.length).map(s => (s.titulo ? sec(s.titulo) : '') + `<ol class="pasos">${s.items.map(p => `<li>${esc(p)}</li>`).join('')}</ol>`).join('');
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
      <p class="datos">${esc(/^00\b/.test(r.volumen) ? 'Restaurantes' : r.volumen.replace(/^\d+\.\s*/, 'Volumen ' + r.volumen.slice(0, 2) + ': '))}${r.origen ? ' / ' + esc(r.origen) : ''}</p>
      ${r.etiquetas && r.etiquetas.length ? `<p class="datos">${esc(r.etiquetas.map(cap).join(' / '))}</p>` : ''}
      ${marco(r, 'grande')}
      ${secciones(r.ingredientes).length ? sec(secciones(r.ingredientes)[0].titulo) : ''}
      ${r.raciones ? `<div class="escalador">Raciones <button id="menos" aria-label="Menos raciones">−</button><b id="n"></b><button id="mas" aria-label="Más raciones">+</button></div>` : ''}
      <div id="ings"></div>
      ${sec('Elaboración')}
      ${pasosHTML(r.pasos)}
      ${r.notas ? sec('Notas') + `<div class="notas"><p>${esc(r.notas)}</p></div>` : ''}
      <div class="zona-borrar"><button id="borrar-receta" class="texto">Eliminar receta</button></div>
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
  $('#borrar-receta').onclick = () => abrirDialogoBorrar(r);
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

/* ---------- Eliminar receta (API de GitHub) ---------- */
let porBorrar = null;
const b64 = s => { const by = new TextEncoder().encode(s); let t = ''; for (let k = 0; k < by.length; k += 0x8000) t += String.fromCharCode(...by.subarray(k, k + 0x8000)); return btoa(t); };
const deb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
function repoPorDefecto() {
  try { const g = localStorage.getItem('gh_repo'); if (g) return g; } catch (e) {}
  const h = location.hostname;
  if (h.endsWith('.github.io')) { const o = h.split('.')[0]; return o + '/' + (location.pathname.split('/')[1] || h); }
  return '';
}
function abrirDialogoBorrar(r) {
  porBorrar = r;
  $('#dlg-msg').textContent = `Se eliminará «${r.titulo}» de recipes.json y su foto (${r.imagen || 'sin foto'}) del repositorio de GitHub. Esta acción no se puede deshacer desde la app.`;
  $('#dlg-repo').value = repoPorDefecto();
  try { $('#dlg-token').value = sessionStorage.getItem('gh_token') || ''; } catch (e) { $('#dlg-token').value = ''; }
  $('#dlg-estado').textContent = ''; $('#dlg-ok').disabled = false;
  $('#dialogo').hidden = false;
}
function cerrarDialogoBorrar() { $('#dialogo').hidden = true; porBorrar = null; }
async function gh(token, repo, path, { method = 'GET', body, raw = false } = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method, body: body ? JSON.stringify(body) : undefined,
    headers: { Authorization: 'Bearer ' + token, Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', ...(body ? { 'Content-Type': 'application/json' } : {}) }
  });
  if (res.status === 401 || res.status === 403) throw new Error('Token no válido o sin permiso de escritura (necesita «Contents: Read and write» en este repositorio).');
  if (res.status === 404 && method === 'GET' && path !== 'recipes.json') return null;
  if (res.status === 404) throw new Error('No se encuentra el repositorio o el archivo. Revisa el nombre del repositorio.');
  if (!res.ok) throw new Error('GitHub respondió con el error ' + res.status + '.');
  return raw ? res.text() : res.json();
}
async function eliminarReceta(r, token, repo) {
  const meta = await gh(token, repo, 'recipes.json');
  const texto = meta.content && meta.encoding === 'base64' ? deb64(meta.content) : await gh(token, repo, 'recipes.json', { raw: true });
  const datos = JSON.parse(texto), nuevos = datos.filter(x => x.id !== r.id);
  if (nuevos.length === datos.length) throw new Error('La receta no figura en el recipes.json del repositorio.');
  await gh(token, repo, 'recipes.json', { method: 'PUT', body: { message: `Eliminar receta: ${r.titulo}`, content: b64(JSON.stringify(nuevos, null, 1)), sha: meta.sha } });
  if (r.imagen) {
    const im = await gh(token, repo, r.imagen);
    if (im && im.sha) await gh(token, repo, r.imagen, { method: 'DELETE', body: { message: `Eliminar foto: ${r.titulo}`, sha: im.sha } });
  }
}
$('#dlg-cancelar').onclick = $('#velo2').onclick = cerrarDialogoBorrar;
$('#dlg-ok').onclick = async () => {
  const token = $('#dlg-token').value.trim(), repo = $('#dlg-repo').value.trim(), est = $('#dlg-estado');
  if (!token || !/^[^/\s]+\/[^/\s]+$/.test(repo)) { est.textContent = 'Escribe el token y el repositorio con el formato usuario/repositorio.'; return; }
  $('#dlg-ok').disabled = true; est.textContent = 'Eliminando…';
  try {
    await eliminarReceta(porBorrar, token, repo);
    try { localStorage.setItem('gh_repo', repo); $('#dlg-recordar').checked ? sessionStorage.setItem('gh_token', token) : sessionStorage.removeItem('gh_token'); } catch (e) {}
    const id = porBorrar.id; recetas = recetas.filter(x => x.id !== id);
    cerrarDialogoBorrar(); location.hash = ''; pintarFiltros(); pintarRejilla();
    $('#cuenta').textContent += '  ·  Receta eliminada: GitHub Pages tardará 1-2 minutos en actualizarse.';
  } catch (e) { est.textContent = e.message; $('#dlg-ok').disabled = false; }
};
