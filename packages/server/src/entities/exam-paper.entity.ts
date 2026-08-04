import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('exam_papers')
export class ExamPaper {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  subject!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
