import type { TrainingRepository } from '../../domain/TrainingRepository';
import { RoutineSharingService } from '../RoutineSharingService';

export class ShareRoutine {
  constructor(
    private readonly repository: TrainingRepository,
    private readonly sharing: RoutineSharingService
  ) {}

  execute(id: string): string | null {
    const snapshot = this.repository.getSnapshot();
    const routine = snapshot.routines.find((item) => item.id === id);
    return routine ? this.sharing.serialize(this.sharing.create(routine, snapshot.exercises)) : null;
  }
}
