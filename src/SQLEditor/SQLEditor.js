import React, { useState, useMemo, useCallback } from 'react';
import { useCombobox } from 'downshift';
import { isEmpty, keys, without } from 'lodash';
import { getSearchKeywords, replaceLast } from './utils';

// downshiftUseComboboxReducer

const SQLEditor = ({ sqlCommands, sqlIndicators, data }) => {
  const [sqlQuery, setSqlQuery] = useState('');
  const [suggestions, setSuggestions] = useState(sqlCommands);
  const dataFields = useMemo(
    () =>
      without(keys(data?.[0]), 'id').map((field) => ({
        key: field,
        value: field,
        type: 'data',
      })),
    [data],
  );

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    selectItem,
    setHighlightedIndex,
  } = useCombobox({
    items: suggestions,
    itemToString: (item) => item?.value || '',
    onInputValueChange: ({ inputValue }) => {
      // Update the SQL query with the current input value
      const time = Date.now();
      setSqlQuery(inputValue);

      // Keywords arrary
      const searchKeywords = getSearchKeywords(inputValue);
      console.log(
        'onInputValueChange - inputValue: ',
        inputValue,
        ', sqlQuery: ',
        sqlQuery,
        ', time: ',
        time,
        ', searchKeywords: ',
        searchKeywords,
      );
      const hasSQLCommand =
        searchKeywords.findIndex(
          (keyword) =>
            sqlCommands.findIndex(
              ({ value }) => value.toUpperCase() === keyword.toUpperCase(),
            ) !== -1,
        ) !== -1;
      const hasSQLIndicator =
        searchKeywords.findIndex(
          (keyword) =>
            sqlIndicators.findIndex(
              ({ value }) => value.toUpperCase() === keyword.toUpperCase(),
            ) !== -1,
        ) !== -1;
      const lastKeyword = searchKeywords[searchKeywords.length - 1];
      let newSuggestions = suggestions;

      // Filter suggestions based on user input
      if (searchKeywords.length === 0) {
        // Suggest SQL commands only
        newSuggestions = sqlCommands;
      } else {
        if (hasSQLCommand) {
          newSuggestions = dataFields.concat(sqlIndicators, sqlCommands);
        } else {
          newSuggestions = sqlCommands;
        }

        if (lastKeyword !== '') {
          newSuggestions = newSuggestions.filter(({ value }) =>
            value.toUpperCase().includes(lastKeyword.toUpperCase()),
          );
          setHighlightedIndex(newSuggestions.length ? 0 : -1);
        }
      }

      setSuggestions(newSuggestions);
    },
    stateReducer: (state, actionAndChanges) => {
      const { changes, type } = actionAndChanges;
      let newInputValue = state.inputValue;

      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
        case useCombobox.stateChangeTypes.FunctionSelectItem:
          if (state.highlightedIndex !== -1) {
            const searchKeywords = getSearchKeywords(state.inputValue);
            const lastSearchKeyword = searchKeywords[searchKeywords.length - 1];

            if (isEmpty(lastSearchKeyword)) {
              newInputValue = state.inputValue + changes.selectedItem.value + ' ';
            } else {
              newInputValue = replaceLast(
                state.inputValue,
                lastSearchKeyword,
                changes.selectedItem.value + ' ',
              );
            }
          }

          return {
            ...changes,
            isOpen: false,
            inputValue: newInputValue,
          };
        case useCombobox.stateChangeTypes.InputChange:
          // Set the first item to be highlighted if the last keyword is valid
          const time = Date.now();
          const searchKeywords = getSearchKeywords(changes.inputValue);
          const lastSearchKeyword = searchKeywords[searchKeywords.length - 1];

          console.log(
            '************************* input change - state: ',
            state,
            ', lastSearchKeyword: ',
            lastSearchKeyword,
            ', keyword length: ',
            lastSearchKeyword?.length,
            ', changes: ',
            changes,
            ', suggestions: ',
            suggestions,
            ', time',
            time,
          );

          return {
            ...changes,
            // highlightedIndex:
            //   changes.isOpen &&
            //   suggestions.length > 0 &&
            //   changes.highlightedIndex === -1 &&
            //   lastSearchKeyword !== ''
            //     ? 0
            //     : changes.highlightedIndex,
          };
        default:
          return changes;
      }
    },
  });

  const onInputKeyDown = useCallback(
    (event) => {
      switch (event.key) {
        // Select the highlighted item
        case 'Tab':
          event.preventDefault();
          highlightedIndex > -1 && selectItem(suggestions[highlightedIndex]);
          break;
        default:
          break;
      }
    },
    [highlightedIndex, suggestions, selectItem],
  );

  return (
    <div>
      <div>
        <textarea
          {...getInputProps({
            onKeyDown: onInputKeyDown,
          })}
          value={sqlQuery}
          placeholder='Enter your SQL query...'
        />
      </div>
      <ul {...getMenuProps()}>
        {isOpen &&
          suggestions.map((item, index) => (
            <li
              style={{
                backgroundColor: highlightedIndex === index ? 'lightgray' : 'white',
                color:
                  item.type === 'command'
                    ? '#3f0818'
                    : item.type === 'indicator'
                    ? '#121bc9'
                    : 'black',
              }}
              key={item.key}
              {...getItemProps({ item, index })}
            >
              {item.value}
            </li>
          ))}
      </ul>
    </div>
  );
};

