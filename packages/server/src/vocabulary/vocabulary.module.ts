import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { VocabularyDeck } from '../entities/vocabulary-deck.entity';
import { VocabularyPhrase } from '../entities/vocabulary-phrase.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { VocabularyProgress } from '../entities/vocabulary-progress.entity';
import { VocabularyWord } from '../entities/vocabulary-word.entity';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';

@Module({
  imports: [TypeOrmModule.forFeature([VocabularyDeck, VocabularyWord, VocabularyPhrase, VocabularyProgress, UserSettings]), AuthModule],
  controllers: [VocabularyController],
  providers: [VocabularyService],
  exports: [VocabularyService],
})
export class VocabularyModule {}
