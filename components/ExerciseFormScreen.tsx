import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '../hooks/useAppData';
import { storageManager } from '../services/storageService';
import { makeId } from '../services/storageService';
import { useTranslations } from '../utils/translations';
import { BackButton } from './ui/BackButton';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { MuscleGroupPicker } from './ui/MuscleGroupPicker';

export const ExerciseFormScreen: React.FC = () => {
  const t = useTranslations();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { exercises, muscleGroups, refresh } = useAppData();

  const existingExercise = id ? exercises.find((e) => e.id === id) : undefined;
  const isEdit = !!existingExercise;

  const [name, setName] = useState(existingExercise?.name ?? '');
  const [group, setGroup] = useState(existingExercise?.muscleGroup ?? muscleGroups[0] ?? '');

  useEffect(() => {
    if (existingExercise) {
      setName(existingExercise.name);
      setGroup(existingExercise.muscleGroup);
    }
  }, [existingExercise]);

  useEffect(() => {
    if (!isEdit && muscleGroups.length > 0 && !group) {
      setGroup(muscleGroups[0]);
    }
  }, [isEdit, muscleGroups, group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (isEdit && existingExercise) {
      await storageManager.updateExerciseDetails(existingExercise.id, trimmedName, group);
      await refresh();
      navigate(`/exercises/${existingExercise.id}`, { replace: true });
    } else {
      const newExercise = {
        id: makeId('exercise'),
        name: trimmedName,
        muscleGroup: group,
        logs: [],
      };
      await storageManager.saveExercise(newExercise);
      await refresh();
      navigate(`/exercises/${newExercise.id}`);
    }
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="mb-6">
        <BackButton label={t.labels.home} onClick={() => navigate(-1)} />
      </div>

      <h2 className="text-2xl font-bold text-app-text">
        {isEdit ? t.labels.editExercise : t.labels.newExercise}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-app-text-muted">{t.labels.name}</label>
          <Input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Bench Press"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-app-text-muted">{t.labels.muscleGroup}</label>
          <MuscleGroupPicker
            groups={muscleGroups}
            selected={group}
            onSelect={setGroup}
            maxHeightClass="max-h-[40vh]"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            {t.actions.cancel}
          </Button>
          <Button
            type="submit"
            disabled={!name.trim()}
            className="flex-1"
          >
            {t.actions.save}
          </Button>
        </div>
      </form>
    </div>
  );
};
