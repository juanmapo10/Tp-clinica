import { Component, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Usuario } from '../../services/auth.service';

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

  }

  ngOnDestroy() {
  }

private cargarDatosUsuario(){}

}
