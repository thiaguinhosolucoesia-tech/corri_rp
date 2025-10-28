// =================================================================
// ARQUIVO DE LÓGICA PRINCIPAL (V6.1 - Likes em /raceInteractions)
// =================================================================

// --- Variáveis Globais do App ---
let db = {
    races: {}, // Dados das corridas do usuário visualizado
    profile: {} // Dados do perfil do usuário visualizado
};
// Estado da Aplicação V2 (para calendário público)
let appState = {
    rankingData: {},
    resultadosEtapas: {},
    allCorridas: {} // Corridas dos calendários públicos (copaAlcer, geral)
};

let firebaseApp, database, auth, functions; // Adicionado functions para transações
let authUser = null; // Usuário autenticado (ou null)
let currentViewingUid = null; // UID do perfil sendo visualizado atualmente
let isAdmin = false;
let hasRunner2 = false; // Flag para perfil com 2 corredores

// V4/V5 - Constantes de Configuração (serão preenchidas no DOMContentLoaded)
let CLOUDINARY_URL = "";
let CLOUDINARY_PRESET = "";

const RUNNER_1_KEY = "runner1";
const RUNNER_2_KEY = "runner2";

// Perfis padrão, serão sobrescritos pelos dados do Firebase
let RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Corredor 1', emoji: '🏃‍♂️' };
let RUNNER_2_PROFILE = { name: 'Corredora 2', nameShort: 'Corredora 2', emoji: '🏃‍♀️' };

// --- Cache de Elementos DOM (V1 + V2 + V4 + V5) ---
const dom = {
    // V1 (Perfis & Auth)
    btnLogout: document.getElementById('btn-logout'),
    btnBackToPublic: document.getElementById('btn-back-to-public'),
    btnBackToMyDashboard: document.getElementById('btn-back-to-my-dashboard'),
    userInfo: document.getElementById('user-info'),
    userEmail: document.getElementById('user-email'),
    loginOrPublicView: document.getElementById('login-or-public-view'),
    loginView: document.getElementById('login-view'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    loginError: document.getElementById('login-error'),
    loginTitle: document.getElementById('login-title'),
    btnLoginSubmit: document.getElementById('btn-login-submit'),
    btnSignUpSubmit: document.getElementById('btn-signup-submit'),
    loginToggleLink: document.getElementById('login-toggle-link'),
    signupFields: document.getElementById('signup-fields'),
    signupRunner1Name: document.getElementById('signup-runner1-name'),
    signupRunner2Name: document.getElementById('signup-runner2-name'),
    signupTeamName: document.getElementById('signup-team-name'),
    publicView: document.getElementById('public-view'),
    publicProfileListPublic: document.getElementById('public-profile-list-public'),
    publicProfileListLogged: document.getElementById('public-profile-list-logged'),
    userContent: document.getElementById('user-content'),
    headerSubtitle: document.getElementById('header-subtitle'), // Nomes
    prGrid: document.getElementById('pr-grid'),
    summaryGrid: document.getElementById('summary-grid'),
    controlsSection: document.getElementById('controls-section'),
    btnAddnew: document.getElementById('btn-add-new'),
    historyContainer: document.getElementById('history-container'),
    pendingApprovalView: document.getElementById('pending-approval-view'),
    rejectedView: document.getElementById('rejected-view'),
    rejectedEmail: document.getElementById('rejected-email'),

    // V1 (Modal Corrida)
    modal: document.getElementById('race-modal'),
    form: document.getElementById('race-form'),
    modalTitle: document.getElementById('modal-title'),
    btnDelete: document.getElementById('btn-delete'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancel: document.getElementById('btn-cancel'),
    runner1FormGroup: document.getElementById('runner1-form-group'),
    runner2FormGroup: document.getElementById('runner2-form-group'),

    // V2 (Calendário Público)
    copaContainerPublic: document.getElementById('copa-container-public'),
    geralContainerPublic: document.getElementById('geral-container-public'),
    resultadosContainerPublic: document.getElementById('resultados-container-public'),
    copaContainerLogged: document.getElementById('copa-container-logged'),
    geralContainerLogged: document.getElementById('geral-container-logged'),
    resultadosContainerLogged: document.getElementById('resultados-container-logged'),

    // V2 (Modal Resultados)
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitleResults: document.getElementById('modal-title-results'),
    modalContentResults: document.getElementById('modal-content-results'),
    modalSearchInput: document.getElementById('modal-search-input'),
    btnCloseResultsModal: document.getElementById('btn-close-results-modal'),

    // V4 (Modal Mídia)
    mediaModal: document.getElementById('media-modal'),
    mediaForm: document.getElementById('media-form'),
    mediaRaceIdInput: document.getElementById('media-race-id'),
    mediaModalTitle: document.getElementById('media-modal-title'),
    btnCloseMediaModal: document.getElementById('btn-close-media-modal'),
    btnCancelMediaUpload: document.getElementById('btn-cancel-media-upload'),
    btnConfirmMediaUpload: document.getElementById('btn-confirm-media-upload'),
    mediaFileInput: document.getElementById('media-file-input'),
    mediaPreviewContainer: document.getElementById('media-preview-container'),
    mediaPreview: document.getElementById('media-preview'),
    mediaUploadStatus: document.getElementById('media-upload-status'),

    // V5 (Header Detalhado)
    headerProfilePicture: document.getElementById('header-profile-picture'),
    headerLocation: document.getElementById('header-location'),
    headerBio: document.getElementById('header-bio'),
    btnEditProfile: document.getElementById('btn-edit-profile'),

    // V5 (Modal Edição Perfil)
    profileEditModal: document.getElementById('profile-edit-modal'),
    profileEditForm: document.getElementById('profile-edit-form'),
    btnCloseProfileEditModal: document.getElementById('btn-close-profile-edit-modal'),
    btnCancelProfileEdit: document.getElementById('btn-cancel-profile-edit'),
    btnSaveProfileEdit: document.getElementById('btn-save-profile-edit'),
    profileEditRunner1Name: document.getElementById('profile-edit-runner1-name'),
    profileEditRunner2Name: document.getElementById('profile-edit-runner2-name'),
    profileEditRunner2NameSeparator: document.getElementById('profile-edit-runner2-name-separator'),
    profileEditTeam: document.getElementById('profile-edit-team'),
    profileEditBio: document.getElementById('profile-edit-bio'),
    profileEditLocation: document.getElementById('profile-edit-location'),
    profileEditBirthdate: document.getElementById('profile-edit-birthdate'),
    profileEditPictureInput: document.getElementById('profile-edit-picture-input'),
    profileEditPicturePreviewContainer: document.getElementById('profile-edit-picture-preview-container'),
    profileEditPicturePreview: document.getElementById('profile-edit-picture-preview'),
    profilePictureUploadStatus: document.getElementById('profile-picture-upload-status')
};

// ======================================================
// SEÇÃO V1: LÓGICA DE PERFIS DE USUÁRIO (ATUALIZADA V5)
// ======================================================

// --- Funções Utilitárias de Tempo e Pace ---
function timeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':').map(Number).filter(n => !isNaN(n));
    let seconds = 0;
    if (parts.length === 2) { seconds = parts[0] * 60 + parts[1]; }
    else if (parts.length === 3) { seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]; }
    else { return null; }
    return seconds;
}

