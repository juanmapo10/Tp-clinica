import { Component, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AuthService, Usuario } from '../../services/auth.service';
import { Turno, TurnoService,HistoriaClinica } from '../../services/turno.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-especialistas-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './especialistas-turnos.component.html',
  styleUrl: './especialistas-turnos.component.css'
})
export class EspecialistasTurnosComponent implements OnInit, OnDestroy {
  currentUser$ = new BehaviorSubject<Usuario | null>(null);
  
  turnos: Turno[] = [];
  cargandoTurnos: boolean = false;
  error: string | null = null;
  horariosDisponibles: Date[] = [];
  turnosFiltrados: Turno[] = [];
  historiasClinicas: HistoriaClinica[] = [];
  textoBusqueda: string = '';

  especialidadSeleccionada: string = '';
  especialistaSeleccionado: string = '';
  horarioSeleccionado: Date | null = null;
  filtroEspecialidad: string = '';
  filtroEspecialista: string = '';

  mostrarEncuesta: string | null = null;
  comentarioCancelacion: string = '';
  mostrarDevolucion: string | null = null;
  comentarioDevolucion: string = '';

  mostrarHistoriaClinica: string | null = null;
  historiaClinica: HistoriaClinica = {
    uid: '',
    turnoId: '',
    datosGenerales: {
      altura: 0,
      peso: 0,
      temperatura: 0,
      presion: ''
    },
    datosDinamicos: []
  };

  private subscriptions: Subscription = new Subscription();

