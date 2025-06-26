/**
 * @author Daksh Pratap Singh
 * @email daksh204singh@gmail.com
 *
 * @desc
 * These codes indicate the result of a ClamAV scan:
 * - `CLEAN` (0): No virus found in the scanned file.
 * - `INFECTED` (1): At least one virus was found in the scanned file.
 *
 * @see {@link https://man.archlinux.org/man/clamd.8#EXIT_STATUS | ClamAV Exit Codes Documentation}
 */

export enum ClamAVExitCode {
  CLEAN = 0,
  INFECTED = 1,
}
