
import { switchMap, map } from 'rxjs/operators';
import { AuthService, Usuario } from '../../services/auth.service';
import { Turno, TurnoService } from '../../services/turno.service';
import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.css'
})
export class PacientesComponent implements OnInit {
  currentUser$ = new BehaviorSubject<Usuario | null>(null);
  pacientesAtendidos$: Observable<Usuario[]> = of([]);
  pacienteSeleccionado: Usuario | null = null;
  turnosPaciente: Turno[] = [];
  dialogoResena: Turno | null = null;
  textoResena: string = '';
  modoLecturaResena: boolean = false;


  ngOnInit() {
    this.inicializarComponente();
  }

  constructor(
    private turnoService: TurnoService,
    private authService: AuthService
  ) {}


  private inicializarComponente() {
    this.authService.currentUser$.subscribe(async (user) => {
      console.log('Estado de autenticación actualizado:', user?.email);

      if (user) {
        try {
          const especialistaProfile = await this.authService.getCurrentEspecialistaProfile();
          if (especialistaProfile) {
            this.currentUser$.next(especialistaProfile);
            console.log("Especialista Profile:", this.currentUser$.value);
            if (especialistaProfile?.uid) {
              this.pacientesAtendidos$ = this.obtenerPacientesAtendidos(especialistaProfile.uid);
            }
          } else {
            console.warn('No specialist profile found');
            this.currentUser$.next(null);
          }
        } catch (error) {
          console.error('Error fetching specialist profile:', error);
          this.currentUser$.next(null);
        }
      } else {
        console.log('No hay usuario autenticado');
        this.currentUser$.next(null);
      }
    });
  }

  private obtenerPacientesAtendidos(especialistaId: string): Observable<Usuario[]> {
    return this.turnoService.getTurnosEspecialista(especialistaId).pipe(
      switchMap(turnos => {
        const pacienteIds = [...new Set(turnos.map(turno => turno.pacienteId).filter(id => id))];
        
        if (pacienteIds.length === 0) {
          return of([]);
        }

        return this.turnoService.getPacientes().pipe(
          map(pacientes => 
            pacientes.filter(paciente => 
              pacienteIds.includes(paciente.uid)
            )
          )
        );
      })
    );
  }

  async seleccionarPaciente(paciente: Usuario) {
    this.pacienteSeleccionado = paciente;
    this.turnoService.getTurnosPaciente(paciente.uid!).subscribe({
      next: (turnos) => {
        this.turnosPaciente = turnos;
      },
      error: (error) => {
        console.error('Error al cargar turnos del paciente:', error);
      }
    });
  }

  cerrarDetallePaciente() {
    this.pacienteSeleccionado = null;
    this.turnosPaciente = [];
  }

  verResena(turno: Turno) {
    if (turno.resena) {
      this.textoResena = turno.resena;
      this.modoLecturaResena = true;
    } else {

      this.textoResena = 'No se encontro una reseña cargada';
      this.modoLecturaResena = true;;
    }
    this.dialogoResena = turno;
  }
  
  cerrarDialogoResena() {
    this.dialogoResena = null;
    this.textoResena = '';
    this.modoLecturaResena = false;
  }
  
  guardarResena() {
    if (this.dialogoResena && this.textoResena.trim()) {
      this.turnoService.agregarResena(this.dialogoResena.id, this.textoResena)
        .then(() => {
          if (this.dialogoResena) {
            this.dialogoResena.resena = this.textoResena;
          }
          this.cerrarDialogoResena();
        })
        .catch(error => {
          console.error('Error al guardar la reseña:', error);
        });
    }
  }
 
}
