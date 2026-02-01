import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  // Slug oluşturma
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(createProductDto: CreateProductDto, sellerId?: string) {
    const { name, description, price, stock, categoryId: inputCategoryId, categoryName, isActive } = createProductDto;

    let finalCategoryId = inputCategoryId;

    // Kategori mantığı
    if (!finalCategoryId && categoryName) {
      const categorySlug = this.generateSlug(categoryName);

      // Kategori var mı?
      const existingCategory = await this.prisma.category.findFirst({
        where: {
          OR: [
            { slug: categorySlug },
            { name: categoryName } // Case-sensitive or adjust as needed, but slug is safer
          ]
        }
      });

      if (existingCategory) {
        finalCategoryId = existingCategory.id;
      } else {
        // Yoksa oluştur
        const newCategory = await this.prisma.category.create({
          data: {
            name: categoryName,
            slug: categorySlug,
          }
        });
        finalCategoryId = newCategory.id;
      }
    }

    if (!finalCategoryId) {
      throw new BadRequestException('CategoryId or CategoryName is required');
    }

    // Kategoru ID elimizde, kontrol edelim (inputCategoryId verildiyse diye)
    // Gerçi yukarıda create ettik veya bulduk, ama inputCategoryId verildiyse kontrol etmekte fayda var
    // Optimizasyon: Zaten yukarıda create ettiysek valid. Sadece direkt ID verildiyse check edelim.
    if (inputCategoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: finalCategoryId },
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    // Slug oluştur
    let slug = this.generateSlug(name);

    // Aynı slug varsa sonuna sayı ekle
    const existingProduct = await this.prisma.product.findUnique({
      where: { slug },
    });

    if (existingProduct) {
      const timestamp = Date.now();
      slug = `${slug}-${timestamp}`;
    }

    return this.prisma.product.create({
      data: {
        name,
        slug,
        description,
        price,
        stock,
        category: { connect: { id: finalCategoryId } },
        isActive: isActive ?? true,
        seller: sellerId ? { connect: { id: sellerId } } : undefined,
      },
      include: {
        category: true,
        images: true,
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
    });
  }

  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      minPrice,
      maxPrice,
      search,
      inStock,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // WHERE koşulları
    const where: any = {
      isActive: true, // Sadece aktif ürünler
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (inStock) {
      where.stock = { gt: 0 };
    }

    // Add sellerId filter if present in query (cast to any to avoid strict DTO check if not updated yet)
    if ((query as any).sellerId) {
      where.sellerId = (query as any).sellerId;
    }

    // Pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Sıralama
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Ürünleri getir
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          category: true,
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        images: {
          orderBy: {
            isPrimary: 'desc',
          },
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        images: {
          orderBy: {
            isPrimary: 'desc',
          },
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    // Ürün var mı kontrol et
    await this.findOne(id);

    const { name, categoryId, ...rest } = updateProductDto;
    const data: any = { ...rest };

    // Kategori değiştiriliyorsa kontrol et
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      data.categoryId = categoryId;
    }

    // İsim değiştiriliyorsa slug'ı da güncelle
    if (name) {
      let slug = this.generateSlug(name);

      // Başka üründe aynı slug var mı?
      const existing = await this.prisma.product.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      data.name = name;
      data.slug = slug;
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        images: true,
      },
    });
  }

  async remove(id: string) {
    // Ürün var mı kontrol et
    await this.findOne(id);

    return this.prisma.product.delete({
      where: { id },
    });
  }

  // Stok güncelleme (sipariş sistemi için kullanılacak)
  async updateStock(id: string, quantity: number) {
    const product = await this.findOne(id);

    if (product.stock + quantity < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        stock: product.stock + quantity,
      },
    });
  }



  // Resim ekleme
  async addImage(productId: string, filename: string, altText?: string, isPrimary: boolean = false) {
    // Ürün var mı kontrol et
    await this.findOne(productId);

    // Eğer isPrimary=true ise, diğer resimleri primary olmaktan çıkar
    if (isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    // Resmi ekle
    return this.prisma.productImage.create({
      data: {
        productId,
        url: `/uploads/products/${filename}`,
        altText,
        isPrimary,
      },
    });
  }

  // Resimleri listele
  async getImages(productId: string) {
    await this.findOne(productId);

    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: {
        isPrimary: 'desc', // Primary resim önce gelsin
      },
    });
  }

  // Resim sil
  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Dosyayı diskten de sil (opsiyonel)
    // const fs = require('fs');
    // const path = require('path');
    // const filepath = path.join(__dirname, '../../..', image.url);
    // if (fs.existsSync(filepath)) {
    //   fs.unlinkSync(filepath);
    // }

    return this.prisma.productImage.delete({
      where: { id: imageId },
    });
  }

  // Primary resim değiştir
  async setPrimaryImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Tüm resimleri primary olmaktan çıkar
    await this.prisma.productImage.updateMany({
      where: { productId },
      data: { isPrimary: false },
    });

    // Bu resmi primary yap
    return this.prisma.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
  }



}