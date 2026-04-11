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

const APP_LOGO_SRC = '/lift-32.png';

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

  return (
    <ToastProvider>
      <div className="min-h-screen pb-24 px-4 sm:max-w-md sm:mx-auto">

        {showHeader && (
          <header className="pt-8 pb-6 sticky top-0 z-20 bg-ios-bg/95 backdrop-blur-md">
            <div className="grid grid-cols-3 items-center">
              <div />
              <div className="flex flex-col items-center text-center">
                <img src={APP_LOGO_SRC} alt={t.appTitle} className="h-8 w-8 mb-2" />
                <h1 className="text-xl font-bold tracking-tight text-ios-text">{t.appTitle}</h1>
              </div>
              <div className="flex items-center justify-end">
                {!isStandalone && (
                  <button
                    onClick={() => setIsInstallModalOpen(true)}
                    className="h-8 px-3 rounded-full bg-ios-blue text-white text-xs font-bold flex items-center gap-1 shadow-md animate-pulse active:opacity-80"
                  >
                    <Download size={14} />
                    {t.actions.install}
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        {currentScreen !== 'home' && (
          <header className="pt-8 pb-6">
            <h1 className="text-2xl font-bold text-ios-text text-center">
              {currentScreen === 'insights' ? t.labels.insights
                : currentScreen === 'routines' ? t.labels.routines
                : t.labels.settings}
            </h1>
          </header>
        )}

        <main className="animate-slideUp pb-24">
          {currentScreen === 'settings' ? (
            <SettingsScreen onExport={handleExport} onImport={handleImportData} />
          ) : currentScreen === 'insights' ? (
            <InsightsScreen exercises={exercises} />
          ) : currentScreen === 'routines' ? (
            <RoutinesScreen
              routines={routines}
              exercises={exercises}
              onSaveRoutine={handleSaveRoutine}
              onDeleteRoutine={handleDeleteRoutine}
              onLogExercise={handleLog}
              onReorderRoutineExercise={handleReorderRoutineExercise}
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

              <div className="pt-2 border-t border-ios-separator">
                <button
                  onClick={() => setAddingGroup(true)}
                  className="mt-2 py-4 border-2 border-dashed border-ios-separator rounded-2xl flex items-center justify-center text-ios-gray font-medium active:bg-gray-100 dark:active:bg-gray-800 transition-colors w-full"
                >
                  <Plus size={20} className="mr-2" />
                  {t.actions.addGroup}
                </button>
              </div>
            </div>
          )}
        </main>

        {currentScreen === 'home' && !currentExercise && (
          <button
            onClick={() => { setNewExerciseName(''); setNewExerciseGroup(muscleGroups[0] ?? ''); setAddingExercise(true); }}
            className="fixed right-6 w-14 h-14 bg-ios-blue rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white active:scale-95 transition-transform z-40"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
            aria-label={t.labels.newExercise}
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        )}

        <BottomNav currentScreen={currentScreen} onScreenChange={setCurrentScreen} onScreenReset={handleScreenReset} />

        <Modal open={addingExercise} onClose={() => setAddingExercise(false)} position="bottom">
          <div
            className="bg-ios-card w-full max-w-md rounded-t-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto animate-slideUp"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
          >
            <h2 className="text-xl font-bold mb-4 text-ios-text">{t.labels.newExercise}</h2>
            <form onSubmit={handleAddExercise}>
              <label className="block text-xs font-medium text-ios-gray mb-1 ml-1">{t.labels.name}</label>
              <input
                autoFocus
                type="text"
                placeholder="Ej. Bench Press"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                className="w-full bg-ios-bg text-ios-text p-4 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-ios-blue"
              />
              <label className="block text-xs font-medium text-ios-gray mb-2 ml-1">{t.labels.muscleGroup}</label>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {muscleGroups.map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setNewExerciseGroup(group)}
                    className={`py-2 px-1 rounded-lg text-sm font-medium transition-colors truncate ${
                      newExerciseGroup === group
                        ? 'bg-ios-blue text-white shadow-md'
                        : 'bg-ios-bg text-ios-text active:bg-gray-200 dark:active:bg-gray-700'
                    }`}
                  >
                    {getTranslatedGroupName(group)}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 sticky bottom-0 bg-ios-card pt-2">
                <button
                  type="button"
                  onClick={() => setAddingExercise(false)}
                  className="flex-1 py-3.5 rounded-xl font-semibold bg-ios-bg text-ios-text active:opacity-70"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!newExerciseName.trim()}
                  className="flex-1 py-3.5 rounded-xl font-semibold bg-ios-blue text-white active:opacity-80 disabled:opacity-50"
                >
                  {t.actions.save}
                </button>
              </div>
            </form>
          </div>
        </Modal>

        <Modal open={!!movingExercise} onClose={() => setMovingExercise(null)} position="center">
          {movingExercise && (
            <div
              className="bg-ios-card w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scaleIn mx-4"
              onClick={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-2 text-ios-text">{t.actions.move}</h2>
              <p className="text-sm text-ios-gray mb-4">{movingExercise.name}</p>
              <div className="grid grid-cols-3 gap-2 mb-6 max-h-[40vh] overflow-y-auto">
                {muscleGroups
                  .filter((g) => g !== movingExercise.muscleGroup)
                  .map((group) => (
                    <button
                      key={group}
                      onClick={() => {
                        storageManager.updateExerciseDetails(movingExercise.id, movingExercise.name, group);
                        setMovingExercise(null);
                        loadData();
                      }}
                      className="py-2 px-1 rounded-lg text-sm font-medium transition-colors bg-ios-bg text-ios-text active:bg-ios-blue active:text-white truncate"
                    >
                      {getTranslatedGroupName(group)}
                    </button>
                  ))}
              </div>
              <button
                onClick={() => setMovingExercise(null)}
                className="w-full py-3.5 rounded-xl font-semibold bg-ios-bg text-ios-text active:opacity-70"
              >
                {t.actions.cancel}
              </button>
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
            className="bg-ios-card w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scaleIn max-h-[80vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-6 text-ios-text text-center">{t.labels.installGuide}</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-ios-text text-sm uppercase tracking-wide opacity-80">{t.labels.installIosSafari}</h3>
                <div className="bg-ios-bg p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-ios-blue shadow-sm"><Share size={20} /></div>
                    <span className="text-sm text-ios-text">{t.labels.stepShare}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-ios-text shadow-sm"><PlusSquare size={20} /></div>
                    <span className="text-sm text-ios-text">{t.labels.stepAdd}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-ios-text text-sm uppercase tracking-wide opacity-80">{t.labels.installAndroid}</h3>
                <div className="bg-ios-bg p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-ios-text shadow-sm"><MoreVertical size={20} /></div>
                    <span className="text-sm text-ios-text">{t.labels.stepMenu}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-ios-text shadow-sm"><Download size={20} /></div>
                    <span className="text-sm text-ios-text">{t.labels.stepInstall}</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsInstallModalOpen(false)}
              className="mt-6 w-full py-3.5 rounded-xl font-semibold bg-ios-bg text-ios-text active:opacity-70"
            >
              {t.actions.close}
            </button>
          </div>
        </Modal>
      </div>
    </ToastProvider>
  );
};

export default App;
