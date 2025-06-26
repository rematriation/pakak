/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc A client for interacting with the ClamAV scanner binary.
 */

import { spawn } from 'child_process';
import { Readable } from 'stream';
import { inject, injectable } from 'tsyringe';
import { VirusScanStatus } from '../constants/VirusScanResult';
import { ClamAVExitCode } from '../constants/ClamAVExitCode';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig';
import { IS3Service, IS3ServiceToken } from './S3Service';

/**
 * Interface for the ClamAV Client service.
 */
export interface IClamAVClient {
  /**
   * Scans a file stream for viruses using the ClamAV daemon.
   * @param stream The readable stream of the file to be scanned.
   * @returns A promise that resolves into a tuple of VirusScanStatus and message of type string.
   */
  scanStream(stream: Readable): Promise<[VirusScanStatus, string]>;
}

/**
 * A unique token for injecting the IClamAVClient.
 */
export const IClamAVClientToken = Symbol('IClamAVClient');

/**
 * Concrete implementation of the IClamAVClient.
 */
@injectable()
export class ClamAVClient implements IClamAVClient {
  private readonly CLAMAV_S3_BUCKET: string;
  private readonly CLAMAV_DB: string;
  private readonly CLAMSCAN: string;
  private dbReady: boolean = false;

  constructor(
    @inject(IAppConfigToken) private appConfig: IAppConfig,
    @inject(IS3ServiceToken) private s3Service: IS3Service,
  ) {
    this.CLAMAV_S3_BUCKET = this.appConfig.clamavDBS3Bucket;
    this.CLAMAV_DB = this.appConfig.clamavDBPath ?? '/tmp/clamav';
    this.CLAMSCAN = `${this.appConfig.binDir}/clamscan`;
  }

  private readonly DB_FILES = ['main.cvd', 'daily.cvd', 'bytecode.cvd', 'main.cld', 'daily.cld'];

  public isReady() {
    return this.dbReady;
  }

  private async ensureDatabase(): Promise<boolean> {
    if (this.isReady()) return true;

    this.dbReady = await (async () => {
      console.log('Starting ClamAV DB download from:', this.CLAMAV_S3_BUCKET);
      const s3 = this.s3Service.getClient();
      await fs.mkdir(this.CLAMAV_DB, { recursive: true });

      await Promise.all(
        this.DB_FILES.map(async (key) => {
          try {
            const { Body } = await s3.send(
              new GetObjectCommand({ Bucket: this.CLAMAV_S3_BUCKET, Key: key }),
            );
            if (!Body) return console.warn(`${key} empty`);
            await fs.writeFile(path.join(this.CLAMAV_DB, key), await Body.transformToByteArray());
            console.log(`downloaded ${key}`);
          } catch (err: unknown) {
            const error = err as {
              $metadata?: {
                httpStatusCode: number;
              };
            };
            if (error.$metadata?.httpStatusCode === 404) {
              console.warn(`${key} missing (skipped)`);
            } else {
              console.error(`failed ${key}:`, err);
              throw err;
            }
          }
        }),
      );

      console.log(`ClamAV DB ready at ${this.CLAMAV_DB}`);
      return true;
    })();

    this.dbReady = true;
    return this.dbReady;
  }

  public async scanStream(stream: Readable): Promise<[VirusScanStatus, string]> {
    await this.ensureDatabase();
    return this.runScanner(this.CLAMSCAN, stream);
  }

  private runScanner(binary: string, stream: Readable): Promise<[VirusScanStatus, string]> {
    const scanProcess = spawn(binary, ['-', `--database=${this.CLAMAV_DB}`]);

    return new Promise((resolve, reject) => {
      let output = '';
      stream.pipe(scanProcess.stdin);
      stream.on('end', () => scanProcess.stdin.end());

      scanProcess.stdout.on('data', (d: Buffer) => (output += d.toString()));
      scanProcess.stderr.on('data', (d: Buffer) =>
        console.error(`${binary} stderr:`, d.toString()),
      );

      scanProcess.on('close', (code: number) => {
        console.info(`${binary} exited with`, code, output.trim());
        if (code === ClamAVExitCode.CLEAN.valueOf()) {
          resolve([VirusScanStatus.CLEAN, 'No virus found']);
        } else if (code === ClamAVExitCode.INFECTED.valueOf()) {
          resolve([VirusScanStatus.INFECTED, `Threats: ${this.extractVirusName(output)}`]);
        } else {
          reject(new Error(`ClamAV scanner exited with error code ${code}`));
        }
      });

      scanProcess.on('error', reject);
    });
  }

  private extractVirusName(out: string): string {
    return out.split(':')[1]?.trim() ?? 'Unknown';
  }
}
