/* =========================================================
   JIJAZOS — Panel de control
   Estado local (localStorage) + render de vistas
   ========================================================= */

const STORAGE_KEY = 'jijazos_state_v1';
const ESTADOS_PARTICIPACION = ['No participa','Pendiente','Confirmado','Ganado','Perdido'];
const METODOS = ['Yape','Plin','Transferencia','Efectivo'];

function uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,9); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function money(n){ return 'S/' + (Math.round((n||0)*100)/100).toString(); }
function initials(name){
  return name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}
function fmtDate(iso){
  if(!iso) return '—';
  const d = new Date(iso+'T00:00:00');
  return d.toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'}).replace('.','');
}
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------------- SEED DATA ---------------- */
function seedState(){
  const groups = [
    { id:'g_jd001', code:'JD-001', name:'JIJAZO DUPLICADOR', image:null, price:20, status:'Activo',
      startDate:'2026-08-01', endDate:'', link:'https://t.me/', description:'Cuota 2 con análisis completo.',
      apuestasGanadas:1, apuestasPerdidas:0 },
    { id:'g_jd002', code:'JD-002', name:'JIJAZO DUPLICADOR', image:null, price:25, status:'Activo',
      startDate:'2026-08-02', endDate:'', link:'https://t.me/', description:'Segunda edición del mismo producto.',
      apuestasGanadas:0, apuestasPerdidas:0 },
    { id:'g_pj001', code:'PJ-001', name:'PACK JIJAZO', image:null, price:49, status:'Finalizado',
      startDate:'2026-07-29', endDate:'2026-07-30', link:'https://t.me/', description:'Pack especial con varias selecciones.',
      apuestasGanadas:1, apuestasPerdidas:0 },
  ];
  const users = [
    { id:'u_javier', name:'Javier López', handle:'javierl_', phone:'999 111 222', email:'javier@example.com',
      notes:'Cliente frecuente.', registered:'2026-07-20' },
    { id:'u_bardo', name:'Bardo Ramírez', handle:'bardo9434', phone:'987 334 221', email:'bardo@example.com',
      notes:'', registered:'2026-07-21' },
    { id:'u_franco', name:'Franco León', handle:'franchelo', phone:'955 947 133', email:'franco@example.com',
      notes:'', registered:'2026-07-26' },
  ];
  const participations = [
    { id:uid('p'), userId:'u_javier', groupId:'g_jd001', fecha:'2026-08-01', pago:20, metodo:'Yape', estado:'Confirmado' },
    { id:uid('p'), userId:'u_javier', groupId:'g_jd002', fecha:'', pago:0, metodo:'Yape', estado:'No participa' },
    { id:uid('p'), userId:'u_javier', groupId:'g_pj001', fecha:'2026-07-29', pago:49, metodo:'Yape', estado:'Ganado' },
    { id:uid('p'), userId:'u_bardo', groupId:'g_jd001', fecha:'', pago:0, metodo:'Yape', estado:'No participa' },
    { id:uid('p'), userId:'u_bardo', groupId:'g_jd002', fecha:'2026-08-02', pago:25, metodo:'Plin', estado:'Pendiente' },
    { id:uid('p'), userId:'u_bardo', groupId:'g_pj001', fecha:'', pago:0, metodo:'Yape', estado:'No participa' },
    { id:uid('p'), userId:'u_franco', groupId:'g_jd001', fecha:'', pago:0, metodo:'Yape', estado:'No participa' },
    { id:uid('p'), userId:'u_franco', groupId:'g_jd002', fecha:'', pago:0, metodo:'Yape', estado:'No participa' },
    { id:uid('p'), userId:'u_franco', groupId:'g_pj001', fecha:'', pago:0, metodo:'Yape', estado:'No participa' },
  ];
  const activity = [
    { title:'Se creó el grupo JD-002', time:'Hoy 16:20', tag:'Grupo', ico:'G' },
    { title:'Javier López confirmó un pago', time:'Hoy 16:12', tag:'Pago', ico:'P' },
    { title:'Franco León quedó pendiente', time:'Hoy 15:48', tag:'Revisión', ico:'R' },
  ];
  return { groups, users, participations, activity };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.warn('No se pudo leer el estado guardado', e); }
  const s = seedState();
  saveState(s);
  return s;
}
function saveState(s){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
  catch(e){ console.warn('No se pudo guardar el estado', e); }
}

let state = loadState();
let view = { name:'inicio', params:{} };

function pushActivity(title, tag){
  const icoMap = {Grupo:'G', Pago:'P', Revisión:'R', Usuario:'U'};
  state.activity.unshift({ title, time:'Hoy '+new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}), tag, ico: icoMap[tag]||'•' });
  state.activity = state.activity.slice(0,8);
}

/* ---------------- DERIVED HELPERS ---------------- */
function groupParticipants(groupId){
  return state.participations.filter(p => p.groupId===groupId && p.estado!=='No participa');
}
function groupEffectiveness(g){
  const total = (g.apuestasGanadas||0) + (g.apuestasPerdidas||0);
  if(total===0) return null;
  return Math.round((g.apuestasGanadas/total)*1000)/10;
}
function userParticipations(userId){
  return state.participations.filter(p => p.userId===userId && p.estado!=='No participa');
}
function userTotalPagado(userId){
  return userParticipations(userId).reduce((sum,p)=> sum + (Number(p.pago)||0), 0);
}
function userEstadoActividad(userId){
  const parts = userParticipations(userId);
  if(parts.length===0) return 'Pendiente';
  const activos = parts.some(p => p.estado==='Confirmado' || p.estado==='Pendiente' || p.estado==='Ganado');
  return activos ? 'Activo' : 'Ausente';
}
function totalIngresos(){
  return state.participations.reduce((sum,p)=> sum + (Number(p.pago)||0), 0);
}
function globalEfectividad(){
  const ganados = state.participations.filter(p=>p.estado==='Ganado').length;
  const perdidos = state.participations.filter(p=>p.estado==='Perdido').length;
  const total = ganados+perdidos;
  return { ganados, perdidos, pct: total? Math.round((ganados/total)*100) : 100 };
}
function groupById(id){ return state.groups.find(g=>g.id===id); }
function userById(id){ return state.users.find(u=>u.id===id); }

