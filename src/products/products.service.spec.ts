import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrismaService = {
    category: {
        findUnique: jest.fn(),
    },
    product: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
};

describe('ProductsService', () => {
    let service: ProductsService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const createProductDto = {
            name: 'Test Product',
            description: 'Description',
            price: 100,
            stock: 50,
            categoryId: 'cat-1',
        };

        it('should create a product successfully', async () => {
            // 1. Mock setup: Category exists
            mockPrismaService.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Electronics' });
            // 2. Mock setup: Slug does not exist (so no collision)
            mockPrismaService.product.findUnique.mockResolvedValue(null);
            // 3. Mock setup: Create returns the product
            mockPrismaService.product.create.mockResolvedValue({
                id: 'prod-1',
                ...createProductDto,
                slug: 'test-product',
                isActive: true,
            });

            const result = await service.create(createProductDto);

            expect(result).toBeDefined();
            expect(result.name).toBe(createProductDto.name);
            expect(result.slug).toBe('test-product');
            expect(prisma.category.findUnique).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
            expect(prisma.product.create).toHaveBeenCalled();
        });

        it('should throw NotFoundException if category does not exist', async () => {
            // Mock setup: Category does not exist
            mockPrismaService.category.findUnique.mockResolvedValue(null);

            await expect(service.create(createProductDto)).rejects.toThrow(NotFoundException);
        });
    });
});