  constructor(
    private turnoService: TurnoService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    console.log('Iniciando EspecialistasTurnosComponent');
    this.inicializarComponente();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private inicializarComponente() {
    const authSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.authService.getCurrentUserType().then(usuarioTipo => {
          if (usuarioTipo === 'especialista') {
            const currentUser = {
              uid: user.uid,
              email: user.email,
              tipo: usuarioTipo
            } as Usuario;

            this.currentUser$.next(currentUser);
            this.cargarDatosIniciales();
          } else {
            this.error = 'Acceso no autorizado: Usuario no es especialista';
          }
        }).catch(error => {
          this.error = 'Error al cargar información de usuario';
        });
      } else {
        this.currentUser$.next(null);
        this.resetearDatos();
      }
    });
  }

  private async cargarDatosIniciales() {
    try {
      await this.cargarTurnos();
      await this.cargarHistoriasClinicas();
    } catch (error) {
      this.error = 'Error al cargar datos iniciales';
    }
  }

  private resetearDatos() {
    this.turnos = [];
    this.turnosFiltrados = [];
    this.historiasClinicas = [];
    this.error = null;
  }

  private async cargarTurnos() {
    const user = this.currentUser$.value;
    if (!user?.uid) return;

    this.cargandoTurnos = true;
    this.error = null;

    try {
      const turnosSub = this.turnoService.getTurnosEspecialista(user.uid).subscribe(
        turnos => {
          this.turnos = this.ordenarTurnos(turnos);
          this.aplicarFiltro();
          this.cargandoTurnos = false;
        },
        error => {
          this.error = 'Error al cargar turnos';
          this.cargandoTurnos = false;
        }
      );

      this.subscriptions.add(turnosSub);
    } catch (error) {
      this.error = 'Error al procesar turnos';
      this.cargandoTurnos = false;
    }
  }

  filtrarTurnos(): Turno[] {
    if (!this.turnos.length) return [];
    
    return this.turnos.filter(turno => {
      const matchEspecialidad = !this.filtroEspecialidad || 
        turno.especialidad.toLowerCase().includes(this.filtroEspecialidad.toLowerCase());
      const matchEspecialista = !this.filtroEspecialista || 
        turno.especialista.toLowerCase().includes(this.filtroEspecialista.toLowerCase());
      return matchEspecialidad && matchEspecialista;
    });
  }



  async cancelarTurno(turnoId: string, comentario: string) {
    if (!turnoId) {
      console.error('ID de turno no válido');
      return;
    }

    try {
      await this.turnoService.actualizarEstadoTurno(turnoId, 'rechazado', comentario);
      console.log('Turno cancelado exitosamente');
      await this.cargarTurnos();
    } catch (error) {
      console.error('Error al cancelar turno:', error);
      this.error = 'Error al cancelar el turno';
    }
  }

  async confirmarCancelacion(turnoId: string) {
    if (this.comentarioCancelacion.trim()) {
      await this.cancelarTurno(turnoId, this.comentarioCancelacion);
      this.mostrarEncuesta = null; 
      this.comentarioCancelacion = '';
    } else {
      this.error = 'Por favor, ingresa un motivo para cancelar el turno.';
    }
  }

  async aceptarTurno(turnoId: string)
  {
    if (!turnoId) {
      console.error('ID de turno no válido');
      return;
    }
    this.turnoService.actualizarEstadoTurno(turnoId,'aceptado');
    await this.cargarTurnos();
  }

  async realizarTurno(turnoId: string) {
    console.log('Finalizar turno llamado con ID:', turnoId);
    console.log('Current User:', this.currentUser$.value);
  
    if (!turnoId) {
      console.error('ID de turno no válido');
      return;
    }
  
    try {
      const historiaClinicaCargada = await this.turnoService.verificarHistoriaClinicaCargada(turnoId);
      console.log('Historia clinica ya cargada:', historiaClinicaCargada);
      
      if (historiaClinicaCargada) {
        this.mostrarDevolucion = turnoId;
      } else {
        this.mostrarHistoriaClinica = turnoId;
        this.historiaClinica.turnoId = turnoId;
        this.historiaClinica.uid = this.currentUser$.value?.uid || '';
        console.log('Mostrando historia clinica para turno:', turnoId);
      }
    } catch (error) {
      console.error('Error al verificar historia clinica:', error);
    }
  }
  async confirmarRealizacionTurno() {
    if (!this.mostrarDevolucion) return;
  
    if (this.comentarioDevolucion.trim()) {
      try {
        await this.turnoService.actualizarEstadoTurno(this.mostrarDevolucion, 'realizado');
        await this.turnoService.agregarDevolucionnn(this.mostrarDevolucion, this.comentarioDevolucion);
        await this.cargarTurnos();

        this.mostrarDevolucion = null;
        this.comentarioDevolucion = '';
      } catch (error) {
        console.error('Error al finalizar turno:', error);
        this.error = 'Error al finalizar el turno';
      }
    } else {
      this.error = 'Por favor, ingresa una devolución para finalizar el turno.';
    }
  }
  agregarDatoDinamico() {
    if (this.historiaClinica.datosDinamicos.length < 3) {
      this.historiaClinica.datosDinamicos.push({ clave: '', valor: '' });
    }
  }
  eliminarDatoDinamico(index: number) {
    this.historiaClinica.datosDinamicos.splice(index, 1);
  }


  async guardarHistoriaClinica() {
    if (!this.mostrarHistoriaClinica) return;
    const datosGeneralesCompletos = 
      this.historiaClinica.datosGenerales.altura > 0 &&
      this.historiaClinica.datosGenerales.peso > 0 &&
      this.historiaClinica.datosGenerales.temperatura > 0 &&
      this.historiaClinica.datosGenerales.presion.trim() !== '';

    const datosDinamicosValidos = 
      this.historiaClinica.datosDinamicos.length <= 3 &&
      this.historiaClinica.datosDinamicos.every(
        dato => dato.clave.trim() !== '' && dato.valor.trim() !== ''
      );

    if (!datosGeneralesCompletos) {
      this.error = 'Por favor, complete todos los datos generales.';
      return;
    }

    if (!datosDinamicosValidos) {
      this.error = 'Los datos dinámicos deben tener clave y valor, y no más de 3.';
      return;
    }

    try {
      await this.turnoService.agregarHistoriaClinica(this.historiaClinica);
      await this.turnoService.actualizarEstadoTurno(this.mostrarHistoriaClinica, 'realizado');
      await this.cargarTurnos();
      this.mostrarHistoriaClinica = null;
      this.historiaClinica = {
        uid: '',
        turnoId: '',
        datosGenerales: {
          altura: 0,
          peso: 0,
          temperatura: 0,
          presion: ''
        },
        datosDinamicos: []
      };
    } catch (error) {
      console.error('Error al guardar historia clínica:', error);
      this.error = 'Error al guardar la historia clínica';
    }
  }


  aplicarFiltro() {
    if (!this.textoBusqueda) {
      this.turnosFiltrados = this.turnos;
      return;
    }

    const busquedaNormalizada = this.textoBusqueda.toLowerCase().trim();

    this.turnosFiltrados = this.turnos.filter(turno => {
      const camposTurno = [
        turno.especialidad,
        turno.especialista,
        turno.paciente,
        turno.estado,
        turno.comentario
      ];

      const coincideTurno = camposTurno.some(campo => 
        campo && campo.toLowerCase().includes(busquedaNormalizada)
      );

      const fechaFormateada = turno.fecha.toLocaleDateString();
      const coincideFecha = fechaFormateada.includes(busquedaNormalizada);
      const historiaClinica = this.historiasClinicas.find(h => h.turnoId === turno.id);
      const coincideHistoriaClinica = historiaClinica 
        ? this.buscarEnHistoriaClinica(historiaClinica, busquedaNormalizada)
        : false;

      return coincideTurno || coincideFecha || coincideHistoriaClinica;
    });
  }

  private buscarEnHistoriaClinica(historia: HistoriaClinica, textoBusqueda: string): boolean {
    const datosGenerales = [
      historia.datosGenerales.altura.toString(),
      historia.datosGenerales.peso.toString(),
      historia.datosGenerales.temperatura.toString(),
      historia.datosGenerales.presion
    ];

    const coincideDatosGenerales = datosGenerales.some(dato => 
      dato.toLowerCase().includes(textoBusqueda)
    );

    const coincideDatosDinamicos = historia.datosDinamicos.some(dato => 
      dato.clave.toLowerCase().includes(textoBusqueda) ||
      dato.valor.toLowerCase().includes(textoBusqueda)
    );

    return coincideDatosGenerales || coincideDatosDinamicos;
  }

  private ordenarTurnos(turnos: Turno[]): Turno[] {
    return turnos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }
  private async cargarHistoriasClinicas() {
    try {
      const user = this.currentUser$.value;
      if (!user?.uid) return;

      const historiasSub = this.turnoService.getHistoriasClinicasPorEspecialista(user.uid).subscribe(
        historias => {
          this.historiasClinicas = historias;
          this.aplicarFiltro();
        },
        error => {
          this.error = 'Error al cargar historias clínicas';
        }
      );

      this.subscriptions.add(historiasSub);
    } catch (error) {
      this.error = 'Error al procesar historias clínicas';
    }
  }
  
}