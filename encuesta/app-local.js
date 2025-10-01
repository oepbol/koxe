document.addEventListener('DOMContentLoaded', function() {
    const datosEncuestador = JSON.parse(localStorage.getItem('datosEncuestadorLocal'));
    if (!datosEncuestador) {
        alert("Por favor, registra tus datos de encuestador primero.");
        window.location.href = 'registro-local.html';
        return;
    }

    document.getElementById('local-title').textContent = `Panel de Encuesta: ${datosEncuestador.comunidad}`;

    let localVotes = JSON.parse(localStorage.getItem('votosEncuestaLocal')) || {
        candidato_a: 0, candidato_b: 0, blancos: 0, nulos: 0, nsnr: 0
    };

    let currentChart;
    let isVoting = false;
    let notificationTimeout;

    function playVoteSound() {
        const message = new SpeechSynthesisUtterance("Gracias por participar");
        message.lang = "es-ES";
        window.speechSynthesis.speak(message);
    }

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
        localVotes[voteType]++;
        localStorage.setItem('votosEncuestaLocal', JSON.stringify(localVotes));
        updateDisplay(localVotes);

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
            setTimeout(() => { xMark.style.display = 'none'; }, 2000);
        }

        showNotification(notificationMessage);
        playVoteSound();

        setTimeout(() => { isVoting = false; }, 2000);
    }

    document.querySelectorAll('.candidate-strip, .other-options button').forEach(element => {
        element.addEventListener('click', () => registerVote(element));
    });

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
                // --- Bloque para reemplazar en app.js y app-local.js ---
datalabels: {
    color: 'blue',
    anchor: 'start', // Ancla la etiqueta al inicio del área de datos
    align: 'end',    // Alinea el texto al final de su "ancla" (es decir, a la derecha del eje Y)
    textAlign: 'center',
    offset: 8,       // Distancia en píxeles desde el eje Y
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
        const totalVotes = Object.values(data).reduce((sum, count) => sum + count, 0);
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

    document.getElementById('share-button').addEventListener('click', async function() {
    const extraSpaceHeight = 180;
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

    const footerStartY = chartCanvas.height + 40;
    
    tempCtx.fillStyle = 'black';
    tempCtx.textAlign = 'left';

    tempCtx.font = 'bold 20px sans-serif';
    tempCtx.fillText(`SONDEO LOCAL - ${datosEncuestador.comunidad.toUpperCase()}`, margin, footerStartY);
    
    tempCtx.font = '16px sans-serif';
    tempCtx.fillText(`REALIZADO POR: ${datosEncuestador.nombre.toUpperCase()}`, margin, footerStartY + 30);

    // --- LÓGICA DE TEXTO DINÁMICO ---
    let linkToUse = datosEncuestador.enlace;
    let linkTextPrefix = "Prueba en video: ";
    let qrInstructionText = "Escanee el QR para ver la prueba.";

    if (!linkToUse) {
        linkToUse = window.location.href.replace('.html', '');
        linkTextPrefix = "Sondeo realizado en: ";
        qrInstructionText = "Escanee el QR para visitar la página.";
    }

    tempCtx.font = '14px sans-serif';
    const text = linkTextPrefix + linkToUse;
    const maxWidth = tempCanvas.width - qrCodeSize - (margin * 2.5);
    const lineHeight = 18;
    let y = footerStartY + 55;

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
    
    tempCtx.font = 'italic 14px sans-serif';
    tempCtx.fillText(qrInstructionText, margin, footerStartY + 100);
    
    try {
        const qrCanvas = document.createElement('canvas');
        await QRCode.toCanvas(qrCanvas, linkToUse, { width: qrCodeSize, margin: 1 });
        const qrX = tempCanvas.width - qrCodeSize - margin;
        const qrY = chartCanvas.height + 45;
        tempCtx.drawImage(qrCanvas, qrX, qrY);
    } catch (err) {
        console.error("Error al generar el código QR:", err);
    }

    tempCanvas.toBlob(async function(blob) {
        try {
            const file = new File([blob], 'resultados-sondeo-local.png', { type: 'image/png' });
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Resultados del Sondeo en ${datosEncuestador.comunidad}`,
                    text: `Estos son los resultados del sondeo que realicé en ${datosEncuestador.comunidad}.`,
                    files: [file]
                });
            } else {
                alert("La función de compartir no es compatible con este navegador.");
            }
        } catch (error) {
            console.error('Error al compartir:', error);
        }
    }, 'image/png');
});

    updateDisplay(localVotes);
});