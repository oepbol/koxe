// Script complementario para análisis avanzado de resultados
// Este archivo se puede agregar opcionalmente para funcionalidades extras

class ResultadosAnalyzer {
    constructor() {
        this.historicalData = [];
        this.updateInterval = null;
    }

    // Guardar snapshot histórico cada 5 minutos
    startHistoricalTracking() {
        this.updateInterval = setInterval(() => {
            this.saveSnapshot();
        }, 5 * 60 * 1000); // 5 minutos
    }

    saveSnapshot() {
        const snapshot = {
            timestamp: Date.now(),
            official: { ...allData.official },
            collaborative: { ...allData.collaborative },
            totalOfficial: Object.values(allData.official).reduce((a, b) => a + b, 0),
            totalCollaborative: Object.values(allData.collaborative).reduce((a, b) => a + b, 0)
        };
        
        this.historicalData.push(snapshot);
        
        // Guardar en localStorage (últimos 100 registros)
        if (this.historicalData.length > 100) {
            this.historicalData.shift();
        }
        
        localStorage.setItem('encuesta_historical', JSON.stringify(this.historicalData));
    }

    loadHistoricalData() {
        const saved = localStorage.getItem('encuesta_historical');
        if (saved) {
            this.historicalData = JSON.parse(saved);
        }
    }

    getTrends() {
        if (this.historicalData.length < 2) {
            return null;
        }

        const latest = this.historicalData[this.historicalData.length - 1];
        const previous = this.historicalData[this.historicalData.length - 2];

        const trends = {
            candidato_a: {
                change: latest.official.candidato_a - previous.official.candidato_a,
                percentage: this.calculatePercentageChange(
                    previous.official.candidato_a,
                    latest.official.candidato_a
                )
            },
            candidato_b: {
                change: latest.official.candidato_b - previous.official.candidato_b,
                percentage: this.calculatePercentageChange(
                    previous.official.candidato_b,
                    latest.official.candidato_b
                )
            }
        };

        return trends;
    }

    calculatePercentageChange(oldVal, newVal) {
        if (oldVal === 0) return newVal > 0 ? 100 : 0;
        return ((newVal - oldVal) / oldVal * 100).toFixed(2);
    }

    generateReport() {
        const consolidated = {
            candidato_a: allData.official.candidato_a + allData.collaborative.candidato_a,
            candidato_b: allData.official.candidato_b + allData.collaborative.candidato_b,
            blancos: allData.official.blancos + allData.collaborative.blancos,
            nulos: allData.official.nulos + allData.collaborative.nulos,
            nsnr: allData.official.nsnr + allData.collaborative.nsnr
        };

        const total = Object.values(consolidated).reduce((a, b) => a + b, 0);
        const validVotes = consolidated.candidato_a + consolidated.candidato_b;
        const invalidVotes = consolidated.blancos + consolidated.nulos;

        const report = {
            fecha: new Date().toISOString(),
            total_encuestados: total,
            votos_validos: validVotes,
            votos_invalidos: invalidVotes,
            abstencion: consolidated.nsnr,
            candidato_a: {
                votos: consolidated.candidato_a,
                porcentaje_total: (consolidated.candidato_a / total * 100).toFixed(2),
                porcentaje_validos: validVotes > 0 ? (consolidated.candidato_a / validVotes * 100).toFixed(2) : 0
            },
            candidato_b: {
                votos: consolidated.candidato_b,
                porcentaje_total: (consolidated.candidato_b / total * 100).toFixed(2),
                porcentaje_validos: validVotes > 0 ? (consolidated.candidato_b / validVotes * 100).toFixed(2) : 0
            },
            blancos: {
                votos: consolidated.blancos,
                porcentaje: (consolidated.blancos / total * 100).toFixed(2)
            },
            nulos: {
                votos: consolidated.nulos,
                porcentaje: (consolidated.nulos / total * 100).toFixed(2)
            },
            nsnr: {
                votos: consolidated.nsnr,
                porcentaje: (consolidated.nsnr / total * 100).toFixed(2)
            },
            desglose: {
                oficial: {
                    total: Object.values(allData.official).reduce((a, b) => a + b, 0),
                    porcentaje: (Object.values(allData.official).reduce((a, b) => a + b, 0) / total * 100).toFixed(2)
                },
                colaborativo: {
                    total: Object.values(allData.collaborative).reduce((a, b) => a + b, 0),
                    porcentaje: (Object.values(allData.collaborative).reduce((a, b) => a + b, 0) / total * 100).toFixed(2)
                }
            },
            colaboradores_activos: Object.keys(allData.collaborators).length,
            departamentos_cubiertos: Object.keys(allData.departments).length
        };

        return report;
    }

