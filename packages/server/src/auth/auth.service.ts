import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DEFAULT_EXAM_DATE } from '@shck/shared';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Subject } from '../entities/subject.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { User } from '../entities/user.entity';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserSettings) private readonly settings: Repository<UserSettings>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const username = dto.username.trim();
    if (await this.users.existsBy({ username })) {
      throw new ConflictException('该用户名已被使用。');
    }
    const user = await this.users.save(
      this.users.create({
        username,
        passwordHash: await bcrypt.hash(dto.password, 12),
      }),
    );
    const examDate = dto.exam_date ?? DEFAULT_EXAM_DATE;
    await this.settings.save(this.settings.create({ userId: user.id, examDate }));
    // 注册即创建默认三科（理工类：政治 / 英语 / 高数一）
    const defaults = [
      { name: '政治', color: '#dc2626', sortOrder: 0 },
      { name: '英语', color: '#2563eb', sortOrder: 1 },
      { name: '高等数学（一）', color: '#16a34a', sortOrder: 2 },
    ];
    await this.subjects.save(defaults.map((s, i) => this.subjects.create({ userId: user.id, ...s, sortOrder: i })));
    return this.session(user, examDate);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOneBy({ username: dto.username.trim() });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('用户名或密码不正确。');
    }
    const settings = await this.settings.findOneBy({ userId: user.id });
    return this.session(user, settings?.examDate ?? DEFAULT_EXAM_DATE);
  }

  async profile(id: number) {
    const user = await this.users.findOneByOrFail({ id });
    const settings = await this.settings.findOneBy({ userId: id });
    return this.publicUser(user, settings?.examDate ?? DEFAULT_EXAM_DATE);
  }

  private session(user: User, examDate: string) {
    return {
      token: this.jwtService.sign({ id: user.id, username: user.username, role: user.role }),
      user: this.publicUser(user, examDate),
    };
  }

  private publicUser(user: User, examDate: string) {
    return { id: user.id, username: user.username, role: user.role, exam_date: examDate };
  }
}
