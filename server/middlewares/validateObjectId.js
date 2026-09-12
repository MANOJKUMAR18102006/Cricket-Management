import mongoose from 'mongoose';

/**
 * Middleware factory to validate MongoDB ObjectId parameters in request params
 * @param  {...string} paramNames List of parameter names to validate (default: ['id'])
 */
export const validateObjectId = (...paramNames) => {
  const names = paramNames.length > 0 ? paramNames : ['id'];

  return (req, res, next) => {
    for (const name of names) {
      const value = req.params[name];
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ID parameter format for "${name}". Expected a valid 24-character hexadecimal ObjectId.`,
        });
      }
    }
    next();
  };
};

export default validateObjectId;
