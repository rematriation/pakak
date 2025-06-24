/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 * @create date 2025-06-08 21:15:33
 * @modify date 2025-06-08 21:15:33
 * @desc Contains helper functions for messages.
 */

import { Command } from '../constants/Command';

export function sanitizeTxtMessage(rawMsg: string | undefined | null): string {
  /* eslint-disable-next-line no-control-regex */
  return (rawMsg || '').replace(/[\x00-\x1F\x7F]/g, '').replace(/<[^>]*>?/gm, '');
}

export function extractCommandKeyword(msg: string): Command | null {
  if (!msg) {
    return null;
  }

  const normalizedMsg = msg.toUpperCase().trim();
  for (const [command, value] of Object.entries(Command)) {
    if (normalizedMsg === command) {
      return value;
    }
  }

  return null;
}

/**
 * Validates text on provided regular expression.
 *
 * @param text string that is to be validated. Defaults to an empty string.
 * @param regex regular expression to be validated against.
 * @returns boolean true on success, false otherwise.
 */

export function validateWithRegex(text: string = '', regex: RegExp): boolean {
  return regex.test(text);
}
