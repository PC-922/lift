import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { storageManager } from './services/storageService';
import { preferencesService } from './services/preferencesService';
import { Exercise, ExerciseLog, GroupSortPreference, Routine } from './types';
import { ExerciseCard } from './components/ExerciseCard';
import { MuscleGroupCard } from './components/MuscleGroupCard';
import { SettingsScreen } from './components/SettingsScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { RoutinesScreen } from './components/RoutinesScreen';
import { BottomNav, ScreenType } from './components/BottomNav';
import ConfirmModal from './components/ConfirmModal';
import PromptModal from './components/PromptModal';
import { t, translations } from './utils/translations';
import { sortExercisesForGroup } from './utils/exerciseSorting';
import { 
  Plus, 
  Download, 
  ChevronLeft,
  Pencil,
  Share,
  PlusSquare,
  MoreVertical
} from 'lucide-react';

const APP_LOGO_SRC = '/lift-32.png';

const App: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [groupSortPreference, setGroupSortPreference] = useState<GroupSortPreference>(
    () => storageManager.getGroupSortPreference()
  );
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(
    () => preferencesService.getDefaultScreen() ?? 'home'
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [selectedGroupForm, setSelectedGroupForm] = useState('');
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [screenResetSignal, setScreenResetSignal] = useState(0);
  const [movingExercise, setMovingExercise] = useState<Exercise | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setExercises(storageManager.getExercises());
    setMuscleGroups(storageManager.getMuscleGroups());
    setGroupSortPreference(storageManager.getGroupSortPreference());
    setRoutines(storageManager.getRoutines());
  }, []);

  const handleScreenReset = (screen: ScreenType) => {
    if (screen === 'home') {
      setActiveGroup(null);
    } else {
      setScreenResetSignal((n) => n + 1);
    }
  };

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
      setActiveGroup(null);
    }
  }, [currentScreen]);

  useEffect(() => {
    if (isAdding) {
      if (activeGroup) {
        setSelectedGroupForm(activeGroup);
      } else if (muscleGroups.length > 0) {
        setSelectedGroupForm(muscleGroups[0]);
      }
    }
  }, [isAdding, activeGroup, muscleGroups]);

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExerciseName.trim()) return;

    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: newExerciseName,
      muscleGroup: selectedGroupForm,
      logs: []
    };

    storageManager.saveExercise(newExercise);
    setNewExerciseName('');
    setIsAdding(false);
    loadData();
  };

  const handleLog = (id: string, weight: number, reps: number) => {
    storageManager.logSession(id, weight, reps);
    loadData();
  };

  const handleUpdateNote = (id: string, note: string) => {
    storageManager.updateExerciseNote(id, note);
    loadData();
  };

  const handleUpdateLog = (exerciseId: string, originalDate: string, log: ExerciseLog) => {
    storageManager.updateExerciseLog(exerciseId, originalDate, log);
    loadData();
  };

  const handleDeleteLog = (exerciseId: string, date: string) => {
    storageManager.deleteExerciseLog(exerciseId, date);
    loadData();
  };

  const handleDeleteAllLogs = (exerciseId: string) => {
    storageManager.deleteAllLogs(exerciseId);
    loadData();
  };

  const handleDeleteAllLogsExceptLatest = (exerciseId: string) => {
    storageManager.deleteAllLogsExceptLatest(exerciseId);
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

  const handleDelete = (id: string) => {
    storageManager.deleteExercise(id);
    loadData();
  };

  const handleEditExerciseTrigger = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setEditName(exercise.name);
    setEditGroup(exercise.muscleGroup || 'Otro');
  };

  const handleMoveTrigger = (exercise: Exercise) => {
    setMovingExercise(exercise);
  };

  const handleMoveConfirm = (targetGroup: string) => {
    if (!movingExercise) return;
    storageManager.updateExerciseDetails(movingExercise.id, movingExercise.name, targetGroup);
    setMovingExercise(null);
    loadData();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExercise && editName.trim()) {
        storageManager.updateExerciseDetails(editingExercise.id, editName.trim(), editGroup);
        setEditingExercise(null);
        loadData();
    }
  };

  const handleAddGroup = () => {
    setAddingGroup(true);
  };

  const handleDeleteGroup = (group: string) => {
    setDeletingGroup(group);
  };

  const handleConfirmDeleteGroup = () => {
    if (!deletingGroup) return;
    storageManager.deleteMuscleGroup(deletingGroup);
    setDeletingGroup(null);
    loadData();
  };

  const handleRenameGroup = (group: string) => {
    setRenamingGroup(group);
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
    if (success) {
      loadData();
    }
    return success;
  };

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    muscleGroups.forEach(g => counts[g] = 0);
    
    exercises.forEach(ex => {
      const g = ex.muscleGroup || 'Otro';
      if (counts[g] !== undefined) {
        counts[g]++;
      }
    });
    return counts;
  }, [exercises, muscleGroups]);

  const currentViewExercises = useMemo(() => {
    if (!activeGroup) return [];
    const filtered = exercises.filter(ex => (ex.muscleGroup || 'Otro') === activeGroup);
    return sortExercisesForGroup(filtered, groupSortPreference);
  }, [exercises, activeGroup, groupSortPreference]);

  const handleSortFieldChange = (field: GroupSortPreference['field']) => {
    const nextPreference = { ...groupSortPreference, field };
    storageManager.saveGroupSortPreference(nextPreference);
    setGroupSortPreference(nextPreference);
  };

  const handleSortDirectionToggle = () => {
    const nextPreference = {
      ...groupSortPreference,
      direction: groupSortPreference.direction === 'asc' ? 'desc' : 'asc',
    };
    storageManager.saveGroupSortPreference(nextPreference);
    setGroupSortPreference(nextPreference);
  };

  const getTranslatedGroupName = (group: string) => {
     return (translations.es.muscleGroups as any)[group] 
        ? (t.muscleGroups as any)[group] 
        : group;
  };

  return (
    <div className="min-h-screen pb-24 px-4 sm:max-w-md sm:mx-auto">
      
      <header className="pt-8 pb-6 sticky top-0 z-20 bg-ios-bg/95 backdrop-blur-md">
        {activeGroup ? (
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setActiveGroup(null)}
              className="w-10 h-10 flex items-center justify-center -ml-2 text-ios-blue active:opacity-60 transition-opacity"
            >
              <ChevronLeft size={28} />
            </button>
            
            <div className="flex-1 text-center pr-8">
              <h1 className="text-xl font-bold tracking-tight text-ios-text animate-fadeIn truncate">
                {getTranslatedGroupName(activeGroup)}
              </h1>
            </div>
          </div>
        ) : (
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
        )}
      </header>

      <main className="animate-slideUp pb-24">
        {currentScreen === 'settings' ? (
          <SettingsScreen
            onExport={handleExport}
            onImport={handleImportData}
          />
        ) : currentScreen === 'insights' ? (
          <InsightsScreen exercises={exercises} />
        ) : currentScreen === 'history' ? (
          <HistoryScreen
            exercises={exercises}
            onUpdateLog={handleUpdateLog}
            onDeleteLog={handleDeleteLog}
            onDeleteAllLogs={handleDeleteAllLogs}
            onDeleteAllLogsExceptLatest={handleDeleteAllLogsExceptLatest}
            resetSignal={screenResetSignal}
          />
        ) : currentScreen === 'routines' ? (
          <RoutinesScreen
            routines={routines}
            exercises={exercises}
            onSaveRoutine={handleSaveRoutine}
            onDeleteRoutine={handleDeleteRoutine}
            onLogExercise={handleLog}
            resetSignal={screenResetSignal}
          />
        ) : activeGroup ? (
          <div className="space-y-4">
            {currentViewExercises.length > 0 && (
              <div className="bg-ios-card rounded-2xl p-3 flex items-center justify-between gap-2">
                <span className="text-xs text-ios-gray uppercase tracking-wide">{t.labels.sortBy}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSortFieldChange('progress')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      groupSortPreference.field === 'progress'
                        ? 'bg-ios-blue text-white'
                        : 'bg-ios-bg text-ios-text active:bg-gray-200 dark:active:bg-gray-700'
                    }`}
                  >
                    {t.labels.progress}
                  </button>
                  <button
                    onClick={() => handleSortFieldChange('weight')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      groupSortPreference.field === 'weight'
                        ? 'bg-ios-blue text-white'
                        : 'bg-ios-bg text-ios-text active:bg-gray-200 dark:active:bg-gray-700'
                    }`}
                  >
                    {t.labels.weightShort}
                  </button>
                </div>
                <button
                  onClick={handleSortDirectionToggle}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-ios-bg text-ios-text active:bg-gray-200 dark:active:bg-gray-700"
                >
                  {groupSortPreference.direction === 'asc' ? t.labels.orderAsc : t.labels.orderDesc}
                </button>
              </div>
            )}
            {currentViewExercises.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                <p className="text-ios-text font-medium">{t.labels.empty}</p>
                <p className="text-sm text-ios-gray mt-2">{t.labels.emptyDesc.replace('{group}', getTranslatedGroupName(activeGroup))}</p>
              </div>
            ) : (
              currentViewExercises.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  onLog={(w, r) => handleLog(ex.id, w, r)}
                  onDelete={() => handleDelete(ex.id)}
                  onRename={() => handleEditExerciseTrigger(ex)}
                  onMove={() => handleMoveTrigger(ex)}
                  onUpdateNote={(note) => handleUpdateNote(ex.id, note)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {muscleGroups.map((group) => (
               <MuscleGroupCard
                  key={group}
                  group={group}
                  count={groupCounts[group] || 0}
                  onClick={() => setActiveGroup(group)}
                  onDelete={() => handleDeleteGroup(group)}
                  onRename={() => handleRenameGroup(group)}
               />
            ))}
            
            <button 
              onClick={handleAddGroup}
              className="mt-2 py-4 border-2 border-dashed border-ios-separator rounded-2xl flex items-center justify-center text-ios-gray font-medium active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
            >
              <Plus size={20} className="mr-2" />
              {t.actions.addGroup}
            </button>
          </div>
        )}
      </main>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-ios-card w-full max-w-md rounded-2xl p-6 shadow-2xl mb-4 animate-slideUp max-h-[85vh] overflow-y-auto">
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
                {muscleGroups.map(group => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedGroupForm(group)}
                    className={`
                      py-2 px-1 rounded-lg text-sm font-medium transition-colors truncate
                      ${selectedGroupForm === group 
                        ? 'bg-ios-blue text-white shadow-md' 
                        : 'bg-ios-bg text-ios-text active:bg-gray-200 dark:active:bg-gray-700'}
                    `}
                  >
                    {getTranslatedGroupName(group)}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 sticky bottom-0 bg-ios-card pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
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
        </div>
      )}

      {editingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-ios-card w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scaleIn">
            <h2 className="text-xl font-bold mb-4 text-ios-text">{t.labels.editExercise}</h2>
            <form onSubmit={handleSaveEdit}>
                
                <label className="block text-xs font-medium text-ios-gray mb-1 ml-1">{t.labels.name}</label>
                <div className="relative mb-4">
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-ios-bg text-ios-text p-4 pr-10 rounded-xl outline-none focus:ring-2 focus:ring-ios-blue"
                    />
                    <Pencil className="absolute right-4 top-1/2 -translate-y-1/2 text-ios-gray" size={18} />
                </div>

                <label className="block text-xs font-medium text-ios-gray mb-2 ml-1">{t.labels.muscleGroup}</label>
                <div className="grid grid-cols-3 gap-2 mb-6 max-h-[40vh] overflow-y-auto">
                    {muscleGroups.map(group => (
                    <button
                        key={group}
                        type="button"
                        onClick={() => setEditGroup(group)}
                        className={`
                        py-2 px-1 rounded-lg text-sm font-medium transition-colors truncate
                        ${editGroup === group 
                            ? 'bg-ios-blue text-white shadow-md' 
                            : 'bg-ios-bg text-ios-text active:bg-gray-200 dark:active:bg-gray-700'}
                        `}
                    >
                        {getTranslatedGroupName(group)}
                    </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                    type="button"
                    onClick={() => setEditingExercise(null)}
                    className="flex-1 py-3.5 rounded-xl font-semibold bg-ios-bg text-ios-text active:opacity-70"
                    >
                    {t.actions.cancel}
                    </button>
                    <button
                    type="submit"
                    disabled={!editName.trim()}
                    className="flex-1 py-3.5 rounded-xl font-semibold bg-ios-blue text-white active:opacity-80 disabled:opacity-50"
                    >
                    {t.actions.save}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {movingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-ios-card w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scaleIn">
            <h2 className="text-xl font-bold mb-2 text-ios-text">{t.actions.move}</h2>
            <p className="text-sm text-ios-gray mb-4">{movingExercise.name}</p>
            <div className="grid grid-cols-3 gap-2 mb-6 max-h-[40vh] overflow-y-auto">
              {muscleGroups
                .filter((g) => g !== movingExercise.muscleGroup)
                .map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => handleMoveConfirm(group)}
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
        </div>
      )}

      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="bg-ios-card w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scaleIn max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-ios-text text-center">{t.labels.installGuide}</h2>
            
            <div className="space-y-6">
              
              <div className="space-y-2">
                <h3 className="font-semibold text-ios-text text-sm uppercase tracking-wide opacity-80">{t.labels.installIosSafari}</h3>
                <div className="bg-ios-bg p-4 rounded-xl space-y-3">
                   <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-ios-blue shadow-sm">
                         <Share size={20} />
                      </div>
                      <span className="text-sm text-ios-text">{t.labels.stepShare}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-ios-text shadow-sm">
                         <PlusSquare size={20} />
                      </div>
                      <span className="text-sm text-ios-text">{t.labels.stepAdd}</span>
                   </div>
                </div>
              </div>

               <div className="space-y-2">
                <h3 className="font-semibold text-ios-text text-sm uppercase tracking-wide opacity-80">{t.labels.installIosChrome}</h3>
                <div className="bg-ios-bg p-4 rounded-xl space-y-3">
                   <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-ios-text shadow-sm">
                         <Share size={20} />
                      </div>
                      <span className="text-sm text-ios-text">{t.labels.stepShare}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-ios-text shadow-sm">
                         <PlusSquare size={20} />
                      </div>
                      <span className="text-sm text-ios-text">{t.labels.stepAdd}</span>
                   </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-ios-text text-sm uppercase tracking-wide opacity-80">{t.labels.installAndroid}</h3>
                <div className="bg-ios-bg p-4 rounded-xl space-y-3">
                   <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-ios-text shadow-sm">
                         <MoreVertical size={20} />
                      </div>
                      <span className="text-sm text-ios-text">{t.labels.stepMenu}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-gray-700 p-2 rounded-lg text-ios-text shadow-sm">
                         <Download size={20} />
                      </div>
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
        </div>
      )}

      {currentScreen === 'home' && (
        <button
          onClick={() => setIsAdding(true)}
          className="fixed right-6 w-14 h-14 bg-ios-blue rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white active:scale-95 transition-transform z-40"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
          aria-label={t.labels.newExercise}
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      <BottomNav currentScreen={currentScreen} onScreenChange={setCurrentScreen} onScreenReset={handleScreenReset} />

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
              if (activeGroup === renamingGroup) setActiveGroup(newName);
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
          onConfirm={handleConfirmDeleteGroup}
          onCancel={() => setDeletingGroup(null)}
        />
      )}
    </div>
  );
};

export default App;
