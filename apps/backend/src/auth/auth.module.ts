import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FieldPermissionsInterceptor } from './field-permissions.interceptor';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ??
  '1d') as JwtSignOptions['expiresIn'];

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'local-development-jwt-secret',
      signOptions: {
        expiresIn: jwtExpiresIn,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    FieldPermissionsInterceptor,
  ],
  exports: [AuthService, JwtModule, RolesGuard, FieldPermissionsInterceptor],
})
export class AuthModule {}
