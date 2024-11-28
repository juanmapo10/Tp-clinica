import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Turno, TurnoService } from '../../services/turno.service';
import { AuthService, Usuario } from '../../services/auth.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

@Component({
  selector: 'app-pacientes-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pacientes-turnos.component.html',
  styleUrls: ['./pacientes-turnos.component.css']
})
export class PacientesTurnosComponent implements OnInit, OnDestroy {
  currentUser$ = new BehaviorSubject<Usuario | null>(null);
  error: string | null = null;
  successMessage: string | null = null;
  private subscriptions: Subscription = new Subscription();
  
  especialidades: string[] = [];
  especialistas: Usuario[] = [];
  especialistaSeleccionado: Usuario | null = null;
  especialidadesDelEspecialista: string[] = [];
  
  cargandoTurnos: boolean = true;
  mostrarSolicitarTurno: boolean = false;
  especialidadSeleccionada: string = '';
  
  fechasDisponibles: Date[] = [];
  horariosDisponibles: string[] = [];
  fechaSeleccionada: Date | null = null;
  horarioSeleccionado: string | null = null;

  turnos: Turno[] = [];
  filtroEspecialidad: string = '';
  filtroPaciente: string = '';
  mostrarEncuesta: string | null = null;
  comentarioCancelacion: string = '';
  calificacionSeleccionada: number | null = null;
  dialogoResena: Turno | null = null;
  textoResena: string = '';
  modoLecturaResena: boolean = false;
  
  
  opcionesEncuesta = [
    { valor: 1, etiqueta: 'Malo' },
    { valor: 2, etiqueta: 'Regular' },
    { valor: 3, etiqueta: 'Normal' },
    { valor: 4, etiqueta: 'Bien' },
    { valor: 5, etiqueta: 'Excelente' }
  ];

  constructor(
    private turnoService: TurnoService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.inicializarComponente();
    this.cargarEspecialistas();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private inicializarComponente() {
    const authSub = this.authService.currentUser$.subscribe(async user => {
      if (user) {
        try {
          const usauriotipo = await this.authService.getCurrentUserType();
          
          if (usauriotipo === 'paciente') {
            const currentUser = {
              uid: user.uid,
              email: user.email,
              tipo: usauriotipo
            } as Usuario;
            this.currentUser$.next(currentUser);
            this.cargarDatosIniciales();
          } else {
            this.error = 'Acceso no autorizado: Usuario no es paciente';
          }
        } catch (error) {
          this.error = 'Error al cargar información de usuario';
        }
      } else {
        this.currentUser$.next(null);
      }
    });

    this.subscriptions.add(authSub);
  }

  cargarEspecialistas() {
    const especialistasub = this.turnoService.getEspecialistas()
    .pipe(take(1))
    .subscribe(
      especialistas => {
        this.especialistas = especialistas;
      },
      error => {
        this.error = 'Error al cargar especialistas';
      }
    );
    
    this.subscriptions.add(especialistasub); 
  }

  seleccionarEspecialista(especialista: Usuario) {
    // Reset related fields when changing specialist
    this.especialistaSeleccionado = especialista;
    this.especialidadSeleccionada = '';
    this.fechaSeleccionada = null;
    this.horarioSeleccionado = null;
    this.fechasDisponibles = [];
    this.horariosDisponibles = [];
  }

  seleccionarEspecialidad(especialidad: string) {
    this.especialidadSeleccionada = especialidad;
    this.generarFechasDisponibles();
  }

  generarFechasDisponibles() {
    if (!this.especialistaSeleccionado) return;

    const dayMapping: { [key: string]: number } = {
      'lunes': 1,
      'martes': 2,
      'miércoles': 3,
      'jueves': 4,
      'viernes': 5,
      'sábado': 6,
      'domingo': 0
    };
  
    this.fechasDisponibles = [];
    const today = new Date();
  
    for (let i = 0; i < 15; i++) {
      const fecha = new Date(today);

      fecha.setDate(today.getDate() + i);
      const dayName = fecha.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
      const diasTrabajo = this.especialistaSeleccionado.dias || [];
      const isAvailable = diasTrabajo.some(dia => dia.toLowerCase() === dayName);
  
      if (isAvailable) {
        this.fechasDisponibles.push(fecha);
      }
    }
  }

  async seleccionarFecha(fecha: Date) {
    if (!this.especialistaSeleccionado) return;
    this.fechaSeleccionada = fecha;
    this.horarioSeleccionado = null; // Reset horario when selecting a new date
    try {
     this.horariosDisponibles = this.especialistaSeleccionado.horarios || [];
    } catch (error) {
      this.error = 'Error al cargar horarios disponibles';
    }
  }

  formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }

