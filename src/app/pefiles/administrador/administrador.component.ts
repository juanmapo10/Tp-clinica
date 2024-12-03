import { Component, OnInit } from '@angular/core';
import { TurnoService } from '../../services/turno.service';
import { AuthService, Usuario } from '../../services/auth.service';
import { BehaviorSubject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';

@Component({
  selector: 'app-administrador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './administrador.component.html',
  styleUrl: './administrador.component.css',
  animations: [
    trigger('bounceIn', [
      transition(':enter', [
        animate('800ms', keyframes([
          style({ 
            opacity: 0, 
            transform: 'scale(0.3) rotate(-15deg)', 
            offset: 0 
          }),
          style({ 
            opacity: 0.5, 
            transform: 'scale(1.05) rotate(10deg)', 
            offset: 0.5 
          }),
          style({ 
            opacity: 1, 
            transform: 'scale(1) rotate(0)', 
            offset: 1 
          })
        ]))
      ])
    ]),
    trigger('staggerItems', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(50px)' }),
        animate('600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', style({
          opacity: 1,
          transform: 'translateY(0)'
        }))
      ])
    ]),
    trigger('cardFlip', [
      state('flipped', style({
        transform: 'rotateY(180deg)'
      })),
      transition(':enter', [
        style({ opacity: 0, transform: 'rotateY(-90deg)' }),
        animate('700ms 200ms ease-out', style({
          opacity: 1,
          transform: 'rotateY(0)'
        }))
      ])
    ])
  ]
})
export class AdministradorComponent implements OnInit {
  currentUser$ = new BehaviorSubject<Usuario | null>(null);
  isCardFlipped = false;

  ngOnInit() {
    this.inicializarComponente();
  }

  constructor(
    private turnoService: TurnoService,
    private authService: AuthService
  ) {}

  toggleCardFlip() {
    this.isCardFlipped = !this.isCardFlipped;
  }

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