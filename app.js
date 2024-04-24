const path = require('path');
const express = require('express');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./Controllers/errorController');
const morgan = require('morgan');
const tourRouter = require('./routes/tourRoutes');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const helmet = require('helmet');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoute');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
//1) Global MIDDLEWARE
//Serving Static Files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// Security HTTP Headers
app.use(helmet());
//Development logging
if (process.env.NODE.ENV === 'development') {
  app.use(morgan('dev'));
}
//Limit requests from same API
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 100,
  message: 'Too many requests, please try again in an hour!!',
});
app.use('/api', limiter);
//Body Parser, read data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

//Data Sanitization against NOSQL
app.use(mongoSanitize());
//XSS
app.use(xss());
//Prevent parameter pollution

// app.use(hpp());

//Test Middleware

// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👋');
//   next();
// });

//Test Middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.cookies);
  next();
});
///////////////////////////////////////////////
//2) ROUTE HANDELERS

/*
// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);
*/
// 3) ROUTES || Mounting a router
//Mount router to route path
// tour router is basically a middleware to the path
// '/ ' to start from the root
// app.get('/', (req, res) => {
//   res.status(200).render('base', {
//     tour: 'The Forest Hicker ',
//     user: 'Mohsen',
//   });
// });
// app.get('/overview', (req, res) => {
//   res.status(200).render('overview', {
//     title: 'All tours',
//   });
// });
// app.get('/tour', (req, res) => {
//   res.status(200).render('tour', {
//     title: 'The Forest Hicker',
//   });
// });
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server `,
  // // });
  // const err = new Error(`Can't find ${req.originalUrl} on this server! `);
  // err.statusCode = 404;
  // err.status = 'fail';

  next(new AppError(`Can't find ${req.originalUrl} on this server! `), 404);
});
//ERROR Handling MIDDLEWARE
app.use(globalErrorHandler);
module.exports = app;
