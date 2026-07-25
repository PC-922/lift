import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useParams, useSearchParams, Navigate, useLocation } from 'react-router-dom';
import { setStorageUser } from './services/storageService';
import { Exercise, ExerciseLog } from './types';
import { ExerciseList } from './components/ExerciseList';
import { ExerciseDetail } from './components/ExerciseDetail';
import { ExerciseFormScreen } from './components/ExerciseFormScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { InsightDetailScreen } from './components/InsightDetailScreen';
import { RoutinesScreen } from './components/RoutinesScreen';
import { MuscleGroupsScreen } from './components/MuscleGroupsScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { BottomNav } from './components/BottomNav';
import ConfirmModal from './components/ConfirmModal';
import { Modal } from './components/Modal';
import { ToastProvider } from './hooks/useToast';
import { RestTimerProvider } from './hooks/useRestTimer';
import { RestTimer } from './components/RestTimer';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppDataProvider, useAppData } from './hooks/useAppData';
import { storageManager } from './services/storageService';
import { useTranslations } from './utils/translations';
import { Download, MoreVertical, Plus, PlusSquare, Share } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Surface } from './components/ui/Surface';
import { Badge } from './components/ui/Badge';
import { cn } from './utils/cn';

const HomeScreen: React.FC = () => {
  const t = useTranslations();
  const { exercises, muscleGroups } = useAppData();
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
  const { refresh } = useAppData();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <Button
          onClick={() => navigate('/exercises/new')}
          size="lg"
          className="w-full rounded-2xl shadow-xl shadow-app-accent/10"
        >
          <Plus size={24} strokeWidth={3} />
          {t.labels.newExercise}
        </Button>

        <Button
          onClick={() => navigate('/settings/muscle-groups')}
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
            await storageManager.deleteExercise(deletingExercise.id);
            setDeletingExercise(null);
            await refresh();
          }}
          onCancel={() => setDeletingExercise(null)}
        />
      )}
    </div>
  );
};

const ExerciseDetailRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { exercises, muscleGroups, refresh } = useAppData();
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
        await storageManager.logSession(exercise.id, weight, reps);
        await refresh();
      }}
      onUpdateNote={async (note) => {
        await storageManager.updateExerciseNote(exercise.id, note);
        await refresh();
      }}
      onUpdateLog={async (originalDate, log) => {
        await storageManager.updateExerciseLog(exercise.id, originalDate, log);
        await refresh();
      }}
      onDeleteLog={async (date) => {
        await storageManager.deleteExerciseLog(exercise.id, date);
        await refresh();
      }}
      onDeleteAllLogs={async () => {
        await storageManager.deleteAllLogs(exercise.id);
        await refresh();
      }}
      onDeleteAllLogsExceptLatest={async () => {
        await storageManager.deleteAllLogsExceptLatest(exercise.id);
        await refresh();
      }}
      onRename={async (name) => {
        await storageManager.updateExerciseDetails(exercise.id, name, exercise.muscleGroup);
        await refresh();
      }}
      onChangeGroup={async (group) => {
        await storageManager.updateExerciseDetails(exercise.id, exercise.name, group);
        await refresh();
      }}
      onDelete={async () => {
        await storageManager.deleteExercise(exercise.id);
        navigate('/', { replace: true });
        await refresh();
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
      onSelectExercise={(id) => navigate(`/insights/${id}`)}
    />
  );
};

