import { Exercise } from '../../types';
import { getLanguage, translations } from '../../utils/translations';

/**
 * Default muscle groups. Edit this array to change the groups that are seeded
 * for new users or after a data reset.
 */
export const DEFAULT_MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Cuádriceps',
  'Femoral',
  'Glúteo',
  'Hombro',
  'Bíceps',
  'Tríceps',
  'Abdominales',
  'Cardio',
  'Otro',
];

export function getDefaultMuscleGroups(): string[] {
  return [...DEFAULT_MUSCLE_GROUPS];
}

/**
 * Default exercises. Edit the seed array below to change the exercises that are
 * created for new users or after a data reset.
 */
export function getDefaultExercises(): Exercise[] {
  const lang = getLanguage();
  const names = translations[lang].seedExercises;
  const seed: Array<{ key: keyof typeof names; group: string }> = [
    { key: 'benchPress', group: 'Pecho' },
    { key: 'inclinePress', group: 'Pecho' },
    { key: 'chestFly', group: 'Pecho' },
    { key: 'dips', group: 'Pecho' },
    { key: 'latPulldown', group: 'Espalda' },
    { key: 'barbellRow', group: 'Espalda' },
    { key: 'deadlift', group: 'Espalda' },
    { key: 'facePull', group: 'Espalda' },
    { key: 'squat', group: 'Cuádriceps' },
    { key: 'legPress', group: 'Cuádriceps' },
    { key: 'legExtension', group: 'Cuádriceps' },
    { key: 'legCurl', group: 'Femoral' },
    { key: 'romanianDeadlift', group: 'Femoral' },
    { key: 'goodMorning', group: 'Femoral' },
    { key: 'hipThrust', group: 'Glúteo' },
    { key: 'bulgarianSplitSquat', group: 'Glúteo' },
    { key: 'gluteKickback', group: 'Glúteo' },
    { key: 'militaryPress', group: 'Hombro' },
    { key: 'lateralRaise', group: 'Hombro' },
    { key: 'frontRaise', group: 'Hombro' },
    { key: 'barbellCurl', group: 'Bíceps' },
    { key: 'hammerCurl', group: 'Bíceps' },
    { key: 'inclineCurl', group: 'Bíceps' },
    { key: 'skullCrusher', group: 'Tríceps' },
    { key: 'tricepPushdown', group: 'Tríceps' },
    { key: 'tricepKickback', group: 'Tríceps' },
    { key: 'crunch', group: 'Abdominales' },
    { key: 'plank', group: 'Abdominales' },
    { key: 'legRaise', group: 'Abdominales' },
    { key: 'treadmill', group: 'Cardio' },
    { key: 'bike', group: 'Cardio' },
    { key: 'elliptical', group: 'Cardio' },
    { key: 'cableWristCurl', group: 'Otro' },
    { key: 'shrugs', group: 'Otro' },
  ];
  return seed.map(({ key, group }, index) => ({
    id: `seed_${index}_${String(key)}`,
    name: names[key],
    muscleGroup: group,
    logs: [],
  }));
}