SQLEditor.defaultProps = {
  sqlCommands: [
    { key: 'select', value: 'Select', type: 'command' },
    { key: 'update', value: 'Update', type: 'command' },
    { key: 'delete', value: 'Delete', type: 'command' },
    { key: 'insert_into', value: 'Insert Into', type: 'command' },
    { key: 'create_database', value: 'Create Database', type: 'command' },
    { key: 'alter_database', value: 'Alter Database', type: 'command' },
    { key: 'create_table', value: 'Create Table', type: 'command' },
    { key: 'alter_table', value: 'Alter Table', type: 'command' },
    { key: 'drop_table', value: 'Drop Table', type: 'command' },
    { key: 'create_index', value: 'Create Index', type: 'command' },
    { key: 'drop_index', value: 'Drop Index', type: 'command' },
  ],
  sqlIndicators: [
    { key: 'from', value: 'From', type: 'indicator' },
    { key: 'where', value: 'Where', type: 'indicator' },
    { key: 'order_by', value: 'Order By', type: 'indicator' },
    { key: 'and', value: 'And', type: 'indicator' },
    { key: 'like', value: 'Like', type: 'indicator' },
    { key: 'or', value: 'Or', type: 'indicator' },
    { key: 'not', value: 'Not', type: 'indicator' },
    { key: 'values', value: 'Values', type: 'indicator' },
    { key: 'is', value: 'Is', type: 'indicator' },
    { key: 'null', value: 'Null', type: 'indicator' },
    { key: 'set', value: 'Set', type: 'indicator' },
  ],
  data: [
    { id: 'apple', name: 'Apple', color: 'red', mass: '120' },
    { id: 'pear', name: 'Pear', color: 'pink', mass: '300' },
    { id: 'orange', name: 'Orange', color: 'black', mass: '150' },
    { id: 'grape', name: 'Grape', color: 'white', mass: '200' },
    { id: 'banana', name: 'Banana', color: 'yellow', mass: '500' },
    { id: 'cherries', name: 'Cherries', color: 'red', mass: '420' },
    { id: 'yellow_apples', name: 'Yellow Apples', color: 'yellow', mass: '160' },
    { id: 'pineapples', name: 'Pinneapples', color: 'yellow', mass: '450' },
    { id: 'dates', name: 'Dates', color: 'white', mass: '320' },
    { id: 'avocados', name: 'Avocados', color: 'green', mass: '100' },
    { id: 'limes', name: 'Limes', color: 'green', mass: '220' },
  ],
};

export default SQLEditor;
