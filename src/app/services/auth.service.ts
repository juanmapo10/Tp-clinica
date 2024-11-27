import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { Firestore, addDoc, collection, getDocs, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Usuario {
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  email: string;
  tipo: 'paciente' | 'especialista' | 'administrador';
  obraSocial?: string;
  especialidad?: string;
  imagenes: string[];
  aprobado?: boolean;
  uid?: string; 
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
        
        // Subir imagen
        await uploadBytes(storageRef, imagen);
        
        // Obtener URL
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

  async registrarUsuario(usuario: Usuario, password: string, imagenes: File[]): Promise<void> {
    try {
      // Crear usuario en Authentication
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

    } catch (error) {
      console.error('Error en el registro:', error);
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
      await this.redirectBasedOnUserType(userData.tipo);
    } catch (error: any) {
      console.error('Error en el login:', error);
      throw error;
    }
  }

  getUsuarios(): Observable<Usuario[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    return from(getDocs(usuariosRef)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => ({
          ...doc.data() as Usuario,
          uid: doc.id
        }));
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

  

}

