import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'refresh-token-id.refresh-token-secret',
  })
  @IsString()
  @MinLength(3)
  refreshToken!: string;
}
