import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, query, where, doc, updateDoc, Timestamp, setDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Usuario } from './auth.service';
import { format } from 'date-fns';

export interface Turno {
  id: string;
  pacienteId?: string;
  especialistaId?: string;
  especialista: string;
  especialidad: string;
  fecha: Date;
  fechaFormateada?: string;
  horario?: string;
  estado: 'pendiente' | 'aceptado' | 'rechazado' | 'cancelado' | 'realizado';
  comentario?: string;
  calificacion?: string;
  encuesta?: any;
  resena?: string;
  paciente?: string;
  devolucion?: string;
}


@Injectable({
  providedIn: 'root'
})
export class TurnoService {
  constructor(private firestore: Firestore) {}


  getEspecialistasPorEspecialidad(especialidad: string): Observable<Usuario[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const q = query(
      usuariosRef, 
      where('tipo', '==', 'especialista'),
      where('especialidad', '==', especialidad),
      where('aprobado', '==', true)
    );
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          ...doc.data() as Usuario,
          uid: doc.id
        }))
      )
    );
  }

  getEspecialistas(): Observable<Usuario[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const q = query(
      usuariosRef, 
      where('tipo', '==', 'especialista'),
      where('aprobado', '==', true)
    );
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          ...doc.data() as Usuario,
          uid: doc.id
        }))
      )
    );
  }

  async crearTurno(turno: Omit<Turno, 'id'>): Promise<string> {
    const turnosRef = collection(this.firestore, 'turnos');
    const fechaFormateada = format(turno.fecha, 'dd/MM/yyyy');
    const horario = format(turno.fecha, 'HH:mm');
    
    const docRef = await addDoc(turnosRef, {
      ...turno,
      fecha: turno.fecha instanceof Date ? Timestamp.fromDate(turno.fecha) : turno.fecha,
      fechaFormatead: fechaFormateada,
      horario: horario,
      estado: 'pendiente'
    });
    return docRef.id;
  }

  getTurnosPaciente(pacienteId: string): Observable<Turno[]> {
    const turnosRef = collection(this.firestore, 'turnos');
    const q = query(turnosRef, where('pacienteId', '==', pacienteId));
    
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          ...doc.data() as Turno,
          id: doc.id,
          fecha: (doc.data() as any).fecha.toDate()
        }))
      )
    );}
  
    async actualizarEstadoTurno(turnoId: string, estado: Turno['estado'], comentario?: string): Promise<void> {
      const turnoRef = doc(this.firestore, `turnos/${turnoId}`);
      await updateDoc(turnoRef, {
        estado,
        comentario: comentario || ''
      });
    }

    async agregarEncuesta(turnoId: string, encuesta: any): Promise<void> {
      const turnoRef = doc(this.firestore, `turnos/${turnoId}`);
      await updateDoc(turnoRef, { encuesta });
    }

    getTurnosEspecialista(especialistaId: string): Observable<Turno[]> {
      const turnosRef = collection(this.firestore, 'turnos');
      const q = query(turnosRef, where('especialistaId', '==', especialistaId));
      
      return from(getDocs(q)).pipe(
        map(snapshot => 
          snapshot.docs.map(doc => ({
            ...doc.data() as Turno,
            id: doc.id,
            fecha: (doc.data() as any).fecha.toDate()
          }))
        )
      );
    }
  
    async agregarResena(turnoId: string, resena: string): Promise<void> {
      const turnoRef = doc(this.firestore, `turnos/${turnoId}`);
      await updateDoc(turnoRef, { 
        resena: resena 
      });
    }

    async agregarDevolucionnn(turnoId: string, devolucion: string): Promise<void> {
      const turnoRef = doc(this.firestore, `turnos/${turnoId}`);
      await updateDoc(turnoRef, { 
        devolucion: devolucion 
      });
    }
}