import { serializeBackup } from '../BackupSerializer';
import type { TrainingRepository } from '../../domain/TrainingRepository';

export class ExportBackup {
  constructor(private readonly repository: TrainingRepository) {}

  execute(): string {
    return serializeBackup(this.repository.getSnapshot());
  }
}
