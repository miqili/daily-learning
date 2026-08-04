import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DailyTask } from '../entities/daily-task.entity';
import { User } from '../entities/user.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([DailyTask, User]), AuthModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
