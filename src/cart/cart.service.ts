import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  // Kullanıcının sepetini getir veya oluştur
  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
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

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
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
    }

    // Toplam fiyat hesapla
    const total = cart.items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    return {
      ...cart,
      total,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  // Sepete ürün ekle
  async addItem(userId: string, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;

    // Ürün var mı ve stokta yeterli var mı kontrol et
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(`Only ${product.stock} items available in stock`);
    }

    // Sepeti getir veya oluştur
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // Bu ürün sepette var mı?
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (existingItem) {
      // Varsa miktarı artır
      const newQuantity = existingItem.quantity + quantity;

      if (product.stock < newQuantity) {
        throw new BadRequestException(`Only ${product.stock} items available in stock`);
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Yoksa yeni ekle
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    return this.getOrCreateCart(userId);
  }

  // Sepetteki ürün miktarını güncelle
  async updateItem(userId: string, itemId: string, updateCartItemDto: UpdateCartItemDto) {
    const { quantity } = updateCartItemDto;

    // Sepet öğesi var mı ve kullanıcıya ait mi?
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId },
      },
      include: {
        product: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Stok kontrolü
    if (cartItem.product.stock < quantity) {
      throw new BadRequestException(`Only ${cartItem.product.stock} items available in stock`);
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.getOrCreateCart(userId);
  }

  // Sepetten ürün çıkar
  async removeItem(userId: string, itemId: string) {
    // Sepet öğesi var mı ve kullanıcıya ait mi?
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getOrCreateCart(userId);
  }

  // Sepeti tamamen temizle
  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return this.getOrCreateCart(userId);
  }
}