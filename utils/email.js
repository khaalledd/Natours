const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) create a transporter
  // const transporter = nodemailer.createTransport({
  //   host: process.env.EMAIL_HOST,
  //   port: process.env.PORT,
  //   auth: {
  //     user: process.env.EMAIL_USERNAME,
  //     pass: process.env.EMAIL_PASSWORD,
  //   },
  // });
  var transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "35028de787e0d6",
      pass: "e414d94748b108"
    }
  });
  // 2) Email Options
  const mailOptions = {
    from: 'Khaled A Mohsen <khaled.amohsen0@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html
  };

  // 3) Send Email
  await transporter.sendMail(mailOptions);
};
module.exports = sendEmail;
