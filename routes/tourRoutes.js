const express = require('express');
const tourController = require('../Controllers/tourController');
const authController = require('../Controllers/authController');
const reviewController = require('../Controllers/reviewController');
const reviewRouter = require('../routes/reviewRoute');
//Router Midlleware
const router = express.Router();
// router.param('id',(req, res, next, val)=>{
//   console.log(`ID':${val}`);
//   next();
// })
// router.param('id', tourController.checkId);
router.use('/:tourId/reviews', reviewRouter);

router
  .route('/top-5-tours')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/get-monthly/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'guide', 'lead-tour'),
    tourController.getMonthly,
  );
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// /tours-within?distance=233&center=-40,45&unit=mi
// /tours-within/233/center/-40,45/unit/mi
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-tour'),
    tourController.createTour,
  );
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-tour'),
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-tour'),
    tourController.deleteTour,
  );

// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview,
//   );

module.exports = router;
