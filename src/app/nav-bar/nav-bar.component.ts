import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink, RouterOutlet, CommonModule],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {
  user$: Observable<User | null>;

  constructor(private authService: AuthService,private router : Router) {
    this.user$ = this.authService.currentUser$;
  }

  logout() {
    this.authService.logout().then(() => {
      console.log('Sesión cerrada exitosamente');
    }).catch((error) => {
      console.error('Error al cerrar sesión:', error);
    });
  }

  async redirectToMisTurnos() {
    const userType = await this.authService.getCurrentUserType();
    console.log(userType);
    if (userType === 'especialista') {
      await this.router.navigate(['/especialistas-turnos']);
    } else if (userType === 'paciente') {
      await this.router.navigate(['/pacientes-turnos']);
    }
  }

  async redirectToMiPerfil() {
    const userType = await this.authService.getCurrentUserType();
    console.log(userType);
    if (userType === 'especialista') {
      await this.router.navigate(['/perfiles-especialistas']);
    } else if (userType === 'paciente') {
      await this.router.navigate(['/perfiles-pacientes']);
    }
  }

  ngOnInit() {}
}