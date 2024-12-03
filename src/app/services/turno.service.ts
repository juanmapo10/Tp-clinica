import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, query, where, doc, updateDoc, Timestamp, setDoc, deleteDoc, getDoc } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Usuario } from './auth.service';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

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

export interface HistoriaClinica {
  uid: string;
  turnoId: string;
  fechaTurno?: Date;
  horarioTurno?: string;
  nombreEspecialista?: string;
  datosGenerales: {
    altura: number;
    peso: number;
    temperatura: number;
    presion: string;
  };
  datosDinamicos: Array<{
    clave: string;
    valor: string;
  }>;
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

    getPacientes(): Observable<Usuario[]> {
      const usuariosRef = collection(this.firestore, 'usuarios');
      const q = query(
        usuariosRef, 
        where('tipo', '==', 'paciente')
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

    getAllTurnos(): Observable<Turno[]> {
      const turnosRef = collection(this.firestore, 'turnos');
      
      return from(getDocs(turnosRef)).pipe(
        map(snapshot => 
          snapshot.docs.map(doc => ({
            ...doc.data() as Turno,
            id: doc.id,
            fecha: (doc.data() as any).fecha.toDate()
          }))
        )
      );
    }
    async crearTurnoAdmin(turno: Omit<Turno, 'id'>, pacienteSeleccionado: Usuario): Promise<string> {
      const turnosRef = collection(this.firestore, 'turnos');
      const fechaFormateada = format(turno.fecha, 'dd/MM/yyyy');
      const horario = format(turno.fecha, 'HH:mm');
      
      const docRef = await addDoc(turnosRef, {
        ...turno,
        pacienteId: pacienteSeleccionado.uid,
        paciente: pacienteSeleccionado.email,
        fecha: turno.fecha instanceof Date ? Timestamp.fromDate(turno.fecha) : turno.fecha,
        fechaFormatead: fechaFormateada,
        horario: horario,
        estado: 'pendiente'
      });
      return docRef.id;
    }
 
    
    async agregarHistoriaClinica(historiaClinica: HistoriaClinica): Promise<void> {
      const historiaClinicaRef = collection(this.firestore, 'historiaclinica');
      const turnoRef = doc(this.firestore, `turnos/${historiaClinica.turnoId}`);
      const turnoSnapshot = await getDoc(turnoRef);
      const turnoData = turnoSnapshot.data() as Turno;
      await addDoc(historiaClinicaRef, {
        ...historiaClinica,
        pacienteId: turnoData.pacienteId,
        fechaTurno: turnoData.fecha,
        horarioTurno: turnoData.horario,
        nombreEspecialista: turnoData.especialista
      });
    }
    
    async verificarHistoriaClinicaCargada(turnoId: string): Promise<boolean> {
      try {
        const historiaClinicaRef = collection(this.firestore, 'historiaclinica');
        const q = query(historiaClinicaRef, where('turnoId', '==', turnoId));
        
        const snapshot = await getDocs(q);
        console.log('Snapshot de historia clinica:', snapshot.docs.length);
        
        return snapshot.docs.length > 0;
      } catch (error) {
        console.error('Error al verificar historia clinica:', error);
        return false;
      }
    }

    getHistoriasClinicasPorEspecialista(especialistaId: string): Observable<HistoriaClinica[]> {
      const historiaClinicaRef = collection(this.firestore, 'historiaclinica');
      const q = query(historiaClinicaRef, where('uid', '==', especialistaId));
      
      return from(getDocs(q)).pipe(
        map(snapshot => 
          snapshot.docs.map(doc => ({
            ...(doc.data() as HistoriaClinica),
            documentId: doc.id
          }))
        )
      );
    }

    
    
    getAllHistoriasClinicas(): Observable<HistoriaClinica[]> {
      const historiaClinicaRef = collection(this.firestore, 'historiaclinica');
      
      return from(getDocs(historiaClinicaRef)).pipe(
        map(snapshot => 
          snapshot.docs.map(doc => ({
            ...(doc.data() as HistoriaClinica),
            documentId: doc.id
          }))
        )
      );
    }
    

    getHistoriasClinicasPaciente(pacienteId: string): Observable<HistoriaClinica[]> {
      const historiaClinicaRef = collection(this.firestore, 'historiaclinica');
      const q = query(historiaClinicaRef, where('pacienteId', '==', pacienteId));
      
      return from(getDocs(q)).pipe(
        map(snapshot => 
          snapshot.docs.map(doc => ({
            ...(doc.data() as HistoriaClinica),
            documentId: doc.id,
            fechaTurno: (doc.data() as any).fechaTurno?.toDate()
          }))
        )
      );
    }

    async descargarHistoriasClinicasPorEspecialista(especialistaId: string): Promise<void> {
      try {
        const historiaClinicaRef = collection(this.firestore, 'historiaclinica');
        const q = query(historiaClinicaRef, where('uid', '==', especialistaId));
        const snapshot = await getDocs(q);
        const historias = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            ...(doc.data() as HistoriaClinica),
            documentId: doc.id,
            fechaTurno: data.fechaTurno?.toDate ? data.fechaTurno.toDate() : data.fechaTurno
          };
        });
    
        const doc = new jsPDF();
        const faviconBase64 = 'favicon.ico'; 
        doc.addImage(faviconBase64, 'PNG', 10, 10, 20, 20);
        doc.setFontSize(18);
        doc.text('Historias Clínicas por Especialista', 40, 22);
        doc.setFontSize(10);
        doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-AR')}`, 14, 35);
    
        const tableData = historias.map(historia => [
          historia.fechaTurno ? new Date(historia.fechaTurno).toLocaleDateString() : 'N/A',
          historia.nombreEspecialista || 'N/A',
          `${historia.datosGenerales.altura} cm`,
          `${historia.datosGenerales.peso} kg`,
          `${historia.datosGenerales.temperatura}°C`,
          historia.datosGenerales.presion
        ]);
    
        (doc as any).autoTable({
          startY: 45, 
          head: [['Fecha', 'Especialista', 'Altura', 'Peso', 'Temperatura', 'Presión']],
          body: tableData,
          theme: 'striped'
        });
    
        doc.save(`Historias_Clinicas_Especialista_${especialistaId}.pdf`);
      } catch (error) {
        console.error('Error al descargar historias clínicas:', error);
        throw error;
      }
    }
    

    exportTurnosToExcel(turnos: Turno[], filename: string = 'turnos') {
      const exportData = turnos.map(turno => ({
        'ID': turno.id,
        'Paciente': turno.paciente || 'N/A',
        'Especialista': turno.especialista,
        'Especialidad': turno.especialidad,
        'Fecha': turno.fechaFormateada || (turno.fecha ? this.formatDate(turno.fecha) : 'N/A'),
        'Horario': turno.horario || 'N/A',
        'Estado': turno.estado,
        'Comentario': turno.comentario || 'N/A',
        'Calificación': turno.calificacion || 'N/A'
      }));
  
      const worksheet = XLSX.utils.json_to_sheet(exportData);
  

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Turnos');
      XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    private formatDate(date: Date): string {
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }

    async getTurnosPorEspecialidad(): Promise<{ especialidad: string, cantidad: number }[]> {
      const turnos = await this.getAllTurnos().toPromise() || [];
      const especialidadCounts = turnos.reduce((acc, turno) => {
        if (turno.especialidad) {
          acc[turno.especialidad] = (acc[turno.especialidad] || 0) + 1;
        }
        return acc;
      }, {} as { [key: string]: number });
    
      return Object.entries(especialidadCounts).map(([especialidad, cantidad]) => ({
        especialidad,
        cantidad
      }));
    }
    
    async getTurnosPorDia(): Promise<{ fecha: Date, cantidad: number }[]> {
      const turnos = await this.getAllTurnos().toPromise() || [];
      const fechaCounts = turnos.reduce((acc, turno) => {
        if (turno.fecha) {
          const fechaKey = turno.fecha.toDateString();
          acc[fechaKey] = (acc[fechaKey] || 0) + 1;
        }
        return acc;
      }, {} as { [key: string]: number });
    
      return Object.entries(fechaCounts).map(([fechaStr, cantidad]) => ({
        fecha: new Date(fechaStr),
        cantidad
      }));
    }
    
    async getTurnosPorMedico(especialistaId: string, desde: Date, hasta: Date): Promise<number> {
      const turnos = await this.getAllTurnos().toPromise() || [];
      return turnos.filter(turno => 
        turno.especialistaId === especialistaId && 
        turno.fecha && 
        turno.fecha >= desde && 
        turno.fecha <= hasta
      ).length;
    }
    
    async getTurnosSolicitadosPorMedico(especialistaId: string, desde: Date, hasta: Date): Promise<Turno[]> {
      const turnos = await this.getAllTurnos().toPromise() || [];
      return turnos.filter(turno => 
        turno.especialistaId === especialistaId && 
        turno.fecha && 
        turno.fecha >= desde && 
        turno.fecha <= hasta &&
        turno.estado === 'pendiente'
      );
    }
    
    async getTurnosFinalizadosPorMedico(especialistaId: string, desde: Date, hasta: Date): Promise<Turno[]> {
      const turnos = await this.getAllTurnos().toPromise() || [];
      return turnos.filter(turno => 
        turno.especialistaId === especialistaId && 
        turno.fecha && 
        turno.fecha >= desde && 
        turno.fecha <= hasta &&
        turno.estado === 'realizado'
      );
    }
}