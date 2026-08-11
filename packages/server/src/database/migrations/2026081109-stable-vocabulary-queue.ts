import { MigrationInterface, QueryRunner } from 'typeorm';

export class StableVocabularyQueue1786406400000 implements MigrationInterface {
  name = 'StableVocabularyQueue1786406400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `user_settings` ADD COLUMN `study_availability_json` JSON NULL AFTER `daily_word_target`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` ADD COLUMN `queue_date` DATE NULL AFTER `last_reviewed_at`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` ADD COLUMN `queue_kind` VARCHAR(10) NULL AFTER `queue_date`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` ADD COLUMN `queue_position` INT NULL AFTER `queue_kind`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` ADD COLUMN `queue_completed_at` DATETIME NULL AFTER `queue_position`');
    await queryRunner.query('CREATE INDEX `idx_vocabulary_daily_queue` ON `vocabulary_progress` (`user_id`, `queue_date`, `queue_completed_at`, `queue_position`)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `idx_vocabulary_daily_queue` ON `vocabulary_progress`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` DROP COLUMN `queue_completed_at`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` DROP COLUMN `queue_position`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` DROP COLUMN `queue_kind`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` DROP COLUMN `queue_date`');
    await queryRunner.query('ALTER TABLE `user_settings` DROP COLUMN `study_availability_json`');
  }
}
