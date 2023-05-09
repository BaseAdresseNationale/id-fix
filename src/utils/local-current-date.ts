type dateParams = Parameters<typeof Date>;

const localCurrentDate = (...dateParams: dateParams) =>
  new Date(...dateParams).toLocaleString("fr-FR", {
    timeZoneName: "short",
  });

export default localCurrentDate;
