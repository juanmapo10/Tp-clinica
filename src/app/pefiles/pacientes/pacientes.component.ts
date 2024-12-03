import { Component, OnInit } from '@angular/core';
import { TurnoService } from '../../services/turno.service';
import { AuthService, Usuario } from '../../services/auth.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { HistoriaClinica } from '../../services/turno.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.css'
})
export class PacientesComponente implements OnInit {
  currentUser$ = new BehaviorSubject<Usuario | null>(null);
  historiasClinicas$: Observable<HistoriaClinica[]> | null = null;
  especialistas: Usuario[] = [];
  especialistaSeleccionado: string = '';
  
  expandedHistorias: { [key: string]: boolean } = {};
  
  constructor(
    private authService: AuthService,
    private turnoService: TurnoService
  ) {}

  ngOnInit() {
    this.inicializarComponente();
    this.turnoService.getEspecialistas().subscribe(
      especialistas => this.especialistas = especialistas
    );
  }

  private inicializarComponente() {
    this.authService.currentUser$.subscribe(async (user) => {
      if (user) {
        try {
          const patientProfile = await this.authService.getCurrentPatientProfile();
          if (patientProfile && patientProfile.uid) {
            this.currentUser$.next(patientProfile);
            this.historiasClinicas$ = this.turnoService.getHistoriasClinicasPaciente(patientProfile.uid);
          
            this.historiasClinicas$.subscribe(historias => {
              historias.forEach(historia => {
                this.expandedHistorias[historia.uid] = false;
              });
            });
          } else {
            console.warn('Patient profile is incomplete');
            this.currentUser$.next(null);
            this.historiasClinicas$ = null;
          }
        } catch (error) {
          console.error('Error fetching patient profile:', error);
          this.currentUser$.next(null);
          this.historiasClinicas$ = null;
        }
      } else {
        this.currentUser$.next(null);
        this.historiasClinicas$ = null;
      }
    });
  }

  toggleHistoriaExpanded(historiaUid: string) {
    this.expandedHistorias[historiaUid] = !this.expandedHistorias[historiaUid];
  }

  async descargarHistoriasEspecialista() {
    if (this.especialistaSeleccionado) {
      try {
        await this.turnoService.descargarHistoriasClinicasPorEspecialista(this.especialistaSeleccionado);
      } catch (error) {
        console.error('Error al descargar historias clínicas', error);
      }
    }
  }
}