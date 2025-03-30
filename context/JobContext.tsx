import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JobEntry, WorkSession } from '../types/job';

interface JobContextType {
  jobs: JobEntry[];
  workSessions: WorkSession[];
  addJob: (job: Omit<JobEntry, 'id'>) => void;
  updateJob: (id: string, updates: Partial<Omit<JobEntry, 'id'>>) => void;
  updateWorkSession: (id: string, session: Partial<Omit<WorkSession, 'id'>>) => void;
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

const createPastDate = (daysAgo: number, hours: number, minutes: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const generateSampleData = () => ({
  jobs: [
    {
      id: '1',
      name: 'Website Development',
      description: 'Built landing page and contact form',
      startTime: createPastDate(2, 10, 30),
      endTime: createPastDate(2, 12, 45),
    },
    {
      id: '2',
      name: 'API Integration',
      description: 'Integrated payment gateway API',
      startTime: createPastDate(2, 14, 0),
      endTime: createPastDate(2, 17, 30),
    },
    {
      id: '3',
      name: 'Bug Fixes',
      description: 'Fixed responsive design issues',
      startTime: createPastDate(1, 9, 15),
      endTime: createPastDate(1, 11, 45),
    },
    {
      id: '4',
      name: 'Client Meeting',
      description: 'Project progress review',
      startTime: createPastDate(1, 13, 0),
      endTime: createPastDate(1, 14, 30),
    },
    {
      id: '5',
      name: 'Documentation',
      description: 'Updated API documentation',
      startTime: createPastDate(1, 15, 0),
      endTime: createPastDate(1, 17, 0),
    }
  ],
  workSessions: [
    {
      date: createPastDate(2, 0, 0).toISOString().split('T')[0],
      clockIn: createPastDate(2, 10, 0),
      clockOut: createPastDate(2, 18, 0),
    },
    {
      date: createPastDate(1, 0, 0).toISOString().split('T')[0],
      clockIn: createPastDate(1, 9, 0),
      clockOut: createPastDate(1, 17, 30),
    }
  ]
});

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Clear existing storage to force sample data
        await AsyncStorage.clear();

        const sampleData = generateSampleData();
        
        // Set jobs with sample data
        setJobs(sampleData.jobs);
        await AsyncStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(
          sampleData.jobs.map(j => ({
            ...j,
            startTime: j.startTime.toISOString(),
            endTime: j.endTime?.toISOString()
          }))
        ));

        // Set work sessions with sample data
        setWorkSessions(sampleData.workSessions);
        await AsyncStorage.setItem(WORK_SESSIONS_STORAGE_KEY, JSON.stringify(
          sampleData.workSessions.map(s => ({
            ...s,
            clockIn: s.clockIn.toISOString(),
            clockOut: s.clockOut?.toISOString()
          }))
        ));
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

  const updateJob = (id: string, updates: Partial<Omit<JobEntry, 'id'>>) => {
    setJobs(prev => {
      const updated = prev.map(job =>
        job.id === id ? { ...job, ...updates } : job
      );
      AsyncStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(updated.map(j => ({
        ...j,
        startTime: j.startTime.toISOString(),
        endTime: j.endTime ? j.endTime.toISOString() : null
      }))));
      return updated;
    });
  };

  const updateWorkSession = (id: string, session: Partial<Omit<WorkSession, 'id'>>) => {
    setWorkSessions(prev => {
      const updated = prev.map(ws =>
        ws.date === id ? {
          ...ws, 
          ...session,
          clockIn: session.clockIn instanceof Date ? session.clockIn : new Date(session.clockIn || ws.clockIn),
          clockOut: session.clockOut instanceof Date ? session.clockOut : 
                   session.clockOut ? new Date(session.clockOut) : null
        } : ws
      );
      AsyncStorage.setItem(WORK_SESSIONS_STORAGE_KEY, JSON.stringify(updated.map(s => ({
        ...s,
        clockIn: s.clockIn.toISOString(),
        clockOut: s.clockOut ? s.clockOut.toISOString() : null
      }))));
      return updated;
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
      updateJob,
      updateWorkSession,
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