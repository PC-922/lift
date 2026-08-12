import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useParams, useSearchParams, Navigate, useLocation } from 'react-router-dom';
import { Exercise, ExerciseLog } from './types';
import { ExerciseList } from './components/ExerciseList';
import { ExerciseDetail } from './components/ExerciseDetail';
import { ExerciseFormScreen } from './components/ExerciseFormScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { RoutinesScreen } from './components/RoutinesScreen';
import { WorkoutScreen } from './components/WorkoutScreen';
import { MuscleGroupsScreen } from './components/MuscleGroupsScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { BottomNav } from './components/BottomNav';
import ConfirmModal from './components/ConfirmModal';
import { Modal } from './components/Modal';
import { ToastProvider } from './hooks/useToast';
import { RestTimerProvider } from './hooks/useRestTimer';
import { WorkoutSessionProvider, useWorkoutSession } from './hooks/useWorkoutSession';
import { SyncIndicator } from './components/SyncIndicator';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppDataProvider, useAppData } from './hooks/useAppData';
import { useTranslations } from './utils/translations';
import { createSharedRoutine, serializeSharedRoutine } from './services/routineShareService';
import { Download, Dumbbell, MoreVertical, Plus, PlusSquare, Share } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Surface } from './components/ui/Surface';
import { Badge } from './components/ui/Badge';
import { cn } from './utils/cn';
import { usePortraitOrientation } from './hooks/usePortraitOrientation';

const HomeScreen: React.FC = () => {
  const t = useTranslations();
  const { exercises, muscleGroups, deleteExercise } = useAppData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const activeGroup = searchParams.get('group') ?? '';

  const setSearch = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set('search', value);
    } else {
      next.delete('search');
    }
    setSearchParams(next, { replace: true });
  };

  const setActiveGroup = (group: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (group) {
      next.set('group', group);
    } else {
      next.delete('group');
    }
    setSearchParams(next, { replace: true });
  };

  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <Button
          onClick={() => navigate('/exercises/new')}
          size="lg"
          className="w-full"
        >
          <Plus size={24} strokeWidth={3} />
          {t.labels.newExercise}
        </Button>

        <Button
          onClick={() => navigate('/exercises/groups')}
          variant="secondary"
          size="md"
          className="w-full border-2 border-dashed rounded-2xl border-app-border/50 text-app-text-muted"
        >
          <Plus size={18} />
          {t.actions.addGroup}
        </Button>
      </div>

      <ExerciseList
        exercises={exercises}
        muscleGroups={muscleGroups}
        search={search}
        activeGroup={activeGroup || null}
        onSearchChange={setSearch}
        onActiveGroupChange={setActiveGroup}
        onSelectExercise={(exercise) => navigate(`/exercises/${exercise.id}`)}
        onEdit={(exercise) => navigate(`/exercises/${exercise.id}/edit`)}
        onDelete={setDeletingExercise}
      />

      {deletingExercise && (
        <ConfirmModal
          title={t.prompts.deleteExercise.replace('{name}', deletingExercise.name)}
          confirmLabel={t.actions.delete}
          destructive
          onConfirm={async () => {
            await deleteExercise(deletingExercise.id);
            setDeletingExercise(null);
          }}
          onCancel={() => setDeletingExercise(null)}
        />
      )}
    </div>
  );
};

const ExerciseDetailRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { exercises, muscleGroups, logSession, updateExerciseNote, updateExerciseLog, deleteExerciseLog, deleteAllLogs, deleteAllLogsExceptLatest, updateExerciseDetails, deleteExercise } = useAppData();
  const navigate = useNavigate();
  const exercise = id ? (exercises.find((e) => e.id === id) ?? null) : null;

  if (!exercise) {
    return <Navigate to="/" replace />;
  }

  return (
    <ExerciseDetail
      exercise={exercise}
      muscleGroups={muscleGroups}
      onBack={() => navigate(-1)}
      onLog={async (weight, reps) => {
        await logSession(exercise.id, weight, reps);
      }}
      onUpdateNote={async (note) => {
        await updateExerciseNote(exercise.id, note);
      }}
      onUpdateLog={async (originalDate, log) => {
        await updateExerciseLog(exercise.id, originalDate, log);
      }}
      onDeleteLog={async (date) => {
        await deleteExerciseLog(exercise.id, date);
      }}
      onDeleteAllLogs={async () => {
        await deleteAllLogs(exercise.id);
      }}
      onDeleteAllLogsExceptLatest={async () => {
        await deleteAllLogsExceptLatest(exercise.id);
      }}
      onRename={async (name) => {
        await updateExerciseDetails(exercise.id, name, exercise.muscleGroup);
      }}
      onChangeGroup={async (group) => {
        await updateExerciseDetails(exercise.id, exercise.name, group);
      }}
      onDelete={async () => {
        await deleteExercise(exercise.id);
        navigate('/', { replace: true });
      }}
    />
  );
};

