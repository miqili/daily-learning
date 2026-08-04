import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('essay_templates')
export class EssayTemplate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 30 })
  type!: string;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  outline!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  keywords!: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
