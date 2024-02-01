import { isEmpty } from 'lodash';

const removeDuplicatedSpaces = (string, trim = false) => {
  let adjustedString = string;

  if (!isEmpty(string)) {
    adjustedString = string.replace(/\s+/g, ' ');

    if (trim) {
      adjustedString = adjustedString.trim();
    }
  }

  return adjustedString;
};

const removeDuplicatedCommas = (string) => {
  let adjustedString = string;

  if (!isEmpty(string)) {
    adjustedString = string.replace(/,+/g, ',');
  }

  return adjustedString;
};

const splitBySpaceAndComma = (string) => {
  if (isEmpty(string)) return [];

  return string.split(/[,\s]+/g) || [];
};

const getSearchKeywords = (query) => {
  if (isEmpty(query)) return [];

  let adjustedQuery = removeDuplicatedSpaces(query, true);
  adjustedQuery = removeDuplicatedCommas(adjustedQuery);
  adjustedQuery = adjustedQuery.replace(/\s*,+\s*/g, ',');

  if (adjustedQuery === '') return [];

  const keywords = splitBySpaceAndComma(adjustedQuery);

  if (query[query.length - 1] === ' ' || query[query.length - 1] === '\n') {
    return [...keywords, ''];
  }

  return keywords;
};

const replaceLast = (string, searchValue, newValue) => {
  if (isEmpty(string)) return string;

  const regexp = new RegExp(`${searchValue}$`);

  return string.replace(regexp, newValue);
};

export { getSearchKeywords, removeDuplicatedSpaces, replaceLast };
