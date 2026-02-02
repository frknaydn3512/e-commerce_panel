import { Controller, Patch, UseGuards, Request, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Patch('profile/role')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update user role (e.g. become a seller)' })
    @ApiBody({ schema: { type: 'object', properties: { role: { type: 'string', enum: ['EDITOR', 'CUSTOMER'] } } } })
    async updateRole(@Request() req, @Body() body: { role: UserRole }) {
        // Basic validation: Allow users to switch between CUSTOMER and EDITOR (Seller)
        // Prevent switching to ADMIN for security in this demo
        if (body.role !== UserRole.EDITOR && body.role !== UserRole.CUSTOMER) {
            return { message: 'Invalid role' };
        }

        return this.usersService.update(req.user.id, {
            role: body.role,
        });
    }
}
