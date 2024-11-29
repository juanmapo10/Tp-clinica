import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css']
})
export class NavBarComponent implements OnInit {
  user$: Observable<User | null>;
  tipoUsuario: string = "";

  constructor(private authService: AuthService, private router: Router) {
    this.user$ = this.authService.currentUser$;
  }

  async logout() {
    try {
      await this.authService.logout();
      console.log('Sesión cerrada exitosamente');
      this.tipoUsuario = ""; // Resetear tipo de usuario al cerrar sesión
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  async redirectToMisTurnos() {
    const userType = await this.authService.getCurrentUserType();
    if (userType === 'especialista') {
      await this.router.navigate(['/especialistas-turnos']);
    } else if (userType === 'paciente') {
      await this.router.navigate(['/pacientes-turnos']);
    }
  }

  async redirectToMiPerfil() {
    const userType = await this.authService.getCurrentUserType();
    if (userType === 'especialista') {
      await this.router.navigate(['/perfiles-especialistas']);
    } else if (userType === 'paciente') {
      await this.router.navigate(['/perfiles-pacientes']);
    }
  }

  async TraerTipoUsuario() {
    try {
      const userType = await this.authService.getCurrentUserType();
      this.tipoUsuario = userType ? userType : ''; 
    } catch (error) {
      console.error('Error al obtener el tipo de usuario:', error);
      this.tipoUsuario = ''; 
    }
  }

  async navegarMisHorarios() {
    await this.router.navigate(['/mishorarios']);
  }

  async ngOnInit() {
    try {
      // Obtener el tipo de usuario cuando el usuario está autenticado
      this.user$.subscribe(async (user) => {
        if (user) {
          const userType = await this.authService.getCurrentUserType();
          this.tipoUsuario = userType || '';
        }
      });
    } catch (error) {
      console.error('Error al obtener el tipo de usuario:', error);
      this.tipoUsuario = ''; 
    }
  }
}
