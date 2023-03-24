const jsonwebtoken = require("jsonwebtoken");
const { User } = require("../database/userModel");
const { CustomError } = require("./errors");
const sgMail = require("@sendgrid/mail");

require("dotenv").config();
const { FROM_EMAIL } = process.env;

const asyncWrapper = (controller) => {
  return (req, res, next) => {
    controller(req, res).catch(next);
  };
};

const errorHandler = (err, req, res, next) => {
  if (err instanceof CustomError) {
    return res.status(err.status).json({ message: err.message });
  }

  res.status(500).json({ message: err.message });
};

const createToken = async (user) => {
  const token = jsonwebtoken.sign(
    {
      _id: user._id,
      createdAt: user.createdAt,
    },
    process.env.SECRET_KEY,
    { expiresIn: "1h" }
  );
  await User.findByIdAndUpdate(user?._id, { token });

  return token;
};

const sendConfirmRegisterMail = async (email, verificationToken) => {
  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: "Thank you for registration",
    text: `<h1>Please click to activate you account http://localhost:8081/api/users/verify/${verificationToken}</h1>`,
    html: `<h1>Please  <a href="http://localhost:8081/api/users/verify/${verificationToken}">click</a> to activate your account </h1>`,
  };

  await sgMail.send(msg);
};

module.exports = {
  asyncWrapper,
  errorHandler,
  createToken,
  sendConfirmRegisterMail,
};
