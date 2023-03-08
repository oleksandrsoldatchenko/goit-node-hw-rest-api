const bcrypt = require("bcrypt");
const jsonwebtoken = require("jsonwebtoken");
const { User } = require("../database/userModel");
const { NotAuthorizedError, EmailConflictError } = require("../helpers/errors");
const { createToken } = require("../helpers/apiHelpers");

const registration = async (email, password) => {
  const foundUser = await User.findOne({ email });

  if (foundUser) throw new EmailConflictError(`Email ${email} in use`);

  const user = new User({
    email,
    password,
  });

  await user.save();
  const token = await createToken(user);

  const { email: userEmail, subscription } = user;

  return { userEmail, subscription, token };
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

module.exports = {
  registration,
  login,
  logout,
  getCurrentUser,
  changeSubscription,
};
