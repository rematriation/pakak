import { injectable, inject } from 'tsyringe';
import { IAppConfig, IAppConfigToken } from '../../configs/AppConfig';
import { IS3ServiceToken, S3Service } from '../../infrastructure/S3Service';
import { TwilioClient } from '../../infrastructure/twilio';
import { ExpectedResponseType } from '../../constants/ExpectedResponseType';
import {
  ICampaignSubmissionRepositoryProvider,
  ICampaignSubmissionRepositoryProviderToken,
} from '../../repositories/CampaignSubmissionRepositoryProvider';
import { IInputHandler } from './InputHandler';
import { TextInputHandler } from './TextInputHandler';
import { ChoiceInputHandler } from './ChoiceInputHandler';
import { MappingInputHandler } from './MappingInputHandler';
import { MediaInputHandler } from './MediaInputHandler';

@injectable()
export class InputHandlerProvider {
  #mapInputHandlers: Map<ExpectedResponseType, IInputHandler>;
  constructor(
    private twilioClient: TwilioClient,
    @inject(ICampaignSubmissionRepositoryProviderToken)
    private repositoryProvider: ICampaignSubmissionRepositoryProvider,
    @inject(IAppConfigToken) private appConfig: IAppConfig,
    @inject(IS3ServiceToken) private s3Service: S3Service,
  ) {
    this.#mapInputHandlers = new Map<ExpectedResponseType, IInputHandler>([
      [ExpectedResponseType.TEXT, new TextInputHandler(repositoryProvider)],
      [ExpectedResponseType.CHOICE, new ChoiceInputHandler(repositoryProvider)],
      [ExpectedResponseType.MAPPING, new MappingInputHandler(repositoryProvider)],
      [
        ExpectedResponseType.IMAGE,
        new MediaInputHandler(repositoryProvider, twilioClient, s3Service, appConfig),
      ],
    ]);
  }

  public getHandler(expectedResponse: ExpectedResponseType): IInputHandler {
    if (this.#mapInputHandlers.has(expectedResponse)) {
      return this.#mapInputHandlers.get(expectedResponse) as IInputHandler;
    } else {
      console.error(
        `InputHandlerProvider.getHandler :: No input handler found for ${expectedResponse}`,
      );
      throw new Error(`Input handler not implemented for ${expectedResponse}`);
    }
  }
}