function secondsToTime(totalSeconds) {
    if (totalSeconds === null || isNaN(totalSeconds) || totalSeconds === Infinity) return 'N/A';
    totalSeconds = Math.round(totalSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num) => String(num).padStart(2, '0');
    return (hours > 0) ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function normalizeTime(timeStr) {
    if (!timeStr) return null;
    const cleanTime = timeStr.replace(/[^0-9:]/g, '');
    const parts = cleanTime.split(':');
    if (parts.length === 2) { return `00:${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`; }
    else if (parts.length === 3) { return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}:${String(parts[2]).padStart(2, '0')}`; }
    return null;
}

function calculatePace(timeStr, distance) {
    const seconds = timeToSeconds(timeStr);
    const dist = parseFloat(distance);
    if (!seconds || !dist || dist <= 0) return 'N/A';
    const paceInSeconds = seconds / dist;
    const paceMinutes = Math.floor(paceInSeconds / 60);
    const paceSeconds = Math.round(paceInSeconds % 60);
    return `${String(paceMinutes).padStart(2, '0')}:${String(paceSeconds).padStart(2, '0')} /km`;
}

// --- Funções de Lógica da Aplicação (V1 + V5) ---

// Atualiza a UI com base nos dados do perfil carregado (db.profile)
function updateProfileUI() {
    const profile = db.profile;
    hasRunner2 = false;

    // Define perfis padrão
    RUNNER_1_PROFILE = { name: 'Corredor 1', nameShort: 'Corredor 1', emoji: '🏃‍♂️' };
    RUNNER_2_PROFILE = { name: 'Corredora 2', nameShort: 'Corredora 2', emoji: '🏃‍♀️' };

    // V5 - Foto de Perfil Padrão
    const defaultProfilePic = 'icons/icon-192x192.png';

    if (profile) {
        if (profile.runner1Name) {
            RUNNER_1_PROFILE = { name: profile.runner1Name, nameShort: profile.runner1Name.split(' ')[0] || "Corredor", emoji: '🏃‍♂️' };
        }
        if (profile.runner2Name && profile.runner2Name.trim() !== "") {
            hasRunner2 = true;
            RUNNER_2_PROFILE = { name: profile.runner2Name, nameShort: profile.runner2Name.split(' ')[0] || "Corredora", emoji: '🏃‍♀️' };
            dom.runner2FormGroup.classList.remove('hidden');
        } else {
            dom.runner2FormGroup.classList.add('hidden');
        }

        // V5 - Atualiza Header com Novos Dados
        dom.headerProfilePicture.src = profile.profilePictureUrl || defaultProfilePic;
        dom.headerLocation.textContent = profile.location || '';
        dom.headerBio.textContent = profile.bio || '';
        dom.headerLocation.classList.toggle('hidden', !profile.location);
        dom.headerBio.classList.toggle('hidden', !profile.bio);

    } else {
        // Caso não haja perfil (raro, mas defensivo)
        dom.runner2FormGroup.classList.add('hidden');
        dom.headerProfilePicture.src = defaultProfilePic;
        dom.headerLocation.textContent = '';
        dom.headerBio.textContent = '';
        dom.headerLocation.classList.add('hidden');
        dom.headerBio.classList.add('hidden');
    }

    // Atualiza nomes no header e nos formulários
    let headerTitle = RUNNER_1_PROFILE.name;
    if (hasRunner2) {
        headerTitle += ` & ${RUNNER_2_PROFILE.name}`;
    }
    dom.headerSubtitle.textContent = headerTitle; // Nomes principais

    dom.runner1FormGroup.querySelector('h4').innerHTML = `${RUNNER_1_PROFILE.name} ${RUNNER_1_PROFILE.emoji}`;
    dom.runner2FormGroup.querySelector('h4').innerHTML = `${RUNNER_2_PROFILE.name} ${RUNNER_2_PROFILE.emoji}`;

    // V5 - Mostra/Esconde botão Editar Perfil
    const canEditProfile = authUser && authUser.uid === currentViewingUid;
    dom.btnEditProfile.classList.toggle('hidden', !canEditProfile);
}


function renderDashboard() {
    const racesArray = Object.values(db.races);
    const prs = { runner1: {}, runner2: {} };
    const distances = [2, 5, 6, 7, 10, 12, 16, 17];

    let totalKmRunner1 = 0, totalKmRunner2 = 0, totalRacesJuntos = 0, completedRacesRunner1 = 0, completedRacesRunner2 = 0;

    distances.forEach(d => {
        prs.runner1[d] = { time: 'N/A', seconds: Infinity };
        prs.runner2[d] = { time: 'N/A', seconds: Infinity };
    });

    racesArray.forEach(race => {
        const runner1Data = race[RUNNER_1_KEY];
        const runner2Data = race[RUNNER_2_KEY];

        if (race.juntos && runner1Data && runner1Data.status === 'completed' && runner2Data && runner2Data.status === 'completed') totalRacesJuntos++;

        if (runner1Data && runner1Data.status === 'completed') {
            completedRacesRunner1++;
            const dist = parseFloat(runner1Data.distance || race.distance);
            const timeSec = timeToSeconds(runner1Data.time);
            if (dist) totalKmRunner1 += dist;
            if (dist && prs.runner1[dist] && timeSec < prs.runner1[dist].seconds) {
                prs.runner1[dist] = { seconds: timeSec, time: secondsToTime(timeSec) };
            }
        }

        if (runner2Data && runner2Data.status === 'completed') {
            completedRacesRunner2++;
            const dist = parseFloat(runner2Data.distance || race.distance);
            const timeSec = timeToSeconds(runner2Data.time);
            if (dist) totalKmRunner2 += dist;
            if (dist && prs.runner2[dist] && timeSec < prs.runner2[dist].seconds) {
                prs.runner2[dist] = { seconds: timeSec, time: secondsToTime(timeSec) };
            }
        }
    });

    dom.prGrid.innerHTML = distances.map(d => {
        const runner2PR_HTML = hasRunner2
            ? `<div class="runner-pr"><strong class="runner-pr-thamis">${RUNNER_2_PROFILE.nameShort}: ${prs.runner2[d].time}</strong></div>`
            : '';

        return `
        <div class="stat-card pr-card">
            <div class="stat-label">PR ${d}km</div>
            <div class="stat-number">
                <div class="runner-pr"><span class="runner-pr-thiago">${RUNNER_1_PROFILE.nameShort}: ${prs.runner1[d].time}</span></div>
                ${runner2PR_HTML}
            </div>
        </div>`;
    }).join('');

    const totalCorridas = completedRacesRunner1 + completedRacesRunner2;
    const totalCorridasLabel = hasRunner2 ? "Corridas Concluídas (Total)" : "Corridas Concluídas";

    const juntosCardHTML = hasRunner2
        ? `<div class="stat-card"><div class="stat-number">${totalRacesJuntos} 👩🏻‍❤️‍👨🏻</div><div class="stat-label">Corridas Juntos</div></div>`
        : '';

    const totalKmCombined = totalKmRunner1 + totalKmRunner2;
    const totalKmCombinedLabel = hasRunner2 ? "Total KM (Casal)" : "Total KM";

    const splitKmCardHTML = hasRunner2
        ? `<div class="stat-card">
            <div class="stat-number">
                <span class="runner-pr-thiago">${totalKmRunner1.toFixed(1)}</span> / <strong class="runner-pr-thamis">${totalKmRunner2.toFixed(1)}</strong>
            </div>
            <div class="stat-label">Total KM (${RUNNER_1_PROFILE.nameShort} / ${RUNNER_2_PROFILE.nameShort})</div>
           </div>`
        : `<div class="stat-card">
            <div class="stat-number">
                ${totalKmRunner1.toFixed(1)} km
            </div>
            <div class="stat-label">Total KM (${RUNNER_1_PROFILE.nameShort})</div>
           </div>`;

    dom.summaryGrid.innerHTML = `
        <div class="stat-card"><div class="stat-number">${totalCorridas}</div><div class="stat-label">${totalCorridasLabel}</div></div>
        ${juntosCardHTML}
        <div class="stat-card"><div class="stat-number">${totalKmCombined.toFixed(1)} km</div><div class="stat-label">${totalKmCombinedLabel}</div></div>
        ${splitKmCardHTML}
    `;
}

function renderHistory() {
    dom.historyContainer.innerHTML = '';
    const sortedRaces = Object.entries(db.races)
        .map(([id, race]) => ({ ...race, id: id }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const racesByYear = sortedRaces.reduce((acc, race) => {
        const year = race.year || new Date(race.date + 'T00:00:00').getFullYear().toString();
        if (!acc[year]) acc[year] = [];
        acc[year].push(race);
        return acc;
    }, {});

    const sortedYears = Object.keys(racesByYear).sort((a, b) => b - a);

    if (sortedYears.length === 0) {
        dom.historyContainer.innerHTML = `<div class="loader">${authUser ? 'Nenhuma corrida encontrada. Clique em "Adicionar Nova Corrida".' : 'Perfil sem corridas.'}</div>`;
        return;
    }

    for (const year of sortedYears) {
        const yearGroup = document.createElement('div');
        yearGroup.className = 'year-group';
        const yearEmoji = year.split('').map(d => ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'][d]).join('');
        yearGroup.innerHTML = `<h2 class="year-title">${yearEmoji} (${racesByYear[year].length} provas)</h2>`;

        const raceList = document.createElement('div');
        raceList.className = 'race-card-list';
        racesByYear[year].forEach(race => raceList.appendChild(createRaceCard(race)));

        yearGroup.appendChild(raceList);
        dom.historyContainer.appendChild(yearGroup);
    }
}

// Cria o HTML para um card de corrida
function createRaceCard(race) {
    const card = document.createElement('div');
    const runner1Data = race[RUNNER_1_KEY];
    const runner2Data = race[RUNNER_2_KEY];

    if (!runner1Data) {
        console.warn("Dados da corrida incompletos (Falta Runner 1):", race);
        return card; // Retorna card vazio se dados essenciais faltarem
    }

    // Determina o status geral do card
    let cardStatus = 'completed';
    if (runner1Data.status === 'planned' || (runner2Data && runner2Data.status === 'planned')) cardStatus = 'planned';
    if (runner1Data.status === 'skipped' && (!runner2Data || runner2Data.status === 'skipped')) cardStatus = 'skipped';

    card.className = `race-card status-${cardStatus}`;
    card.dataset.id = race.id; // ID da corrida (importante!)
    card.dataset.ownerUid = currentViewingUid; // UID do dono do perfil atual

    // Calcula distâncias e paces
    const runner1Dist = runner1Data.distance || race.distance;
    const runner1Pace = calculatePace(runner1Data.status === 'completed' ? runner1Data.time : runner1Data.goalTime, runner1Dist);
    let runner2Dist = null;
    let runner2Pace = null;
    if(runner2Data) {
        runner2Dist = runner2Data.distance || race.distance;
        runner2Pace = calculatePace(runner2Data.status === 'completed' ? runner2Data.time : runner2Data.goalTime, runner2Dist);
    }

    // Define como exibir a distância
    let raceDistDisplay = '';
    if (race.distance) {
        raceDistDisplay = `${race.distance}km`;
    } else if (runner1Dist && runner2Data && runner2Dist && runner1Dist !== runner2Dist) {
        raceDistDisplay = `${runner1Dist || '?'}k / ${runner2Dist || '?'}k`;
    } else {
        raceDistDisplay = `${runner1Dist || (runner2Data ? runner2Dist : '') || '?'}km`;
    }

    const canEdit = authUser && authUser.uid === currentViewingUid;

    // --- HTML da Mídia (Fotos) ---
    let mediaHTML = '';
    if (race.media) {
        const mediaItems = Object.values(race.media);
        if (mediaItems.length > 0) {
            mediaHTML = `
            <div class="race-card-media">
                <h4>Mídia da Corrida (${mediaItems.length})</h4>
                <div class="media-gallery">
                    ${mediaItems.map(item => `
                        <img src="${item.url}" alt="Foto da corrida" class="media-thumbnail" onclick="window.open('${item.url}')">
                    `).join('')}
                </div>
            </div>`;
        }
    }

    // --- HTML Botão Adicionar Mídia ---
    let mediaButtonHTML = '';
    if (canEdit && cardStatus === 'completed') {
        mediaButtonHTML = `<button class="btn-control btn-add-media" data-race-id="${race.id}" title="Adicionar Mídia">📸</button>`;
    }

    // --- HTML Seção Social (Likes) - Inicialmente vazio ---
    // Será preenchido assincronamente abaixo
    const socialSectionHTML = `
        <div class="race-card-social" id="social-${race.id}">
            <button class="like-button" data-race-id="${race.id}" data-owner-uid="${currentViewingUid}" aria-label="Curtir" disabled>
                <i class='bx bx-loader-alt bx-spin'></i> 
            </button>
            <span class="like-count">--</span>
        </div>`;

    // --- Estrutura Principal do Card ---
    card.innerHTML = `
        <div class="race-card-header">
            <h3>${race.raceName}</h3>
            <span class="date">${new Date(race.date).toLocaleDateString('pt-BR', {timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric'})}</span>
        </div>
        <div class="race-card-body">
            ${createRunnerInfoHTML(RUNNER_1_PROFILE, runner1Data, runner1Dist, runner1Pace, 'runner1')}
            ${(hasRunner2 && runner2Data) ? createRunnerInfoHTML(RUNNER_2_PROFILE, runner2Data, runner2Dist, runner2Pace, 'runner2') : ''}
        </div>
        ${mediaHTML}
        ${socialSectionHTML} 
        <div class="race-card-footer">
            <div>
                <span class="juntos-icon">${(hasRunner2 && race.juntos) ? '👩🏻‍❤️‍👨🏻' : ''}</span>
                <span class="race-notes">${race.notes || ''}</span>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="race-distance">${raceDistDisplay}</span>
                ${mediaButtonHTML}
                <div class="race-controls ${canEdit ? '' : 'hidden'}">
                    <button class="btn-control btn-edit" title="Editar">✏️</button>
                    <button class="btn-control btn-delete" title="Excluir">🗑️</button>
                </div>
            </div>
        </div>`;

    // --- Adiciona Listeners para botões de Edição/Exclusão/Mídia ---
    if(canEdit) {
        card.querySelector('.btn-edit')?.addEventListener('click', (e) => {
            e.stopPropagation(); openModal(race.id);
        });
        card.querySelector('.btn-delete')?.addEventListener('click', (e) => {
            e.stopPropagation(); deleteRace(race.id);
        });
        const mediaBtn = card.querySelector('.btn-add-media');
        if (mediaBtn) {
            mediaBtn.addEventListener('click', (e) => {
                e.stopPropagation(); openMediaUploadModal(e.currentTarget.dataset.raceId);
            });
        }
    }

    // --- Busca e Atualiza Dados de Like Assincronamente ---
    const likeButtonElement = card.querySelector('.like-button');
    if (likeButtonElement && authUser) { // Só busca se houver botão e usuário logado
        const interactionRef = firebase.database().ref(`/raceInteractions/${race.id}`);
        interactionRef.once('value', snapshot => {
            const interactionData = snapshot.val();
            const likeCount = interactionData?.likeCount || 0;
            const userLiked = interactionData?.likes?.[authUser.uid] || false;

            updateLikeButtonUI(likeButtonElement, likeCount, userLiked);
            likeButtonElement.disabled = false; // Habilita o botão após carregar
            likeButtonElement.innerHTML = `<i class='bx ${userLiked ? 'bxs-heart' : 'bx-heart'}'></i>`; // Define ícone correto

            // Adiciona listener APÓS carregar dados iniciais
            likeButtonElement.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLike(e.currentTarget);
            });
        });
    } else if (likeButtonElement) {
         // Se não está logado, remove o estado de loading e deixa como não curtido
         likeButtonElement.disabled = true; // Mantém desabilitado
         likeButtonElement.innerHTML = "<i class='bx bx-heart'></i>";
         const countElement = likeButtonElement.nextElementSibling;
         if (countElement && countElement.classList.contains('like-count')) {
            countElement.textContent = '0'; // Mostra 0 se deslogado (ou busca se preferir)
         }
         // Poderia buscar o count público aqui se quisesse mostrar para deslogados
         // firebase.database().ref(`/raceInteractions/${race.id}/likeCount`).once(...)
    }


    return card;
}


function createRunnerInfoHTML(config, runnerData, distance, pace, cssClass) {
    let timeHTML = '', paceHTML = '';
    if(!runnerData || !runnerData.status) return '';

    switch (runnerData.status) {
        case 'completed':
            timeHTML = `<div class="runner-time">${secondsToTime(timeToSeconds(runnerData.time))}</div>`;
            if (pace !== 'N/A') paceHTML = `<div class="runner-pace">${pace}</div>`;
            break;
        case 'planned':
            const goalTime = runnerData.goalTime || (runnerData.time && runnerData.time.includes(':') ? runnerData.time : null);
            timeHTML = `<div class="runner-time goal">⏳ ${goalTime ? secondsToTime(timeToSeconds(goalTime)) : 'Planejada'}</div>`;
            if (pace !== 'N/A') paceHTML = `<div class="runner-pace goal">(Meta: ${pace})</div>`;
            break;
        case 'skipped':
            timeHTML = `<div class="runner-time skipped">❌ Não correu</div>`;
            break;
        default: timeHTML = `<div class="runner-time skipped">N/A</div>`;
    }

    if (runnerData.status === 'skipped') {
        return `<div class="runner-info"><span class="runner-name ${cssClass}">${config.name} ${config.emoji}</span><div class="runner-details">${timeHTML}</div></div>`;
    }
    return `<div class="runner-info"><span class="runner-name ${cssClass}">${config.name} ${config.emoji}</span><div class="runner-details">${timeHTML}${paceHTML}</div></div>`;
}

// --- Funções do Modal e CRUD (V1) ---

function openModal(raceId = null) {
    dom.form.reset();
    document.getElementById('race-id').value = '';
    dom.btnDelete.classList.add('hidden');

    updateProfileUI(); // Garante que a exibição R1/R2 está correta

    if (raceId) {
        dom.modalTitle.textContent = 'Editar Corrida Pessoal';
        dom.btnDelete.classList.remove('hidden');
        const race = db.races[raceId];
        if (!race) return;

        document.getElementById('race-id').value = raceId;
        document.getElementById('raceName').value = race.raceName;
        document.getElementById('raceDate').value = race.date;
        document.getElementById('raceDistance').value = race.distance || ''; // Garante que seja string vazia se nulo
        document.getElementById('raceJuntos').checked = race.juntos;
        document.getElementById('raceNotes').value = race.notes || '';

        const runner1Data = race[RUNNER_1_KEY];
        const runner2Data = race[RUNNER_2_KEY];

        if(runner1Data){
            document.getElementById('runner1Status').value = runner1Data.status || 'skipped';
            const runner1Time = runner1Data.status === 'completed' ? runner1Data.time : (runner1Data.goalTime || runner1Data.time || '');
            document.getElementById('runner1Time').value = normalizeTime(runner1Time) ? secondsToTime(timeToSeconds(runner1Time)) : '';
            document.getElementById('runner1Distance').value = runner1Data.distance || '';
        }

        if(runner2Data && hasRunner2){ // Só preenche se runner2 existir no perfil
            document.getElementById('runner2Status').value = runner2Data.status || 'skipped';
            const runner2Time = runner2Data.status === 'completed' ? runner2Data.time : (runner2Data.goalTime || runner2Data.time || '');
            document.getElementById('runner2Time').value = normalizeTime(runner2Time) ? secondsToTime(timeToSeconds(runner2Time)) : '';
            document.getElementById('runner2Distance').value = runner2Data.distance || '';
        }

    } else {
        dom.modalTitle.textContent = 'Adicionar Nova Corrida Pessoal';
        document.getElementById('raceDate').value = new Date().toISOString().split('T')[0];
    }
    dom.modal.showModal();
}

function closeModal() { dom.modal.close(); }

function handleFormSubmit(e) {
    e.preventDefault();
    if (!currentViewingUid || !authUser || currentViewingUid !== authUser.uid) {
        alert("Erro: Você deve estar logado para salvar.");
        return;
    }

    const id = document.getElementById('race-id').value;
    const date = document.getElementById('raceDate').value;

    const runner1TimeRaw = document.getElementById('runner1Time').value;
    const runner2TimeRaw = document.getElementById('runner2Time').value;
    const runner1Status = document.getElementById('runner1Status').value;
    const runner2Status = document.getElementById('runner2Status').value;

    const raceData = {
        date: date,
        year: new Date(date + 'T00:00:00').getFullYear().toString(),
        raceName: document.getElementById('raceName').value,
        distance: parseFloat(document.getElementById('raceDistance').value) || null,
        juntos: document.getElementById('raceJuntos').checked,
        notes: document.getElementById('raceNotes').value || null,
        [RUNNER_1_KEY]: {
            status: runner1Status,
            time: runner1Status === 'completed' ? normalizeTime(runner1TimeRaw) : null,
            goalTime: runner1Status === 'planned' ? normalizeTime(runner1TimeRaw) : null,
            distance: parseFloat(document.getElementById('runner1Distance').value) || null
        },
        [RUNNER_2_KEY]: hasRunner2 ? { // Só inclui R2 se o perfil tiver R2
            status: runner2Status,
            time: runner2Status === 'completed' ? normalizeTime(runner2TimeRaw) : null,
            goalTime: runner2Status === 'planned' ? normalizeTime(runner2TimeRaw) : null,
            distance: parseFloat(document.getElementById('runner2Distance').value) || null
        } : null // Ou define como null se não houver R2 no perfil
    };

    // Preserva mídia existente se estiver editando
    if (id && db.races[id] && db.races[id].media) {
        raceData.media = db.races[id].media;
    }
    // Não precisamos mais preservar likes/likeCount aqui, pois estão separados

    const dbPath = `/users/${currentViewingUid}/races/`;

    let promise;
    let raceIdToReturn = id; // Guarda o ID para possível criação de interação

    if (id) {
        promise = firebase.database().ref(dbPath).child(id).set(raceData);
    } else {
        const newRaceRef = firebase.database().ref(dbPath).push();
        raceIdToReturn = newRaceRef.key; // Guarda o novo ID
        promise = newRaceRef.set(raceData);
    }

    promise.then(() => {
        closeModal();
        // Se for uma NOVA corrida, inicializa a entrada em raceInteractions
        if (!id && raceIdToReturn) {
            const interactionRef = firebase.database().ref(`/raceInteractions/${raceIdToReturn}`);
            interactionRef.set({
                ownerUid: currentViewingUid,
                likeCount: 0,
                likes: {}
            }).catch(err => console.error("Erro ao inicializar interações para nova corrida:", err));
        }
    })
    .catch(err => {
        console.error("Erro ao salvar corrida:", err);
        alert("Erro ao salvar: " + err.message);
    });
}


function deleteRace(raceId) {
    if (!currentViewingUid || !authUser || currentViewingUid !== authUser.uid) {
        alert("Erro: Você deve estar logado para excluir.");
        return;
    }

    const race = db.races[raceId];
    if (!confirm(`Tem certeza que deseja excluir esta corrida?\n\n${race.raceName} (${race.date})`)) return;

    // Remove a corrida principal
    firebase.database().ref(`/users/${currentViewingUid}/races/${raceId}`).remove()
        .then(() => {
            console.log("Corrida excluída:", raceId);
            closeModal(); // Fecha o modal se estava aberto para edição
            // Remove também os dados de interação associados
            firebase.database().ref(`/raceInteractions/${raceId}`).remove()
                .catch(err => console.error("Erro ao excluir interações da corrida:", err));
        })
        .catch(err => {
            console.error("Erro ao excluir corrida:", err);
            alert("Erro ao excluir: " + err.message);
        });
}

function renderAllV1Profile() {
    updateProfileUI();
    renderDashboard();
    renderHistory();
}

// --- Funções de Carregamento de Dados (V1 + V5) ---

function loadProfile(uid) {
    const profileRef = firebase.database().ref(`/users/${uid}/profile`);
    profileRef.once('value', (snapshot) => {
        db.profile = snapshot.val() || {};
        renderAllV1Profile();
    }, (error) => {
        console.error("Erro ao carregar perfil:", error);
        db.profile = {};
        renderAllV1Profile();
    });
}


function loadRaces(uid) {
    currentViewingUid = uid;

    const isOwner = authUser && authUser.uid === currentViewingUid;
    dom.controlsSection.classList.toggle('hidden', !isOwner);
    dom.btnEditProfile.classList.toggle('hidden', !isOwner);

    const racesRef = firebase.database().ref(`/users/${uid}/races`);

    db.races = {};
    dom.prGrid.innerHTML = '<div class="loader">Carregando PRs...</div>';
    dom.summaryGrid.innerHTML = '<div class="loader">Calculando...</div>';
    dom.historyContainer.innerHTML = '<div class="loader">Carregando histórico...</div>';

    racesRef.off('value'); // Remove listener antigo

    // Listener para as corridas do usuário atual
    racesRef.on('value', (snapshot) => {
        db.races = snapshot.val() || {};
        renderAllV1Profile(); // Renderiza o perfil e o histórico (que agora busca likes separadamente)
    }, (error) => {
        console.error("Erro ao carregar corridas:", error);
        db.races = {};
        renderAllV1Profile();
    });
}


// Carrega e exibe a lista de perfis públicos
function loadPublicView() {
    if(!authUser) {
        dom.headerSubtitle.textContent = "Selecione um currículo ou faça login";
        dom.headerProfilePicture.src = 'icons/icon-192x192.png';
        dom.headerLocation.classList.add('hidden');
        dom.headerBio.classList.add('hidden');
    }

    const publicProfilesRef = firebase.database().ref('/publicProfiles');
    publicProfilesRef.off('value'); // Remove listener antigo

    publicProfilesRef.on('value', (snapshot) => {
        const profiles = snapshot.val() || {};

        if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = '';
        if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = '';

        if(Object.keys(profiles).length > 0) {
            const createProfileCard = (uid, profile) => {
                const card = document.createElement('div');
                card.className = 'profile-card';
                const runner2HTML = profile.runner2Name && profile.runner2Name.trim() !== "" ? `<h3 class="runner2-name">${profile.runner2Name}</h3>` : '';
                const profilePicUrl = profile.profilePictureUrl || 'icons/icon-192x192.png';

                card.innerHTML = `
                    <img src="${profilePicUrl}" alt="Foto Perfil" class="profile-card-pic">
                    <div class="profile-card-info">
                        <h3>${profile.runner1Name || 'Corredor'}</h3>
                        ${runner2HTML}
                        <p>${profile.teamName || 'Equipe'}</p>
                    </div>
                `;
                card.addEventListener('click', () => {
                    if (!authUser) {
                        dom.loginOrPublicView.classList.add('hidden');
                        dom.userContent.classList.remove('hidden');
                        dom.btnBackToPublic.classList.remove('hidden');
                        dom.btnBackToMyDashboard.classList.add('hidden');
                    } else {
                        dom.btnBackToPublic.classList.add('hidden');
                        dom.btnBackToMyDashboard.classList.remove('hidden');
                    }
                    loadProfile(uid);
                    loadRaces(uid);
                });
                return card;
            };

            Object.entries(profiles).forEach(([uid, profile]) => {
                if (dom.publicProfileListPublic) {
                    dom.publicProfileListPublic.appendChild(createProfileCard(uid, profile));
                }
                if (dom.publicProfileListLogged && !(authUser && authUser.uid === uid)) {
                    dom.publicProfileListLogged.appendChild(createProfileCard(uid, profile));
                }
            });
        } else {
            const noProfileMsg = '<div class="loader">Nenhum perfil público encontrado.</div>';
            if (dom.publicProfileListPublic) dom.publicProfileListPublic.innerHTML = noProfileMsg;
            if (dom.publicProfileListLogged) dom.publicProfileListLogged.innerHTML = noProfileMsg;
        }
    });
}

// --- Funções de Lógica de UI (V1 - Roteador) ---

function showLoggedOutView() {
    // Desliga listeners específicos do usuário anterior, se houver
    if (currentViewingUid) {
        firebase.database().ref(`/users/${currentViewingUid}/races`).off();
    }
    // Desliga listeners públicos gerais
    firebase.database().ref('/publicProfiles').off();
    firebase.database().ref('corridas').off();
    firebase.database().ref('resultadosEtapas').off();
    // Limpa estado global
    authUser = null;
    isAdmin = false;
    currentViewingUid = null;
    db = { races: {}, profile: {} };

    // Atualiza UI
    dom.btnLogout.classList.add('hidden');
    dom.btnBackToPublic.classList.add('hidden');
    dom.btnBackToMyDashboard.classList.add('hidden');
    dom.userInfo.classList.add('hidden');
    dom.controlsSection.classList.add('hidden');
    dom.btnEditProfile.classList.add('hidden');
    dom.pendingApprovalView.classList.add('hidden');
    dom.rejectedView.classList.add('hidden');
    dom.loginOrPublicView.classList.remove('hidden');
    dom.publicView.classList.remove('hidden');
    dom.userContent.classList.add('hidden');
    dom.loginError.textContent = '';
    dom.loginForm.reset();
    toggleLoginMode(false);

    // Carrega dados públicos iniciais
    loadPublicView();
    fetchAllData();
}


function showPendingView() {
    dom.btnLogout.classList.remove('hidden');
    dom.userInfo.classList.remove('hidden');
    dom.userEmail.textContent = authUser.email;
    dom.loginOrPublicView.classList.add('hidden');
    dom.userContent.classList.add('hidden');
    dom.btnBackToPublic.classList.add('hidden');
    dom.rejectedView.classList.add('hidden');
    dom.btnEditProfile.classList.add('hidden');
    dom.pendingApprovalView.classList.remove('hidden');
}

function showRejectedView(email) {
    dom.btnLogout.classList.remove('hidden');
    dom.userInfo.classList.remove('hidden');
    dom.userEmail.textContent = email;
    dom.loginOrPublicView.classList.add('hidden');
    dom.userContent.classList.add('hidden');
    dom.btnBackToPublic.classList.add('hidden');
    dom.pendingApprovalView.classList.add('hidden');
    dom.btnEditProfile.classList.add('hidden');
    dom.rejectedEmail.textContent = email;
    dom.rejectedView.classList.remove('hidden');
}

function showUserDashboard(user) {
    dom.btnLogout.classList.remove('hidden');
    dom.userInfo.classList.remove('hidden');
    dom.userEmail.textContent = user.email;
    dom.loginOrPublicView.classList.add('hidden');
    dom.pendingApprovalView.classList.add('hidden');
    dom.rejectedView.classList.add('hidden');
    dom.btnBackToPublic.classList.add('hidden');
    dom.btnBackToMyDashboard.classList.add('hidden');
    dom.userContent.classList.remove('hidden');

    // Carrega dados específicos do usuário
    loadProfile(user.uid);
    loadRaces(user.uid);

    // Carrega dados públicos (listeners serão reativados se necessário)
    fetchAllData();
    loadPublicView();

    // Configura painel de admin
    if (isAdmin) {
        dom.userInfo.classList.add('admin-user');
        initializeAdminPanel(user.uid, database);
    } else {
         dom.userInfo.classList.remove('admin-user');
    }
}


// --- Funções de Autenticação (V1) ---

function showLoginError(message) {
     dom.loginError.textContent = message;
}

function toggleLoginMode(isSigningUp) {
    if (isSigningUp) {
        dom.loginTitle.textContent = "Cadastrar Novo Usuário";
        dom.signupFields.classList.remove('hidden');
        dom.btnLoginSubmit.classList.add('hidden');
        dom.btnSignUpSubmit.classList.remove('hidden');
        dom.loginToggleLink.textContent = "Já tem conta? Entrar";
    } else {
        dom.loginTitle.textContent = "Acessar Meu Currículo";
        dom.signupFields.classList.add('hidden');
        dom.btnLoginSubmit.classList.remove('hidden');
        dom.btnSignUpSubmit.classList.add('hidden');
        dom.loginToggleLink.textContent = "Não tem conta? Cadastre-se";
    }
    dom.loginError.textContent = '';
}

function handleSignUp(e) {
    e.preventDefault();
    const email = dom.loginEmail.value;
    const password = dom.loginPassword.value;
    const runner1Name = dom.signupRunner1Name.value;

    dom.loginError.textContent = '';

    if (password.length < 6) {
        showLoginError("A senha deve ter pelo menos 6 caracteres.");
        return;
    }
    if (!runner1Name) {
        showLoginError("O 'Seu nome' (Corredor 1) é obrigatório.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            const pendingRef = firebase.database().ref('/pendingApprovals/' + user.uid);
            pendingRef.set({
                email: user.email,
                requestDate: new Date().toISOString(),
                runner1Name: runner1Name,
                runner2Name: dom.signupRunner2Name.value || "",
                teamName: dom.signupTeamName.value || ""
            });

            console.log("Novo usuário cadastrado e aguardando aprovação:", user.uid);
            dom.loginForm.reset();
            toggleLoginMode(false);
            showLoginError("Cadastro realizado! Aguardando aprovação do admin.");
        })
        .catch(err => {
            console.error("Erro no cadastro:", err.code, err.message);
            if (err.code === 'auth/email-already-in-use') {
                showLoginError("Este e-mail já está em uso. Tente fazer login.");
            } else {
                showLoginError("Erro ao cadastrar: " + err.message);
            }
        });
}

function handleSignIn(e) {
    e.preventDefault();
    const email = dom.loginEmail.value;
    const password = dom.loginPassword.value;
    dom.loginError.textContent = '';

    auth.signInWithEmailAndPassword(email, password)
        .catch(err => {
            console.error("Erro no login:", err.code, err.message);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                 showLoginError("E-mail ou senha incorretos.");
            } else {
                 showLoginError("Erro ao entrar: " + err.message);
            }
        });
}

function signOut() {
    // Desliga listeners ANTES de fazer logout para evitar erros de permissão
    if (currentViewingUid) {
        firebase.database().ref(`/users/${currentViewingUid}/races`).off();
    }
    firebase.database().ref('/publicProfiles').off();
    firebase.database().ref('corridas').off();
    firebase.database().ref('resultadosEtapas').off();

    auth.signOut().catch(err => console.error("Erro no logout:", err));
    // O onAuthStateChanged vai chamar showLoggedOutView automaticamente
}


// ======================================================
// SEÇÃO V2: LÓGICA DO CALENDÁRIO PÚBLICO
// ======================================================

function fetchAllData() {
    const dbRef = firebase.database();

    // Reativa listeners se não estiverem ativos (ou no primeiro load)
    dbRef.ref('corridas').off(); // Garante que não haja duplicatas
    dbRef.ref('corridas').on('value', snapshot => {
        appState.allCorridas = snapshot.val() || { copaAlcer: {}, geral: {} };
        renderContentV2();
    }, error => console.error("Falha ao carregar /corridas:", error));

    dbRef.ref('resultadosEtapas').off(); // Garante que não haja duplicatas
    dbRef.ref('resultadosEtapas').on('value', snapshot => {
        appState.resultadosEtapas = snapshot.val() || {};
        renderContentV2();
    }, error => console.error("Falha ao carregar /resultadosEtapas:", error));

    dbRef.ref('rankingCopaAlcer').once('value', snapshot => {
        appState.rankingData = snapshot.val() || {};
    });
}


function renderContentV2() {
    const todasCorridasCopa = Object.values(appState.allCorridas.copaAlcer || {});
    const todasCorridasGerais = Object.values(appState.allCorridas.geral || {});
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const corridasAgendadasCopa = todasCorridasCopa.filter(c => new Date(c.data + 'T00:00:00') >= hoje);
    const corridasAgendadasGerais = todasCorridasGerais.filter(c => new Date(c.data + 'T00:00:00') >= hoje);
    const corridasRealizadas = [...todasCorridasCopa, ...todasCorridasGerais]
                                .filter(c => new Date(c.data + 'T00:00:00') < hoje);


    renderCalendar(corridasAgendadasCopa, dom.copaContainerPublic, 'inscrições');
    renderCalendar(corridasAgendadasGerais, dom.geralContainerPublic, 'inscrições');
    renderCalendar(corridasRealizadas, dom.resultadosContainerPublic, 'resultados');

    renderCalendar(corridasAgendadasCopa, dom.copaContainerLogged, 'inscrições');
    renderCalendar(corridasAgendadasGerais, dom.geralContainerLogged, 'inscrições');
    renderCalendar(corridasRealizadas, dom.resultadosContainerLogged, 'resultados');
}

function renderCalendar(corridas, container, buttonType) {
    if (!container) return;
    if (!corridas || corridas.length === 0) {
        container.innerHTML = `<p class="loader" style="font-size: 0.9em; color: #999;">Nenhuma corrida nesta categoria.</p>`;
        return;
    }

    const sortedCorridas = corridas.sort((a, b) => {
        const dateA = new Date(a.data + 'T00:00:00');
        const dateB = new Date(b.data + 'T00:00:00');
        return buttonType === 'resultados' ? dateB - dateA : dateA - dateB;
    });

    container.innerHTML = sortedCorridas.map(corrida => {
        const dataObj = new Date(`${corrida.data}T12:00:00Z`);
        const dia = String(dataObj.getUTCDate()).padStart(2, '0');
        const mes = dataObj.toLocaleString("pt-BR", { month: "short", timeZone: 'UTC' }).replace(".", "").toUpperCase();

        let actionButtonHTML = '';
        if (buttonType === 'inscrições') {
            actionButtonHTML = corrida.linkInscricao ?
                `<a href="${corrida.linkInscricao}" target="_blank" rel="noopener noreferrer" class="v2-inscricoes-button"><i class='bx bx-link-external' style="margin-right: 5px;"></i>Inscrições</a>` :
                `<div class="v2-race-button-disabled">Em Breve</div>`;
        } else {
            actionButtonHTML = appState.resultadosEtapas[corrida.id] ?
                `<button class="v2-results-button" data-race-id="${corrida.id}"><i class='bx bx-table' style="margin-right: 5px;"></i>Ver Resultados</button>` :
                `<div class="v2-race-button-disabled">Resultados em Breve</div>`;
        }

        return `
            <div class="v2-race-card">
                <div class="v2-race-date">
                    <span class="v2-race-date-day">${dia}</span>
                    <span class="v2-race-date-month">${mes}</span>
                </div>
                <div class="v2-race-info">
                    <div>
                        <h3 class="font-bold text-lg text-white">${corrida.nome}</h3>
                        <p class="text-sm text-gray-400"><i class='bx bxs-map' style="margin-right: 5px;"></i>${corrida.cidade}</p>
                    </div>
                    <div class="v2-race-buttons">
                        ${actionButtonHTML}
                    </div>
                </div>
            </div>`;
    }).join('');

    container.querySelectorAll('.v2-results-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const raceId = e.currentTarget.dataset.raceId;
            showRaceResultsModal(raceId);
        });
    });
}

function showRaceResultsModal(raceId) {
    const race = appState.allCorridas.copaAlcer?.[raceId] || appState.allCorridas.geral?.[raceId];
    const results = appState.resultadosEtapas[raceId];

    if (!race || !results) {
        console.error("Dados da corrida ou resultados não encontrados para o ID:", raceId);
        return;
    }

    dom.modalTitleResults.textContent = `Resultados - ${race.nome}`;

    let contentHTML = '';
    for (const categoryKey in results) {
        if (results.hasOwnProperty(categoryKey)) {
             for (const genderKey in results[categoryKey]) {
                 if (results[categoryKey].hasOwnProperty(genderKey)) {
                    const atletas = results[categoryKey][genderKey];
                    if (atletas && atletas.length > 0) {
                        contentHTML += `<h3 class="v2-modal-category-title">${categoryKey} - ${genderKey.charAt(0).toUpperCase() + genderKey.slice(1)}</h3>`;
                        contentHTML += `
                            <div style="overflow-x: auto;">
                                <table class="v2-results-table">
                                    <thead><tr><th>#</th><th>Atleta</th><th>Equipe</th><th>Tempo</th></tr></thead>
                                    <tbody>
                                        ${atletas.map(atleta => `
                                            <tr>
                                                <td class="font-medium">${atleta.classificacao}</td>
                                                <td>${atleta.nome}</td>
                                                <td style="color: #b0b0b0;">${atleta.assessoria || 'Individual'}</td>
                                                <td style="font-family: monospace;">${atleta.tempo}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>`;
                    }
                 }
            }
        }
    }

    dom.modalContentResults.innerHTML = contentHTML || '<p>Nenhum resultado encontrado nesta categoria.</p>';
    dom.modalSearchInput.value = '';
    filterResultsInModal();
    dom.modalOverlay.classList.remove('hidden');
}


function filterResultsInModal() {
    const searchTerm = dom.modalSearchInput.value.toUpperCase();
    dom.modalContentResults.querySelectorAll('.v2-results-table tbody tr').forEach(row => {
        const athleteName = row.cells[1].textContent.toUpperCase();
        row.style.display = athleteName.includes(searchTerm) ? '' : 'none';
    });
}

function closeResultsModal() {
    dom.modalOverlay.classList.add('hidden');
}

// ======================================================
// SEÇÃO V4: LÓGICA DE UPLOAD DE MÍDIA (CLOUDINARY)
// ======================================================

function openMediaUploadModal(raceId) {
    const race = db.races[raceId];
    if (!race) {
        console.error("Corrida não encontrada para upload de mídia:", raceId);
        return;
    }

    dom.mediaForm.reset();
    dom.mediaRaceIdInput.value = raceId;
    dom.mediaModalTitle.textContent = `Adicionar Mídia: ${race.raceName}`;
    dom.mediaPreview.src = "";
    dom.mediaPreviewContainer.style.display = 'none';
    dom.mediaUploadStatus.textContent = '';
    dom.mediaUploadStatus.className = 'upload-status';
    dom.btnConfirmMediaUpload.disabled = false;

    dom.mediaModal.showModal();
}

function closeMediaUploadModal() {
    dom.mediaModal.close();
}

function handleMediaFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            dom.mediaPreview.src = event.target.result;
            dom.mediaPreviewContainer.style.display = 'block';
        }
        reader.readAsDataURL(file);

        dom.mediaUploadStatus.textContent = '';
        dom.mediaUploadStatus.className = 'upload-status';
    } else {
        dom.mediaPreview.src = "";
        dom.mediaPreviewContainer.style.display = 'none';
        if (file) {
             updateMediaUploadStatus("Por favor, selecione um arquivo de imagem.", "error");
        }
    }
}


