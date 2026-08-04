import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EssayTemplate } from '../entities/essay-template.entity';
import { MyEssay } from '../entities/my-essay.entity';
import { EssaysController } from './essays.controller';
import { EssaysService } from './essays.service';

@Module({
  imports: [TypeOrmModule.forFeature([EssayTemplate, MyEssay]), AuthModule],
  controllers: [EssaysController],
  providers: [EssaysService],
})
export class EssaysModule {}
