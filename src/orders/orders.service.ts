import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // Sepetten sipariş oluştur (TRANSACTION!)
  async createFromCart(userId: string, createOrderDto: CreateOrderDto) {
    // 1. Kullanıcının sepetini getir
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 2. Stok kontrolü (transaction öncesi)
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}, Requested: ${item.quantity}`,
        );
      }

      if (!item.product.isActive) {
        throw new BadRequestException(`Product ${item.product.name} is no longer available`);
      }
    }

    // 3. Toplam fiyat hesapla
    const totalAmount = cart.items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    // 4. TRANSACTION: Ya hepsi başarılı, ya hiçbiri!
    const order = await this.prisma.$transaction(async (tx) => {
      // a) Siparişi oluştur
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: OrderStatus.PENDING,
        },
      });

      // b) Sipariş detaylarını oluştur ve stokları düşür
      for (const item of cart.items) {
        // Sipariş kalemi oluştur (fiyat o anki fiyattan kilitlenir)
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: item.product.price,
          },
        });

        // Stok düşür
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // c) Sepeti temizle
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // d) Tam sipariş bilgisini döndür
      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });
    });

    return order;
  }

  // Kullanıcının tüm siparişlerini getir
  async findAllByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Tüm siparişleri getir (ADMIN için)
  async findAll() {
    return this.prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Sipariş detayı
  async findOne(id: string, userId?: string) {
    const where: any = { id };
    
    // Eğer userId verilmişse, sadece o kullanıcının siparişini getir
    if (userId) {
      where.userId = userId;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        orderItems: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // Sipariş durumu güncelle (ADMIN için)
  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Durum geçişi mantığı (opsiyonel - kurallar eklenebilir)
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const allowedStatuses = validTransitions[order.status];
    
    if (!allowedStatuses.includes(updateOrderStatusDto.status)) {
      throw new BadRequestException(
        `Cannot change status from ${order.status} to ${updateOrderStatusDto.status}`,
      );
    }

    // İptal ediliyorsa stokları geri ekle
    if (updateOrderStatusDto.status === OrderStatus.CANCELLED) {
      await this.prisma.$transaction(async (tx) => {
        // Sipariş durumunu güncelle
        await tx.order.update({
          where: { id },
          data: { status: updateOrderStatusDto.status },
        });

        // Stokları geri ekle
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: id },
        });

        for (const item of orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      });
    } else {
      await this.prisma.order.update({
        where: { id },
        data: { status: updateOrderStatusDto.status },
      });
    }

    return this.findOne(id);
  }

  // Sipariş istatistikleri (ADMIN için)
  async getStatistics() {
    const [totalOrders, totalRevenue, ordersByStatus] = await Promise.all([
      this.prisma.order.count(),
      
      this.prisma.order.aggregate({
        _sum: {
          totalAmount: true,
        },
      }),
      
      this.prisma.order.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}