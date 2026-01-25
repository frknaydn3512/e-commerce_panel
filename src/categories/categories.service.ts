import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // Slug oluşturma helper fonksiyonu
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Özel karakterleri kaldır
      .replace(/[\s_-]+/g, '-') // Boşlukları tire ile değiştir
      .replace(/^-+|-+$/g, ''); // Baştaki ve sondaki tireleri kaldır
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const { name, parentId } = createCategoryDto;

    // Parent kategori varsa kontrol et
    if (parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    // Slug oluştur
    const slug = this.generateSlug(name);

    // Aynı slug var mı kontrol et
    const existing = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new BadRequestException('Category with this name already exists');
    }

    return this.prisma.category.create({
      data: {
        name,
        slug,
        parentId,
      },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: {
          take: 10, // İlk 10 ürünü getir
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    // Kategori var mı kontrol et
    await this.findOne(id);

    const { name, parentId } = updateCategoryDto;
    const data: any = {};

    // İsim değiştiriliyorsa slug'ı da güncelle
    if (name) {
      const slug = this.generateSlug(name);
      
      // Yeni slug başka kategoride var mı?
      const existing = await this.prisma.category.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (existing) {
        throw new BadRequestException('Category with this name already exists');
      }

      data.name = name;
      data.slug = slug;
    }

    if (parentId !== undefined) {
      data.parentId = parentId;
    }

    return this.prisma.category.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async remove(id: string) {
    // Kategori var mı kontrol et
    await this.findOne(id);

    return this.prisma.category.delete({
      where: { id },
    });
  }

  // Kategori ağacını hiyerarşik olarak getir
  async getTree() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null }, // Sadece ana kategoriler
      include: {
        children: {
          include: {
            children: true, // Alt kategorilerin de alt kategorileri
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    return categories;
  }
}