function handleMediaUploadSubmit(e) {
    e.preventDefault();
    const file = dom.mediaFileInput.files[0];
    const raceId = dom.mediaRaceIdInput.value;

    if (!file || !raceId) {
        updateMediaUploadStatus("Por favor, selecione um arquivo.", "error");
        return;
    }
    if (!file.type.startsWith('image/')) {
        updateMediaUploadStatus("Arquivo inválido. Selecione uma imagem.", "error");
        return;
    }

    dom.btnConfirmMediaUpload.disabled = true;
    updateMediaUploadStatus("Enviando imagem...", "loading");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (!data.secure_url) {
            console.error("Resposta inesperada do Cloudinary:", data);
            throw new Error(data.error?.message || "Resposta inválida do Cloudinary (sem secure_url).");
        }
        updateMediaUploadStatus("Salvando referência...", "loading");
        saveMediaUrlToFirebase(raceId, data.secure_url);
    })
    .catch(err => {
        console.error("Erro no upload para Cloudinary:", err);
        updateMediaUploadStatus(`Erro no upload: ${err.message}`, "error");
        dom.btnConfirmMediaUpload.disabled = false;
    });
}


function saveMediaUrlToFirebase(raceId, url) {
    const uid = authUser?.uid;
    if (!uid) {
         updateMediaUploadStatus("Erro: Usuário não autenticado.", "error");
         dom.btnConfirmMediaUpload.disabled = false;
         return;
    }

    const mediaRef = firebase.database().ref(`/users/${uid}/races/${raceId}/media`).push();

    const mediaData = {
        id: mediaRef.key,
        url: url,
        type: "image",
        uploadedAt: firebase.database.ServerValue.TIMESTAMP
    };

    mediaRef.set(mediaData)
        .then(() => {
            updateMediaUploadStatus("Upload concluído com sucesso!", "success");
            dom.mediaForm.reset();
            dom.mediaPreview.src = "";
            dom.mediaPreviewContainer.style.display = 'none';
            dom.btnConfirmMediaUpload.disabled = false;
            // O listener 'on(value)' em loadRaces() irá re-renderizar o card
        })
        .catch(err => {
            console.error("Erro ao salvar no Firebase:", err);
            updateMediaUploadStatus(`Erro ao salvar: ${err.message}`, "error");
            dom.btnConfirmMediaUpload.disabled = false;
        });
}

