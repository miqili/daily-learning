import { MigrationInterface, QueryRunner } from 'typeorm';

export class Papers1785715600000 implements MigrationInterface {
  name = 'Papers1785715600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`exam_papers\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`subject\` VARCHAR(50) NOT NULL,
        \`year\` INT NOT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`source\` VARCHAR(50) NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_paper_subject_year\` (\`subject\`, \`year\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`exam_questions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`paper_id\` INT NOT NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`content\` TEXT NOT NULL,
        \`options_json\` JSON NULL,
        \`answer\` TEXT NULL,
        \`score\` INT NOT NULL DEFAULT 5,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_questions_paper\` (\`paper_id\`, \`sort_order\`),
        CONSTRAINT \`fk_questions_paper\` FOREIGN KEY (\`paper_id\`) REFERENCES \`exam_papers\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `exam_questions`');
    await queryRunner.query('DROP TABLE IF EXISTS `exam_papers`');
  }
}
