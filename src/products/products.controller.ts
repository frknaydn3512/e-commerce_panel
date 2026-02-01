import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { AddImageDto } from './dto/add-image.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';


// Multer configuration
const storage = diskStorage({
  destination: './uploads/products',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `${uniqueSuffix}${ext}`);
  },
});

const imageFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return callback(new BadRequestException('Only image files are allowed!'), false);
  }
  callback(null, true);
};

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product (Admin/Editor only)' })
  create(@Body() createProductDto: CreateProductDto, @Request() req) {
    return this.productsService.create(createProductDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with filters' })
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug (SEO-friendly)' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (Admin/Editor only)' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload product image (Admin/Editor only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        altText: {
          type: 'string',
        },
        isPrimary: {
          type: 'boolean',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  async uploadImage(
    @Param('id') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() addImageDto: AddImageDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Convert isPrimary to boolean since FormData sends it as string
    const isPrimaryBool = String(addImageDto.isPrimary) === 'true';

    return this.productsService.addImage(
      productId,
      file.filename,
      addImageDto.altText,
      isPrimaryBool,
    );
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'Get all images of a product' })
  getImages(@Param('id') productId: string) {
    return this.productsService.getImages(productId);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product image (Admin/Editor only)' })
  removeImage(@Param('id') productId: string, @Param('imageId') imageId: string) {
    return this.productsService.removeImage(productId, imageId);
  }

  @Patch(':id/images/:imageId/primary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set image as primary (Admin/Editor only)' })
  setPrimaryImage(@Param('id') productId: string, @Param('imageId') imageId: string) {
    return this.productsService.setPrimaryImage(productId, imageId);
  }
}