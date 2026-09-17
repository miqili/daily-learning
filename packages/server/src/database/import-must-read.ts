import { DataSource, EntityManager } from 'typeorm';
import { KnowledgeItem } from '../entities/knowledge-item.entity';
import { AppDataSource } from './data-source';
import {
  BUILTIN_MUST_READ,
  MUST_READ_ORIGIN,
  MUST_READ_SUBJECT_ID_BY_USER,
} from './builtin-must-read';

/** 迁移目标账号：demo(1) 与 lyq(4)，两套 subject_id 不同。 */
const TARGET_USER_IDS = [1, 4];

export interface MustReadSyncResult {
  user: number;
  subject: string;
  subjectId: number;
  removed: number;
  inserted: number;
}

export interface MustReadSyncSummary {
  results: MustReadSyncResult[];
  total: number;
}

/**
 * 把内置必背考点灌进 knowledge_items（幂等）。
 *
 * 幂等策略：按 extra_json.origin = 'sprint5w' 精确圈定「本次迁移产出的条目」，
 * 先删后插。用户自己写的 NOTE 条目完全不受影响，重复跑结果一致 —— 因为
 * 内置数据本身就是权威版本的完整快照（HTML 抽取产物），先删后插反而能保证
 * 「库里的内容 == 抽取源的内容」，不会残留上一版已删掉的条目。
 */
export async function syncMustRead(dataSource: DataSource): Promise<MustReadSyncSummary> {
  const results: MustReadSyncResult[] = [];

  for (const subject of BUILTIN_MUST_READ) {
    for (const userId of TARGET_USER_IDS) {
      const subjectId = MUST_READ_SUBJECT_ID_BY_USER[userId]?.[subject.subjectName];
      if (!subjectId) continue;

      const removed = await removeExisting(dataSource.manager, userId, subjectId);

      const rows = subject.items.map((item) =>
        dataSource.manager.create(KnowledgeItem, {
          userId,
          subjectId,
          title: item.title,
          content: item.content,
          itemType: item.itemType,
          tags: item.tags,
          source: item.source,
          sortOrder: item.sortOrder,
          extraJson: item.extra,
        }),
      );

      // 分批写，避免单次事务里塞太多行
      const CHUNK = 120;
      for (let i = 0; i < rows.length; i += CHUNK) {
        await dataSource.manager.save(rows.slice(i, i + CHUNK));
      }

      results.push({
        user: userId,
        subject: subject.display,
        subjectId,
        removed,
        inserted: rows.length,
      });
    }
  }

  return { results, total: results.reduce((sum, r) => sum + r.inserted, 0) };
}

async function removeExisting(manager: EntityManager, userId: number, subjectId: number): Promise<number> {
  const found = await manager
    .createQueryBuilder(KnowledgeItem, 'item')
    .select('item.id', 'id')
    .where('item.userId = :userId', { userId })
    .andWhere('item.subjectId = :subjectId', { subjectId })
    .andWhere("JSON_UNQUOTE(JSON_EXTRACT(item.extraJson, '$.origin')) = :origin", { origin: MUST_READ_ORIGIN })
    .getRawMany<{ id: number }>();

  if (!found.length) return 0;
  await manager.delete(KnowledgeItem, found.map((r) => r.id));
  return found.length;
}

/** 灌库后自检：条数与科目归属是否和内置数据一致。 */
export async function verifyMustRead(dataSource: DataSource): Promise<string[]> {
  const problems: string[] = [];

  for (const subject of BUILTIN_MUST_READ) {
    const expected = subject.items.length;
    for (const userId of TARGET_USER_IDS) {
      const subjectId = MUST_READ_SUBJECT_ID_BY_USER[userId]?.[subject.subjectName];
      if (!subjectId) continue;

      const actual = await dataSource.manager
        .createQueryBuilder(KnowledgeItem, 'item')
        .where('item.userId = :userId', { userId })
        .andWhere('item.subjectId = :subjectId', { subjectId })
        .andWhere("JSON_UNQUOTE(JSON_EXTRACT(item.extraJson, '$.origin')) = :origin", { origin: MUST_READ_ORIGIN })
        .getCount();

      if (actual !== expected) {
        problems.push(`user=${userId} ${subject.display}(subject_id=${subjectId}) 期望 ${expected} 条，实际 ${actual} 条`);
      }
    }
  }

  return problems;
}

async function run() {
  await AppDataSource.initialize();
  const summary = await syncMustRead(AppDataSource);
  const problems = await verifyMustRead(AppDataSource);

  for (const r of summary.results) {
    console.log(`[必背考点] user=${r.user} ${r.subject}(subject_id=${r.subjectId}) 清理 ${r.removed} 条 → 写入 ${r.inserted} 条`);
  }
  console.log(`[必背考点] 合共写入 ${summary.total} 条`);

  if (problems.length) {
    problems.forEach((p) => console.error(`[自检失败] ${p}`));
    process.exitCode = 1;
  } else {
    console.log('[自检通过] 各科目条数与内置数据一致');
  }

  await AppDataSource.destroy();
}

run().catch(async (error: unknown) => {
  console.error(error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
