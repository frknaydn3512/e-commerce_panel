import { IsString, IsNumber, IsUUID, IsOptional, Min, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Latest iPhone with A17 Pro chip', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock: number;

  @ApiProperty({ example: 'category-uuid' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}