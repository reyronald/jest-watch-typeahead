// @flow
/* eslint-disable no-param-reassign */
import path from 'path';
import chalk from 'chalk';
import slash from 'slash';
import stripAnsi from 'strip-ansi';
import type { ProjectConfig } from '../types/Config';

const relativePath = (config: ProjectConfig, testPath: string) => {
  testPath = path.relative(config.cwd || config.rootDir, testPath);
  const dirname = path.dirname(testPath);
  const basename = path.basename(testPath);
  return { basename, dirname };
};

const colorize = (str: string, start: number, end: number) =>
  chalk.dim(str.slice(0, start)) +
  chalk.reset(str.slice(start, end)) +
  chalk.dim(str.slice(end));

export const trimAndFormatPath = (
  pad: number,
  config: ProjectConfig,
  testPath: string,
  columns: number,
): string => {
  const maxLength = columns - pad;
  const relative = relativePath(config, testPath);
  const { basename } = relative;
  let { dirname } = relative;

  // length is ok
  if ((dirname + path.sep + basename).length <= maxLength) {
    return slash(chalk.dim(dirname + path.sep) + chalk.bold(basename));
  }

  // we can fit trimmed dirname and full basename
  const basenameLength = basename.length;
  if (basenameLength + 4 < maxLength) {
    const dirnameLength = maxLength - 4 - basenameLength;
    dirname = `...${dirname.slice(
      dirname.length - dirnameLength,
      dirname.length,
    )}`;
    return slash(chalk.dim(dirname + path.sep) + chalk.bold(basename));
  }

  if (basenameLength + 4 === maxLength) {
    return slash(chalk.dim(`...${path.sep}`) + chalk.bold(basename));
  }

  // can't fit dirname, but can fit trimmed basename
  return slash(
    chalk.bold(
      `...${basename.slice(basename.length - maxLength - 4, basename.length)}`,
    ),
  );
};

export const getTerminalWidth = (
  pipe: stream$Writable | tty$WriteStream = process.stdout,
  // $FlowFixMe
): number => pipe.columns;

export const highlight = (
  rawPath: string,
  filePath: string,
  pattern: string,
  rootDir: string,
) => {
  const trim = '...';
  const relativePathHead = './';

  let regexp;

  try {
    regexp = new RegExp(pattern, 'i');
  } catch (e) {
    return chalk.dim(filePath);
  }

  rawPath = stripAnsi(rawPath);
  filePath = stripAnsi(filePath);
  const match = rawPath.match(regexp);

  if (!match) {
    return chalk.dim(filePath);
  }

  let offset;
  let trimLength;

  if (filePath.startsWith(trim)) {
    offset = rawPath.length - filePath.length;
    trimLength = trim.length;
  } else if (filePath.startsWith(relativePathHead)) {
    offset = rawPath.length - filePath.length;
    trimLength = relativePathHead.length;
  } else {
    offset = rootDir.length + path.sep.length;
    trimLength = 0;
  }

  const start = match.index - offset;
  const end = start + match[0].length;
  return colorize(filePath, Math.max(start, 0), Math.max(end, trimLength));
};

const DOTS = '...';
const ENTER = '⏎';

export const formatTestNameByPattern = (
  testName: string,
  pattern: string,
  width: number,
) => {
  const inlineTestName = testName.replace(/(\r\n|\n|\r)/gm, ENTER);

  let regexp;

  try {
    regexp = new RegExp(pattern, 'i');
  } catch (e) {
    return chalk.dim(inlineTestName);
  }

  const match = inlineTestName.match(regexp);

  if (!match) {
    return chalk.dim(inlineTestName);
  }

  // $FlowFixMe
  const startPatternIndex = Math.max(match.index, 0);
  const endPatternIndex = startPatternIndex + match[0].length;

  if (inlineTestName.length <= width) {
    return colorize(inlineTestName, startPatternIndex, endPatternIndex);
  }

  const slicedTestName = inlineTestName.slice(0, width - DOTS.length);

  if (startPatternIndex < slicedTestName.length) {
    if (endPatternIndex > slicedTestName.length) {
      return colorize(
        slicedTestName + DOTS,
        startPatternIndex,
        slicedTestName.length + DOTS.length,
      );
    }
    return colorize(
      slicedTestName + DOTS,
      Math.min(startPatternIndex, slicedTestName.length),
      endPatternIndex,
    );
  }

  return `${chalk.dim(slicedTestName)}${chalk.reset(DOTS)}`;
};

function splitMatches(
  text: string,
  matches: number[],
): Array<{|
  str: string,
  isMatch: boolean,
|}> {
  const result = [];
  for (let i = 0; i < text.length; i += 1) {
    const isMatch = i === matches[0];
    if (isMatch) {
      matches.shift();
    }

    const lastIndex = result.length - 1;
    if (lastIndex !== -1 && result[lastIndex].isMatch === isMatch) {
      result[lastIndex].str += text[i];
    } else {
      result.push({ str: text[i], isMatch });
    }
  }
  return result;
}

export function highlightFuzzy(
  rawPath: string,
  filePath: string,
  pattern: string,
  rootDir: string,
  matches: number[],
): string {
  const trim = '...';
  const relativePathHead = './';
  // eslint-disable-next-line no-unused-vars
  const rawPathStripped = stripAnsi(rawPath);
  const filePathStripped = stripAnsi(filePath);

  let offset;
  // eslint-disable-next-line no-unused-vars
  let trimLength;
  if (filePath.startsWith(trim)) {
    offset = rawPath.length - filePath.length;
    trimLength = trim.length;
  } else if (filePath.startsWith(relativePathHead)) {
    offset = rawPath.length - filePath.length;
    trimLength = relativePathHead.length;
  } else {
    offset = rootDir.length + path.sep.length;
    trimLength = 0;
  }

  const offsetMatches = matches.map(m => m - offset);
  const splitMatchesResult = splitMatches(filePathStripped, offsetMatches);
  const result = splitMatchesResult.reduce((prev, curr) => {
    return prev + (curr.isMatch ? chalk.reset(curr.str) : chalk.gray(curr.str));
  }, '');
  return result;
}
