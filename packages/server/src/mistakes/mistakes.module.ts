import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Mistake } from '../entities/mistake.entity';
import { MistakesController } from './mistakes.controller';
import { MistakesService } from './mistakes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mistake]), AuthModule],
  controllers: [MistakesController],
  providers: [MistakesService],
  exports: [MistakesService],
})
export class MistakesModule {}
