import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaperProvenance1785716600000 implements MigrationInterface {
  name = 'PaperProvenance1785716600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `exam_papers` MODIFY COLUMN `source` VARCHAR(255) NULL");
    if (!(await queryRunner.hasColumn('exam_papers', 'source_url'))) await queryRunner.query("ALTER TABLE `exam_papers` ADD COLUMN `source_url` VARCHAR(500) NULL AFTER `source`");
    if (!(await queryRunner.hasColumn('exam_papers', 'source_type'))) await queryRunner.query("ALTER TABLE `exam_papers` ADD COLUMN `source_type` VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED' AFTER `source_url`");
    if (!(await queryRunner.hasColumn('exam_papers', 'is_complete'))) await queryRunner.query("ALTER TABLE `exam_papers` ADD COLUMN `is_complete` TINYINT(1) NOT NULL DEFAULT 0 AFTER `source_type`");
    if (!(await queryRunner.hasColumn('exam_papers', 'expected_question_count'))) await queryRunner.query("ALTER TABLE `exam_papers` ADD COLUMN `expected_question_count` INT NULL AFTER `is_complete`");
    if (!(await queryRunner.hasColumn('exam_papers', 'verification_notes'))) await queryRunner.query("ALTER TABLE `exam_papers` ADD COLUMN `verification_notes` TEXT NULL AFTER `expected_question_count`");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('exam_papers', 'verification_notes')) await queryRunner.query('ALTER TABLE `exam_papers` DROP COLUMN `verification_notes`');
    if (await queryRunner.hasColumn('exam_papers', 'expected_question_count')) await queryRunner.query('ALTER TABLE `exam_papers` DROP COLUMN `expected_question_count`');
    if (await queryRunner.hasColumn('exam_papers', 'is_complete')) await queryRunner.query('ALTER TABLE `exam_papers` DROP COLUMN `is_complete`');
    if (await queryRunner.hasColumn('exam_papers', 'source_type')) await queryRunner.query('ALTER TABLE `exam_papers` DROP COLUMN `source_type`');
    if (await queryRunner.hasColumn('exam_papers', 'source_url')) await queryRunner.query('ALTER TABLE `exam_papers` DROP COLUMN `source_url`');
    await queryRunner.query("ALTER TABLE `exam_papers` MODIFY COLUMN `source` VARCHAR(50) NULL");
  }
}