function updateMediaUploadStatus(message, type) {
    dom.mediaUploadStatus.textContent = message;
    dom.mediaUploadStatus.className = 'upload-status';
    if (type) {
        dom.mediaUploadStatus.classList.add(type);
    }
}

// ======================================================
// SEÇÃO V5: LÓGICA DE EDIÇÃO DE PERFIL
// ======================================================

function openProfileEditModal() {
    if (!authUser || authUser.uid !== currentViewingUid) return;

    populateProfileEditModal();
    dom.profileEditModal.showModal();
}

function closeProfileEditModal() {
    dom.profileEditModal.close();
}

function populateProfileEditModal() {
    const profile = db.profile || {};

    dom.profileEditRunner1Name.textContent = profile.runner1Name || 'Corredor 1';
    if (profile.runner2Name && profile.runner2Name.trim() !== "") {
        dom.profileEditRunner2Name.textContent = profile.runner2Name;
        dom.profileEditRunner2NameSeparator.style.display = '';
        dom.profileEditRunner2Name.style.display = '';
    } else {
        dom.profileEditRunner2Name.textContent = '';
        dom.profileEditRunner2NameSeparator.style.display = 'none';
        dom.profileEditRunner2Name.style.display = 'none';
    }

    dom.profileEditTeam.value = profile.teamName || '';
    dom.profileEditBio.value = profile.bio || '';
    dom.profileEditLocation.value = profile.location || '';
    dom.profileEditBirthdate.value = profile.birthdate || '';

    if (profile.profilePictureUrl) {
        dom.profileEditPicturePreview.src = profile.profilePictureUrl;
        dom.profileEditPicturePreviewContainer.style.display = 'block';
    } else {
        dom.profileEditPicturePreview.src = '';
        dom.profileEditPicturePreviewContainer.style.display = 'none';
    }

    dom.profileEditPictureInput.value = '';
    dom.profilePictureUploadStatus.textContent = '';
    dom.profilePictureUploadStatus.className = 'upload-status';
    dom.btnSaveProfileEdit.disabled = false;
}


function handleProfilePictureSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            dom.profileEditPicturePreview.src = event.target.result;
            dom.profileEditPicturePreviewContainer.style.display = 'block';
        }
        reader.readAsDataURL(file);
        dom.profilePictureUploadStatus.textContent = '';
    } else {
         dom.profileEditPicturePreview.src = db.profile?.profilePictureUrl || '';
         dom.profileEditPicturePreviewContainer.style.display = db.profile?.profilePictureUrl ? 'block' : 'none';
         if (file) {
             updateProfilePictureUploadStatus("Selecione um arquivo de imagem.", "error");
         }
    }
}


function handleProfileEditSubmit(e) {
    e.preventDefault();
    if (!authUser || authUser.uid !== currentViewingUid) return;

    dom.btnSaveProfileEdit.disabled = true;

    const newProfileData = {
        runner1Name: db.profile.runner1Name || '',
        runner2Name: db.profile.runner2Name || '',
        teamName: dom.profileEditTeam.value.trim() || 'Equipe',
        bio: dom.profileEditBio.value.trim() || null,
        location: dom.profileEditLocation.value.trim() || null,
        birthdate: dom.profileEditBirthdate.value || null,
        profilePictureUrl: db.profile.profilePictureUrl || null
    };

    const file = dom.profileEditPictureInput.files[0];

    const saveTextData = () => {
        updateProfilePictureUploadStatus("Salvando dados...", "loading");

        const updates = {};
        updates[`/users/${authUser.uid}/profile`] = newProfileData;
        updates[`/publicProfiles/${authUser.uid}`] = newProfileData;

        return firebase.database().ref().update(updates)
            .then(() => {
                db.profile = { ...db.profile, ...newProfileData };
                updateProfilePictureUploadStatus("Perfil atualizado!", "success");
                setTimeout(closeProfileEditModal, 1500);
                renderAllV1Profile(); // Re-renderiza header e outras partes da UI
            })
            .catch(err => {
                console.error("Erro ao salvar perfil:", err);
                updateProfilePictureUploadStatus(`Erro ao salvar: ${err.message}`, "error");
                dom.btnSaveProfileEdit.disabled = false;
            });
    };

    if (file && file.type.startsWith('image/')) {
        uploadProfilePicture(file, (newUrl) => {
            if (newUrl) {
                newProfileData.profilePictureUrl = newUrl;
                saveTextData();
            } else {
                dom.btnSaveProfileEdit.disabled = false;
            }
        });
    } else {
        saveTextData();
    }
}

