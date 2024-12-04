import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { 
  trigger, 
  state, 
  style, 
  animate, 
  transition 
} from '@angular/animations';
import { HistoriaClinica, Turno, TurnoService } from '../../services/turno.service';
import { AuthService, Usuario } from '../../services/auth.service';
import { BehaviorSubject, Subscription, take } from 'rxjs';

@Component({
  selector: 'app-admin-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-turnos.component.html',
  styleUrl: './admin-turnos.component.css',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ 
          opacity: 0, 
          transform: 'translateY(50px)' 
        }),
        animate('600ms cubic-bezier(0.25, 0.1, 0.25, 1)', 
          style({ 
            opacity: 1, 
            transform: 'translateY(0)' 
          })
        )
      ])
    ]),
    trigger('listAnimation', [
      transition(':enter', [
        style({ 
          opacity: 0, 
          transform: 'translateY(20px)' 
        }),
        animate('500ms ease-out', 
          style({ 
            opacity: 1, 
            transform: 'translateY(0)' 
          })
        )
      ]),
      transition(':leave', [
        animate('300ms ease-in', 
          style({ 
            opacity: 0, 
            transform: 'translateY(-20px)' 
          })
        )
      ])
    ])
  ]
})
export class AdminTurnosComponent implements OnInit{

  currentUser$ = new BehaviorSubject<Usuario | null>(null);
  error: string | null = null;
  successMessage: string | null = null;
  private subscriptions: Subscription = new Subscription();
  
  especialidades: string[] = [];
  especialistas: Usuario[] = [];
  especialistaSeleccionado: Usuario | null = null;
  especialidadesDelEspecialista: string[] = [];
  usuarios: Usuario[] = [];

  cargandoTurnos: boolean = true;
  mostrarSolicitarTurno: boolean = false;
  especialidadSeleccionada: string = '';
  
  fechasDisponibles: Date[] = [];
  horariosDisponibles: string[] = [];
  fechaSeleccionada: Date | null = null;
  horarioSeleccionado: string | null = null;
  historiasClinicas: HistoriaClinica[] = [];

  turnos: Turno[] = [];
  filtroEspecialidad: string = '';
  filtroPaciente: string = '';
  mostrarEncuesta: string | null = null;
  comentarioCancelacion: string = '';
  calificacionSeleccionada: number | null = null;
  dialogoResena: Turno | null = null;
  textoResena: string = '';
  modoLecturaResena: boolean = false;

  mostrarListaPacientes: boolean = false;
  pacienteSeleccionado: Usuario | null = null;
  
  
  opcionesEncuesta = [
    { valor: 1, etiqueta: 'Malo' },
    { valor: 2, etiqueta: 'Regular' },
    { valor: 3, etiqueta: 'Normal' },
    { valor: 4, etiqueta: 'Bien' },
    { valor: 5, etiqueta: 'Excelente' }
  ];

  constructor(
    private turnoService: TurnoService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.inicializarComponente();
    this.cargarUsuarios();
    this.cargarEspecialistas();
    this.cargarHistoriasClinicas(); 
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  

  private inicializarComponente() {
    const authSub = this.authService.currentUser$.subscribe(async user => {
      if (user) {
        try {
          const usauriotipo = await this.authService.getCurrentUserType();
          
          if (usauriotipo === 'admin') {
            const currentUser = {
              uid: user.uid,
              email: user.email,
              tipo: usauriotipo
            } as Usuario;
            this.currentUser$.next(currentUser);
            this.cargarDatosIniciales();
          } else {
            this.error = 'Acceso no autorizado: Usuario no es administrador';
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

  private async cargarHistoriasClinicas() {
    try {
      const historiasClinicas = await this.turnoService.getAllHistoriasClinicas().toPromise();
      this.historiasClinicas = historiasClinicas || [];
    } catch (error) {
      console.error('Error al cargar historias clínicas:', error);
    }
  }

  seleccionarPaciente(paciente: Usuario) {
    this.pacienteSeleccionado = paciente;
    this.mostrarListaPacientes = false;
    this.mostrarSolicitarTurno = true;
  }

  resetearSeleccion() {
    this.pacienteSeleccionado = null;
    this.especialistaSeleccionado = null;
    this.especialidadSeleccionada = '';
    this.fechaSeleccionada = null;
    this.horarioSeleccionado = null;
    this.fechasDisponibles = [];
    this.horariosDisponibles = [];
    this.mostrarSolicitarTurno = false;
    this.mostrarListaPacientes = true;
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

  cargarUsuarios() {
    const usuariosSub = this.turnoService.getPacientes()
      .pipe(take(1)) 
      .subscribe(
        usuarios => {
          this.usuarios = usuarios; 
          console.log('Usuarios cargados correctamente:', this.usuarios);
        },
        error => {
          this.error = 'Error al cargar usuarios';
          console.error('Error al cargar usuarios:', error);
        }
      );
  
    this.subscriptions.add(usuariosSub);
  }
  

  seleccionarEspecialista(especialista: Usuario) {
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
    this.horarioSeleccionado = null; 
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
    
    if (!this.pacienteSeleccionado) {
      this.error = 'Debe seleccionar un paciente';
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
        pacienteId: this.pacienteSeleccionado.uid!,
        especialistaId: this.especialistaSeleccionado!.uid!,
        especialista: this.especialistaSeleccionado!.nombre,
        especialidad: this.especialidadSeleccionada,
        fecha: fechaHoraTurno,
        estado: 'pendiente',
        paciente: this.pacienteSeleccionado.email
      };

      const turnoId = await this.turnoService.crearTurno(turno);
      console.log("turno creado exitosamente, id : ", turnoId)
      this.resetearSeleccion();
      this.successMessage = 'Turno creado exitosamente';
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
      'traumatologo': 'traumatologo.png',
      'enfermero': 'enfermero.png',
      'cirujano': 'cirujano.png',
      'anestesista': 'anestesista.png',
      'kinesiologia': 'kinesiologo.png',
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
      const turnosSub = this.turnoService.getAllTurnos().subscribe(
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
    
    const textoBusqueda = (this.filtroPaciente || '').toLowerCase().trim();
    
    if (!textoBusqueda) return this.turnos;
  
    return this.turnos.filter(turno => {
      const matchBasico = 
        turno.especialidad.toLowerCase().includes(textoBusqueda) ||
        turno.especialista.toLowerCase().includes(textoBusqueda) ||
        turno.paciente?.toLowerCase().includes(textoBusqueda) ||
        turno.estado.toLowerCase().includes(textoBusqueda);

      const historiaClinica = this.historiasClinicas.find(hc => hc.turnoId === turno.id);
      const matchHistoriaClinica = historiaClinica ? (
        Object.values(historiaClinica.datosGenerales).some(valor => 
          valor.toString().toLowerCase().includes(textoBusqueda)
        ) ||
        historiaClinica.datosDinamicos.some(dato => 
          dato.clave.toLowerCase().includes(textoBusqueda) ||
          dato.valor.toLowerCase().includes(textoBusqueda)
        )
      ) : false;
  
      return matchBasico || matchHistoriaClinica;
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
    this.textoResena = '';
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
      
      await this.cargarTurnos();
      
      this.dialogoResena = null;
      this.textoResena = '';
      this.modoLecturaResena = false;
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
