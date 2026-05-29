const API_URL = 'https://vieriworkflowapi-bte6cqekeyhrdqd9.mexicocentral-01.azurewebsites.net/api';// ✅ FIX 405: Apuntar al backend de Azure, no a GitHub Pages
const BASE_URL = API_URL.replace('/api', ''); // Para las imágenes
const IS_MOBILE = !!window.WORKFLOW_MOBILE;

function fmtSal(val) {
    if (val == null || val === '') return '0';
    const str = String(val).trim();
    const hasQ = /^Q/i.test(str);
    const hasD = /^\$/.test(str);
    const n = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (isNaN(n)) return str;
    const formatted = n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2);
    if (hasQ) return `Q ${formatted}`;
    if (hasD) return `$ ${formatted}`;
    return formatted;
}

function waLink(phone) {
    if (!phone) return null;
    const num = String(phone).replace(/\D/g, '');
    return num ? `https://wa.me/${num}` : null;
}

let currentUser = null;
window.notifCount = 0;

async function checkNotificaciones() {
    if (!currentUser || currentUser.rol !== 'usuario') return;
    try {
        const res = await fetch(`${API_URL}/mis-postulaciones`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) return;
        const apps = await res.json();
        const aceptadas = apps.filter(a => a.estado === 'aceptado');
        const seenKey = `wf_notif_seen_${currentUser.id}`;
        const seenIds = JSON.parse(localStorage.getItem(seenKey) || '[]');
        const unseen = aceptadas.filter(a => !seenIds.includes(a.id));
        window.notifCount = unseen.length;
        document.querySelectorAll('.notif-badge-postulaciones').forEach(el => {
            el.textContent = window.notifCount || '';
            el.style.display = window.notifCount > 0 ? 'flex' : 'none';
        });
    } catch(e) {}
}

function marcarNotificacionesVistas(ids) {
    if (!currentUser) return;
    const seenKey = `wf_notif_seen_${currentUser.id}`;
    const seenIds = JSON.parse(localStorage.getItem(seenKey) || '[]');
    localStorage.setItem(seenKey, JSON.stringify([...new Set([...seenIds, ...ids])]));
    window.notifCount = 0;
    document.querySelectorAll('.notif-badge-postulaciones').forEach(el => { el.style.display = 'none'; });
}

let isDragging = false;
let startX, startY;
let selectorX = 0, selectorY = 0, selectorSize = 0;
let currentImageFile = null;

// --- Funciones de Recorte de Imagen ---
function cambiarFoto(e) {
    const file = e.target.files[0];
    if (file) openCroppingModal(file);
}

function openCroppingModal(file) {
    currentImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('imageToCrop');
        img.src = e.target.result;
        document.getElementById('croppingModal').classList.add('active');
        setTimeout(() => {
            const minDim = Math.min(img.clientWidth, img.clientHeight);
            selectorSize = minDim * 0.85;
            selectorX = (img.clientWidth - selectorSize) / 2;
            selectorY = (img.clientHeight - selectorSize) / 2;
            updateSelectorUI();
        }, 150);
    };
    reader.readAsDataURL(file);
}

function initCropper() {
    const selector = document.getElementById('cropSelector');
    if (!selector) return;
    const startDrag = (clientX, clientY) => {
        isDragging = true;
        startX = clientX - selectorX;
        startY = clientY - selectorY;
    };
    selector.onmousedown = (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); };
    selector.ontouchstart = (e) => { startDrag(e.touches[0].clientX, e.touches[0].clientY); };
    const onMove = (clientX, clientY) => {
        if (!isDragging) return;
        const img = document.getElementById('imageToCrop');
        let x = clientX - startX;
        let y = clientY - startY;
        if (x < 0) x = 0; if (y < 0) y = 0;
        if (x + selectorSize > img.clientWidth) x = img.clientWidth - selectorSize;
        if (y + selectorSize > img.clientHeight) y = img.clientHeight - selectorSize;
        selectorX = x; selectorY = y;
        updateSelectorUI();
    };
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: false });
    window.addEventListener('mouseup', () => isDragging = false);
    window.addEventListener('touchend', () => isDragging = false);
}

function updateSelectorUI() {
    const selector = document.getElementById('cropSelector');
    if (selector) {
        selector.style.width = selectorSize + 'px';
        selector.style.height = selectorSize + 'px';
        selector.style.left = selectorX + 'px';
        selector.style.top = selectorY + 'px';
    }
}

function closeCroppingModal() {
    document.getElementById('croppingModal').classList.remove('active');
}

// Función para parsear de forma segura el CV
const getCVData = (user) => {
    if (!user || !user.cvInfo) return {};
    try {
        return typeof user.cvInfo === 'string' ? JSON.parse(user.cvInfo) : user.cvInfo;
    } catch (e) { return {}; }
};

function openCVModal() {
    const cv = getCVData(currentUser);
    const modal = document.createElement('div');
    modal.id = 'cvModal';
    modal.className = 'modal';
    document.body.style.overflow = 'hidden'; // Bloquea el scroll del body
    Object.assign(modal.style, { position: 'fixed', inset: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '10000', padding: '2px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' });
    Object.assign(modal.style, { position: 'fixed', inset: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '10000', padding: '2px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' });
    modal.innerHTML = `
        <div class="modal-content glass" style="margin:auto; max-width:520px; width:95%; max-height: 80vh; overflow-y: auto; overscroll-behavior: contain; padding:36px; border:1px solid rgba(58,148,255,0.18);">
            <div style="text-align:center;margin-bottom:28px;">
                <div style="width:64px;height:64px;background:rgba(10,132,255,0.12);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">
                    <i class="fas fa-id-card" style="color:#0a84ff;font-size:1.8rem;"></i>
                </div>
                <h2 style="font-weight:800;letter-spacing:-0.5px;font-size:1.5rem;margin-bottom:6px;">Mi Perfil Profesional</h2>
                <p style="color:rgba(255,255,255,0.65);font-size:0.88rem;">Destaque su talento ante las mejores empresas</p>
            </div>
            <form id="cvForm">
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;margin-left:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">¿A qué se dedica?</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-briefcase"></i>
                        <input name="profesion" placeholder="Ej: Desarrollador Web, Contador, Diseñador..." value="${currentUser.profesion || ''}" required>
                    </div>
                </div>
                <div style="margin-bottom:22px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;margin-left:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Sobre su experiencia</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-pen" style="top:22px;transform:none;"></i>
                        <textarea name="bio" placeholder="Resuma su trayectoria y logros principales..." rows="4" style="padding-left:48px;border-radius:20px;">${cv.bio || ''}</textarea>
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;margin-left:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Habilidades clave</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-tools"></i>
                        <input name="skills" placeholder="Ej: JavaScript, React, SQL, Inglés..." value="${cv.skills || ''}">
                    </div>
                </div>
                <div style="margin-bottom:16px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;margin-left:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Ubicación</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-map-marker-alt"></i>
                            <input name="ubicacion" placeholder="Ej: Ciudad / Región" value="${cv.ubicacion || currentUser.ubicacion || ''}">
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;margin-left:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Años de experiencia</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-star"></i>
                            <input name="experiencia" placeholder="Ej: 2 años, 5+ años..." value="${cv.experiencia || ''}">
                        </div>
                    </div>
                </div>
                <div style="margin-bottom:16px; display: grid; grid-template-columns: 100px 1fr; gap: 12px;">
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px; margin-left:16px;">Moneda</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-money-bill-wave" style="left:16px;"></i>
                            <select name="moneda" style="width:100%; padding:16px 10px 16px 38px; border-radius:50px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); color:#fff; cursor:pointer; font-size:0.85rem;">
                                <option value="Q" ${cv.moneda === 'Q' ? 'selected' : ''}>Q</option>
                                <option value="$" ${cv.moneda === '$' ? 'selected' : ''}>$</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px; margin-left:16px;">Salario mensual deseado</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-coins"></i>
                            <input name="salario" type="text" placeholder="Ej: 3500" value="${fmtSal(currentUser.salario_deseado)}" inputmode="decimal" required style="padding-left: 48px;">
                        </div>
                    </div>
                </div>
                <div style="margin-bottom:22px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;margin-left:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Redes sociales</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-link"></i>
                        <input name="link" placeholder="Ingrese link de redes sociales" value="${cv.link || ''}">
                    </div>
                </div>
                <div style="display:flex;gap:12px;">
                    <button type="button" onclick="closeCVModal()" class="btn-premium btn-ghost" style="flex:1;justify-content:center;padding:14px;">Cerrar</button>
                    <button type="submit" class="btn-premium" style="flex:2;justify-content:center;padding:14px;background:#0a84ff;color:#fff;">Publicar Perfil <i class="fas fa-rocket"></i></button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('cvForm').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            const res = await fetch(`${API_URL}/cv`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            if (!res.ok) throw new Error();
            notify("Éxito", "Su perfil profesional ha sido publicado en WorkFlow.");
            closeCVModal();
                currentUser = await cargarSesion(); // Sincroniza los datos del usuario localmente
                await render('dashboard'); // Re-renderiza el dashboard con el nuevo feed en tiempo real
        } catch (err) { notify("Error", "No se pudo actualizar el perfil.", "error"); }
    };
}

function closeCVModal() {
    const m = document.getElementById('cvModal');
    if (m) m.remove();
    document.body.style.overflow = 'auto';
}

async function cargarSesion() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        const res = await fetch(`${API_URL}/perfil`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        return await res.json();
    } catch {
        localStorage.removeItem('token');
        return null;
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    window.location.reload();
}

function notify(title, message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `glass toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
    const icon = type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-shield-alt' : 'fa-check-circle';
    const color = type === 'error' ? '#ff3b30' : type === 'warning' ? '#ff9f0a' : '#0a84ff';
    toast.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:12px;">
            <i class="fas ${icon}" style="color:${color};font-size:1.3rem;margin-top:2px;flex-shrink:0;"></i>
            <div>
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s, transform 0.5s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 500);
    }, 4500);
}

