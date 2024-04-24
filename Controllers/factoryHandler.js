const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      // NULL is a fallcy value which will produce false
      return next(new AppError('No document found with that id!', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      // NULL is a fallcy value which will produce false
      return next(new AppError('No document found with that id!', 404));
    }
    res.status(200).json({
      status: 'success',
      data: { doc },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, populateOpts) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOpts) query.populate(populateOpts);
    const doc = await query;
    if (!doc) {
      // NULL is a fallcy value which will produce false
      return next(new AppError('Not found a document with that id!', 404));
    }
    res.status(200).json({
      status: 'success',
      data: { doc },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //To allow to nested get reviews(hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query;
    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: { doc },
    });
  });
