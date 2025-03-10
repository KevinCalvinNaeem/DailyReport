export interface JobEntry {
    id: string;
    name: string;
    description: string;
    startTime: Date;
    endTime: Date | null;
}

export interface WorkSession {
    date: string; // ISO date string (YYYY-MM-DD)
    clockIn: Date;
    clockOut: Date | null;
}