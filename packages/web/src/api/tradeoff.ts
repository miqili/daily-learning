import { client, unwrap } from './client';
import type { TradeoffBucket, TradeoffMastery, TradeoffStatus } from '@shck/shared';

/** 考点增补条目。四桶的元数据（每年损失 / 可回收 / 时间窗）是方案常量，不入库，见 utils/tradeoffPlan.ts */
export interface TradeoffEntry {
  id: number;
  subject_id: number | null;
  subject: { id: number; name: string; color: string } | null;
  bucket: TradeoffBucket;
  /** 补录归属日 YYYY-MM-DD（管理维度） */
  entry_date: string;
  title: string;
  content: string;
  source: string | null;
  /** 服务端把逗号分隔的 keywords 拆成数组返回 */
  keywords: string[];
  /** 补录流程状态（管理维度） */
  status: TradeoffStatus;
  /** 历史字段，UI 已改用 mastery */
  important: boolean;
  /** 学习状态：0 未标记 / 1 不熟 / 2 已掌握 */
  mastery: TradeoffMastery;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface BucketMasteryStat {
  unseen: number;
  weak: number;
  mastered: number;
}

export interface BucketStat {
  total: number;
  pending: number;
  done: number;
  verified: number;
  important: number;
  mastery: BucketMasteryStat;
  lastEntryDate: string | null;
}

export interface TradeoffSummary {
  total: number;
  byBucket: Record<TradeoffBucket, BucketStat>;
  byStatus: Record<TradeoffStatus, number>;
  /** 未标记 / 不熟 / 已掌握 */
  byMastery: BucketMasteryStat;
  /** 不熟清单条数＝未标记 + 不熟 */
  unmastered: number;
  /** 有补录的天数 */
  days: number;
  firstEntryDate: string | null;
  lastEntryDate: string | null;
}

export interface TradeoffListResult {
  total: number;
  list: TradeoffEntry[];
  summary: TradeoffSummary;
}

export interface SearchTradeoffParams {
  subject_id?: number;
  bucket?: TradeoffBucket;
  status?: TradeoffStatus;
  entry_date?: string;
  /** '1' = 只看重点标记（历史字段） */
  important?: '1';
  /** 精确掌握度：'0' 未标记 / '1' 不熟 / '2' 已掌握 */
  mastery?: '0' | '1' | '2';
  /** '1' = 不熟清单（未标记 + 不熟） */
  unmastered?: '1';
  keyword?: string;
  limit?: number;
}

export const searchTradeoff = (params?: SearchTradeoffParams) =>
  unwrap<TradeoffListResult>(client.get('/tradeoff', { params }));

export const fetchTradeoffSummary = (subjectId?: number) =>
  unwrap<TradeoffSummary>(client.get('/tradeoff/summary', { params: subjectId ? { subject_id: subjectId } : {} }));

export const createTradeoffEntry = (payload: {
  subject_id?: number | null;
  bucket: TradeoffBucket;
  entry_date: string;
  title: string;
  content: string;
  source?: string | null;
  keywords?: string | null;
  status?: TradeoffStatus;
  important?: boolean;
  mastery?: TradeoffMastery;
  sort_order?: number | null;
}) => unwrap<TradeoffEntry>(client.post('/tradeoff', payload));

export const updateTradeoffEntry = (
  id: number,
  payload: Partial<{
    bucket: TradeoffBucket;
    entry_date: string;
    title: string;
    content: string;
    source: string | null;
    keywords: string | null;
    status: TradeoffStatus;
    important: boolean;
    mastery: TradeoffMastery;
    sort_order: number | null;
  }>,
) => unwrap<TradeoffEntry>(client.patch(`/tradeoff/${id}`, payload));

export const removeTradeoffEntry = (id: number) => unwrap<{ id: number }>(client.delete(`/tradeoff/${id}`));
