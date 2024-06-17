
export const onlyUnique = (value, index, array) => {
  return array.indexOf(value) === index;
};

export const getClassName = (classId: number) => {
  if ((classId > 0 && classId < 7) || (classId > 11 && classId < 19)) {
    return `C${classId}`;
  }
  if (classId === 7) {
    return 'HS';
  }
  if (classId === 8) {
    return 'LS';
  }
  if (classId === 9) {
    return 'NS';
  }
  if (classId === 25) {
    return 'TC';
  }

  return '??';
};
