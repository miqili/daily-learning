import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { EssaysModule } from './essays/essays.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { MistakesModule } from './mistakes/mistakes.module';
import { PlanModule } from './plan/plan.module';
import { PapersModule } from './papers/papers.module';
import { SessionsModule } from './sessions/sessions.module';
import { SubjectsModule } from './subjects/subjects.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.get<string>('DB_HOST', '127.0.0.1'),
        port: Number(config.get<number>('DB_PORT', 3306)),
        username: config.get<string>('DB_USERNAME', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_DATABASE', 'sys'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    AuthModule,
    SubjectsModule,
    PlanModule,
    MistakesModule,
    KnowledgeModule,
    EssaysModule,
    PapersModule,
    VocabularyModule,
    SessionsModule,
  ],
})
export class AppModule {}
