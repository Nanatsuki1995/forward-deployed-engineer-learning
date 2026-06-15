import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedUser } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '使用邮箱和密码登录' })
  @ApiBody({ type: LoginDto })
  @ApiBadRequestResponse({ description: '请求体校验失败' })
  @ApiUnauthorizedResponse({ description: '邮箱或密码错误' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('register')
  @ApiOperation({ summary: '注册普通交付工程师账号' })
  @ApiBody({ type: RegisterDto })
  @ApiBadRequestResponse({ description: '请求体校验失败' })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('refresh')
  @ApiOperation({ summary: '轮换 refresh token 并返回新会话' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiUnauthorizedResponse({ description: 'refresh token 无效或过期' })
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Post('logout')
  @ApiOperation({ summary: '注销 refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  logout(@Body() body: RefreshTokenDto) {
    return this.authService.logout(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前登录用户' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }
}
