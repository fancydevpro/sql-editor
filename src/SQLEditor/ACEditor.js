import Downshift from 'downshift';

const ACEditor = ({ itemsGroup1, itemsGroup2 }) => {
  return <div className=''></div>;
};

ACEditor.defaultProps = {
  itemsGroup1: [
    { key: 'select', title: 'Select' },
    { key: 'insert_into', title: 'Insert Into' },
    { key: 'update', title: 'Update' },
    { key: 'delete', title: 'Delete' },
    { key: 'select_top', title: 'Select Top' },
    { key: 'case', title: 'Case' },
    { key: '' },
  ],
  itemsGroup2: [
    { key: 'apple', title: 'Apple', bindTo: null },
    { key: 'pear', title: 'Pear', bindTo: null },
    { key: 'orange', title: 'Orange', bindTo: null },
    { key: 'grape', title: 'Grape', bindTo: null },
    { key: 'banana', title: 'Banana', bindTo: null },
  ],
  itemsGroup3: [{ key: '' }],
};

export default ACEditor;
