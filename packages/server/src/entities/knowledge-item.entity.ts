import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Subject } from './subject.entity';

@Entity('knowledge_items')
export class KnowledgeItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'subject_id', type: 'int', nullable: true })
  subjectId!: number | null;

  @ManyToOne(() => Subject, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject | null;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'item_type', length: 20, default: 'NOTE' })
  itemType!: string;

  @Column({ type: 'json', nullable: true })
  tags!: string[] | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  source!: string | null;

  /** 文档顺序。必背考点模块按它排序（先按章节、再按分组、再按组内顺序）。 */
  @Column({ name: 'sort_order', type: 'int', nullable: true })
  sortOrder!: number | null;

  /** 结构化附加数据：真题卡数组 / 音标点读 / LaTeX 原串等，避免为每种形态各开一列。 */
  @Column({ name: 'extra_json', type: 'json', nullable: true })
  extraJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
