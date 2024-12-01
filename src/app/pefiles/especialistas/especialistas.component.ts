import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { AuthService, Usuario } from '../../services/auth.service';
import { TurnoService } from '../../services/turno.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-especialistas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './especialistas.component.html',
  styleUrl: './especialistas.component.css'
})
export class EspecialistasComponente implements OnInit {
  currentUser$ = new BehaviorSubject<Usuario | null>(null);
  pacientesAtendidos$: Observable<Usuario[]> = of([]);

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
}