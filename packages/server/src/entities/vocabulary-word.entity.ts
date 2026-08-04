import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VocabularyDeck } from './vocabulary-deck.entity';

@Entity('vocabulary_words')
export class VocabularyWord {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'deck_id' })
  deckId!: number;

  @ManyToOne(() => VocabularyDeck, (deck) => deck.words, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deck_id' })
  deck!: VocabularyDeck;

  @Column({ length: 100 })
  word!: string;

  @Column({ default: 1 })
  level!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  phonetic!: string | null;

  @Column({ type: 'text' })
  meaning!: string;

  @Column({ name: 'example_sentence', type: 'text', nullable: true })
  exampleSentence!: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;
}
