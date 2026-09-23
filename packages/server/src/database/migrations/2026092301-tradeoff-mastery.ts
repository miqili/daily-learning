import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 考点增补 · 增加「掌握度」列，把这张表从「补录台账」变成能承载学习状态的表。
 *
 * 为什么需要单独一列（而不是复用 important / status）：
 * - `important` 只有一个布尔位，表达不了「未标记 / 不熟 / 已掌握」三态。
 *   若强行用 0/1 表示「不熟 / 已掌握」，新灌的条目会被默认显示成「已掌握」，是假状态。
 * - `status`(pending/done/verified) 是**补录流程**状态（这条内容录全了没有），
 *   与「我背下来了没有」是两个正交的维度，混用会让两者都读不准。
 *
 * 因此新增 `mastery`：0=未标记（默认）/ 1=不熟 / 2=已掌握。
 * `important` 保留不动（历史列，UI 已不再使用），不做破坏性删除。
 *
 * 用 information_schema 做存在性判断，重复执行安全。
 */
export class TradeoffMastery1789653600000 implements MigrationInterface {
  name = 'TradeoffMastery1789653600000';

  private async hasColumn(queryRunner: QueryRunner): Promise<boolean> {
    const rows: { n: number }[] = await queryRunner.query(
      `SELECT COUNT(*) AS n FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'tradeoff_items' AND column_name = 'mastery'`,
    );
    return Number(rows[0]?.n ?? 0) > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner)) return;
    await queryRunner.query(
      "ALTER TABLE `tradeoff_items` ADD COLUMN `mastery` TINYINT NOT NULL DEFAULT 0 COMMENT '0未标记/1不熟/2已掌握' AFTER `important`",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner))) return;
    await queryRunner.query('ALTER TABLE `tradeoff_items` DROP COLUMN `mastery`');
  }
}
