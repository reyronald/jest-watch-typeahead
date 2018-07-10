// @flow

import fuzzaldrinPlus from 'fuzzaldrin-plus';

export default function match(
  items: $ReadOnlyArray<string>,
  query: string,
): Array<{|
  item: string,
  matches: number[],
|}> {
  const options = { usePathScoring: true, pathSeparator: '/' };
  const result = fuzzaldrinPlus.filter(items, query, options).map(item => ({
    item,
    matches: fuzzaldrinPlus.match(item, query, options),
  }));

  return result;
}
