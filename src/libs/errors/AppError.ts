import { ErrorCode } from './ErrorCode';

/**
 * A custom Error that carries an application-specific code.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
