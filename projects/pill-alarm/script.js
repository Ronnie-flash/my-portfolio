let meds = [];
let packs = [];
let history = [];
let activeTab = 'single';
let activeNav = 'med';

let btnAdd = document.getElementById('btnAdd');
let modalOverlay = document.getElementById('modalOverlay');
let btnCancel = document.getElementById('btnCancel');
let medForm = document.getElementById('medForm');
let medList = document.getElementById('medList');
let modalTitle = document.getElementById('modalTitle');
let editingId = null;

let medMaxTimes = document.getElementById('medMaxTimes');
let completeActionGroup = document.getElementById('completeActionGroup');

let btnAddPack = document.getElementById('btnAddPack');
let packModalOverlay = document.getElementById('packModalOverlay');
let packForm = document.getElementById('packForm');
let packModalTitle = document.getElementById('packModalTitle');
let btnCancelPack = document.getElementById('btnCancelPack');
let packMedRows = document.getElementById('packMedRows');
let btnAddPackMed = document.getElementById('btnAddPackMed');
let packIntervalGroup = document.getElementById('packIntervalGroup');
let packMaxTimes = document.getElementById('packMaxTimes');
let packCompleteActionGroup = document.getElementById('packCompleteActionGroup');
let remindRadios = document.querySelectorAll('input[name="remindMode"]');
let editingPackId = null;

let APP_VERSION = '2026.07.16.3';
let checkInterval;
let userName = localStorage.getItem('userName') || '';

// === Welcome Modal ===
var welcomeOverlay = document.getElementById('welcomeOverlay');
var welcomeForm = document.getElementById('welcomeForm');
var userNameInput = document.getElementById('userNameInput');
var headerGreeting = document.getElementById('headerGreeting');
var greetingLine1 = document.getElementById('greetingLine1');
var headerVersion = document.getElementById('headerVersion');

function showGreeting() {
    headerVersion.textContent = 'v' + APP_VERSION;
    if (userName) {
        headerGreeting.style.display = '';
        greetingLine1.textContent = '你好，' + userName;
    } else {
        headerGreeting.style.display = 'none';
    }
}

function showWelcome() {
    welcomeOverlay.classList.add('show');
    setTimeout(function() { userNameInput.focus(); }, 300);
}

welcomeForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var name = userNameInput.value.trim();
    if (!name) return;
    userName = name;
    localStorage.setItem('userName', userName);
    welcomeOverlay.classList.remove('show');
    showGreeting();
});

loadMeds();
loadPacks();
loadHistory();
renderMeds();
renderPacks();
startTimerCheck();
showGreeting();
registerSW();
sendScheduleToSW();

var prevVersion = localStorage.getItem('appVersion');
if (prevVersion && prevVersion !== APP_VERSION) {
    localStorage.setItem('appVersion', APP_VERSION);
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(function(reg) {
            if (reg.waiting) {
                reg.waiting.postMessage({ type: 'skipWaiting' });
            }
        });
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            window.location.reload();
        });
    }
} else if (!prevVersion) {
    localStorage.setItem('appVersion', APP_VERSION);
}

if (!userName) {
    setTimeout(showWelcome, 500);
}

// === Bottom Nav ===
document.querySelectorAll('.nav-item').forEach(function(n) {
    n.addEventListener('click', function() {
        activeNav = n.dataset.nav;
        document.querySelectorAll('.nav-item').forEach(function(x) { x.classList.toggle('active', x === n); });
        document.getElementById('medSection').style.display = activeNav === 'med' ? '' : 'none';
        document.getElementById('analyticsSection').style.display = activeNav === 'analytics' ? '' : 'none';
        if (activeNav === 'analytics') renderAnalytics();
    });
});

// === Inner Tabs ===
document.querySelectorAll('.tab').forEach(function(t) {
    t.addEventListener('click', function() {
        activeTab = t.dataset.tab;
        document.querySelectorAll('.tab').forEach(function(x) { x.classList.toggle('active', x === t); });
        document.getElementById('tabSingle').classList.toggle('active', activeTab === 'single');
        document.getElementById('tabPack').classList.toggle('active', activeTab === 'pack');
        document.getElementById('tabArchive').classList.toggle('active', activeTab === 'archive');
        if (activeTab === 'pack') renderPacks();
        if (activeTab === 'archive') renderArchived();
    });
});

// === Event Listeners (Single Med) ===
btnAdd.addEventListener('click', function () { openModal(); });
btnCancel.addEventListener('click', function () { closeModal(); });
modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
});
medForm.addEventListener('submit', function (e) {
    e.preventDefault();
    saveMed();
});
medMaxTimes.addEventListener('input', function () {
    var val = parseInt(this.value) || 0;
    completeActionGroup.style.display = val > 0 ? '' : 'none';
});

packMaxTimes.addEventListener('input', function () {
    var val = parseInt(this.value) || 0;
    packCompleteActionGroup.style.display = val > 0 ? '' : 'none';
});