    exportReportAsJSON() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    exportReportAsCSV() {
        const report = this.generateReport();
        
        let csv = 'Categoría,Valor\n';
        csv += `Fecha,${report.fecha}\n`;
        csv += `Total Encuestados,${report.total_encuestados}\n`;
        csv += `Votos Válidos,${report.votos_validos}\n`;
        csv += `Votos Inválidos,${report.votos_invalidos}\n`;
        csv += `\nCandidato,Votos,% Total,% Válidos\n`;
        csv += `PDC Rodrigo Paz,${report.candidato_a.votos},${report.candidato_a.porcentaje_total},${report.candidato_a.porcentaje_validos}\n`;
        csv += `LIBRE Tuto Quiroga,${report.candidato_b.votos},${report.candidato_b.porcentaje_total},${report.candidato_b.porcentaje_validos}\n`;
        csv += `\nOtras Opciones,Votos,Porcentaje\n`;
        csv += `Blancos,${report.blancos.votos},${report.blancos.porcentaje}\n`;
        csv += `Nulos,${report.nulos.votos},${report.nulos.porcentaje}\n`;
        csv += `NS/NR,${report.nsnr.votos},${report.nsnr.porcentaje}\n`;

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    getDepartmentRanking() {
        const rankings = [];
        
        Object.keys(allData.departments).forEach(dept => {
            const votes = allData.departments[dept];
            const total = Object.values(votes).reduce((a, b) => a + b, 0);
            
            rankings.push({
                departamento: dept,
                total: total,
                candidato_a_pct: total > 0 ? (votes.candidato_a / total * 100).toFixed(1) : 0,
                candidato_b_pct: total > 0 ? (votes.candidato_b / total * 100).toFixed(1) : 0,
                ganador: votes.candidato_a > votes.candidato_b ? 'PDC' : 'LIBRE'
            });
        });

        return rankings.sort((a, b) => b.total - a.total);
    }

    getTopCollaborators(limit = 5) {
        const collabStats = [];
        
        Object.keys(allData.collaborators).forEach(collabId => {
            const votes = allData.collaborators[collabId];
            const total = Object.values(votes).reduce((a, b) => a + b, 0);
            
            collabStats.push({
                id: collabId,
                total: total
            });
        });

        return collabStats.sort((a, b) => b.total - a.total).slice(0, limit);
    }
}

// Función para crear botones de exportación
function addExportButtons() {
    const container = document.querySelector('.results-container');
    if (!container || document.getElementById('export-buttons')) return;

    const exportDiv = document.createElement('div');
    exportDiv.id = 'export-buttons';
    exportDiv.style.cssText = 'margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;';
    
    exportDiv.innerHTML = `
        <button onclick="analyzer.exportReportAsJSON()" class="share-button" style="background: #17a2b8;">
            <i class="fas fa-download"></i> Exportar JSON
        </button>
        <button onclick="analyzer.exportReportAsCSV()" class="share-button" style="background: #28a745;">
            <i class="fas fa-file-csv"></i> Exportar CSV
        </button>
        <button onclick="showDetailedReport()" class="share-button" style="background: #6c757d;">
            <i class="fas fa-chart-line"></i> Ver Reporte Detallado
        </button>
    `;
    
    container.appendChild(exportDiv);
}

// Mostrar reporte detallado en modal
function showDetailedReport() {
    const report = analyzer.generateReport();
    const trends = analyzer.getTrends();
    const deptRanking = analyzer.getDepartmentRanking();
    
    let html = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;" onclick="this.remove()">
            <div style="background: white; padding: 30px; border-radius: 15px; max-width: 800px; max-height: 90vh; overflow-y: auto;" onclick="event.stopPropagation()">
                <h2 style="margin-top: 0; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                    📊 Reporte Detallado de Resultados
                </h2>
                
                <div style="margin: 20px 0;">
                    <h3 style="color: #555;">Resumen General</h3>
                    <p><strong>Fecha:</strong> ${new Date(report.fecha).toLocaleString('es-ES')}</p>
                    <p><strong>Total de Encuestados:</strong> ${report.total_encuestados}</p>
                    <p><strong>Votos Válidos:</strong> ${report.votos_validos} (${((report.votos_validos / report.total_encuestados) * 100).toFixed(1)}%)</p>
                    <p><strong>Votos Inválidos:</strong> ${report.votos_invalidos} (${((report.votos_invalidos / report.total_encuestados) * 100).toFixed(1)}%)</p>
                    <p><strong>NS/NR:</strong> ${report.nsnr.votos} (${report.nsnr.porcentaje}%)</p>
                </div>

                <div style="margin: 20px 0;">
                    <h3 style="color: #555;">Resultados por Candidato</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                        <strong style="color: #2F695F;">PDC Rodrigo Paz y Edmand Lara</strong><br>
                        Votos: ${report.candidato_a.votos}<br>
                        Porcentaje Total: ${report.candidato_a.porcentaje_total}%<br>
                        Porcentaje Válidos: ${report.candidato_a.porcentaje_validos}%
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                        <strong style="color: #D32F2F;">LIBRE Jorge Tuto Quiroga y Juan Pablo Velasco</strong><br>
                        Votos: ${report.candidato_b.votos}<br>
                        Porcentaje Total: ${report.candidato_b.porcentaje_total}%<br>
                        Porcentaje Válidos: ${report.candidato_b.porcentaje_validos}%
                    </div>
                </div>

                <div style="margin: 20px 0;">
                    <h3 style="color: #555;">Desglose por Fuente</h3>
                    <p><strong>Votos Oficiales:</strong> ${report.desglose.oficial.total} (${report.desglose.oficial.porcentaje}%)</p>
                    <p><strong>Votos Colaborativos:</strong> ${report.desglose.colaborativo.total} (${report.desglose.colaborativo.porcentaje}%)</p>
                    <p><strong>Colaboradores Activos:</strong> ${report.colaboradores_activos}</p>
                    <p><strong>Departamentos Cubiertos:</strong> ${report.departamentos_cubiertos}</p>
                </div>
    `;

    if (deptRanking.length > 0) {
        html += `
                <div style="margin: 20px 0;">
                    <h3 style="color: #555;">Ranking por Departamento</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #007bff; color: white;">
                                <th style="padding: 10px; text-align: left;">Departamento</th>
                                <th style="padding: 10px; text-align: center;">Total</th>
                                <th style="padding: 10px; text-align: center;">PDC %</th>
                                <th style="padding: 10px; text-align: center;">LIBRE %</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        deptRanking.forEach((dept, index) => {
            html += `
                            <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                                <td style="padding: 10px;">${dept.departamento}</td>
                                <td style="padding: 10px; text-align: center;">${dept.total}</td>
                                <td style="padding: 10px; text-align: center;">${dept.candidato_a_pct}%</td>
                                <td style="padding: 10px; text-align: center;">${dept.candidato_b_pct}%</td>
                            </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
        `;
    }

    html += `
                <div style="text-align: center; margin-top: 30px;">
                    <button onclick="this.closest('div[style*=fixed]').remove()" style="padding: 12px 30px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px;">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

// Inicializar analyzer
const analyzer = new ResultadosAnalyzer();
analyzer.loadHistoricalData();
analyzer.startHistoricalTracking();

// Agregar botones de exportación cuando el DOM esté listo
setTimeout(() => {
    addExportButtons();
}, 2000);