import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useCombobox } from 'downshift';
import { isEmpty, keys, without } from 'lodash';
import getCaretCoordinates from 'textarea-caret';
import { getSearchKeywords, replaceLast } from './utils';
import './SQLEditor.css';

const SQLEditor = ({ sqlCommands, sqlIndicators, data, updateData, rows, cols }) => {
  const [sqlQuery, setSqlQuery] = useState('');
  const [suggestions, setSuggestions] = useState(sqlCommands);
  const [suggestionListTopPos, setSuggestionListTopPos] = useState(0);
  const [suggestionListLeftPos, setSuggestionListLeftPos] = useState(0);
  const dataRef = useRef(data);
  const inputRef = useRef(null);

  const normalizeData = useCallback(
    (newData) =>
      without(keys(newData?.[0]), 'id').map((field) => ({
        key: field,
        value: field,
        type: 'data',
      })),
    [],
  );

  const updateCaretPos = useCallback(() => {
    const searchKeywords = getSearchKeywords(inputRef.current.value);
    const lastSearchKeyword = searchKeywords[searchKeywords.length - 1];
    let selIndex = inputRef.current.selectionEnd;

    if (!isEmpty(lastSearchKeyword)) {
      if (lastSearchKeyword.includes('.')) {
        selIndex = inputRef.current.value.lastIndexOf('.');
      } else {
        inputRef.current.value.lastIndexOf(lastSearchKeyword);
      }
    }

    const caretPos = getCaretCoordinates(inputRef.current, selIndex);
    const inputStyle = window.getComputedStyle(inputRef.current);
    const newTopPos = caretPos.top + caretPos.height + window.scrollY;
    const newLeftPos = Math.abs(
      caretPos.left -
        Number.parseInt(inputStyle.borderLeftWidth) -
        Number.parseInt(inputStyle.paddingLeft) +
        window.scrollX,
    );

    setSuggestionListTopPos(newTopPos);
    setSuggestionListLeftPos(newLeftPos);
  }, []);

  const updateSuggestions = useCallback(
    (inputValue) => {
      // Keywords arrary
      const searchKeywords = getSearchKeywords(inputValue);
      console.log(
        'onInputValueChange - inputValue: ',
        inputValue,
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
      let newSuggestions;

      // Filter suggestions based on user input
      if (searchKeywords.length === 0) {
        // Suggest SQL commands only
        newSuggestions = sqlCommands;
      } else {
        const isSubDataField = !isEmpty(lastKeyword) && lastKeyword.includes('.');
        const isInvalid =
          !isEmpty(lastKeyword) && (lastKeyword[0] === '.' || lastKeyword.includes('..'));

        if (isInvalid) {
          newSuggestions = [];
        } else {
          if (hasSQLCommand) {
            const dataFields = normalizeData(dataRef.current);
            newSuggestions = isSubDataField
              ? dataFields
              : dataFields.concat(sqlIndicators, sqlCommands);
          } else {
            newSuggestions = sqlCommands;
          }

          if (lastKeyword !== '') {
            let searchKey = lastKeyword;

            if (isSubDataField) {
              const snipts = lastKeyword.split('.');
              searchKey = snipts[snipts.length - 1];
            }
            newSuggestions = newSuggestions.filter(({ value }) =>
              value.toUpperCase().includes(searchKey.toUpperCase()),
            );
            setHighlightedIndex(newSuggestions.length ? 0 : -1);
          }
        }
      }

      setSuggestions(newSuggestions);
    },
    [sqlCommands, sqlIndicators, normalizeData],
  );

  const updateOnKeywordChange = useCallback(
    async (keyword, postUpdate) => {
      if (updateData) {
        dataRef.current = await updateData(keyword);

        if (postUpdate) {
          postUpdate();
        }
      }
    },
    [updateData],
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
      setSqlQuery(inputValue);

      updateSuggestions(inputValue);
      updateCaretPos();

      const searchKeywords = getSearchKeywords(inputValue);
      console.log('search keywords: ', searchKeywords);
      if (searchKeywords.length && searchKeywords[searchKeywords.length - 1]) {
        updateOnKeywordChange(searchKeywords[searchKeywords.length - 1], () =>
          updateSuggestions(inputValue),
        );
      }
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
              newInputValue = state.inputValue + changes.selectedItem.value;
            } else {
              let searchKey = lastSearchKeyword;
              const isSubDataField =
                !isEmpty(lastSearchKeyword) && lastSearchKeyword.includes('.');

              if (isSubDataField) {
                const snipts = lastSearchKeyword.split('.');
                searchKey = snipts[snipts.length - 1];
              }

              newInputValue = replaceLast(
                state.inputValue,
                searchKey,
                changes.selectedItem.value,
              );
            }

            if (changes.selectedItem.type !== 'data') {
              newInputValue += ' ';
            }
          }

          return {
            ...changes,
            isOpen: false,
            inputValue: newInputValue,
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

  useEffect(() => {
    if (inputRef.current && isEmpty(inputRef.current.value)) {
      // Initialize the menu top position
      updateCaretPos();
    }

    // Handle input's resize
    const resizeObserver = new ResizeObserver(updateCaretPos);
    resizeObserver.observe(inputRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateCaretPos]);

  return (
    <div className='Container'>
      <div>
        <textarea
          {...getInputProps({
            onKeyDown: onInputKeyDown,
          })}
          placeholder='Enter your SQL query...'
          ref={inputRef}
          className='Input'
          spellCheck={false}
          rows={rows}
          cols={cols}
        />
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul
          {...getMenuProps()}
          className='Suggestions'
          style={{
            top: suggestionListTopPos,
            left: suggestionListLeftPos,
          }}
        >
          {suggestions.map((item, index) => (
            <li
              className='SuggestionItem'
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
      )}
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
  rows: 3,
  cols: 40,
};

export default SQLEditor;
