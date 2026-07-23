import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { InsightDetailScreen } from './InsightDetailScreen';
import { Exercise } from '../types';

vi.mock('../hooks/useAppData', () => ({
  useAppData: () => ({
    exercises: mockExercises,
    muscleGroups: [],
    routines: [],
    isLoading: false,
    refresh: vi.fn(),
  }),
  AppDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../utils/translations', async () => {
  const actual = await vi.importActual<typeof import('../utils/translations')>('../utils/translations');
  return {
    ...actual,
    useTranslations: () => actual.t,
    getTranslatedGroupName: (group: string) => group,
  };
});

const mockExercises: Exercise[] = [
  {
    id: 'ex1',
    name: 'Bench Press',
    muscleGroup: 'Pecho',
    logs: [
      { date: '2026-01-01', weight: 80, reps: 8 },
      { date: '2026-01-05', weight: 85, reps: 8 },
      { date: '2026-01-10', weight: 82, reps: 8 },
    ],
  },
];

const renderWithRoute = (initialEntry: string) => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/insights/:id" element={<InsightDetailScreen />} />
    </Routes>
  </MemoryRouter>
);

describe('InsightDetailScreen', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders exercise name and latest log', () => {
    renderWithRoute('/insights/ex1');

    expect(screen.getByText('Bench Press')).toBeTruthy();
    expect(screen.getAllByText('82 kg')).toHaveLength(2);
  });

  it('renders regression card when performance dropped', () => {
    renderWithRoute('/insights/ex1');

    expect(screen.getByText('Performance drops')).toBeTruthy();
    expect(screen.getAllByText(/85 kg →/)).toHaveLength(1);
    expect(screen.getAllByText(/82 kg/)).toHaveLength(2);
  });

  it('renders weight trend chart when there are multiple logs', () => {
    renderWithRoute('/insights/ex1');

    expect(screen.getByText('Weight trend')).toBeTruthy();
    expect(document.querySelector('svg')).toBeTruthy();
  });
});
