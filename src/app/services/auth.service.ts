import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { Firestore, addDoc, collection, getDocs, doc, setDoc, getDoc, where, query, deleteDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export interface LoginLog {
  userId?: string;
  email: string;
  userType?: string;
  timestamp: Date;
  loginSuccess: boolean;
  errorMessage?: string;
  apellido?: string;
}

export interface Usuario {
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  email: string;
  tipo: 'paciente' | 'especialista' | 'admin';
  obraSocial?: string;
  especialidades?: string[];
  imagenes: string[];
  aprobado?: boolean;
  uid?: string;
  dias? : string[];
  horarios? : string[];
  
}
export interface Horarios {
  especialistaUid: string;
  diasDisponibles: string[];
  horariosDisponibles: Date[];
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private storage: Storage,
    private router: Router

    
  ) {

    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
    });
  }

  
  private async subirImagenes(imagenes: File[], userId: string): Promise<string[]> {
    try {
      const urls: string[] = [];
      
      for (let i = 0; i < imagenes.length; i++) {
        const imagen = imagenes[i];
        const filePath = `usuarios/${userId}/perfil_${i}`;
        const storageRef = ref(this.storage, filePath);

        await uploadBytes(storageRef, imagen);

        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }
      
      return urls;
    } catch (error) {
      console.error('Error al subir imágenes:', error);
      throw error;
    }
  }

  logout() {
    return signOut(this.auth);
  }
  
  getEspecialidades(): Observable<string[]> {
    const especialidadesRef = collection(this.firestore, 'especialidades');
    
    return from(getDocs(especialidadesRef)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => doc.data()['nombre']);
      })
    );
  }

  async agregarEspecialidad(especialidad: string): Promise<void> {
    const especialidadesRef = collection(this.firestore, 'especialidades');
    await addDoc(especialidadesRef, {
      nombre: especialidad,
      fechaCreacion: new Date()
    });
  }

  async registrarUsuario(usuario: Usuario, password: string, imagenes: File[], diasDisponibles?: string[], horariosDisponibles?: string[], recaptchaToken?: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, usuario.email, password);
      
      if (!userCredential.user) throw new Error('No se pudo crear el usuario');

      await sendEmailVerification(userCredential.user);
      console.log(userCredential.user);
      const imageUrls = await this.subirImagenes(imagenes, userCredential.user.uid);
      const usuarioDoc = doc(this.firestore, `usuarios/${userCredential.user.uid}`);

      await setDoc(usuarioDoc, {
        ...usuario,
        imagenes: imageUrls,
        uid: userCredential.user.uid,
        aprobado: usuario.tipo === 'paciente' ? true : false,
        emailVerificado: false
      });

      if (usuario.tipo === 'especialista' && diasDisponibles && horariosDisponibles) {
        console.log('entro')
        const horariosRef = collection(this.firestore, 'horarios');
        await addDoc(horariosRef, {
          especialistaUid: userCredential.user.uid,
          diasDisponibles,
          horariosDisponibles
        });
      }

    } catch (error) {
      console.error('Error en el registro:', error);
      throw error;
    }
  }

  async getHorariosEspecialista(especialistaUid: string): Promise<Date[]> {
    try {
      const horariosRef = collection(this.firestore, 'horarios');
      const q = query(horariosRef, where('especialistaUid', '==', especialistaUid));
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        console.log(doc.data()['horariosDisponibles'].map((horario: string) => new Date(horario)));
        return doc.data()['horariosDisponibles'].map((horario: string) => new Date(horario));
      }
      
      return [];
    } catch (error) {
      console.error('Error al obtener horarios:', error);
      throw error;
    }
  }

  async loginUser(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        throw new Error('Email del usuario no verificado');
      }
  
      const userDoc = await getDoc(doc(this.firestore, `usuarios/${userCredential.user.uid}`));
      const userData = userDoc.data() as Usuario;
  
      if (userData.tipo === 'especialista' && !userData.aprobado) {
        throw new Error('usuario no aprobado');
      }
      const loginLogsRef = collection(this.firestore, 'login_logs');
      await addDoc(loginLogsRef, {
        userId: userCredential.user.uid,
        email: userCredential.user.email,
        apellido :userData.apellido,
        userType: userData.tipo,
        timestamp: new Date(),
        loginSuccess: true
      });
  
      await this.redirectBasedOnUserType(userData.tipo);
    } catch (error: any) {
      const loginLogsRef = collection(this.firestore, 'login_logs');
      await addDoc(loginLogsRef, {
        email: email,
        timestamp: new Date(),
        loginSuccess: false,
        errorMessage: error.message
      });
  
      console.error('Error en el login:', error);
      throw error;
    }}

  getUsuarios(): Observable<Usuario[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    return from(getDocs(usuariosRef)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data() as Usuario;
          return {
            ...data,
            uid: doc.id  
          };
        });
      })
    );
  }
  getPacientes(): Observable<Usuario[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const q = query(usuariosRef, where('tipo', '==', "paciente"));
    return from(getDocs(q)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data() as Usuario;
          return {
            ...data,
            uid: doc.id  
          };
        });
      })
    );
  }

  async actualizarAprobacionEspecialista(uid: string, aprobado: boolean): Promise<void> {
    try {
      const usuarioRef = doc(this.firestore, `usuarios/${uid}`);
      await setDoc(usuarioRef, { aprobado }, { merge: true });
    } catch (error) {
      console.error('Error al actualizar aprobación:', error);
      throw error;
    }
  }

  async getCurrentUserType(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) return null;

    const userDoc = await getDoc(doc(this.firestore, `usuarios/${user.uid}`));
    const userData = userDoc.data() as Usuario;
    return userData?.tipo || null;
  }

  

  private async redirectBasedOnUserType(userType: string): Promise<void> {
    switch (userType) {
      case 'admin':
        await this.router.navigate(['/home']);
        break;
      case 'especialista':
        await this.router.navigate(['/perfiles-especialistas']);
        break;
      case 'paciente':
        await this.router.navigate(['/perfiles-pacientes']);
        break;
    }
  }

  async getCurrentPatientProfile(): Promise<Usuario | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
  
    try {
      const userDoc = await getDoc(doc(this.firestore, `usuarios/${user.uid}`));
      
      if (!userDoc.exists()) {
        return null;
      }
  
      const userData = userDoc.data() as Usuario;
      

      
  
      return {
        ...userData,
        uid: user.uid
      };
    } catch (error) {
      console.error('Error fetching patient profile:', error);
      throw error;
    }
  }

  async getCurrentEspecialistaProfile(): Promise<Usuario | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
  
    try {
      const userDoc = await getDoc(doc(this.firestore, `usuarios/${user.uid}`));
      if (!userDoc.exists()) {
        return null;
      }
      const userData = userDoc.data() as Usuario;
      return {
        ...userData,
        uid: user.uid
      };
    } catch (error) {
      console.error('Error fetching patient profile:', error);
      throw error;
    }
  }

  async guardarHorariosEspecialista(especialistaUid: string, horariosSeleccionados: string[]): Promise<void> {
    try {
      const horariosRef = collection(this.firestore, 'horarios');
      const q = query(horariosRef, where('especialistaUid', '==', especialistaUid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await setDoc(docRef, {
          especialistaUid,
          horariosDisponibles: horariosSeleccionados
        });
      } else {
        await addDoc(horariosRef, {
          especialistaUid,
          horariosDisponibles: horariosSeleccionados
        });
      }
      const usuarioRef = doc(this.firestore, `usuarios/${especialistaUid}`);
      await setDoc(usuarioRef, { 
        horarios: horariosSeleccionados 
      }, { merge: true });
  
    } catch (error) {
      console.error('Error al guardar horarios del especialista:', error);
      throw error;
    }
  }

  async eliminarUsuario(uid: string): Promise<void> {
    try {
      const usuarioRef = doc(this.firestore, `usuarios/${uid}`);
      await deleteDoc(usuarioRef);
      console.log('Usuario eliminado correctamente.');
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      throw error;
    }
  }
  
  obtenerEspecialistas(): Observable<Usuario[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const q = query(usuariosRef, where('tipo', '==', 'especialista'), where('aprobado', '==', true));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data() as Usuario;
          return {
            ...data,
            uid: doc.id
          };
        });
      })
    );
  }
  
  getLoginLogs(): Observable<LoginLog[]> {
    const loginLogsRef = collection(this.firestore, 'login_logs');
    
    return from(getDocs(loginLogsRef)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data() as LoginLog;
          return {
            ...data,
            timestamp: data.timestamp && (data.timestamp as any).toDate 
              ? (data.timestamp as any).toDate() 
              : new Date(data.timestamp)
          };
        }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      })
    );
  }

}

