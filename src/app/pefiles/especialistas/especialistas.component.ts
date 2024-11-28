import { Component, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService, Usuario } from '../../services/auth.service';
import { TurnoService } from '../../services/turno.service';

@Component({
  selector: 'app-especialistas',
  standalone: true,
  imports: [],
  templateUrl: './especialistas.component.html',
  styleUrl: './especialistas.component.css'
})
export class EspecialistasComponente implements OnInit  {
  currentUser$ = new BehaviorSubject<Usuario | null>(null);

  ngOnInit() {
    this.inicializarComponente();
  }

  constructor(
    private turnoService: TurnoService,
    private authService: AuthService
  ) {}


  private inicializarComponente() {
    const authSub = this.authService.currentUser$.subscribe(user => {
      console.log('Estado de autenticación actualizado:', user?.email);
      
      if (user) {
        this.authService.getCurrentUserType().then(usuarioTipo => {
          console.log('Tipo de usuario:', usuarioTipo);
          
          if (usuarioTipo === 'especialista') {
            const currentUser = {
              uid: user.uid,
              email: user.email,
              tipo: usuarioTipo
            } as Usuario;

            this.currentUser$.next(currentUser);
          } else {
            console.warn('Usuario no es especialista:', usuarioTipo);
          }
        }).catch(error => {
          console.error('Error al obtener tipo de usuario:', error);
        });
      } else {
        console.log('No hay usuario autenticado');
        this.currentUser$.next(null);
      }
    });
  }

private cargarDatosUsuario(){}

}
