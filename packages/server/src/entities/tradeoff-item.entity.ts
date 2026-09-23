import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Subject } from './subject.entity';

/**
 * 考点增补条目。
 *
 * 「取舍」＝把客观题里背不到的那部分（实测每年约 12 题）按「可回收性」分桶，
 * 每桶在不同时间点补录不同性质的内容。本表存的就是每日补录的流水，
 * 而四桶的元数据（每年损失 / 可回收 / 时间窗）是方案常量，不入库。
 *
 * 与 knowledge_items 刻意的区别：
 * - knowledge_items 是「背什么」的稳定内容（必背考点，先删后插全量重灌）；
 * - 本表是「补什么」的时间流水（每天增量，带 entry_date / status），
 *   两者混在一张表里会让「按天看今天补了什么」变得很别扭。
 */
@Entity('tradeoff_items')
export class TradeoffItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'subject_id', type: 'int', nullable: true })
  subjectId!: number | null;

  @ManyToOne(() => Subject, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject | null;

  /** 四桶之一：xigai / shizheng / zhexue / maozhongte（见 @shck/shared TRADEOFF_BUCKETS） */
  @Column({ length: 20 })
  bucket!: string;

  /** 补录归属日。同一天多次补录用同一日期，页面按它做「每日流水」与倒计时进度。 */
  @Column({ name: 'entry_date', type: 'date' })
  entryDate!: string;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  /** 出处（媒体名 + 日期 / 文件全称），考场上要能回溯核对，不允许空泛写「网上」。 */
  @Column({ type: 'varchar', length: 300, nullable: true })
  source!: string | null;

  /** 关键词，逗号分隔。考场只求「眼熟」，靠它做快速检索。 */
  @Column({ type: 'varchar', length: 300, nullable: true })
  keywords!: string | null;

  /** pending=采集位已立待补录 / done=已录入 / verified=已复核 */
  @Column({ length: 16, default: 'pending' })
  status!: string;

  /** 重点标记：反复三遍仍记不住的，考前一天只看这些。（历史列，UI 已改用 mastery，保留不动） */
  @Column({ type: 'tinyint', default: 0 })
  important!: number;

  /**
   * 掌握度（学习状态，与**补录流程**的 status 正交）：
   * 0=未标记（默认）/ 1=不熟 / 2=已掌握。
   * 用三态而非布尔，是因为「未标记」与「已掌握」必须分开：
   * 若用 0/1 硬套，新灌进来的条目会默认显示成「已掌握」，是假状态。
   */
  @Column({ type: 'tinyint', default: 0 })
  mastery!: number;

  /** 同桶内的展示顺序（桶内按它升序，再按 entry_date 降序）。 */
  @Column({ name: 'sort_order', type: 'int', nullable: true })
  sortOrder!: number | null;

  /**
   * 数据来源标记。内置灌库的条目写 'tradeoff-seed'，用户自己补录的留 NULL。
   * 幂等灌库只按此值先删后插，因此用户当天手动补录的条目不会被重灌覆盖。
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  origin!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
