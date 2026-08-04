import { MigrationInterface, QueryRunner } from 'typeorm';

export class PapersPassage1785716400000 implements MigrationInterface {
  name = 'PapersPassage1785716400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `exam_questions` ADD COLUMN `passage` TEXT NULL AFTER `content`');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `exam_questions` DROP COLUMN `passage`');
  }
}
