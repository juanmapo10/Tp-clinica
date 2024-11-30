import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService } from '../services/turno.service';
import { AuthService, Usuario } from '../services/auth.service';
import { BehaviorSubject, Subscription } from 'rxjs';

interface HorarioDisponible {
  hora: string;
  seleccionado: boolean;
}

@Component({
  selector: 'app-mishorarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mishorarios.component.html',
  styleUrl: './mishorarios.component.css'
})
export class MishorariosComponent implements OnInit, OnDestroy {
  currentUser$ = new BehaviorSubject<Usuario | null>(null);
  private subscriptions: Subscription = new Subscription();
  
  horariosDisponibles: HorarioDisponible[] = [];

  constructor(
    private turnoService: TurnoService,
    private authService: AuthService
  ) {
    this.generarHorarios();
  }

  ngOnInit() {
    this.inicializarComponente();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private generarHorarios() {
    this.horariosDisponibles = this.generarHorariosEntre8y17();
  }

  private generarHorariosEntre8y17(): HorarioDisponible[] {
    const horarios: HorarioDisponible[] = [];
    for (let hora = 8; hora < 17; hora++) {
      horarios.push({ 
        hora: `${hora.toString().padStart(2, '0')}:00`, 
        seleccionado: false 
      });
      horarios.push({ 
        hora: `${hora.toString().padStart(2, '0')}:30`, 
        seleccionado: false 
      });
    }
    return horarios;
  }

  private inicializarComponente() {
    const userSubscription = this.authService.currentUser$.subscribe(async (user) => {
      if (user) {
        try {
          const especialistaProfile = await this.authService.getCurrentEspecialistaProfile();
          if (especialistaProfile) {
            this.currentUser$.next(especialistaProfile);
            this.cargarHorariosGuardados()
          } else {
            this.currentUser$.next(null);
          }
        } catch (error) {
          console.error('Error fetching specialist profile:', error);
          this.currentUser$.next(null);
        }
      } else {
        this.currentUser$.next(null);
      }
    });
    this.subscriptions.add(userSubscription);
  }

  private async cargarHorariosGuardados() {
    try {
      const horarios = await this.authService.getHorariosEspecialista(this.currentUser$.value?.uid || '');
      console.log(horarios);
      this.horariosDisponibles.forEach(horario => {
        horario.seleccionado = false;
      });

      horarios.forEach(horarioGuardado => {
        const horarioFormateado = this.formatearHora(horarioGuardado);
        const horarioEncontrado = this.horariosDisponibles
          .find(h => h.hora === horarioFormateado);
        
        if (horarioEncontrado) {
          horarioEncontrado.seleccionado = true;
        }
      });
    } catch (error) {
      console.error('Error al cargar horarios guardados:', error);
    }
  }

  private formatearHora(fecha: Date): string {
    return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
  }

  guardarHorarios() {
    const horariosSeleccionados: string[] = this.horariosDisponibles
      .filter(horario => horario.seleccionado)
      .map(horario => {
        return horario.hora;
      });

    this.authService.guardarHorariosEspecialista(
      this.currentUser$.value?.uid || '', 
      horariosSeleccionados
    ).then(() => {
      alert('Horarios guardados exitosamente');
    }).catch(error => {
      console.error('Error al guardar horarios:', error);
      alert('Hubo un error al guardar los horarios');
    });
  }

  toggleHorario(horario: HorarioDisponible) {
    horario.seleccionado = !horario.seleccionado;
  }
}