const RoutinesRoute: React.FC = () => {
  const { exercises, muscleGroups, routines, refresh } = useAppData();
  const navigate = useNavigate();
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);

  return (
    <RoutinesScreen
      routines={routines}
      exercises={exercises}
      muscleGroups={muscleGroups}
      activeRoutineId={activeRoutineId}
      onActiveRoutineChange={setActiveRoutineId}
      onSaveRoutine={async (routine) => {
        await storageManager.saveRoutine(routine);
        await refresh();
      }}
      onDeleteRoutine={async (id) => {
        await storageManager.deleteRoutine(id);
        await refresh();
      }}
      onLogExercise={async (id, weight, reps) => {
        await storageManager.logSession(id, weight, reps);
        await refresh();
      }}
      onReorderRoutine={async (from, to) => {
        await storageManager.reorderRoutine(from, to);
        await refresh();
      }}
      onReorderRoutineExercise={async (routineId, dayId, from, to) => {
        await storageManager.reorderRoutineExercise(routineId, dayId, from, to);
        await refresh();
      }}
      onUpdateNote={async (id, note) => {
        await storageManager.updateExerciseNote(id, note);
        await refresh();
      }}
      onUpdateLog={async (exerciseId, originalDate, log) => {
        await storageManager.updateExerciseLog(exerciseId, originalDate, log);
        await refresh();
      }}
      onDeleteLog={async (exerciseId, date) => {
        await storageManager.deleteExerciseLog(exerciseId, date);
        await refresh();
      }}
      onDeleteAllLogs={async (exerciseId) => {
        await storageManager.deleteAllLogs(exerciseId);
        await refresh();
      }}
      onDeleteAllLogsExceptLatest={async (exerciseId) => {
        await storageManager.deleteAllLogsExceptLatest(exerciseId);
        await refresh();
      }}
      onDeleteExercise={async (id) => {
        await storageManager.deleteExercise(id);
        await refresh();
      }}
      onNavigateToExercise={(id) => navigate(`/exercises/${id}`)}
      resetSignal={0}
    />
  );
};

const SettingsRoute: React.FC = () => {
  const { refresh } = useAppData();

  return (
    <SettingsScreen
      onExport={async () => {
        const data = await storageManager.exportData();
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
        const success = await storageManager.importData(content);
        if (success) await refresh();
        return success;
      }}
      onResetData={async () => {
        await storageManager.resetData();
        await refresh();
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

  const currentScreen =
    location.pathname === '/' ? 'home'
    : location.pathname === '/insights' || location.pathname.startsWith('/insights/') ? 'insights'
    : location.pathname === '/routines' || location.pathname.startsWith('/routines/') ? 'routines'
    : location.pathname === '/settings' || location.pathname.startsWith('/settings/') ? 'settings'
    : 'home';

  const showHeader = currentScreen === 'home' && !location.pathname.startsWith('/exercises/');
  const appHeaderClassName = 'px-4 pt-6 pb-4';
  const appHeaderTitleClassName = 'text-center text-4xl font-black tracking-tighter text-app-text uppercase italic';

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <RestTimerProvider>
      <div className="min-h-screen pb-24 sm:mx-auto sm:max-w-md">
          {showHeader && (
            <header className={cn('sticky top-0 z-20 bg-app-bg', appHeaderClassName)}>
              <div className="relative">
                <h1 className={appHeaderTitleClassName}>{t.appTitle}</h1>
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
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

          {currentScreen !== 'home' && !location.pathname.startsWith('/exercises/') && (
            <header className={cn('sticky top-0 z-20 bg-app-bg', appHeaderClassName)}>
              <div className="relative">
                <h1 className={appHeaderTitleClassName}>
                  {currentScreen === 'insights' ? t.labels.insights
                    : currentScreen === 'routines' ? t.labels.routines
                    : t.labels.settings}
                </h1>
              </div>
            </header>
          )}

          <main className="animate-slideUp px-4 pb-48 pt-4">
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/exercises/new" element={<ExerciseFormScreen />} />
              <Route path="/exercises/:id/edit" element={<ExerciseFormScreen />} />
              <Route path="/exercises/:id" element={<ExerciseDetailRoute />} />
              <Route path="/insights" element={<InsightsRoute />} />
              <Route path="/insights/:id" element={<InsightDetailScreen />} />
              <Route path="/routines" element={<RoutinesRoute />} />
              <Route path="/settings" element={<SettingsRoute />} />
              <Route path="/settings/muscle-groups" element={<MuscleGroupsScreen />} />
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
          <RestTimer />
        </div>
      </RestTimerProvider>
  );
};

const AppContent: React.FC = () => {
  const { user, mode: authMode } = useAuth();

  setStorageUser(user, authMode);

  if (authMode === null) {
    return <OnboardingScreen />;
  }

  const adapterKey = `${user?.uid ?? 'anon'}-${authMode}`;

  return (
    <ToastProvider>
      <AppDataProvider key={adapterKey}>
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
