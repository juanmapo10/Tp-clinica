import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { AuthService, LoginLog, Usuario } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { TurnoService,Turno } from '../services/turno.service';
import * as XLSX from 'xlsx';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { RECAPTCHA_SETTINGS, RecaptchaModule, RecaptchaSettings } from 'ng-recaptcha';



@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,RecaptchaModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  providers: [
    {
      provide: RECAPTCHA_SETTINGS,
      useValue: {
        siteKey: '6LeKc3UqAAAAABMGD1bJ5u0ZfPEu3zGS-zlW5bRG',
      } as RecaptchaSettings,
    },
  ],
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

  registroAdminForm: FormGroup;
  registroEspecialistaForm: FormGroup;
  imagenEspecialista: File | null = null;
  cargandoEspecialista = false;
  mostrarFormularioAdmin = false; 
  mostrarFormularioEspecialista = false;
  especialidades$: Observable<string[]>;
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  horarios = Array.from({ length: 10 }, (_, i) => `${8 + i}:00`);



  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private turnoService: TurnoService
  ) {
    this.registroAdminForm = this.crearFormularioAdmin();
    this.usuarios$ = this.authService.getUsuarios();
    this.registroEspecialistaForm = this.crearFormularioEspecialista();
    this.especialidades$ = this.authService.getEspecialidades();
  }

  ngOnInit() {
    this.cargarUsuarios();
    this.cargarPacientes()
    this.cargarLoginLogs();
  }

  toggleCheckboxSelection(value: string, controlName: string): void {
    const control = this.registroEspecialistaForm.get(controlName);
    if (control) {
      const currentValues = control.value || [];
      const updatedValues = currentValues.includes(value)
        ? currentValues.filter((item: string) => item !== value)
        : [...currentValues, value];
      
      control.setValue(updatedValues);
      control.markAsDirty(); 
    }
  }

  private crearFormularioAdmin(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(18), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      recaptcha: ['', Validators.required]
    });
  }

  private crearFormularioEspecialista(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(18), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      recaptcha: ['', Validators.required],
      especialidades: [[], Validators.required],
      dias: [[], Validators.required], 
      horarios: [[], Validators.required], 
      cuentaVerificado: false,
    });
  }

  onFileSelected(event: any, isEspecialista: boolean = false) {
    const files = event.target.files;
    if (files?.length > 0) {
      const selectedFile = files[0];
      if (isEspecialista) {
        this.imagenEspecialista = selectedFile;
        console.log('Specialist image selected:', this.imagenEspecialista);
      } else {
        this.imagen = selectedFile;
        console.log('Admin image selected:', this.imagen);
      }
    }
  }
  async onSubmitAdmin() {
    if (this.registroAdminForm.valid && this.imagen) {
      this.cargando = true;
      this.mensajeError = '';
      this.mensajeExito = '';
      
      try {
        const userData = {
          ...this.registroAdminForm.value,
          aprobado: true,
          tipo: "admin"
        };
        
        await this.authService.registrarUsuario(
          userData,
          this.registroAdminForm.get('password')?.value,
          [this.imagen]
        );
        
        this.mensajeExito = 'Administrador registrado exitosamente';
        this.registroAdminForm.reset({ tipo: 'administrador' });
        this.imagen = null;
      } catch (error) {
        this.mensajeError = 'Error al registrar administrador';
      } finally {
        this.cargando = false;
      }
    } else {
      this.mensajeError = 'Por favor complete todos los campos y seleccione una imagen';
    }
  }

  async onSubmitEspecialista() {
    console.log('Specialist Image:', this.imagenEspecialista);
    console.log('Form Valid:', this.registroEspecialistaForm.valid);
    Object.keys(this.registroEspecialistaForm.controls).forEach(key => {
      const control = this.registroEspecialistaForm.get(key);
      if (control?.invalid) {
        console.log(`${key} is invalid:`, control.errors);
      }
    });
    console.log(this.imagenEspecialista)
    if (this.registroEspecialistaForm.valid && this.imagenEspecialista) {
      this.cargandoEspecialista = true;
      this.mensajeError = '';
      this.mensajeExito = '';
      
      try {
        const userData = {
          ...this.registroEspecialistaForm.value,
          aprobado: false,
          tipo: "especialista"
        };
        
        await this.authService.registrarUsuario(
          userData,
          this.registroEspecialistaForm.get('password')?.value,
          [this.imagenEspecialista]
        );
        
        this.mensajeExito = 'Especialista registrado exitosamente. Pendiente de aprobación.';
        this.registroEspecialistaForm.reset({ tipo: 'especialista' });
        this.imagenEspecialista = null;
      } catch (error) {
        this.mensajeError = 'Error al registrar especialista';
      } finally {
        this.cargandoEspecialista = false;
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

  
  toggleFormularioAdmin() {
    this.mostrarFormularioAdmin = !this.mostrarFormularioAdmin;
    if (!this.mostrarFormularioAdmin) {
      this.registroAdminForm.reset({ tipo: 'administrador' });
      this.mensajeExito = '';
      this.mensajeError = '';
      this.imagen = null;
    }
  }

  toggleFormularioEspecialista() {
    this.mostrarFormularioEspecialista = !this.mostrarFormularioEspecialista;
    if (!this.mostrarFormularioEspecialista) {
      this.registroEspecialistaForm.reset({ tipo: 'especialista' });
      this.mensajeExito = '';
      this.mensajeError = '';
      this.imagenEspecialista = null;
    }
  }

  onRecaptchaResolved(token: string | null, isEspecialista: boolean = false) {
    console.log(isEspecialista);
    
    if (isEspecialista) {
      this.registroEspecialistaForm.patchValue({ recaptcha: token });
      this.registroEspecialistaForm.get('recaptcha')?.markAsTouched();
    } else {
      this.registroAdminForm.patchValue({ recaptcha: token });
      this.registroAdminForm.get('recaptcha')?.markAsTouched();
    }
  }
  
  onRecaptchaExpired(isEspecialista: boolean = false) {
    if (isEspecialista) {
      this.registroEspecialistaForm.patchValue({ recaptcha: null });
    } else {
      this.registroAdminForm.patchValue({ recaptcha: null });
    }
  }
}