// === Event Listeners (Pack) ===
btnAddPack.addEventListener('click', function () { openPackModal(); });
btnCancelPack.addEventListener('click', function () { closePackModal(); });
packModalOverlay.addEventListener('click', function (e) {
    if (e.target === packModalOverlay) closePackModal();
});
packForm.addEventListener('submit', function (e) {
    e.preventDefault();
    savePack();
});
btnAddPackMed.addEventListener('click', function () { addPackMedRow(); });
remindRadios.forEach(function(r) {
    r.addEventListener('change', function () { togglePackFormMode(this.value); });
});

// === Modal (Single Med) ===
function openModal(med) {
    editingId = null;
    medForm.reset();
    document.getElementById('medInterval').value = 8;
    document.getElementById('medMaxTimes').value = 0;
    completeActionGroup.style.display = 'none';
    modalTitle.textContent = '添加药品';
    if (med) {
        editingId = med.id;
        modalTitle.textContent = '编辑药品';
        document.getElementById('medName').value = med.name;
        document.getElementById('medDosage').value = med.dosage || '';
        document.getElementById('medInterval').value = med.interval;
        document.getElementById('medMaxTimes').value = med.maxTimes || 0;
        document.getElementById('medNotes').value = med.notes || '';
        if (med.maxTimes > 0) {
            completeActionGroup.style.display = '';
            var action = med.completeAction || 'delete';
            var radio = document.querySelector('input[name="completeAction"][value="' + action + '"]');
            if (radio) radio.checked = true;
        }
    }
    modalOverlay.classList.add('show');
}

function closeModal() {
    modalOverlay.classList.remove('show');
    editingId = null;
}

// === Modal (Pack) ===
function togglePackFormMode(mode) {
    packIntervalGroup.classList.toggle('hidden', mode === 'individual');
    document.querySelectorAll('.pm-interval').forEach(function(el) {
        el.style.display = mode === 'individual' ? '' : 'none';
    });
}

function addPackMedRow(data) {
    var mode = document.querySelector('input[name="remindMode"]:checked').value;
    var row = document.createElement('div');
    row.className = 'pack-med-row';
    row.innerHTML =
        '<div class="pack-med-fields">' +
            '<input type="text" class="pm-name" placeholder="药品名" value="' + (data && data.name ? escapeHtml(data.name) : '') + '">' +
            '<input type="text" class="pm-dosage" placeholder="剂量" value="' + (data && data.dosage ? escapeHtml(data.dosage) : '') + '">' +
            '<input type="number" class="pm-interval" placeholder="间隔(小时)" step="0.1" min="0.1" value="' + (data && data.interval ? data.interval : '8') + '" style="display:' + (mode === 'individual' ? '' : 'none') + '">' +
            '<input type="text" class="pm-notes" placeholder="备注" value="' + (data && data.notes ? escapeHtml(data.notes) : '') + '">' +
        '</div>' +
        '<button type="button" class="btn-remove-row">✕</button>';
    row.querySelector('.btn-remove-row').addEventListener('click', function () { row.remove(); });
    packMedRows.appendChild(row);
}

function collectPackMedRows() {
    var rows = [];
    packMedRows.querySelectorAll('.pack-med-row').forEach(function(row) {
        var inputs = row.querySelectorAll('input');
        var name = inputs[0].value.trim();
        if (!name) return;
        rows.push({ name: name, dosage: inputs[1].value.trim(), interval: parseFloat(inputs[2].value) || 8, notes: inputs[3].value.trim() });
    });
    return rows;
}

function resetPackMedRows() { packMedRows.innerHTML = ''; }

function openPackModal(pack) {
    editingPackId = null;
    packForm.reset();
    resetPackMedRows();
    document.querySelector('input[name="remindMode"][value="unified"]').checked = true;
    togglePackFormMode('unified');
    document.getElementById('packInterval').value = 8;
    document.getElementById('packMaxTimes').value = 0;
    packCompleteActionGroup.style.display = 'none';
    packModalTitle.textContent = '添加组合';
    if (pack) {
        editingPackId = pack.id;
        packModalTitle.textContent = '编辑组合';
        document.getElementById('packName').value = pack.name;
        var mode = pack.remindMode || 'unified';
        document.querySelector('input[name="remindMode"][value="' + mode + '"]').checked = true;
        togglePackFormMode(mode);
        if (mode === 'unified') document.getElementById('packInterval').value = pack.interval || 8;
        document.getElementById('packMaxTimes').value = pack.maxTimes || 0;
        if (pack.maxTimes > 0) {
            packCompleteActionGroup.style.display = '';
            var action = pack.completeAction || 'delete';
            var radio = document.querySelector('input[name="packCompleteAction"][value="' + action + '"]');
            if (radio) radio.checked = true;
        }
        if (pack.meds && pack.meds.length > 0) pack.meds.forEach(function(m) { addPackMedRow(m); });
    } else {
        addPackMedRow();
    }
    packModalOverlay.classList.add('show');
}

function closePackModal() {
    packModalOverlay.classList.remove('show');
    editingPackId = null;
}