const InsightsRoute: React.FC = () => {
  const { exercises } = useAppData();
  const navigate = useNavigate();
  return (
    <InsightsScreen
      exercises={exercises}
      onSelectExercise={(id) => navigate(`/exercises/${id}`)}
    />
  );
};

const RoutinesRoute: React.FC = () => {
  const { exercises, muscleGroups, routines, saveRoutine, deleteRoutine, logSession, reorderRoutine, reorderRoutineExercise, updateExerciseNote, updateExerciseLog, deleteExerciseLog, deleteAllLogs, deleteAllLogsExceptLatest, deleteExercise, importRoutine } = useAppData();
  const { startWorkout } = useWorkoutSession();
  const navigate = useNavigate();
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);

  const handleShareRoutine = (routine: import('./types').Routine) => {
    const shared = createSharedRoutine(routine, exercises);
    const blob = new Blob([serializeSharedRoutine(shared)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routine.name.replace(/\s+/g, '_')}_routine.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportRoutine = async (file: File): Promise<boolean> => {
    const content = await file.text();
    return importRoutine(content);
  };

  const handleStartWorkout = (routine: import('./types').Routine, dayId: string) => {
    const day = routine.days.find((d) => d.id === dayId);
    if (!day) return;
    startWorkout({
      name: `${routine.name} · ${day.name}`,
      routineId: routine.id,
      dayId: day.id,
      exercises: day.exercises.map((re) => ({
        exerciseId: re.exerciseId,
        target: { sets: re.sets, reps: re.reps, restSeconds: re.restSeconds },
      })),
    });
    navigate('/workout');
  };

  return (
    <RoutinesScreen
      routines={routines}
      exercises={exercises}
      muscleGroups={muscleGroups}
      activeRoutineId={activeRoutineId}
      onActiveRoutineChange={setActiveRoutineId}
      onSaveRoutine={async (routine) => {
        await saveRoutine(routine);
      }}
      onStartWorkout={handleStartWorkout}
      onDeleteRoutine={async (id) => {
        await deleteRoutine(id);
      }}
      onLogExercise={async (id, weight, reps) => {
        await logSession(id, weight, reps);
      }}
      onReorderRoutine={async (from, to) => {
        await reorderRoutine(from, to);
      }}
      onReorderRoutineExercise={async (routineId, dayId, from, to) => {
        await reorderRoutineExercise(routineId, dayId, from, to);
      }}
      onUpdateNote={async (id, note) => {
        await updateExerciseNote(id, note);
      }}
      onUpdateLog={async (exerciseId, originalDate, log) => {
        await updateExerciseLog(exerciseId, originalDate, log);
      }}
      onDeleteLog={async (exerciseId, date) => {
        await deleteExerciseLog(exerciseId, date);
      }}
      onDeleteAllLogs={async (exerciseId) => {
        await deleteAllLogs(exerciseId);
      }}
      onDeleteAllLogsExceptLatest={async (exerciseId) => {
        await deleteAllLogsExceptLatest(exerciseId);
      }}
      onDeleteExercise={async (id) => {
        await deleteExercise(id);
      }}
      onNavigateToExercise={(id) => navigate(`/exercises/${id}`)}
      onShareRoutine={handleShareRoutine}
      onImportRoutine={handleImportRoutine}
      resetSignal={0}
    />
  );
};

const SettingsRoute: React.FC = () => {
  const { exportData, importData, resetData } = useAppData();

  return (
    <SettingsScreen
      onExport={async () => {
        const data = await exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gym_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }}
      onImport={async (content) => {
        return importData(content);
      }}
      onResetData={async () => {
        await resetData();
      }}
    />
  );
};

const AppLayout: React.FC = () => {
  const t = useTranslations();
  const location = useLocation();
  const { isLoading } = useAppData();

  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneQuery = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(isStandaloneQuery || isIosStandalone);
    };
    checkStandalone();
    window.addEventListener('resize', checkStandalone);
    return () => window.removeEventListener('resize', checkStandalone);
  }, []);

  const showHeader = !location.pathname.startsWith('/exercises/');
  const appHeaderClassName = 'px-4 pt-6 pb-4';
  const appHeaderTitleClassName = 'text-xl font-black tracking-[0.22em] text-app-text';

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <RestTimerProvider>
      <WorkoutSessionProvider>
      <div className="min-h-screen pb-24 sm:mx-auto sm:max-w-md">
          {showHeader && (
            <header className={cn('sticky top-0 z-20 bg-app-bg', appHeaderClassName)}>
              <div className="relative flex min-h-9 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {location.pathname === '/' && <SyncIndicator />}
                </div>
                <h1 className={cn(appHeaderTitleClassName, 'absolute left-1/2 -translate-x-1/2')}>{t.appTitle}</h1>
                <div className="flex min-w-0 justify-end">
                  {!isStandalone && (
                    <Button
                      onClick={() => setIsInstallModalOpen(true)}
                      size="sm"
                      className="gap-1"
                    >
                      <Download size={14} />
                      {t.actions.install}
                    </Button>
                  )}
                </div>
              </div>
            </header>
          )}

          <main className="animate-slideUp px-4 pb-48 pt-4">
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/exercises/new" element={<ExerciseFormScreen />} />
              <Route path="/exercises/:id/edit" element={<ExerciseFormScreen />} />
              <Route path="/exercises/:id" element={<ExerciseDetailRoute />} />
              <Route path="/exercises/groups" element={<MuscleGroupsScreen />} />
              <Route path="/insights" element={<InsightsRoute />} />
              <Route path="/workout" element={<WorkoutScreen />} />
              <Route path="/routines" element={<RoutinesRoute />} />
              <Route path="/settings" element={<SettingsRoute />} />
              <Route path="/settings/muscle-groups" element={<Navigate to="/exercises/groups" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <BottomNav />

          <Modal open={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} position="center">
            <div className="p-6">
              <h2 className="mb-6 text-center text-xl font-bold text-app-text">{t.labels.installGuide}</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-app-text-muted">{t.labels.installIosSafari}</h3>
                  <Surface className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="accent" className="rounded-lg px-2 py-2"><Share size={20} /></Badge>
                      <span className="text-sm text-app-text">{t.labels.stepShare}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="neutral" className="rounded-lg px-2 py-2"><PlusSquare size={20} /></Badge>
                      <span className="text-sm text-app-text">{t.labels.stepAdd}</span>
                    </div>
                  </Surface>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-app-text-muted">{t.labels.installAndroid}</h3>
                  <Surface className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="neutral" className="rounded-lg px-2 py-2"><MoreVertical size={20} /></Badge>
                      <span className="text-sm text-app-text">{t.labels.stepMenu}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="accent" className="rounded-lg px-2 py-2"><Download size={20} /></Badge>
                      <span className="text-sm text-app-text">{t.labels.stepInstall}</span>
                    </div>
                  </Surface>
                </div>
              </div>
              <Button
                onClick={() => setIsInstallModalOpen(false)}
                variant="secondary"
                className="mt-6 w-full"
              >
                {t.actions.close}
              </Button>
            </div>
          </Modal>
        </div>
      </WorkoutSessionProvider>
      </RestTimerProvider>
  );
};

const SplashScreen: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-app-accent text-app-accent-foreground">
        <Dumbbell size={48} strokeWidth={2.5} />
      </div>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-accent border-t-transparent" />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, phase, fallbackUid } = useAuth();
  usePortraitOrientation();

  if (phase === 'resolving') {
    return (
      <ToastProvider>
        <SplashScreen />
      </ToastProvider>
    );
  }

  if (phase === 'unauthenticated') {
    return (
      <ToastProvider>
        <OnboardingScreen />
      </ToastProvider>
    );
  }

  const uid = user?.uid ?? fallbackUid;
  if (!uid) {
    return (
      <ToastProvider>
        <OnboardingScreen />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AppDataProvider key={uid}>
        <AppLayout />
      </AppDataProvider>
    </ToastProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
