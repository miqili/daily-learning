import { MigrationInterface, QueryRunner } from 'typeorm';

export class Essays1785715500000 implements MigrationInterface {
  name = 'Essays1785715500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`essay_templates\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`type\` VARCHAR(30) NOT NULL,
        \`title\` VARCHAR(100) NOT NULL,
        \`outline\` TEXT NULL,
        \`content\` TEXT NOT NULL,
        \`keywords\` TEXT NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_template_type\` (\`type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`my_essays\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`essay_type\` VARCHAR(30) NOT NULL DEFAULT 'ARGUMENT',
        \`content\` TEXT NOT NULL,
        \`word_count\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_essays_user\` (\`user_id\`, \`updated_at\`),
        CONSTRAINT \`fk_essays_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `my_essays`');
    await queryRunner.query('DROP TABLE IF EXISTS `essay_templates`');
  }
}