// === Save / Load (Single Med) ===
function saveMed() {
    var name = document.getElementById('medName').value.trim();
    var dosage = document.getElementById('medDosage').value.trim();
    var interval = parseFloat(document.getElementById('medInterval').value);
    var notes = document.getElementById('medNotes').value.trim();
    var maxTimes = parseInt(document.getElementById('medMaxTimes').value) || 0;
    var completeAction = 'delete';
    if (maxTimes > 0) {
        var selected = document.querySelector('input[name="completeAction"]:checked');
        if (selected) completeAction = selected.value;
    }
    if (!name || !interval || interval <= 0) return;

    if (editingId) {
        var med = meds.find(function (m) { return m.id === editingId; });
        if (med) { med.name = name; med.dosage = dosage; med.interval = interval; med.notes = notes; med.maxTimes = maxTimes; med.completeAction = completeAction; }
    } else {
        var now = Date.now();
        meds.push({
            id: 'med_' + now + '_' + Math.random().toString(36).slice(2, 6),
            name: name, dosage: dosage, interval: interval, notes: notes,
            lastTaken: null, nextDose: null, created: now,
            maxTimes: maxTimes, takenCount: 0, completeAction: completeAction, status: 'active'
        });
    }
    closeModal();
    saveMeds();
    renderMeds();
}

function deleteMed(id) {
    if (!confirm('确定删除该药品？')) return;
    meds = meds.filter(function (m) { return m.id !== id; });
    saveMeds();
    renderMeds();
    if (activeTab === 'archive') renderArchived();
}

function editMed(id) {
    var med = meds.find(function(m) { return m.id === id; });
    if (med) openModal(med);
}

function enableMed(id) {
    var med = meds.find(function(m) { return m.id === id; });
    if (!med) return;
    med.status = 'active';
    med.takenCount = 0;
    med.lastTaken = null;
    med.nextDose = null;
    saveMeds();
    renderArchived();
    renderMeds();
}

function enablePack(id) {
    var pack = packs.find(function(p) { return p.id === id; });
    if (!pack) return;
    pack.status = 'active';
    pack.takenCount = 0;
    pack.lastTaken = null;
    pack.nextDose = null;
    pack.meds.forEach(function(m) { m.lastTaken = null; m.nextDose = null; });
    savePacks();
    renderArchived();
    renderPacks();
}

function saveMeds() { localStorage.setItem('meds', JSON.stringify(meds)); sendScheduleToSW(); }

function loadMeds() {
    var data = localStorage.getItem('meds');
    if (data) { try { meds = JSON.parse(data); } catch (e) { meds = []; } }
    meds.forEach(function(m) {
        if (m.maxTimes === undefined) m.maxTimes = 0;
        if (m.takenCount === undefined) m.takenCount = 0;
        if (m.completeAction === undefined) m.completeAction = 'delete';
        if (m.status === undefined) m.status = 'active';
    });
}

