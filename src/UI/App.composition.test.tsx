import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApplicationServices } from './ApplicationProvider';
import { ApplicationProvider } from './ApplicationProvider';
import App from './App';
import type { TrainingRepository, TrainingSnapshot } from '../domain/TrainingRepository';

const emptySnapshot: TrainingSnapshot = {
  exercises: [],
  routines: [],
  muscleGroups: [],
  workouts: [],
};

class MemoryTrainingRepository implements TrainingRepository {
  getSnapshot(): TrainingSnapshot { return emptySnapshot; }
  subscribe(onData: (snapshot: TrainingSnapshot) => void): () => void {
    onData(emptySnapshot);
    return () => undefined;
  }
  async saveExercise(): Promise<void> {}
  async deleteExercise(): Promise<void> {}
  async saveRoutine(): Promise<void> {}
  async deleteRoutine(): Promise<void> {}
  async saveMuscleGroups(): Promise<void> {}
  async saveWorkout(): Promise<void> {}
  async deleteWorkout(): Promise<void> {}
  async resetData(): Promise<void> {}
}

const services: ApplicationServices = {
  authentication: {
    signInWithGoogle: async () => ({ user: null, isNewUser: false }),
    signOut: async () => undefined,
    subscribe: (listener) => {
      listener(null, null);
      return () => undefined;
    },
  },
  preferences: {
    getPrefs: () => ({ onboardingDone: true, language: 'en', defaultScreen: null, authMode: null, lastUid: null }),
    savePrefs: vi.fn(),
    getLanguage: () => 'en',
    setLanguage: vi.fn(),
    getDefaultScreen: () => null,
    setDefaultScreen: vi.fn(),
    isOnboardingDone: () => true,
    markOnboardingDone: vi.fn(),
    getLastUid: () => null,
    setLastUid: vi.fn(),
    getLocalProfileId: () => 'local_composition',
    subscribe: () => () => undefined,
  },
  workoutDrafts: {
    load: () => ({
      id: 'draft_1',
      name: 'Push day',
      startedAt: '2026-09-24T10:00:00.000Z',
      exercises: [],
    }),
    save: vi.fn(),
  },
  trainingRepository: () => new MemoryTrainingRepository(),
  ids: { generate: (prefix) => `${prefix}_id` },
  clock: { now: () => '2026-09-24T10:00:00.000Z', today: () => '2026-09-24' },
};

describe('App provider composition', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the app and restores a workout draft with the real session provider', async () => {
    vi.stubGlobal('scrollTo', vi.fn());
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ApplicationProvider services={services}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ApplicationProvider>
    );

    expect(await screen.findByRole('button', { name: /Resume workout/i })).toBeTruthy();
    expect(screen.getByText('Push day')).toBeTruthy();
  });
});
