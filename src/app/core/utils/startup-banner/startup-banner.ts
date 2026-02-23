/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import chalk from 'chalk';

/**
 * Configuration for the application banner and startup messages
 */
export interface StartupBannerConfig {
  appName: string;
  version: string;
  year: string;
  author: string;
  github: string;
  repository: string;
  buyMeCoffee?: string;
  license: string;
  licenseUrl: string;
}

/**
 * Startup information to display after initialization
 */
export interface StartupInfo {
  appName: string;
  serverUrl: string;
  bindAddress: string;
}

/**
 * Utility class for displaying application startup banners and progress messages
 *
 * Encapsulates console output logic for application initialization, providing
 * a centralized and swappable mechanism for displaying startup information.
 * This separation allows the display mechanism to be changed (e.g., to file,
 * logger, or different output format) without modifying core application logic.
 *
 * @class StartupBanner
 *
 * @example
 * ```typescript
 * const banner = new StartupBanner({
 *   appName: 'My App',
 *   version: '1.0.0',
 *   author: 'John Doe',
 *   // ... other config
 * });
 *
 * banner.printBanner();
 * banner.printStartupInfo({ appName: 'My App', serverUrl: 'http://localhost:3000', bindAddress: 'port 3000' });
 * ```
 */
export class StartupBanner {
  private config: StartupBannerConfig;

  constructor(config: StartupBannerConfig) {
    this.config = config;
  }

  /**
   * Print the application banner with author and project information
   *
   * @returns {void}
   */
  printBanner(): void {
    const { appName, version, year, author, github, repository, buyMeCoffee, license, licenseUrl } = this.config;

    const bannerParts = [
      chalk.cyan.bold(`\n========== ${appName} - v${version} ==========\n`),
      '\n',
      chalk.green(`© ${year} `),
      chalk.cyan(author),
      '\n \n',
      chalk.blue('GitHub: '),
      chalk.underline(github),
      '\n',
      chalk.blue('Repository: '),
      chalk.underline(repository),
      '\n',
    ];

    if (buyMeCoffee) {
      bannerParts.push(chalk.yellow('Buy Me a Coffee: '), chalk.underline(buyMeCoffee), '\n');
    }

    bannerParts.push(chalk.magenta(`Licensed under the ${license}: `), chalk.underline(licenseUrl), '\n');

    console.log(bannerParts.join(''));
  }

  /**
   * Print the server startup information
   *
   * @param {StartupInfo} info - Startup information to display
   * @returns {void}
   */
  printStartupInfo(info: StartupInfo): void {
    console.log(chalk.magenta(`\nApplication name - ${info.appName}`));
    console.log(chalk.magenta(`Server Url - ${info.serverUrl}`));
    console.log(chalk.magenta(`Server running on: ${chalk.underline(info.bindAddress)}\n`));
    console.log(chalk.cyan.bold('=================================\n'));
  }

  /**
   * Print middleware initialization message
   *
   * @returns {void}
   */
  printMiddlewareInitStart(): void {
    console.log(chalk.green(`\n \n initializing the core middleware \n`));
  }

  /**
   * Print individual middleware initialization success
   *
   * @param {string} middlewareName - Name of the middleware
   * @returns {void}
   */
  printMiddlewareSuccess(middlewareName: string): void {
    console.log(chalk.green(`-- ${middlewareName} initialized successfully`));
  }

  /**
   * Print middleware initialization error
   *
   * @param {string} middlewareName - Name of the middleware
   * @returns {void}
   */
  printMiddlewareError(middlewareName: string): void {
    console.log(chalk.red(`Error initializing core middleware ${middlewareName}`));
  }

  /**
   * Print application initialization error
   *
   * @param {Error} error - The error that occurred
   * @returns {void}
   */
  printInitializationError(error: Error): void {
    console.error(chalk.red('Error during application initialization:'), error);
  }

  /**
   * Print fatal startup error
   *
   * @param {Error} error - The error that occurred
   * @returns {void}
   */
  printFatalError(error: Error): void {
    console.error(chalk.red('Fatal error during application startup:'), error);
  }
}