async function eliminarAnuncio(id) {
    if (!confirm('¿Seguro que quieres eliminar este anuncio?')) return;
    try {
        const res = await fetch(`${API_URL}/empleos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'No se pudo eliminar el anuncio');
        }
        notify('Eliminado', 'Tu anuncio se eliminó correctamente.');
        render('dashboard');
    } catch (err) {
        notify('Error', err.message || 'No se pudo eliminar el anuncio', 'error');
    }
}

async function eliminarPerfilPostulado() {
    if (!confirm('¿Seguro que quieres eliminar tu anuncio de perfil? Ya no aparecerás en el feed principal.')) return;
    const token = localStorage.getItem('token');
    if (!token) {
        notify('Error', 'No se encontró sesión activa. Vuelve a iniciar sesión.', 'error');
        logout();
        return;
    }

    try {
        let res = await fetch(`${API_URL}/cv`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 404 || res.status === 405) {
            res = await fetch(`${API_URL}/cv/delete`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
        const text = await res.text();
        let payload = null;
        try { payload = text ? JSON.parse(text) : null; } catch (e) { payload = null; }

        if (!res.ok) {
            const serverMessage = payload?.error || payload?.message || text || 'No se pudo eliminar el anuncio de perfil.';
            throw new Error(serverMessage);
        }

        notify('Eliminado', payload?.message || 'Tu anuncio de perfil ha sido retirado correctamente.');
        currentUser = await cargarSesion();

        if (currentUser) {
            const cvLocal = getCVData(currentUser);
            const updatedCv = { ...cvLocal, publicado: false };
            currentUser.cvInfo = typeof currentUser.cvInfo === 'string' ? JSON.stringify(updatedCv) : updatedCv;
        }

        if (window.feedItems) {
            window.feedItems = window.feedItems.filter(item => item.itemType !== 'candidate' || String(item.id) !== String(currentUser?.id));
        }

        document.querySelectorAll(`.profile-card[data-candidate-id="${currentUser?.id}"]`).forEach(node => node.remove());
        document.getElementById('candidateDetailsModal')?.remove();
        render('dashboard');
    } catch (err) {
        notify('Error', err.message || 'No se pudo eliminar el anuncio de perfil.', 'error');
    }
}

function openPublicarAnuncio() {
    const modal = document.createElement('div');
    modal.id = 'publicarAnuncioModal';
    modal.className = 'modal';
    document.body.style.overflow = 'hidden'; // Bloquea el scroll del body
    Object.assign(modal.style, { position: 'fixed', inset: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '10000', padding: '20px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' });
    modal.innerHTML = `
        <div class="modal-content glass" style="margin:auto; max-width:580px; width:95%; max-height: 80vh; overflow-y: auto; overscroll-behavior: contain; padding:32px; border:1px solid rgba(255,255,255,0.12);">
            <div style="text-align:center;margin-bottom:24px;">
                <h2 style="font-size:1.7rem;font-weight:800;margin-bottom:6px;color:#fff;">Publicar nuevo anuncio</h2>
                <p style="color:rgba(255,255,255,0.55);font-size:0.92rem;">Completa lo que ofreces y tu anuncio aparecerá en las tarjetas de postulaciones.</p>
            </div>
            <form id="publicarAnuncioForm">
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">¿Qué tipo de personal necesitas?</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-briefcase"></i>
                        <input name="titulo" placeholder="Ej: Cocinero, Auxiliar, Administrativo, Vendedor" required>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Ubicación</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-map-marker-alt"></i>
                            <input name="ubicacion" placeholder="Ej: Ciudad / Región" required>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Modalidad</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-user-clock"></i>
                            <select name="modalidad" required style="width:100%;padding:14px 18px 14px 48px;border-radius:22px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;">
                                <option value="Presencial" selected>Presencial</option>
                                <option value="Remoto">Remoto</option>
                                <option value="Híbrido">Híbrido</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 85px 1fr;gap:12px;margin-bottom:16px;">
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Duración</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-clock"></i>
                            <input name="duracion" placeholder="Ej: 3 meses, Permanente..." required>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Moneda</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-money-bill-wave" style="left:12px;font-size:0.85rem;"></i>
                            <select name="moneda" style="width:100%;padding:14px 8px 14px 34px;border-radius:22px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff;cursor:pointer;font-size:0.8rem;">
                                <option value="Q" selected>Q</option>
                                <option value="$">$</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Pago mensual</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-coins"></i>
                            <input name="salario_monto" type="text" placeholder="Ej: 3500" inputmode="decimal" required style="padding-left:48px;">
                        </div>
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Descripción del puesto</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-align-left" style="top:18px;transform:none;"></i>
                        <textarea name="descripcion" placeholder="Responsabilidades, horarios y detalles del puesto..." rows="3" style="padding-left:48px;border-radius:20px;min-height:90px;resize:vertical;" required></textarea>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px;">
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Requisitos clave</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-check-circle" style="top:18px;transform:none;"></i>
                            <textarea name="requisitos" placeholder="Lista breve de requisitos..." rows="3" style="padding-left:48px;border-radius:20px;min-height:90px;resize:vertical;"></textarea>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Lo que ofrecemos</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-gift" style="top:18px;transform:none;"></i>
                            <textarea name="beneficios" placeholder="Beneficios y extras..." rows="3" style="padding-left:48px;border-radius:20px;min-height:90px;resize:vertical;"></textarea>
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end;">
                    <button type="button" onclick="closePublicarAnuncioModal()" class="btn-premium btn-ghost" style="padding:14px 22px;">Cancelar</button>
                    <button type="submit" class="btn-premium" style="padding:14px 22px;background:#0a84ff;">Publicar anuncio</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('publicarAnuncioForm').onsubmit = publicarAnuncio;
}

function closePublicarAnuncioModal() {
    const modal = document.getElementById('publicarAnuncioModal');
    if (modal) modal.remove();
    document.body.style.overflow = 'auto';
}

async function publicarAnuncio(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rawData = Object.fromEntries(formData.entries());
    const data = { ...rawData };
    // Combinar moneda y monto para guardar como string formateado
    data.salario = `${rawData.moneda} ${rawData.salario_monto}`;
    delete data.moneda;
    delete data.salario_monto;

    try {
        const res = await fetch(`${API_URL}/empleos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'No se pudo publicar el anuncio');
        }
        notify('Publicado', 'Tu anuncio fue publicado y aparecerá en las tarjetas de postulaciones.');
        closePublicarAnuncioModal();
        render('dashboard');
    } catch (err) {
        notify('Error', err.message || 'No se pudo publicar el anuncio', 'error');
    }
}

function getJobStatus(id) {
    const item = window.feedItems?.find(j => j.id === id && j.itemType === 'job');
    if (!item) return 'disponible';
    return (item.disponible === false || item.disponible === 0) ? 'no_disponible' : 'disponible';
}

function setJobStatus(id, status) {
    const item = window.feedItems?.find(j => j.id === id && j.itemType === 'job');
    if (item) item.disponible = (status === 'disponible');
}

async function toggleJobStatus(id) {
    const item = window.feedItems?.find(j => j.id === id && j.itemType === 'job');
    if (!item) return;
    item.disponible = !item.disponible;
    render('dashboard');
    try {
        await fetch(`${API_URL}/empleos/${id}/status`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
    } catch(e) {}
}

function getCandidateStatus(id) {
    const item = window.feedItems?.find(c => c.id === id && c.itemType === 'candidate');
    if (!item) return 'disponible';
    return (item.disponible === false || item.disponible === 0) ? 'no_disponible' : 'disponible';
}

function setCandidateStatus(id, status) {
    const item = window.feedItems?.find(c => c.id === id && c.itemType === 'candidate');
    if (item) item.disponible = (status === 'disponible');
}

async function toggleCandidateStatus(id) {
    const item = window.feedItems?.find(c => c.id === id && c.itemType === 'candidate');
    if (!item) return;
    item.disponible = !item.disponible;
    render('dashboard');
    try {
        await fetch(`${API_URL}/cv/status`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
    } catch(e) {}
}

function openJobDetails(id) {
    const item = window.feedItems?.find(job => job.id === id && job.itemType === 'job');
    if (!item) return;
    const hasEmpFoto = item.empresa_foto && item.empresa_foto !== 'default.jpg';
    const empresaFoto = (item.empresa_foto && item.empresa_foto.startsWith('http')) ? item.empresa_foto : `${BASE_URL}/uploads/` + (item.empresa_foto || 'default.jpg');
    const ubicacion = item.ubicacion || 'No especificada';
    const modalidad = item.modalidad ? item.modalidad.charAt(0).toUpperCase() + item.modalidad.slice(1) : 'Presencial';
    const duracion = item.duracion || '';
    const contrato = item.contrato || '';
    const requisitos = item.requisitos || item.requisitos_clave || '';
    const beneficios = item.beneficios || item.lo_que_ofrecemos || '';
    const closeAction = () => { document.getElementById('jobDetailsModal')?.remove(); document.body.style.overflow = 'auto'; };
    window.closeJobDetailsModal = closeAction;

    const modal = document.createElement('div');
    modal.id = 'jobDetailsModal';
    modal.className = 'modal';
    modal.style.alignItems = IS_MOBILE ? 'flex-end' : 'center';
    document.body.style.overflow = 'hidden';
    const isDisponible = getJobStatus(item.id) === 'disponible';
    modal.innerHTML = `
        <div class="glass" style="margin:auto; width:min(760px,95%); max-height:${IS_MOBILE ? '92vh' : '80vh'}; overflow-y:auto; overscroll-behavior:contain; border:1.5px solid rgba(10,132,255,0.3); box-shadow:0 25px 80px rgba(0,0,0,0.8); border-radius:${IS_MOBILE ? '28px 28px 0 0' : '28px'};">
            <div style="display:flex;flex-wrap:wrap;min-height:500px;">

                <!-- Columna Izquierda -->
                <div style="flex:1;min-width:280px;padding:40px 30px;background:rgba(255,255,255,0.015);border-right:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;">
                    <button onclick="closeJobDetailsModal()" style="position:absolute;top:20px;left:20px;background:rgba(255,255,255,0.05);border:none;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;">×</button>

                    <div style="margin-bottom:24px;">
                        ${hasEmpFoto
                            ? `<img src="${empresaFoto}" style="width:130px;height:130px;border-radius:26px;object-fit:cover;border:4px solid rgba(10,132,255,0.25);box-shadow:0 0 30px rgba(10,132,255,0.1);">`
                            : `<div style="width:130px;height:130px;border-radius:26px;display:flex;align-items:center;justify-content:center;background:rgba(10,132,255,0.08);color:#0a84ff;font-size:3.5rem;border:4px solid rgba(10,132,255,0.25);box-shadow:0 0 30px rgba(10,132,255,0.1);"><i class="fas fa-building"></i></div>`
                        }
                    </div>

                    <h2 style="font-size:1.8rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px 0;">${item.empresa_nombre || 'Empresa'}</h2>
                    <div style="font-size:0.95rem;color:#0a84ff;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:24px;">${item.titulo || 'Oferta'}</div>

                    <div style="width:100%;display:flex;flex-direction:column;gap:10px;margin-bottom:30px;">
                        <div style="background:rgba(255,255,255,0.04);padding:10px 15px;border-radius:12px;font-size:0.85rem;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-circle" style="font-size:0.5rem;color:${isDisponible ? '#30d158' : '#ff6b63'};"></i>
                            <span style="text-align:left;">Estado: <strong style="color:${isDisponible ? '#30d158' : '#ff6b63'};">${isDisponible ? 'Disponible' : 'No disponible'}</strong></span>
                        </div>
                        <div style="background:rgba(255,255,255,0.04);padding:10px 15px;border-radius:12px;font-size:0.85rem;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-map-marker-alt" style="color:#0a84ff;"></i>
                            <span style="text-align:left;">Ubicación: <strong>${ubicacion}</strong></span>
                        </div>
                        <div style="background:rgba(255,255,255,0.04);padding:10px 15px;border-radius:12px;font-size:0.85rem;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-laptop-house" style="color:#0a84ff;"></i>
                            <span style="text-align:left;">Modalidad: <strong>${modalidad}</strong></span>
                        </div>
                        ${duracion ? `<div style="background:rgba(255,255,255,0.04);padding:10px 15px;border-radius:12px;font-size:0.85rem;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-clock" style="color:#0a84ff;"></i>
                            <span style="text-align:left;">Duración: <strong>${duracion}</strong></span>
                        </div>` : ''}
                    </div>

                    <button onclick="closeJobDetailsModal()" class="btn-premium btn-ghost" style="width:100%;padding:16px;font-size:0.85rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;justify-content:center;">Cerrar</button>
                </div>

                <!-- Columna Derecha -->
                <div style="flex:1.5;min-width:300px;padding:40px 35px;">
                    <div style="margin-bottom:30px;">
                        <div style="font-size:0.75rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:10px;">Salario Ofrecido <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,0.1),transparent);"></div></div>
                        <div style="font-size:2.4rem;font-weight:900;color:#fff;text-shadow:0 0 20px rgba(255,255,255,0.1);">${fmtSal(item.salario)}</div>
                    </div>

                    ${item.descripcion ? `
                    <div style="margin-bottom:30px;">
                        <div style="font-size:0.75rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:10px;">Descripción del Puesto <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,0.1),transparent);"></div></div>
                        <div style="color:rgba(255,255,255,0.8);line-height:1.8;font-size:0.95rem;background:rgba(0,0,0,0.15);padding:20px;border-radius:15px;border:1px solid rgba(255,255,255,0.03);white-space:pre-line;">${item.descripcion}</div>
                    </div>` : ''}

                    ${(requisitos || beneficios) ? `
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:20px;margin-bottom:30px;">
                        ${requisitos ? `<div>
                            <div style="font-size:0.75rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:8px;">Requisitos <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,0.1),transparent);"></div></div>
                            <div style="color:rgba(255,255,255,0.75);font-size:0.88rem;line-height:1.75;white-space:pre-line;">${requisitos}</div>
                        </div>` : ''}
                        ${beneficios ? `<div>
                            <div style="font-size:0.75rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:8px;">Lo que Ofrecemos <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,0.1),transparent);"></div></div>
                            <div style="color:rgba(255,255,255,0.75);font-size:0.88rem;line-height:1.75;white-space:pre-line;">${beneficios}</div>
                        </div>` : ''}
                    </div>` : ''}

                    <div style="display:flex;flex-direction:column;gap:10px;">
                        <button onclick="postularAEmpleo(${item.id})" style="width:100%;padding:16px;border-radius:16px;background:linear-gradient(135deg,#0a84ff,#0056b3);box-shadow:0 8px 22px rgba(10,132,255,0.35);color:#fff;font-weight:800;font-size:0.9rem;border:none;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;gap:8px;letter-spacing:0.3px;transition:0.2s;text-transform:uppercase;">
                            <i class="fas fa-paper-plane"></i> Postularme ahora
                        </button>
                        <div style="font-size:0.68rem;color:rgba(255,255,255,0.2);font-family:monospace;font-weight:600;letter-spacing:0.5px;text-align:center;">REF: JOB-${item.id}VTRX</div>
                    </div>
                </div>

            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function cambiarEstadoPostulante(postulacion_id, nombre, estado, btn) {
    const wrap = btn.closest('[data-acciones]');
    if (wrap) wrap.innerHTML = '<div style="text-align:center;padding:14px;color:rgba(255,255,255,0.4);font-size:0.82rem;"><i class="fas fa-spinner fa-spin" style="margin-right:7px;"></i>Actualizando...</div>';
    try {
        const r = await fetch(`${API_URL}/postulaciones/${postulacion_id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ estado })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) { notify('Error', data.error || `Error ${r.status}`, 'error'); render('misPostulacionesEmpresa'); return; }
        if (estado === 'aceptado') notify('¡Aceptado!', `${nombre} fue aceptado exitosamente.`);
        else notify('Rechazado', `Postulación de ${nombre} rechazada.`, 'error');
        render('misPostulacionesEmpresa');
    } catch(e) {
        notify('Error', 'No se pudo conectar con el servidor.', 'error');
        render('misPostulacionesEmpresa');
    }
}

async function abrirPerfilPostulante(id) {
    try {
        const numId = Number(id);
        let pData = window.postulantesCache?.[numId] || window.postulantesCache?.[id] || null;

        const res = await fetch(`${API_URL}/candidatos`);
        if (res.ok) {
            const candidatos = await res.json();
            const found = candidatos.find(c => Number(c.id) === numId);
            if (found) pData = { ...pData, ...found };
        }

        if (!pData) { notify('Error', 'No se pudo cargar el perfil del candidato.', 'error'); return; }

        let cv = {};
        try { cv = typeof pData.cvInfo === 'string' ? JSON.parse(pData.cvInfo) : (pData.cvInfo || {}); } catch(e) {}
        const item = {
            id: pData.id, nombre: pData.nombre, profesion: pData.profesion,
            cvInfo: pData.cvInfo, salario_deseado: pData.salario_deseado,
            foto_perfil: pData.foto_perfil, itemType: 'candidate',
            disponible: cv.disponible !== false
        };
        if (!window.feedItems) window.feedItems = [];
        const idx = window.feedItems.findIndex(f => f.id === item.id && f.itemType === 'candidate');
        if (idx >= 0) window.feedItems[idx] = item; else window.feedItems.push(item);
        openCandidateDetails(item.id);
    } catch(e) {
        notify('Error', 'No se pudo cargar el perfil del candidato.', 'error');
    }
}

function openCandidateDetails(id) {
    const item = window.feedItems?.find(c => c.id === id && c.itemType === 'candidate');
    if (!item) return;
    const cv = getCVData(item);
    const hasCFoto = item.foto_perfil && item.foto_perfil !== 'default.jpg';
    const cFoto = (item.foto_perfil && item.foto_perfil.startsWith('http')) ? item.foto_perfil : `${BASE_URL}/uploads/` + (item.foto_perfil || 'default.jpg');

    const closeAction = () => { document.getElementById('candidateDetailsModal')?.remove(); document.body.style.overflow = 'auto'; };
    window.closeCandidateDetailsModal = closeAction;

    closeAction();
    const modal = document.createElement('div');
    modal.id = 'candidateDetailsModal';
    modal.className = 'modal';
    modal.style.alignItems = IS_MOBILE ? 'flex-end' : 'center';
    document.body.style.overflow = 'hidden';
    modal.innerHTML = `
        <div class="glass" style="margin:auto; width:min(760px,95%); max-height: ${IS_MOBILE ? '92vh' : '80vh'}; overflow-y: auto; overscroll-behavior: contain; border:1.5px solid rgba(255,215,0,0.3); box-shadow: 0 25px 80px rgba(0,0,0,0.8); border-radius: ${IS_MOBILE ? '28px 28px 0 0' : '28px'};">
            <div style="display:flex;flex-wrap:wrap;min-height:500px;">
                <!-- Columna Izquierda -->
                <div style="flex:1;min-width:300px;padding:40px 30px;background:rgba(255,255,255,0.015);border-right:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;">
                    <button onclick="closeCandidateDetailsModal()" class="candidate-modal-close" style="position:absolute;top:20px;left:20px;background:rgba(255,255,255,0.05);border:none;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;">×</button>
                    
                    <div style="margin-bottom:24px;position:relative;">
                        ${hasCFoto 
                            ? `<img src="${cFoto}" alt="Perfil" style="width:130px;height:130px;border-radius:50%;object-fit:cover;border:4px solid rgba(255,215,0,0.25);box-shadow: 0 0 30px rgba(255,215,0,0.1);">`
                            : `<div style="width:130px;height:130px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);color:var(--gold);font-size:3.5rem;border:4px solid rgba(255,215,0,0.25);box-shadow: 0 0 30px rgba(255,215,0,0.1);"><i class="fas fa-user"></i></div>`
                        }
                    </div>
                    
                    <h2 style="font-size:1.8rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px 0;">${item.nombre || 'Candidato'}</h2>
                    <div style="font-size:0.95rem;color:var(--gold);font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:24px;">${item.profesion || 'Profesional'}</div>
                    
                    <div style="width:100%;display:flex;flex-direction:column;gap:10px;margin-bottom:30px;">
                        <div style="background:rgba(255,255,255,0.04);padding:10px 15px;border-radius:12px;font-size:0.85rem;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-signal" style="color:${getCandidateStatus(item.id) === 'disponible' ? '#0a84ff' : '#ff6b63'};"></i>
                            <span style="text-align:left;">Estado: <strong>${getCandidateStatus(item.id) === 'disponible' ? 'Disponible' : 'No disponible'}</strong></span>
                        </div>
                        <div style="background:rgba(255,255,255,0.04);padding:10px 15px;border-radius:12px;font-size:0.85rem;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-map-marker-alt" style="color:var(--gold);"></i>
                            <span style="text-align:left;">Ubicación: <strong>${cv.ubicacion || 'No especificada'}</strong></span>
                        </div>
                        ${cv.experiencia ? `<div style="background:rgba(255,255,255,0.04);padding:10px 15px;border-radius:12px;font-size:0.85rem;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-star" style="color:var(--gold);"></i>
                            <span style="text-align:left;">Exp: <strong>${cv.experiencia}</strong></span>
                        </div>` : ''}
                        ${cv.edad ? `
                        <div style="background:rgba(255,255,255,0.04);padding:10px 15px;border-radius:12px;font-size:0.85rem;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-birthday-cake" style="color:var(--gold);"></i>
                            <span style="text-align:left;">Edad: <strong>${cv.edad} años</strong></span>
                        </div>` : ''}
                    </div>

                    <button onclick="closeCandidateDetailsModal()" class="btn-premium btn-ghost" style="width:100%;padding:16px;font-size:0.85rem;font-weight:800;text-transform:uppercase;letter-spacing:2px; justify-content:center;">Cerrar Perfil</button>
                </div>

                <!-- Columna Derecha -->
                <div style="flex:1.5;min-width:320px;padding:40px 35px;">
                    <div style="margin-bottom:30px;">
                        <div style="font-size:0.75rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:10px;">Salario esperado <div style="flex:1;height:1px;background:linear-gradient(90deg, rgba(255,255,255,0.1), transparent);"></div></div>
                        <div style="font-size:2.4rem;font-weight:900;color:#fff;text-shadow: 0 0 20px rgba(255,255,255,0.1);">${cv.moneda || 'Q'} ${fmtSal(item.salario_deseado)}</div>
                    </div>

                    <div style="margin-bottom:30px;">
                        <div style="font-size:0.75rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:10px;">Biografía profesional <div style="flex:1;height:1px;background:linear-gradient(90deg, rgba(255,255,255,0.1), transparent);"></div></div>
                        <div style="color:rgba(255,255,255,0.8);line-height:1.8;font-size:0.95rem;background:rgba(0,0,0,0.15);padding:20px;border-radius:15px;border:1px solid rgba(255,255,255,0.03);">${cv.bio || 'Sin descripción disponible.'}</div>
                    </div>

                    <div style="margin-bottom:30px;">
                        <div style="font-size:0.75rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:10px;">Habilidades & Stack <div style="flex:1;height:1px;background:linear-gradient(90deg, rgba(255,255,255,0.1), transparent);"></div></div>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;">
                            ${(cv.skills || '').split(',').map(s => s.trim()).filter(s => s).map(skill => `
                                <span style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);color:var(--gold);padding:6px 14px;border-radius:8px;font-size:0.8rem;font-weight:700;">${skill}</span>
                            `).join('') || '<span style="color:rgba(255,255,255,0.4);">Sin habilidades listadas</span>'}
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:15px;">
                        <div>
                            <div style="font-size:0.7rem;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px;">Modalidad</div>
                            <div style="color:#fff;font-weight:700;"><i class="fas fa-laptop-house" style="color:var(--gold);margin-right:8px;"></i>${cv.modalidad || 'Remoto'}</div>
                        </div>
                        ${cv.link ? `<div>
                            <div style="font-size:0.7rem;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px;">Redes sociales</div>
                            <a href="${cv.link.startsWith('http') ? cv.link : 'https://' + cv.link}" target="_blank" style="color:var(--gold);font-weight:700;text-decoration:none;word-break:break-all;"><i class="fas fa-external-link-alt" style="margin-right:8px;"></i>Ver enlace</a>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function registrarUsuario(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    let data = Object.fromEntries(formData.entries());

    if (data.password !== data.confirm_password) { 
        notify("Error", "Las contraseñas no coinciden", "error"); 
        return; 
    }

    // Validación de mayoría de edad (Checkbox)
    if (!data.terminos) {
        notify("Aviso", "Debes confirmar que eres mayor de edad para registrarte.", "warning");
        return;
    }

    // Generar un nombre de usuario automático basado en el correo para la base de datos
    if (!data.usuario && data.correo) {
        const baseUser = data.correo.split('@')[0];
        data.usuario = baseUser + Math.floor(Math.random() * 10000);
    }

    try {
        // ✅ FIX: Usar API_URL directamente (ya apunta a Azure)
        const res = await fetch(`${API_URL}/registro`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data) 
        });
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const errorText = await res.text();
            console.error("Respuesta no-JSON de Azure:", errorText);
            throw new Error(`Error del Servidor (${res.status}). Revisa los logs de Azure App Service.`);
        }

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Datos de registro inválidos");

        localStorage.setItem('token', result.token);
        notify("¡Éxito!", "Cuenta creada correctamente. Cargando...");
        setTimeout(() => window.location.reload(), 1500);
    } catch (err) { 
        notify("Error de Conexión", err.message, "error"); 
    }
}

async function loginUsuario(e) {
    e.preventDefault();
    try {
        // ✅ FIX: Usar API_URL directamente (ya apunta a Azure)
        const res = await fetch(`${API_URL}/login`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ correo: e.target.correo.value, password: e.target.password.value }) 
        });
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const errorText = await res.text();
            throw new Error(`Error de Conexión (${res.status}). El servidor de Azure no respondió correctamente.`);
        }

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Credenciales incorrectas");

        localStorage.setItem('token', result.token);
        window.location.reload();
    } catch (err) { 
        notify("Error", err.message, "error"); 
    }
}

function mobileBottomNav(active) {
    const isEmpresa = currentUser && currentUser.rol === 'empresa';
    const items = [
        { id: 'dashboard', icon: 'fa-home', label: 'Inicio', action: "render('dashboard')" },
        isEmpresa
            ? { id: 'postulaciones', icon: 'fa-inbox', label: 'Solicitudes', action: "render('misPostulacionesEmpresa')" }
            : { id: 'postulaciones', icon: 'fa-file-alt', label: 'Solicitudes', action: "render('misPostulaciones')" },
        { id: 'perfil', icon: 'fa-user', label: 'Perfil', action: "render('perfil')" },
        { id: 'soporte', icon: 'fa-headset', label: 'Ayuda', action: "render('soporte')" }
    ];
    return `
    <nav style="position:sticky;top:56px;left:0;right:0;background:rgba(7,7,15,0.97);backdrop-filter:blur(30px);border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-around;align-items:center;padding:7px 0;z-index:99;">
        ${items.map(it => `
        <button onclick="${it.action}" style="background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 12px;border-radius:12px;transition:0.2s;position:relative;${active === it.id ? 'color:#0a84ff;' : 'color:rgba(255,255,255,0.4);'}">
            <i class="fas ${it.icon}" style="font-size:1.15rem;"></i>
            ${it.id === 'postulaciones' && !isEmpresa ? `<span class="notif-badge-postulaciones" style="position:absolute;top:0;right:6px;background:#ff3b30;color:#fff;border-radius:50%;min-width:16px;height:16px;font-size:0.58rem;font-weight:800;display:${window.notifCount > 0 ? 'flex' : 'none'};align-items:center;justify-content:center;border:2px solid #07070f;padding:0 2px;line-height:1;">${window.notifCount || ''}</span>` : ''}
            <span style="font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">${it.label}</span>
        </button>
        `).join('')}
        <button onclick="logout()" style="background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 12px;border-radius:12px;color:rgba(255,99,99,0.65);">
            <i class="fas fa-sign-out-alt" style="font-size:1.15rem;"></i>
            <span style="font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Salir</span>
        </button>
    </nav>`;
}

async function render(view) {
    const app = document.getElementById('app');
    if(!app) return;
    const token = localStorage.getItem('token');

    // ── LOGIN ──
    if(view === 'login') {
        app.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;padding:24px;">
                <div class="glass responsive-card" style="padding:54px 48px;width:460px;max-width:100%;text-align:center;border:1.5px solid rgba(10,132,255,0.25);box-shadow: 0 30px 80px rgba(0,0,0,0.6), inset 0 0 10px rgba(10,132,255,0.05);">
                    <div style="margin-bottom:42px;">
                        <div style="width:88px;height:88px;background:linear-gradient(135deg, rgba(10,132,255,0.2), rgba(0,210,255,0.05));border:1.5px solid rgba(10,132,255,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 22px;box-shadow: 0 0 40px rgba(10,132,255,0.2);">
                            <i class="fas fa-bolt" style="font-size:2.6rem;color:#0a84ff;filter: drop-shadow(0 0 12px rgba(10,132,255,0.7));"></i>
                        </div>
                        <h1 class="logo" style="font-size:2.6rem;font-weight:900;letter-spacing:-1.5px;margin-bottom:8px;color:#fff;text-shadow: 0 0 10px rgba(10,132,255,0.15);">WorkFlow</h1>
                        <p style="color:rgba(255,255,255,0.55);font-size:0.98rem;font-weight:500;letter-spacing:0.3px;">Accede a tu red profesional global</p>
                    </div>
                    <form id="loginForm">
                        <div style="margin-bottom:20px;"><div class="input-group" style="margin:0;"><input type="email" name="correo" placeholder="Correo electrónico" required style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); color:#fff; padding:16px 18px;"></div></div>
                        <div style="margin-bottom:32px;"><div class="input-group" style="margin:0;"><input type="password" name="password" placeholder="Contraseña" required style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); color:#fff; padding:16px 18px;"></div></div>
                        <button type="submit" class="btn-premium" style="width:100%;padding:18px;justify-content:center;font-size:1rem;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;background:linear-gradient(135deg, #0a84ff, #0070e0);border:none;box-shadow: 0 15px 35px rgba(10,132,255,0.3);">
                            Ingresar ahora <i class="fas fa-arrow-right" style="margin-left:10px;"></i>
                        </button>
                    </form>
                    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);margin:36px 0;"></div>
                    <p style="color:rgba(255,255,255,0.4);font-size:0.92rem;">¿Aún no tienes cuenta? <a href="#" onclick="render('registro');return false;" style="font-weight:700;color:#0a84ff;text-decoration:none;">Crea una gratis hoy →</a></p>
                </div>
            </div>
        `;
        document.getElementById('loginForm').onsubmit = loginUsuario;

    // ── REGISTRO ──
    } else if (view === 'registro') {
        app.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;padding:24px;">
                <div class="glass responsive-card" style="padding:50px 48px;width:560px;max-width:100%;">
                    <div style="text-align:center;margin-bottom:40px;">
                        <div style="width:72px;height:72px;background:rgba(10,132,255,0.12);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
                            <i class="fas fa-user-plus" style="font-size:2rem;color:#0a84ff;"></i>
                        </div>
                        <h2 style="font-weight:900;letter-spacing:-0.5px;font-size:1.8rem;margin-bottom:8px;color:#fff;">Únete a WorkFlow</h2>
                        <p style="color:rgba(255,255,255,0.45);font-size:0.95rem;">Conecta con miles de oportunidades laborales</p>
                    </div>
                    <form id="registroForm">
                        <div style="margin-bottom:20px;"><div class="input-group" style="margin:0;"><input name="nombre" placeholder="Nombre completo" required style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); color:#fff; padding:16px 18px;"></div></div>
                        <div style="margin-bottom:20px;"><div class="input-group" style="margin:0;"><input name="correo" type="email" placeholder="Correo electrónico" required style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); color:#fff; padding:16px 18px;"></div></div>
                        <div style="margin-bottom:20px;"><div class="input-group" style="margin:0;"><input name="password" type="password" placeholder="Contraseña" required style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); color:#fff; padding:16px 18px;"></div></div>
                        <div style="margin-bottom:24px;"><div class="input-group" style="margin:0;"><input name="confirm_password" type="password" placeholder="Confirmar contraseña" required style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); color:#fff; padding:16px 18px;"></div></div>
                        
                        <div style="margin-bottom:28px; display: flex; align-items: flex-start; gap: 12px; padding: 0 10px;">
                            <input type="checkbox" id="terminos" name="terminos" required style="width: 20px; height: 20px; cursor: pointer; accent-color: #0a84ff; margin-top:2px; flex-shrink:0;">
                            <label for="terminos" style="font-size: 0.88rem; color: rgba(255,255,255,0.6); cursor: pointer; line-height:1.4;">Soy <strong>mayor de edad (18+)</strong> y acepto los términos. Los menores no pueden registrarse.</label>
                        </div>

                        <div style="margin-bottom:32px;">
                            <label style="display:block; font-size:0.72rem; color:#0a84ff; text-transform:uppercase; letter-spacing:1.2px; font-weight:700; margin-bottom:12px; margin-left:14px;">¿Cómo quieres usar la plataforma?</label>
                            <div class="input-group" style="margin:0;">
                                <select name="rol" required style="width:100%;padding:15px 18px;border-radius:22px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff; cursor:pointer;">
                                    <option value="usuario">💼 Trabajador / Postulante</option>
                                    <option value="empresa">🏢 Empresa / Reclutador</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" class="btn-premium" style="width:100%;padding:18px;justify-content:center;font-size:1rem; font-weight:800; text-transform:uppercase; letter-spacing:1px; background:linear-gradient(135deg, #0a84ff, #0070e0); border:none; box-shadow: 0 15px 35px rgba(10,132,255,0.3); color: #fff;">
                            Crear cuenta <i class="fas fa-check-circle" style="margin-left:8px;"></i>
                        </button>
                    </form>
                    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);margin:32px 0;"></div>
                    <p style="text-align:center;color:rgba(255,255,255,0.45);font-size:0.9rem;"><a href="#" onclick="render('login');return false;" style="font-weight:600; color:#0a84ff; text-decoration:none;">← Ya tengo una cuenta</a></p>
                </div>
            </div>
        `;
        document.getElementById('registroForm').onsubmit = registrarUsuario;

    // ── DASHBOARD ──
    } else if (view === 'dashboard') {
        if (!currentUser) { render('login'); return; }
        
        let feedItems = [];
        try { 
            const [rJobs, rCands] = await Promise.all([
                fetch(`${API_URL}/empleos`).then(r => r.ok ? r.json() : []),
                fetch(`${API_URL}/candidatos`).then(r => r.ok ? r.json() : [])
            ]);
            const jobs = rJobs;
            const candidates = rCands;
            
            // Mezclamos empleos y talentos, priorizando los anuncios del dueño al principio
            feedItems = [
                ...jobs.map(j => ({...j, itemType: 'job'})),
                ...candidates.map(c => ({...c, itemType: 'candidate'}))
            ].sort((a, b) => {
                const aIsOwner = currentUser && (
                    (a.itemType === 'job' && String(a.empresa_id) === String(currentUser.id)) ||
                    (a.itemType === 'candidate' && String(a.id) === String(currentUser.id))
                );
                const bIsOwner = currentUser && (
                    (b.itemType === 'job' && String(b.empresa_id) === String(currentUser.id)) ||
                    (b.itemType === 'candidate' && String(b.id) === String(currentUser.id))
                );
                if (aIsOwner && !bIsOwner) return -1;
                if (!aIsOwner && bIsOwner) return 1;
                return (b.id || 0) - (a.id || 0);
            });
        } catch(e){}

        if (feedItems.length === 0) {
            feedItems = [{id: 0, titulo: "Bienvenido a WorkFlow", empresa_nombre: "WorkFlow Corp", ubicacion: "Remoto", salario: "2500", itemType: 'job'}];
        }
        window.feedItems = feedItems;

        const hasNavFoto = currentUser.foto_perfil && currentUser.foto_perfil !== 'default.jpg';
        const fotoUrl = (currentUser.foto_perfil && currentUser.foto_perfil.startsWith('http')) 
            ? currentUser.foto_perfil 
            : `${BASE_URL}/uploads/` + (currentUser.foto_perfil || 'default.jpg');
        const rolLabel = currentUser.rol === 'usuario' ? 'Postulante' : 'Empresa';

        app.innerHTML = `
            ${IS_MOBILE ? `
            <nav class="navbar" style="padding:10px 18px;justify-content:space-between;">
                <div class="logo" style="font-size:1.3rem;">WorkFlow <i class="fas fa-bolt" style="color:#0a84ff;font-size:1rem;"></i></div>
                <div style="display:flex;align-items:center;gap:8px;">
                    ${hasNavFoto
                        ? `<img src="${fotoUrl}" class="avatar" style="width:34px;height:34px;object-fit:cover;">`
                        : `<div class="avatar" style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.1);color:var(--blue);font-size:0.85rem;border:2px solid var(--blue);"><i class="fas ${currentUser.rol === 'empresa' ? 'fa-building' : 'fa-user'}"></i></div>`
                    }
                    <div style="line-height:1.2;">
                        <div style="font-size:0.82rem;font-weight:600;">${currentUser.nombre}</div>
                        <div style="font-size:0.68rem;color:rgba(255,255,255,0.45);">${rolLabel}</div>
                    </div>
                </div>
            </nav>
            ` : `
            <nav class="navbar">
                <div class="logo">WorkFlow <i class="fas fa-bolt" style="color:#0a84ff;font-size:1.2rem;"></i></div>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:50px;padding:6px 14px 6px 6px;">
                        ${hasNavFoto
                            ? `<img src="${fotoUrl}" class="avatar" style="width:36px;height:36px;object-fit:cover;">`
                            : `<div class="avatar" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.1);color:var(--blue);font-size:0.9rem;border:2px solid var(--blue);"><i class="fas ${currentUser.rol === 'empresa' ? 'fa-building' : 'fa-user'}"></i></div>`
                        }
                        <div style="line-height:1.2;">
                            <div style="font-size:0.85rem;font-weight:600;">${currentUser.nombre}</div>
                            <div style="font-size:0.72rem;color:rgba(255,255,255,0.45);">${rolLabel}</div>
                        </div>
                    </div>
                    <button onclick="render('perfil')" class="btn-premium btn-ghost" style="padding:8px 16px;font-size:0.82rem;"><i class="fas fa-user"></i> Perfil</button>
                    ${currentUser.rol === 'usuario' ? `<button onclick="render('misPostulaciones')" class="btn-premium btn-ghost" style="padding:8px 16px;font-size:0.82rem;position:relative;"><i class="fas fa-file-alt"></i> Postulaciones<span class="notif-badge-postulaciones" style="position:absolute;top:-6px;right:-6px;background:#ff3b30;color:#fff;border-radius:50%;min-width:18px;height:18px;font-size:0.6rem;font-weight:800;display:${window.notifCount > 0 ? 'flex' : 'none'};align-items:center;justify-content:center;border:2px solid #07070f;padding:0 3px;line-height:1;">${window.notifCount || ''}</span></button>` : ''}
                    ${currentUser.rol === 'empresa' ? `<button onclick="render('misPostulacionesEmpresa')" class="btn-premium btn-ghost" style="padding:8px 16px;font-size:0.82rem;"><i class="fas fa-inbox"></i> Postulaciones</button>` : ''}
                    <button onclick="render('soporte')" class="btn-premium btn-ghost" style="padding:8px 16px;font-size:0.82rem;"><i class="fas fa-headset"></i> Ayuda</button>
                    <button onclick="logout()" class="btn-premium" style="padding:8px 16px;font-size:0.82rem;background:rgba(255,59,48,0.15);border:1px solid rgba(255,59,48,0.25);box-shadow:none;color:#ff6b63;"><i class="fas fa-sign-out-alt"></i> Salir</button>
                </div>
            </nav>
            `}
            ${IS_MOBILE ? mobileBottomNav('dashboard') : ''}
            <div style="max-width:${IS_MOBILE ? '100%' : '1400px'};margin:auto;padding:${IS_MOBILE ? (currentUser.rol === 'usuario' ? '12px 12px 84px' : '12px') : '32px 24px'};">
                ${currentUser.rol === 'usuario' && !IS_MOBILE ? `<div class="fab btn-yellow-gradient" onclick="openCVModal()" title="Actualizar perfil profesional"><i class="fas fa-id-card"></i></div>` : ''}
                ${currentUser.rol === 'empresa' ? `
                <div style="margin-bottom:28px;display:flex;justify-content:center;">
                    <button onclick="openPublicarAnuncio()" class="btn-premium" style="background:#0a84ff;border:1px solid rgba(10,132,255,0.25);padding:12px 22px;">
                        <i class="fas fa-plus" style="margin-right:8px;"></i> Publicar anuncio
                    </button>
                </div>` : ''}
                <div class="${IS_MOBILE ? '' : 'grid'}" style="${IS_MOBILE ? 'display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:14px 0;' : ''}">
                    ${feedItems.map((item, i) => {
                        if(item.itemType === 'job') {
                            const hasEmpFoto = item.empresa_foto && item.empresa_foto !== 'default.jpg';
                            const empresaFoto = (item.empresa_foto && item.empresa_foto.startsWith('http')) ? item.empresa_foto : `${BASE_URL}/uploads/` + (item.empresa_foto || 'default.jpg');
                            const isDisponible = getJobStatus(item.id) === 'disponible';
                            const isOwner = currentUser && String(currentUser.id) === String(item.empresa_id);

                            if (IS_MOBILE) return `
                            <div class="glass" data-id="${item.id}" style="border-radius:20px;padding:14px 12px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:9px;animation-delay:${i*0.05}s;border:1px solid rgba(10,132,255,0.15);position:relative;overflow:hidden;">
                                <span style="position:absolute;top:9px;left:9px;background:${isDisponible ? 'rgba(10,132,255,0.18)' : 'rgba(255,59,48,0.15)'};color:${isDisponible ? '#0a84ff' : '#ff6b63'};font-size:0.58rem;font-weight:800;padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${isDisponible ? '● Activo' : '● Cerrado'}</span>
                                ${hasEmpFoto
                                    ? `<img src="${empresaFoto}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2.5px solid rgba(10,132,255,0.35);margin-top:16px;box-shadow:0 4px 12px rgba(10,132,255,0.2);">`
                                    : `<div style="width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(10,132,255,0.1);color:#0a84ff;font-size:1.5rem;border:2.5px solid rgba(10,132,255,0.25);margin-top:16px;"><i class="fas fa-building"></i></div>`
                                }
                                <div style="font-size:0.78rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:0.5px;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.empresa_nombre || 'Empresa'}</div>
                                <div style="font-size:0.7rem;color:#0a84ff;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.titulo || 'Puesto'}</div>
                                <div style="font-size:0.63rem;color:rgba(255,255,255,0.45);"><i class="fas fa-map-marker-alt" style="color:#0a84ff;"></i> ${(item.ubicacion || 'Sin ubicación').substring(0,16)}</div>
                                <div style="height:1px;width:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);"></div>
                                <div style="font-size:1.2rem;font-weight:900;color:#fff;letter-spacing:-0.5px;">${fmtSal(item.salario)}</div>
                                <button onclick="openJobDetails(${item.id})" class="btn-premium" style="width:100%;padding:11px 6px;font-size:0.73rem;border-radius:14px;justify-content:center;margin-top:2px;">
                                    <i class="fas fa-paper-plane"></i> Postularme
                                </button>
                                ${isOwner ? `<button onclick="toggleJobStatus(${item.id})" style="background:none;border:none;color:rgba(255,255,255,0.3);font-size:0.6rem;cursor:pointer;padding:2px;">${isDisponible ? 'Cerrar vacante' : 'Reactivar'}</button>` : ''}
                            </div>`;

                            return `
                            <div class="glass job-card profile-card" data-id="${item.id}" style="animation-delay:${i * 0.06}s;">
                                <div class="card-content">

                                    <!-- Fila superior: estado + salario pequeño -->
                                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:18px;">
                                        <span class="badge" style="display:inline-flex;align-items:center;background:${isDisponible ? 'rgba(10,132,255,0.18)' : 'rgba(255,59,48,0.18)'};color:${isDisponible ? '#0a84ff' : '#ff6b63'};padding:7px 14px;font-size:0.72rem;font-weight:700;letter-spacing:0.3px;border-radius:50px;height:28px;">
                                            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isDisponible ? '#0a84ff' : '#ff6b63'};margin-right:6px;vertical-align:middle;"></span>${isDisponible ? 'Disponible' : 'No disponible'}
                                        </span>
                                        <span style="display:inline-flex;align-items:center;font-size:0.72rem;color:rgba(255,255,255,0.7);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:7px 14px;border-radius:50px;height:28px;">${item.modalidad || 'Presencial'}</span>
                                    </div>

                                    <!-- Nombre de la empresa arriba del logo -->
                                    <div style="text-align:center;margin-bottom:12px;">
                                        <div style="font-size:1.3rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;">${item.empresa_nombre || 'Empresa'}</div>
                                    </div>

                                    <!-- Logo empresa -->
                                    <div style="display:flex;justify-content:center;margin-bottom:16px;">
                                        ${hasEmpFoto
                                            ? `<img src="${empresaFoto}" alt="Logo empresa" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:3px solid rgba(10,132,255,0.25);box-shadow:0 0 0 5px rgba(10,132,255,0.06);">`
                                            : `<div style="width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);color:var(--blue);font-size:2rem;border:3px solid rgba(10,132,255,0.25);box-shadow:0 0 0 5px rgba(10,132,255,0.06);"><i class="fas fa-building"></i></div>`
                                        }
                                    </div>

                                    <!-- Título + Ubicación + Salario + Postulantes -->
                                    <div style="text-align:center;margin-bottom:6px;">
                                        <div style="font-size:0.85rem;color:#0a84ff;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:10px;">${item.titulo || 'Puesto'}</div>
                                        <div style="font-size:0.8rem;color:rgba(255,255,255,0.5);font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:28px;"><i class="fas fa-map-marker-alt" style="color:#0a84ff;"></i> ${item.ubicacion || 'Ubicación no ingresada'}</div>
                                        <div style="font-size:0.65rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;font-weight:700;">Salario ofrecido</div>
                                        <div style="font-size:2.2rem;font-weight:900;color:#fff;line-height:1;letter-spacing:-1px;text-shadow: 0 0 15px rgba(255,255,255,0.15);">${fmtSal(item.salario)}</div>
                                    </div>

                                    <!-- Separador -->
                                    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);margin:${isOwner ? '18px' : '14px'} 0;"></div>

                                    <!-- Botones -->
                                    <div style="display:grid;gap:10px;">
                                        <button onclick="openJobDetails(${item.id})" class="btn-premium" style="width:100%;padding:14px;font-size:0.88rem;">
                                            <i class="fas fa-paper-plane"></i> Postularme
                                        </button>
                                        ${item.telefono ? `
                                        <a href="${waLink(item.telefono)}" target="_blank" class="btn-premium" style="width:100%;padding:12px;font-size:0.85rem;background:linear-gradient(135deg,#25D366,#128C7E);box-shadow:0 4px 15px rgba(37,211,102,0.3);justify-content:center;text-decoration:none;">
                                            <i class="fab fa-whatsapp"></i> WhatsApp
                                        </a>` : ''}
                                        ${isOwner ? `
                                            <button onclick="toggleJobStatus(${item.id})" class="btn-premium btn-ghost" style="width:100%;padding:13px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);color:#fff;font-size:0.85rem;">
                                                <i class="fas fa-check-circle"></i> ${isDisponible ? 'Ya conseguí personal' : 'Volver disponible'}
                                            </button>
                                        ` : ''}
                                    </div>

                                    ${isOwner ? `
                                        <div style="text-align:center;margin-top:16px;">
                                            <button onclick="eliminarAnuncio(${item.id})" style="background:none;border:none;color:#ff3b30;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:0.2s;outline:none;padding:4px 8px;border-radius:4px;">
                                                <i class="fas fa-trash-alt" style="font-size:0.65rem;"></i> Eliminar anuncio
                                            </button>
                                        </div>
                                    ` : ''}

                                </div>
                            </div>`;
                        } else {
                            const cv = getCVData(item);
                            const hasCFoto = item.foto_perfil && item.foto_perfil !== 'default.jpg';
                            const cFoto = (item.foto_perfil && item.foto_perfil.startsWith('http')) ? item.foto_perfil : `${BASE_URL}/uploads/` + (item.foto_perfil || 'default.jpg');
                            const isCandDisponible = getCandidateStatus(item.id) === 'disponible';
                            const isOwner = currentUser && String(currentUser.id) === String(item.id);

                            if (IS_MOBILE) return `
                            <div class="glass" data-candidate-id="${item.id}" style="border-radius:20px;padding:14px 12px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:9px;animation-delay:${i*0.05}s;border:1px solid rgba(255,215,0,0.15);position:relative;overflow:hidden;">
                                <span style="position:absolute;top:9px;left:9px;background:${isCandDisponible ? 'rgba(48,209,88,0.18)' : 'rgba(255,59,48,0.15)'};color:${isCandDisponible ? '#30d158' : '#ff6b63'};font-size:0.58rem;font-weight:800;padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${isCandDisponible ? '● Libre' : '● Ocupado'}</span>
                                ${hasCFoto
                                    ? `<img src="${cFoto}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2.5px solid rgba(255,215,0,0.35);margin-top:16px;box-shadow:0 4px 12px rgba(255,165,0,0.2);">`
                                    : `<div style="width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,215,0,0.08);color:#FFD700;font-size:1.5rem;border:2.5px solid rgba(255,215,0,0.25);margin-top:16px;"><i class="fas fa-user"></i></div>`
                                }
                                <div style="font-size:0.78rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:0.5px;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.nombre || 'Candidato'}</div>
                                <div style="font-size:0.7rem;color:#FFD700;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.profesion || 'Profesional'}</div>
                                <div style="font-size:0.63rem;color:rgba(255,255,255,0.45);"><i class="fas fa-map-marker-alt" style="color:#FFD700;"></i> ${(cv.ubicacion || 'Sin ubicación').substring(0,16)}</div>
                                <div style="height:1px;width:100%;background:linear-gradient(90deg,transparent,rgba(255,215,0,0.1),transparent);"></div>
                                <div style="font-size:1.2rem;font-weight:900;color:#fff;letter-spacing:-0.5px;">${cv.moneda || 'Q'} ${fmtSal(item.salario_deseado)}</div>
                                <button onclick="openCandidateDetails(${item.id})" class="btn-premium btn-yellow-gradient" style="width:100%;padding:11px 6px;font-size:0.73rem;border-radius:14px;justify-content:center;margin-top:2px;">
                                    <i class="fas fa-user-check"></i> Ver Talento
                                </button>
                                ${isOwner ? `<button onclick="toggleCandidateStatus(${item.id})" style="background:none;border:none;color:rgba(255,255,255,0.3);font-size:0.6rem;cursor:pointer;padding:2px;">${isCandDisponible ? 'Marcar ocupado' : 'Marcar libre'}</button>` : ''}
                            </div>`;

                            return `
                            <div class="glass job-card profile-card" data-candidate-id="${item.id}" style="animation-delay:${i * 0.06}s;">
                                <div class="card-content">

                                    <!-- Fila superior: estado + modalidad (claramente separados) -->
                                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:18px;">
                                        <span class="badge" style="display:inline-flex;align-items:center;background:${isCandDisponible ? 'rgba(10,132,255,0.18)' : 'rgba(255,59,48,0.18)'};color:${isCandDisponible ? '#0a84ff' : '#ff6b63'};padding:7px 14px;font-size:0.72rem;font-weight:700;letter-spacing:0.3px;border-radius:50px;height:28px;">
                                            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isCandDisponible ? '#0a84ff' : '#ff6b63'};margin-right:6px;vertical-align:middle;"></span>${isCandDisponible ? 'Disponible' : 'No disponible'}
                                        </span>
                                        <span style="display:inline-flex;align-items:center;font-size:0.72rem;color:rgba(255,255,255,0.7);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);padding:7px 14px;border-radius:50px;height:28px;">${cv.modalidad || 'Presencial'}</span>
                                    </div>

                                    <!-- Nombre arriba de la foto -->
                                    <div style="text-align:center;margin-bottom:18px;">
                                        <div style="font-size:1.3rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;">${item.nombre || 'Candidato'}</div>
                                    </div>

                                    <!-- Foto de perfil -->
                                    <div style="display:flex;justify-content:center;margin-bottom:24px;">
                                        ${hasCFoto 
                                            ? `<img src="${cFoto}" alt="Foto perfil" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,215,0,0.25);box-shadow:0 0 0 5px rgba(255,215,0,0.06);">`
                                            : `<div style="width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);color:var(--gold);font-size:2rem;border:3px solid rgba(255,215,0,0.25);box-shadow:0 0 0 5px rgba(255,215,0,0.06);"><i class="fas fa-user"></i></div>`
                                        }
                                    </div>

                                    <!-- Profesión + Ubicación + Salario -->
                                    <div style="text-align:center;margin-bottom:6px;">
                                        <div style="font-size:0.85rem;color:var(--gold);font-weight:800;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:12px;">${item.profesion || 'Profesional'}</div>
                                        <div style="font-size:0.8rem;color:rgba(255,255,255,0.5);font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;"><i class="fas fa-map-marker-alt" style="color:#0a84ff;"></i> ${cv.ubicacion || 'Ubicación no ingresada'}</div>
                                        <div style="font-size:0.65rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;font-weight:700;">Salario esperado</div>
                                        <div style="font-size:2.2rem;font-weight:900;color:#fff;line-height:1;letter-spacing:-1px;text-shadow: 0 0 15px rgba(255,255,255,0.15);">${cv.moneda || 'Q'} ${fmtSal(item.salario_deseado)}</div>
                                    </div>

                                    <!-- Separador -->
                                    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,0,0.15),transparent);margin:${isOwner ? '18px' : '14px'} 0;"></div>

                                    <!-- Botones -->
                                    <div style="display:grid;gap:10px;">
                                        <button onclick="openCandidateDetails(${item.id})" class="btn-premium btn-yellow-gradient" style="width:100%;padding:14px;font-size:0.88rem;">
                                            <i class="fas fa-user-check"></i> Ver Talento
                                        </button>
                                        ${cv.telefono ? `
                                        <a href="${waLink(cv.telefono)}" target="_blank" class="btn-premium" style="width:100%;padding:12px;font-size:0.85rem;background:linear-gradient(135deg,#25D366,#128C7E);box-shadow:0 4px 15px rgba(37,211,102,0.3);justify-content:center;text-decoration:none;">
                                            <i class="fab fa-whatsapp"></i> WhatsApp
                                        </a>` : ''}
                                        ${isOwner ? `
                                            <button onclick="toggleCandidateStatus(${item.id})" class="btn-premium btn-ghost" style="width:100%;padding:13px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);color:#fff;font-size:0.85rem;">
                                                ${isCandDisponible ? 'Ya conseguí trabajo' : 'Volver disponible'}
                                            </button>
                                        ` : ''}
                                    </div>

                                    ${isOwner ? `
                                        <div style="text-align:center;margin-top:16px;">
                                            <button onclick="eliminarPerfilPostulado()" style="background:none;border:none;color:#ff3b30;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:0.2s;outline:none;padding:4px 8px;border-radius:4px;">
                                                <i class="fas fa-trash-alt" style="font-size:0.65rem;"></i> Eliminar mi anuncio
                                            </button>
                                        </div>
                                    ` : ''}

                                </div>
                            </div>`;
                        }
                    }).join('')}
                </div>
            </div>
            ${currentUser.rol === 'usuario' && IS_MOBILE ? `
            <div style="position:fixed;bottom:0;left:0;right:0;z-index:98;background:rgba(7,7,15,0.97);backdrop-filter:blur(30px);border-top:1px solid rgba(255,215,0,0.15);padding:10px 16px calc(10px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px rgba(0,0,0,0.4);">
                <button onclick="openCVModal()" style="width:100%;padding:13px 20px;border-radius:16px;background:linear-gradient(135deg,rgba(255,215,0,0.18),rgba(255,140,0,0.1));border:1.5px solid rgba(255,215,0,0.35);display:flex;align-items:center;gap:14px;cursor:pointer;text-align:left;box-shadow:0 4px 16px rgba(255,165,0,0.15);transition:0.2s;">
                    <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#FFD700,#FFA500);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(255,165,0,0.3);">
                        <i class="fas fa-id-card" style="color:#1a1000;font-size:1rem;"></i>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.8rem;font-weight:800;color:#FFD700;letter-spacing:0.2px;">Mi Perfil Profesional</div>
                        <div style="font-size:0.65rem;color:rgba(255,255,255,0.4);margin-top:1px;">Editar y publicar tu perfil</div>
                    </div>
                    <i class="fas fa-chevron-right" style="color:rgba(255,215,0,0.5);font-size:0.72rem;flex-shrink:0;"></i>
                </button>
            </div>` : ''}
        `;

    // ── MIS POSTULACIONES ──
    } else if (view === 'misPostulaciones') {
        try {
            const res = await fetch(`${API_URL}/mis-postulaciones`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const misApps = await res.json();

            const getEstadoInfo = (estado) => {
                if (estado === 'aceptado') return { label: '¡Postulación Aceptada!', icon: 'fa-check-circle', color: '#30d158', bg: 'rgba(48,209,88,0.12)', border: '#30d158', glow: '0 0 20px rgba(48,209,88,0.35)' };
                if (estado === 'rechazado') return { label: 'No Seleccionado', icon: 'fa-times-circle', color: '#ff3b30', bg: 'rgba(255,59,48,0.1)', border: '#ff3b30', glow: 'none' };
                if (estado === 'visto') return { label: 'En Revisión', icon: 'fa-eye', color: '#0a84ff', bg: 'rgba(10,132,255,0.1)', border: '#0a84ff', glow: 'none' };
                return { label: 'Pendiente', icon: 'fa-clock', color: 'rgba(0,0,0,0.75)', bg: 'linear-gradient(135deg,#FFD700,#FFA500)', border: '#FFD700', glow: 'none' };
            };

            const aceptadas = misApps.filter(a => a.estado === 'aceptado');

            app.innerHTML = `
                <nav class="navbar">
                    <div class="logo">WorkFlow <i class="fas fa-bolt" style="color:#0a84ff;"></i></div>
                    <div style="display:flex;gap:10px;">
                        <button onclick="render('dashboard')" class="btn-premium btn-ghost" style="padding:9px 18px;font-size:0.85rem;">
                            <i class="fas fa-home"></i> Inicio
                        </button>
                    </div>
                </nav>
                ${IS_MOBILE ? mobileBottomNav('postulaciones') : ''}
                <div style="max-width:900px;margin:${IS_MOBILE ? '12px' : '40px'} auto;padding:0 ${IS_MOBILE ? '12px' : '20px'};${IS_MOBILE ? 'padding-bottom:16px;' : ''}">
                    ${aceptadas.length > 0 ? `
                    <div style="background:linear-gradient(135deg,rgba(48,209,88,0.15),rgba(48,209,88,0.05));border:1.5px solid rgba(48,209,88,0.4);border-radius:24px;padding:24px 28px;margin-bottom:28px;display:flex;align-items:center;gap:18px;box-shadow:0 0 40px rgba(48,209,88,0.12);animation:fadeInUp 0.5s ease-out;">
                        <div style="width:56px;height:56px;background:rgba(48,209,88,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 20px rgba(48,209,88,0.4);">
                            <i class="fas fa-trophy" style="color:#30d158;font-size:1.6rem;"></i>
                        </div>
                        <div>
                            <div style="font-size:1.1rem;font-weight:800;color:#30d158;margin-bottom:4px;">¡Felicitaciones! Tu postulación fue aceptada</div>
                            <div style="font-size:0.88rem;color:rgba(255,255,255,0.6);">${aceptadas.length === 1 ? `La empresa <strong style="color:#fff;">${aceptadas[0].empresa_nombre}</strong> ha aceptado tu postulación para <strong style="color:#fff;">${aceptadas[0].titulo}</strong>.` : `${aceptadas.length} empresas han aceptado tus postulaciones. ¡Revisa los detalles abajo!`}</div>
                        </div>
                    </div>
                    ` : ''}
                    <div style="margin-bottom:24px;">
                        <h2 style="font-size:1.6rem;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px;">
                            <i class="fas fa-paper-plane" style="color:#0a84ff;margin-right:8px;"></i>Mis Postulaciones
                        </h2>
                        <p style="color:rgba(255,255,255,0.45);font-size:0.88rem;">${misApps.length} postulación${misApps.length !== 1 ? 'es' : ''} registrada${misApps.length !== 1 ? 's' : ''}</p>
                    </div>
                    ${misApps.length ? misApps.map((a, i) => {
                        const est = getEstadoInfo(a.estado);
                        return `
                        <div class="glass" style="padding:22px 26px;border-left:3px solid ${est.border};border-radius:20px;margin-bottom:14px;animation-delay:${i * 0.05}s;${a.estado === 'aceptado' ? 'box-shadow:' + est.glow + ';' : ''}">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
                                <div style="flex:1;min-width:0;">
                                    <h3 style="font-size:1rem;font-weight:700;color:#fff;margin-bottom:8px;">${a.titulo}</h3>
                                    <div class="info-row" style="margin-bottom:6px;"><i class="fas fa-building"></i> ${a.empresa_nombre}</div>
                                    <div class="info-row"><i class="fas fa-calendar-alt"></i> Aplicado el ${new Date(a.fecha_postulacion).toLocaleDateString('es-GT', {day:'numeric',month:'long',year:'numeric'})}</div>
                                </div>
                                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
                                    <span class="badge">${a.modalidad || 'Presencial'}</span>
                                    <span style="display:inline-flex;align-items:center;gap:6px;background:${est.bg};color:${est.color};padding:6px 14px;border-radius:50px;font-size:0.72rem;font-weight:700;border:1px solid ${est.border};${a.estado === 'aceptado' ? 'box-shadow:' + est.glow + ';' : ''}">
                                        <i class="fas ${est.icon}" style="font-size:0.75rem;"></i> ${est.label}
                                    </span>
                                </div>
                            </div>
                            ${a.estado === 'aceptado' && a.mensaje_contacto ? `
                            <div style="margin-top:16px;padding:16px 18px;border-radius:14px;background:rgba(48,209,88,0.07);border:1px solid rgba(48,209,88,0.2);">
                                <div style="font-size:0.7rem;color:#30d158;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;"><i class="fas fa-envelope" style="margin-right:5px;"></i>Puedes contactarte con nosotros</div>
                                <div style="font-size:0.92rem;color:#fff;font-weight:600;">${a.mensaje_contacto}</div>
                            </div>` : ''}
                        </div>`;
                    }).join('') : `
                        <div class="glass" style="padding:60px 40px;text-align:center;">
                            <i class="fas fa-inbox" style="font-size:3rem;color:rgba(255,255,255,0.15);margin-bottom:16px;display:block;"></i>
                            <p style="color:rgba(255,255,255,0.4);font-size:0.95rem;">Aún no te has postulado a ninguna vacante.</p>
                            <button onclick="render('dashboard')" class="btn-premium" style="margin-top:20px;padding:11px 24px;font-size:0.88rem;">
                                <i class="fas fa-search"></i> Ver ofertas
                            </button>
                        </div>
                    `}
                </div>
            `;

            marcarNotificacionesVistas(aceptadas.map(a => a.id));

            if (aceptadas.length > 0) {
                setTimeout(() => notify('¡Postulación Aceptada!', `${aceptadas[0].empresa_nombre} aceptó tu solicitud para ${aceptadas[0].titulo}.`), 400);
            }
        } catch (err) { render('dashboard'); }

    // ── POSTULACIONES EMPRESA ──
    } else if (view === 'misPostulacionesEmpresa') {
        try {
            const res = await fetch(`${API_URL}/postulaciones-recibidas`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
            const empleosConPostulantes = await res.json();

            const totalPost = empleosConPostulantes.reduce((s, e) => s + e.postulantes.length, 0);

            // Guardar postulantes en cache global para acceso seguro desde botones
            window.postulantesCache = {};
            empleosConPostulantes.forEach(empleo => empleo.postulantes.forEach(p => { window.postulantesCache[p.id] = p; }));

            app.innerHTML = `
                <nav class="navbar">
                    <div class="logo">WorkFlow <i class="fas fa-bolt" style="color:#0a84ff;"></i></div>
                    <div style="display:flex;gap:10px;">
                        <button onclick="render('dashboard')" class="btn-premium btn-ghost" style="padding:9px 18px;font-size:0.85rem;"><i class="fas fa-home"></i> Inicio</button>
                        <button onclick="render('perfil')" class="btn-premium btn-ghost" style="padding:9px 18px;font-size:0.85rem;"><i class="fas fa-user"></i> Perfil</button>
                        <button onclick="logout()" class="btn-premium" style="padding:9px 18px;font-size:0.85rem;background:rgba(255,59,48,0.15);border:1px solid rgba(255,59,48,0.25);color:#ff6b63;box-shadow:none;"><i class="fas fa-sign-out-alt"></i> Salir</button>
                    </div>
                </nav>
                ${IS_MOBILE ? mobileBottomNav('postulaciones') : ''}

                <!-- HERO HEADER -->
                <div style="background:linear-gradient(160deg,rgba(10,132,255,0.12) 0%,transparent 60%);border-bottom:1px solid rgba(255,255,255,0.05);padding:${IS_MOBILE ? '32px 20px 28px' : '48px 40px 38px'};text-align:center;">
                    <div style="width:72px;height:72px;background:rgba(10,132,255,0.12);border:1.5px solid rgba(10,132,255,0.3);border-radius:22px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 0 30px rgba(10,132,255,0.15);">
                        <i class="fas fa-users" style="font-size:2rem;color:#0a84ff;"></i>
                    </div>
                    <h1 style="font-size:${IS_MOBILE ? '1.8rem' : '2.4rem'};font-weight:900;color:#fff;letter-spacing:-1px;margin-bottom:8px;">Candidatos Recibidos</h1>
                    <p style="color:rgba(255,255,255,0.45);font-size:0.95rem;margin-bottom:24px;">Personas interesadas en unirse a tu equipo</p>
                    <div style="display:inline-flex;gap:24px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:14px 28px;">
                        <div style="text-align:center;">
                            <div style="font-size:2rem;font-weight:900;color:#0a84ff;line-height:1;">${totalPost}</div>
                            <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-top:4px;">Postulante${totalPost !== 1 ? 's' : ''}</div>
                        </div>
                        <div style="width:1px;background:rgba(255,255,255,0.08);"></div>
                        <div style="text-align:center;">
                            <div style="font-size:2rem;font-weight:900;color:#30d158;line-height:1;">${empleosConPostulantes.length}</div>
                            <div style="font-size:0.7rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-top:4px;">Anuncio${empleosConPostulantes.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>

                <div style="max-width:1100px;margin:auto;padding:${IS_MOBILE ? '24px 16px' : '40px 32px'};">
                    ${empleosConPostulantes.length === 0 ? `
                        <div class="glass" style="padding:80px 40px;text-align:center;border-radius:24px;border:1px solid rgba(255,255,255,0.06);">
                            <div style="width:80px;height:80px;background:rgba(255,255,255,0.03);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                                <i class="fas fa-inbox" style="font-size:2.5rem;color:rgba(255,255,255,0.12);"></i>
                            </div>
                            <h3 style="color:rgba(255,255,255,0.5);font-size:1.1rem;font-weight:700;margin-bottom:8px;">Aún no tienes postulantes</h3>
                            <p style="color:rgba(255,255,255,0.3);font-size:0.88rem;margin-bottom:24px;">Publica un anuncio atractivo para comenzar a recibir candidatos.</p>
                            <button onclick="render('dashboard')" class="btn-premium" style="padding:14px 28px;font-size:0.9rem;"><i class="fas fa-plus"></i> Publicar anuncio</button>
                        </div>
                    ` : empleosConPostulantes.map(empleo => `
                        <div style="margin-bottom:44px;">
                            <!-- Encabezado del puesto -->
                            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;padding:${IS_MOBILE?'16px 18px':'20px 26px'};background:linear-gradient(135deg,rgba(10,132,255,0.08),rgba(10,132,255,0.02));border:1px solid rgba(10,132,255,0.18);border-left:4px solid #0a84ff;border-radius:18px;margin-bottom:14px;">
                                <div style="display:flex;align-items:center;gap:16px;">
                                    <div style="width:${IS_MOBILE?'40px':'48px'};height:${IS_MOBILE?'40px':'48px'};border-radius:14px;background:rgba(10,132,255,0.14);border:1px solid rgba(10,132,255,0.28);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                        <i class="fas fa-briefcase" style="color:#0a84ff;font-size:${IS_MOBILE?'1.1rem':'1.25rem'};"></i>
                                    </div>
                                    <div>
                                        <div style="font-size:${IS_MOBILE?'1rem':'1.12rem'};font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:5px;">${empleo.titulo}</div>
                                        <div style="display:flex;gap:16px;flex-wrap:wrap;">
                                            <span style="font-size:0.7rem;color:rgba(255,255,255,0.45);display:flex;align-items:center;gap:5px;"><i class="fas fa-map-marker-alt" style="color:#0a84ff;"></i>${empleo.ubicacion||'No especificada'}</span>
                                            <span style="font-size:0.7rem;color:rgba(255,255,255,0.45);display:flex;align-items:center;gap:5px;"><i class="fas fa-laptop-house" style="color:#0a84ff;"></i>${empleo.modalidad||'Presencial'}</span>
                                            <span style="font-size:0.7rem;color:rgba(255,255,255,0.45);display:flex;align-items:center;gap:5px;"><i class="fas fa-coins" style="color:#0a84ff;"></i>${fmtSal(empleo.salario)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style="display:flex;gap:7px;flex-wrap:wrap;">
                                    <span style="background:rgba(255,214,10,0.08);color:#ffd60a;padding:5px 12px;border-radius:50px;font-size:0.67rem;font-weight:700;border:1px solid rgba(255,214,10,0.2);display:flex;align-items:center;gap:5px;"><i class="fas fa-clock"></i>${empleo.postulantes.filter(x=>!x.estado||x.estado==='pendiente').length} pendientes</span>
                                    <span style="background:rgba(48,209,88,0.08);color:#30d158;padding:5px 12px;border-radius:50px;font-size:0.67rem;font-weight:700;border:1px solid rgba(48,209,88,0.2);display:flex;align-items:center;gap:5px;"><i class="fas fa-check"></i>${empleo.postulantes.filter(x=>x.estado==='aceptado').length} aceptados</span>
                                    <span style="background:rgba(255,59,48,0.08);color:#ff6b63;padding:5px 12px;border-radius:50px;font-size:0.67rem;font-weight:700;border:1px solid rgba(255,59,48,0.2);display:flex;align-items:center;gap:5px;"><i class="fas fa-times"></i>${empleo.postulantes.filter(x=>x.estado==='rechazado').length} rechazados</span>
                                </div>
                            </div>

                            <!-- Lista de candidatos -->
                            <div style="display:flex;flex-direction:column;gap:9px;">
                                ${empleo.postulantes.map(p => {
                                    let cv = {};
                                    try { cv = typeof p.cvInfo === 'string' ? JSON.parse(p.cvInfo) : (p.cvInfo || {}); } catch(e) {}
                                    const hasFoto = p.foto_perfil && p.foto_perfil !== 'default.jpg';
                                    const fotoUrl = (p.foto_perfil && p.foto_perfil.startsWith('http')) ? p.foto_perfil : `${BASE_URL}/uploads/` + (p.foto_perfil || 'default.jpg');
                                    const skills = (cv.skills || '').split(',').map(s => s.trim()).filter(s => s).slice(0, 3);
                                    const accentColor = p.estado === 'aceptado' ? '#30d158' : p.estado === 'rechazado' ? '#ff6b63' : '#ffd60a';
                                    const dateStr = new Date(p.fecha_postulacion).toLocaleDateString('es-GT',{day:'numeric',month:'long',year:'numeric'});
                                    return `
                                    <div style="display:flex;align-items:center;gap:${IS_MOBILE?'11px':'18px'};padding:${IS_MOBILE?'13px 14px':'16px 22px'};background:rgba(255,255,255,0.024);border:1px solid rgba(255,255,255,0.07);border-radius:15px;position:relative;overflow:hidden;transition:border-color 0.2s;">
                                        <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${accentColor};border-radius:3px 0 0 3px;"></div>
                                        <div style="flex-shrink:0;margin-left:5px;">
                                            ${hasFoto
                                                ? `<img src="${fotoUrl}" style="width:${IS_MOBILE?'44px':'52px'};height:${IS_MOBILE?'44px':'52px'};border-radius:50%;object-fit:cover;border:2px solid ${accentColor}44;box-shadow:0 0 0 3px ${accentColor}11;">`
                                                : `<div style="width:${IS_MOBILE?'44px':'52px'};height:${IS_MOBILE?'44px':'52px'};border-radius:50%;background:rgba(10,132,255,0.1);display:flex;align-items:center;justify-content:center;color:#0a84ff;font-size:${IS_MOBILE?'1.2rem':'1.4rem'};border:2px solid rgba(10,132,255,0.2);box-shadow:0 0 0 3px rgba(10,132,255,0.06);"><i class="fas fa-user"></i></div>`
                                            }
                                        </div>
                                        <div style="flex:1;min-width:0;">
                                            <div style="font-size:${IS_MOBILE?'0.88rem':'0.95rem'};font-weight:800;color:#fff;letter-spacing:0.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.nombre}</div>
                                            <div style="font-size:0.68rem;color:#0a84ff;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;margin-top:2px;">${p.profesion||'Profesional'}</div>
                                            <div style="font-size:0.64rem;color:rgba(255,255,255,0.26);margin-top:4px;display:flex;align-items:center;gap:4px;"><i class="fas fa-calendar-alt" style="color:rgba(255,255,255,0.18);"></i>${dateStr}</div>
                                        </div>
                                        ${!IS_MOBILE && skills.length > 0 ? `<div style="display:flex;gap:5px;flex-wrap:wrap;min-width:140px;max-width:190px;justify-content:flex-end;">${skills.map(s=>`<span style="background:rgba(10,132,255,0.1);color:rgba(10,132,255,0.8);padding:3px 9px;border-radius:50px;font-size:0.63rem;font-weight:700;border:1px solid rgba(10,132,255,0.18);white-space:nowrap;">${s}</span>`).join('')}</div>` : ''}
                                        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
                                            ${p.estado === 'aceptado'
                                                ? `<span style="background:rgba(48,209,88,0.1);color:#30d158;padding:4px 11px;border-radius:50px;font-size:0.62rem;font-weight:700;border:1px solid rgba(48,209,88,0.25);text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;"><i class="fas fa-check" style="margin-right:3px;"></i>Aceptado</span>`
                                                : p.estado === 'rechazado'
                                                ? `<span style="background:rgba(255,59,48,0.1);color:#ff6b63;padding:4px 11px;border-radius:50px;font-size:0.62rem;font-weight:700;border:1px solid rgba(255,59,48,0.22);text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;"><i class="fas fa-times" style="margin-right:3px;"></i>Rechazado</span>`
                                                : `<span style="background:rgba(255,214,10,0.08);color:#ffd60a;padding:4px 11px;border-radius:50px;font-size:0.62rem;font-weight:700;border:1px solid rgba(255,214,10,0.18);text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;"><i class="fas fa-clock" style="margin-right:3px;"></i>Pendiente</span>`
                                            }
                                            <div style="display:flex;gap:6px;align-items:center;">
                                                <button onclick="abrirPerfilPostulante(${p.id})" style="padding:${IS_MOBILE?'7px 10px':'7px 13px'};border-radius:9px;background:rgba(10,132,255,0.12);border:1px solid rgba(10,132,255,0.25);color:#0a84ff;font-weight:700;font-size:0.7rem;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:background 0.15s;"><i class="fas fa-eye"></i>${IS_MOBILE?'':' Ver'}</button>
                                                <div data-acciones style="display:flex;gap:6px;">
                                                    ${p.estado === 'aceptado' ? `
                                                        <div style="padding:7px 13px;border-radius:9px;background:rgba(48,209,88,0.07);border:1px solid rgba(48,209,88,0.2);color:#30d158;font-size:0.7rem;font-weight:700;display:flex;align-items:center;gap:4px;white-space:nowrap;"><i class="fas fa-check-circle"></i>${IS_MOBILE?'':' Aceptado'}</div>
                                                    ` : p.estado === 'rechazado' ? `
                                                        <div style="padding:7px 13px;border-radius:9px;background:rgba(255,59,48,0.07);border:1px solid rgba(255,59,48,0.2);color:#ff6b63;font-size:0.7rem;font-weight:700;display:flex;align-items:center;gap:4px;white-space:nowrap;"><i class="fas fa-times-circle"></i>${IS_MOBILE?'':' Rechazado'}</div>
                                                    ` : `
                                                        <button onclick="cambiarEstadoPostulante(window.postulantesCache[${p.id}]?.postulacion_id,window.postulantesCache[${p.id}]?.nombre||'Candidato','aceptado',this)" style="padding:${IS_MOBILE?'7px 10px':'7px 13px'};border-radius:9px;background:rgba(48,209,88,0.12);border:1.5px solid rgba(48,209,88,0.3);color:#30d158;font-weight:800;font-size:0.7rem;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:background 0.15s;"><i class="fas fa-user-check"></i>${IS_MOBILE?'':' Aceptar'}</button>
                                                        <button onclick="cambiarEstadoPostulante(window.postulantesCache[${p.id}]?.postulacion_id,window.postulantesCache[${p.id}]?.nombre||'Candidato','rechazado',this)" style="padding:${IS_MOBILE?'7px 10px':'7px 13px'};border-radius:9px;background:rgba(255,59,48,0.07);border:1px solid rgba(255,59,48,0.22);color:#ff6b63;font-weight:700;font-size:0.7rem;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:background 0.15s;"><i class="fas fa-user-times"></i>${IS_MOBILE?'':' Rechazar'}</button>
                                                    `}
                                                </div>
                                            </div>
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch(err) { render('dashboard'); }

    // ── PERFIL ──
    } else if (view === 'perfil') {
        const hasProfFoto = currentUser.foto_perfil && currentUser.foto_perfil !== 'default.jpg';
        const fotoUrl = (currentUser.foto_perfil && currentUser.foto_perfil.startsWith('http'))
            ? currentUser.foto_perfil
            : `${BASE_URL}/uploads/` + (currentUser.foto_perfil || 'default.jpg');

        app.innerHTML = `
            <nav class="navbar">
                <div class="logo">WorkFlow <i class="fas fa-bolt" style="color:#0a84ff;"></i></div>
                <div style="display:flex;gap:10px;">
                    <button onclick="render('dashboard')" class="btn-premium btn-ghost" style="padding:9px 18px;font-size:0.85rem;">
                        <i class="fas fa-home"></i> Inicio
                    </button>
                </div>
            </nav>
            ${IS_MOBILE ? mobileBottomNav('perfil') : ''}
            <div class="centered-view">
                <div style="max-width:680px;width:100%;padding:0 20px;">
                    <div class="glass" style="padding:44px;text-align:center;">
                        <div style="position:relative;display:inline-block;margin-bottom:24px;">
                            ${hasProfFoto 
                                ? `<img src="${fotoUrl}" class="avatar" style="width:120px;height:120px;border-width:3px;box-shadow:0 0 0 6px rgba(10,132,255,0.15);">`
                                : `<div class="avatar" style="width:120px;height:120px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);color:var(--blue);font-size:3.5rem;border:3px solid var(--blue);box-shadow:0 0 0 6px rgba(10,132,255,0.15);"><i class="fas ${currentUser.rol === 'empresa' ? 'fa-building' : 'fa-user'}"></i></div>`
                            }
                            <label for="fotoInput" style="position:absolute;bottom:4px;right:4px;background:#0a84ff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;border:3px solid #07070f;box-shadow:0 2px 8px rgba(10,132,255,0.4);">
                                <i class="fas fa-camera" style="font-size:0.8rem;color:#fff;"></i>
                                <input type="file" id="fotoInput" style="display:none" accept="image/*" onchange="cambiarFoto(event)">
                            </label>
                        </div>
                        <h1 style="font-size:1.9rem;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px;">${currentUser.nombre}</h1>
                        <p style="color:#0a84ff;font-weight:600;font-size:0.9rem;margin-bottom:20px;">Postulante</p>
                        <div style="background:rgba(10,132,255,0.08);border:1px solid rgba(10,132,255,0.18);padding:10px 20px;border-radius:50px;display:inline-flex;align-items:center;gap:10px;margin-bottom:30px;">
                            <i class="fas fa-envelope" style="color:#0a84ff;font-size:0.85rem;"></i>
                            <span style="font-size:0.83rem;color:rgba(255,255,255,0.65);">Correo: <strong style="color:#fff;">${currentUser.correo}</strong></span>
                        </div>
                        <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);margin-bottom:28px;"></div>
                        <form id="perfilForm" style="text-align:left;">
                            <p style="font-size:0.75rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.8px;font-weight:700;margin-bottom:14px;margin-left:4px;">Actualizar correo</p>
                            <div class="input-group"><i class="fas fa-envelope"></i><input name="correo" type="email" placeholder="Nuevo correo electrónico" autocomplete="off"></div>
                            <div class="input-group"><i class="fas fa-envelope-open"></i><input name="confirm_correo" type="email" placeholder="Confirmar nuevo correo" autocomplete="off"></div>
                            <p style="font-size:0.75rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.8px;font-weight:700;margin:20px 0 14px 4px;">Actualizar contraseña</p>
                            <div class="input-group"><input name="password" type="password" placeholder="Nueva contraseña (opcional)" autocomplete="new-password" style="padding:16px 18px;"></div>
                            <div class="input-group" style="margin-top:10px;"><input name="confirm_password" type="password" placeholder="Confirmar nueva contraseña" autocomplete="new-password" style="padding:16px 18px;"></div>
                            <p style="margin-top:16px;font-size:0.78rem;color:rgba(255,255,255,0.3);line-height:1.5;">
                                <i class="fas fa-info-circle" style="margin-right:5px;"></i>Por seguridad, la actualización de credenciales requiere un nuevo inicio de sesión.
                            </p>
                            <button type="submit" class="btn-premium" style="width:100%;margin-top:16px;padding:14px;justify-content:center;">
                                <i class="fas fa-save"></i> Guardar Cambios
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('perfilForm').onsubmit = actualizarPerfil;

    // ── SOPORTE ──
    } else if (view === 'soporte') {
        app.innerHTML = `
            <nav class="navbar">
                <div class="logo">WorkFlow <i class="fas fa-bolt" style="color:#0a84ff;"></i></div>
                <div style="display:flex;gap:10px;">
                    <button onclick="render('dashboard')" class="btn-premium btn-ghost" style="padding:9px 18px;font-size:0.85rem;">
                        <i class="fas fa-home"></i> Inicio
                    </button>
                </div>
            </nav>
            ${IS_MOBILE ? mobileBottomNav('soporte') : ''}
            <div style="max-width:640px;margin:${IS_MOBILE ? '12px' : '40px'} auto;padding:0 ${IS_MOBILE ? '12px' : '20px'};">
                <div class="glass" style="padding:40px;">
                    <div style="text-align:center;margin-bottom:28px;">
                        <div style="width:64px;height:64px;background:rgba(10,132,255,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">
                            <i class="fas fa-headset" style="font-size:1.7rem;color:#0a84ff;"></i>
                        </div>
                        <h2 style="font-weight:800;letter-spacing:-0.5px;font-size:1.5rem;margin-bottom:6px;">Centro de Ayuda</h2>
                        <p style="color:rgba(255,255,255,0.45);font-size:0.88rem;">Estamos aquí para ayudarte. Cuéntanos tu consulta.</p>
                    </div>
                    <form id="supportForm">
                        <div class="input-group"><i class="fas fa-tag"></i><input name="asunto" placeholder="Motivo de su mensaje" required></div>
                        <div class="input-group" style="margin-top:10px;">
                            <i class="fas fa-comment-dots" style="top:22px;transform:none;"></i>
                            <textarea name="mensaje" placeholder="Explíquenos cómo podemos ayudarle..." rows="5" style="padding-left:48px;" required></textarea>
                        </div>
                        <button type="submit" class="btn-premium" style="width:100%;margin-top:16px;padding:14px;justify-content:center;">
                            <i class="fas fa-paper-plane"></i> Enviar Consulta
                        </button>
                    </form>
                </div>
            </div>
        `;
        document.getElementById('supportForm').onsubmit = enviarTicket;
    }
}

async function actualizarPerfil(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const dataToUpdate = {};
    const newCorreo = formData.get('correo').trim();
    const confirmCorreo = formData.get('confirm_correo').trim();
    const newPassword = formData.get('password');
    const confirmPassword = formData.get('confirm_password');

    if (newCorreo !== "") {
        if (newCorreo === currentUser.correo) { notify("Aviso", "El correo es igual al actual", "warning"); return; }
        if (newCorreo !== confirmCorreo) { notify("Error", "Los correos no coinciden", "error"); return; }
        dataToUpdate.correo = newCorreo;
    }
    if (newPassword !== "") {
        if (newPassword !== confirmPassword) { notify("Error", "Las contraseñas no coinciden", "error"); return; }
        if (newPassword.length < 6) { notify("Aviso", "La contraseña es muy corta", "warning"); return; }
        dataToUpdate.password = newPassword;
    }

    if (Object.keys(dataToUpdate).length === 0) { notify("Info", "No hay cambios que guardar", "warning"); return; }

    try {
        const res = await fetch(`${API_URL}/perfil`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(dataToUpdate)
        });
        if(res.ok) { notify("Éxito", "Perfil actualizado. Cerrando sesión..."); setTimeout(logout, 2000); }
    } catch(e){ notify("Error", "Fallo de conexión", "error"); }
}

async function enviarTicket(e) {
    e.preventDefault();
    try {
        const res = await fetch(`${API_URL}/soporte`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ asunto: e.target.asunto.value, mensaje: e.target.mensaje.value }) });
        if(res.ok) { notify("Enviado", "Tu consulta fue recibida. Te responderemos pronto."); render('dashboard'); }
    } catch(e){}
}

async function postularAEmpleo(id) {
    try {
        const res = await fetch(`${API_URL}/postular`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ empleo_id: id }) });
        if(res.ok) notify("¡Postulado!", "Tu solicitud fue enviada exitosamente.");
        else notify("Aviso", "No se pudo completar la postulación.", "warning");
    } catch(e){ notify("Error", "Error de conexión.", "error"); }
}

