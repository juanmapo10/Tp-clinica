import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, Usuario } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { emailVerified } from '@angular/fire/auth-guard';
import { PasswordStrengthDirective } from '../../directive/password-strength.directive';
import { ImagePreviewDirective } from '../../directive/image-preview.directive';
import { CustomValidatorDirective } from '../../directive/custom-validator.directive';
import { RECAPTCHA_SETTINGS, RecaptchaModule, RecaptchaSettings } from 'ng-recaptcha';


@Component({
  selector: 'app-registro',
  templateUrl: './registro.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PasswordStrengthDirective,
    ImagePreviewDirective,
    CustomValidatorDirective,
    RecaptchaModule
  ], providers: [
    {
      provide: RECAPTCHA_SETTINGS,
      useValue: {
        siteKey: '6LfJopIqAAAAAHZgtOdJpXdVgUDw14_RWEnmuwUH',
      } as RecaptchaSettings,
    },
  ],
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent implements OnInit {
  registroForm: FormGroup;
  tipoUsuario: 'paciente' | 'especialista' | null = null;
  especialidades$: Observable<string[]>;
  imagenes: File[] = [];
  nuevaEspecialidad: string = '';
  cargando = false;
  mensajeExito: string = '';
  mensajeError: string = '';
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  horarios = Array.from({ length: 10 }, (_, i) => `${8 + i}:00`);
  
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registroForm = this.crearFormularioPaciente();
    this.especialidades$ = this.authService.getEspecialidades();
  }
  ngOnInit() {}
  private crearFormularioPaciente(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(0), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      obraSocial: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      recaptcha: ['', Validators.required]
    });
  }
  private crearFormularioEspecialista(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(0), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      especialidades: [[], Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      cuentaVerificado: false,
      dias: [[], Validators.required], 
      horarios: [[], Validators.required], 
      recaptcha: ['', Validators.required]
    });
  }
  cambiarTipoUsuario(tipo: 'paciente' | 'especialista') {
    this.tipoUsuario = tipo;
    this.registroForm = tipo === 'paciente' ? 
      this.crearFormularioPaciente() : 
      this.crearFormularioEspecialista();
    this.imagenes = [];
    this.mensajeError = '';
    this.mensajeExito = '';
  }
  toggleCheckboxSelection(value: string, controlName: string): void {
    const control = this.registroForm.get(controlName);
    if (control) {
      const currentValues = control.value || [];
      const updatedValues = currentValues.includes(value)
        ? currentValues.filter((item: string) => item !== value)
        : [...currentValues, value];
      
      control.setValue(updatedValues);
      control.markAsDirty(); 
    }
  }

  seleccionarTipoUsuario(tipo: 'paciente' | 'especialista') {
    this.tipoUsuario = tipo;
    this.registroForm = tipo === 'paciente' ? 
      this.crearFormularioPaciente() : 
      this.crearFormularioEspecialista();
    this.imagenes = [];
    this.mensajeError = '';
    this.mensajeExito = '';
  }


  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.imagenes = Array.from(files);
      if (this.tipoUsuario === 'paciente' && this.imagenes.length !== 2) {
        this.mensajeError = 'Debe seleccionar exactamente 2 imágenes para el perfil de paciente';
        this.imagenes = [];
      } else if (this.tipoUsuario === 'especialista' && this.imagenes.length !== 1) {
        this.mensajeError = 'Debe seleccionar exactamente 1 imagen para el perfil de especialista';
        this.imagenes = [];
      } else {
        this.mensajeError = '';
      }
    }
  }
  async agregarNuevaEspecialidad() {
    if (this.nuevaEspecialidad.trim()) {
      try {
        await this.authService.agregarEspecialidad(this.nuevaEspecialidad.trim());
        this.nuevaEspecialidad = '';
        this.mensajeExito = 'Especialidad agregada correctamente';
        setTimeout(() => this.mensajeExito = '', 3000);
      } catch (error) {
        this.mensajeError = 'Error al agregar especialidad';
        setTimeout(() => this.mensajeError = '', 3000);
      }
    }
  }
  getErrorMessage(controlName: string): string {
    const control = this.registroForm.get(controlName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return `El campo es requerido`;
      if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      if (control.errors['email']) return 'Email inválido';
      if (control.errors['min']) return `Valor mínimo ${control.errors['min'].min}`;
      if (control.errors['max']) return `Valor máximo ${control.errors['max'].max}`;
      if (control.errors['pattern']) return 'DNI debe tener 8 dígitos';
    }
    return '';
  }
  async onSubmit() {
    if (this.registroForm.valid && this.validarImagenes()) {
      
      this.cargando = true;
      this.mensajeError = '';
      this.mensajeExito = '';
      
      try {
        const userData: Usuario = {
          ...this.registroForm.value,
          tipo: this.tipoUsuario,
        };
        const diasDisponibles = this.tipoUsuario === 'especialista' 
          ? this.registroForm.get('dias')?.value 
          : undefined;
        
        const horariosDisponibles = this.tipoUsuario === 'especialista'
          ? this.registroForm.get('horarios')?.value
          : undefined;
        
        await this.authService.registrarUsuario(
          userData,
          this.registroForm.get('password')?.value,
          this.imagenes,
          diasDisponibles,
          horariosDisponibles
        );
        
        this.mensajeExito = 'Registro exitoso';
        setTimeout(() => {
          if(userData.tipo == "especialista"){
            this.router.navigate(['/login']);
            this.authService.logout();
          }else{
          this.router.navigate(['/perfiles-pacientes']);
          }
        }, 2000);
      } catch (error) {
        this.mensajeError = 'Error en el registro. Por favor, intente nuevamente.';
      } finally {
        this.cargando = false;
      }
    } else {
      this.mensajeError = 'Por favor, complete todos los campos correctamente';
      Object.keys(this.registroForm.controls).forEach(key => {
        const control = this.registroForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }

  private validarImagenes(): boolean {
    if (this.tipoUsuario === 'paciente' && this.imagenes.length !== 2) {
      this.mensajeError = 'Debe seleccionar 2 imágenes para el perfil de paciente';
      return false;
    }
    if (this.tipoUsuario === 'especialista' && this.imagenes.length !== 1) {
      this.mensajeError = 'Debe seleccionar 1 imagen para el perfil de especialista';
      return false;
    }
    return true;
  }

  onRecaptchaResolved(token: string | null) {
    this.registroForm.patchValue({ recaptcha: token });
  }
  
  onRecaptchaExpired() {
    this.registroForm.patchValue({ recaptcha: null });
  }
  
}