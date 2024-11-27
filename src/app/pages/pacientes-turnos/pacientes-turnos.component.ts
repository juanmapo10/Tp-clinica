import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Turno, TurnoService } from '../../services/turno.service';
import { AuthService, Usuario } from '../../services/auth.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-pacientes-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pacientes-turnos.component.html',
  styleUrls: ['./pacientes-turnos.component.css']
})
export class PacientesTurnosComponent implements OnInit, OnDestroy {
  turnos: Turno[] = [];
  filtroEspecialidad: string = '';
  filtroEspecialista: string = '';
  mostrarSolicitarTurno: boolean = false;
  especialidades: string[] = [];
  especialistas: Usuario[] = [];
  horariosDisponibles: Date[] = [];
  especialidadSeleccionada: string = '';
  especialistaSeleccionado: string = '';
  horarioSeleccionado: Date | null = null;
  mostrarEncuesta: string | null = null;
  comentarioCancelacion: string = '';
  calificacionSeleccionada: number | null = null;

  opcionesEncuesta = [
    { valor: 1, etiqueta: 'Malo' },
    { valor: 2, etiqueta: 'Regular' },
    { valor: 3, etiqueta: 'Normal' },
    { valor: 4, etiqueta: 'Bien' },
    { valor: 5, etiqueta: 'Excelente' }
  ];

  currentUser$ = new BehaviorSubject<Usuario | null>(null);
  private subscriptions: Subscription = new Subscription();
  cargandoTurnos: boolean = false;
  error: string | null = null;

