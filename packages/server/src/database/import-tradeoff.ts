import { DataSource, EntityManager } from 'typeorm';
import { TradeoffItem } from '../entities/tradeoff-item.entity';
import { AppDataSource } from './data-source';
import {
  BUILTIN_TRADEOFF,
  TRADEOFF_SEED_DATE,
  TRADEOFF_SEED_ORIGIN,
  TRADEOFF_SUBJECT_ID_BY_USER,
} from './builtin-tradeoff';

/** 内置数据里出现过的全部补录日（批次一 2026-09-22、批次二 2026-09-23…），自检按集合比对。 */
const EXPECTED_DATES = Array.from(
  new Set(BUILTIN_TRADEOFF.map((entry) => entry.entryDate ?? TRADEOFF_SEED_DATE)),
).sort();

/** 灌库目标账号：demo(1) 与 lyq(4)，两套 subject_id 不同。 */
const TARGET_USER_IDS = [1, 4];

export interface TradeoffSyncResult {
  user: number;
  subjectId: number;
  removed: number;
  inserted: number;
}

export interface TradeoffSyncSummary {
  results: TradeoffSyncResult[];
  total: number;
}

/**
 * 把首次补录内容灌进 tradeoff_items（幂等）。
 *
 * 幂等策略与必背考点模块**刻意不同**：那里按 origin 先删后插是安全的，因为内置数据是完整快照；
 * 这里台账是逐日追加的流水，如果按 user+subject 全删，会把用户自己补录的内容一起清掉。
 * 所以只删 `origin = 'tradeoff-seed'` 的行 —— 用户手动补录的条目 origin 为 NULL，天然不受影响。
 */
export async function syncTradeoff(dataSource: DataSource): Promise<TradeoffSyncSummary> {
  const results: TradeoffSyncResult[] = [];

  for (const userId of TARGET_USER_IDS) {
    const subjectId = TRADEOFF_SUBJECT_ID_BY_USER[userId];
    if (!subjectId) continue;

    const removed = await removeSeeded(dataSource.manager, userId, subjectId);

    const rows = BUILTIN_TRADEOFF.map((entry) =>
      dataSource.manager.create(TradeoffItem, {
        userId,
        subjectId,
        bucket: entry.bucket,
        entryDate: entry.entryDate ?? TRADEOFF_SEED_DATE,
        title: entry.title,
        content: entry.content,
        source: entry.source,
        keywords: entry.keywords,
        status: entry.status,
        important: entry.important ? 1 : 0,
        // 掌握度是学习状态，属于用户自己的进度，不随灌库重置为「已掌握」。
        // 首次灌库一律 0（未标记），由用户在页面上自己标「不熟 / 已掌握」。
        mastery: 0,
        sortOrder: entry.sortOrder,
        origin: TRADEOFF_SEED_ORIGIN,
      }),
    );

    await dataSource.manager.save(rows);
    results.push({ user: userId, subjectId, removed, inserted: rows.length });
  }

  return { results, total: results.reduce((sum, r) => sum + r.inserted, 0) };
}

async function removeSeeded(manager: EntityManager, userId: number, subjectId: number): Promise<number> {
  const found = await manager
    .createQueryBuilder(TradeoffItem, 'item')
    .select('item.id', 'id')
    .where('item.userId = :userId', { userId })
    .andWhere('item.subjectId = :subjectId', { subjectId })
    .andWhere('item.origin = :origin', { origin: TRADEOFF_SEED_ORIGIN })
    .getRawMany<{ id: number }>();

  if (!found.length) return 0;
  await manager.delete(TradeoffItem, found.map((r) => r.id));
  return found.length;
}

/** 灌库后自检：条数与桶分布是否和内置数据一致。 */
export async function verifyTradeoff(dataSource: DataSource): Promise<string[]> {
  const problems: string[] = [];
  const expected = BUILTIN_TRADEOFF.length;
  const expectedByBucket = BUILTIN_TRADEOFF.reduce<Record<string, number>>((acc, e) => {
    acc[e.bucket] = (acc[e.bucket] ?? 0) + 1;
    return acc;
  }, {});

  for (const userId of TARGET_USER_IDS) {
    const subjectId = TRADEOFF_SUBJECT_ID_BY_USER[userId];
    if (!subjectId) continue;

    const rows = await dataSource.manager.find(TradeoffItem, {
      where: { userId, subjectId, origin: TRADEOFF_SEED_ORIGIN },
    });

    if (rows.length !== expected) {
      problems.push(`user=${userId} 期望 ${expected} 条，实际 ${rows.length} 条`);
    }

    const actualByBucket = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.bucket] = (acc[r.bucket] ?? 0) + 1;
      return acc;
    }, {});
    for (const [bucket, count] of Object.entries(expectedByBucket)) {
      if (actualByBucket[bucket] !== count) {
        problems.push(`user=${userId} bucket=${bucket} 期望 ${count} 条，实际 ${actualByBucket[bucket] ?? 0} 条`);
      }
    }

    // 条目日期必须落在内置数据声明过的批次里，且每个批次的条数与内置数据一致，
    // 否则页面的「每日流水」会散掉。多日期是正常的（批次一 2026-09-22 / 批次二 2026-09-23）。
    const expectedByDate = BUILTIN_TRADEOFF.reduce<Record<string, number>>((acc, e) => {
      const date = e.entryDate ?? TRADEOFF_SEED_DATE;
      acc[date] = (acc[date] ?? 0) + 1;
      return acc;
    }, {});
    const actualByDate = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.entryDate] = (acc[r.entryDate] ?? 0) + 1;
      return acc;
    }, {});

    for (const date of EXPECTED_DATES) {
      if (actualByDate[date] !== expectedByDate[date]) {
        problems.push(
          `user=${userId} 补录日 ${date} 期望 ${expectedByDate[date]} 条，实际 ${actualByDate[date] ?? 0} 条`,
        );
      }
    }
    const unknownDates = Object.keys(actualByDate).filter((d) => !EXPECTED_DATES.includes(d));
    if (unknownDates.length) {
      problems.push(`user=${userId} 出现内置数据里没有的补录日：${unknownDates.join(', ')}`);
    }
  }

  return problems;
}

async function run() {
  await AppDataSource.initialize();
  const summary = await syncTradeoff(AppDataSource);
  const problems = await verifyTradeoff(AppDataSource);

  for (const r of summary.results) {
    console.log(`[考点增补] user=${r.user} subject_id=${r.subjectId} 清理 ${r.removed} 条 → 写入 ${r.inserted} 条`);
  }
  console.log(`[考点增补] 合共写入 ${summary.total} 条（补录日 ${EXPECTED_DATES.join(' / ')}）`);

  if (problems.length) {
    problems.forEach((p) => console.error(`[自检失败] ${p}`));
    process.exitCode = 1;
  } else {
    console.log('[自检通过] 条数、桶分布、补录日均与内置数据一致');
  }

  await AppDataSource.destroy();
}

run().catch(async (error: unknown) => {
  console.error(error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exitCode = 1;
});
