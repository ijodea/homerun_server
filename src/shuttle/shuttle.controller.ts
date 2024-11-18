import { Controller, Get } from '@nestjs/common';
import { ShuttleService } from './shuttle.service';

@Controller('shuttle')
export class ShuttleController {
  constructor(private readonly shuttleService: ShuttleService) {}

  private getKoreanTime(): Date {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 9); // UTC+9
  }

  @Get('mju-to-giheung')
  getMtoGShuttle() {
    const currentTime = this.getKoreanTime();
    console.log('Current Korean Time:', currentTime);

    const m = this.shuttleService.getMStationTimeMtoG(currentTime);
    console.log('Next M Station Time:', m);

    const g = this.shuttleService.getGStationTimeMtoG(currentTime);
    console.log('Next G Station Time:', g);

    if (m !== null && g !== null) {
      if (g <= m) {
        return {
          nextShuttle: '기흥역 셔틀버스',
          time: g,
          currentTime: currentTime.toISOString(),
          estimatedArrival: new Date(
            currentTime.getTime() + g * 60000,
          ).toISOString(),
        };
      } else {
        return {
          nextShuttle: '명지대역 셔틀버스',
          time: m,
          currentTime: currentTime.toISOString(),
          estimatedArrival: new Date(
            currentTime.getTime() + m * 60000,
          ).toISOString(),
        };
      }
    } else {
      return {
        message: '오늘은 더 이상 셔틀이 없습니다.',
        currentTime: currentTime.toISOString(),
      };
    }
  }

  @Get('giheung-to-mju')
  getGtoMShuttle() {
    const currentTime = this.getKoreanTime();
    console.log('Current Korean Time:', currentTime);

    const m = this.shuttleService.getMStationTimeGtoM(currentTime);
    console.log('Next M Station Time:', m);

    const el = this.shuttleService.getEverlineTimeGtoM(m, currentTime);
    console.log('Next Everline Time:', el);

    const g = this.shuttleService.getGStationTimeGtoM(currentTime);
    console.log('Next G Station Time:', g);

    const eta_el = el !== null ? el + 16 : null;
    const eta_g = g !== null ? g + 15 : null;

    console.log('ETA Everline:', eta_el);
    console.log('ETA G Station:', eta_g);

    if (m !== null && g !== null && el !== null) {
      if (eta_g <= eta_el) {
        return {
          nextShuttle: '기흥역 셔틀버스',
          time: g,
          currentTime: currentTime.toISOString(),
          estimatedArrival: new Date(
            currentTime.getTime() + g * 60000,
          ).toISOString(),
        };
      } else {
        return {
          nextShuttle: '명지대역 셔틀버스',
          time: m,
          currentTime: currentTime.toISOString(),
          estimatedArrival: new Date(
            currentTime.getTime() + m * 60000,
          ).toISOString(),
        };
      }
    } else {
      return {
        message: '오늘은 더 이상 셔틀이 없습니다.',
        currentTime: currentTime.toISOString(),
      };
    }
  }
}