function groupThumb(g, size=34){
  if(g.image){
    return `<div class="group-eff-thumb" style="padding:0;overflow:hidden;background:#fff;border:1px solid var(--line);width:${size}px;height:${size}px;"><img src="${g.image}" style="width:100%;height:100%;object-fit:cover;"></div>`;
  }
  return `<div class="group-eff-thumb" style="width:${size}px;height:${size}px;">${escapeHtml(g.code.slice(0,2))}</div>`;
}

/* ---------------- RENDER ROOT ---------------- */
const viewWrap = document.getElementById('viewWrap');

function render(){
  document.querySelectorAll('.nav-item').forEach(a=>{
    a.classList.toggle('active', a.dataset.view === view.name);
  });
  const renderers = {
    inicio: renderInicio,
    grupos: renderGrupos,
    usuarios: renderUsuarios,
    usuario: renderUsuarioDetalle,
    control: renderControl,
    estadisticas: renderEstadisticas,
  };
  (renderers[view.name] || renderInicio)();
  window.scrollTo({top:0, behavior:'instant'});
}

function go(name, params={}){
  view = { name, params };
  render();
}

/* ---------------- INICIO ---------------- */
function renderInicio(){
  const ingresos = totalIngresos();
  const usuariosCount = state.users.length;
  const gruposActivos = state.groups.filter(g=>g.status==='Activo').length;
  const eff = globalEfectividad();

  const semanal = [
    {d:'Lun', v:180},{d:'Mar', v:320},{d:'Mié', v:210},{d:'Jue', v:490},
    {d:'Vie', v:380},{d:'Sáb', v:620},{d:'Dom', v:540}
  ];
  const maxV = Math.max(...semanal.map(s=>s.v));

  viewWrap.innerHTML = `
    <div class="view-head">
      <div>
        <h1>Resumen general</h1>
        <p>Control de grupos, usuarios, ventas y resultados.</p>
      </div>
      <div class="head-actions">
        <button class="btn" id="btnNuevoUsuario"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Usuario</button>
        <button class="btn btn-primary" id="btnNuevoGrupo"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Grupo</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <span class="stat-daily-tag">Diario</span>
        <div class="stat-top"><span class="stat-label">Ingresos</span>
          <div class="stat-icon"><svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        </div>
        <div class="stat-value">${money(ingresos)}</div>
        <div class="stat-foot">Total registrado</div>
      </div>
      <div class="stat-card">
        <span class="stat-daily-tag">Diario</span>
        <div class="stat-top"><span class="stat-label">Usuarios</span>
          <div class="stat-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"/></svg></div>
        </div>
        <div class="stat-value">${usuariosCount}</div>
        <div class="stat-foot">Clientes</div>
      </div>
      <div class="stat-card">
        <span class="stat-daily-tag">Diario</span>
        <div class="stat-top"><span class="stat-label">Grupos activos</span>
          <div class="stat-icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>
        </div>
        <div class="stat-value">${gruposActivos}</div>
        <div class="stat-foot">${state.groups.length} participaciones</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Efectividad</span>
          <div class="stat-icon"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></div>
        </div>
        <div class="stat-value">${eff.pct}%</div>
        <div class="stat-foot">${eff.ganados} ganados / ${eff.perdidos} perdidos</div>
      </div>
    </div>

    <div class="panel-row">
      <div class="panel">
        <h3>Ingresos de la semana</h3>
        <p class="panel-sub">Últimos 7 días</p>
        <div class="bars">
          ${semanal.map(s=>`
            <div class="bar-col">
              <span class="bar-val">S/${s.v}</span>
              <div class="bar" style="height:${(s.v/maxV*100).toFixed(0)}%"></div>
              <span class="bar-day">${s.d}</span>
            </div>`).join('')}
        </div>
      </div>
      <div class="panel">
        <h3>Actividad reciente</h3>
        <p class="panel-sub">Últimos movimientos</p>
        <div class="activity-list">
          ${state.activity.map(a=>`
            <div class="activity-item">
              <div class="activity-ico">${a.ico}</div>
              <div class="activity-body">
                <div class="activity-title">${escapeHtml(a.title)}</div>
                <div class="activity-time">${a.time}</div>
              </div>
              <span class="tag ${a.tag==='Grupo'?'tag-grupo':a.tag==='Pago'?'tag-pago':'tag-revision'}">${a.tag}</span>
            </div>`).join('') || '<div class="empty-state">Sin movimientos todavía.</div>'}
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:16px;">
      <h3>Efectividad por grupo</h3>
      <p class="panel-sub">Cada grupo mantiene su propia estadística, actualizada según los resultados registrados.</p>
      <div class="group-eff-list">
        ${state.groups.map(g=>{
          const pct = groupEffectiveness(g);
          const total = (g.apuestasGanadas||0)+(g.apuestasPerdidas||0);
          return `
          <div class="group-eff-row">
            ${groupThumb(g)}
            <div class="group-eff-info">
              <div class="group-eff-name">${escapeHtml(g.name)} <span class="group-code">${g.code}</span></div>
              <div class="group-eff-sub">${total} apuesta${total===1?'':'s'} registrada${total===1?'':'s'}</div>
              <div class="eff-track"><div class="eff-fill" style="width:${pct===null?0:pct}%"></div></div>
            </div>
            <div class="group-eff-pct">${pct===null?'—':pct+'%'}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById('btnNuevoUsuario').onclick = ()=>openUserModal();
  document.getElementById('btnNuevoGrupo').onclick = ()=>openGroupModal();
}

