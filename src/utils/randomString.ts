const uuid = require("uuid");
const randomstring = require("randomstring");

export const getRandomRoomName = () => {
  const randomString = uuid.v4();
  // console.log(randomString);
  return randomString;
};

export const getRandomName = () => {
  const randomString = randomstring.generate(8); // Change 10 to the desired length
  return randomString;
};
