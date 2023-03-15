class customError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

class ValidationError extends customError {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

class WrongParametersError extends customError {
  constructor(message) {
    super(message);
    this.status = 404;
  }
}

class NotAuthorizedError extends customError {
  constructor(message) {
    super(message);
    this.status = 401;
  }
}

class EmailConflictError extends customError {
  constructor(message) {
    super(message);
    this.status = 409;
  }
}

module.exports = {
  customError,
  ValidationError,
  WrongParametersError,
  NotAuthorizedError,
  EmailConflictError,
};
