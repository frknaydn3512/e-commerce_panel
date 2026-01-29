import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()  
  @ApiProperty({ 
    example: '123 Main St, Apt 4B', 
    description: 'Shipping address (optional, can be added later)' 
  })
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ 
    example: 'Please leave at door', 
    required: false 
  })
  notes?: string;
}