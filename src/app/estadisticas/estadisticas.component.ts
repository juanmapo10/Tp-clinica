
import { AuthService,Usuario } from '../services/auth.service';
import { TurnoService } from '../services/turno.service';
import { Observable } from 'rxjs';
import { formatDate } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';




@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css'
})
export class EstadisticasComponent {
  especialistas$: Observable<Usuario[]> | undefined;
  especialistaSeleccionadoId: string = '';
  fechaDesde: string = '';
  fechaHasta: string = '';
  turnosPorMedicoChart: Chart | null = null;
  turnosPorEspecialidadChart: Chart | null = null;
  turnosPorDiaChart: Chart | null = null;


    showFilters = false;
    chartStates = {
      especialidad: true,
      dia: true,
      medico: true,
      solicitados: true,
      finalizados: true
    };

  constructor(private turnosService: TurnoService, private auth: AuthService) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    const hoy = new Date();

    const hace15Dias = new Date(hoy);
    hace15Dias.setDate(hoy.getDate() - 15);
    this.fechaDesde = formatDate(hace15Dias, 'yyyy-MM-dd', 'en-US');

    const en15Dias = new Date(hoy);
    en15Dias.setDate(hoy.getDate() + 15);
    this.fechaHasta = formatDate(en15Dias, 'yyyy-MM-dd', 'en-US');

