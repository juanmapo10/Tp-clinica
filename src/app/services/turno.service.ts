import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, query, where, doc, updateDoc, Timestamp, setDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Usuario } from './auth.service';

export interface Turno {
  id: string;
  pacienteId: string;
  especialistaId: string;
  especialista: string;
  especialidad: string;
  fecha: Date;
  estado: 'pendiente' | 'aceptado' | 'rechazado' | 'cancelado' | 'realizado';
  comentario?: string;
  calificacion?: string;
  encuesta?: any;
  resena?: string ;
  paciente? : string;
}

export interface Horario {
  especialistaId: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
}

export interface DisponibilidadHoraria {
  especialistaId: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
}

@Injectable({
  providedIn: 'root'
})
export class TurnoService {
  constructor(private firestore: Firestore) {}

  async crearTurno(turno: Omit<Turno, 'id'>): Promise<string> {
    const turnosRef = collection(this.firestore, 'turnos');
    const docRef = await addDoc(turnosRef, {
      ...turno,
      fecha: turno.fecha instanceof Date ? Timestamp.fromDate(turno.fecha) : turno.fecha,
      estado: 'pendiente'
    });
    return docRef.id;
  }

  async crearHorario(horario: Horario): Promise<void> {
    const horarioRef = doc(this.firestore, 'horarios', horario.especialistaId);
    await setDoc(horarioRef, horario);
  }

  async modificarHorario(horario: Horario): Promise<void> {
    const horarioRef = doc(this.firestore, 'horarios', horario.especialistaId);
    await updateDoc(horarioRef, {
      dia: horario.dia,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin
    });
  }

  async cancelarHorario(especialistaId: string): Promise<void> {
    const horarioRef = doc(this.firestore, 'horarios', especialistaId);
    await deleteDoc(horarioRef);
  }

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

  
  async agregarCalificacion(turnoId: string, calificacion: string): Promise<void> {
    const turnoRef = doc(this.firestore, `turnos/${turnoId}`);
    await updateDoc(turnoRef, { calificacion });
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
    await updateDoc(turnoRef, { resena });
  }


}