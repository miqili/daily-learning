import { MigrationInterface, QueryRunner } from 'typeorm';

export class VocabularyLevelsPhrases1785715400000 implements MigrationInterface {
  name = 'VocabularyLevelsPhrases1785715400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `vocabulary_words` ADD COLUMN `level` INT NOT NULL DEFAULT 1');
    await queryRunner.query(`
      CREATE TABLE \`vocabulary_phrases\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`deck_id\` INT NULL,
        \`word_id\` INT NULL,
        \`phrase\` VARCHAR(200) NOT NULL,
        \`meaning\` TEXT NULL,
        \`level\` INT NOT NULL DEFAULT 1,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_phrase_user\` (\`user_id\`, \`level\`),
        CONSTRAINT \`fk_phrases_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_phrases_deck\` FOREIGN KEY (\`deck_id\`) REFERENCES \`vocabulary_decks\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_phrases_word\` FOREIGN KEY (\`word_id\`) REFERENCES \`vocabulary_words\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `vocabulary_phrases`');
    await queryRunner.query('ALTER TABLE `vocabulary_words` DROP COLUMN `level`');
  }
}
