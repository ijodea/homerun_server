import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BusModule } from './bus/bus.module';
import { ShuttleModule } from './shuttle/shuttle.module';
import { TaxiModule } from './taxi/taxi.module';
import { ChatModule } from './chat/chat.module';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { OnlineUsersModule } from './online-users/online-users.module';
import { TransportController } from './transport/transport.controller';
import { TransportService } from './transport/transport.service';
import { TransportModule } from './transport/transport.module';
import { UsersController } from './users/users.controller';
import { UsersModule } from './users/users.module';

// import { ServeStaticModule } from '@nestjs/serve-static';
// import { join } from 'path';
import { TaxiService } from './taxi/taxi.service';
import { TaxiController } from './taxi/taxi.controller';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { JwtStrategy } from './auth/jwt.strategy';
import { User } from './users/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BusModule,
    ShuttleModule,
    TaxiModule,
    ChatModule,
    AuthModule,
    TransportModule,
    OnlineUsersModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' }, //토큰 만료 시간 설정
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'), //.env 파일에서 지금은 테스트때문에 postgres데이터베이스에 저장하고 있음. 그러나 실제로는 .env파일에다가 DATABASE_NAME=homerun해줘야함.
        entities: [User], // User 엔티티 추가
        synchronize: false, // 개발 중에는 true, 배포 시에는 false로 변경 권장
        logging: true,
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),
    TypeOrmModule.forFeature([User]), // User 엔티티 모듈 추가
  ],
  providers: [
    AuthService,
    TransportService,
    TaxiService,
    JwtAuthGuard,
    JwtStrategy,
  ],
  controllers: [
    AuthController,
    TransportController,
    UsersController,
    TaxiController,
  ],
})
export class AppModule {}