    this.especialistas$ = this.auth.obtenerEspecialistas();
    this.especialistas$.subscribe((especialistas) => {
      if (especialistas && especialistas.length > 0) {
        if(especialistas[0].uid)
          {
            this.especialistaSeleccionadoId = especialistas[0].uid;
            this.onEspecialistaChangeById(this.especialistaSeleccionadoId);
        }
      }
    });
    this.cargarDatosGraficosCombinados();
  }

  async cargarDatosGraficosCombinados() {
    const dataEspecialidad =
      await this.turnosService.getTurnosPorEspecialidad();
    this.createTurnosPorEspecialidadChart(
      dataEspecialidad.map((d) => d.especialidad),
      dataEspecialidad.map((d) => d.cantidad)
    );

    const dataPorDia = await this.turnosService.getTurnosPorDia();
    this.createTurnosPorDiaChart(
      dataPorDia.map((d) => d.fecha.toDateString()),
      dataPorDia.map((d) => d.cantidad)
    );
    
    if (this.especialistaSeleccionadoId) {
      const desde = new Date(this.fechaDesde);
      const hasta = new Date(this.fechaHasta);
      const turnosSolicitados =
        await this.turnosService.getTurnosSolicitadosPorMedico(
          this.especialistaSeleccionadoId,
          desde,
          hasta
        );
      const turnosFinalizados =
        await this.turnosService.getTurnosFinalizadosPorMedico(
          this.especialistaSeleccionadoId,
          desde,
          hasta
        );
      this.createTurnosSolicitadosPorMedicoChart(
        ['Solicitados'],
        [turnosSolicitados.length]
      );
      this.createTurnosFinalizadosPorMedicoChart(
        ['Finalizados'],
        [turnosFinalizados.length]
      );
    }
  }

  async onEspecialistaChange(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    const especialistaId = target?.value;
    if (especialistaId) {
      this.onEspecialistaChangeById(especialistaId);
    }
  }
  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  toggleChart(chartName: keyof typeof this.chartStates) {
    this.chartStates[chartName] = !this.chartStates[chartName];
  }

  async onEspecialistaChangeById(especialistaId: string) {
    if (especialistaId && this.fechaDesde && this.fechaHasta) {
      const desde = new Date(this.fechaDesde);
      const hasta = new Date(this.fechaHasta);
      
      const turnosPorMedico = await this.turnosService.getTurnosPorMedico(
        especialistaId,
        desde,
        hasta
      );
  
      if (turnosPorMedico > 0) {
        this.createTurnosPorMedicoChart(['Turnos'], [turnosPorMedico]);
      } else {
        console.warn(
          'No hay datos de turnos para el especialista seleccionado en el intervalo de tiempo.'
        );
      }
      
      const turnosSolicitados = await this.turnosService.getTurnosSolicitadosPorMedico(
        especialistaId,
        desde,
        hasta
      );
      const turnosFinalizados = await this.turnosService.getTurnosFinalizadosPorMedico(
        especialistaId,
        desde,
        hasta
      );
  
      this.createTurnosSolicitadosPorMedicoChart(
        ['Solicitados'],
        [turnosSolicitados.length]
      );
      this.createTurnosFinalizadosPorMedicoChart(
        ['Finalizados'],
        [turnosFinalizados.length]
      );
    }
  }

  

  
  destroySolicitadosAndFinalizadosCharts() {
    const solicitadosChart = document.getElementById(
      'turnosSolicitadosPorMedicoChart'
    ) as HTMLCanvasElement; 
    if (solicitadosChart) {
      const solicitadosChartInstance = Chart.getChart(solicitadosChart);
      if (solicitadosChartInstance) {
        solicitadosChartInstance.destroy();
      }
    }

    const finalizadosChart = document.getElementById(
      'turnosFinalizadosPorMedicoChart'
    ) as HTMLCanvasElement; 
    if (finalizadosChart) {
      const finalizadosChartInstance = Chart.getChart(finalizadosChart);
      if (finalizadosChartInstance) {
        finalizadosChartInstance.destroy();
      }
    }
  }

  async exportToExcel() {
    try {
      const workbook = XLSX.utils.book_new();
      const dataEspecialidad = await this.turnosService.getTurnosPorEspecialidad();
      const wsEspecialidad = XLSX.utils.json_to_sheet(dataEspecialidad);
      XLSX.utils.book_append_sheet(
        workbook,
        wsEspecialidad,
        'Turnos por Especialidad'
      );
  
      const dataPorDia = await this.turnosService.getTurnosPorDia();
      const dataPorDiaFormateado = dataPorDia.map(item => ({
        fecha: formatDate(item.fecha, 'dd/MM/yyyy', 'en-US'),
        cantidad: item.cantidad
      }));
      const wsDia = XLSX.utils.json_to_sheet(dataPorDiaFormateado);
      XLSX.utils.book_append_sheet(workbook, wsDia, 'Turnos por Día');
  
      const turnosSolicitados = await this.turnosService.getTurnosSolicitadosPorMedico(
        this.especialistaSeleccionadoId,
        new Date(this.fechaDesde),
        new Date(this.fechaHasta)
      );
      
      const turnosFinalizados = await this.turnosService.getTurnosFinalizadosPorMedico(
        this.especialistaSeleccionadoId,
        new Date(this.fechaDesde),
        new Date(this.fechaHasta)
      );
      const estadisticasPorMedico = [
        {
          'Período': `${formatDate(this.fechaDesde, 'dd/MM/yyyy', 'en-US')} - ${formatDate(this.fechaHasta, 'dd/MM/yyyy', 'en-US')}`,
          'Tipo de Turno': 'Solicitados',
          'Cantidad': turnosSolicitados.length
        },
        {
          'Período': `${formatDate(this.fechaDesde, 'dd/MM/yyyy', 'en-US')} - ${formatDate(this.fechaHasta, 'dd/MM/yyyy', 'en-US')}`,
          'Tipo de Turno': 'Finalizados',
          'Cantidad': turnosFinalizados.length
        }
      ];
  
      const wsMedico = XLSX.utils.json_to_sheet(estadisticasPorMedico);
      XLSX.utils.book_append_sheet(
        workbook,
        wsMedico,
        'Estadísticas por Médico'
      );
      const sheets = ['Turnos por Especialidad', 'Turnos por Día', 'Estadísticas por Médico'];
      sheets.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const columnas = Object.keys(worksheet)
          .filter(key => key[0] !== '!') 
          .map(key => ({ key, width: key.length }));
        
        const wscols = columnas.map(() => ({ wch: 20 })); 
        worksheet['!cols'] = wscols;
      });
      XLSX.writeFile(workbook, 'EstadisticasTurnos.xlsx');
  
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
    }
  }
  
  exportToPdf() {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const charts = [
      { id: 'turnosPorEspecialidadChart', title: 'Turnos por Especialidad' },
      { id: 'turnosPorDiaChart', title: 'Turnos por Día' },
      { id: 'turnosPorMedicoChart', title: 'Turnos por Especialista' },
      { id: 'turnosSolicitadosPorMedicoChart', title: 'Turnos Solicitados' },
      { id: 'turnosFinalizadosPorMedicoChart', title: 'Turnos Finalizados' }
    ];
  
    let positionY = 10;
    let processedCharts = 0;
  
    const processChart = (chart: { id: string, title: string }, index: number) => {
      const canvas = document.getElementById(chart.id) as HTMLCanvasElement;
      if (canvas) {
        if (positionY > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          positionY = 10;
        }
  
        return html2canvas(canvas, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
          imageTimeout: 0
        }).then((canvasImg) => {
          const imgData = canvasImg.toDataURL('image/png');
          const imgWidth = pageWidth - 20;
          const aspectRatio = canvasImg.width / canvasImg.height;
          const imgHeight = imgWidth / aspectRatio;
  
          doc.text(chart.title, 10, positionY);
          doc.addImage(imgData, 'PNG', 10, positionY + 10, imgWidth, imgHeight);
          positionY += imgHeight + 20;
  
          processedCharts++;
          if (processedCharts === charts.length) {
            doc.save('EstadisticasTurnos.pdf');
          }
        });
      }
      return Promise.resolve();
    };
  
    charts.reduce((promise, chart, index) => {
      return promise.then(() => processChart(chart, index));
    }, Promise.resolve());
  }
 

  ngOnDestroy() {
    if (this.turnosPorMedicoChart) {
      this.turnosPorMedicoChart.destroy();
      this.turnosPorMedicoChart = null;
    }
  }

  onDateChange() {
    if (this.especialistaSeleccionadoId) {
      this.onEspecialistaChangeById(this.especialistaSeleccionadoId);
    }
  }

  createTurnosPorEspecialidadChart(labels: string[], data: number[]) {
    if (this.turnosPorEspecialidadChart) {
      this.turnosPorEspecialidadChart.destroy();
    }

    const backgroundColors = labels.map(() => 
      `rgba(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, 0.6)`
    );
  
    this.turnosPorEspecialidadChart = new Chart('turnosPorEspecialidadChart', {
      type: 'pie',
      data: {
        labels: labels.length ? labels : ['Sin datos'],
        datasets: [
          {
            label: 'Cantidad de Turnos por Especialidad',
            data: data.length ? data : [0],
            backgroundColor: labels.length ? backgroundColors : ['rgba(200, 200, 200, 0.6)']
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: labels.length > 0
          }
        }
      },
    });
  }
  
  createTurnosPorDiaChart(labels: string[], data: number[]) {
    if (this.turnosPorDiaChart) {
      this.turnosPorDiaChart.destroy();
    }
  
    this.turnosPorDiaChart = new Chart('turnosPorDiaChart', {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Sin datos'],
        datasets: [
          {
            label: 'Cantidad de Turnos por Día',
            data: data.length ? data : [0],
            fill: false,
            borderColor: labels.length ? 'rgba(54, 162, 235, 1)' : 'rgba(200, 200, 200, 1)',
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: labels.length > 0
          }
        }
      },
    });
  }
  
  createTurnosPorMedicoChart(labels: string[], data: number[]) {
    if (this.turnosPorMedicoChart) {
      this.turnosPorMedicoChart.destroy();
      this.turnosPorMedicoChart = null;
    }
    const canvas = document.getElementById(
      'turnosPorMedicoChart'
    ) as HTMLCanvasElement | null;
    const context = canvas?.getContext('2d');
  
    if (context) {
      this.turnosPorMedicoChart = new Chart(context, {
        type: 'bar',
        data: {
          labels: labels.length ? labels : ['Sin turnos'],
          datasets: [
            {
              label: 'Cantidad de Turnos por Especialista en Intervalo de Tiempo',
              data: data.length ? data : [0],
              backgroundColor: labels.length ? 'rgba(75, 192, 192, 0.6)' : 'rgba(200, 200, 200, 0.6)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true 
            }
          },
          scales: {
            y: {
              beginAtZero: true, 
              ticks: {
                stepSize: 1 
              }
            }
          }
        },
      });
    } else {
      console.warn(
        'No se pudo crear el gráfico: el contexto del canvas no está disponible.'
      );
    }
  }
  
  createTurnosFinalizadosPorMedicoChart(labels: string[], data: number[]) {
    const finalizadosChartElement = document.getElementById(
      'turnosFinalizadosPorMedicoChart'
    ) as HTMLCanvasElement;
  
    const finalizadosChartInstance = Chart.getChart(finalizadosChartElement);
    if (finalizadosChartInstance) {
      finalizadosChartInstance.destroy();
    }
    new Chart(finalizadosChartElement, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Sin datos'],
        datasets: [
          {
            label: 'Cantidad de Turnos Finalizados',
            data: data.length ? data : [0],
            backgroundColor: labels.length ? 'rgba(255, 159, 64, 0.6)' : 'rgba(200, 200, 200, 0.6)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: labels.length > 0
          }
        }
      },
    });
  }
  
  createTurnosSolicitadosPorMedicoChart(labels: string[], data: number[]) {
    const solicitadosChartElement = document.getElementById(
      'turnosSolicitadosPorMedicoChart'
    ) as HTMLCanvasElement;
  
    const solicitadosChartInstance = Chart.getChart(solicitadosChartElement);
    if (solicitadosChartInstance) {
      solicitadosChartInstance.destroy();
    }
    new Chart(solicitadosChartElement, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Sin datos'],
        datasets: [
          {
            label: 'Cantidad de Turnos Solicitados',
            data: data.length ? data : [0],
            backgroundColor: labels.length ? 'rgba(153, 102, 255, 0.6)' : 'rgba(200, 200, 200, 0.6)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: labels.length > 0
          }
        }
      },
    });
  }

}
