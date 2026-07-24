import React, { useState } from 'react';
import { MoreVertical, Plus, Trash2, Pencil } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { storageManager } from '../services/storageService';
import { useTranslations, getTranslatedGroupName } from '../utils/translations';
import { BackButton } from './ui/BackButton';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Input } from './ui/Input';
import { ListRow } from './ui/ListRow';
import { Surface } from './ui/Surface';
import { ActionSheet } from './ActionSheet';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';

export const MuscleGroupsScreen: React.FC = () => {
  const t = useTranslations();
  const { muscleGroups, refresh } = useAppData();

  const [isAdding, setIsAdding] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [actionGroup, setActionGroup] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    await storageManager.addMuscleGroup(name);
    setNewGroupName('');
    setIsAdding(false);
    await refresh();
  };

  const handleRename = async (newName: string) => {
    if (!renamingGroup || newName.trim() === '' || newName.trim() === renamingGroup) {
      setRenamingGroup(null);
      return;
    }
    await storageManager.renameMuscleGroup(renamingGroup, newName.trim());
    setRenamingGroup(null);
    await refresh();
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;
    await storageManager.deleteMuscleGroup(deletingGroup);
    setDeletingGroup(null);
    await refresh();
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="mb-6">
        <BackButton label={t.labels.settings} onClick={() => window.history.back()} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-app-text">{t.actions.addGroup}</h2>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm" className="gap-1">
            <Plus size={16} />
            {t.actions.addGroup}
          </Button>
        )}
      </div>

      {isAdding && (
        <Surface className="space-y-4">
          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              autoFocus
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={t.prompts.newGroupName}
            />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => { setIsAdding(false); setNewGroupName(''); }}>
                {t.actions.cancel}
              </Button>
              <Button type="submit" className="flex-1" disabled={!newGroupName.trim()}>
                {t.actions.save}
              </Button>
            </div>
          </form>
        </Surface>
      )}

      {muscleGroups.length === 0 ? (
        <div className="py-20 text-center opacity-60">
          <p className="font-medium text-app-text">{t.labels.noExercises}</p>
          <p className="mt-2 text-sm text-app-text-muted">{t.labels.noExercisesDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {muscleGroups.map((group) => (
            <ListRow key={group} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-semibold text-app-text">{getTranslatedGroupName(group)}</span>
              <IconButton onClick={() => setActionGroup(group)} aria-label={t.actions.edit}>
                <MoreVertical size={18} />
              </IconButton>
            </ListRow>
          ))}
        </div>
      )}

      {actionGroup && (
        <ActionSheet
          title={getTranslatedGroupName(actionGroup)}
          actions={[
            { label: t.actions.rename, onPress: () => { setRenamingGroup(actionGroup); setActionGroup(null); } },
            { label: t.actions.delete, destructive: true, onPress: () => { setDeletingGroup(actionGroup); setActionGroup(null); } },
          ]}
          onClose={() => setActionGroup(null)}
        />
      )}

      {renamingGroup && (
        <PromptModal
          title={t.prompts.renameGroup}
          initialValue={renamingGroup}
          onConfirm={handleRename}
          onCancel={() => setRenamingGroup(null)}
        />
      )}

      {deletingGroup && (
        <ConfirmModal
          title={t.prompts.deleteGroup.replace('{name}', deletingGroup)}
          confirmLabel={t.actions.delete}
          destructive
          onConfirm={handleDelete}
          onCancel={() => setDeletingGroup(null)}
        />
      )}
    </div>
  );
};
