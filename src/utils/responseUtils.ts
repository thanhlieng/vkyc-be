export const responseSuccess = (s: any) => {
  const response = {
    code: 200,
    message: "Success",
    data: s,
  };
  return response;
};

export const responseBadRequest = (s: any) => {
  const response = {
    code: 400,
    message: "Bad Request",
    data: s,
  };
  return response;
};