import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  createFromCart(@CurrentUser() user: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createFromCart(user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders (Admin sees all, User sees own)' })
  findAll(@CurrentUser() user: any) {
    if (user.role === UserRole.ADMIN) {
      return this.ordersService.findAll();
    }
    return this.ordersService.findAllByUser(user.id);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get order statistics (Admin only)' })
  getStatistics() {
    return this.ordersService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Admin hepsini görebilir, user sadece kendisininkini
    const userId = user.role === UserRole.ADMIN ? undefined : user.id;
    return this.ordersService.findOne(id, userId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  updateStatus(@Param('id') id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto);
  }
}