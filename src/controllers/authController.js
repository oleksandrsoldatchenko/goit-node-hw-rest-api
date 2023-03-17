const {
  registration,
  login,
  logout,
  getCurrentUser,
  changeSubscription,
  changeAvatar,
} = require("../services/authService");
// const { User } = require("../database/userModel");

const registrationController = async (req, res) => {
  const { email, password } = req.body;
  const { userEmail, subscription, token, avatarURL } = await registration(
    email,
    password
  );

  res.status(201).json({
    token,
    user: {
      email: userEmail,
      subscription,
      avatarURL,
    },
  });
};

const loginController = async (req, res) => {
  const { email, password } = req.body;
  const { token, _id, subscription } = await login(email, password);
  res.json({ token, user: { userId: _id, email, subscription } });
};

const logoutController = async (req, res) => {
  const [, token] = req.headers.authorization.split(" ");
  await logout(token);

  res.status(204).json();
};

const currentUserController = async (req, res) => {
  const { email, subscription } = req.user;
  return res.json({
    email,
    subscription,
  });
};

const changeSubscriptionController = async (req, res) => {
  const [, token] = req.headers.authorization.split(" ");
  const { email, subscription } = await changeSubscription(token, req.body);

  res.status(200).json({ email, subscription });
};

const avatarsUploadController = async (req, res) => {
  res.json({ status: "success" });
};

const changeAvatarController = async (req, res) => {
  const [, token] = req.headers.authorization.split(" ");
  const { _id } = await getCurrentUser(token);
  const avatarURL = await changeAvatar(req.file, _id);

  res.status(200).json({ avatarURL });
};

module.exports = {
  registrationController,
  loginController,
  logoutController,
  currentUserController,
  changeSubscriptionController,
  avatarsUploadController,
  changeAvatarController,
};
