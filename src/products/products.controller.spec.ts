import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

describe('ProductsController', () => {
    let controller: ProductsController;
    let service: ProductsService;

    const mockProductsService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProductsController],
            providers: [
                {
                    provide: ProductsService,
                    useValue: mockProductsService,
                },
            ],
        }).compile();

        controller = module.get<ProductsController>(ProductsController);
        service = module.get<ProductsService>(ProductsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should call service.create with correct parameters', async () => {
            const createProductDto: CreateProductDto = {
                name: 'New Product',
                description: 'Desc',
                price: 50,
                stock: 10,
                categoryId: 'cat-1',
            };

            const expectedResult = {
                id: 'prod-1',
                ...createProductDto,
                slug: 'new-product',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockProductsService.create.mockResolvedValue(expectedResult);

            const result = await controller.create(createProductDto);

            expect(result).toEqual(expectedResult);
            expect(service.create).toHaveBeenCalledWith(createProductDto);
        });
    });
});
