import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('my_essays')
export class MyEssay {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ name: 'essay_type', type: 'varchar', length: 30, default: 'ARGUMENT' })
  essayType!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'word_count', default: 0 })
  wordCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
