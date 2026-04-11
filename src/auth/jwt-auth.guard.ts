import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    
    // Lấy token từ header hoặc cookie
    let token = null;
    
    // Try to get from Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // Try to get from cookie if no header
    if (!token && request.cookies && request.cookies.access_token) {
      token = request.cookies.access_token;
    }
    
    if (!token) {
      throw new UnauthorizedException('NO_TOKEN');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Check status từ payload
      if (payload.status === false) {
        throw new UnauthorizedException('ACCOUNT_LOCKED');
      }

      request.user = payload;
      return true;
    } catch (error) {
      // Token hết hạn hoặc không hợp lệ
      if (error.message === 'ACCOUNT_LOCKED') {
        throw new UnauthorizedException('ACCOUNT_LOCKED');
      }
      throw new UnauthorizedException('INVALID_TOKEN');
    }
  }
}
