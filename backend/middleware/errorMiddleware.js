const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production mode: don't leak error details
    const errorResponse = {
      status: err.status,
      message: err.isOperational ? err.message : 'Something went very wrong!',
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    };

    if (!err.isOperational) {
      console.error('ERROR 💥', err);
    }

    res.status(err.statusCode).json(errorResponse);
  }
};

export default globalErrorHandler;