/* ---------------- GRUPOS ---------------- */
function renderGrupos(){
  viewWrap.innerHTML = `
    <div class="view-head">
      <div>
        <h1>Grupos JIJAZOS</h1>
        <p>Crea grupos sin límite de cupos.</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-primary" id="btnCrearGrupo"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Crear grupo</button>
      </div>
    </div>
    <div class="groups-grid" id="gruposGrid"></div>
  `;
  document.getElementById('btnCrearGrupo').onclick = ()=>openGroupModal();

  const grid = document.getElementById('gruposGrid');
  state.groups.forEach(g=>{
    const participants = groupParticipants(g.id);
    const pct = groupEffectiveness(g);
    const card = document.createElement('div');
    card.className = 'group-card';
    const wonEarnings = g.status==='Finalizado' ? g.price * participants.length : null;
    card.innerHTML = `
      <div class="group-cover">
        ${g.image ? `<img src="${g.image}">` : `<span class="cover-mark">${escapeHtml(g.code)}</span>`}
        <span class="status-badge status-${g.status}">${g.status}</span>
      </div>
      <div class="group-body">
        <div class="group-name">${escapeHtml(g.name)} <span class="group-code">${g.code}</span></div>
        <p class="group-desc">${escapeHtml(g.description||'')}</p>
        <div class="group-stats">
          <div class="gstat"><b>${money(g.price)}</b><span>Precio</span></div>
          <div class="gstat"><b>${participants.length}</b><span>Usuarios</span></div>
          <div class="gstat"><b>${fmtDate(g.startDate)}</b><span>Inicio</span></div>
        </div>
        <div class="group-eff-mini">
          <div class="group-eff-mini-top"><span>Efectividad</span><b>${pct===null?'—':pct+'%'}</b></div>
          <div class="eff-track"><div class="eff-fill" style="width:${pct===null?0:pct}%"></div></div>
        </div>
        ${wonEarnings!==null ? `<div class="group-earn"><span>Total ganancias</span><b>${money(wonEarnings)}</b></div>` : ''}
        <div class="group-foot">
          <button class="btn btn-sm" data-open="${g.id}">Opciones</button>
        </div>
      </div>
    `;
    card.addEventListener('click', (e)=>{ if(e.target.closest('button')) return; openGroupModal(g.id); });
    card.querySelector('[data-open]').onclick = ()=>openGroupModal(g.id);
    grid.appendChild(card);
  });

  const addCard = document.createElement('button');
  addCard.className = 'add-group-card';
  addCard.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><b>Agregar grupo</b><span>Sin límite de cupos</span>`;
  addCard.onclick = ()=>openGroupModal();
  grid.appendChild(addCard);
}

function openGroupModal(groupId){
  const isEdit = !!groupId;
  const g = isEdit ? groupById(groupId) : {
    id:null, code:'', name:'', image:null, price:0, status:'Activo',
    startDate:todayISO(), endDate:'', link:'', description:'', apuestasGanadas:0, apuestasPerdidas:0
  };

  const body = document.createElement('div');
  body.innerHTML = `
    <p class="form-section-label">Imagen e identificación</p>
    <div class="form-row single">
      <div class="field">
        <label>Imagen del grupo</label>
        <label class="file-drop" id="fileDrop">
          ${g.image ? `<img src="${g.image}"><br>` : ''}
          <span id="fileDropText">${g.image ? 'Cambiar imagen' : 'Seleccionar archivo (PNG, JPG o WEBP, máximo 2 MB)'}</span>
          <input type="file" accept="image/*" id="groupImageInput">
        </label>
      </div>
    </div>
    <div class="form-row">
      <div class="field"><label>Nombre</label><input id="gName" value="${escapeHtml(g.name)}" placeholder="Ej. JIJAZO DUPLICADOR"></div>
      <div class="field"><label>Código único</label><input id="gCode" value="${escapeHtml(g.code)}" placeholder="Ej. JD-003"></div>
    </div>

    <p class="form-section-label">Configuración</p>
    <div class="form-row">
      <div class="field"><label>Precio (S/)</label><input type="number" min="0" step="1" id="gPrice" value="${g.price}"></div>
      <div class="field"><label>Estado</label>
        <select id="gStatus">
          ${['Activo','Pendiente','Finalizado'].map(s=>`<option ${g.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="field"><label>Fecha de inicio</label><input type="date" id="gStart" value="${g.startDate||''}"></div>
      <div class="field"><label>Fecha final <span style="font-weight:400;color:var(--muted);">(opcional)</span></label><input type="date" id="gEnd" value="${g.endDate||''}"></div>
    </div>
    <div class="form-row single">
      <div class="field"><label>Enlace</label><input id="gLink" value="${escapeHtml(g.link||'')}" placeholder="https://t.me/..."></div>
    </div>
    <div class="form-row single">
      <div class="field"><label>Descripción</label><textarea id="gDesc" placeholder="Cuota 2 con análisis completo.">${escapeHtml(g.description||'')}</textarea></div>
    </div>

    <p class="form-section-label">Apuestas enviadas</p>
    <p class="hint" style="margin:-6px 0 10px;">Registra solo los resultados; la efectividad se calcula automáticamente.</p>
    <div class="form-row">
      <div class="field"><label>Ganadas</label><input type="number" min="0" id="gWon" value="${g.apuestasGanadas||0}"></div>
      <div class="field"><label>Perdidas</label><input type="number" min="0" id="gLost" value="${g.apuestasPerdidas||0}"></div>
    </div>
    <div class="bulk-preview" id="effPreview"></div>

    ${isEdit ? `
      <p class="form-section-label">Usuarios del grupo</p>
      <p class="hint" style="margin:-6px 0 10px;">Pega una lista de usuarios (uno por línea) para agregarlos a este grupo de forma masiva.</p>
      <div class="form-row single">
        <div class="field"><textarea id="gBulkUsers" placeholder="javierl_&#10;bardo9434&#10;franchelo"></textarea></div>
      </div>
      <div class="head-actions" style="margin-bottom:10px;">
        <button class="btn btn-sm" id="btnBulkAdd" type="button">Agregar usuarios a este grupo</button>
      </div>
      <div id="groupMembersList"></div>
    ` : ''}
  `;

  function updateEffPreview(){
    const w = Number(body.querySelector('#gWon').value)||0;
    const l = Number(body.querySelector('#gLost').value)||0;
    const total = w+l;
    const pct = total ? Math.round((w/total)*1000)/10 : null;
    body.querySelector('#effPreview').innerHTML =
      `Apuestas enviadas: <b>${total}</b> &nbsp;·&nbsp; Efectividad: <b>${pct===null?'—':pct+'%'}</b>`;
  }
  updateEffPreview();
  body.querySelector('#gWon').addEventListener('input', updateEffPreview);
  body.querySelector('#gLost').addEventListener('input', updateEffPreview);

  let pendingImage = g.image;
  body.querySelector('#groupImageInput').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      pendingImage = reader.result;
      body.querySelector('#fileDropText').textContent = 'Cambiar imagen';
      showToast('Imagen cargada');
    };
    reader.readAsDataURL(file);
  });

  function renderMembers(){
    if(!isEdit) return;
    const wrap = body.querySelector('#groupMembersList');
    const rows = state.participations.filter(p=>p.groupId===g.id && p.estado!=='No participa');
    wrap.innerHTML = rows.length ? `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${rows.map(p=>{
          const u = userById(p.userId);
          return `<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;">
            <div class="avatar-sq" style="width:26px;height:26px;font-size:10px;">${initials(u.name)}</div>
            <span style="flex:1;">${escapeHtml(u.name)}</span>
            <span class="pill pill-${p.estado.replace(' ','')}">${p.estado}</span>
          </div>`;
        }).join('')}
      </div>` : `<p class="hint">Aún no hay usuarios en este grupo.</p>`;
  }
  renderMembers();

  if(isEdit){
    body.querySelector('#btnBulkAdd').onclick = ()=>{
      const raw = body.querySelector('#gBulkUsers').value;
      const names = raw.split('\n').map(s=>s.trim()).filter(Boolean);
      if(!names.length){ showToast('Pega al menos un usuario'); return; }
      let added=0, updated=0;
      names.forEach(entry=>{
        const handle = entry.replace(/^@/,'');
        let u = state.users.find(u2 => u2.handle.toLowerCase()===handle.toLowerCase() || u2.name.toLowerCase()===entry.toLowerCase());
        if(!u){
          u = { id:uid('u'), name:entry, handle:handle.toLowerCase().replace(/\s+/g,''), phone:'', email:'', notes:'', registered:todayISO() };
          state.users.push(u);
          added++;
        }
        let part = state.participations.find(p=>p.userId===u.id && p.groupId===g.id);
        if(!part){
          state.participations.push({ id:uid('p'), userId:u.id, groupId:g.id, fecha:todayISO(), pago:g.price, metodo:'Yape', estado:'Pendiente' });
        }else if(part.estado==='No participa'){
          part.estado='Pendiente'; part.fecha=todayISO(); part.pago=g.price;
        }
        updated++;
      });
      saveState(state);
      body.querySelector('#gBulkUsers').value='';
      renderMembers();
      showToast(`${added} usuario(s) nuevos · ${updated} agregado(s) al grupo`);
    };
  }

  openModal({
    title: isEdit ? 'Editar grupo' : 'Crear grupo',
    body,
    wide:true,
    footerButtons: [
      ...(isEdit ? [{label:'Eliminar grupo', variant:'danger', onClick:(close)=>{
        if(confirm('¿Eliminar este grupo? Esta acción no se puede deshacer.')){
          state.groups = state.groups.filter(x=>x.id!==g.id);
          state.participations = state.participations.filter(p=>p.groupId!==g.id);
          saveState(state); close(); go('grupos'); showToast('Grupo eliminado');
        }
      }}] : []),
      {label:'Cancelar', variant:'ghost', onClick:(close)=>close()},
      {label: isEdit ? 'Guardar' : 'Crear grupo', variant:'primary', onClick:(close)=>{
        const name = body.querySelector('#gName').value.trim();
        const code = body.querySelector('#gCode').value.trim();
        if(!name || !code){ showToast('Nombre y código son obligatorios'); return; }
        const payload = {
          name, code,
          image: pendingImage,
          price: Number(body.querySelector('#gPrice').value)||0,
          status: body.querySelector('#gStatus').value,
          startDate: body.querySelector('#gStart').value,
          endDate: body.querySelector('#gEnd').value,
          link: body.querySelector('#gLink').value.trim(),
          description: body.querySelector('#gDesc').value.trim(),
          apuestasGanadas: Number(body.querySelector('#gWon').value)||0,
          apuestasPerdidas: Number(body.querySelector('#gLost').value)||0,
        };
        if(isEdit){
          Object.assign(g, payload);
          pushActivity(`Se actualizó el grupo ${code}`, 'Grupo');
        }else{
          const newGroup = { id: uid('g'), ...payload };
          state.groups.push(newGroup);
          state.users.forEach(u=>{
            state.participations.push({ id:uid('p'), userId:u.id, groupId:newGroup.id, fecha:'', pago:0, metodo:'Yape', estado:'No participa' });
          });
          pushActivity(`Se creó el grupo ${code}`, 'Grupo');
        }
        saveState(state);
        close();
        go('grupos');
        showToast(isEdit ? 'Grupo actualizado' : 'Grupo creado');
      }},
    ]
  });
}