  constructor(
    private turnoService: TurnoService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    console.log('Iniciando PacientesTurnosComponent');
    this.inicializarComponente();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private inicializarComponente() {
    const authSub = this.authService.currentUser$.subscribe(async user => {
      console.log('Estado de autenticación actualizado:', user?.email);
      
      if (user) {
        try {
          const usauriotipo = await this.authService.getCurrentUserType();
          console.log('Tipo de usuario:', usauriotipo);
          
          if (usauriotipo === 'paciente') {
            const currentUser = {
              uid: user.uid,
              email: user.email,
              tipo: usauriotipo
            } as Usuario;

            this.currentUser$.next(currentUser);
            await this.cargarDatosIniciales();
          } else {
            console.warn('Usuario no es paciente:', usauriotipo);
            this.error = 'Acceso no autorizado: Usuario no es paciente';
          }
        } catch (error) {
          console.error('Error al obtener tipo de usuario:', error);
          this.error = 'Error al cargar información de usuario';
        }
      } else {
        console.log('No hay usuario autenticado');
        this.currentUser$.next(null);
        this.resetearDatos();
      }
    });

    this.subscriptions.add(authSub);
  }

  private async cargarDatosIniciales() {
    try {
      await Promise.all([
        this.cargarTurnos(),
        this.cargarEspecialidades()
      ]);
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      this.error = 'Error al cargar datos iniciales';
    }
  }

  private resetearDatos() {
    this.turnos = [];
    this.especialidades = [];
    this.especialistas = [];
    this.horariosDisponibles = [];
    this.mostrarSolicitarTurno = false;
    this.error = null;
  }

  async cargarTurnos() {
    const user = this.currentUser$.value;
    console.log('Intentando cargar turnos para usuario:', user?.email);
    
    if (!user?.uid) {
      console.warn('No hay UID de usuario para cargar turnos');
      return;
    }

    this.cargandoTurnos = true;
    this.error = null;

    try {
      const turnosSub = this.turnoService.getTurnosPaciente(user.uid).subscribe(
        turnos => {
          console.log('Turnos recibidos:', turnos.length);
          this.turnos = this.ordenarTurnos(turnos);
          this.cargandoTurnos = false;
        },
        error => {
          console.error('Error al cargar turnos:', error);
          this.error = 'Error al cargar turnos';
          this.cargandoTurnos = false;
        }
      );

      this.subscriptions.add(turnosSub);
    } catch (error) {
      console.error('Error en cargarTurnos:', error);
      this.error = 'Error al procesar turnos';
      this.cargandoTurnos = false;
    }
  }

  private ordenarTurnos(turnos: Turno[]): Turno[] {
    return turnos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
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
      await this.turnoService.actualizarEstadoTurno(turnoId, 'cancelado', comentario);
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
  

  async calificarAtencion(turnoId: string, calificacion: string) {
    if (!turnoId) return;

    try {
      await this.turnoService.agregarCalificacion(turnoId, calificacion);
      console.log('Calificación agregada exitosamente');
      await this.cargarTurnos();
    } catch (error) {
      console.error('Error al calificar atención:', error);
      this.error = 'Error al calificar la atención';
    }
  }

  async completarEncuesta(turnoId: string, encuesta: any) {
    if (!turnoId || !encuesta.satisfaction) return;
    try {
      await this.turnoService.agregarEncuesta(turnoId, encuesta);
      console.log('Encuesta completada exitosamente');
      this.calificacionSeleccionada = null; 
      await this.cargarTurnos();
    } catch (error) {
      console.error('Error al completar encuesta:', error);
      this.error = 'Error al completar la encuesta';
    }
  }

  cargarEspecialidades() {
    const especialidadesSub = this.authService.getEspecialidades()
      .pipe(take(1))
      .subscribe(
        especialidades => {
          console.log('Especialidades cargadas:', especialidades);
          this.especialidades = especialidades;
        },
        error => {
          console.error('Error al cargar especialidades:', error);
          this.error = 'Error al cargar especialidades';
        }
      );

    this.subscriptions.add(especialidadesSub);
  }

  cargarEspecialistas() {
    if (!this.especialidadSeleccionada) {
      console.warn('No hay especialidad seleccionada');
      return;
    }

    const especialistasSub = this.turnoService
      .getEspecialistasPorEspecialidad(this.especialidadSeleccionada)
      .pipe(take(1))
      .subscribe(
        especialistas => {
          console.log('Especialistas cargados:', especialistas);
          this.especialistas = especialistas;
          this.especialistaSeleccionado = '';
          this.horariosDisponibles = [];
        },
        error => {
          console.error('Error al cargar especialistas:', error);
          this.error = 'Error al cargar especialistas';
        }
      );

    this.subscriptions.add(especialistasSub);
  }

  cargarHorariosDisponibles() {
    const fechaBase = new Date('2024-11-06');
    this.horariosDisponibles = [
      new Date(fechaBase.setHours(9, 0, 0)),
      new Date(fechaBase.setHours(10, 0, 0)),
      new Date(fechaBase.setHours(11, 0, 0)),
      new Date(fechaBase.setHours(12, 0, 0)),
      new Date(fechaBase.setHours(14, 0, 0)),
      new Date(fechaBase.setHours(15, 0, 0)),
      new Date(fechaBase.setHours(16, 0, 0)),
    ];
    console.log('Horarios disponibles cargados:', this.horariosDisponibles);
  }

  async confirmarTurno() {
    if (!this.validarDatosTurno()) {
      console.warn('Datos de turno incompletos');
      return;
    }

    const currentUser = this.currentUser$.value;
    if (!currentUser?.uid) {
      console.error('No hay usuario actual');
      return;
    }

    const especialistaSeleccionado = this.especialistas.find(
      e => e.uid === this.especialistaSeleccionado
    );

    if (!especialistaSeleccionado) {
      console.error('Especialista no encontrado');
      return;
    }

    try {
      const turno = {
        pacienteId: currentUser.uid,
        especialistaId: this.especialistaSeleccionado,
        especialista: `${especialistaSeleccionado.nombre} ${especialistaSeleccionado.apellido}`,
        especialidad: this.especialidadSeleccionada,
        fecha: this.horarioSeleccionado!,
        estado: 'pendiente' as const
      };

      await this.turnoService.crearTurno(turno);
      console.log('Turno creado exitosamente');
      this.resetearFormularioTurno();
      await this.cargarTurnos();
    } catch (error) {
      console.error('Error al crear el turno:', error);
      this.error = 'Error al crear el turno';
    }
  }

  public validarDatosTurno(): boolean {
    return !!(
      this.horarioSeleccionado &&
      this.especialidadSeleccionada &&
      this.especialistaSeleccionado
    );
  }

  private resetearFormularioTurno() {
    this.mostrarSolicitarTurno = false;
    this.especialidadSeleccionada = '';
    this.especialistaSeleccionado = '';
    this.horarioSeleccionado = null;
    this.horariosDisponibles = [];
  }

  
}