import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // 1. Email zaten var mı kontrol et
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 2. Şifreyi hashle (güvenlik için)
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 3. Kullanıcıyı veritabanına kaydet
    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
    });

    // 4. Şifreyi response'dan çıkar (güvenlik)
    const { password, ...result } = user;
    
    // 5. JWT token oluştur
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: result,
      access_token: token,
    };
  }

  async login(loginDto: LoginDto) {
    // 1. Kullanıcıyı email'e göre bul
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Şifreyi kontrol et
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Şifreyi response'dan çıkar
    const { password, ...result } = user;
    
    // 4. Token oluştur
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: result,
      access_token: token,
    };
  }

  private generateToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}