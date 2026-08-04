import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VocabularyDeck } from './vocabulary-deck.entity';
import { VocabularyWord } from './vocabulary-word.entity';

@Entity('vocabulary_phrases')
export class VocabularyPhrase {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'deck_id', type: 'int', nullable: true })
  deckId!: number | null;

  @ManyToOne(() => VocabularyDeck, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deck_id' })
  deck!: VocabularyDeck | null;

  @Column({ name: 'word_id', type: 'int', nullable: true })
  wordId!: number | null;

  @ManyToOne(() => VocabularyWord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'word_id' })
  word!: VocabularyWord | null;

  @Column({ type: 'varchar', length: 200 })
  phrase!: string;

  @Column({ type: 'text', nullable: true })
  meaning!: string | null;

  @Column({ default: 1 })
  level!: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
