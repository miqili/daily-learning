import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { StudyPlan } from '../entities/study-plan.entity';
import { KnowledgeItem } from '../entities/knowledge-item.entity';
import { Subject } from '../entities/subject.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';

@Module({
  imports: [TypeOrmModule.forFeature([StudyPlan, Subject, UserSettings, KnowledgeItem]), AuthModule],
  controllers: [PlanController],
  providers: [PlanService],
})
export class PlanModule {}
