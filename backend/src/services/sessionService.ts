import { v4 as uuidv4 } from 'uuid';
import { DiagnosisSession, DiagnosisStage, DiagnosisTask, Message, VehicleInfo, RepairGuide } from '../types';

export class SessionService {
  private sessions: Map<string, DiagnosisSession> = new Map();

  createSession(): DiagnosisSession {
    const session: DiagnosisSession = {
      id: uuidv4(),
      currentStage: 'perception',
      symptoms: [],
      tasks: [],
      confirmedFaults: [],
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): DiagnosisSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<DiagnosisSession>): DiagnosisSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    Object.assign(session, updates, { updatedAt: new Date() });
    this.sessions.set(sessionId, session);
    return session;
  }

  addMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.updatedAt = new Date();
    }
  }

  setStage(sessionId: string, stage: DiagnosisStage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.currentStage = stage;
      session.updatedAt = new Date();
    }
  }

  setVehicleInfo(sessionId: string, vehicleInfo: VehicleInfo): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.vehicleInfo = vehicleInfo;
      session.updatedAt = new Date();
    }
  }

  addSymptom(sessionId: string, symptom: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.symptoms.push(symptom);
      session.updatedAt = new Date();
    }
  }

  setTasks(sessionId: string, tasks: DiagnosisTask[]): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.tasks = tasks;
      session.updatedAt = new Date();
    }
  }

  updateTask(sessionId: string, taskId: string, updates: Partial<DiagnosisTask>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const task = session.tasks.find(t => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
        session.updatedAt = new Date();
      }
    }
  }

  addConfirmedFault(sessionId: string, fault: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.confirmedFaults.push(fault);
      session.updatedAt = new Date();
    }
  }

  setRepairGuide(sessionId: string, guide: RepairGuide): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.repairGuide = guide;
      session.updatedAt = new Date();
    }
  }

  getAllSessions(): DiagnosisSession[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}
