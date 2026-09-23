import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 「取舍台账」模块：新建 tradeoff_items 表。
 *
 * 为什么单独开表而不复用 knowledge_items：
 * - knowledge_items 存「背什么」的稳定内容，灌库策略是「按 origin 先删后插全量重灌」；
 * - 本表存「每天补了什么」的时间流水，行要能独立增删改、要带 entry_date 与 status。
 *   若混入 knowledge_items，全量重灌会连带清掉用户当天刚补的条目。
 *
 * 用 information_schema 做存在性判断，重复执行安全。
 */
export class TradeoffLedger1789650000000 implements MigrationInterface {
  name = 'TradeoffLedger1789650000000';

  private async hasTable(queryRunner: QueryRunner): Promise<boolean> {
    const rows: { n: number }[] = await queryRunner.query(
      `SELECT COUNT(*) AS n FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'tradeoff_items'`,
    );
    return Number(rows[0]?.n ?? 0) > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasTable(queryRunner)) return;

    await queryRunner.query(`
      CREATE TABLE \`tradeoff_items\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`subject_id\` INT NULL,
        \`bucket\` VARCHAR(20) NOT NULL COMMENT '四桶：xigai/shizheng/zhexue/maozhongte',
        \`entry_date\` DATE NOT NULL COMMENT '补录归属日',
        \`title\` VARCHAR(200) NOT NULL,
        \`content\` TEXT NOT NULL,
        \`source\` VARCHAR(300) NULL COMMENT '出处，需可回溯',
        \`keywords\` VARCHAR(300) NULL COMMENT '关键词，逗号分隔',
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT 'pending/done/verified',
        \`important\` TINYINT NOT NULL DEFAULT 0 COMMENT '重点标记',
        \`sort_order\` INT NULL COMMENT '桶内展示顺序',
        \`origin\` VARCHAR(32) NULL COMMENT '来源标记：tradeoff-seed=内置灌库，NULL=用户补录',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`idx_tradeoff_user_subject\` (\`user_id\`, \`subject_id\`, \`bucket\`, \`entry_date\`),
        KEY \`idx_tradeoff_entry_date\` (\`entry_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='取舍台账：每日补录流水'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `tradeoff_items`');
  }
}
