const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
const { User } = require("../database/userModel");
const {
  NotAuthorizedError,
  EmailConflictError,
  ValidationError,
  WrongParametersError,
} = require("../helpers/errors");
const {
  createToken,
  sendConfirmRegisterMail,
} = require("../helpers/apiHelpers");
const gravatar = require("gravatar");
const path = require("path");
const fs = require("fs").promises;
const Jimp = require("jimp");
const { v4: uuidv4 } = require("uuid");

require("dotenv").config();
const { FROM_EMAIL } = process.env;

const registration = async (email, password) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const foundUser = await User.findOne({ email });

  if (foundUser) throw new EmailConflictError(`Email ${email} in use`);

  const avatarURL = gravatar.url(
    email,
    { s: "250", r: "x", d: "robohash" },
    true
  );

  const verificationToken = uuidv4();

  const user = new User({
    email,
    password,
    avatarURL,
    verificationToken,
  });

  await user.save();
  
  await sendConfirmRegisterMail(email, verificationToken);

  const { email: userEmail, subscription } = user;

  return { userEmail, subscription, avatarURL };
};

const verifyRegistration = async (verificationToken) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const user = await User.findOne({
    verificationToken,
  });

  if (!user) throw new WrongParametersError("User not found");

  await User.findOneAndUpdate(user._id, {
    verify: true,
    verificationToken: null,
  });

  const token = await createToken(user);
  const { email, subscription, avatarURL } = user;

  const msg = {
    to: user.email, // Change to your recipient
    from: FROM_EMAIL,
    subject: "Thank you for registration",
    text: `Registration successfully`,
    html: `<h1>Registration successfully</h1>`,
  };

  await sgMail.send(msg);

  return { email, subscription, avatarURL, token };
};

const reSendVerifyRegister = async (email) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const user = await User.findOne({
    email,
  });

  if (!user.verificationToken)
    throw new ValidationError("Verification has already been passed");

  const verificationToken = uuidv4();

  await User.findOneAndUpdate(user._id, { verificationToken });

  await sendConfirmRegisterMail(email, verificationToken);
};

const forgotPassword = async (email) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const user = await User.findOne({
    email,
    verify: true,
  });

  if (!user) throw new NotAuthorizedError(`No user with email ${email} found`);

  const newPassword = uuidv4();
  const temporaryPassword = await bcrypt.hash(newPassword, 10);
  user.password = temporaryPassword;

  await user.save();

  const msg = {
    to: user.email, // Change to your recipient
    from: FROM_EMAIL,
    subject: "Change Password",
    text: `Your temporary password: ${temporaryPassword}`,
    html: `<h1>Your temporary password: ${temporaryPassword}</h1>`,
  };

  await sgMail.send(msg);
};

const login = async (reqEmail, password) => {
  const user = await User.findOne({ email: reqEmail, verify: true });

  if (!user) throw new NotAuthorizedError(`No user with email ${reqEmail} found`);

  if (!(await bcrypt.compare(password, user.password)))
    throw new NotAuthorizedError("Wrong password");

  const token = await createToken(user);

  const { _id, subscription, email } = user;

  return { token, _id, subscription, email };
};

const logout = async (token) => {
  if (!token || !jsonwebtoken.verify(token, process.env.SECRET_KEY))
    throw new NotAuthorizedError("Not authorized");

  try {
    const user = jsonwebtoken.verify(token, process.env.SECRET_KEY);
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

  const newName = id + "." + extension;
  const fileName = path.join(storeImage, newName);

  try {
    const avatarDir = await fs.readdir(storeImage);
    const oldAvatar = avatarDir.find((el) => el.includes(id));

    await fs.rename(temporaryName, fileName);

  if (oldAvatar) {
    const [, extension] = fileName?.split(".");
    const [, oldExtension] = oldAvatar.split(".");
    if (extension !== oldExtension)
      await fs.unlink(storeImage + "/" + oldAvatar);
  }

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
  verifyRegistration,
  reSendVerifyRegister,
  forgotPassword,
  login,
  logout,
  getCurrentUser,
  changeSubscription,
  changeAvatar,
};
