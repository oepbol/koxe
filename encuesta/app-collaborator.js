// Sistema inteligente para colaboradores aprobados
const firebaseConfig = {
    apiKey: "AIzaSyCBD-xQh9223xKez9wBqK2KJOGqF9yZjFo",
    authDomain: "encuesta-f2a28.firebaseapp.com",
    databaseURL: "https://encuesta-f2a28-default-rtdb.firebaseio.com",
    projectId: "encuesta-f2a28",
    storageBucket: "encuesta-f2a28.appspot.com",
    messagingSenderId: "491969168385",
    appId: "1:491969168385:web:f7b989b9aaf8562fd7ac00"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Referencias a las diferentes bases de datos
const votesRef = database.ref('votes'); // Votos oficiales (administrador)
const collabVotesRef = database.ref('collaborative_votes'); // Votos colaborativos
const approvedCollabsRef = database.ref('approved_collaborators');
const locationsRef = database.ref('locations');

let currentChart;
let isVoting = false;
let notificationTimeout;
let userType = 'guest'; // 'admin', 'collaborator', 'guest'
let collaboratorData = null;
let currentVotesRef = null; // Referencia dinámica según el tipo de usuario

// Sistema de detección de tipo de usuario
document.addEventListener('DOMContentLoaded', async () => {
    await detectUserType();
    initializeVotingSystem();
});

async function detectUserType() {
    return new Promise((resolve) => {
        // Primero verificar si hay un colaborador logueado
        const savedCollaborator = localStorage.getItem('currentCollaborator');
        if (savedCollaborator) {
            try {
                collaboratorData = JSON.parse(savedCollaborator);
                userType = 'collaborator';
                currentVotesRef = collabVotesRef.child(collaboratorData.collaborator_id);
                updateUIForCollaborator();
                resolve();
                return;
            } catch (e) {
                localStorage.removeItem('currentCollaborator');
            }
        }

        // Verificar si hay autenticación de admin
        auth.onAuthStateChanged((user) => {
            if (user) {
                userType = 'admin';
                currentVotesRef = votesRef;
                updateUIForAdmin();
            } else {
                userType = 'guest';
                currentVotesRef = null;
                updateUIForGuest();
            }
            resolve();
        });
    });
}

function updateUIForAdmin() {
    const titleElement = document.querySelector('h2');
    if (titleElement && titleElement.textContent.includes('¿Por quién va ha votar?')) {
        titleElement.textContent = 'Panel Oficial de Administrador';
        titleElement.style.color = '#dc3545';
    }
    
    // Agregar indicador visual
    addUserTypeIndicator('ADMINISTRADOR', '#dc3545');
}

function updateUIForCollaborator() {
    const titleElement = document.querySelector('h2');
    if (titleElement && titleElement.textContent.includes('¿Por quién va ha votar?')) {
        titleElement.textContent = `Panel de Colaborador: ${collaboratorData.nombre}`;
        titleElement.style.color = '#28a745';
    }
    
    // Agregar información de ubicación
    const container = document.querySelector('.container');
    const locationInfo = document.createElement('div');
    locationInfo.style.cssText = 'background: #d4edda; padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center;';
    locationInfo.innerHTML = `
        <strong>Encuestando en:</strong> ${collaboratorData.provincia}, ${collaboratorData.departamento}<br>
        <small>ID: ${collaboratorData.collaborator_id}</small>
    `;
    container.insertBefore(locationInfo, container.children[1]);
    
    addUserTypeIndicator('COLABORADOR AUTORIZADO', '#28a745');
}

function updateUIForGuest() {
    // Deshabilitar votación para invitados
    const votingElements = document.querySelectorAll('.candidate-strip, .other-options button');
    votingElements.forEach(element => {
        element.style.opacity = '0.6';
        element.style.pointerEvents = 'none';
    });
    
    // Mostrar login de colaborador
    showCollaboratorLogin();
}

function addUserTypeIndicator(text, color) {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed; top: 10px; right: 10px; 
        background: ${color}; color: white; 
        padding: 8px 15px; border-radius: 20px; 
        font-size: 0.9em; font-weight: bold; 
        z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    indicator.textContent = text;
    document.body.appendChild(indicator);
}

function showCollaboratorLogin() {
    const loginDiv = document.createElement('div');
    loginDiv.style.cssText = `
        background: #fff3cd; border: 1px solid #ffeaa7; 
        padding: 20px; margin: 20px 0; border-radius: 8px;
    `;
    
    loginDiv.innerHTML = `
        <h3 style="margin-top: 0; color: #856404;">Acceso de Colaborador</h3>
        <p style="color: #856404; margin-bottom: 15px;">
            Para votar, ingrese sus credenciales de colaborador aprobado:
        </p>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <input type="text" id="collab-id" placeholder="ID de Colaborador" 
                   style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; flex: 1; min-width: 150px;">
            <input type="text" id="collab-code" placeholder="Código de Acceso" 
                   style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; flex: 1; min-width: 150px;">
            <button onclick="loginCollaborator()" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                Iniciar Sesión
            </button>
        </div>
        <div id="login-status" style="margin-top: 10px; font-size: 0.9em;"></div>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(loginDiv, container.children[1]);
}

window.loginCollaborator = function() {
    const collaboratorId = document.getElementById('collab-id').value.trim();
    const accessCode = document.getElementById('collab-code').value.trim();
    const statusDiv = document.getElementById('login-status');
    
    if (!collaboratorId || !accessCode) {
        statusDiv.innerHTML = '<span style="color: #dc3545;">Por favor complete todos los campos.</span>';
        return;
    }
    
    // Verificar credenciales
    approvedCollabsRef.child(collaboratorId).once('value', (snapshot) => {
        if (!snapshot.exists()) {
            statusDiv.innerHTML = '<span style="color: #dc3545;">ID de colaborador no encontrado.</span>';
            return;
        }
        
        const collaborator = snapshot.val();
        if (collaborator.access_code !== accessCode) {
            statusDiv.innerHTML = '<span style="color: #dc3545;">Código de acceso incorrecto.</span>';
            return;
        }
        
        // Login exitoso
        collaboratorData = collaborator;
        userType = 'collaborator';
        currentVotesRef = collabVotesRef.child(collaboratorId);
        
        // Guardar sesión
        localStorage.setItem('currentCollaborator', JSON.stringify(collaborator));
        
        // Recargar página para aplicar cambios
        window.location.reload();
    });
};

function initializeVotingSystem() {
    // Solo inicializar votación si hay una referencia válida
    if (!currentVotesRef) return;
    
    const votingElements = document.querySelectorAll('.candidate-strip, .other-options button');
    if (votingElements.length === 0) return;

    // Inicializar datos de votos si no existen
    currentVotesRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            const initialData = {
                candidato_a: 0,
                candidato_b: 0,
                blancos: 0,
                nulos: 0,
                nsnr: 0
            };
            currentVotesRef.set(initialData);
        }
    });

    // Configurar event listeners para votación
    votingElements.forEach(element => {
        if (!document.querySelector('.ballot.non-interactive')) {
            element.addEventListener('click', () => registerVote(element));
        }
    });

    // Configurar gráfico
    initializeChart();
    
    // Escuchar cambios en los votos
    currentVotesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        updateDisplay(data);
    });
}

function registerVote(element) {
    if (isVoting || !currentVotesRef) return;
    isVoting = true;

    const voteType = element.dataset.vote;
    let voteName = element.dataset.name;
    let notificationMessage;

    if (voteType === 'candidato_a') {
        voteName = "Rodrigo Paz y Edmand Lara";
        notificationMessage = `Usted ha Votado por <strong>${voteName}</strong>.<br><br>Tu voto se ha registrado exitosamente.`;
    } else if (voteType === 'candidato_b') {
        voteName = "Jorge Tuto Quiroga y Juan Pablo Velasco";
        notificationMessage = `Usted ha Votado por <strong>${voteName}</strong>.<br><br>Tu voto se ha registrado exitosamente.`;
    } else {
        notificationMessage = `Usted ha registrado la opción <strong>${voteName}</strong>.<br><br>Tu voto se ha registrado exitosamente.`;
    }

    // Mostrar marca X para candidatos
    if (voteType.startsWith('candidato')) {
        const xMark = document.getElementById(`x-mark-${voteType}`);
        if (xMark) {
            xMark.style.display = 'block';
            setTimeout(() => {
                xMark.style.display = 'none';
            }, 2000);
        }
    }

    // Registrar voto en la base de datos correspondiente
    const voteUpdate = {};
    voteUpdate[voteType] = firebase.database.ServerValue.increment(1);
    currentVotesRef.update(voteUpdate);

    // Registrar ubicación si es colaborador
    if (userType === 'collaborator' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const locationData = {
                collaborator_id: collaboratorData.collaborator_id,
                collaborator_name: collaboratorData.nombre,
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                vote_type: voteType
            };
            locationsRef.push(locationData);
        });
    }

    showNotification(notificationMessage);
    playVoteSound();

    setTimeout(() => {
        isVoting = false;
    }, 2000);
}

function playVoteSound() {
    const message = new SpeechSynthesisUtterance("Gracias por participar");
    message.lang = "es-ES";
    window.speechSynthesis.speak(message);
}

function showNotification(message) {
    const notificationEl = document.getElementById('notification');
    if (!notificationEl) return;
    
    clearTimeout(notificationTimeout);
    notificationEl.innerHTML = message;
    notificationEl.classList.add('show');
    notificationTimeout = setTimeout(() => {
        notificationEl.classList.remove('show');
    }, 2000);
}

function initializeChart() {
    const chartCanvas = document.getElementById('resultsChart');
    if (!chartCanvas) return;

    Chart.register(ChartDataLabels);
    
    const chartConfig = {
        type: 'bar',
        data: {
            labels: ['PDC Rodrigo Paz', 'LIBRE Tuto Quiroga', 'Blancos', 'Nulos', 'NS / NR'],
            datasets: [{
                label: 'Votos',
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#2F695F', '#D32F2F', '#FFFFFF', '#757575', '#ffc107'],
                borderColor: '#BDBDBD',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: 'blue',
                    anchor: 'start',
                    align: 'end',
                    textAlign: 'center',
                    offset: 8,
                    formatter: function(value, context) {
                        const total = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                        if (total === 0) return '0.0%';
                        const percentage = (value / total * 100).toFixed(1) + '%';
                        return percentage;
                    },
                    font: {
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    };
    
    currentChart = new Chart(chartCanvas, chartConfig);
}

function updateDisplay(data) {
    if (!data) return;
    
    const totalVotes = (data.candidato_a || 0) + (data.candidato_b || 0) + 
                      (data.blancos || 0) + (data.nulos || 0) + (data.nsnr || 0);
    
    const totalElement = document.getElementById('total-votes');
    if (totalElement) {
        let prefix = 'Total encuestados: ';
        if (userType === 'collaborator') {
            prefix = `Encuestados por ${collaboratorData.nombre}: `;
        } else if (userType === 'admin') {
            prefix = 'Total oficial: ';
        }
        totalElement.textContent = prefix + totalVotes;
    }

    const originalData = [
        { label: 'PDC Rodrigo Paz', value: data.candidato_a || 0, color: '#2F695F' },
        { label: 'LIBRE Tuto Quiroga', value: data.candidato_b || 0, color: '#D32F2F' },
        { label: 'Blancos', value: data.blancos || 0, color: '#FFFFFF' },
        { label: 'Nulos', value: data.nulos || 0, color: '#757575' },
        { label: 'NS / NR', value: data.nsnr || 0, color: '#ffc107' }
    ];
    
    const sortedData = originalData.sort((a, b) => b.value - a.value);

    if (currentChart) {
        currentChart.data.labels = sortedData.map(item => item.label);
        currentChart.data.datasets[0].data = sortedData.map(item => item.value);
        currentChart.data.datasets[0].backgroundColor = sortedData.map(item => item.color);
        currentChart.update();
    }
}

// Función para cerrar sesión de colaborador
window.logoutCollaborator = function() {
    if (confirm('¿Está seguro de cerrar sesión?')) {
        localStorage.removeItem('currentCollaborator');
        window.location.reload();
    }
};

// Agregar botón de logout para colaboradores
if (userType === 'collaborator') {
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Cerrar Sesión';
    logoutBtn.onclick = logoutCollaborator;
    logoutBtn.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        padding: 10px 15px; background: #dc3545; color: white;
        border: none; border-radius: 5px; cursor: pointer;
        font-weight: bold; z-index: 1000;
    `;
    document.body.appendChild(logoutBtn);
}