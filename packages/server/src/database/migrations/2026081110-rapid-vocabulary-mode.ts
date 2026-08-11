import { MigrationInterface, QueryRunner } from 'typeorm';

export class RapidVocabularyMode1786407000000 implements MigrationInterface {
  name = 'RapidVocabularyMode1786407000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `vocabulary_progress` ADD COLUMN `learning_stage` VARCHAR(20) NULL AFTER `queue_completed_at`");
    await queryRunner.query('ALTER TABLE `vocabulary_progress` ADD COLUMN `same_day_attempts` INT NOT NULL DEFAULT 0 AFTER `learning_stage`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` ADD COLUMN `same_day_correct_count` INT NOT NULL DEFAULT 0 AFTER `same_day_attempts`');
    await queryRunner.query("ALTER TABLE `vocabulary_progress` ADD COLUMN `last_grade` VARCHAR(10) NULL AFTER `same_day_correct_count`");
    await queryRunner.query('ALTER TABLE `vocabulary_progress` ADD COLUMN `stable_review_count` INT NOT NULL DEFAULT 0 AFTER `last_grade`');
    await queryRunner.query("UPDATE `vocabulary_progress` SET `learning_stage` = CASE WHEN `queue_kind` = 'REVIEW' THEN 'REVIEW' WHEN `queue_completed_at` IS NOT NULL THEN 'TODAY_DONE' WHEN `queue_kind` = 'NEW' THEN 'INTRO' ELSE NULL END");
    await queryRunner.query('CREATE INDEX `idx_vocabulary_learning_flow` ON `vocabulary_progress` (`user_id`, `queue_date`, `learning_stage`, `queue_position`)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `idx_vocabulary_learning_flow` ON `vocabulary_progress`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` DROP COLUMN `stable_review_count`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` DROP COLUMN `last_grade`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` DROP COLUMN `same_day_correct_count`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` DROP COLUMN `same_day_attempts`');
    await queryRunner.query('ALTER TABLE `vocabulary_progress` DROP COLUMN `learning_stage`');
  }
}
