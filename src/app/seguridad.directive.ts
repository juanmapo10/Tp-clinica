import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';


@Directive({
  selector: '[appSeguridad]',
  standalone: true
})
export class SeguridadDirective implements OnInit {
  @Input('appSeguridad') requiredRole: 'paciente' | 'especialista' | 'admin' = 'paciente';

  constructor(
    private el: ElementRef, 
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    try {
      const userType = await this.authService.getCurrentUserType();
      if (userType !== this.requiredRole) {
          this.router.navigateByUrl('/login');
        console.warn(`Acceso denegado: Solo ${this.requiredRole}s pueden ver este contenido`);
      }
    } catch (error) {
      console.error('Error verificando rol de usuario', error);
      this.el.nativeElement.style.display = 'none';
    }
  }
}