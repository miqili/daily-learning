import { MigrationInterface, QueryRunner } from 'typeorm';

export class VocabExtras1785716500000 implements MigrationInterface {
  name = 'VocabExtras1785716500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('vocabulary_words', 'root'))) {
      await queryRunner.query('ALTER TABLE `vocabulary_words` ADD COLUMN `root` TEXT NULL AFTER `meaning`');
    }
    if (!(await queryRunner.hasColumn('vocabulary_words', 'synonyms_json'))) {
      await queryRunner.query('ALTER TABLE `vocabulary_words` ADD COLUMN `synonyms_json` JSON NULL AFTER `root`');
    }
    if (!(await queryRunner.hasColumn('vocabulary_words', 'antonyms_json'))) {
      await queryRunner.query('ALTER TABLE `vocabulary_words` ADD COLUMN `antonyms_json` JSON NULL AFTER `synonyms_json`');
    }
    if (!(await queryRunner.hasColumn('vocabulary_words', 'collocations_json'))) {
      await queryRunner.query('ALTER TABLE `vocabulary_words` ADD COLUMN `collocations_json` JSON NULL AFTER `antonyms_json`');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('vocabulary_words', 'collocations_json')) await queryRunner.query('ALTER TABLE `vocabulary_words` DROP COLUMN `collocations_json`');
    if (await queryRunner.hasColumn('vocabulary_words', 'antonyms_json')) await queryRunner.query('ALTER TABLE `vocabulary_words` DROP COLUMN `antonyms_json`');
    if (await queryRunner.hasColumn('vocabulary_words', 'synonyms_json')) await queryRunner.query('ALTER TABLE `vocabulary_words` DROP COLUMN `synonyms_json`');
    if (await queryRunner.hasColumn('vocabulary_words', 'root')) await queryRunner.query('ALTER TABLE `vocabulary_words` DROP COLUMN `root`');
  }
}
