import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JobEntry, WorkSession } from '../types/job';

interface JobContextType {
  jobs: JobEntry[];
  workSessions: WorkSession[];
  addJob: (job: Omit<JobEntry, 'id'>) => void;
  endJob: (id: string) => void;
  getActiveJobs: () => JobEntry[];
  getCompletedJobs: () => JobEntry[];
  clockIn: () => void;
  clockOut: () => void;
  getCurrentWorkSession: () => WorkSession | null;
  getWorkSessionForDate: (date: string) => WorkSession | null;
  clearHistory: () => void;
}

const JOBS_STORAGE_KEY = '@job_tracker_jobs';
const WORK_SESSIONS_STORAGE_KEY = '@job_tracker_work_sessions';
const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedJobs = await AsyncStorage.getItem(JOBS_STORAGE_KEY);
        const storedSessions = await AsyncStorage.getItem(WORK_SESSIONS_STORAGE_KEY);

        if (storedJobs) {
          const parsedJobs = JSON.parse(storedJobs);
          setJobs(parsedJobs.map((job: any) => ({
            ...job,
            startTime: new Date(job.startTime),
            endTime: job.endTime ? new Date(job.endTime) : null,
          })));
        }

        if (storedSessions) {
          const parsedSessions = JSON.parse(storedSessions);
          setWorkSessions(parsedSessions.map((session: any) => ({
            ...session,
            clockIn: new Date(session.clockIn),
            clockOut: session.clockOut ? new Date(session.clockOut) : null,
          })));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const addJob = (job: Omit<JobEntry, 'id'>) => {
    const newJob: JobEntry = {
      ...job,
      id: Date.now().toString(),
      startTime: new Date(),
      endTime: null
    };
    
    setJobs(prevJobs => {
      const updatedJobs = [...prevJobs, newJob];
      // Save to AsyncStorage
      AsyncStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updatedJobs.map(j => ({
        ...j,
        startTime: j.startTime.toISOString(),
        endTime: j.endTime ? j.endTime.toISOString() : null
      }))));
      return updatedJobs;
    });
  };

  const clockIn = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    setWorkSessions(prev => {
      const newSession = {
        date: today,
        clockIn: now,
        clockOut: null
      };
      const updated = [...prev.filter(s => s.date !== today), newSession];
      AsyncStorage.setItem(WORK_SESSIONS_STORAGE_KEY, JSON.stringify(updated.map(s => ({
        ...s,
        clockIn: s.clockIn.toISOString(),
        clockOut: s.clockOut ? s.clockOut.toISOString() : null
      }))));
      return updated;
    });
  };

  const clockOut = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    setWorkSessions(prev => {
      const updated = prev.map(session =>
        session.date === today ? { ...session, clockOut: now } : session
      );
      AsyncStorage.setItem(WORK_SESSIONS_STORAGE_KEY, JSON.stringify(updated.map(s => ({
        ...s,
        clockIn: s.clockIn.toISOString(),
        clockOut: s.clockOut ? s.clockOut.toISOString() : null
      }))));
      return updated;
    });
  };

  const getCurrentWorkSession = () => {
    const today = new Date().toISOString().split('T')[0];
    return workSessions.find(session => session.date === today) || null;
  };

  const getActiveJobs = () => jobs.filter(job => !job.endTime);
  
  const getCompletedJobs = () => (
    jobs.filter(job => job.endTime)
        .sort((a, b) => (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0))
  );

  const endJob = (id: string) => {
    setJobs(prev => {
      const updated = prev.map(job =>
        job.id === id ? { ...job, endTime: new Date() } : job
      );
      AsyncStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updated.map(j => ({
        ...j,
        startTime: j.startTime.toISOString(),
        endTime: j.endTime ? j.endTime.toISOString() : null
      }))));
      return updated;
    });
  };

  const getWorkSessionForDate = (date: string) => (
    workSessions.find(session => session.date === date) || null
  );

  const clearHistory = () => {
    const activeJobs = jobs.filter(job => !job.endTime);
    setJobs(activeJobs);
    setWorkSessions([]);
    AsyncStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(activeJobs));
    AsyncStorage.setItem(WORK_SESSIONS_STORAGE_KEY, JSON.stringify([]));
  };

  return (
    <JobContext.Provider value={{
      jobs,
      workSessions,
      addJob,
      endJob,
      getActiveJobs,
      getCompletedJobs,
      clockIn,
      clockOut,
      getCurrentWorkSession,
      getWorkSessionForDate,
      clearHistory
    }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
}