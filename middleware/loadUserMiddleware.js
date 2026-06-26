import userModel from '../model/userModel.js';
import errorHandler from '../utils/errorHandler.js';
import asyncHandler from 'express-async-handler';

const loadUserMiddleware = asyncHandler(async (req, res, next) => {
    const user = await userModel.findById(req.user.id);

    if (!user) {
        return next(errorHandler('User not found', 401));
    }

    req.dbUser = user;
    next();
});

export default loadUserMiddleware;
