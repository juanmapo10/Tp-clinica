import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  error: string = '';
  loading: boolean = false;
  usuariosRapidos = [
    { email: 'juanmanuelportela2@gmail.com', tipo: 'admin' },
    { email: 'sonahi5212@edectus.com', tipo: 'paciente' },
    { email: 'vobowi1539@cantozil.com', tipo: 'especialista' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.loading = true;
      this.error = '';
      
      try {
        await this.authService.loginUser(
          this.loginForm.get('email')?.value,
          this.loginForm.get('password')?.value
        );

      } catch (error: any) {
        this.error = this.getErrorMessage(error.code);
      } finally {
        this.loading = false;
      }
    }
  }

  async loginRapido(email: string) {
    this.loginForm.patchValue({ email });
    this.loginForm.patchValue({ password: '123456' });
    await this.onSubmit();
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found':
        return 'Usuario no encontrado';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta';
      case 'auth/email-not-verified':
        return 'Por favor, verifica tu email antes de ingresar';
      case 'auth/user-not-approved':
        return 'Tu cuenta está pendiente de aprobación por un administrador';
      default:
        return 'Error al iniciar sesión';
    }
  }
}