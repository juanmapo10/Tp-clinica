import { Component } from '@angular/core';
import { TurnoService } from '../../services/turno.service';
import { AuthService, Usuario } from '../../services/auth.service';
import { BehaviorSubject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-administrador',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './administrador.component.html',
  styleUrl: './administrador.component.css'
})
export class AdministradorComponent {

  currentUser$ = new BehaviorSubject<Usuario | null>(null);

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
          const patientProfile = await this.authService.getCurrentPatientProfile();
          
          if (patientProfile) {
            this.currentUser$.next(patientProfile);
            console.log("Patient Profile:", this.currentUser$.value);
          } else {
            console.warn('No patient profile found');
            this.currentUser$.next(null);
          }
        } catch (error) {
          console.error('Error fetching patient profile:', error);
          this.currentUser$.next(null);
        }
      } else {
        console.log('No hay usuario autenticado');
        this.currentUser$.next(null);
      }
    });
  }
}
