import React, { useEffect, useState, useCallback } from 'react';
import { storageManager } from './services/storageService';
import { preferencesService } from './services/preferencesService';
import { Exercise, ExerciseLog, Routine } from './types';
import { ExerciseList } from './components/ExerciseList';
import { ExerciseDetail } from './components/ExerciseDetail';
import { SettingsScreen } from './components/SettingsScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { RoutinesScreen } from './components/RoutinesScreen';
import { BottomNav, ScreenType } from './components/BottomNav';
import ConfirmModal from './components/ConfirmModal';
import PromptModal from './components/PromptModal';
import { Modal } from './components/Modal';
import { ToastProvider } from './hooks/useToast';
import { useTranslations, getTranslatedGroupName } from './utils/translations';
import { Plus, Download, Share, PlusSquare, MoreVertical, Pencil } from 'lucide-react';
import { makeId } from './services/storageService';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Surface } from './components/ui/Surface';
import { Badge } from './components/ui/Badge';
import { MuscleGroupPicker } from './components/ui/MuscleGroupPicker';
import { cn } from './utils/cn';

const App: React.FC = () => {
  const t = useTranslations();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(
    () => preferencesService.getDefaultScreen() ?? 'home'
  );
  const [isStandalone, setIsStandalone] = useState(true);
  const [screenResetSignal, setScreenResetSignal] = useState(0);

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const [addingExercise, setAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseGroup, setNewExerciseGroup] = useState('');

  const [movingExercise, setMovingExercise] = useState<Exercise | null>(null);
  const [renamingExercise, setRenamingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);

  const [addingGroup, setAddingGroup] = useState(false);
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const loadData = useCallback(() => {
    setExercises(storageManager.getExercises());
    setMuscleGroups(storageManager.getMuscleGroups());
    setRoutines(storageManager.getRoutines());
  }, []);

  useEffect(() => {
    loadData();
    const checkStandalone = () => {
      const isStandaloneQuery = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(isStandaloneQuery || isIosStandalone);
    };
    checkStandalone();
    window.addEventListener('resize', checkStandalone);
    return () => window.removeEventListener('resize', checkStandalone);
  }, [loadData]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (currentScreen !== 'home') {
      setSelectedExercise(null);
    }
  }, [currentScreen]);

  useEffect(() => {
    if (addingExercise && muscleGroups.length > 0 && !newExerciseGroup) {
      setNewExerciseGroup(muscleGroups[0]);
    }
  }, [addingExercise, muscleGroups, newExerciseGroup]);

  const handleScreenReset = (screen: ScreenType) => {
    if (screen === 'home') {
      setSelectedExercise(null);
    } else {
      setScreenResetSignal((n) => n + 1);
    }
  };

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExerciseName.trim()) return;
    storageManager.saveExercise({
      id: makeId('exercise'),
      name: newExerciseName.trim(),
      muscleGroup: newExerciseGroup,
      logs: [],
    });
    setNewExerciseName('');
    setAddingExercise(false);
    loadData();
  };

  const handleLog = useCallback((id: string, weight: number, reps: number) => {
    storageManager.logSession(id, weight, reps);
    loadData();
  }, [loadData]);

  const handleUpdateNote = useCallback((id: string, note: string) => {
    storageManager.updateExerciseNote(id, note);
    loadData();
  }, [loadData]);

  const handleUpdateLog = useCallback((exerciseId: string, originalDate: string, log: ExerciseLog) => {
    storageManager.updateExerciseLog(exerciseId, originalDate, log);
    loadData();
  }, [loadData]);

  const handleDeleteLog = useCallback((exerciseId: string, date: string) => {
    storageManager.deleteExerciseLog(exerciseId, date);
    loadData();
  }, [loadData]);

  const handleDeleteAllLogs = useCallback((exerciseId: string) => {
    storageManager.deleteAllLogs(exerciseId);
    loadData();
  }, [loadData]);

  const handleDeleteAllLogsExceptLatest = useCallback((exerciseId: string) => {
    storageManager.deleteAllLogsExceptLatest(exerciseId);
    loadData();
  }, [loadData]);

  const handleRenameExercise = useCallback((exercise: Exercise) => {
    setRenamingExercise(exercise);
  }, []);

  const handleMoveExercise = useCallback((exercise: Exercise) => {
    setMovingExercise(exercise);
  }, []);

  const handleDeleteExercise = useCallback((exercise: Exercise) => {
    setDeletingExercise(exercise);
  }, []);

  const handleReorderRoutineExercise = (routineId: string, from: number, to: number) => {
    storageManager.reorderRoutineExercise(routineId, from, to);
    loadData();
  };

  const handleReorderRoutine = (from: number, to: number) => {
    storageManager.reorderRoutine(from, to);
    loadData();
  };

  const handleSaveRoutine = (routine: Routine) => {
    storageManager.saveRoutine(routine);
    loadData();
  };

  const handleDeleteRoutine = (id: string) => {
    storageManager.deleteRoutine(id);
    loadData();
  };

  const handleExport = () => {
    const data = storageManager.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (content: string): boolean => {
    const success = storageManager.importData(content);
    if (success) loadData();
    return success;
  };

  const refreshSelectedExercise = useCallback((id: string) => {
    const updated = exercises.find((e) => e.id === id) ?? null;
    setSelectedExercise(updated);
  }, [exercises]);

  const currentExercise = selectedExercise
    ? (exercises.find((e) => e.id === selectedExercise.id) ?? null)
    : null;

  const showHeader = currentScreen === 'home' && !currentExercise;
  const appHeaderClassName = 'px-4 pt-6 pb-4';
  const appHeaderTitleClassName = 'text-center text-2xl font-bold text-app-text';

  return (
    <ToastProvider>
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

        {currentScreen !== 'home' && (
          <header className={appHeaderClassName}>
            <div className="relative">
              <h1 className={appHeaderTitleClassName}>
              {currentScreen === 'insights' ? t.labels.insights
                : currentScreen === 'routines' ? t.labels.routines
                : t.labels.settings}
              </h1>
            </div>
          </header>
        )}

          <main className="animate-slideUp px-4 pb-24 pt-4">
          {currentScreen === 'settings' ? (
            <SettingsScreen onExport={handleExport} onImport={handleImportData} />
          ) : currentScreen === 'insights' ? (
            <InsightsScreen exercises={exercises} />
          ) : currentScreen === 'routines' ? (
            <RoutinesScreen
              routines={routines}
              exercises={exercises}
              muscleGroups={muscleGroups}
              onSaveRoutine={handleSaveRoutine}
              onDeleteRoutine={handleDeleteRoutine}
              onLogExercise={handleLog}
              onReorderRoutine={handleReorderRoutine}
              onReorderRoutineExercise={handleReorderRoutineExercise}
              onUpdateNote={handleUpdateNote}
              onUpdateLog={handleUpdateLog}
              onDeleteLog={handleDeleteLog}
              onDeleteAllLogs={handleDeleteAllLogs}
              onDeleteAllLogsExceptLatest={handleDeleteAllLogsExceptLatest}
              onDeleteExercise={(id) => {
                storageManager.deleteExercise(id);
                loadData();
              }}
              resetSignal={screenResetSignal}
            />
          ) : currentExercise ? (
            <ExerciseDetail
              exercise={currentExercise}
              muscleGroups={muscleGroups}
              onBack={() => setSelectedExercise(null)}
              onLog={(w, r) => { handleLog(currentExercise.id, w, r); refreshSelectedExercise(currentExercise.id); }}
              onUpdateNote={(note) => { handleUpdateNote(currentExercise.id, note); refreshSelectedExercise(currentExercise.id); }}
              onUpdateLog={(origDate, log) => { handleUpdateLog(currentExercise.id, origDate, log); refreshSelectedExercise(currentExercise.id); }}
              onDeleteLog={(date) => { handleDeleteLog(currentExercise.id, date); refreshSelectedExercise(currentExercise.id); }}
              onDeleteAllLogs={() => { handleDeleteAllLogs(currentExercise.id); refreshSelectedExercise(currentExercise.id); }}
              onDeleteAllLogsExceptLatest={() => { handleDeleteAllLogsExceptLatest(currentExercise.id); refreshSelectedExercise(currentExercise.id); }}
              onRename={(name) => { storageManager.updateExerciseDetails(currentExercise.id, name, currentExercise.muscleGroup); loadData(); refreshSelectedExercise(currentExercise.id); }}
              onChangeGroup={(group) => { storageManager.updateExerciseDetails(currentExercise.id, currentExercise.name, group); loadData(); refreshSelectedExercise(currentExercise.id); }}
              onDelete={() => { storageManager.deleteExercise(currentExercise.id); setSelectedExercise(null); loadData(); }}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  onClick={() => { setNewExerciseName(''); setNewExerciseGroup(muscleGroups[0] ?? ''); setAddingExercise(true); }}
                  className="w-full"
                >
                  <Plus size={18} />
                  {t.labels.newExercise}
                </Button>

                <Button
                  onClick={() => setAddingGroup(true)}
                  variant="secondary"
                  className="w-full border-dashed"
                >
                  <Plus size={20} className="mr-2" />
                  {t.actions.addGroup}
                </Button>
              </div>

              <ExerciseList
                exercises={exercises}
                muscleGroups={muscleGroups}
                onSelectExercise={setSelectedExercise}
                onRename={handleRenameExercise}
                onDelete={handleDeleteExercise}
                onMove={handleMoveExercise}
                onRenameGroup={(group) => setRenamingGroup(group)}
                onDeleteGroup={(group) => setDeletingGroup(group)}
              />
            </div>
          )}
        </main>

        <BottomNav currentScreen={currentScreen} onScreenChange={setCurrentScreen} onScreenReset={handleScreenReset} />

        <Modal open={addingExercise} onClose={() => setAddingExercise(false)} position="bottom">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col">
            <div className="shrink-0 border-b border-app-border px-6 pb-4 pt-5">
              <h2 className="text-xl font-bold text-app-text">{t.labels.newExercise}</h2>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleAddExercise}>
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-app-text-muted">{t.labels.name}</label>
                  <Input
                    autoFocus
                    type="text"
                    placeholder="Ej. Bench Press"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-app-text-muted">{t.labels.muscleGroup}</label>
                  <MuscleGroupPicker
                    groups={muscleGroups}
                    selected={newExerciseGroup}
                    onSelect={setNewExerciseGroup}
                    maxHeightClass="max-h-[40vh]"
                  />
                </div>
              </div>

              <div className="shrink-0 border-t border-app-border px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setAddingExercise(false)}
                    variant="secondary"
                    className="flex-1"
                  >
                    {t.actions.cancel}
                  </Button>
                  <Button
                    type="submit"
                    disabled={!newExerciseName.trim()}
                    className="flex-1"
                  >
                    {t.actions.save}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Modal>

        <Modal open={!!movingExercise} onClose={() => setMovingExercise(null)} position="center">
          {movingExercise && (
            <div
              className="mx-4 w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-6 animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <h2 className="mb-2 text-xl font-bold text-app-text">{t.actions.move}</h2>
              <p className="mb-4 text-sm text-app-text-muted">{movingExercise.name}</p>
              <div className="mb-6">
                <MuscleGroupPicker
                  groups={muscleGroups}
                  selected={movingExercise.muscleGroup}
                  onSelect={(group) => {
                    storageManager.updateExerciseDetails(movingExercise.id, movingExercise.name, group);
                    setMovingExercise(null);
                    loadData();
                  }}
                  excludeSelected={true}
                  maxHeightClass="max-h-[40vh]"
                />
              </div>
              <Button
                onClick={() => setMovingExercise(null)}
                variant="secondary"
                className="w-full"
              >
                {t.actions.cancel}
              </Button>
            </div>
          )}
        </Modal>

        {renamingExercise && (
          <PromptModal
            title={t.prompts.renameExercise}
            initialValue={renamingExercise.name}
            onConfirm={(name) => {
              storageManager.updateExerciseDetails(renamingExercise.id, name, renamingExercise.muscleGroup);
              setRenamingExercise(null);
              loadData();
            }}
            onCancel={() => setRenamingExercise(null)}
          />
        )}

        {deletingExercise && (
          <ConfirmModal
            title={t.prompts.deleteExercise.replace('{name}', deletingExercise.name)}
            confirmLabel={t.actions.delete}
            destructive
            onConfirm={() => {
              storageManager.deleteExercise(deletingExercise.id);
              setDeletingExercise(null);
              loadData();
            }}
            onCancel={() => setDeletingExercise(null)}
          />
        )}

        {addingGroup && (
          <PromptModal
            title={t.prompts.newGroupName}
            onConfirm={(name) => {
              storageManager.addMuscleGroup(name);
              setAddingGroup(false);
              loadData();
            }}
            onCancel={() => setAddingGroup(false)}
          />
        )}

        {renamingGroup && (
          <PromptModal
            title={t.prompts.renameGroup}
            initialValue={renamingGroup}
            onConfirm={(newName) => {
              if (newName !== renamingGroup) {
                storageManager.renameMuscleGroup(renamingGroup, newName);
                loadData();
              }
              setRenamingGroup(null);
            }}
            onCancel={() => setRenamingGroup(null)}
          />
        )}

        {deletingGroup && (
          <ConfirmModal
            title={t.prompts.deleteGroup.replace('{name}', deletingGroup)}
            confirmLabel={t.actions.delete}
            destructive
            onConfirm={() => {
              storageManager.deleteMuscleGroup(deletingGroup);
              setDeletingGroup(null);
              loadData();
            }}
            onCancel={() => setDeletingGroup(null)}
          />
        )}

        <Modal open={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} position="center">
          <div
            className="mx-4 max-h-[80vh] w-full max-w-sm animate-scaleIn overflow-y-auto rounded-2xl border border-app-border bg-app-surface p-6"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
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
    </ToastProvider>
  );
};

export default App;
