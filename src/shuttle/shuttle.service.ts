import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ShuttleService {
  private getFilePath(filename: string): string {
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'timetable', filename),
      path.join(process.cwd(), 'dist', 'timetable', filename),
      path.join(process.cwd(), 'timetable', filename),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log('Found timetable at:', filePath);
        return filePath;
      }
    }
    throw new Error(`Timetable file not found: ${filename}`);
  }

  private readCsvFile(filePath: string): string[][] {
    try {
      const csvData = fs.readFileSync(filePath, 'utf8');
      const lines = csvData.trim().split('\n');
      console.log(`Read ${lines.length} lines from ${filePath}`);
      return lines.map((line) => line.split(','));
    } catch (error) {
      console.error(`Error reading CSV file ${filePath}:`, error);
      throw error;
    }
  }

  getGStationTimeGtoM(currentTime: Date): number | null {
    try {
      const csvData = this.readCsvFile(this.getFilePath('gStation.csv'));

      console.log('First few rows of gStation.csv:', csvData.slice(0, 3));

      const currentMinutes =
        currentTime.getHours() * 60 + currentTime.getMinutes();
      console.log('Current minutes from midnight:', currentMinutes);

      const MJUtoGS = csvData.slice(1).map((columns) => {
        const minutes = Number(columns[3]);
        console.log('Parsed minutes:', minutes);
        return minutes;
      });

      const nextBusMinutes = MJUtoGS.find(
        (busTime) => busTime >= currentMinutes,
      );
      console.log('Next bus minutes:', nextBusMinutes);

      return nextBusMinutes !== undefined
        ? nextBusMinutes - currentMinutes
        : null;
    } catch (error) {
      console.error('Error in getGStationTimeGtoM:', error);
      return null;
    }
  }

  getMStationTimeGtoM(currentTime: Date): number | null {
    try {
      const csvData = this.readCsvFile(this.getFilePath('mStation.csv'));
      const currentMinutes =
        currentTime.getHours() * 60 + currentTime.getMinutes();
      const MJUtoMS = csvData.slice(1).map((columns) => Number(columns[3]));

      const nextBusMinutes = MJUtoMS.find(
        (busTime) => busTime >= currentMinutes,
      );
      return nextBusMinutes !== undefined
        ? nextBusMinutes - currentMinutes
        : null;
    } catch (error) {
      console.error('Error in getMStationTimeGtoM:', error);
      return null;
    }
  }

  getEverlineTimeGtoM(m: number, currentTime: Date): number | null {
    try {
      const csvData = this.readCsvFile(this.getFilePath('everline.csv'));
      const currentMinutes =
        currentTime.getHours() * 60 + currentTime.getMinutes();
      const MStoGS = csvData.slice(1).map((columns) => Number(columns[0]));

      m += 10; // 환승 시간 고려
      const nextSubwayMinutes = MStoGS.find(
        (subwayTime) => subwayTime >= m + currentMinutes,
      );

      return nextSubwayMinutes !== undefined
        ? nextSubwayMinutes - currentMinutes
        : null;
    } catch (error) {
      console.error('Error in getEverlineTimeGtoM:', error);
      return null;
    }
  }

  getGStationTimeMtoG(currentTime: Date): number | null {
    try {
      const csvData = this.readCsvFile(this.getFilePath('gStation.csv'));
      const currentMinutes =
        currentTime.getHours() * 60 + currentTime.getMinutes();
      const MJUtoGS = csvData.slice(1).map((columns) => Number(columns[2]));

      const nextBusMinutes = MJUtoGS.find(
        (busTime) => busTime >= currentMinutes,
      );
      return nextBusMinutes !== undefined
        ? nextBusMinutes - currentMinutes
        : null;
    } catch (error) {
      console.error('Error in getGStationTimeMtoG:', error);
      return null;
    }
  }

  getMStationTimeMtoG(currentTime: Date): number | null {
    try {
      const csvData = this.readCsvFile(this.getFilePath('mStation.csv'));
      const currentMinutes =
        currentTime.getHours() * 60 + currentTime.getMinutes();
      const MJUtoMS = csvData.slice(1).map((columns) => Number(columns[2]));

      const nextBusMinutes = MJUtoMS.find(
        (busTime) => busTime >= currentMinutes,
      );
      return nextBusMinutes !== undefined
        ? nextBusMinutes - currentMinutes
        : null;
    } catch (error) {
      console.error('Error in getMStationTimeMtoG:', error);
      return null;
    }
  }
}
