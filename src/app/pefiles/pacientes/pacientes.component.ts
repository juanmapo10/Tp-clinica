import { Component, OnInit } from '@angular/core';
import { TurnoService } from '../../services/turno.service';
import { AuthService, Usuario } from '../../services/auth.service';
import { BehaviorSubject } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.css'
})
export class PacientesComponente implements OnInit{
  currentUser$ = new BehaviorSubject<Usuario | null>(null);
  
  ngOnInit() {
    this.inicializarComponente();
    
  }

  constructor(
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