/* ---------------- USUARIOS ---------------- */
function renderUsuarios(){
  viewWrap.innerHTML = `
    <div class="view-head">
      <div>
        <h1>Usuarios</h1>
        <p>Clientes y grupos asignados.</p>
      </div>
      <div class="head-actions">
        <button class="btn" id="btnExport"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>Exportar CSV</button>
        <button class="btn btn-primary" id="btnNuevoUsuario2"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Usuario</button>
      </div>
    </div>
    <div class="table-card">
      <div class="table-toolbar">
        <input type="text" id="userSearch" placeholder="Buscar por nombre, usuario o teléfono">
        <select id="userFilter">
          <option value="">Todos los estados</option>
          <option>Activo</option>
          <option>Ausente</option>
          <option>Pendiente</option>
        </select>
      </div>
      <table>
        <thead><tr>
          <th>Usuario</th><th>Contacto</th><th>Grupos</th><th>Total pagado</th><th>Estado</th><th>Registro</th><th>Opciones</th>
        </tr></thead>
        <tbody id="userTbody"></tbody>
      </table>
    </div>
  `;
  document.getElementById('btnNuevoUsuario2').onclick = ()=>openUserModal();
  document.getElementById('btnExport').onclick = exportUsersCSV;

  function paint(){
    const q = document.getElementById('userSearch').value.toLowerCase();
    const f = document.getElementById('userFilter').value;
    const tbody = document.getElementById('userTbody');
    const rows = state.users.filter(u=>{
      const estado = userEstadoActividad(u.id);
      const matchesQ = !q || u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q) || (u.phone||'').includes(q);
      const matchesF = !f || estado===f;
      return matchesQ && matchesF;
    });
    tbody.innerHTML = rows.map(u=>{
      const grupos = userParticipations(u.id).length;
      const total = userTotalPagado(u.id);
      const estado = userEstadoActividad(u.id);
      return `
      <tr class="clickable" data-uid="${u.id}">
        <td><div class="cell-user"><div class="avatar-sq">${initials(u.name)}</div>
          <div><div class="uname">${escapeHtml(u.name)}</div><div class="uhandle">@${escapeHtml(u.handle)}</div></div></div></td>
        <td>${escapeHtml(u.phone||'—')}<br><span class="uhandle">${escapeHtml(u.email||'')}</span></td>
        <td>${grupos}</td>
        <td>${money(total)}</td>
        <td><span class="pill pill-${estado}">${estado}</span></td>
        <td>${fmtDate(u.registered)}</td>
        <td><button class="btn btn-sm" data-view-u="${u.id}">Ver ficha</button></td>
      </tr>`;
    }).join('') || `<tr><td colspan="7"><div class="empty-state">No se encontraron usuarios.</div></td></tr>`;

    tbody.querySelectorAll('tr[data-uid]').forEach(tr=>{
      tr.addEventListener('click',(e)=>{
        if(e.target.closest('button')) return;
        go('usuario', {id: tr.dataset.uid});
      });
    });
    tbody.querySelectorAll('[data-view-u]').forEach(btn=>{
      btn.onclick = ()=> go('usuario', {id: btn.dataset.viewU});
    });
  }
  paint();
  document.getElementById('userSearch').addEventListener('input', paint);
  document.getElementById('userFilter').addEventListener('change', paint);
}

