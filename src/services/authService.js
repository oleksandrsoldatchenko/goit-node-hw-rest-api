const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const { User } = require("../database/userModel");
const {
  NotAuthorizedError,
  EmailConflictError,
  ValidationError,
} = require("../helpers/errors");
const { createToken } = require("../helpers/apiHelpers");
const gravatar = require("gravatar");
const path = require("path");
const fs = require("fs").promises;
const Jimp = require("jimp");

const registration = async (email, password) => {
  const foundUser = await User.findOne({ email });

  if (foundUser) throw new EmailConflictError(`Email ${email} in use`);

  const avatarURL = gravatar.url(
    email,
    { s: "250", r: "x", d: "robohash" },
    true
  );

  const user = new User({
    email,
    password,
    avatarURL,
  });

  await user.save();
  const { token } = await login(email, password);

  const { email: userEmail, subscription } = user;

  return { userEmail, subscription, token, avatarURL };
};

const login = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) throw new NotAuthorizedError(`No user with email ${email} found`);

  if (!(await bcrypt.compare(password, user.password)))
    throw new NotAuthorizedError("Wrong password");

  const token = await createToken(user);

  const { _id, subscription } = user;

  return { token, _id, subscription };
};

const logout = async (token) => {
  if (!token || !jsonwebtoken.decode(token, process.env.SECRET_KEY))
    throw new NotAuthorizedError("Not authorized");

  try {
    const user = jsonwebtoken.decode(token, process.env.SECRET_KEY);
    const foundUser = await User.findByIdAndUpdate(user?._id, { token: null });
    if (!foundUser) throw new NotAuthorizedError("Not authorized");
  } catch (error) {
    throw new NotAuthorizedError("Not authorized");
  }
};

const getCurrentUser = async (token) => {
  if (!token || !jsonwebtoken.verify(token, process.env.SECRET_KEY))
    throw new NotAuthorizedError("Not authorized");

  try {
    const user = jsonwebtoken.verify(token, process.env.SECRET_KEY);
    const foundUser = await User.findByIdAndUpdate(user?._id);
    if (!foundUser) throw new NotAuthorizedError("Not authorized");
    return foundUser;
  } catch (error) {
    throw new NotAuthorizedError("Not authorized");
  }
};

const changeSubscription = async (token, body) => {
  if (!token || !jsonwebtoken.verify(token, process.env.SECRET_KEY))
    throw new NotAuthorizedError("Not authorized");

  try {
    const user = jsonwebtoken.verify(token, process.env.SECRET_KEY);

    const foundUser = await User.findByIdAndUpdate(
      user?._id,
      {
        $set: body,
      },
      {
        new: true,
      }
    );

    if (!foundUser) throw new NotAuthorizedError("Not authorized");
    
    return foundUser;
  } catch (error) {
    throw new NotAuthorizedError("Not authorized");
  }
};

const changeAvatar = async (file, id) => {
  if (!file) {
    throw new ValidationError("transfer file, please");
  }

  const storeImage = path.resolve("./public/avatars");

  const { path: temporaryName } = file;
  const [, extension] = temporaryName?.split(".");

  if (extension.toLowerCase() !== "jpg" && extension.toLowerCase() !== "png") {
    await fs.unlink(temporaryName);
    throw new ValidationError("file must be '.jpg' or '.png'");
  }

  // const [, extension] = temporaryName.split(".");
  const newName = id + "." + extension;
  const fileName = path.join(storeImage, newName);

  try {
    const avatarDir = await fs.readdir(storeImage);
    const oldAvatar = avatarDir.find((el) => el.includes(id));

    if (oldAvatar) await fs.unlink(storeImage + "/" + oldAvatar);

    await fs.rename(temporaryName, fileName);

    Jimp.read(fileName, (err, avatar) => {
      if (err) throw err;
      avatar
        .resize(250, 250) // resize
        .write(fileName); // save
    });

    const avatarPath = path.join("avatars", newName);

    const { avatarURL } = await User.findOneAndUpdate(
      id,
      {
        avatarURL: avatarPath.replace(/\\/g, "/"),
      },
      {
        new: true,
      }
    );
    return avatarURL;
  } catch (error) {
    throw new ValidationError("Load file error");
  }
};

module.exports = {
  registration,
  login,
  logout,
  getCurrentUser,
  changeSubscription,
  changeAvatar,
};