  seleccionarHorario(horario: string) {
    this.horarioSeleccionado = horario;
    console.log(this.horarioSeleccionado);
  }

  async confirmarTurno() {
    if (!this.validarDatosTurno()) {
      this.error = 'Por favor complete todos los campos necesarios.';
      return;
    }
    const currentUser = await this.currentUser$.pipe(take(1)).toPromise();
    if (!currentUser) {
      this.error = 'Usuario no autenticado';
      return;
    }
    try {
      if (!this.fechaSeleccionada || !this.horarioSeleccionado) {
        this.error = 'Debe seleccionar fecha y hora';
        return;
      }

      const [hours, minutes] = this.horarioSeleccionado.split(':').map(Number);
      const fechaHoraTurno = new Date(this.fechaSeleccionada);
      fechaHoraTurno.setHours(hours, minutes, 0, 0);

      const turno: Omit<Turno, 'id'> = {
        pacienteId: currentUser.uid,
        especialistaId: this.especialistaSeleccionado!.uid,
        especialista: this.especialistaSeleccionado!.nombre,
        especialidad: this.especialidadSeleccionada,
        fecha: fechaHoraTurno,
        estado: 'pendiente',
        paciente: currentUser.email || ''
      };

      const turnoId = await this.turnoService.crearTurno(turno);
      console.log("turno creado exitosamente, id : ", turnoId)
      this.resetearDatos();
      setTimeout(() => {
        this.successMessage = null;
      }, 3000);

    } catch (error) {
      console.error('Error creating turno:', error);
      this.error = 'Error al solicitar el turno. Intente nuevamente.';
    }
  }

  getSpecialtyImage(specialty: string): string {
    const specialtyImages: { [key: string]: string } = {
      'traumatologo': 'traumatologo.svg',
      'enfermero': 'enfermero.svg',
      'cirujano': 'cirujano.svg',
      'anestesista': 'anestesista.svg',
    };
  
    return specialtyImages[specialty] || "default.svg";
  }

   async resetearDatos() {
    this.especialistaSeleccionado = null;
    this.especialidadSeleccionada = '';
    this.fechaSeleccionada = null;
    this.horarioSeleccionado = null;
    this.fechasDisponibles = [];
    this.horariosDisponibles = [];
    this.mostrarSolicitarTurno = false;
  }

  public validarDatosTurno(): boolean {
    return !!(
      this.horarioSeleccionado &&
      this.especialidadSeleccionada &&
      this.especialistaSeleccionado &&
      this.fechaSeleccionada
    );
  }


  private async cargarDatosIniciales() {
    try {
      await Promise.all([
        this.cargarTurnos(),
      ]);
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      this.error = 'Error al cargar datos iniciales';
    }
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
      const matchEspecialista = !this.filtroPaciente || 
        turno.paciente?.toLowerCase().includes(this.filtroPaciente.toLowerCase());
      return matchEspecialidad && matchEspecialista;
    });
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

  abrirDialogoResena(turno: Turno) {
    this.dialogoResena = turno;
    this.textoResena = ''; // Reset review text
    this.modoLecturaResena = false;
  }
  
  verResena(turno: Turno) {
    this.dialogoResena = turno;
    this.textoResena = turno.resena || '';
    this.modoLecturaResena = true;
  }
  
  async guardarResena() {
    if (!this.dialogoResena || !this.textoResena.trim()) {
      this.error = 'Por favor, ingrese un texto para la reseña';
      return;
    }
  
    try {
      await this.turnoService.agregarResena(this.dialogoResena.id, this.textoResena.trim());
      console.log('Reseña guardada exitosamente');
      
      // Reload turnos to reflect the new review
      await this.cargarTurnos();
      
      // Reset dialog
      this.dialogoResena = null;
      this.textoResena = '';
      this.modoLecturaResena = false;
      
      // Show success message
      this.successMessage = 'Reseña guardada correctamente';
      setTimeout(() => {
        this.successMessage = null;
      }, 3000);
    } catch (error) {
      console.error('Error al guardar reseña:', error);
      this.error = 'Error al guardar la reseña';
    }
  }
  
  cerrarDialogoResena() {
    this.dialogoResena = null;
    this.textoResena = '';
    this.modoLecturaResena = false;
  }

}