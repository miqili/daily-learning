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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
