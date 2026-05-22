import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {
    // this.seedDefaultUser();
  }

  // Seed user mặc định với password đã hash
  async seedDefaultUser() {
    const existingUser = await this.userRepository.findOne({
      where: { username: 'admin' },
    });

    if (!existingUser) {
      const password = '111';
      const hashedPassword = await bcrypt.hash(password, 10);

      const defaultUser = this.userRepository.create({
        code: 'ADMIN001',
        name: 'Tuyết Vân',
        username: 'tuyetvan',
        password: hashedPassword,
        status: true,
      });

      await this.userRepository.save(defaultUser);
      console.log('✅ Default user created: username=admin, password=123321231');
    }
  }

  async login(username: string, password: string) {
    const user = await this.userRepository.findOne({ where: { username } });


    if (!user) {
      throw new UnauthorizedException('Sai tài khoản');
    }

    // Check status
    if (!user.status) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Sai tài khoản');
    }

    const payload = { 
      sub: user.id, 
      username: user.username,
      code: user.code,
      name: user.name,
      status: user.status,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        code: user.code,
        name: user.name,
        username: user.username,
        status: user.status,
      },
    };
  }

  async validateUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new UnauthorizedException('User không tồn tại');
    }

    // Check status mỗi request
    if (!user.status) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    return user;
  }
}
