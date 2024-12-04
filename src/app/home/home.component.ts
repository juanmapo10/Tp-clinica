import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { AuthService, LoginLog, Usuario } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { TurnoService,Turno } from '../services/turno.service';
import * as XLSX from 'xlsx';
import { trigger, state, style, transition, animate } from '@angular/animations';




@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  animations: [
    trigger('slideInOut', [
      state('void', style({
        transform: 'translateX(-100%)',
        opacity: 0
      })),
      transition(':enter', [
        animate('500ms ease-out', style({
          transform: 'translateX(0)',
          opacity: 1
        }))
      ]),
      transition(':leave', [
        animate('500ms ease-in', style({
          transform: 'translateX(100%)',
          opacity: 0
        }))
      ])
    ])
  ]
})
export class HomeComponent implements OnInit {
  registroForm: FormGroup;
  usuarios$: Observable<Usuario[]>;
  imagen: File | null = null;
  cargando = false;
  mensajeExito = '';
  mensajeError = '';
  usuarios: Usuario[] = [];
  pacientes: Usuario[] = [];
  private usuariosSubscription: Subscription | null = null;
  mostrarFormulario = false; 
  private pacientesSubscription: Subscription | null = null;
  pacienteSeleccionado: Usuario | null = null;
  turnosPaciente: Turno[] = [];
  favoritoPacientes: {[key: string]: boolean} = {};
  loginLogs: LoginLog[] = [];
  showLoginLogs = false;
  usuarioAEliminar: Usuario | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private turnoService: TurnoService
  ) {
    this.registroForm = this.crearFormulario();
    this.usuarios$ = this.authService.getUsuarios();
  }

  ngOnInit() {
    this.cargarUsuarios();
    this.cargarPacientes()
    this.cargarLoginLogs();
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

  toggleFormulario() {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.registroForm.reset({ tipo: 'administrador' });
      this.mensajeExito = '';
      this.mensajeError = '';
      this.imagen = null;
    }
  }

  async eliminarUsuario(uid: string): Promise<void> {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        await this.authService.eliminarUsuario(uid);
        this.usuarios = this.usuarios.filter(usuario => usuario.uid !== uid);
        this.mensajeExito = 'Usuario eliminado exitosamente';
        setTimeout(() => (this.mensajeExito = ''), 3000);
      } catch (error) {
        this.mensajeError = 'Error al eliminar usuario';
      }
    }
  }
  
  async cargarPacientes()
  {
    this.pacientesSubscription= this.authService.getPacientes().subscribe({
      next: (pacientes) => {
        console.log('pacientes cargadosaa:', pacientes);
        this.pacientes = pacientes;
      },
      error: (error) => {
        console.error('Error al cargar pacientes:', error);
        this.mensajeError = 'Error al cargar pacientes';
      }
    });
    
  }

  async seleccionarPaciente(paciente: Usuario) {
    this.pacienteSeleccionado = paciente;
    this.turnoService.getTurnosPaciente(paciente.uid!).subscribe({
      next: (turnos) => {
        this.turnosPaciente = turnos;
      },
      error: (error) => {
        console.error('Error al cargar turnos del paciente:', error);
      }
    });
  }

 

  cerrarDetallePaciente() {
    this.pacienteSeleccionado = null;
    this.turnosPaciente = [];
  }


  
  exportarTurnosExcel() {
    if (this.turnosPaciente.length > 0) {
      this.turnoService.exportTurnosToExcel(
        this.turnosPaciente, 
        `Turnos_${this.pacienteSeleccionado?.nombre}_${this.pacienteSeleccionado?.apellido}`
      );
    }
  }

  private cargarLoginLogs() {
    this.authService.getLoginLogs().subscribe({
      next: (logs) => {
        this.loginLogs = logs;
        console.log('Login logs cargados:', logs);
      },
      error: (error) => {
        console.error('Error al cargar login logs:', error);
      }
    });
  }

  toggleLoginLogs() {
    this.showLoginLogs = !this.showLoginLogs;
  }

  mostrarModalEliminar(usuario: Usuario) {
    this.usuarioAEliminar = usuario;
  }

  cancelarEliminacion() {
    this.usuarioAEliminar = null;
  }

  async confirmarEliminacion() {
    if (this.usuarioAEliminar) {
      try {
        await this.authService.eliminarUsuario(this.usuarioAEliminar.uid!);
        this.usuarios = this.usuarios.filter(usuario => usuario.uid !== this.usuarioAEliminar!.uid);
        this.mensajeExito = 'Usuario eliminado exitosamente';
        setTimeout(() => (this.mensajeExito = ''), 3000);
        
        // Close the modal
        this.usuarioAEliminar = null;
      } catch (error) {
        this.mensajeError = 'Error al eliminar usuario';
      }
    }
  }
}
