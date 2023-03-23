const {
  registration,
  verifyRegistration,
  reSendVerifyRegister,
  forgotPassword,
  login,
  logout,
  getCurrentUser,
  changeSubscription,
  changeAvatar,
} = require("../services/authService");

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

const registrationVerifyController = async (req, res) => {
  const { verificationToken } = req.params;

  await verifyRegistration(verificationToken);

  res.status(200).json({ message: "Verification successful" });
};

const reSendVerifyRegisterController = async (req, res) => {
  const { email } = req.body;

  await reSendVerifyRegister(email);

  res.status(200).json({ message: "Verification email sent" });
};

const forgotPasswordController = async (req, res) => {
  const { email } = req.body;

  await forgotPassword(email);

  res.status(200).json({ status: "success" });
};

const loginController = async (req, res) => {
  const { email: reqEmail, password } = req.body;
  const { token, _id, subscription, email } = await login(reqEmail, password);
  res.status(200).json({ token, user: { userId: _id, email, subscription } });
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


const changeAvatarController = async (req, res) => {
  const [, token] = req.headers.authorization.split(" ");
  const { _id } = await getCurrentUser(token);
  const avatarURL = await changeAvatar(req.file, _id);

  res.status(200).json({ avatarURL });
};

module.exports = {
  registrationController,
  registrationVerifyController,
  reSendVerifyRegisterController,
  forgotPasswordController,
  loginController,
  logoutController,
  currentUserController,
  changeSubscriptionController,
  changeAvatarController,
};
