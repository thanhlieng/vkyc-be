export const checkIsEmpty = (s: string | null | undefined) => {
  if (!s || s === "") {
    return true;
  }

  return false;
};