window.onload = async () => {
    currentUser = await cargarSesion();
    initCropper();

    // Vincular botón de guardado del modal de recorte
    const cropBtn = document.getElementById('cropAndSaveBtn');
    if (cropBtn) {
        cropBtn.onclick = async () => {
            closeCroppingModal();
            const image = document.getElementById('imageToCrop');
            const canvas = document.getElementById('croppingCanvas');
            if (!image || !canvas) return;
            const ctx = canvas.getContext('2d');
            const ratio = image.naturalWidth / image.clientWidth;
            const realSize = selectorSize * ratio;
            const realX = selectorX * ratio;
            const realY = selectorY * ratio;
            canvas.width = realSize; canvas.height = realSize;
            ctx.drawImage(image, realX, realY, realSize, realSize, 0, 0, realSize, realSize);
            canvas.toBlob(async (blob) => {
                const fd = new FormData();
                fd.append('foto', blob, currentImageFile.name);
                try {
                    const res = await fetch(`${API_URL}/upload-foto`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: fd });
                    if (res.ok) { notify("Éxito", "Foto de perfil actualizada."); currentUser = await cargarSesion(); render('perfil'); }
                } catch (e) { notify("Error", "Error al subir la imagen.", "error"); }
            }, 'image/jpeg', 0.9);
        };
    }

    if (currentUser) {
        render('dashboard');
        if (currentUser.rol === 'usuario') {
            setTimeout(checkNotificaciones, 1500);
            setInterval(checkNotificaciones, 30000);
        }
    } else render('login');
};