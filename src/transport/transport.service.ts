import { Injectable } from '@nestjs/common';
import { BusService } from '../bus/bus.service';
import { ShuttleService } from '../shuttle/shuttle.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransportService {
  constructor(
    private readonly busService: BusService,
    private readonly shuttleService: ShuttleService,
    private readonly configService: ConfigService,
  ) {}

  async calculateScores(
    transportOptions: {
      type: string;
      waitingTime: number | null; // 왜 시간들이 nullable 인지 몰?루
      totalTime: number | null;
      cost: number;
      seats?: number;
      bonus?: number;
      departureTime?: Date;
      arrivalTime?: Date;
    }[],
  ) {
    const DEFAULT_WEIGHTS = { watingTime: 0.4, totalTime: 0.4, cost: 0.2 }; // 이건 .env에 저장하는게 편할수도
    const MAX_COST = 2800;
    const MAX_WAITING_TIME = 30;
    const MAX_TOTAL_TIME = 90;

    return transportOptions
      .map((option) => {
        if (option.waitingTime === null || option.totalTime === null)
          return { type: option.type, score: -Infinity };
        // 대기시간 점수
        const waitingScore =
          ((MAX_WAITING_TIME - option.waitingTime) / MAX_WAITING_TIME) *
          100 *
          DEFAULT_WEIGHTS.watingTime;
        // 총 소요시간 점수
        const totalTimeScore =
          ((MAX_TOTAL_TIME - option.totalTime) / MAX_TOTAL_TIME) *
          100 *
          DEFAULT_WEIGHTS.totalTime;
        // 비용 점수
        const costScore =
          ((MAX_COST - option.cost) / MAX_COST) * 100 * DEFAULT_WEIGHTS.cost;
        // 좌석 페널티
        const seatPenalty =
          option.seats !== undefined && option.seats < 10 ? -10 : 0; // 10 자리 미만은 페널티
        // 보너?스 점수
        const bonusScore = option.bonus || 0;
        // 최종 점수
        const totalScore =
          waitingScore + totalTimeScore + costScore + seatPenalty + bonusScore;

        return { ...option, score: totalScore };
      })
      .filter((option) => option.score > -Infinity) // 유요한 옵션만 남김
      .sort((a, b) => b.score - a.score); // 점수 내림차순 정렬
  }

  async getRankedOptions(currentTime: Date, day: string) {
    const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    if (!validDays.includes(day.toUpperCase()))
      throw new Error('Invalid day of the week');

    const mjuToGiheungStationId = this.configService.get<string>(
      'MJU_TO_GIHUENG_STATION_ID',
    );
    const giheungToMjuStationId = this.configService.get<string>(
      'GIHEUNG_TO_MJU_STATION_ID',
    );
    const busNumbers = this.configService.get<string>('BUS_NUMBERS').split(',');

    const calculateArrivalTime = (
      currentTime: Date,
      waitingTime: number,
      totalTime: number,
    ) => {
      const departureTime = new Date(
        currentTime.getTime() + waitingTime * 60 * 1000,
      ); // 현재 시간 + 대기 시간
      const arrivalTime = new Date(
        departureTime.getTime() + totalTime * 60 * 1000,
      ); // 출발 시간 + 총 소요 시간
      return { departureTime, arrivalTime };
    };

    // 버스 번호별 이동 시간 정의
    const busTravelTimes: { [key: string]: number } = {
      '5005': 43,
      '5600': 43,
      '820': 47,
      '5003B': 59,
      '5003A': 59,
    };

    // 1. 기흥역 → 명지대
    const elWaitTime = this.shuttleService.getEverlineTimeGtoM(currentTime);
    const mStationWaitTime =
      elWaitTime !== null
        ? this.shuttleService.getMStationTimeGtoM(elWaitTime, currentTime)
        : null;
    const directShuttleWaitTime = this.shuttleService.getGStationTimeGtoM(
      day,
      currentTime,
    );

    const busArrivalDataGtoM = await this.busService.getBusArrivalInfo(
      giheungToMjuStationId,
      busNumbers,
    );

    const busOptionsGtoM = busArrivalDataGtoM.map((bus) => {
      const waitingTime = parseInt(bus.도착시간, 10); //도착시간을 숫자로 변환
      const travelTime = busTravelTimes[bus.버스번호] || 60; // 이동 시간
      const { departureTime, arrivalTime } = calculateArrivalTime(
        currentTime,
        waitingTime,
        travelTime,
      );

      return {
        type: `버스 (${bus.버스번호})`,
        waitingTime: parseInt(bus.도착시간, 10),
        totalTime: travelTime,
        cost: bus.버스번호 === '820' ? 1450 : 2800,
        seats:
          bus.남은좌석수 !== '정보 없음'
            ? parseInt(bus.남은좌석수, 10)
            : undefined,
        bonus: bus.버스번호 === '820' ? 5 : 0,
        departureTime,
        arrivalTime,
      };
    });

    const optionsGtoM = [
      {
        type: '기흥역 직통 셔틀',
        waitingTime: directShuttleWaitTime,
        totalTime: 15,
        cost: 0,
        ...(() => {
          if (directShuttleWaitTime !== null) {
            const { departureTime, arrivalTime } = calculateArrivalTime(
              currentTime,
              directShuttleWaitTime,
              15,
            );
            return { departureTime, arrivalTime };
          }
          return { departureTime: null, arrivalTime: null }; // 대기 시간이 null인 경우 처리
        })(),
      },
      {
        type: '에버라인 + 명지대역 셔틀',
        waitingTime:
          elWaitTime !== null && mStationWaitTime !== null
            ? elWaitTime + mStationWaitTime
            : null,
        totalTime: 16 + 10,
        cost: 1450,
        ...(() => {
          if (elWaitTime !== null && mStationWaitTime !== null) {
            const { departureTime, arrivalTime } = calculateArrivalTime(
              currentTime,
              elWaitTime,
              elWaitTime + mStationWaitTime,
            );
            return { departureTime, arrivalTime };
          }
          return { departureTime: null, arrivalTime: null }; // 대기 시간 또는 총 소요 시간이 null인 경우 처리
        })(),
      },
      ...busOptionsGtoM,
    ];

    const rankedGtoM = await this.calculateScores(optionsGtoM);

    // 2. 명지대 → 기흥역
    const mStationWaitTimeMtoG =
      this.shuttleService.getMStationTimeMtoG(currentTime);
    const elWaitTimeMtoG =
      mStationWaitTimeMtoG !== null
        ? this.shuttleService.getEverlineTimeMtoG(
            mStationWaitTimeMtoG,
            currentTime,
          )
        : null;
    const directShuttleWaitTimeMtoG = this.shuttleService.getGStationTimeMtoG(
      day,
      currentTime,
    );

    const busArrivalDataMtoG = await this.busService.getBusArrivalInfo(
      mjuToGiheungStationId,
      busNumbers,
    );

    const busOptionsMtoG = busArrivalDataMtoG.map((bus) => {
      const waitingTime = parseInt(bus.도착시간, 10); //도착시간을 숫자로 변환
      const travelTime = busTravelTimes[bus.버스번호] || 60; // 이동 시간
      const { departureTime, arrivalTime } = calculateArrivalTime(
        currentTime,
        waitingTime,
        travelTime,
      );

      return {
        type: `버스 (${bus.버스번호})`,
        waitingTime: parseInt(bus.도착시간, 10),
        totalTime: travelTime,
        cost: bus.버스번호 === '820' ? 1450 : 2800,
        seats:
          bus.남은좌석수 !== '정보 없음'
            ? parseInt(bus.남은좌석수, 10)
            : undefined,
        bonus: bus.버스번호 === '820' ? 5 : 0,
        departureTime,
        arrivalTime,
      };
    });

    const optionsMtoG = [
      {
        type: '명지대 → 기흥역 셔틀',
        waitingTime: directShuttleWaitTimeMtoG,
        totalTime: 15,
        cost: 0,
        ...(() => {
          if (directShuttleWaitTimeMtoG !== null) {
            const { departureTime, arrivalTime } = calculateArrivalTime(
              currentTime,
              directShuttleWaitTimeMtoG,
              15,
            );
            return { departureTime, arrivalTime };
          }
          return { departureTime: null, arrivalTime: null }; // 대기 시간이 null인 경우 처리
        })(),
      },
      {
        type: '명지대역 셔틀 + 에버라인',
        waitingTime:
          mStationWaitTimeMtoG !== null && elWaitTimeMtoG !== null
            ? mStationWaitTimeMtoG + elWaitTimeMtoG
            : null,
        totalTime: 10 + 16,
        cost: 1450,
        ...(() => {
          if (mStationWaitTimeMtoG !== null && elWaitTimeMtoG !== null) {
            const { departureTime, arrivalTime } = calculateArrivalTime(
              currentTime,
              mStationWaitTimeMtoG,
              mStationWaitTimeMtoG + elWaitTimeMtoG,
            );
            return { departureTime, arrivalTime };
          }
          return { departureTime: null, arrivalTime: null }; // 대기 시간 또는 총 소요 시간이 null인 경우 처리
        })(),
      },
      ...busOptionsMtoG,
    ];

    const rankedMtoG = await this.calculateScores(optionsMtoG);

    return {
      gToM: rankedGtoM.slice(0, 3),
      mToG: rankedMtoG.slice(0, 3),
    };
  }
}