// === Save / Load (Pack) ===
function savePack() {
    var name = document.getElementById('packName').value.trim();
    if (!name) return;
    var mode = document.querySelector('input[name="remindMode"]:checked').value;
    var medsData = collectPackMedRows();
    if (medsData.length === 0) return;
    var interval = mode === 'unified' ? parseFloat(document.getElementById('packInterval').value) : null;
    if (mode === 'unified' && (!interval || interval <= 0)) return;

    var packMaxTimesVal = parseInt(document.getElementById('packMaxTimes').value) || 0;
    var packCompleteAction = 'delete';
    if (packMaxTimesVal > 0) {
        var selected = document.querySelector('input[name="packCompleteAction"]:checked');
        if (selected) packCompleteAction = selected.value;
    }

    if (editingPackId) {
        var pack = packs.find(function(p) { return p.id === editingPackId; });
        if (pack) { pack.name = name; pack.remindMode = mode; pack.interval = interval; pack.maxTimes = packMaxTimesVal; pack.completeAction = packCompleteAction;
            pack.meds = medsData.map(function(m, i) {
                var old = pack.meds[i] || {};
                return { id: old.id || 'pmed_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name: m.name, dosage: m.dosage, interval: m.interval, notes: m.notes, lastTaken: old.lastTaken || null, nextDose: old.nextDose || null };
            });
        }
    } else {
        var now = Date.now();
        packs.push({
            id: 'pack_' + now + '_' + Math.random().toString(36).slice(2, 6), name: name, remindMode: mode, interval: interval,
            maxTimes: packMaxTimesVal, takenCount: 0, completeAction: packCompleteAction, status: 'active',
            meds: medsData.map(function(m) {
                return { id: 'pmed_' + now + '_' + Math.random().toString(36).slice(2, 6), name: m.name, dosage: m.dosage, interval: m.interval, notes: m.notes, lastTaken: null, nextDose: null };
            }), lastTaken: null, nextDose: null, created: now
        });
    }
    closePackModal();
    savePacks();
    renderPacks();
}

function deletePack(id) {
    if (!confirm('确定删除该组合？')) return;
    packs = packs.filter(function(p) { return p.id !== id; });
    savePacks();
    renderPacks();
    if (activeTab === 'archive') renderArchived();
}

function editPack(id) {
    var pack = packs.find(function(p) { return p.id === id; });
    if (pack) openPackModal(pack);
}

function savePacks() { localStorage.setItem('packs', JSON.stringify(packs)); sendScheduleToSW(); }

function loadPacks() {
    var data = localStorage.getItem('packs');
    if (data) { try { packs = JSON.parse(data); } catch (e) { packs = []; } }
    packs.forEach(function(p) {
        if (p.maxTimes === undefined) p.maxTimes = 0;
        if (p.takenCount === undefined) p.takenCount = 0;
        if (p.completeAction === undefined) p.completeAction = 'delete';
        if (p.status === undefined) p.status = 'active';
    });
}

// === History ===
function addHistory(medId, medName, dosage, takenAt, scheduledFor, type, packName) {
    var delay = scheduledFor ? takenAt - scheduledFor : null;
    history.push({
        id: 'hist_' + takenAt + '_' + Math.random().toString(36).slice(2, 6),
        medId: medId, medName: medName, dosage: dosage || '',
        takenAt: takenAt, scheduledFor: scheduledFor, delay: delay,
        type: type, packName: packName || ''
    });
    if (history.length > 500) history = history.slice(-500);
    saveHistory();
}

function saveHistory() { localStorage.setItem('history', JSON.stringify(history)); }

function loadHistory() {
    var data = localStorage.getItem('history');
    if (data) { try { history = JSON.parse(data); } catch (e) { history = []; } }
}

// === Taken Actions (Single Med) ===
function takeMed(id) {
    var med = meds.find(function (m) { return m.id === id; });
    if (!med) return;
    var now = Date.now();
    addHistory(med.id, med.name, med.dosage, now, med.nextDose, 'single');
    med.lastTaken = now;
    med.nextDose = now + med.interval * 60 * 60 * 1000;
    med.takenCount = (med.takenCount || 0) + 1;

    if (med.maxTimes > 0 && med.takenCount >= med.maxTimes) {
        med.nextDose = null;
        if (med.completeAction === 'delete') {
            meds = meds.filter(function(m) { return m.id !== id; });
        } else {
            med.status = 'archived';
        }
    }
    saveMeds();
    renderMeds();
    if (activeTab === 'archive') renderArchived();
}

// === Taken Actions (Pack) ===
function takePack(id) {
    var pack = packs.find(function(p) { return p.id === id; });
    if (!pack || pack.remindMode !== 'unified') return;
    var now = Date.now();
    for (var med of pack.meds) {
        addHistory(med.id, med.name, med.dosage, now, med.nextDose, 'pack', pack.name);
        med.lastTaken = now;
        med.nextDose = now + med.interval * 60 * 60 * 1000;
    }
    pack.lastTaken = now;
    pack.nextDose = now + pack.interval * 60 * 60 * 1000;
    pack.takenCount = (pack.takenCount || 0) + 1;

    if (pack.maxTimes > 0 && pack.takenCount >= pack.maxTimes) {
        pack.nextDose = null;
        if (pack.completeAction === 'delete') {
            packs = packs.filter(function(p) { return p.id !== id; });
        } else {
            pack.status = 'archived';
        }
    }

    savePacks();
    renderPacks();
}

function takePackMed(packId, medId) {
    var pack = packs.find(function(p) { return p.id === packId; });
    if (!pack) return;
    var med = pack.meds.find(function(m) { return m.id === medId; });
    if (!med) return;
    var now = Date.now();
    addHistory(med.id, med.name, med.dosage, now, med.nextDose, 'pack_med', pack.name);
    med.lastTaken = now;
    med.nextDose = now + med.interval * 60 * 60 * 1000;
    pack.takenCount = (pack.takenCount || 0) + 1;

    if (pack.maxTimes > 0 && pack.takenCount >= pack.maxTimes) {
        if (pack.completeAction === 'delete') {
            packs = packs.filter(function(p) { return p.id !== packId; });
        } else {
            pack.status = 'archived';
            pack.nextDose = null;
        }
    }

    savePacks();
    renderPacks();
}

// === Render (Single Med) ===
function renderMeds() {
    var active = meds.filter(function(m) { return m.status === 'active'; });
    if (active.length === 0) { medList.innerHTML = '<p class="empty-msg">还没有药品，点上方按钮添加</p>'; return; }
    var html = [];
    for (var med of active) { html.push(renderCard(med)); }
    medList.innerHTML = html.join('');
}

function renderCard(med) {
    var now = Date.now();
    var statusText, countdownText, countdownClass, canTake;

    if (med.nextDose && med.nextDose > now) {
        var diff = med.nextDose - now;
        var hours = Math.floor(diff / (1000 * 60 * 60));
        var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        var secs = Math.floor((diff % (1000 * 60)) / 1000);
        statusText = '下次服药倒计时'; countdownText = pad(hours) + ':' + pad(mins) + ':' + pad(secs); countdownClass = ''; canTake = false;
    } else if (med.nextDose && med.nextDose <= now) {
        var diff = now - med.nextDose;
        var hours = Math.floor(diff / (1000 * 60 * 60));
        var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        statusText = hours > 0 ? '已超时 ' + hours + ' 小时 ' + mins + ' 分钟' : '已超时 ' + mins + ' 分钟';
        countdownText = '🔔 该吃药了！'; countdownClass = 'overdue'; canTake = true;
    } else {
        statusText = '等待开始'; countdownText = '点击下方按钮开始计时'; countdownClass = ''; canTake = true;
    }

    var dosageHtml = med.dosage ? '<span class="med-dosage">' + escapeHtml(med.dosage) + '</span>' : '';
    var notesHtml = med.notes ? '<div class="med-notes">' + escapeHtml(med.notes) + '</div>' : '';
    var takenHtml = med.maxTimes > 0 ? '<div class="taken-progress">已吃 ' + (med.takenCount || 0) + '/' + med.maxTimes + ' 次</div>' : '';

    return '<div class="med-card" data-id="' + med.id + '">' +
        '<div class="med-card-header"><span class="med-name">' + escapeHtml(med.name) + dosageHtml + '</span></div>' +
        notesHtml +
        '<div class="med-timer"><div class="status">' + statusText + '</div><div class="countdown ' + countdownClass + '" id="cd_' + med.id + '">' + countdownText + '</div>' + takenHtml + '</div>' +
        '<div class="med-card-actions">' +
            '<button class="btn-taken" onclick="takeMed(\'' + med.id + '\')"' + (canTake ? '' : ' disabled') + '>✅ 已吃</button>' +
            '<button class="btn-edit" onclick="editMed(\'' + med.id + '\')">✏️</button>' +
            '<button class="btn-delete" onclick="deleteMed(\'' + med.id + '\')">🗑️</button>' +
        '</div></div>';
}

// === Render (Archive) ===
function renderArchived() {
    var archivedMeds = meds.filter(function(m) { return m.status === 'archived'; });
    var archivedPacks = packs.filter(function(p) { return p.status === 'archived'; });
    var el = document.getElementById('archiveList');
    if (archivedMeds.length === 0 && archivedPacks.length === 0) { el.innerHTML = '<p class="empty-msg">暂无存档</p>'; return; }
    var html = [];
    if (archivedMeds.length > 0) {
        html.push('<div class="analytics-subtitle">存档药品</div>');
        for (var med of archivedMeds) { html.push(renderArchiveMedCard(med)); }
    }
    if (archivedPacks.length > 0) {
        html.push('<div class="analytics-subtitle" style="margin-top:12px;">存档组合</div>');
        for (var pack of archivedPacks) { html.push(renderArchivePackCard(pack)); }
    }
    el.innerHTML = html.join('');
}

function renderArchiveMedCard(med) {
    var dosageHtml = med.dosage ? '<span class="med-dosage">' + escapeHtml(med.dosage) + '</span>' : '';
    var notesHtml = med.notes ? '<div class="med-notes">' + escapeHtml(med.notes) + '</div>' : '';
    var infoHtml = '每 ' + med.interval + ' 小时' + (med.maxTimes > 0 ? ' · ' + med.maxTimes + ' 次疗程' : '');
    return '<div class="med-card archived">' +
        '<div class="med-card-header"><span class="med-name">' + escapeHtml(med.name) + dosageHtml + '</span><span class="archived-badge">📦 已存档</span></div>' +
        notesHtml +
        '<div class="med-notes" style="color:#aaa;font-size:0.78rem;">' + infoHtml + '</div>' +
        '<div class="med-card-actions">' +
            '<button class="btn-taken" onclick="enableMed(\'' + med.id + '\')">▶ 启用</button>' +
            '<button class="btn-delete" onclick="deleteMed(\'' + med.id + '\')">🗑️ 删除</button>' +
        '</div></div>';
}

function renderArchivePackCard(pack) {
    var medNames = pack.meds.map(function(m) { return m.name; }).join('、');
    var infoHtml = '包含 ' + medNames + (pack.interval ? ' · 每 ' + pack.interval + ' 小时' : '') + (pack.maxTimes > 0 ? ' · ' + pack.maxTimes + ' 次疗程' : '');
    return '<div class="med-card archived">' +
        '<div class="med-card-header"><span class="med-name">📦 ' + escapeHtml(pack.name) + '</span><span class="archived-badge">📦 已存档</span></div>' +
        '<div class="med-notes" style="color:#aaa;font-size:0.78rem;">' + infoHtml + '</div>' +
        '<div class="med-card-actions">' +
            '<button class="btn-taken" onclick="enablePack(\'' + pack.id + '\')">▶ 启用</button>' +
            '<button class="btn-delete" onclick="deletePack(\'' + pack.id + '\')">🗑️ 删除</button>' +
        '</div></div>';
}

function renderPacks() {
    if (packs.length === 0) { document.getElementById('packList').innerHTML = '<p class="empty-msg">还没有组合，点上方按钮添加</p>'; return; }
    var html = [];
    for (var pack of packs) { html.push(renderPackCard(pack)); }
    document.getElementById('packList').innerHTML = html.join('');
}

function renderPackCard(pack) {
    var now = Date.now();
    var html = '<div class="pack-card" data-id="' + pack.id + '">' +
        '<div class="pack-card-header"><span class="pack-name">' + escapeHtml(pack.name) + '</span><span class="pack-badge ' + pack.remindMode + '">' + (pack.remindMode === 'unified' ? '统一提醒' : '分别提醒') + '</span></div>' +
        '<div class="pack-med-items">';

    if (pack.remindMode === 'unified') {
        for (var med of pack.meds) {
            html += '<div class="pack-med-item"><span><span class="pmi-name">' + escapeHtml(med.name) + '</span>' + (med.dosage ? '<span class="pmi-dosage">· ' + escapeHtml(med.dosage) + '</span>' : '') + '</span></div>';
        }
        var statusText, countdownText, countdownClass, canTake;
        if (pack.nextDose && pack.nextDose > now) {
            var diff = pack.nextDose - now;
            var hours = Math.floor(diff / (1000 * 60 * 60));
            var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            var secs = Math.floor((diff % (1000 * 60)) / 1000);
            statusText = '下次服药倒计时'; countdownText = pad(hours) + ':' + pad(mins) + ':' + pad(secs); countdownClass = ''; canTake = false;
        } else if (pack.nextDose && pack.nextDose <= now) {
            var diff = now - pack.nextDose;
            var hours = Math.floor(diff / (1000 * 60 * 60));
            var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            statusText = hours > 0 ? '已超时 ' + hours + ' 小时 ' + mins + ' 分钟' : '已超时 ' + mins + ' 分钟';
            countdownText = '🔔 该吃药了！'; countdownClass = 'overdue'; canTake = true;
        } else {
            statusText = '等待开始'; countdownText = '点击下方按钮开始计时'; countdownClass = ''; canTake = true;
        }
        var takenHtml = pack.maxTimes > 0 ? '<div class="taken-progress">已吃 ' + (pack.takenCount || 0) + '/' + pack.maxTimes + ' 次</div>' : '';
        html += '</div><div class="pack-timer"><div class="status">' + statusText + '</div><div class="countdown ' + countdownClass + '" id="cd_pack_' + pack.id + '">' + countdownText + '</div>' + takenHtml + '</div>' +
            '<div class="pack-card-actions">' +
            '<button class="btn-taken" onclick="takePack(\'' + pack.id + '\')"' + (canTake ? '' : ' disabled') + '>✅ 已吃</button>' +
            '<button class="btn-edit" onclick="editPack(\'' + pack.id + '\')">✏️</button>' +
            '<button class="btn-delete" onclick="deletePack(\'' + pack.id + '\')">🗑️</button></div>';
    } else {
        for (var med of pack.meds) {
            var medCountdown, medClass, medCanTake;
            if (med.nextDose && med.nextDose > now) {
                var diff = med.nextDose - now;
                var hours = Math.floor(diff / (1000 * 60 * 60));
                var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                var secs = Math.floor((diff % (1000 * 60)) / 1000);
                medCountdown = pad(hours) + ':' + pad(mins) + ':' + pad(secs); medClass = ''; medCanTake = false;
            } else if (med.nextDose && med.nextDose <= now) {
                medCountdown = '🔔 该吃药了！'; medClass = 'overdue'; medCanTake = true;
            } else {
                medCountdown = '--:--:--'; medClass = ''; medCanTake = true;
            }
            html += '<div class="pack-med-item"><span><span class="pmi-name">' + escapeHtml(med.name) + '</span>' + (med.dosage ? '<span class="pmi-dosage">· ' + escapeHtml(med.dosage) + '</span>' : '') + '</span>' +
                '<span class="pmi-status"><span class="pmi-countdown ' + medClass + '" id="cd_pack_' + pack.id + '_' + med.id + '">' + medCountdown + '</span>' +
                '<button class="pmi-take-btn" onclick="takePackMed(\'' + pack.id + '\',\'' + med.id + '\')"' + (medCanTake ? '' : ' disabled') + '>✅</button></span></div>';
        }
        html += '</div><div class="pack-card-actions">' +
            '<button class="btn-edit" onclick="editPack(\'' + pack.id + '\')">✏️ 编辑</button>' +
            '<button class="btn-delete" onclick="deletePack(\'' + pack.id + '\')">🗑️</button></div>';
    }
    return html + '</div>';
}

// === Timer Check ===
var shownNotifs = new Set();

function startTimerCheck() {
    if (checkInterval) clearInterval(checkInterval);
    checkNotifications();
    checkInterval = setInterval(function () { checkNotifications(); updateCountdowns(); }, 1000);
}

document.addEventListener('visibilitychange', function () {
    if (!document.hidden) checkNotifications();
});

function checkNotifications() {
    if (Notification.permission !== 'granted') return;
    var now = Date.now();
    var prefix = userName ? userName + '，' : '';
    var maxAge = 86400000;

    for (var med of meds) {
        if (med.status !== 'active') continue;
        if (med.nextDose && med.nextDose <= now) {
            var tag = med.id + '_' + med.nextDose;
            if (shownNotifs.has(tag)) continue;
            if (now - med.nextDose > maxAge) continue;
            shownNotifs.add(tag);
            var body = med.name + (med.dosage ? ' · ' + med.dosage : '') + (med.notes ? '\n' + med.notes : '');
            if (med.maxTimes > 0) body += '\n（已吃 ' + (med.takenCount || 0) + '/' + med.maxTimes + ' 次）';
            new Notification('💊 ' + prefix + '该吃' + med.name + '了！', { body: body, tag: tag, requireInteraction: true });
        }
    }
    for (var pack of packs) {
        if (pack.status !== 'active') continue;
        if (pack.remindMode === 'unified') {
            if (pack.nextDose && pack.nextDose <= now) {
                var tag = pack.id + '_' + pack.nextDose;
                if (shownNotifs.has(tag)) continue;
                if (now - pack.nextDose > maxAge) continue;
                shownNotifs.add(tag);
                var names = pack.meds.map(function(m) { return m.name + (m.dosage ? ' · ' + m.dosage : ''); }).join('、');
                new Notification('💊 ' + prefix + '该吃' + names + '了！', { body: names, tag: tag, requireInteraction: true });
            }
        } else {
            for (var med of pack.meds) {
                if (med.nextDose && med.nextDose <= now) {
                    var tag = pack.id + '_' + med.id + '_' + med.nextDose;
                    if (shownNotifs.has(tag)) continue;
                    if (now - med.nextDose > maxAge) continue;
                    shownNotifs.add(tag);
                    new Notification('💊 ' + prefix + '该吃' + med.name + '了！', { body: med.name + (med.dosage ? ' · ' + med.dosage : '') + '\n（组合：' + pack.name + '）' + (med.notes ? '\n' + med.notes : ''), tag: tag, requireInteraction: true });
                }
            }
        }
    }
}

function updateCountdowns() {
    var now = Date.now();
    for (var med of meds) {
        if (med.status !== 'active') continue;
        var el = document.getElementById('cd_' + med.id);
        if (!el) continue;
        var card = el.closest('.med-card');
        if (!card) continue;
        if (med.nextDose && med.nextDose > now) {
            var diff = med.nextDose - now;
            var hours = Math.floor(diff / (1000 * 60 * 60));
            var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            var secs = Math.floor((diff % (1000 * 60)) / 1000);
            el.textContent = pad(hours) + ':' + pad(mins) + ':' + pad(secs); el.className = 'countdown';
        } else { el.textContent = '🔔 该吃药了！'; el.className = 'countdown overdue'; }
        var btn = card.querySelector('.btn-taken');
        if (btn) btn.disabled = med.nextDose && med.nextDose > now;
    }
    for (var pack of packs) {
        if (pack.status !== 'active') continue;
        if (pack.remindMode === 'unified') {
            var el = document.getElementById('cd_pack_' + pack.id);
            if (!el) continue;
            if (pack.nextDose && pack.nextDose > now) {
                var diff = pack.nextDose - now;
                var hours = Math.floor(diff / (1000 * 60 * 60));
                var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                var secs = Math.floor((diff % (1000 * 60)) / 1000);
                el.textContent = pad(hours) + ':' + pad(mins) + ':' + pad(secs); el.className = 'countdown';
            } else { el.textContent = '🔔 该吃药了！'; el.className = 'countdown overdue'; }
            var card = el.closest('.pack-card');
            if (card) { var btn = card.querySelector('.btn-taken'); if (btn) btn.disabled = pack.nextDose && pack.nextDose > now; }
        } else {
            for (var med of pack.meds) {
                var el = document.getElementById('cd_pack_' + pack.id + '_' + med.id);
                if (!el) continue;
                if (med.nextDose && med.nextDose > now) {
                    var diff = med.nextDose - now;
                    var hours = Math.floor(diff / (1000 * 60 * 60));
                    var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    var secs = Math.floor((diff % (1000 * 60)) / 1000);
                    el.textContent = pad(hours) + ':' + pad(mins) + ':' + pad(secs); el.className = 'pmi-countdown';
                } else { el.textContent = '🔔 该吃药了！'; el.className = 'pmi-countdown overdue'; }
                var item = el.closest('.pack-med-item');
                if (item) { var btn = item.querySelector('.pmi-take-btn'); if (btn) btn.disabled = med.nextDose && med.nextDose > now; }
            }
        }
    }
}

// === Analytics ===
function renderAnalytics() {
    var el = document.getElementById('analyticsContent');
    if (history.length === 0) {
        el.innerHTML = '<div class="empty-analytics"><div class="big-icon">📊</div><p>暂无用药记录<br>开始吃药后这里会显示统计数据</p></div>';
        return;
    }

    var total = history.length;
    var onTimeCount = 0, lateCount = 0, earlyCount = 0, firstCount = 0;
    var totalDelay = 0;
    var medStats = {};

    var threshold = 30 * 60 * 1000;

    for (var h of history) {
        if (h.delay === null) { firstCount++; continue; }
        if (Math.abs(h.delay) <= threshold) { onTimeCount++; }
        else if (h.delay > 0) { lateCount++; }
        else { earlyCount++; }

        var key = h.medId || h.medName;
        if (!medStats[key]) { medStats[key] = { name: h.medName, total: 0, onTime: 0, delaySum: 0, doseInfo: h.dosage || '' }; }
        medStats[key].total++;
        medStats[key].delaySum += h.delay;
        if (Math.abs(h.delay) <= threshold) medStats[key].onTime++;
    }

    var scored = total - firstCount;
    var onTimeRate = scored > 0 ? Math.round(onTimeCount / scored * 100) : 0;
    var avgDelay = lateCount + earlyCount > 0 ? Math.round(totalDelay / (lateCount + earlyCount) / 60000) : 0;

    // Summary cards
    var html = '<div class="analytics-summary">' +
        '<div class="stat-card"><div class="stat-value">' + total + '</div><div class="stat-label">总服药次数</div></div>' +
        '<div class="stat-card"><div class="stat-value ' + (onTimeRate >= 80 ? '' : onTimeRate >= 50 ? 'caution' : 'warning') + '">' + onTimeRate + '%</div><div class="stat-label">准时率</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + avgDelay + 'm</div><div class="stat-label">平均偏差</div></div>' +
        '</div>';

    // Per medication stats
    var medKeys = Object.keys(medStats);
    if (medKeys.length > 0) {
        html += '<div class="analytics-subtitle">各药品统计</div><div class="analytics-meds">';
        for (var key of medKeys) {
            var ms = medStats[key];
            var rate = ms.total > 0 ? Math.round(ms.onTime / ms.total * 100) : 0;
            var avgM = ms.total > 0 ? Math.round(ms.delaySum / ms.total / 60000) : 0;
            var rateClass = rate >= 80 ? 'good' : rate >= 50 ? 'ok' : 'bad';
            html += '<div class="amed-card">' +
                '<div class="amed-header"><span class="amed-name">' + escapeHtml(ms.name) + (ms.doseInfo ? '<span class="med-dosage"> · ' + escapeHtml(ms.doseInfo) + '</span>' : '') + '</span><span class="amed-rate ' + rateClass + '">' + rate + '%</span></div>' +
                '<div class="amed-detail">已吃 ' + ms.total + ' 次 · 平均 ' + (avgM >= 0 ? '晚 ' : '早 ') + Math.abs(avgM) + ' 分钟</div>' +
                '<div class="amed-bar-bg"><div class="amed-bar-fill" style="width:' + rate + '%"></div></div>' +
                '</div>';
        }
        html += '</div>';
    }

    // Recent history
    var recent = history.slice(-20).reverse();
    html += '<div class="analytics-subtitle">最近记录</div><div class="analytics-history">';
    for (var h of recent) {
        var date = new Date(h.takenAt);
        var timeStr = pad(date.getMonth() + 1) + '/' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
        var icon, statusClass, statusText;
        if (h.delay === null) {
            icon = '🟣'; statusClass = 'first'; statusText = '首次';
        } else if (Math.abs(h.delay) <= threshold) {
            icon = '✅'; statusClass = 'on-time'; statusText = '准时';
        } else if (h.delay > 0) {
            icon = '⚠️'; statusClass = 'late'; statusText = '晚 ' + Math.round(h.delay / 60000) + ' 分钟';
        } else {
            icon = '🔵'; statusClass = 'early'; statusText = '早 ' + Math.round(Math.abs(h.delay) / 60000) + ' 分钟';
        }
        var name = escapeHtml(h.medName) + (h.packName ? '<span style="color:#888;font-weight:400;"> · ' + escapeHtml(h.packName) + '</span>' : '');
        html += '<div class="hist-item">' +
            '<span class="hist-icon">' + icon + '</span>' +
            '<div class="hist-info"><div class="hist-med">' + name + '</div><div class="hist-time">' + timeStr + '</div></div>' +
            '<span class="hist-status ' + statusClass + '">' + statusText + '</span>' +
            '</div>';
    }
    html += '</div>';

    el.innerHTML = html;
}

// === Helpers ===
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

// === Service Worker Registration ===
function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function(err) {
            console.log('SW registration failed:', err);
        });
    }
}

function sendScheduleToSW() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'updateSchedule',
            data: { meds: meds, packs: packs }
        });
    } else if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(function(reg) {
            if (reg.active) {
                reg.active.postMessage({
                    type: 'updateSchedule',
                    data: { meds: meds, packs: packs }
                });
            }
        });
    }
}

// === Request Notification Permission ===
function requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}
if ('Notification' in window) {
    if (Notification.permission === 'default') {
        document.addEventListener('click', function requestNotif() {
            Notification.requestPermission();
        }, { once: true });
    }
}
