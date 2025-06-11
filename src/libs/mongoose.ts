/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @desc MongoDB connection service
 */

import mongoose from 'mongoose';
import { injectable, inject } from 'tsyringe';
import { IAppConfig, IAppConfigToken } from '../configs/AppConfig';

/**
 * Service responsible for establishing and managing the MongoDB connection using Mongoose.
 */
@injectable()
export class MongooseConnectionService {
  private isConnected: boolean = false; // Flag to track connection status

  constructor(@inject(IAppConfigToken) private appConfig: IAppConfig) {}

  /**
   * Establishes a connection to MongoDB Atlas using Mongoose.
   * @returns A Promise that resolves when the connection is established.
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.debug('MongooseConnectionService :: MongoDB already connected.');
      return;
    }

    try {
      await mongoose.connect(this.appConfig.mongodbURI, {
        dbName: this.appConfig.mongodbDBName,
      });

      this.isConnected = true;
      console.log('MongooseConnectionService :: Connected to MongoDB Atlas successfully.');

      mongoose.connection.on('error', (err) => {
        console.error('MongooseConnectionService :: MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongooseConnectionService :: MongoDB disconnected!');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.info('MongooseConnectionService :: MongoDB reconnected!');
        this.isConnected = true;
      });
    } catch (error) {
      console.error('MongooseConnectionService :: Failed to connect to MongoDB Atlas:', error);
      throw error;
    }
  }

  /**
   * Disconnects from MongoDB Atlas.
   */
  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await mongoose.disconnect();
        this.isConnected = false;
        console.log('MongooseConnectionService :: Disconnected from MongoDB Atlas.');
      } catch (error) {
        console.error(
          'MongooseConnectionService :: Error disconnecting from MongoDB Atlas:',
          error,
        );
      }
    }
  }
}
