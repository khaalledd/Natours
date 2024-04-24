const { promisify } = require('util');
const crypto = require('crypto');
const User = require('./../Models/userModel');
const jwt = require('jsonwebtoken');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');
const { token } = require('morgan');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE_IN,
  });
};

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'Success',
    token,
    data: {
      user,
    },
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordResetToken: req.body.passwordResetToken,
    // passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  sendToken(newUser, 201, res);
});
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1) check if user enters email and password
  if (!email || !password) {
    return next(new AppError('Please Enter email and password', 400));
  }
  // 2) check if User exists and password is correct.
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('incorrect Email or Password', 401));
  }
  // 3)If every thing is OK Then send the Token
  sendToken(user, 200, res);
});
exports.protect = catchAsync(async (req, res, next) => {
  // 1)Getting Token and Check if there is a token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    next(
      new AppError('You are not logged in! Please log in to get access.'),
      401,
    );
  }
  // 2)Verification
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log(decoded);
  // 3)Check if the user still exist.
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user is no longer exist.', 401));
  }
  // 4)check if the user changed password after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('An Error Occured, Please Login Again!', 401));
  }
  //5) Grant Access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});
// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      next(
        new AppError('You must hava permission to accesses this resourse', 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next('There is no user with this email', 404);
  }
  // 2) generate random token
  const resetToken = user.resetToken();
  await user.save({ validateBeforeSave: false });
  // 3) Send it to user Email
  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const message = `forgot your password!! Submit a patch request with your new password and confirm password to ${resetUrl}.\n if you didn't forgot a password please ignore this email.`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token valid for 10 mintues',
      message,
    });
    res.status(200).json({
      status: 'Success',
      message: 'Token sent email ',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('ther was an error sending email. try again later! ', 500),
    );
  }
});

// exports.resetPassword = async (req, res, next) => {
//   // 1) get user by email
//   const user = User.findOne({ email: req.body.email });
//   if (!user) {
//     return next('There is no user with this email', 404);
//   }
//   // 2) generate random token
// };

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get User based on the token
  const hashed = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashed,
    resetTokenExpires: { $gt: Date.now() },
  });

  // 2) If Token has not expired, user exist, reset the password
  if (!user) {
    return next(new AppError('Token Expired or invalid', 400));
  }
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  // 3) change changedAt property int he database
  // user.changedPasswordAfter=
  // 4) log the user in, send JWT
  sendToken(user, 200, res);
});

exports.updatePassword = async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if posted password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('passwords not matched', 401));
  }
  // 3) if so, update password
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.save();
  // 4) Login User, send JWT
  sendToken(user, 200, res);
};
