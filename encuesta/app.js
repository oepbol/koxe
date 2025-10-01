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
const votesRef = database.ref('votes');
const locationsRef = database.ref('locations'); // Nueva referencia para las ubicaciones

let currentChart;
let isVoting = false;
let notificationTimeout;

function playVoteSound() {
    const message = new SpeechSynthesisUtterance("Gracias por participar");
    message.lang = "es-ES";
    window.speechSynthesis.speak(message);
}

const votingElements = document.querySelectorAll('.candidate-strip, .other-options button');
if (votingElements.length > 0 && !document.querySelector('.ballot.non-interactive')) {
    
    function showNotification(message) {
        const notificationEl = document.getElementById('notification');
        clearTimeout(notificationTimeout);
        notificationEl.innerHTML = message;
        notificationEl.classList.add('show');
        notificationTimeout = setTimeout(() => {
            notificationEl.classList.remove('show');
        }, 2000);
    }

    function registerVote(element) {
        if (isVoting) return;
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

        if (voteType.startsWith('candidato')) {
            const xMark = document.getElementById(`x-mark-${voteType}`);
            xMark.style.display = 'block';
            setTimeout(() => {
                xMark.style.display = 'none';
            }, 2000);
        }

        const voteUpdate = {};
        voteUpdate[voteType] = firebase.database.ServerValue.increment(1);
        votesRef.update(voteUpdate);

        showNotification(notificationMessage);
        playVoteSound();

        setTimeout(() => {
            isVoting = false;
        }, 2000);
    }

    votingElements.forEach(element => {
        element.addEventListener('click', () => registerVote(element));
    });
}

Chart.register(ChartDataLabels);
const chartCanvas = document.getElementById('resultsChart');
const chartConfig = {
    type: 'bar',
    data: {
        labels: ['PDC Rodrigo Paz', 'LIBRE Tuto Quiroga', 'Blancos', 'Nulos', 'NS / NR'],
        datasets: [{
            label: 'Votos', data: [0, 0, 0, 0, 0],
            backgroundColor: ['#2F695F', '#D32F2F', '#FFFFFF', '#757575', '#ffc107'],
            borderColor: '#BDBDBD', borderWidth: 1
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

function updateDisplay(data) {
    if (!data) return;
    const totalVotes = (data.candidato_a || 0) + (data.candidato_b || 0) + (data.blancos || 0) + (data.nulos || 0) + (data.nsnr || 0);
    document.getElementById('total-votes').textContent = `Total encuestados: ${totalVotes}`;

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

votesRef.on('value', (snapshot) => {
    const data = snapshot.val();
    updateDisplay(data);
});

document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const mainContainer = document.querySelector('.container');

    if (loginContainer) {
        mainContainer.classList.add('hidden');

        const loginForm = document.getElementById('login-form');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const loginError = document.getElementById('login-error');
        const auth = firebase.auth();

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = usernameInput.value;
            const password = passwordInput.value;
            loginError.textContent = "";

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    loginContainer.style.display = 'none';
                    mainContainer.classList.remove('hidden');
                })
                .catch((error) => {
                    loginError.textContent = "Usuario o contraseña incorrectos.";
                });
        });
    }
});

const shareButton = document.getElementById('share-button');
if (shareButton && window.location.pathname.includes('resultados')) {
    shareButton.addEventListener('click', async function() {
        const extraSpaceHeight = 140;
        const qrCodeSize = 100;
        const margin = 20;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        const chartWidth = chartCanvas.width;
        const chartHeight = chartCanvas.height;

        tempCanvas.width = chartWidth;
        tempCanvas.height = chartHeight + extraSpaceHeight;

        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(chartCanvas, 0, 0);

        const footerStartY = chartCanvas.height + 50;
        
        tempCtx.fillStyle = 'black';
        tempCtx.textAlign = 'left';

        tempCtx.font = 'bold 20px sans-serif';
        tempCtx.fillText('SONDEO GENERAL - RESULTADOS OFICIALES', margin, footerStartY);
        
        const pageLink = window.location.href.replace('.html', '');
        tempCtx.font = '14px sans-serif';
        
        const text = `Ver resultados en vivo: ${pageLink}`;
        const maxWidth = tempCanvas.width - qrCodeSize - (margin * 2.5);
        const lineHeight = 18;
        let y = footerStartY + 30;

        function wrapText(context, text, x, y, maxWidth, lineHeight) {
            let words = text.split(' ');
            let line = '';
            for(let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = context.measureText(testLine);
                let testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    context.fillText(line, x, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
            context.fillText(line, x, y);
        }
        
        wrapText(tempCtx, text, margin, y, maxWidth, lineHeight);

        try {
            const qrCanvas = document.createElement('canvas');
            await QRCode.toCanvas(qrCanvas, pageLink, { width: qrCodeSize, margin: 1 });
            const qrX = tempCanvas.width - qrCodeSize - margin;
            const qrY = chartCanvas.height + 30;
            tempCtx.drawImage(qrCanvas, qrX, qrY);
        } catch (err) {
            console.error("Error al generar QR:", err);
        }

        tempCanvas.toBlob(async function(blob) {
            try {
                const file = new File([blob], 'resultados-oficiales.png', { type: 'image/png' });
                if (navigator.share) {
                    await navigator.share({
                        title: 'Resultados del Sondeo Oficial',
                        text: 'Estos son los resultados del sondeo oficial en tiempo real.',
                        files: [file]
                    });
                } else {
                    alert("Función de compartir no compatible.");
                }
            } catch (error) {
                console.error('Error al compartir:', error);
            }
        }, 'image/png');
    });
}

// --- LÓGICA AÑADIDA PARA INICIALIZAR EL MAPA ---
document.addEventListener('DOMContentLoaded', function() {
    const mapElement = document.getElementById('map');
    if (mapElement) {
        const map = L.map('map').setView([-16.5, -64.5], 5); // Centrado en Bolivia

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        locationsRef.on('child_added', (snapshot) => {
            const location = snapshot.val();
            if (location.lat && location.lng) {
                L.marker([location.lat, location.lng]).addTo(map)
                    .bindPopup(`Punto de encuesta registrado el ${new Date(location.timestamp).toLocaleString()}`);
            }
        });
    }
});