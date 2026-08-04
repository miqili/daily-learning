import { MigrationInterface, QueryRunner } from 'typeorm';

export class PersonalLearningSystem1785715300000 implements MigrationInterface {
  name = 'PersonalLearningSystem1785715300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `user_exam_records`');
    await queryRunner.query('DROP TABLE IF EXISTS `user_mistakes`');
    await queryRunner.query('DROP TABLE IF EXISTS `daily_tasks`');
    await queryRunner.query('DROP TABLE IF EXISTS `exam_questions`');
    await queryRunner.query('DROP TABLE IF EXISTS `exam_papers`');

    await queryRunner.query(`
      ALTER TABLE \`sys_users\`
        DROP COLUMN \`exam_date\`,
        DROP COLUMN \`plan_start_date\`
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_settings\` (
        \`user_id\` INT PRIMARY KEY,
        \`exam_date\` DATE NULL,
        \`daily_word_target\` INT NOT NULL DEFAULT 20,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_settings_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`subjects\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`name\` VARCHAR(50) NOT NULL,
        \`color\` VARCHAR(20) NOT NULL DEFAULT '#2563EB',
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_user_subject\` (\`user_id\`, \`name\`),
        CONSTRAINT \`fk_subjects_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`knowledge_items\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`subject_id\` INT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`content\` TEXT NOT NULL,
        \`item_type\` VARCHAR(20) NOT NULL DEFAULT 'NOTE',
        \`tags\` JSON NULL,
        \`source\` VARCHAR(200) NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_knowledge_user\` (\`user_id\`, \`subject_id\`),
        FULLTEXT INDEX \`ft_knowledge\` (\`title\`, \`content\`),
        CONSTRAINT \`fk_knowledge_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_knowledge_subject\` FOREIGN KEY (\`subject_id\`) REFERENCES \`subjects\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`mistakes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`subject_id\` INT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`content\` TEXT NOT NULL,
        \`correct_answer\` TEXT NULL,
        \`user_answer\` TEXT NULL,
        \`error_reason\` VARCHAR(20) NOT NULL DEFAULT 'OTHER',
        \`analysis\` TEXT NULL,
        \`tags\` JSON NULL,
        \`mastery_level\` INT NOT NULL DEFAULT 0,
        \`next_review_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`review_count\` INT NOT NULL DEFAULT 0,
        \`source\` VARCHAR(100) NULL,
        \`notes\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_mistake_review\` (\`user_id\`, \`next_review_at\`, \`mastery_level\`),
        CONSTRAINT \`fk_mistakes_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_mistakes_subject\` FOREIGN KEY (\`subject_id\`) REFERENCES \`subjects\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`vocabulary_decks\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`description\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_decks_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`vocabulary_words\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`deck_id\` INT NOT NULL,
        \`word\` VARCHAR(100) NOT NULL,
        \`phonetic\` VARCHAR(100) NULL,
        \`meaning\` TEXT NOT NULL,
        \`example_sentence\` TEXT NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        CONSTRAINT \`fk_words_deck\` FOREIGN KEY (\`deck_id\`) REFERENCES \`vocabulary_decks\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`vocabulary_progress\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`word_id\` INT NOT NULL,
        \`mastery_level\` INT NOT NULL DEFAULT 0,
        \`next_review_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`review_count\` INT NOT NULL DEFAULT 0,
        \`last_reviewed_at\` DATETIME NULL,
        UNIQUE KEY \`uq_user_word\` (\`user_id\`, \`word_id\`),
        CONSTRAINT \`fk_progress_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_progress_word\` FOREIGN KEY (\`word_id\`) REFERENCES \`vocabulary_words\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`study_plans\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`plan_date\` DATE NOT NULL,
        \`subject_id\` INT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`description\` TEXT NULL,
        \`task_type\` VARCHAR(20) NOT NULL DEFAULT 'STUDY',
        \`is_completed\` TINYINT(1) NOT NULL DEFAULT 0,
        \`completed_at\` DATETIME NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_plan_user_date\` (\`user_id\`, \`plan_date\`),
        CONSTRAINT \`fk_plans_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_plans_subject\` FOREIGN KEY (\`subject_id\`) REFERENCES \`subjects\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`study_sessions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`subject_id\` INT NULL,
        \`activity_type\` VARCHAR(20) NOT NULL,
        \`duration_secs\` INT NOT NULL,
        \`notes\` TEXT NULL,
        \`recorded_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_sessions_user\` (\`user_id\`, \`recorded_at\`),
        CONSTRAINT \`fk_sessions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_sessions_subject\` FOREIGN KEY (\`subject_id\`) REFERENCES \`subjects\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `study_sessions`');
    await queryRunner.query('DROP TABLE IF EXISTS `study_plans`');
    await queryRunner.query('DROP TABLE IF EXISTS `vocabulary_progress`');
    await queryRunner.query('DROP TABLE IF EXISTS `vocabulary_words`');
    await queryRunner.query('DROP TABLE IF EXISTS `vocabulary_decks`');
    await queryRunner.query('DROP TABLE IF EXISTS `mistakes`');
    await queryRunner.query('DROP TABLE IF EXISTS `knowledge_items`');
    await queryRunner.query('DROP TABLE IF EXISTS `subjects`');
    await queryRunner.query('DROP TABLE IF EXISTS `user_settings`');
  }
}
