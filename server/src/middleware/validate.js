const { validationResult } = require('express-validator');

/**
 * Runs an array of express-validator chains (which also apply sanitizers such as
 * trim/stripHtml to req), then responds 400 with every field error if any failed.
 */
const validate = (validations) => {
  return async (req, res, next) => {
    for (const validation of validations) {
      await validation.run(req);
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array({ onlyFirstError: true }).map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: formattedErrors[0].message,
      errors: formattedErrors,
    });
  };
};

module.exports = validate;
