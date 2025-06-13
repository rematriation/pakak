/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc Worker Service.
 */

import { inject, injectable } from 'tsyringe';
import { UserRepository } from '../repositories/UserRepository';
import { ISQSService, ISQSServiceToken } from '../libs/SQSService';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig';
import { IIncomingMessage } from '../models/IncomingMessage';

@injectable()
export class WorkerService {
  constructor(
    private userRepository: UserRepository,
    @inject(ISQSServiceToken) private sqsService: ISQSService,
    @inject(IAppConfigToken) private appConfig: IAppConfig,
  ) {}

  async processMessage(incomingMessage: IIncomingMessage): Promise<void> {
    console.log(incomingMessage);
    await Promise.resolve(1);
  }
}
