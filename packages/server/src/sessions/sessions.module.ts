import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { StudySession } from '../entities/study-session.entity';
import { Subject } from '../entities/subject.entity';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([StudySession, Subject]), AuthModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
