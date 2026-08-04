import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1785715200000 implements MigrationInterface {
  name = 'InitialSchema1785715200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`sys_users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(50) NOT NULL UNIQUE,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(20) NOT NULL DEFAULT 'USER',
        \`exam_date\` DATE NOT NULL DEFAULT '2026-10-24',
        \`plan_start_date\` DATE NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(`
      CREATE TABLE \`exam_papers\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`title\` VARCHAR(100) NOT NULL,
        \`subject\` ENUM('POLITICS', 'ENGLISH', 'MATH') NOT NULL,
        \`year\` INT NOT NULL,
        \`total_score\` INT NOT NULL DEFAULT 150,
        \`time_limit_mins\` INT NOT NULL DEFAULT 150,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_paper_subject_year\` (\`subject\`, \`year\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(`
      CREATE TABLE \`exam_questions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`paper_id\` INT NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`subject\` ENUM('POLITICS', 'ENGLISH', 'MATH') NOT NULL,
        \`year\` INT NOT NULL,
        \`question_type\` VARCHAR(20) NOT NULL,
        \`point_tag\` VARCHAR(50) NOT NULL,
        \`content\` TEXT NOT NULL,
        \`options_json\` JSON NULL,
        \`answer\` TEXT NOT NULL,
        \`score\` INT NOT NULL DEFAULT 5,
        INDEX \`idx_subject_tag\` (\`subject\`, \`point_tag\`),
        INDEX \`idx_paper_id\` (\`paper_id\`),
        FULLTEXT INDEX \`ft_search\` (\`content\`, \`point_tag\`),
        CONSTRAINT \`fk_questions_paper\` FOREIGN KEY (\`paper_id\`) REFERENCES \`exam_papers\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(`
      CREATE TABLE \`daily_tasks\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`day_number\` INT NOT NULL,
        \`task_date\` DATE NOT NULL,
        \`subject\` ENUM('POLITICS', 'ENGLISH', 'MATH') NOT NULL,
        \`content\` TEXT NOT NULL,
        \`target_tag\` VARCHAR(50) NULL,
        \`is_completed\` TINYINT(1) NOT NULL DEFAULT 0,
        \`completed_at\` DATETIME NULL,
        UNIQUE KEY \`uq_task_user_day_subject\` (\`user_id\`, \`day_number\`, \`subject\`),
        CONSTRAINT \`fk_tasks_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(`
      CREATE TABLE \`user_mistakes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`question_id\` INT NOT NULL,
        \`user_notes\` TEXT NULL,
        \`mastery_level\` INT NOT NULL DEFAULT 0,
        \`next_review_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`review_count\` INT NOT NULL DEFAULT 0,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_user_question\` (\`user_id\`, \`question_id\`),
        INDEX \`idx_review_queue\` (\`user_id\`, \`next_review_at\`, \`mastery_level\`),
        CONSTRAINT \`fk_mistakes_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_mistakes_question\` FOREIGN KEY (\`question_id\`) REFERENCES \`exam_questions\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await queryRunner.query(`
      CREATE TABLE \`user_exam_records\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT NOT NULL,
        \`paper_id\` INT NOT NULL,
        \`user_answers_json\` JSON NOT NULL,
        \`objective_score\` INT NOT NULL DEFAULT 0,
        \`subjective_score\` INT NOT NULL DEFAULT 0,
        \`total_score\` INT NOT NULL DEFAULT 0,
        \`time_spent_secs\` INT NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_exam_records_user\` (\`user_id\`, \`created_at\`),
        CONSTRAINT \`fk_records_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_records_paper\` FOREIGN KEY (\`paper_id\`) REFERENCES \`exam_papers\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `user_exam_records`');
    await queryRunner.query('DROP TABLE IF EXISTS `user_mistakes`');
    await queryRunner.query('DROP TABLE IF EXISTS `daily_tasks`');
    await queryRunner.query('DROP TABLE IF EXISTS `exam_questions`');
    await queryRunner.query('DROP TABLE IF EXISTS `exam_papers`');
    await queryRunner.query('DROP TABLE IF EXISTS `sys_users`');
  }
}
