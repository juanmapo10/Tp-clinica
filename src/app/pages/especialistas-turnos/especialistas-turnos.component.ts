import { Component, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AuthService, Usuario } from '../../services/auth.service';
import { Turno, TurnoService } from '../../services/turno.service';
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

  especialidadSeleccionada: string = '';
  especialistaSeleccionado: string = '';
  horarioSeleccionado: Date | null = null;
  filtroEspecialidad: string = '';
  filtroEspecialista: string = '';

  mostrarEncuesta: string | null = null;
  comentarioCancelacion: string = '';
  mostrarDevolucion: string | null = null;
  comentarioDevolucion: string = '';

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
      console.log('Estado de autenticación actualizado:', user?.email);
      
      if (user) {
        this.authService.getCurrentUserType().then(usuarioTipo => {
          console.log('Tipo de usuario:', usuarioTipo);
          
          if (usuarioTipo === 'especialista') {
            const currentUser = {
              uid: user.uid,
              email: user.email,
              tipo: usuarioTipo
            } as Usuario;

            this.currentUser$.next(currentUser);
            this.cargarDatosIniciales();
          } else {
            console.warn('Usuario no es especialista:', usuarioTipo);
            this.error = 'Acceso no autorizado: Usuario no es especialista';
          }
        }).catch(error => {
          console.error('Error al obtener tipo de usuario:', error);
          this.error = 'Error al cargar información de usuario';
        });
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
      await this.cargarTurnos();
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      this.error = 'Error al cargar datos iniciales';
    }
  }

  private resetearDatos() {
    this.turnos = [];
    this.horariosDisponibles = [];
    this.error = null;
  }

  private async cargarTurnos() {
    const user = this.currentUser$.value;
    console.log('Intentando cargar turnos para especialista:', user?.email);
    
    if (!user?.uid) {
      console.warn('No hay UID de usuario para cargar turnos');
      return;
    }

    this.cargandoTurnos = true;
    this.error = null;

    try {
      const turnosSub = this.turnoService.getTurnosEspecialista(user.uid).subscribe(
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

  private ordenarTurnos(turnos: Turno[]): Turno[] {
    return turnos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
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
  
  // Método para confirmar cancelación con comentario
  async confirmarCancelacion(turnoId: string) {
    if (this.comentarioCancelacion.trim()) {
      await this.cancelarTurno(turnoId, this.comentarioCancelacion);
      this.mostrarEncuesta = null;  // Oculta la encuesta tras la cancelación
      this.comentarioCancelacion = '';  // Limpia el comentario
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
    if (!turnoId) {
      console.error('ID de turno no válido');
      return;
    }
    
    // Show devolution dialog
    this.mostrarDevolucion = turnoId;
  }
  
  // New method to confirm and finalize the turn with a return
  async confirmarRealizacionTurno() {
    if (!this.mostrarDevolucion) return;
  
    if (this.comentarioDevolucion.trim()) {
      try {
        // Update turn status to 'realizado'
        await this.turnoService.actualizarEstadoTurno(this.mostrarDevolucion, 'realizado');
        
        // Add devolution comment
        await this.turnoService.agregarDevolucionnn(this.mostrarDevolucion, this.comentarioDevolucion);
        
        // Reload turns
        await this.cargarTurnos();
        
        // Reset dialog
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

}