import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { AuthService, Usuario } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  registroForm: FormGroup;
  usuarios$: Observable<Usuario[]>;
  imagen: File | null = null;
  cargando = false;
  mensajeExito = '';
  mensajeError = '';
  usuarios: Usuario[] = [];
  private usuariosSubscription: Subscription | null = null;


  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.registroForm = this.crearFormulario();
    this.usuarios$ = this.authService.getUsuarios();
  }

  ngOnInit() {
    this.cargarUsuarios();
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      tipo: ['administrador', Validators.required],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(18), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files?.length > 0) {
      this.imagen = files[0];
    }
  }

  async onSubmit() {
    if (this.registroForm.valid && this.imagen) {
      this.cargando = true;
      this.mensajeError = '';
      this.mensajeExito = '';
      
      try {
        const userData = {
          ...this.registroForm.value,
          aprobado: this.registroForm.value.tipo === 'administrador'
        };
        
        await this.authService.registrarUsuario(
          userData,
          this.registroForm.get('password')?.value,
          [this.imagen]
        );
        
        this.mensajeExito = 'Usuario registrado exitosamente';
        this.registroForm.reset();
        this.imagen = null;
      } catch (error) {
        this.mensajeError = 'Error al registrar usuario';
      } finally {
        this.cargando = false;
      }
    } else {
      this.mensajeError = 'Por favor complete todos los campos y seleccione una imagen';
    }
  }

  async toggleAprobacion(usuario: Usuario) {
    try {
      await this.authService.actualizarAprobacionEspecialista(usuario.uid!, !usuario.aprobado);
      
      // Opcional: Actualizar localmente para feedback inmediato
      const index = this.usuarios.findIndex(u => u.uid === usuario.uid);
      if (index !== -1) {
        this.usuarios[index].aprobado = !usuario.aprobado;
      }

      this.mensajeExito = `Usuario ${usuario.aprobado ? 'deshabilitado' : 'habilitado'} exitosamente`;
      setTimeout(() => this.mensajeExito = '', 3000);
    } catch (error) {
      this.mensajeError = 'Error al actualizar el estado del usuario';
      setTimeout(() => this.mensajeError = '', 3000);
    }
  }

  private cargarUsuarios() {
    // Usar el método del servicio de autenticación para obtener usuarios
    this.usuariosSubscription = this.authService.getUsuarios().subscribe({
      next: (usuarios) => {
        console.log('Usuarios cargados:', usuarios);
        this.usuarios = usuarios;
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.mensajeError = 'Error al cargar usuarios';
      }
    });
  }

}
