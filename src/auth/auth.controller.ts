import { Controller, Post, Body, Render, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}


  @Public()
  @Get('login')
  @Render('login')
  loginPage() {
    return {
      title: 'Đăng nhập hệ thống',
      layout: false,
    };
  }

  @Public()
  @Post('login')
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
    @Res() res: Response,
  ) {
      const result = await this.authService.login(username, password);
      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      console.log(123333)
      return res.redirect('/tao-phieu-nhap');
  }
  
  @Public()
  @Get('logout')
  logout(@Res() res: Response) {
    res.clearCookie('access_token');
    return res.redirect('/auth/login');
  }
}
