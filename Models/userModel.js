const mongoose = require('mongoose');
const crypto = require('crypto');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A User Must have a name'],
  },
  email: {
    type: String,
    required: [true, 'A User Must have an Email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Email not valid'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guid', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'A User Must have a Password'],
    minlength: 8,
    select: false,
  },
  confirmPassword: {
    type: String,
    // required: [true, 'A User Must have a Password'],
    validate: {
      //Only Works for create nad save only not UPDATE
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords not matched ',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  resetTokenExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});



userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.confirmPassword = undefined;
  next();
});
userSchema.pre('save', function (next) {
  if (!this.isModified() || this.isNew) return next();
  this.changedPasswordAfter = Date.now() - 1000;
  next();
});
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});
//instanse methods // Available for all the user documents
userSchema.methods.correctPassword = async (
  candidatePassword,
  userPassword,
) => {
  return await bcrypt.compare(candidatePassword, userPassword);
};
userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  // if (!this.passwordChangedAt) {
  //   const changedTimeAt = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
  //   // console.log(changedTimeAt, JWTTimeStamp);
  //   return JWTTimeStamp < changedTimeAt;
  // }
  return false;
};
userSchema.methods.resetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  // console.log({ resetToken }, this.passwordResetToken);

  this.resetTokenExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};
const User = mongoose.model('User', userSchema);
module.exports = User;
