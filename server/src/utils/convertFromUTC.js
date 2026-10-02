const convertFromUTC = (utcDate, timeZone = "Asia/Kolkata") => {
  const date = new Date(utcDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid UTC date");
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

module.exports = convertFromUTC;