function exportUsersCSV(){
  const header = ['Usuario','Handle','Telefono','Email','Grupos','TotalPagado','Estado','Registro'];
  const lines = [header.join(',')];
  state.users.forEach(u=>{
    lines.push([
      u.name, u.handle, u.phone, u.email,
      userParticipations(u.id).length, userTotalPagado(u.id),
      userEstadoActividad(u.id), u.registered
    ].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(','));
  });
  const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'usuarios_jijazos.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportado');
}

function openUserModal(){
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="form-row">
      <div class="field"><label>Nombre completo</label><input id="uName" placeholder="Ej. Javier López"></div>
      <div class="field"><label>Usuario (@handle)</label><input id="uHandle" placeholder="javierl_"></div>
    </div>
    <div class="form-row">
      <div class="field"><label>Teléfono</label><input id="uPhone" placeholder="999 111 222"></div>
      <div class="field"><label>Correo</label><input id="uEmail" placeholder="correo@ejemplo.com"></div>
    </div>
    <div class="form-row single">
      <div class="field"><label>Notas</label><textarea id="uNotes" placeholder="Opcional"></textarea></div>
    </div>
  `;
  openModal({
    title:'Nuevo usuario', body,
    footerButtons:[
      {label:'Cancelar', variant:'ghost', onClick:(close)=>close()},
      {label:'Crear usuario', variant:'primary', onClick:(close)=>{
        const name = body.querySelector('#uName').value.trim();
        if(!name){ showToast('El nombre es obligatorio'); return; }
        const handle = (body.querySelector('#uHandle').value.trim()||name).toLowerCase().replace(/\s+/g,'').replace(/^@/,'');
        const u = { id:uid('u'), name, handle, phone: body.querySelector('#uPhone').value.trim(),
          email: body.querySelector('#uEmail').value.trim(), notes: body.querySelector('#uNotes').value.trim(),
          registered: todayISO() };
        state.users.push(u);
        state.groups.forEach(g=>{
          state.participations.push({ id:uid('p'), userId:u.id, groupId:g.id, fecha:'', pago:0, metodo:'Yape', estado:'No participa' });
        });
        pushActivity(`Se registró el usuario ${name}`, 'Usuario');
        saveState(state);
        close();
        go('usuarios');
        showToast('Usuario creado');
      }},
    ]
  });
}

/* ---------------- USUARIO ÚNICO ---------------- */
function renderUsuarioDetalle(){
  const u = userById(view.params.id);
  if(!u){ go('usuarios'); return; }
  const parts = state.participations.filter(p=>p.userId===u.id);
  const estado = userEstadoActividad(u.id);

  viewWrap.innerHTML = `
    <div class="back-link" id="backToUsers"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>Volver</div>
    <div class="detail-grid">
      <div class="profile-card">
        <div class="profile-avatar">${initials(u.name)}</div>
        <div class="profile-name">${escapeHtml(u.name)}</div>
        <div class="profile-handle">@${escapeHtml(u.handle)}</div>
        <span class="pill pill-${estado}">${estado}</span>
        <div class="profile-stats">
          <div class="gstat"><b>${userParticipations(u.id).length}</b><span>Grupos</span></div>
          <div class="gstat"><b>${money(userTotalPagado(u.id))}</b><span>Total pagado</span></div>
        </div>
        <div class="profile-fields">
          <div class="pf-row"><label>Teléfono</label><span>${escapeHtml(u.phone||'—')}</span></div>
          <div class="pf-row"><label>Correo</label><span>${escapeHtml(u.email||'—')}</span></div>
          <div class="pf-row"><label>Registro</label><span>${fmtDate(u.registered)}</span></div>
          <div class="pf-row"><label>Notas</label><span>${escapeHtml(u.notes||'—')}</span></div>
        </div>
        <div class="head-actions" style="margin-top:16px;">
          <button class="btn btn-sm" id="btnEditUser">Editar</button>
          <button class="btn btn-sm btn-danger" id="btnDelUser">Eliminar</button>
        </div>
      </div>

      <div class="table-card">
        <div class="table-toolbar" style="justify-content:space-between;">
          <h3 style="margin:0;font-size:14.5px;">Historial de grupos</h3>
          <button class="btn btn-primary btn-sm" id="btnAddGroupToUser"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Grupo</button>
        </div>
        <table>
          <thead><tr><th>Grupo</th><th>Fecha</th><th>Pago</th><th>Método</th><th>Estado</th><th>Opciones</th></tr></thead>
          <tbody id="userGroupsTbody"></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('backToUsers').onclick = ()=>go('usuarios');
  document.getElementById('btnEditUser').onclick = ()=>openUserEditModal(u.id);
  document.getElementById('btnDelUser').onclick = ()=>{
    if(confirm('¿Eliminar este usuario y su historial?')){
      state.users = state.users.filter(x=>x.id!==u.id);
      state.participations = state.participations.filter(p=>p.userId!==u.id);
      saveState(state);
      go('usuarios');
      showToast('Usuario eliminado');
    }
  };
  document.getElementById('btnAddGroupToUser').onclick = ()=>openAddGroupToUserModal(u.id);

  function paintGroups(){
    const tbody = document.getElementById('userGroupsTbody');
    const rows = parts.filter(p=>p.estado!=='No participa');
    tbody.innerHTML = rows.length ? rows.map(p=>{
      const g = groupById(p.groupId);
      if(!g) return '';
      return `
      <tr>
        <td><div class="cell-user" style="cursor:pointer;" data-goto-group="${g.id}">${groupThumb(g,30)}
          <div><div class="uname">${escapeHtml(g.name)}</div><div class="uhandle">${g.code}</div></div></div></td>
        <td>${fmtDate(p.fecha)}</td>
        <td>${money(p.pago)}</td>
        <td>${escapeHtml(p.metodo)}</td>
        <td>
          <select class="cell-select" data-pid="${p.id}">
            ${ESTADOS_PARTICIPACION.filter(s=>s!=='No participa').map(s=>`<option ${p.estado===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
        <td><button class="btn btn-sm btn-danger" data-quitar="${p.id}">Quitar</button></td>
      </tr>`;
    }).join('') : `<tr><td colspan="6"><div class="empty-state">Este usuario aún no participa en ningún grupo.</div></td></tr>`;

    tbody.querySelectorAll('[data-goto-group]').forEach(el=>{
      el.onclick = ()=>{ go('grupos'); setTimeout(()=>openGroupModal(el.dataset.gotoGroup),0); };
    });
    tbody.querySelectorAll('.cell-select').forEach(sel=>{
      sel.addEventListener('change', ()=>{
        const p = state.participations.find(x=>x.id===sel.dataset.pid);
        p.estado = sel.value;
        if(!p.fecha) p.fecha = todayISO();
        saveState(state);
        pushActivity(`${u.name} quedó ${p.estado.toLowerCase()} en ${groupById(p.groupId).code}`, p.estado==='Confirmado'?'Pago':'Revisión');
        showToast('Estado actualizado');
      });
    });
    tbody.querySelectorAll('[data-quitar]').forEach(btn=>{
      btn.onclick = ()=>{
        const p = state.participations.find(x=>x.id===btn.dataset.quitar);
        p.estado = 'No participa'; p.pago = 0; p.fecha='';
        saveState(state);
        paintGroups();
        showToast('Usuario retirado del grupo');
      };
    });
  }
  paintGroups();
}

function openUserEditModal(userId){
  const u = userById(userId);
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="form-row">
      <div class="field"><label>Nombre completo</label><input id="uName" value="${escapeHtml(u.name)}"></div>
      <div class="field"><label>Usuario (@handle)</label><input id="uHandle" value="${escapeHtml(u.handle)}"></div>
    </div>
    <div class="form-row">
      <div class="field"><label>Teléfono</label><input id="uPhone" value="${escapeHtml(u.phone||'')}"></div>
      <div class="field"><label>Correo</label><input id="uEmail" value="${escapeHtml(u.email||'')}"></div>
    </div>
    <div class="form-row single">
      <div class="field"><label>Notas</label><textarea id="uNotes">${escapeHtml(u.notes||'')}</textarea></div>
    </div>
  `;
  openModal({
    title:'Editar usuario', body,
    footerButtons:[
      {label:'Cancelar', variant:'ghost', onClick:(close)=>close()},
      {label:'Guardar', variant:'primary', onClick:(close)=>{
        u.name = body.querySelector('#uName').value.trim() || u.name;
        u.handle = body.querySelector('#uHandle').value.trim().replace(/^@/,'') || u.handle;
        u.phone = body.querySelector('#uPhone').value.trim();
        u.email = body.querySelector('#uEmail').value.trim();
        u.notes = body.querySelector('#uNotes').value.trim();
        saveState(state);
        close();
        go('usuario', {id:u.id});
        showToast('Usuario actualizado');
      }},
    ]
  });
}

function openAddGroupToUserModal(userId){
  const u = userById(userId);
  const disponibles = state.groups.filter(g=>{
    const p = state.participations.find(p2=>p2.userId===userId && p2.groupId===g.id);
    return !p || p.estado==='No participa';
  });
  const body = document.createElement('div');
  if(!disponibles.length){
    body.innerHTML = `<p class="hint">${escapeHtml(u.name)} ya participa en todos los grupos disponibles.</p>`;
    openModal({title:'Agregar a un grupo', body, footerButtons:[{label:'Cerrar', variant:'ghost', onClick:(close)=>close()}]});
    return;
  }
  body.innerHTML = `
    <div class="form-row">
      <div class="field"><label>Grupo</label>
        <select id="aGroup">${disponibles.map(g=>`<option value="${g.id}">${escapeHtml(g.name)} — ${g.code}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Estado</label>
        <select id="aEstado">${['Pendiente','Confirmado','Ganado','Perdido'].map(s=>`<option>${s}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="field"><label>Pago (S/)</label><input type="number" id="aPago" value="${disponibles[0].price}"></div>
      <div class="field"><label>Método</label><select id="aMetodo">${METODOS.map(m=>`<option>${m}</option>`).join('')}</select></div>
    </div>
  `;
  const groupSel = body.querySelector('#aGroup');
  groupSel.addEventListener('change', ()=>{
    body.querySelector('#aPago').value = groupById(groupSel.value).price;
  });

  openModal({
    title:'Agregar a un grupo', body,
    footerButtons:[
      {label:'Cancelar', variant:'ghost', onClick:(close)=>close()},
      {label:'Agregar', variant:'primary', onClick:(close)=>{
        const groupId = body.querySelector('#aGroup').value;
        let p = state.participations.find(p2=>p2.userId===userId && p2.groupId===groupId);
        const payload = {
          estado: body.querySelector('#aEstado').value,
          pago: Number(body.querySelector('#aPago').value)||0,
          metodo: body.querySelector('#aMetodo').value,
          fecha: todayISO(),
        };
        if(p) Object.assign(p, payload);
        else state.participations.push({ id:uid('p'), userId, groupId, ...payload });
        saveState(state);
        pushActivity(`${u.name} se unió a ${groupById(groupId).code}`, 'Grupo');
        close();
        go('usuario', {id:userId});
        showToast('Usuario agregado al grupo');
      }},
    ]
  });
}

/* ---------------- CONTROL GENERAL ---------------- */
function renderControl(){
  viewWrap.innerHTML = `
    <div class="view-head">
      <div>
        <h1>Control general</h1>
        <p>Cada grupo muestra foto y código para diferenciar nombres repetidos.</p>
      </div>
    </div>
    <div class="table-card">
      <div class="matrix-wrap">
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              ${state.groups.map(g=>`
                <th>
                  <div class="matrix-head-cell" data-goto-group="${g.id}">
                    ${groupThumb(g,26)}
                    <div>
                      <div class="matrix-head-name">${escapeHtml(g.name)}</div>
                      <div class="matrix-head-code">${g.code}</div>
                    </div>
                  </div>
                </th>`).join('')}
            </tr>
          </thead>
          <tbody id="matrixTbody"></tbody>
        </table>
      </div>
    </div>
  `;
  document.querySelectorAll('[data-goto-group]').forEach(el=>{
    el.onclick = ()=>{ go('grupos'); setTimeout(()=>openGroupModal(el.dataset.gotoGroup),0); };
  });

  const tbody = document.getElementById('matrixTbody');
  tbody.innerHTML = state.users.map(u=>`
    <tr>
      <td><div class="cell-user"><div class="avatar-sq">${initials(u.name)}</div>
        <div><div class="uname">${escapeHtml(u.name)}</div><div class="uhandle">@${escapeHtml(u.handle)}</div></div></div></td>
      ${state.groups.map(g=>{
        let p = state.participations.find(p2=>p2.userId===u.id && p2.groupId===g.id);
        if(!p){
          p = { id:uid('p'), userId:u.id, groupId:g.id, fecha:'', pago:0, metodo:'Yape', estado:'No participa' };
          state.participations.push(p);
        }
        return `<td><select class="cell-select" data-pid="${p.id}">
          ${ESTADOS_PARTICIPACION.map(s=>`<option ${p.estado===s?'selected':''}>${s}</option>`).join('')}
        </select></td>`;
      }).join('')}
    </tr>
  `).join('');
  saveState(state);

  tbody.querySelectorAll('.cell-select').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const p = state.participations.find(x=>x.id===sel.dataset.pid);
      const g = groupById(p.groupId);
      p.estado = sel.value;
      if(p.estado==='No participa'){ p.pago = 0; p.fecha=''; }
      else{ if(!p.fecha) p.fecha = todayISO(); if(!p.pago) p.pago = g.price; }
      saveState(state);
      pushActivity(`${userById(p.userId).name} → ${p.estado} en ${g.code}`, p.estado==='Confirmado'||p.estado==='Ganado' ? 'Pago' : 'Revisión');
      showToast('Actualizado');
    });
  });
}

/* ---------------- ESTADÍSTICAS ---------------- */
function renderEstadisticas(){
  const eff = globalEfectividad();
  const ingresosMes = totalIngresos();
  const semanal = state.participations.filter(p=>p.estado!=='No participa').length;
  const partsPorGrupo = state.groups.map(g=>({ g, n: groupParticipants(g.id).length }));
  const maxP = Math.max(1, ...partsPorGrupo.map(x=>x.n));

  viewWrap.innerHTML = `
    <div class="view-head">
      <div><h1>Estadísticas</h1><p>Rendimiento general del panel.</p></div>
    </div>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-top"><span class="stat-label">Estadística del mes</span></div>
        <div class="stat-value">${money(ingresosMes)}</div><div class="stat-foot">Ingresos</div></div>
      <div class="stat-card"><div class="stat-top"><span class="stat-label">Estadística semanal</span></div>
        <div class="stat-value">${semanal}</div><div class="stat-foot">Participaciones</div></div>
      <div class="stat-card"><div class="stat-top"><span class="stat-label">Mejor día</span></div>
        <div class="stat-value">Sábado</div><div class="stat-foot">Mayor ingreso</div></div>
      <div class="stat-card"><div class="stat-top"><span class="stat-label">Mejor mes</span></div>
        <div class="stat-value">Julio 2026</div><div class="stat-foot">${eff.pct}% efectividad</div></div>
    </div>

    <div class="panel-row">
      <div class="panel">
        <h3>Participaciones por grupo</h3>
        <p class="panel-sub">Comparación por código</p>
        <div class="chart-grid">
          ${partsPorGrupo.map(x=>`
            <div class="chart-col-card">
              <div class="chart-block" style="height:${Math.max(30,(x.n/maxP*120))}px;">${x.n}</div>
              <span class="chart-code">${x.g.code}</span>
            </div>`).join('')}
        </div>
      </div>
      <div class="panel">
        <h3>Indicadores</h3>
        <p class="panel-sub">Resumen automático</p>
        <div class="indicator-list">
          <div class="indicator-row"><div class="ind-ico">D</div>
            <div class="ind-body"><div class="ind-title">Mejor día</div><div class="ind-sub">Sábado — S/620</div></div>
            <span class="pill pill-Confirmado">Top</span></div>
          <div class="indicator-row"><div class="ind-ico">M</div>
            <div class="ind-body"><div class="ind-title">Mejor mes</div><div class="ind-sub">Julio 2026 — ${money(ingresosMes)}</div></div>
            <span class="pill pill-Pendiente">Mes</span></div>
          <div class="indicator-row"><div class="ind-ico">E</div>
            <div class="ind-body"><div class="ind-title">Efectividad</div><div class="ind-sub">${eff.ganados} ganados / ${eff.perdidos} perdidos</div></div>
            <span class="pill pill-Ganado">${eff.pct}%</span></div>
        </div>
      </div>
    </div>
  `;
}

/* ---------------- MODAL SYSTEM ---------------- */
const modalRoot = document.getElementById('modalRoot');
function openModal({title, body, footerButtons=[], wide=false}){
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div');
  modal.className = 'modal' + (wide ? ' modal-lg' : '');
  modal.innerHTML = `
    <div class="modal-head"><h2>${escapeHtml(title)}</h2>
      <button class="modal-close" aria-label="Cerrar"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    <div class="modal-body"></div>
    <div class="modal-foot"></div>
  `;
  modal.querySelector('.modal-body').appendChild(body);
  const foot = modal.querySelector('.modal-foot');
  function close(){
    backdrop.classList.remove('show');
    setTimeout(()=> backdrop.remove(), 150);
    document.removeEventListener('keydown', onKey);
  }
  footerButtons.forEach(b=>{
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.variant==='primary'?'btn-primary':b.variant==='danger'?'btn-danger':'btn-ghost');
    btn.textContent = b.label;
    btn.onclick = ()=> b.onClick(close);
    foot.appendChild(btn);
  });
  modal.querySelector('.modal-close').onclick = ()=>close();
  backdrop.addEventListener('click', (e)=>{ if(e.target===backdrop) close(); });
  function onKey(e){ if(e.key==='Escape') close(); }
  document.addEventListener('keydown', onKey);
  backdrop.appendChild(modal);
  modalRoot.appendChild(backdrop);
  requestAnimationFrame(()=> backdrop.classList.add('show'));
}

/* ---------------- TOAST ---------------- */
let toastTimer;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove('show'), 2200);
}

/* ---------------- NAV / SIDEBAR ---------------- */
document.querySelectorAll('.nav-item').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    go(a.dataset.view);
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('scrim').classList.remove('show');
  });
});
document.getElementById('menuToggle').addEventListener('click', ()=>{
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('scrim').classList.toggle('show');
});
document.getElementById('scrim').addEventListener('click', ()=>{
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('scrim').classList.remove('show');
});
document.getElementById('logoutBtn').addEventListener('click', ()=>{
  showToast('Sesión cerrada (demo)');
});
document.getElementById('globalSearch').addEventListener('input', (e)=>{
  const q = e.target.value.trim();
  if(!q) return;
  const u = state.users.find(u2=>u2.name.toLowerCase().includes(q.toLowerCase()) || u2.handle.toLowerCase().includes(q.toLowerCase()));
  if(u && view.name!=='usuario'){ /* just a hint, no auto-nav to avoid surprising input jumps */ }
});

/* ---------------- INIT ---------------- */
render();
