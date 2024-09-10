export const extractFront = (data: any) => {
  const name = extractDetail(data.ho_ten);
  const gender = extractDetail(data.gioi_tinh);
  const birthday = extractDetail(data.ngay_sinh);
  const documentType = data.class_name.value.substring(
    0,
    data.class_name.value.indexOf("-")
  );

  const hometown = extractDetail(data.nguyen_quan);
  const exprireDate = extractDetail(data.ngay_het_han);
  const address = extractDetail(data.ho_khau_thuong_tru);
  const documentNumber = extractDetail(data.id);
  return {
    name,
    gender,
    birthday,
    documentType,
    hometown,
    exprireDate,
    address,
    documentNumber,
  };
};

export const extractBack = (data: any) => {
  const issueAddress = extractDetail(data.noi_cap);
  const issueDate = extractDetail(data.ngay_cap);
  return {
    issueDate,
    issueAddress,
  };
};

const extractDetail = (data: any) => {
  return data.value;
};
