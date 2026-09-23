import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { TradeoffItem } from '../entities/tradeoff-item.entity';
import { TradeoffController } from './tradeoff.controller';
import { TradeoffService } from './tradeoff.service';

@Module({
  imports: [TypeOrmModule.forFeature([TradeoffItem]), AuthModule],
  controllers: [TradeoffController],
  providers: [TradeoffService],
  exports: [TradeoffService],
})
export class TradeoffModule {}
