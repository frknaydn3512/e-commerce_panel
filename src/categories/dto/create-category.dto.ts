import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Elektronik' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'parent-category-uuid', required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}