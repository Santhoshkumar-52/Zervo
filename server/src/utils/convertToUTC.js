const convertToUTC = (date = new Date()) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date");
  }

  return parsedDate.toISOString();
};

module.exports = convertToUTC;
