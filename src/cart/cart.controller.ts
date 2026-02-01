import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  getCart(@CurrentUser() user: any) {
    return this.cartService.getOrCreateCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(@CurrentUser() user: any, @Body() addToCartDto: AddToCartDto) {
    console.log('DEBUG USER OBJECT:', user);
    return this.cartService.addItem(user.id, addToCartDto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @CurrentUser() user: any,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, itemId, updateCartItemDto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(@CurrentUser() user: any, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  clearCart(@CurrentUser() user: any) {
    return this.cartService.clearCart(user.id);
  }
}