export interface JobEntry {
    id: string;
    name: string;
    description: string;
    startTime: Date;
    endTime: Date | null;
}

export interface WorkSession {
  id: string;
  date: string;
  clockIn: Date;
  clockOut: Date | null;
}

export interface WorkSessionModalState {
  showSessionEditModal: boolean;
  editingSession: WorkSession | null;
  editInTime: string;
  editOutTime: string;
}