function uploadProfilePicture(file, callback) {
    updateProfilePictureUploadStatus("Enviando foto...", "loading");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (!data.secure_url) {
            throw new Error(data.error?.message || "Resposta inválida do Cloudinary (sem secure_url).");
        }
        updateProfilePictureUploadStatus("Foto enviada!", "loading");
        callback(data.secure_url);
    })
    .catch(err => {
        console.error("Erro no upload da foto de perfil:", err);
        updateProfilePictureUploadStatus(`Erro no upload: ${err.message}`, "error");
        callback(null);
    });
}

function updateProfilePictureUploadStatus(message, type) {
    dom.profilePictureUploadStatus.textContent = message;
    dom.profilePictureUploadStatus.className = 'upload-status';
    if (type) {
        dom.profilePictureUploadStatus.classList.add(type);
    }
}

// ======================================================
// SEÇÃO V6: LÓGICA DE CURTIDAS (LIKES - NOVA ESTRUTURA)
// ======================================================

// Função chamada ao clicar no botão de like
function toggleLike(likeButtonElement) {
    if (!authUser) {
        alert("Você precisa estar logado para curtir.");
        return;
    }

    const raceId = likeButtonElement.dataset.raceId;
    const ownerUid = likeButtonElement.dataset.ownerUid; // UID do dono da corrida
    const currentUserUid = authUser.uid; // UID de quem está curtindo

    if (!raceId || !ownerUid) {
        console.error("Faltando data attributes no botão de like:", likeButtonElement);
        return;
    }

    // Referência para o nó de interação da corrida específica
    const interactionRef = firebase.database().ref(`/raceInteractions/${raceId}`);

    // Executa a transação no nó de interações
    interactionRef.transaction(currentInteractionData => {
        // Se o nó não existe, inicializa-o (primeiro like nesta corrida)
        if (currentInteractionData === null) {
            return {
                ownerUid: ownerUid, // Salva quem é o dono da corrida
                likeCount: 1,
                likes: {
                    [currentUserUid]: true // Adiciona o like do usuário atual
                }
            };
        }

        // Se o nó já existe, atualiza likes e likeCount
        if (!currentInteractionData.likes) {
            currentInteractionData.likes = {}; // Garante que likes exista
        }
        if (currentInteractionData.likeCount === undefined || currentInteractionData.likeCount === null) {
             currentInteractionData.likeCount = 0; // Garante que likeCount exista
        }
        // Garante que ownerUid exista (caso tenha sido criado antes dessa lógica)
        if (!currentInteractionData.ownerUid) {
             currentInteractionData.ownerUid = ownerUid;
        }


        // Verifica se o usuário já curtiu
        if (currentInteractionData.likes[currentUserUid]) {
            // Já curtiu -> Descurtir
            currentInteractionData.likeCount--;
            currentInteractionData.likes[currentUserUid] = null; // Remove a chave do usuário
        } else {
            // Não curtiu -> Curtir
            currentInteractionData.likeCount++;
            currentInteractionData.likes[currentUserUid] = true; // Adiciona a chave do usuário
        }

        return currentInteractionData; // Retorna os dados modificados para serem salvos
    }, (error, committed, snapshot) => {
        if (error) {
            console.error('Falha na transação de like:', error);
            alert("Ocorreu um erro ao tentar curtir/descurtir. Tente novamente.");
        } else if (committed) {
            // Transação bem-sucedida!
            console.log('Like/Unlike com sucesso!');
            // Atualiza a UI localmente
            const updatedInteractionData = snapshot.val();
            // Verifica se o objeto e likes existem antes de acessar
            const userLiked = updatedInteractionData?.likes?.[currentUserUid] || false;
            updateLikeButtonUI(likeButtonElement, updatedInteractionData?.likeCount || 0, userLiked);
        } else {
            // Transação abortada (ex: conflito, regra negou - embora improvável com a nova regra)
            console.log('Transação de like abortada.');
        }
    });
}


