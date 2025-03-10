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
        const [storedJobs, storedSessions] = await Promise.all([
          AsyncStorage.getItem(JOBS_STORAGE_KEY),
          AsyncStorage.getItem(WORK_SESSIONS_STORAGE_KEY)
        ]);

        if (storedJobs) {
          const parsedJobs = JSON.parse(storedJobs);
          const jobsWithDates = parsedJobs.map((job: any) => ({
            ...job,
            startTime: new Date(job.startTime),
            endTime: job.endTime ? new Date(job.endTime) : null,
          }));
          setJobs(jobsWithDates);
        }

        if (storedSessions) {
          const parsedSessions = JSON.parse(storedSessions);
          const sessionsWithDates = parsedSessions.map((session: any) => ({
            ...session,
            clockIn: new Date(session.clockIn),
            clockOut: session.clockOut ? new Date(session.clockOut) : null,
          }));
          setWorkSessions(sessionsWithDates);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  // Save jobs to storage whenever they change
  useEffect(() => {
    const saveJobs = async () => {
      try {
        await AsyncStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
      } catch (error) {
        console.error('Error saving jobs:', error);
      }
    };
    saveJobs();
  }, [jobs]);

  // Save work sessions to storage whenever they change
  useEffect(() => {
    const saveSessions = async () => {
      try {
        await AsyncStorage.setItem(WORK_SESSIONS_STORAGE_KEY, JSON.stringify(workSessions));
      } catch (error) {
        console.error('Error saving work sessions:', error);
      }
    };
    saveSessions();
  }, [workSessions]);

  const addJob = (job: Omit<JobEntry, 'id'>) => {
    const newJob: JobEntry = {
      ...job,
      id: Date.now().toString(),
    };
    setJobs(prev => [...prev, newJob]);
  };

  const endJob = (id: string) => {
    setJobs(prev =>
      prev.map(job =>
        job.id === id ? { ...job, endTime: new Date() } : job
      )
    );
  };

  const clockIn = () => {
    const today = new Date().toISOString().split('T')[0];
    const existingSession = workSessions.find(session => session.date === today);
    
    if (!existingSession || existingSession.clockOut) {
      // Either no session exists or the previous session was completed
      setWorkSessions(prev => [
        ...prev.filter(session => session.date !== today), // Remove any existing session for today
        {
          date: today,
          clockIn: new Date(),
          clockOut: null
        }
      ]);
    }
  };

  const clockOut = () => {
    const today = new Date().toISOString().split('T')[0];
    setWorkSessions(prev =>
      prev.map(session =>
        session.date === today ? { ...session, clockOut: new Date() } : session
      )
    );
  };

  const getCurrentWorkSession = () => {
    const today = new Date().toISOString().split('T')[0];
    return workSessions.find(session => session.date === today) || null;
  };

  const getWorkSessionForDate = (date: string) => {
    return workSessions.find(session => session.date === date) || null;
  };

  const getActiveJobs = () => jobs.filter(job => !job.endTime);
  const getCompletedJobs = () => jobs.filter(job => job.endTime).sort((a, b) => 
    (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0)
  );

  const clearHistory = () => {
    const activeJobs = jobs.filter(job => !job.endTime);
    setJobs(activeJobs);
    setWorkSessions([]);
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