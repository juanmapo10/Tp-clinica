import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegistroComponent } from './pages/registro/registro.component';
import { HomeComponent } from './home/home.component'; 
import { authGuard } from './auth.guard';
import { EspecialistasComponent } from './pages/especialistas/especialistas.component';
import { PacientesComponente } from './pefiles/pacientes/pacientes.component';
import { PacientesTurnosComponent } from './pages/pacientes-turnos/pacientes-turnos.component';
import { EspecialistasTurnosComponent } from './pages/especialistas-turnos/especialistas-turnos.component';
import { EspecialistasComponente } from './pefiles/especialistas/especialistas.component';
import {MishorariosComponent} from './mishorarios/mishorarios.component'
import { AdminTurnosComponent } from './pages/admin-turnos/admin-turnos.component'
import { AdministradorComponent } from './pefiles/administrador/administrador.component'
import { PacientesComponent } from './especialista/pacientes/pacientes.component'
import { EstadisticasComponent } from './estadisticas/estadisticas.component';

export const routes: Routes = [
    { path: 'home', component: HomeComponent },
    { path: '', component: LoginComponent },
    { path: 'registro', component: RegistroComponent },
    { path: 'login', component: LoginComponent },
    {path : 'especialistas', component : EspecialistasComponent},
    {path : 'especialistas-turnos', component : EspecialistasTurnosComponent},
    {path : 'perfiles-pacientes', component :PacientesComponente },
    {path : 'pacientes-turnos', component : PacientesTurnosComponent},
    {path : 'perfiles-especialistas', component : EspecialistasComponente},
    {path : 'mishorarios', component : MishorariosComponent},
    {path : 'admin-turnos', component : AdminTurnosComponent},
    {path : 'perfiles-admin', component : AdministradorComponent},
    {path : 'pacientes-especialista', component : PacientesComponent},
    {path : 'estadisticas', component : EstadisticasComponent }
];
