const API_URL = 'https://vieriworkflowapi-bte6cqekeyhrdqd9.mexicocentral-01.azurewebsites.net/api';// ✅ FIX 405: Apuntar al backend de Azure, no a GitHub Pages
const BASE_URL = API_URL.replace('/api', ''); // Para las imágenes

let currentUser = null;

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
    Object.assign(modal.style, { position: 'fixed', inset: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '10000', padding: '20px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' });
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
                            <input name="salario" type="text" placeholder="Ej: 3500.00" value="${currentUser.salario_deseado || ''}" inputmode="decimal" required style="padding-left: 48px;">
                        </div>
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;margin-left:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Ubicación</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-map-marker-alt"></i>
                        <input name="ubicacion" placeholder="Ej: Ciudad / Región" value="${cv.ubicacion || currentUser.ubicacion || ''}">
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;margin-left:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Habilidades clave</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-tools"></i>
                        <input name="skills" placeholder="Ej: JavaScript, React, SQL, Inglés..." value="${cv.skills || ''}">
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;margin-left:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Portafolio o LinkedIn</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-link"></i>
                        <input name="link" placeholder="https://linkedin.com/in/tu-usuario" value="${cv.link || ''}">
                    </div>
                </div>
                <div style="margin-bottom:22px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;margin-left:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Sobre su experiencia</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-pen" style="top:22px;transform:none;"></i>
                        <textarea name="bio" placeholder="Resuma su trayectoria y logros principales..." rows="4" style="padding-left:48px;border-radius:20px;">${cv.bio || ''}</textarea>
                    </div>
                </div>
                <label class="file-label" for="cvFile" id="cvFileLabel" style="border:2px dashed rgba(10,132,255,0.25);background:rgba(10,132,255,0.06);margin-bottom:22px;">
                    <i class="fas fa-file-pdf" style="color:#0a84ff;font-size:1.3rem;"></i>
                    <span id="cvFileName" style="font-size:0.88rem;font-weight:500;">Adjuntar CV en PDF (Opcional)</span>
                    <input type="file" id="cvFile" name="cvFile" style="display:none" accept=".pdf" onchange="const fn=this.files[0]?this.files[0].name:'Adjuntar CV en PDF (Opcional)';document.getElementById('cvFileName').innerText=fn;document.getElementById('cvFileLabel').style.borderColor='#30d158';document.getElementById('cvFileLabel').style.background='rgba(48,209,88,0.05)';">
                </label>
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
                        <input name="titulo" placeholder="Cocinero, Auxiliar, Administrativo, Vendedor" required>
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Descripción</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-align-left"></i>
                        <textarea name="descripcion" placeholder="Responsabilidades y horarios" rows="4" style="padding-left:48px;border-radius:20px;min-height:110px;resize:vertical;" required></textarea>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
                    <div>
                        <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Duración</label>
                        <div class="input-group" style="margin:0;">
                            <i class="fas fa-clock"></i>
                            <input name="duracion" placeholder="Ej: 3 meses, Permanente, Temporal" required>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 0 0 85px;">
                            <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Moneda</label>
                            <div class="input-group" style="margin:0;">
                                <i class="fas fa-money-bill-wave" style="left:12px; font-size:0.85rem;"></i>
                                <select name="moneda" style="width:100%; padding:14px 8px 14px 34px; border-radius:22px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:#fff; cursor:pointer; font-size:0.8rem;">
                                    <option value="Q" selected>Q</option>
                                    <option value="$">$</option>
                                </select>
                            </div>
                        </div>
                        <div style="flex: 1;">
                            <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Pago</label>
                            <div class="input-group" style="margin:0;">
                                <i class="fas fa-coins"></i>
                                <input name="salario_monto" type="text" placeholder="Ej: 3500.00" inputmode="decimal" required style="padding-left: 48px;">
                            </div>
                        </div>
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Requisitos Clave</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-check-circle"></i>
                        <textarea name="requisitos" placeholder="Lista breve de requisitos clave..." rows="3" style="padding-left:48px;border-radius:20px;min-height:88px;resize:vertical;"></textarea>
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.75rem;color:#0a84ff;margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Lo que ofrecemos</label>
                    <div class="input-group" style="margin:0;">
                        <i class="fas fa-gift"></i>
                        <textarea name="beneficios" placeholder="Beneficios, condiciones y extras..." rows="3" style="padding-left:48px;border-radius:20px;min-height:88px;resize:vertical;"></textarea>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
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
    modal.className = 'modal-overlay';
    document.body.style.overflow = 'hidden';
    Object.assign(modal.style, { position: 'fixed', inset: '0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: '10000', padding: '40px 20px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', overflowY: 'auto' });
    modal.innerHTML = `g har0: 28px;">
            <div style="display:flex;flex-wrap:wrap;min-height:auto;">
                <!-- Columna Izquierda: Identidad y Datos Rápidos -->
                <div style="flex:1;min-width:280px;padding:40px 25px;background:rgba(255,255,255,0.015);border-right:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;">
                    <button onclick="closeJobDetailsModal()" style="position:absolute;top:20px;left:20px;background:rgba(255,255,255,0.05);border:none;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;transition:0.2s;">×</button>
                    
                    <div style="margin-bottom:24px;position:relative;">
                        ${hasEmpFoto 
                            ? `<img src="${empresaFoto}" alt="Logo" style="width:115px;height:115px;border-radius:26px;object-fit:cover;border:3px solid rgba(10,132,255,0.3);box-shadow: 0 20px 40px rgba(0,0,0,0.4);">`
                            : `<div style="width:115px;height:115px;border-radius:26px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);color:var(--blue);font-size:3.5rem;border:3px solid rgba(10,132,255,0.3);box-shadow: 0 20px 40px rgba(0,0,0,0.4);"><i class="fas fa-building"></i></div>`
                        }
                    </div>
                    
                    <h2 style="font-size:1.6rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">${item.empresa_nombre || 'Empresa'}</h2>
                    <div style="font-size:0.9rem;color:#0a84ff;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:32px; opacity: 0.9;">${item.titulo || 'Oferta'}</div>
                    
                    <div style="width:100%;display:flex;flex-direction:column;gap:14px;margin-bottom:36px;">
                        <div style="background:rgba(255,255,255,0.03);padding:14px 18px;border-radius:16px;font-size:0.82rem;color:rgba(255,255,255,0.8);display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,0.05); transition: 0.3s;">
                            <i class="fas fa-signal" style="color:${getJobStatus(item.id) === 'disponible' ? '#0a84ff' : '#ff6b63'};width:16px;"></i>
                            <span style="text-align:left;">Estado: <strong>${getJobStatus(item.id) === 'disponible' ? 'Disponible' : 'No disponible'}</strong></span>
                        </div>
                        <div style="background:rgba(255,255,255,0.03);padding:14px 18px;border-radius:16px;font-size:0.82rem;color:rgba(255,255,255,0.8);display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-map-marker-alt" style="color:#0a84ff;width:16px;"></i>
                            <span style="text-align:left;">Ubicación: <strong>${ubicacion}</strong></span>
                        </div>
                        <div style="background:rgba(255,255,255,0.03);padding:14px 18px;border-radius:16px;font-size:0.82rem;color:rgba(255,255,255,0.8);display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-laptop-house" style="color:#0a84ff;width:16px;"></i>
                            <span style="text-align:left;">Modalidad: <strong>${modalidad}</strong></span>
                        </div>
                        <div style="background:rgba(255,255,255,0.03);padding:14px 18px;border-radius:16px;font-size:0.82rem;color:rgba(255,255,255,0.8);display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-history" style="color:#0a84ff;width:16px;"></i>
                            <span style="text-align:left;">Duración: <strong>${duracion}</strong></span>
                        </div>
                        <div style="background:rgba(255,255,255,0.03);padding:14px 18px;border-radius:16px;font-size:0.82rem;color:rgba(255,255,255,0.8);display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-file-contract" style="color:#0a84ff;width:16px;"></i>
                            <span style="text-align:left;">Contrato: <strong>${contrato}</strong></span>
                        </div>
                    </div>

                    <button onclick="postularAEmpleo(${item.id})" class="btn-premium" style="width:100%;padding:18px;font-size:0.9rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;background:linear-gradient(135deg, #0a84ff, #0056b3);box-shadow: 0 12px 25px rgba(10,132,255,0.3); justify-content:center; border: none; border-radius: 18px;">Postularme ahora <i class="fas fa-paper-plane" style="margin-left:10px;"></i></button>
                </div>

                <!-- Columna Derecha: Información Detallada -->
                <div style="flex:1.6;min-width:320px;padding:45px 40px;display:flex;flex-direction:column;gap:36px;">
                    <!-- Salario Destacado -->
                    <div>
                        <div style="font-size:0.75rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:10px;">Salario Ofrecido <div style="flex:1;height:1px;background:linear-gradient(90deg, rgba(255,255,255,0.1), transparent);"></div></div>
                        <div style="font-size:2.6rem;font-weight:900;color:#fff;text-shadow: 0 5px 15px rgba(0,0,0,0.3); letter-spacing: -1px;">${item.salario && (item.salario.toString().includes('Q') || item.salario.toString().includes('$')) ? item.salario : 'Q ' + (item.salario || '0')}</div>
                    </div>

                    <!-- Descripción -->
                    <div>
                        <div style="font-size:0.75rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;font-weight:800;margin-bottom:14px;display:flex;align-items:center;gap:10px;">Descripción del Puesto <div style="flex:1;height:1px;background:linear-gradient(90deg, rgba(255,255,255,0.1), transparent);"></div></div>
                        <div style="color:rgba(255,255,255,0.85);line-height:1.8;font-size:0.95rem;background:rgba(0,0,0,0.25);padding:24px;border-radius:20px;border:1px solid rgba(255,255,255,0.04);">${item.descripcion || 'No hay más información disponible.'}</div>
                    </div>

                    <!-- Requisitos y Beneficios en Grid -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:30px;">
                        <div>
                            <div style="font-size:0.68rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.8px;font-weight:800;margin-bottom:12px;border-left:3px solid #0a84ff;padding-left:12px;">Requisitos Clave</div>
                            <div style="color:rgba(255,255,255,0.75);font-size:0.88rem;line-height:1.7;">${requisitos}</div>
                        </div>
                        <div>
                            <div style="font-size:0.68rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.8px;font-weight:800;margin-bottom:12px;border-left:3px solid #0a84ff;padding-left:12px;">Lo que Ofrecemos</div>
                            <div style="color:rgba(255,255,255,0.75);font-size:0.88rem;line-height:1.7;">${beneficios}</div>
                        </div>
                    </div>

                    <!-- Footer de Modal -->
                    <div style="margin-top:auto;padding-top:24px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.08);">
                        <div style="font-size:0.72rem;color:rgba(255,255,255,0.3);font-weight:600; font-family: monospace;">REF: JOB-${item.id}VTRX</div>
                        <button onclick="closeJobDetailsModal()" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;cursor:pointer;transition:0.2s; padding: 8px 16px; border-radius: 12px;">Cerrar Ventana</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
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
    document.body.style.overflow = 'hidden';
    Object.assign(modal.style, { position: 'fixed', inset: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '10000', padding: '20px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' });
    modal.innerHTML = `
        <div class="glass" style="margin:auto; width:min(760px,95%); max-height: 80vh; overflow-y: auto; overscroll-behavior: contain; border:1.5px solid rgba(255,215,0,0.3); box-shadow: 0 25px 80px rgba(0,0,0,0.8); border-radius: 28px;">
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
                            <span style="text-align:left;">Ubicación: <strong>${cv.ubicacion || 'Ubicación no ingresada'}</strong></span>
                        </div>
                        <div style="background:rgba(255,255,255,0.04);padding:10px 15px;border-radius:12px;font-size:0.85rem;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.05);">
                            <i class="fas fa-star" style="color:var(--gold);"></i>
                            <span style="text-align:left;">Exp: <strong>${cv.experiencia || '3+ años'}</strong></span>
                        </div>
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
                        <div style="font-size:2.4rem;font-weight:900;color:#fff;text-shadow: 0 0 20px rgba(255,255,255,0.1);">${cv.moneda && (cv.moneda === 'Q' || cv.moneda === '$') ? cv.moneda : 'Q'} ${item.salario_deseado != null ? ('' + item.salario_deseado) : '0'}</div>
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
                        <div>
                            <div style="font-size:0.7rem;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px;">Portafolio</div>
                            <a href="${cv.link || '#'}" target="_blank" style="color:var(--gold);font-weight:700;text-decoration:none;"><i class="fas fa-external-link-alt" style="margin-right:8px;"></i>Ver enlace</a>
                        </div>
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
                        <div style="margin-bottom:20px;"><div class="input-group" style="margin:0;"><i class="fas fa-envelope" style="color:rgba(10,132,255,0.5);"></i><input type="email" name="correo" placeholder="Correo electrónico" required style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); color:#fff; padding-top:16px; padding-bottom:16px;"></div></div>
                        <div style="margin-bottom:32px;"><div class="input-group" style="margin:0;"><i class="fas fa-lock" style="color:rgba(10,132,255,0.5);"></i><input type="password" name="password" placeholder="Contraseña" required style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); color:#fff; padding-top:16px; padding-bottom:16px; padding-right:50px;">
                            <div class="password-toggle" onclick="togglePass('password')"><i class="fas fa-eye"></i></div>
                        </div></div>
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
                        <div style="margin-bottom:20px;"><div class="input-group" style="margin:0;"><i class="fas fa-user" style="color:rgba(10,132,255,0.5);"></i><input name="nombre" placeholder="Nombre completo" required style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); color:#fff; padding-top:16px; padding-bottom:16px;"></div></div>
                        <div style="margin-bottom:20px;"><div class="input-group" style="margin:0;"><i class="fas fa-envelope" style="color:rgba(10,132,255,0.5);"></i><input name="correo" type="email" placeholder="Correo electrónico" required style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); color:#fff; padding-top:16px; padding-bottom:16px;"></div></div>
                        <div style="margin-bottom:20px;"><div class="input-group" style="margin:0;"><i class="fas fa-key" style="color:rgba(10,132,255,0.5);"></i><input name="password" type="password" placeholder="Contraseña" required style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); color:#fff; padding-top:16px; padding-bottom:16px; padding-right:50px;">
                            <div class="password-toggle" onclick="togglePass('password')"><i class="fas fa-eye"></i></div>
                        </div></div>
                        <div style="margin-bottom:24px;"><div class="input-group" style="margin:0;"><i class="fas fa-key" style="color:rgba(10,132,255,0.5);"></i><input name="confirm_password" type="password" placeholder="Confirmar contraseña" required style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); color:#fff; padding-top:16px; padding-bottom:16px; padding-right:50px;">
                            <div class="password-toggle" onclick="togglePass('confirm_password')"><i class="fas fa-eye"></i></div>
                        </div></div>
                        
                        <div style="margin-bottom:28px; display: flex; align-items: flex-start; gap: 12px; padding: 0 10px;">
                            <input type="checkbox" id="terminos" name="terminos" required style="width: 20px; height: 20px; cursor: pointer; accent-color: #0a84ff; margin-top:2px; flex-shrink:0;">
                            <label for="terminos" style="font-size: 0.88rem; color: rgba(255,255,255,0.6); cursor: pointer; line-height:1.4;">Soy <strong>mayor de edad (18+)</strong> y acepto los términos. Los menores no pueden registrarse.</label>
                        </div>

                        <div style="margin-bottom:32px;">
                            <label style="display:block; font-size:0.72rem; color:#0a84ff; text-transform:uppercase; letter-spacing:1.2px; font-weight:700; margin-bottom:12px; margin-left:14px;">¿Cómo quieres usar la plataforma?</label>
                            <div class="input-group" style="margin:0;"><i class="fas fa-user-tag"></i>
                                <select name="rol" required style="width:100%;padding:15px 18px 15px 48px;border-radius:22px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#fff; cursor:pointer;">
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
                    ${currentUser.rol === 'usuario' ? `<button onclick="render('misPostulaciones')" class="btn-premium btn-ghost" style="padding:8px 16px;font-size:0.82rem;"><i class="fas fa-file-alt"></i> Postulaciones</button>` : ''}
                    <button onclick="render('soporte')" class="btn-premium btn-ghost" style="padding:8px 16px;font-size:0.82rem;"><i class="fas fa-headset"></i> Ayuda</button>
                    <button onclick="logout()" class="btn-premium" style="padding:8px 16px;font-size:0.82rem;background:rgba(255,59,48,0.15);border:1px solid rgba(255,59,48,0.25);box-shadow:none;color:#ff6b63;"><i class="fas fa-sign-out-alt"></i> Salir</button>
                </div>
            </nav>
            <div style="max-width:1400px;margin:auto;padding:32px 24px;">
                ${currentUser.rol === 'usuario' ? `
                <div class="fab btn-yellow-gradient" onclick="openCVModal()" title="Actualizar perfil profesional">
                    <i class="fas fa-id-card"></i>
                </div>` : ''}
                ${currentUser.rol === 'empresa' ? `
                <div style="margin-bottom:28px;display:flex;justify-content:center;">
                    <button onclick="openPublicarAnuncio()" class="btn-premium" style="background:#0a84ff;border:1px solid rgba(10,132,255,0.25);padding:12px 22px;">
                        <i class="fas fa-plus" style="margin-right:8px;"></i> Publicar anuncio
                    </button>
                </div>` : ''}
                <div class="grid">
                    ${feedItems.map((item, i) => {
                        if(item.itemType === 'job') {
                            const hasEmpFoto = item.empresa_foto && item.empresa_foto !== 'default.jpg';
                            const empresaFoto = (item.empresa_foto && item.empresa_foto.startsWith('http')) ? item.empresa_foto : `${BASE_URL}/uploads/` + (item.empresa_foto || 'default.jpg');
                            const isDisponible = getJobStatus(item.id) === 'disponible';
                            const isOwner = currentUser && String(currentUser.id) === String(item.empresa_id);
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
                                        <div style="font-size:2.2rem;font-weight:900;color:#fff;line-height:1;letter-spacing:-1px;text-shadow: 0 0 15px rgba(255,255,255,0.15);">${item.salario && (item.salario.toString().includes('Q') || item.salario.toString().includes('$')) ? item.salario : 'Q ' + (item.salario || '0')}</div>
                                    </div>

                                    <!-- Separador -->
                                    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);margin:${isOwner ? '18px' : '14px'} 0;"></div>

                                    <!-- Botones -->
                                    <div style="display:grid;gap:10px;">
                                        <button onclick="openJobDetails(${item.id})" class="btn-premium" style="width:100%;padding:14px;font-size:0.88rem;">
                                            <i class="fas fa-paper-plane"></i> Postularme
                                        </button>
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
                                        <div style="font-size:0.65rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;font-weight:700;">Salario esperado</div>
                                        <div style="font-size:0.8rem;color:rgba(255,255,255,0.5);font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:28px;"><i class="fas fa-map-marker-alt" style="color:#0a84ff;"></i> ${cv.ubicacion || 'Ubicación no ingresada'}</div>
                                        <div style="font-size:2.2rem;font-weight:900;color:#fff;line-height:1;letter-spacing:-1px;text-shadow: 0 0 15px rgba(255,255,255,0.15);">${cv.moneda && (cv.moneda === 'Q' || cv.moneda === '$') ? cv.moneda : 'Q'} ${item.salario_deseado != null ? ('' + item.salario_deseado) : '0'}</div>
                                    </div>

                                    <!-- Separador -->
                                    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,0,0.15),transparent);margin:${isOwner ? '18px' : '14px'} 0;"></div>

                                    <!-- Botones -->
                                    <div style="display:grid;gap:10px;">
                                        <button onclick="openCandidateDetails(${item.id})" class="btn-premium btn-yellow-gradient" style="width:100%;padding:14px;font-size:0.88rem;">
                                            <i class="fas fa-user-check"></i> Ver Talento
                                        </button>
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
        `;

    // ── MIS POSTULACIONES ──
    } else if (view === 'misPostulaciones') {
        try {
            const res = await fetch(`${API_URL}/mis-postulaciones`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const misApps = await res.json();
            app.innerHTML = `
                <nav class="navbar">
                    <div class="logo">WorkFlow <i class="fas fa-bolt" style="color:#0a84ff;"></i></div>
                    <div style="display:flex;gap:10px;">
                        <button onclick="render('dashboard')" class="btn-premium btn-ghost" style="padding:9px 18px;font-size:0.85rem;">
                            <i class="fas fa-home"></i> Inicio
                        </button>
                    </div>
                </nav>
                <div style="max-width:900px;margin:40px auto;padding:0 20px;">
                    <div style="margin-bottom:24px;">
                        <h2 style="font-size:1.6rem;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px;">
                            <i class="fas fa-paper-plane" style="color:#0a84ff;margin-right:8px;"></i>Mis Postulaciones
                        </h2>
                        <p style="color:rgba(255,255,255,0.45);font-size:0.88rem;">${misApps.length} postulación${misApps.length !== 1 ? 'es' : ''} registrada${misApps.length !== 1 ? 's' : ''}</p>
                    </div>
                    ${misApps.length ? misApps.map((a, i) => `
                        <div class="glass" style="padding:22px 26px;border-left:3px solid #0a84ff;border-radius:20px;margin-bottom:14px;animation-delay:${i * 0.05}s;">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
                                <div>
                                    <h3 style="font-size:1rem;font-weight:700;color:#fff;margin-bottom:8px;">${a.titulo}</h3>
                                    <div class="info-row" style="margin-bottom:6px;"><i class="fas fa-building"></i> ${a.empresa_nombre}</div>
                                    <div class="info-row"><i class="fas fa-calendar-alt"></i> Aplicado el ${new Date(a.fecha_postulacion).toLocaleDateString('es-GT', {day:'numeric',month:'long',year:'numeric'})}</div>
                                </div>
                                <span class="badge">${a.modalidad || 'Presencial'}</span>
                            </div>
                        </div>
                    `).join('') : `
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
        } catch (err) { render('dashboard'); }

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
                            <div class="input-group"><i class="fas fa-lock"></i><input name="password" type="password" placeholder="Nueva contraseña (opcional)" autocomplete="new-password"></div>
                            <div class="input-group"><i class="fas fa-lock"></i><input name="confirm_password" type="password" placeholder="Confirmar nueva contraseña" autocomplete="new-password"></div>
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
            <div style="max-width:640px;margin:40px auto;padding:0 20px;">
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

    if (currentUser) render('dashboard');
    else render('login');
};