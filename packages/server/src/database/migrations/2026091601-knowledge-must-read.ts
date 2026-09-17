import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 「必背考点」模块：给 knowledge_items 补两列。
 *
 * - sort_order：文档顺序（章节 → 分组 → 组内），模块页面按它排序。
 *   不能靠 created_at / id 排：search() 原本按 updatedAt DESC，顺序不稳定。
 * - extra_json：结构化附加数据。政治要存 162 张关联真题卡、英语要存音标与点读文本、
 *   数学要存 LaTeX 原串 —— 为每种形态各开一列不现实，统一塞 JSON。
 *
 * 两列都可空，既有 214 行个人笔记不受影响（保持 NULL，排在必背考点之后）。
 * 用 information_schema 做存在性判断，重复执行安全。
 */
export class KnowledgeMustRead1789570800000 implements MigrationInterface {
  name = 'KnowledgeMustRead1789570800000';

  private async hasColumn(queryRunner: QueryRunner, column: string): Promise<boolean> {
    const rows: { n: number }[] = await queryRunner.query(
      `SELECT COUNT(*) AS n FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'knowledge_items' AND column_name = ?`,
      [column],
    );
    return Number(rows[0]?.n ?? 0) > 0;
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'sort_order'))) {
      await queryRunner.query(
        "ALTER TABLE `knowledge_items` ADD COLUMN `sort_order` INT NULL COMMENT '文档顺序（必背考点模块）' AFTER `source`",
      );
    }
    if (!(await this.hasColumn(queryRunner, 'extra_json'))) {
      await queryRunner.query(
        'ALTER TABLE `knowledge_items` ADD COLUMN `extra_json` JSON NULL COMMENT \'结构化附加数据（真题卡/音标/LaTeX）\' AFTER `sort_order`',
      );
    }
    // 必背考点模块固定「按科目 + 文档顺序」取数，加一条覆盖索引
    await queryRunner.query(
      'CREATE INDEX `idx_knowledge_subject_sort` ON `knowledge_items` (`user_id`, `subject_id`, `sort_order`)',
    ).catch(() => undefined);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `idx_knowledge_subject_sort` ON `knowledge_items`').catch(() => undefined);
    await queryRunner.query('ALTER TABLE `knowledge_items` DROP COLUMN `extra_json`');
    await queryRunner.query('ALTER TABLE `knowledge_items` DROP COLUMN `sort_order`');
  }
}
