import { IUser, UserModel } from '../models/User';

export class UserRepository {
  async getUser(phone: string): Promise<IUser | null> {
    const raw = await UserModel.get(phone);
    return raw as unknown as IUser | null;
  }

  async createUser(data: Omit<IUser, 'createdAt' | 'updatedAt'>): Promise<IUser> {
    const created = await UserModel.create(data);
    return created as unknown as IUser;
  }

  async setSubscription(phone: string, optIn: boolean): Promise<void> {
    await UserModel.update({ phone }, { subscriptionStatus: optIn });
  }

  async setAwaitingResponse(phone: string, awaiting: boolean): Promise<void> {
    await UserModel.update({ phone }, { awaitingResponse: awaiting });
  }

  async incrementRateLimit(phone: string, windowMs: number): Promise<number> {
    // TODO: IMPLEMENT
    new Error('Not implemented.');
  }

  async setAwaitingDeletion(phone: string, flag: 0 | 1): Promise<void> {
    await UserModel.update({ phone }, { awaitingDeletion: flag });
  }
}
