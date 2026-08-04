import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { success } from '../common/api-response';
import { CurrentUser, AuthUser } from './current-user.decorator';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return success(await this.authService.register(dto), '注册成功');
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return success(await this.authService.login(dto), '登录成功');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    return success(await this.authService.profile(user.id));
  }
}
