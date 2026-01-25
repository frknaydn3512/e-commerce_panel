import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AddImageDto {
  @ApiProperty({ example: 'iPhone 15 Pro front view', required: false })
  @IsString()
  @IsOptional()
  altText?: string;

  @ApiProperty({ example: false, required: false , default: false})
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isPrimary?: boolean = false;
}