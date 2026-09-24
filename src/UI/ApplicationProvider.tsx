import React, { createContext, useContext, type ReactNode } from 'react';
import type { Authentication } from '../domain/Authentication';
import type { Clock } from '../domain/Clock';
import type { IdGenerator } from '../domain/IdGenerator';
import type { PreferencesRepository } from '../domain/PreferencesRepository';
import type { TrainingRepository } from '../domain/TrainingRepository';
import type { WorkoutDraftRepository } from '../domain/WorkoutDraftRepository';

export interface ApplicationServices {
  readonly authentication: Authentication;
  readonly preferences: PreferencesRepository;
  readonly workoutDrafts: WorkoutDraftRepository;
  readonly trainingRepository: (profileId: string, cloudUid: string | null) => TrainingRepository;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

const ApplicationContext = createContext<ApplicationServices | null>(null);

interface ApplicationProviderProps {
  services: ApplicationServices;
  children: ReactNode;
}

export function ApplicationProvider({ services, children }: ApplicationProviderProps) {
  return <ApplicationContext.Provider value={services}>{children}</ApplicationContext.Provider>;
}

export function useApplicationServices(): ApplicationServices {
  const services = useContext(ApplicationContext);
  if (!services) throw new Error('ApplicationProvider is missing');
  return services;
}

export function useOptionalApplicationServices(): ApplicationServices | null {
  return useContext(ApplicationContext);
}

const fallbackIds: IdGenerator = {
  generate: (prefix) => `${prefix}_${crypto.randomUUID()}`,
};

export function useIdGenerator(): IdGenerator {
  return useOptionalApplicationServices()?.ids ?? fallbackIds;
}