// Atualiza a aparência do botão de like e o contador
function updateLikeButtonUI(buttonElement, count, liked) {
    const iconElement = buttonElement.querySelector('i');
    const countElement = buttonElement.nextElementSibling; // Assume que o span do contador é o próximo irmão

    buttonElement.classList.toggle('liked', liked);
    if (iconElement) { // Adiciona verificação se ícone existe
        iconElement.classList.remove('bx-heart', 'bxs-heart', 'bx-loader-alt', 'bx-spin'); // Limpa classes antigas
        iconElement.classList.add(liked ? 'bxs-heart' : 'bx-heart'); // Adiciona classe correta
    }

    if (countElement && countElement.classList.contains('like-count')) {
        countElement.textContent = count;
    }
}


// ======================================================
// PONTO DE ENTRADA PRINCIPAL (DOM LOADED)
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
    // VERIFICAÇÃO CRÍTICA (Firebase)
    if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === "COLE_AQUI_SUA_API_KEY") {
        alert("ERRO DE CONFIGURAÇÃO: O objeto FIREBASE_CONFIG não foi carregado ou preenchido. Verifique o 'js/config.js'.");
        document.body.innerHTML = '<h1 style="color:red; text-align:center; padding: 50px;">ERRO: O Firebase não foi configurado corretamente.</h1>';
        return;
    }

    // Inicializa Firebase
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    database = firebase.database();
    auth = firebase.auth();
    // functions = firebase.functions(); // Descomentar se usar Cloud Functions no futuro

    // VERIFICAÇÃO CRÍTICA (Cloudinary)
    if (typeof CLOUDINARY_CLOUD_NAME === 'undefined' || typeof CLOUDINARY_UPLOAD_PRESET === 'undefined' || !CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === "COLE_AQUI_SEU_CLOUD_NAME" || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET === "COLE_AQUI_SEU_UPLOAD_PRESET") {
         alert("ERRO DE CONFIGURAÇÃO: CLOUDINARY_CLOUD_NAME ou CLOUDINARY_UPLOAD_PRESET não foram configurados. Verifique o 'js/config.js'.");
         return; // Interrompe execução se Cloudinary não estiver configurado
    }
    CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    CLOUDINARY_PRESET = CLOUDINARY_UPLOAD_PRESET;


    // --- LISTENERS ---

    // Modal Corrida (V1)
    dom.btnAddnew.addEventListener('click', () => openModal());
    dom.btnCloseModal.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    dom.btnCancel.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    dom.form.addEventListener('submit', handleFormSubmit);
    dom.btnDelete.addEventListener('click', () => {
        const id = document.getElementById('race-id').value;
        if(id) deleteRace(id);
    });

    // Autenticação (V1)
    dom.btnLoginSubmit.addEventListener('click', handleSignIn);
    dom.btnSignUpSubmit.addEventListener('click', handleSignUp);
    dom.btnLogout.addEventListener('click', signOut);
    dom.btnBackToPublic.addEventListener('click', showLoggedOutView);
    dom.loginToggleLink.addEventListener('click', () => {
        const isSigningUp = dom.signupFields.classList.contains('hidden');
        toggleLoginMode(isSigningUp);
    });
    dom.btnBackToMyDashboard.addEventListener('click', () => {
        if (authUser) {
            dom.btnBackToMyDashboard.classList.add('hidden');
            showUserDashboard(authUser); // Recarrega o próprio dashboard
        }
    });

    // Modal Mídia (V4)
    dom.btnCloseMediaModal.addEventListener('click', (e) => { e.preventDefault(); closeMediaUploadModal(); });
    dom.btnCancelMediaUpload.addEventListener('click', (e) => { e.preventDefault(); closeMediaUploadModal(); });
    dom.mediaFileInput.addEventListener('change', handleMediaFileSelect);
    dom.mediaForm.addEventListener('submit', handleMediaUploadSubmit);

    // Modal Edição Perfil (V5)
    dom.btnEditProfile.addEventListener('click', openProfileEditModal);
    dom.btnCloseProfileEditModal.addEventListener('click', (e) => { e.preventDefault(); closeProfileEditModal(); });
    dom.btnCancelProfileEdit.addEventListener('click', (e) => { e.preventDefault(); closeProfileEditModal(); });
    dom.profileEditPictureInput.addEventListener('change', handleProfilePictureSelect);
    dom.profileEditForm.addEventListener('submit', handleProfileEditSubmit);

    // Modal Resultados (V2)
    dom.modalSearchInput.addEventListener('keyup', filterResultsInModal);
    dom.btnCloseResultsModal.addEventListener('click', closeResultsModal);
    dom.modalOverlay.addEventListener('click', (e) => {
        // Fecha modal V2 se clicar fora do conteúdo
        if (e.target === dom.modalOverlay && !dom.modalOverlay.classList.contains('hidden')) {
            closeResultsModal();
        }
    });

    // Estado inicial
    toggleLoginMode(false);

    // --- ROTEADOR PRINCIPAL (Auth State Changed) ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            // --- USUÁRIO LOGADO ---
            authUser = user; // Define o usuário globalmente
            firebase.database().ref('/admins/' + user.uid).once('value', (adminSnapshot) => {
                isAdmin = adminSnapshot.exists() && adminSnapshot.val() === true;

                firebase.database().ref('/users/' + user.uid).once('value', (userSnapshot) => {
                    if (userSnapshot.exists() || isAdmin) {
                        showUserDashboard(user); // Mostra o dashboard (próprio ou de admin)
                    } else {
                        // Verifica se está pendente
                        firebase.database().ref('/pendingApprovals/' + user.uid).once('value', (pendingSnapshot) => {
                            if (pendingSnapshot.exists()) {
                                showPendingView(); // Mostra tela de pendente
                            } else {
                                showRejectedView(user.email); // Mostra tela de rejeitado/não encontrado
                            }
                        }, (error) => { // Trata erro ao ler pendingApprovals
                            if(error.code === "PERMISSION_DENIED") {
                                console.error("ERRO DE REGRAS: Verifique se não-admins podem ler seu próprio nó em /pendingApprovals (se necessário).");
                                signOut(); // Força logout em caso de erro crítico de regras
                                alert("Erro de configuração. Contate o administrador.");
                            } else {
                                console.error("Erro ao verificar pendingApprovals:", error);
                                signOut(); // Força logout
                            }
                        });
                    }
                });
            });
        } else {
            // --- USUÁRIO DESLOGADO ---
            authUser = null; // Limpa usuário global
            showLoggedOutView(); // Mostra tela de login/pública
        }
    });
}); // Fim DOMContentLoaded
